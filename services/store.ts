import { create } from 'zustand';

interface GhostTextState {
    isVisible: boolean;
    ghostText: string;
    targetElement: HTMLInputElement | HTMLTextAreaElement | null;
    insertPosition: number;
    matchedCount: number;
    consumedLength: number;
    inputSegment: string;
    hasError: boolean;
    // 保存原始属性
    originalAutocomplete: string;
    originalPlaceholder: string;
    originalInputMode: string;
    originalLang: string;

    show: (text: string, target: HTMLInputElement | HTMLTextAreaElement, position: number) => void;
    hide: () => void;
    updateMatch: (userInput: string) => void;
    acceptGhost: () => void;  // Tab 补全
}

export const useTranslationStore = create<GhostTextState>((set, get) => ({
    isVisible: false,
    ghostText: '',
    targetElement: null,
    insertPosition: 0,
    matchedCount: 0,
    hasError: false,
    originalAutocomplete: '',
    originalPlaceholder: '',
    originalInputMode: '',
    originalLang: '',

    show: (text, targetElement, insertPosition) => {
        // 保存原始属性
        const originalAutocomplete = targetElement.getAttribute('autocomplete') || '';
        const originalPlaceholder = targetElement.placeholder || '';
        const originalInputMode = targetElement.getAttribute('inputmode') || '';
        const originalLang = targetElement.getAttribute('lang') || '';


        // 禁用原生提示
        targetElement.setAttribute('autocomplete', 'off');
        targetElement.placeholder = '';

        // 设置为英文输入模式
        targetElement.setAttribute('inputmode', 'latin');
        targetElement.setAttribute('lang', 'en');

        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            targetElement.blur();
            setTimeout(() => {
                targetElement.focus();
                // 恢复光标位置
                targetElement.setSelectionRange(insertPosition, insertPosition);
            }, 10);
        }

        set({
            isVisible: true,
            ghostText: text,
            targetElement,
            insertPosition,
            matchedCount: 0,
            hasError: false,
            originalAutocomplete,
            originalPlaceholder,
            originalInputMode,
            originalLang
        });
    },

    hide: () => {
        const { targetElement, originalAutocomplete, originalPlaceholder, originalInputMode, originalLang } = get();

        // 恢复原始属性
        if (targetElement) {
            if (originalAutocomplete) {
                targetElement.setAttribute('autocomplete', originalAutocomplete);
            } else {
                targetElement.removeAttribute('autocomplete');
            }
            targetElement.placeholder = originalPlaceholder;

            if (originalInputMode) {
                targetElement.setAttribute('inputmode', originalInputMode);
            } else {
                targetElement.removeAttribute('inputmode');
            }
            if (originalLang) {
                targetElement.setAttribute('lang', originalLang);
            } else {
                targetElement.removeAttribute('lang');
            }
        }

        set({
            isVisible: false,
            ghostText: '',
            targetElement: null,
            matchedCount: 0,
            hasError: false,
            originalAutocomplete: '',
            originalPlaceholder: '',
            originalInputMode: '',
            originalLang: ''
        });
    },

    acceptGhost: () => {
        const { ghostText, targetElement, insertPosition, matchedCount, isVisible } = get();
        if (!isVisible || !targetElement || !ghostText) return;

        // 获取剩余未输入的部分
        const remaining = ghostText.slice(matchedCount);
        if (!remaining) return;

        // 在当前光标位置插入剩余文本
        const currentValue = targetElement.value;
        const cursorPos = insertPosition + matchedCount;
        const newValue = currentValue.slice(0, cursorPos) + remaining + currentValue.slice(cursorPos);
        targetElement.value = newValue;

        // 移动光标到插入文本之后
        const newCursorPos = cursorPos + remaining.length;
        targetElement.setSelectionRange(newCursorPos, newCursorPos);
        targetElement.focus();

        // 触发 input 事件
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));

        // 隐藏虚影（但不恢复属性，继续英文输入模式）
        set({
            isVisible: false,
            ghostText: '',
            matchedCount: 0,
            hasError: false
        });
    },

    consumedLength: 0,
    inputSegment: '', // The user input that overlaps/corresponds to the ghost text area

    updateMatch: (userInput: string) => {
        const { ghostText, insertPosition, isVisible } = get();
        if (!isVisible) return;

        // User input text starting from the ghost text position
        const inputSegment = userInput.slice(insertPosition);
        const consumedLength = inputSegment.length;

        let matchedCount = 0;

        // Calculate matched count (longest prefix match)
        for (let i = 0; i < inputSegment.length && i < ghostText.length; i++) {
            if (inputSegment[i].toLowerCase() === ghostText[i].toLowerCase()) {
                matchedCount = i + 1;
            } else {
                break;
            }
        }

        const hasError = consumedLength > matchedCount;

        // If fully matched (and no extra error chars? or just fully matched the ghost text?)
        // If the user typed the whole ghost text correctly (or more), we hide.
        // Actually if they typed "hellox", matchedCount=5 (len of hello). 
        // We probably want to hide the ghost overlay if the *Ghost Text* is fully exhausted by matches.
        if (matchedCount >= ghostText.length) {
            set({
                isVisible: false,
                matchedCount: 0,
                hasError: false,
                consumedLength: 0,
                inputSegment: ''
            });
        } else {
            set({
                matchedCount,
                hasError,
                consumedLength,
                inputSegment
            });
        }
    }
}));

