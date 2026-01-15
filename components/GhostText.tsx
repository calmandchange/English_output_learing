import React, { useEffect, useRef, useState } from 'react';
import { useTranslationStore } from '@/services/store';

/**
 * GhostText 组件 - 在输入框内显示固定位置的虚影
 * 用户输入正确字符时，对应位置的虚影消失
 * 删除字符时，虚影重新显示
 * 按 Tab 键可以补全剩余虚影
 */
export const GhostText = () => {
    const {
        isVisible,
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

    const [position, setPosition] = useState<{ top: number; left: number; height: number } | null>(null);
    const ghostRef = useRef<HTMLSpanElement>(null);



    // 计算虚影文本的固定位置（基于 insertPosition）
    useEffect(() => {
        if (!useTranslationStore.getState().isVisible) return;
        if (!isVisible || !targetElement) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            try {
                const rect = targetElement.getBoundingClientRect();
                const style = window.getComputedStyle(targetElement);
                const paddingLeft = parseFloat(style.paddingLeft) || 0;
                const paddingTop = parseFloat(style.paddingTop) || 0;
                const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 16;

                // 获取到虚影起始位置的文本
                const textBeforeGhost = targetElement.value.slice(0, insertPosition);

                // 创建一个临时的 span 来测量文本宽度
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
                measureSpan.textContent = textBeforeGhost || '';
                document.body.appendChild(measureSpan);
                const textWidth = measureSpan.offsetWidth;
                document.body.removeChild(measureSpan);

                const newPosition = {
                    top: rect.top + paddingTop,
                    left: rect.left + paddingLeft + textWidth,
                    height: lineHeight
                };

                console.log('[GhostText] Calculated position:', {
                    rect,
                    padding: { left: paddingLeft, top: paddingTop },
                    textWidth,
                    textBeforeGhost,
                    newPosition
                });

                setPosition(newPosition);
            } catch (err) {
                console.error('[GhostText] Error calculating position:', err);
            }
        };

        console.log('[GhostText] Effect triggered: Updating position', { isVisible, hasTarget: !!targetElement });

        updatePosition();

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, targetElement, insertPosition]);

    // 监听用户输入变化
    useEffect(() => {
        if (!isVisible || !targetElement) return;

        const handleInput = () => {
            updateMatch(targetElement.value);
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

        // 失焦时隐藏（延迟更长一些）
        // 使用 timeout ref 防止闭包问题，并确保卸载时清理
        let blurTimeout: NodeJS.Timeout | null = null;

        const handleBlur = () => {
            console.log('[GhostText] Target blurred, scheduling hide in 500ms');
            blurTimeout = setTimeout(() => {
                if (useTranslationStore.getState().isVisible) {
                    // Double check if we are still blurred (user might have clicked back quickly, or focus event fired)
                    // But activeElement check might fail across shadow boundaries or iframes. 
                    // Usually checking if document.activeElement === targetElement is safe enough for simple cases.
                    if (document.activeElement !== targetElement) {
                        console.log('[GhostText] Hiding due to blur timeout');
                        hide();
                    } else {
                        console.log('[GhostText] Blur timeout fired but element is focused, cancelling hide');
                    }
                }
            }, 500);
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
    }, [isVisible, targetElement, updateMatch, hide]);



    if (!isVisible || !position || !ghostText) {
        return null;
    }

    // 计算剩余未匹配、未被错误遮盖的虚影文本
    const remainingGhost = ghostText.slice(consumedLength);

    if (!remainingGhost && !hasError) return null;

    return (
        <span
            ref={ghostRef}
            style={{
                position: 'fixed',  // 使用 fixed 而不是 absolute，避免 scroll 问题
                top: position.top,
                left: position.left,
                zIndex: 2147483647,  // 最大 z-index
                whiteSpace: 'pre',
                pointerEvents: 'none',
                userSelect: 'none',
                font: targetElement ? window.getComputedStyle(targetElement).font : 'inherit',
                lineHeight: `${position.height}px`,
            }}
        >
            {/* 1. 已匹配部分：使用用户输入的文本占位，但完全透明 (invisible but takes space) */}
            <span style={{ visibility: 'hidden' }}>
                {inputSegment.slice(0, matchedCount)}
            </span>

            {/* 2. 错误部分：使用用户输入的文本占位，文字透明但显示红色波浪线 */}
            {hasError && (
                <span style={{
                    color: 'transparent', // 文字透明，让 Input 中的文字显示出来
                    textDecoration: 'underline wavy #ef4444', // 红色波浪线
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
