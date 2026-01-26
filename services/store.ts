import { create } from 'zustand';
import type { WritingSuggestion } from './llm';
import { recordWritingError } from './insights';

// 保留旧接口用于兼容
interface GhostSuggestion {
    issue: string;
    original: string;
    suggested: string;
    reason?: string;
}

interface GhostTextState {
    isVisible: boolean;
    isLoading: boolean;
    networkError: boolean;
    ghostText: string;
    targetElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
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
    // 语法检查相关
    suggestion: GhostSuggestion | null;
    suggestions: WritingSuggestion[];  // 新增：多个写作建议
    needsSuggestion: boolean;
    isCheckingWriting: boolean;  // 写作检测中

    show: (text: string, target: HTMLInputElement | HTMLTextAreaElement | HTMLElement, position: number, connector?: string) => void;
    hide: () => void;
    updateMatch: (userInput: string) => void;
    acceptGhost: () => void;  // Tab 补全
    setLoading: (loading: boolean, target?: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => void;
    setNetworkError: (error: boolean, target?: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => void;
    setSuggestion: (suggestion: GhostSuggestion | null) => void;
    setSuggestions: (suggestions: WritingSuggestion[]) => void;  // 新增
    acceptSuggestion: () => void;
    acceptSuggestionByIndex: (index: number) => void;  // 新增
    rejectSuggestion: () => void;
    rejectSuggestionByIndex: (index: number) => void;  // 新增
    acceptAllSuggestions: () => void;  // Tab 一键应用所有建议
    setNeedsSuggestion: (needs: boolean) => void;
    triggerWritingCheck: () => Promise<void>;  // 新增
    setCheckingWriting: (checking: boolean) => void;  // 新增
    showFeedbackAnimation: boolean; // 新增：是否显示反馈动画
}

export const useTranslationStore = create<GhostTextState>((set, get) => ({
    isVisible: false,
    isLoading: false,
    networkError: false,
    ghostText: '',
    targetElement: null,
    insertPosition: 0,
    matchedCount: 0,
    hasError: false,
    originalAutocomplete: '',
    originalPlaceholder: '',
    originalInputMode: '',
    originalLang: '',
    suggestion: null,
    suggestions: [],
    needsSuggestion: false,
    isCheckingWriting: false,
    showFeedbackAnimation: false,

    show: (text, targetElement, insertPosition) => {
        // 保存原始属性
        const originalAutocomplete = targetElement.getAttribute('autocomplete') || '';
        const originalPlaceholder = (targetElement as HTMLInputElement).placeholder || '';
        const originalInputMode = targetElement.getAttribute('inputmode') || '';
        const originalLang = targetElement.getAttribute('lang') || '';

        // 禁用原生提示
        targetElement.setAttribute('autocomplete', 'off');
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            targetElement.placeholder = '';
        }

        // 设置为英文输入模式
        targetElement.setAttribute('inputmode', 'latin');
        targetElement.setAttribute('lang', 'en');

        set({
            isVisible: true,
            ghostText: text,
            targetElement,
            insertPosition,
            matchedCount: 0,
            hasError: false,
            consumedLength: 0,
            inputSegment: '',
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
            if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
                targetElement.placeholder = originalPlaceholder;
            }

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

    acceptGhost: async () => {
        const { ghostText, targetElement, insertPosition, matchedCount, isVisible } = get();
        if (!isVisible || !targetElement || !ghostText) return;

        // 获取剩余未输入的部分
        const remaining = ghostText.slice(matchedCount);
        if (!remaining) return;

        // 区分处理标准输入框和 contenteditable 元素
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
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
        } else if (targetElement.isContentEditable) {
            // 处理 contenteditable 元素
            const currentText = targetElement.innerText || '';
            const cursorPos = insertPosition + matchedCount;
            const newText = currentText.slice(0, cursorPos) + remaining + currentText.slice(cursorPos);
            targetElement.innerText = newText;

            // 将光标移到插入位置之后
            const selection = window.getSelection();
            const newCursorPos = cursorPos + remaining.length;
            if (selection && targetElement.childNodes.length > 0) {
                const range = document.createRange();
                const textNode = targetElement.firstChild;
                if (textNode) {
                    range.setStart(textNode, Math.min(newCursorPos, textNode.textContent?.length || 0));
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
            targetElement.focus();
            targetElement.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }

        // 隐藏虚影（不触发写作检测，只有无虚字按 Tab 才触发）
        set({
            isVisible: false,
            ghostText: '',
            matchedCount: 0,
            hasError: false,
            consumedLength: 0,
            inputSegment: ''
        });
    },

    consumedLength: 0,
    inputSegment: '', // The user input that overlaps/corresponds to the ghost text area

    updateMatch: (userInput: string) => {
        const { ghostText, insertPosition, isVisible } = get();
        if (!isVisible) return;

        // 用户在虚影位置开始的输入片段
        const inputSegment = userInput.slice(insertPosition);

        let matchedCount = 0;

        // 计算最长前缀匹配(支持符号、空格和字母)
        for (let i = 0; i < inputSegment.length && i < ghostText.length; i++) {
            const inputChar = inputSegment[i];
            const ghostChar = ghostText[i];

            // 对于字母:不区分大小写匹配
            // 对于符号和空格:精确匹配
            const isMatch = /[a-zA-Z]/.test(inputChar)
                ? inputChar.toLowerCase() === ghostChar.toLowerCase()
                : inputChar === ghostChar;

            if (isMatch) {
                matchedCount = i + 1;
            } else {
                break;
            }
        }

        // ✅ 修复：consumedLength 应该等于 matchedCount（已匹配的字符数）
        // 因为已匹配的字符会被「隐藏」，剩余的虚影从 matchedCount 开始显示
        const consumedLength = matchedCount;
        const hasError = inputSegment.length > matchedCount;

        // 如果虚影文本已全部匹配，隐藏虚影
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
    },

    setLoading: (loading: boolean, target?: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
        if (loading && target) {
            // 获取当前光标位置
            let position = 0;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                position = target.selectionStart || target.value.length;
            }
            set({
                isLoading: true,
                networkError: false,
                targetElement: target,
                insertPosition: position,
                isVisible: true
            });
        } else {
            set({ isLoading: loading });
        }
    },

    setNetworkError: (error: boolean, target?: HTMLInputElement | HTMLTextAreaElement | HTMLElement) => {
        if (error && target) {
            let position = 0;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                position = target.selectionStart || target.value.length;
            }
            set({
                networkError: true,
                isLoading: false,
                targetElement: target,
                insertPosition: position,
                isVisible: true
            });
            // 3秒后自动隐藏错误提示
            setTimeout(() => {
                const state = get();
                if (state.networkError) {
                    set({
                        networkError: false,
                        isVisible: false
                    });
                }
            }, 3000);
        } else {
            set({ networkError: error });
        }
    },

    setSuggestion: (suggestion: GhostSuggestion | null) => {
        set({ suggestion });
    },

    acceptSuggestion: () => {
        const { suggestion, targetElement } = get();
        if (!suggestion || !targetElement) return;

        // 获取当前内容
        const currentContent = (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)
            ? targetElement.value
            : (targetElement.innerText || targetElement.textContent || '');

        // 替换原文为建议文本
        const newContent = currentContent.replace(
            suggestion.original,
            suggestion.suggested
        );

        // 更新内容
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            targetElement.value = newContent;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            targetElement.innerText = newContent;
        }

        // 更新缓存（建议已被接受，内容已改变）
        set({
            suggestion: null
        });
    },

    rejectSuggestion: () => {
        // 拒绝建议
        set({ suggestion: null });
    },

    setNeedsSuggestion: (needs: boolean) => {
        set({ needsSuggestion: needs });
    },

    setSuggestions: (suggestions) => {
        set({ suggestions });
    },

    setCheckingWriting: (checking: boolean) => {
        set({ isCheckingWriting: checking });
    },

    acceptSuggestionByIndex: (index: number) => {
        const { suggestions, targetElement } = get();
        const suggestion = suggestions[index];
        if (!suggestion || !targetElement) return;

        // 记录错误类型，用于学习洞察统计
        recordWritingError({
            type: suggestion.type,
            level: suggestion.level,
            category: suggestion.category,
            original: suggestion.original,
            suggested: suggestion.suggested,
        });

        // 获取当前内容
        const currentContent = (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)
            ? targetElement.value
            : (targetElement.innerText || targetElement.textContent || '');

        // 替换原文为建议文本
        const newContent = currentContent.replace(suggestion.original, suggestion.suggested);

        // 更新内容
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            targetElement.value = newContent;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            targetElement.innerText = newContent;
        }

        // 移除已处理的建议
        const newSuggestions = suggestions.filter((_, i) => i !== index);
        set({
            suggestions: newSuggestions
        });
    },

    rejectSuggestionByIndex: (index: number) => {
        const { suggestions } = get();
        const newSuggestions = suggestions.filter((_, i) => i !== index);
        set({ suggestions: newSuggestions });
    },

    acceptAllSuggestions: () => {
        const { suggestions, targetElement } = get();
        if (!suggestions.length || !targetElement) return;

        // 获取当前内容
        let currentContent = (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)
            ? targetElement.value
            : (targetElement.innerText || targetElement.textContent || '');

        // 从后往前按顺序应用所有建议，避免索引错位
        // 先按 original 在 currentContent 中的位置排序（从后往前）
        const sortedSuggestions = [...suggestions].sort((a, b) => {
            const posA = currentContent.lastIndexOf(a.original);
            const posB = currentContent.lastIndexOf(b.original);
            return posB - posA;  // 从后往前排列
        });

        // 依次替换
        for (const suggestion of sortedSuggestions) {
            currentContent = currentContent.replace(suggestion.original, suggestion.suggested);
        }

        // 更新内容
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
            targetElement.value = currentContent;
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            targetElement.innerText = currentContent;
        }

        // 清空建议列表
        set({ suggestions: [] });
    },

    triggerWritingCheck: async () => {
        const { targetElement, isCheckingWriting } = get();
        if (!targetElement || isCheckingWriting) return;

        // 获取当前完整内容
        const currentContent = (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement)
            ? targetElement.value
            : (targetElement.innerText || targetElement.textContent || '');

        // 只检测英文内容
        if (!/[a-zA-Z]/.test(currentContent)) {
            console.log('[Store] No English content, skipping');
            return;
        }

        console.log('[Store] Checking full content:', currentContent.substring(0, 100));

        set({ isCheckingWriting: true });

        try {
            // 动态导入避免循环依赖
            const { checkWritingFull } = await import('./writingAssistant');

            // 直接检测完整内容
            const result = await checkWritingFull(currentContent, targetElement);

            if (result && result.suggestions && result.suggestions.length > 0) {
                set({ suggestions: result.suggestions });
            } else {
                // 没有建议，显示反馈动画
                set({
                    showFeedbackAnimation: true,
                    isVisible: true, // 确保 GhostText 组件可见以进行渲染和位置计算
                    isLoading: false
                });

                // 2秒后自动隐藏
                setTimeout(() => {
                    const { showFeedbackAnimation } = get();
                    // 只有当前仍显示反馈动画时才关闭（避免打断后续操作）
                    if (showFeedbackAnimation) {
                        set({
                            showFeedbackAnimation: false,
                            isVisible: false
                        });
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('[Store] Writing check failed:', error);
        } finally {
            set({ isCheckingWriting: false });
        }
    },
}));

