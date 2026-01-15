import { useTranslationStore } from './store.ts';
import { translateText } from './translation.ts';
import { recordTranslation } from './stats.ts';

const SPACE_KEY_BUFFER_MS = 600;
const SPACE_KEYS: number[] = [];

const logger = {
    log: (msg: string, ...args: any[]) => console.log(`[InputListener] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[InputListener] ${msg}`, ...args),
};

export function setupInputListeners() {
    logger.log("Setting up input listeners...");
    window.addEventListener('keydown', handleKeydown, true);
}

async function handleKeydown(event: KeyboardEvent) {
    const path = event.composedPath();
    const deepTarget = path[0] as HTMLElement;

    const isInputTag = (el: HTMLElement) => {
        const tag = el.tagName?.toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA';
    };

    const isContentEditable = (el: HTMLElement) => el.isContentEditable;

    let isInput = isInputTag(deepTarget) || isContentEditable(deepTarget);

    if (!isInput) return;

    // Space x3 Logic
    if ((event.key === ' ' || event.code === 'Space') && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        const now = Date.now();
        while (SPACE_KEYS.length > 0 && now - SPACE_KEYS[0] > SPACE_KEY_BUFFER_MS) {
            SPACE_KEYS.shift();
        }
        SPACE_KEYS.push(now);
        logger.log(`Space Count in Buffer: ${SPACE_KEYS.length}`, SPACE_KEYS);

        if (SPACE_KEYS.length >= 3) {
            logger.log("Triggering Translation (Space x3)");
            if (deepTarget instanceof HTMLInputElement || deepTarget instanceof HTMLTextAreaElement) {
                const fullText = deepTarget.value;
                const cursorPosition = deepTarget.selectionStart || fullText.length;
                // 获取光标前的文本（去掉本次输入的空格干扰）
                const textBeforeCursor = fullText.slice(0, cursorPosition).trimEnd();

                // 自动判断逻辑（已修正）：
                // 如果包含空格（说明前面可能是英文句子），视为单词/短语模式，翻译最后一个词
                // 如果不包含空格（说明是一整段中文），视为整句模式，翻译整个句子
                if (textBeforeCursor.includes(' ')) {
                    logger.log("Space x3: Detected word mode (contains spaces)");
                    await handleWordTranslation(deepTarget);
                } else {
                    logger.log("Space x3: Detected sentence mode (no spaces)");
                    await handleSentenceTranslation(deepTarget);
                }
            }
            SPACE_KEYS.length = 0;
        }
    } else {
        if (event.key.length === 1) {
            if (SPACE_KEYS.length > 0) {
                logger.log("Resetting Space Buffer due to other key press", event.key);
                SPACE_KEYS.length = 0;
            }
        }
    }
}

async function handleSentenceTranslation(target: HTMLInputElement | HTMLTextAreaElement) {
    const text = target.value;
    logger.log("Processing Sentence Translation", { text });
    if (!text.trim()) {
        logger.log("Empty text, skipping.");
        return;
    }

    try {
        const result = await translateText(text);
        logger.log("Translation Result:", result);

        // 🔑 同样应用输入法切换技巧
        if (target instanceof HTMLInputElement) {
            logger.log("[InputSwitch] Attempting to switch input method via password type...");
            const originalType = target.type;

            target.type = 'password';
            logger.log("[InputSwitch] Type switched to password");
            target.blur();

            await new Promise(resolve => setTimeout(resolve, 100));

            target.type = originalType || 'text';
            logger.log("[InputSwitch] Type restored to", target.type);
            target.focus();
        }

        target.value = '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.focus();

        target.focus();

        logger.log("Showing ghost text (Sentence Mode):", { text: result.translatedText, position: 0 });
        useTranslationStore.getState().show(result.translatedText, target, 0);
        recordTranslation(text);
    } catch (err) {
        logger.warn("Translation failed", err);
    }
}

async function handleWordTranslation(target: HTMLInputElement | HTMLTextAreaElement) {
    const fullText = target.value;
    const cursorPosition = target.selectionStart || fullText.length;
    const textBeforeCursor = fullText.slice(0, cursorPosition);

    // 重新计算 segments，因为 Space x3 触发时末尾可能有空格
    const cleanTextBeforeCursor = textBeforeCursor.trimEnd();
    const cleanSegments = cleanTextBeforeCursor.split(' ');
    // 获取最后一个非空片段作为待翻译文本
    const textToTranslate = cleanSegments[cleanSegments.length - 1];

    // 计算删除的起始位置：cleanTextBeforeCursor 的长度 - 最后一个词的长度
    // 也就是最后一个词之前的那个字符的位置
    const segmentStartIndex = cleanTextBeforeCursor.length - textToTranslate.length;

    logger.log("Input Text extraction:", { fullText, textToTranslate, segmentStartIndex, cursorPosition });

    const hasChinese = /[\u4e00-\u9fa5]/.test(textToTranslate);

    if (!textToTranslate.trim() || !hasChinese) {
        logger.log("Skipping translation: No Chinese detected or empty text.", { textToTranslate, hasChinese });
        return;
    }

    try {
        const result = await translateText(textToTranslate);
        logger.log("Word Translation Result:", result);

        // 🔑 强制切换到英文输入法
        if (target instanceof HTMLInputElement) {
            logger.log("[InputSwitch] Attempting to switch input method...");
            const originalType = target.type;

            target.type = 'password';
            logger.log(`[InputSwitch] Target type is now: ${target.type}`);

            target.blur();
            logger.log("[InputSwitch] Target blurred");

            await new Promise(resolve => setTimeout(resolve, 100));

            target.type = originalType || 'text';
            logger.log(`[InputSwitch] Target type restored to: ${target.type}`);

            target.focus();
            logger.log("[InputSwitch] Target focused");
        }

        // 第二步：删除中文和末尾空格
        // segmentStartIndex 是 textToTranslate (例如 "你好") 的开始位置
        // cursorPosition 是光标位置（在空格之后）
        // 我们要删除 segmentStartIndex 到 cursorPosition 之间的所有内容

        const before = target.value.slice(0, segmentStartIndex);
        const after = target.value.slice(cursorPosition);

        target.value = before + after;

        // 恢复光标到删除点
        target.setSelectionRange(segmentStartIndex, segmentStartIndex);

        // 触发 input 事件
        target.dispatchEvent(new Event('input', { bubbles: true }));

        // 第三步：显示虚影文本
        logger.log("Showing ghost text:", { text: result.translatedText, position: segmentStartIndex });
        useTranslationStore.getState().show(result.translatedText, target, segmentStartIndex);
        recordTranslation(textToTranslate);

        logger.log("Ghost text shown, store state:", useTranslationStore.getState());
    } catch (err) {
        logger.warn("Word Translation failed", err);
    }
}
