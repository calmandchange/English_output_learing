import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslationStore } from '@/services/store';

/**
 * 可拖动的写作建议弹窗组件
 * - 定位在输入框正下方
 * - 支持拖动
 * - 展示多个建议项
 */
export const ContextSuggestionModal: React.FC = () => {
    const {
        suggestions,
        targetElement,
        isCheckingWriting,
        acceptSuggestionByIndex,
        rejectSuggestionByIndex,
        acceptAllSuggestions
    } = useTranslationStore();

    // 拖动状态
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    // 计算初始位置（输入框正下方）
    useEffect(() => {
        if (suggestions.length > 0 && targetElement && !position) {
            const rect = targetElement.getBoundingClientRect();
            setPosition({
                x: rect.left,
                y: rect.bottom + 8  // 8px 间距
            });
        } else if (suggestions.length === 0) {
            setPosition(null);
        }
    }, [suggestions.length, targetElement]);

    // 拖动处理
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        const rect = modalRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Tab 键监听：有建议弹窗时按 Tab 一键应用所有
    useEffect(() => {
        if (suggestions.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                acceptAllSuggestions();
            }
        };

        // 使用 capture 阶段确保优先处理
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [suggestions.length, acceptAllSuggestions]);

    // 关闭所有建议
    const handleCloseAll = () => {
        useTranslationStore.setState({ suggestions: [] });
        setPosition(null);
    };

    // 如果正在检测中，显示加载状态
    if (isCheckingWriting) {
        return (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2147483647,
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #e5e7eb',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ color: '#374151', fontSize: '14px' }}>
                    正在检测写作质量...
                </span>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // 无建议则不显示
    if (suggestions.length === 0 || !position) {
        return null;
    }

    return (
        <div
            ref={modalRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 2147483647,
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                maxWidth: '480px',
                width: 'max-content',
                minWidth: '320px',
                animation: 'slideIn 0.2s ease-out',
                cursor: isDragging ? 'grabbing' : 'default'
            }}
        >
            {/* 标题栏（可拖动） */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'grab',
                    userSelect: 'none',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px 12px 0 0'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>✨</span>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1f2937'
                    }}>
                        写作建议 ({suggestions.length})
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {suggestions.length > 1 && (
                        <button
                            onClick={acceptAllSuggestions}
                            style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'white',
                                backgroundColor: '#10b981',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="按 Tab 键也可全部应用"
                        >
                            ✓ 全部应用
                            <span style={{
                                backgroundColor: 'rgba(255,255,255,0.25)',
                                padding: '1px 4px',
                                borderRadius: '2px',
                                fontSize: '10px'
                            }}>Tab</span>
                        </button>
                    )}
                    <button
                        onClick={handleCloseAll}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: '#9ca3af',
                            padding: '4px',
                            lineHeight: 1
                        }}
                        title="关闭"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* 建议列表 */}
            <div style={{
                padding: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {/* 排序：按层级升序，同层级按位置升序 */}
                {[...suggestions]
                    .sort((a, b) => {
                        // 先按 level 排序（1 → 2 → 3 → 4）
                        const levelDiff = (a.level || 4) - (b.level || 4);
                        if (levelDiff !== 0) return levelDiff;
                        // 同层级按 position.start 排序（从左到右）
                        return (a.position?.start || 0) - (b.position?.start || 0);
                    })
                    .map((suggestion, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#fafafa'
                            }}
                        >
                            {/* 类型标签 + 层级 + 类别 */}
                            <div style={{
                                marginBottom: '8px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                alignItems: 'center'
                            }}>
                                {/* 类型标签 */}
                                <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    backgroundColor: suggestion.type === 'grammar'
                                        ? '#fef3c7'
                                        : suggestion.type === 'idiom'
                                            ? '#dbeafe'
                                            : '#f3e8ff',
                                    color: suggestion.type === 'grammar'
                                        ? '#92400e'
                                        : suggestion.type === 'idiom'
                                            ? '#1e40af'
                                            : '#7c3aed'
                                }}>
                                    {suggestion.type === 'grammar' ? '🔧 语法' : suggestion.type === 'idiom' ? '💡 地道表达' : '✨ 风格'}
                                </span>

                                {/* 层级标签 */}
                                {suggestion.level && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        backgroundColor:
                                            suggestion.level === 1 ? '#ecfdf5' :  // 单词层 - 绿色
                                                suggestion.level === 2 ? '#eff6ff' :  // 短语层 - 蓝色
                                                    suggestion.level === 3 ? '#fffbeb' :  // 句子层 - 黄色
                                                        '#fdf2f8',                            // 语篇层 - 粉色
                                        color:
                                            suggestion.level === 1 ? '#047857' :
                                                suggestion.level === 2 ? '#1d4ed8' :
                                                    suggestion.level === 3 ? '#b45309' :
                                                        '#be185d',
                                        border: `1px solid ${suggestion.level === 1 ? '#a7f3d0' :
                                            suggestion.level === 2 ? '#bfdbfe' :
                                                suggestion.level === 3 ? '#fde68a' :
                                                    '#fbcfe8'
                                            }`
                                    }}>
                                        <span style={{ fontSize: '9px' }}>
                                            {suggestion.level === 1 ? 'L1' :
                                                suggestion.level === 2 ? 'L2' :
                                                    suggestion.level === 3 ? 'L3' : 'L4'}
                                        </span>
                                        <span>
                                            {suggestion.level === 1 ? '单词层' :
                                                suggestion.level === 2 ? '短语层' :
                                                    suggestion.level === 3 ? '句子层' : '语篇层'}
                                        </span>
                                    </span>
                                )}

                                {/* 类别标签 */}
                                {suggestion.category && (
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        backgroundColor: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {suggestion.category}
                                    </span>
                                )}
                            </div>

                            {/* 原文（完整句子，问题部分加波浪下划线） */}
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#fef2f2',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6,
                                    color: '#374151'
                                }}>
                                    {suggestion.fullSentence ? (() => {
                                        // 使用 original 在 fullSentence 中查找并高亮
                                        const idx = suggestion.fullSentence.indexOf(suggestion.original);
                                        if (idx !== -1) {
                                            return (
                                                <>
                                                    {suggestion.fullSentence.slice(0, idx)}
                                                    <span style={{
                                                        backgroundColor: '#fee2e2',
                                                        color: '#991b1b',
                                                        textDecorationLine: 'underline',
                                                        textDecorationStyle: 'wavy',
                                                        textDecorationColor: '#ef4444',
                                                        textUnderlineOffset: '3px',
                                                        padding: '1px 2px',
                                                        borderRadius: '2px'
                                                    }}>
                                                        {suggestion.original}
                                                    </span>
                                                    {suggestion.fullSentence.slice(idx + suggestion.original.length)}
                                                </>
                                            );
                                        }
                                        // 回退：显示完整句子
                                        return suggestion.fullSentence;
                                    })() : (
                                        <span style={{
                                            backgroundColor: '#fee2e2',
                                            color: '#991b1b',
                                            textDecorationLine: 'underline',
                                            textDecorationStyle: 'wavy',
                                            textDecorationColor: '#ef4444',
                                            textUnderlineOffset: '3px'
                                        }}>
                                            {suggestion.original}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 箭头 */}
                            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                <span style={{ color: '#9ca3af', fontSize: '16px' }}>↓</span>
                            </div>

                            {/* 建议（完整句子，修正部分加绿色高亮） */}
                            <div style={{ marginBottom: '8px' }}>
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#f0fdf4',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6,
                                    color: '#374151'
                                }}>
                                    {suggestion.correctedSentence ? (() => {
                                        // 使用 suggested 在 correctedSentence 中查找并高亮
                                        const idx = suggestion.correctedSentence.indexOf(suggestion.suggested);
                                        if (idx !== -1) {
                                            return (
                                                <>
                                                    {suggestion.correctedSentence.slice(0, idx)}
                                                    <span style={{
                                                        backgroundColor: '#bbf7d0',
                                                        color: '#166534',
                                                        fontWeight: 600,
                                                        padding: '1px 4px',
                                                        borderRadius: '2px'
                                                    }}>
                                                        {suggestion.suggested}
                                                    </span>
                                                    {suggestion.correctedSentence.slice(idx + suggestion.suggested.length)}
                                                </>
                                            );
                                        }
                                        // 回退：显示完整句子
                                        return suggestion.correctedSentence;
                                    })() : (
                                        <span style={{
                                            backgroundColor: '#d1fae5',
                                            color: '#065f46',
                                            fontWeight: 500
                                        }}>
                                            {suggestion.suggested}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 原因说明 */}
                            <p style={{
                                margin: '0 0 12px 0',
                                fontSize: '12px',
                                color: '#6b7280',
                                lineHeight: 1.5
                            }}>
                                {suggestion.reason}
                            </p>

                            {/* 操作按钮 */}
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => rejectSuggestionByIndex(index)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: '#6b7280',
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    忽略
                                </button>
                                <button
                                    onClick={() => acceptSuggestionByIndex(index)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: 'white',
                                        backgroundColor: '#3b82f6',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    接受
                                </button>
                            </div>
                        </div>
                    ))}
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};
