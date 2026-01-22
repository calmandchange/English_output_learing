import { useTranslationStore } from './store.ts';
import { getConfig } from './config.ts';
import { translateText } from './translation.ts';
import { recordTranslation } from './stats.ts';



const logger = {
    log: (msg: string, ...args: any[]) => console.log(`[InputListener] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[InputListener] ${msg}`, ...args),
};

/**
 * 智能处理连接符：根据 LLM 返回值和前文末尾字符决定连接符
 * @param llmConnector - LLM 返回的连接符
 * @param previousText - 前文内容
 * @returns 最终使用的连接符
 */
function getSmartConnector(llmConnector: string | undefined, previousText: string): string {
    // 如果 LLM 返回了有效的连接符，直接使用
    if (llmConnector && llmConnector.trim()) {
        return llmConnector;
    }

    // 如果没有前文，不需要连接符
    if (!previousText) {
        return '';
    }

    // 根据前文末尾字符智能决定连接符
    const lastChar = previousText[previousText.length - 1];

    if (/[,.!?;:]/.test(lastChar)) {
        // 末尾是标点，只加空格
        return ' ';
    } else if (/\s/.test(lastChar)) {
        // 末尾是空格，不需要额外连接符
        return '';
    } else {
        // 末尾是普通字符，加逗号+空格
        return ', ';
    }
}

/**
 * 获取 contenteditable 元素的文本内容
 */
function getContentEditableText(element: HTMLElement): string {
    return element.innerText || element.textContent || '';
}

/**
 * 设置 contenteditable 元素的文本内容
 * 使用浏览器原生 API 模拟用户操作（适用于 Lexical 等富文本编辑器）
 * @param element - 目标元素
 * @param text - 要设置的文本（空字符串表示清空）
 */
async function setContentEditableText(element: HTMLElement, text: string): Promise<void> {
    logger.log("setContentEditableText 开始", { text, 清空前内容: getContentEditableText(element) });

    try {
        // 保存当前焦点状态
        const wasFocused = document.activeElement === element;

        // 1. 确保元素聚焦（避免重复聚焦导致事件抖动）
        if (!wasFocused) {
            element.focus();
            // 使用 RAF 延迟后续操作，让焦点事件完成
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        // 检测是否为 Lexical 编辑器
        const isLexical = element.dataset.lexicalEditor === 'true' ||
            element.querySelector('[data-lexical-text="true"]') !== null;

        logger.log("编辑器类型检测:", { isLexical });

        if (isLexical) {
            // === Lexical 编辑器：使用键盘模拟清空 ===
            logger.log("清空 Lexical 编辑器 - 模拟 Ctrl+A + Backspace");

            element.focus();
            await new Promise(resolve => setTimeout(resolve, 30));

            // 模拟 Ctrl+A (全选)
            element.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'a',
                code: 'KeyA',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            }));

            await new Promise(resolve => setTimeout(resolve, 10));

            // 模拟 Backspace (删除)
            element.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Backspace',
                code: 'Backspace',
                bubbles: true,
                cancelable: true
            }));

            await new Promise(resolve => setTimeout(resolve, 100));

            // 验证是否清空
            let currentContent = getContentEditableText(element);
            logger.log("Lexical 清空后验证，当前内容:", currentContent);

            // 如果键盘模拟失败，强制清空 DOM
            if (currentContent.trim() !== '') {
                logger.warn("键盘模拟失败，强制清空 DOM");
                element.innerHTML = '<p class="first:mt-0 last:mb-0" dir="auto"><br></p>';
                element.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 50));
            }

        } else {
            // === 普通 contenteditable 处理 ===
            logger.log("清空普通 contenteditable 元素");

            // 直接清空 DOM
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }

            await new Promise(resolve => setTimeout(resolve, 30));
        }

        // 设置新内容
        if (text) {
            // 对于 Lexical，使用 execCommand 插入文本
            if (isLexical) {
                document.execCommand('insertText', false, text);
            } else {
                element.textContent = text;
            }
        }

        // 触发 input 事件让框架感知变化
        element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: text ? 'insertText' : 'deleteContentBackward',
            data: text || null
        }));

        // 确保焦点仍在元素上（使用 RAF 避免抖动）
        if (wasFocused || document.activeElement !== element) {
            requestAnimationFrame(() => {
                if (document.activeElement !== element) {
                    element.focus();
                }
            });
        }

        logger.log("setContentEditableText 完成，最终内容:", getContentEditableText(element));

    } catch (error) {
        logger.warn("setContentEditableText 错误:", error);
        throw error;
    }
}

/**
 * 处理 contenteditable 元素的整句翻译
 */
async function handleContentEditableSentenceTranslation(target: HTMLElement) {
    const fullText = getContentEditableText(target).trimEnd();
    logger.log("Processing Contenteditable Sentence Translation", { fullText });

    if (!fullText.trim()) {
        logger.log("Empty text, skipping.");
        return;
    }

    // 显示加载动画
    useTranslationStore.getState().setLoading(true, target);

    try {
        const result = await translateText(fullText);
        logger.log("Translation Result:", result);

        // 关闭加载状态
        useTranslationStore.getState().setLoading(false);

        // 清空输入框
        await setContentEditableText(target, '');
        target.focus();

        // 显示虚影（不带连接符）
        logger.log("Showing ghost text (Contenteditable Sentence Mode):", {
            text: result.translatedText
        });

        useTranslationStore.getState().show(
            result.translatedText,
            target,
            0
        );

        recordTranslation(fullText, result.translatedText);
    } catch (err) {
        logger.warn("Contenteditable Translation failed", err);
        useTranslationStore.getState().setNetworkError(true, target);
    }
}

/**
 * 处理 contenteditable 元素的单词翻译
 */
async function handleContentEditableWordTranslation(target: HTMLElement) {
    const fullText = getContentEditableText(target);
    const cleanText = fullText.trimEnd();
    // 修改：使用正则分割，支持符号和空格作为边界
    const segments = cleanText.split(/[\s,.!?;:，。！？：；]+/);
    const textToTranslate = segments[segments.length - 1];

    logger.log("Processing Contenteditable Word Translation", { fullText, textToTranslate });

    const hasChinese = /[\u4e00-\u9fa5]/.test(textToTranslate);
    if (!textToTranslate.trim() || !hasChinese) {
        logger.log("Skipping: No Chinese detected or empty text.");
        return;
    }

    // 提取前文 (保留原文的标点符号)
    const newText = cleanText.substring(0, cleanText.length - textToTranslate.length);
    logger.log("Extracted previous text:", newText);

    // 显示加载动画
    useTranslationStore.getState().setLoading(true, target);

    try {
        const result = await translateText(textToTranslate);
        logger.log("Word Translation Result:", result);

        // 关闭加载状态
        useTranslationStore.getState().setLoading(false);

        // 删除最后一个中文词，保留前面的内容
        // 删除最后一个中文词，保留前面的内容
        // 获取智能连接符
        const connector = getSmartConnector(undefined, newText);

        // 删除最后一个中文词，保留前面的内容
        await setContentEditableText(target, newText);
        target.focus();

        // 将光标移到末尾
        const selection = window.getSelection();
        if (selection && target.childNodes.length > 0) {
            const range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // 显示 ghost text
        logger.log("Showing ghost text (Contenteditable Word Mode):", {
            text: result.translatedText
        });

        useTranslationStore.getState().show(
            result.translatedText,
            target,
            newText.length
        );

        recordTranslation(textToTranslate, result.translatedText);
    } catch (err) {
        logger.warn("Contenteditable Word Translation failed", err);
        useTranslationStore.getState().setNetworkError(true, target);
    }
}


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

    // Tab 键处理：无虚字时触发翻译或写作检测
    if (event.key === 'Tab') {
        const { isVisible, ghostText } = useTranslationStore.getState();

        // 1. 虚字可见：由 GhostText 组件处理（补全）
        if (isVisible && ghostText) {
            return;
        }

        // 2. 虚字不可见：检查文本内容
        logger.log("Tab pressed without ghost text, checking context...");

        let fullText = '';
        let cursorPosition = 0;

        if (deepTarget instanceof HTMLInputElement || deepTarget instanceof HTMLTextAreaElement) {
            fullText = deepTarget.value;
            cursorPosition = deepTarget.selectionStart || fullText.length;
        } else if (deepTarget.isContentEditable) {
            fullText = getContentEditableText(deepTarget);
            // 简化处理：contentEditable 暂取末尾，更精确的光标位置获取比较复杂
            // TODO: 优化 contentEditable 的光标位置获取
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                cursorPosition = fullText.length; // 暂时假设在末尾
            }
        }

        const textBeforeCursor = fullText.slice(0, cursorPosition);
        const textToCheck = textBeforeCursor.trimEnd();

        // 提取最后一个片段进行检测（类似于原来的 Word 模式逻辑）
        const segments = textToCheck.split(/[\s,.!?;:，。！？：；]+/);
        const lastSegment = segments[segments.length - 1];

        // 检测字符类型的辅助函数（支持字符串和单字符）
        const containsChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str);
        const containsEnglish = (str: string) => /[a-zA-Z]/.test(str);

        logger.log("Tab 检测 lastSegment:", { lastSegment, textToCheck });

        let hasChinese = containsChinese(lastSegment);
        let hasEnglish = containsEnglish(lastSegment);

        // 优化：如果 lastSegment 为空或没有有效字符，继续往前查找
        if (!hasChinese && !hasEnglish && textToCheck.length > 0) {
            logger.log("lastSegment 无有效字符，向前查找...", { lastSegment });

            // 从 textToCheck 的末尾向前查找，直到找到中文或英文字母
            for (let i = textToCheck.length - 1; i >= 0; i--) {
                const char = textToCheck[i];
                if (containsChinese(char)) {
                    hasChinese = true;
                    logger.log("向前查找到中文字符:", char);
                    break;
                } else if (containsEnglish(char)) {
                    hasEnglish = true;
                    logger.log("向前查找到英文字符:", char);
                    break;
                }
                // 继续跳过符号和空格
            }
        }

        if (hasChinese) {
            // === 中文 + Tab => 翻译 ===
            logger.log("Context: Chinese detected, triggering Translation");
            event.preventDefault();

            if (deepTarget instanceof HTMLInputElement || deepTarget instanceof HTMLTextAreaElement) {
                // 使用空格判断句子/单词模式 (保持原有逻辑)
                if (/\s/.test(textToCheck)) {
                    await handleWordTranslation(deepTarget);
                } else {
                    await handleSentenceTranslation(deepTarget);
                }
            } else if (deepTarget.isContentEditable) {
                if (/\s/.test(textToCheck)) {
                    await handleContentEditableWordTranslation(deepTarget);
                } else {
                    await handleContentEditableSentenceTranslation(deepTarget);
                }
            }

        } else if (hasEnglish) {
            // === 英文 + Tab => AI 辅导 ===
            // 安全检查：确保 chrome.storage 可用
            if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
                logger.warn("chrome.storage.sync 不可用，跳过 AI 辅导");
                return;
            }

            const config = await getConfig();
            if (config.aiWritingAssistant) {
                logger.log("Context: English detected, triggering AI Coaching");
                event.preventDefault();

                // 设置 targetElement 和插入位置
                useTranslationStore.setState({
                    targetElement: deepTarget as any,
                    insertPosition: cursorPosition
                });

                // 触发写作检测
                useTranslationStore.getState().triggerWritingCheck();
            }
        } else {
            logger.log("Context: No specific trigger detected, allowing default Tab behavior");
        }
    }
}

async function handleSentenceTranslation(target: HTMLInputElement | HTMLTextAreaElement) {
    const fullText = target.value;
    logger.log("Processing Sentence Translation", { fullText });

    if (!fullText.trim()) {
        logger.log("Empty text, skipping.");
        return;
    }

    // 显示加载动画
    useTranslationStore.getState().setLoading(true, target);

    try {
        const result = await translateText(fullText);
        logger.log("Translation Result:", result);

        // 关闭加载状态
        useTranslationStore.getState().setLoading(false);

        // 聚焦输入框
        target.focus();

        target.value = '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.focus();

        // 显示 ghost text
        logger.log("Showing ghost text (Sentence Mode):", {
            text: result.translatedText,
            position: 0
        });
        useTranslationStore.getState().show(
            result.translatedText,
            target,
            0
        );

        recordTranslation(fullText, result.translatedText);
    } catch (err) {
        logger.warn("Translation failed", err);
        // 显示网络错误提示
        useTranslationStore.getState().setNetworkError(true, target);
    }
}

async function handleWordTranslation(target: HTMLInputElement | HTMLTextAreaElement) {
    const fullText = target.value;
    const cursorPosition = target.selectionStart || fullText.length;
    const textBeforeCursor = fullText.slice(0, cursorPosition);

    // 重新计算 segments，因为 Space x3 触发时末尾可能有空格
    const cleanTextBeforeCursor = textBeforeCursor.trimEnd();
    const cleanSegments = cleanTextBeforeCursor.split(/[\s,.!?;:，。！？：；]+/);
    // 获取最后一个非空片段作为待翻译文本
    const textToTranslate = cleanSegments[cleanSegments.length - 1];

    // 计算删除的起始位置：cleanTextBeforeCursor 的长度 - 最后一个词的长度
    // 也就是最后一个词之前的那个字符的位置
    const segmentStartIndex = cleanTextBeforeCursor.length - textToTranslate.length;

    logger.log("Input Text extraction:", {
        fullText,
        textToTranslate,
        segmentStartIndex,
        cursorPosition
    });

    const hasChinese = /[\u4e00-\u9fa5]/.test(textToTranslate);

    if (!textToTranslate.trim() || !hasChinese) {
        logger.log("Skipping translation: No Chinese detected or empty text.", { textToTranslate, hasChinese });
        return;
    }

    // 显示加载动画
    useTranslationStore.getState().setLoading(true, target);

    try {
        const result = await translateText(textToTranslate);
        logger.log("Word Translation Result:", result);

        // 关闭加载状态
        useTranslationStore.getState().setLoading(false);

        // 聚焦输入框
        target.focus();
        logger.log("[InputSwitch] Target focused");

        // 第二步：删除中文和末尾空格
        // segmentStartIndex 是 textToTranslate (例如 "你好") 的开始位置
        // cursorPosition 是光标位置（在空格之后）
        // 我们要删除 segmentStartIndex 到 cursorPosition 之间的所有内容

        // 获取智能连接符
        const before = target.value.slice(0, segmentStartIndex);
        const after = target.value.slice(cursorPosition);

        target.value = before + after;

        // 恢复光标到删除点
        target.setSelectionRange(segmentStartIndex, segmentStartIndex);

        // 触发 input 事件
        target.dispatchEvent(new Event('input', { bubbles: true }));

        // 第三步：显示虚影文本
        logger.log("Showing ghost text:", {
            text: result.translatedText,
            position: segmentStartIndex
        });

        useTranslationStore.getState().show(
            result.translatedText,
            target,
            segmentStartIndex
        );

        recordTranslation(textToTranslate, result.translatedText);

        logger.log("Ghost text shown, store state:", useTranslationStore.getState());
    } catch (err) {
        logger.warn("Word Translation failed", err);
        // 显示网络错误提示
        useTranslationStore.getState().setNetworkError(true, target);
    }
}
