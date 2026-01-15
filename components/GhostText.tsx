import React, { useEffect, useRef, useState } from 'react';
import { useTranslationStore } from '@/services/store';

/**
 * 输入框边界信息
 */
interface InputBounds {
    /** 输入框可视区域左边界（相对于视口） */
    left: number;
    /** 输入框可视区域右边界（相对于视口） */
    right: number;
    /** 输入框可视区域顶部（相对于视口） */
    top: number;
    /** 输入框可视区域底部（相对于视口） */
    bottom: number;
    /** 内容区域宽度（不含 padding/scrollbar） */
    contentWidth: number;
    /** 内容区域高度 */
    contentHeight: number;
    /** 左 padding */
    paddingLeft: number;
    /** 上 padding */
    paddingTop: number;
    /** 右 padding */
    paddingRight: number;
    /** 行高 */
    lineHeight: number;
    /** 水平滚动偏移 */
    scrollLeft: number;
    /** 垂直滚动偏移 */
    scrollTop: number;
    /** 是否为多行输入框 */
    isMultiline: boolean;
}

/**
 * 虚字位置信息
 */
interface GhostPosition {
    top: number;
    left: number;
    height: number;
    maxWidth: number;
    isMultiline: boolean;
    inputWidth: number;
}

/**
 * 辅助函数：获取元素的文本内容
 */
const getElementValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement): string => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.value;
    }
    return element.innerText || element.textContent || '';
};

/**
 * 获取输入框的边界信息
 */
const getInputBounds = (element: HTMLInputElement | HTMLTextAreaElement | HTMLElement): InputBounds => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;

    // 计算行高
    let lineHeight = parseFloat(style.lineHeight);
    if (isNaN(lineHeight) || style.lineHeight === 'normal') {
        lineHeight = parseFloat(style.fontSize) * 1.2;
    }

    // 检测是否为多行输入框
    const isMultiline = element.tagName === 'TEXTAREA' ||
        (element instanceof HTMLInputElement && element.type === 'text' &&
            style.whiteSpace !== 'nowrap' && style.overflow === 'visible') ||
        element.isContentEditable;

    // 滚动偏移
    const scrollLeft = (element as HTMLInputElement).scrollLeft || 0;
    const scrollTop = (element as HTMLInputElement).scrollTop || 0;

    // 内容区域宽度（去除 padding 和 scrollbar）
    const scrollbarWidth = element.offsetWidth - element.clientWidth;
    const contentWidth = rect.width - paddingLeft - paddingRight - borderLeft - borderRight - scrollbarWidth;
    const contentHeight = rect.height - paddingTop - paddingBottom - borderTop;

    return {
        left: rect.left + borderLeft + paddingLeft,
        right: rect.right - borderRight - paddingRight - scrollbarWidth,
        top: rect.top + borderTop + paddingTop,
        bottom: rect.bottom - paddingBottom,
        contentWidth,
        contentHeight,
        paddingLeft,
        paddingTop,
        paddingRight,
        lineHeight,
        scrollLeft,
        scrollTop,
        isMultiline: element.tagName === 'TEXTAREA' || element.isContentEditable
    };
};

/**
 * 测量文本宽度
 */
const measureTextWidth = (text: string, style: CSSStyleDeclaration): number => {
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText = `
        font: ${style.font};
        font-size: ${style.fontSize};
        font-family: ${style.fontFamily};
        letter-spacing: ${style.letterSpacing};
        visibility: hidden;
        position: absolute;
        white-space: pre;
        left: -9999px;
    `;
    measureSpan.textContent = text || '';
    document.body.appendChild(measureSpan);
    const width = measureSpan.offsetWidth;
    document.body.removeChild(measureSpan);
    return width;
};

/**
 * GhostText 组件 - 在输入框内显示固定位置的虚影
 * 
 * 功能：
 * - 用户输入正确字符时，对应位置的虚影消失
 * - 删除字符时，虚影重新显示
 * - 按 Tab 键可以补全剩余虚影
 * - 虚字超长时截断，随用户输入逐渐显示
 * - 多行输入框支持虚字换行
 * - 虚字垂直居中显示
 */
export const GhostText = () => {
    const {
        isVisible,
        isLoading,
        networkError,
        targetElement,
        inputSegment,
        consumedLength,
        matchedCount,
        hasError,
        ghostText,
        insertPosition,
        updateMatch,
        hide,
        acceptGhost
    } = useTranslationStore();

    const [position, setPosition] = useState<GhostPosition | null>(null);
    const ghostRef = useRef<HTMLSpanElement>(null);
    const updatePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 计算虚影文本的位置（考虑滚动、边界、居中）- 添加防抖优化
    useEffect(() => {
        if (!useTranslationStore.getState().isVisible) return;
        if (!isVisible || !targetElement) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            try {
                const bounds = getInputBounds(targetElement);
                const style = window.getComputedStyle(targetElement);

                // 获取到虚影起始位置的文本
                const elementValue = getElementValue(targetElement);
                const textBeforeGhost = elementValue.slice(0, insertPosition);
                const textWidth = measureTextWidth(textBeforeGhost, style);

                // 计算虚字起始位置（考虑滚动偏移）
                const ghostStartX = bounds.left + textWidth - bounds.scrollLeft;

                // 计算可用最大宽度（虚字不能超出输入框右边界）
                const maxWidth = Math.max(0, bounds.right - ghostStartX);

                // 计算垂直位置
                let top: number;
                if (bounds.isMultiline) {
                    // 多行输入框：顶部对齐（减去滚动偏移）
                    top = bounds.top - bounds.scrollTop;
                } else {
                    // 单行输入框：垂直居中
                    const rect = targetElement.getBoundingClientRect();
                    const verticalCenter = (rect.height - bounds.lineHeight) / 2;
                    top = rect.top + verticalCenter;
                }

                const newPosition: GhostPosition = {
                    top,
                    left: ghostStartX,
                    height: bounds.lineHeight,
                    maxWidth,
                    isMultiline: bounds.isMultiline,
                    inputWidth: bounds.contentWidth
                };

                console.log('[GhostText] Position calculated:', {
                    bounds: { ...bounds, scrollLeft: bounds.scrollLeft, scrollTop: bounds.scrollTop },
                    textWidth,
                    ghostStartX,
                    maxWidth,
                    newPosition
                });

                setPosition(newPosition);
            } catch (err) {
                console.error('[GhostText] Error calculating position:', err);
            }
        };

        // 防抖版本的 updatePosition（用于滚动等高频事件）
        const debouncedUpdatePosition = () => {
            if (updatePositionTimeoutRef.current) {
                clearTimeout(updatePositionTimeoutRef.current);
            }
            updatePositionTimeoutRef.current = setTimeout(updatePosition, 150);
        };

        console.log('[GhostText] Effect triggered: Updating position', { isVisible, hasTarget: !!targetElement });

        // 立即计算初始位置
        updatePosition();

        // 监听滚动和调整大小（使用防抖）
        window.addEventListener('scroll', debouncedUpdatePosition, true);
        window.addEventListener('resize', debouncedUpdatePosition);
        targetElement.addEventListener('scroll', debouncedUpdatePosition);

        return () => {
            window.removeEventListener('scroll', debouncedUpdatePosition, true);
            window.removeEventListener('resize', debouncedUpdatePosition);
            targetElement.removeEventListener('scroll', debouncedUpdatePosition);
            if (updatePositionTimeoutRef.current) {
                clearTimeout(updatePositionTimeoutRef.current);
            }
        };
    }, [isVisible, targetElement, insertPosition, consumedLength]);

    // 监听用户输入变化
    useEffect(() => {
        if (!isVisible || !targetElement) return;

        const handleInput = () => {
            const elementValue = getElementValue(targetElement);
            updateMatch(elementValue);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                acceptGhost();
            } else if (e.key === 'Escape') {
                hide();
            }
        };

        targetElement.addEventListener('input', handleInput);
        targetElement.addEventListener('keydown', handleKeyDown as EventListener);

        // 失焦时延迟隐藏（优化：使用更短的延迟 + 焦点二次确认）
        let blurTimeout: NodeJS.Timeout | null = null;

        const handleBlur = () => {
            console.log('[GhostText] Target blurred, scheduling hide in 300ms');
            blurTimeout = setTimeout(() => {
                // 双重检查：确保元素真的失焦且 GhostText 仍然可见
                const isStillVisible = useTranslationStore.getState().isVisible;
                const isStillFocused = document.activeElement === targetElement;

                if (isStillVisible && !isStillFocused) {
                    console.log('[GhostText] Hiding due to blur timeout');
                    hide();
                } else if (isStillFocused) {
                    console.log('[GhostText] Blur timeout fired but element is focused, cancelling hide');
                }
            }, 300);
        };

        const handleFocus = () => {
            if (blurTimeout) {
                console.log('[GhostText] Target focused, cancelling hide');
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
        };

        targetElement.addEventListener('blur', handleBlur);
        targetElement.addEventListener('focus', handleFocus);

        return () => {
            targetElement.removeEventListener('input', handleInput);
            targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
            targetElement.removeEventListener('blur', handleBlur);
            targetElement.removeEventListener('focus', handleFocus);
            if (blurTimeout) clearTimeout(blurTimeout);
        };
    }, [isVisible, targetElement, updateMatch, hide, acceptGhost]);

    // 渲染加载动画（三个白点渐进式消失和出现）
    const renderLoadingDots = () => {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
            }}>
                {[0, 1, 2].map((index) => (
                    <span
                        key={index}
                        style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            animation: `loadingDot 1.2s ease-in-out ${index * 0.2}s infinite`,
                            boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)'
                        }}
                    />
                ))}
                <style>{`
                    @keyframes loadingDot {
                        0%, 80%, 100% {
                            opacity: 0.3;
                            transform: scale(0.8);
                        }
                        40% {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                `}</style>
            </span>
        );
    };

    // 渲染网络错误提示
    const renderNetworkError = () => {
        return (
            <span style={{
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
                ⚠ 网络连接异常
            </span>
        );
    };

    // 判断是否应该显示
    if (!isVisible || !position) {
        return null;
    }

    // 基础样式
    const baseStyle: React.CSSProperties = {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 2147483647,
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: `${position.height}px`,
    };

    // 显示加载动画
    if (isLoading) {
        return (
            <span ref={ghostRef} style={baseStyle}>
                {renderLoadingDots()}
            </span>
        );
    }

    // 显示网络错误提示
    if (networkError) {
        return (
            <span ref={ghostRef} style={baseStyle}>
                {renderNetworkError()}
            </span>
        );
    }

    // 如果没有 ghostText，则不显示
    if (!ghostText) {
        return null;
    }

    // 计算剩余未匹配、未被错误遮盖的虚影文本
    const remainingGhost = ghostText.slice(consumedLength);

    if (!remainingGhost && !hasError) return null;

    // 虚字容器样式
    const ghostContainerStyle: React.CSSProperties = {
        ...baseStyle,
        font: targetElement ? window.getComputedStyle(targetElement).font : 'inherit',
        // 关键：限制最大宽度并隐藏溢出
        maxWidth: position.maxWidth > 0 ? `${position.maxWidth}px` : undefined,
        overflow: 'hidden',
        // 多行时允许换行，单行时不换行
        whiteSpace: position.isMultiline ? 'pre-wrap' : 'pre',
        wordBreak: position.isMultiline ? 'break-word' : 'normal',
        // 多行时限制宽度
        width: position.isMultiline ? `${position.inputWidth}px` : undefined,
    };

    return (
        <span
            ref={ghostRef}
            style={ghostContainerStyle}
        >
            {/* 1. 已匹配部分：使用用户输入的文本占位，但完全透明 */}
            <span style={{ visibility: 'hidden' }}>
                {inputSegment.slice(0, matchedCount)}
            </span>

            {/* 2. 错误部分：使用用户输入的文本占位，文字透明但显示红色波浪线 */}
            {hasError && (
                <span style={{
                    color: 'transparent',
                    textDecoration: 'underline wavy #ef4444',
                    textDecorationThickness: '1.5px',
                    textUnderlineOffset: '2px'
                }}>
                    {inputSegment.slice(matchedCount)}
                </span>
            )}

            {/* 3. 剩余虚影部分：显示灰色文本 */}
            <span style={{
                color: 'rgba(100, 100, 100, 0.5)',
                fontStyle: 'italic'
            }}>
                {remainingGhost}
            </span>
        </span>
    );
};
