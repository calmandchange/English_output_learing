import { browser } from 'wxt/browser';

/**
 * 写作错误记录
 */
export interface WritingErrorRecord {
    type: 'grammar' | 'idiom' | 'style' | 'chinglish';
    level: 1 | 2 | 3 | 4 | 5;
    category: string;
    original: string;
    suggested: string;
    timestamp: number;
}

/**
 * 常见错误类型统计
 */
export interface MistakeStats {
    type: 'grammar' | 'vocabulary' | 'expression';
    category: string;
    count: number;
    examples: string[];
    suggestion: string;
}

/**
 * 词汇增长趋势
 */
export interface VocabularyGrowth {
    thisWeek: number;
    lastWeek: number;
    trend: 'up' | 'down' | 'stable';
}

/**
 * 学习洞察数据
 */
export interface LearningInsight {
    commonMistakes: MistakeStats[];
    vocabularyGrowth: VocabularyGrowth;
    recommendation: string;
    lastUpdated: number;
}

/**
 * 错误类型中文名映射
 */
const CATEGORY_CN_MAP: Record<string, string> = {
    'Spelling': '拼写错误',
    'Capitalization': '大小写',
    'Sentence Capitalization': '句首大写',
    'Word Form': '词形变化',
    'Article': '冠词使用',
    'Preposition': '介词搭配',
    'Subject-Verb Agreement': '主谓一致',
    'Tense': '时态错误',
    'Tense Errors': '时态错误',
    'Word Order': '词序问题',
    'Redundant Be-verb': '多余 be 动词',
    'Verb Choice': '动词选择',
    'Direct Translation': '直译',
    'Literal Translation': '逐字翻译',
    'Redundant Preposition': '多余介词',
    'Redundancy': '冗余用词',
    'Overuse of "very"': 'very 过度使用',
    'Overused Pattern': '过度使用的句式',
    'Fixed Expression': '固定表达',
    'Word Choice': '用词选择',
    'Collocation': '搭配问题',
    'Collocations': '搭配问题',
    'Phrasal Verb': '短语动词',
    'Style': '风格建议',
};

/**
 * 根据错误类型生成学习建议
 */
function generateSuggestion(category: string, type: string): string {
    const suggestions: Record<string, string> = {
        'Tense': '多注意时态标志词（yesterday, tomorrow 等），写完后检查动词形式',
        'Tense Errors': '时态是英语的难点，建议多阅读英文材料培养语感',
        'Article': '冠词 a/an/the 的使用需要多积累，注意可数名词前必须有冠词',
        'Subject-Verb Agreement': '第三人称单数记得加 s/es，复数主语用复数动词',
        'Spelling': '建议开启拼写检查，或多用生词本背诵正确拼写',
        'Word Order': '英语习惯 "主语 + 动词 + 宾语" 的顺序，副词位置也有讲究',
        'Collocation': '搭配是地道英语的关键，建议多查词典看例句',
        'Collocations': '搭配是地道英语的关键，建议多查词典看例句',
        'Phrasal Verb': '短语动词是口语的灵魂，多积累 look into, figure out 等常用短语',
        'Word Choice': '选词影响表达的地道程度，避免逐字翻译中文',
        'Verb Choice': '动词选择很重要，英语讲究精确表达',
        'Direct Translation': '避免直译中文思维，多学习 native 的表达方式',
        'Literal Translation': '逐字翻译是 Chinglish 的根源，要重新组织语言',
        'Redundancy': '英语讲究简洁，避免重复表达同一个意思',
    };

    if (type === 'chinglish') {
        return '中式英语是中国学习者的常见问题，多读英文原版材料，学习 native speaker 的表达习惯';
    }

    return suggestions[category] || '继续练习，保持学习的热情！';
}

/**
 * 记录写作错误
 */
export async function recordWritingError(error: Omit<WritingErrorRecord, 'timestamp'>): Promise<void> {
    const result = await browser.storage.local.get('writingErrors');
    const errors: WritingErrorRecord[] = (result.writingErrors || []) as WritingErrorRecord[];

    // 添加新错误记录
    errors.push({
        ...error,
        timestamp: Date.now(),
    });

    // 只保留最近 500 条记录
    const trimmedErrors = errors.slice(-500);

    await browser.storage.local.set({ writingErrors: trimmedErrors });
    console.log('[Insights] Recorded writing error:', error.category);
}

/**
 * 获取学习洞察数据
 */
export async function getLearningInsights(): Promise<LearningInsight> {
    const result = await browser.storage.local.get(['writingErrors', 'stats', 'streakData']);
    const errors: WritingErrorRecord[] = (result.writingErrors || []) as WritingErrorRecord[];
    const stats = (result.stats || {}) as Record<string, { englishText: string; lastTranslated: number }>;

    // 计算时间范围
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    // 统计本周和上周的词汇
    let thisWeekWords = 0;
    let lastWeekWords = 0;

    Object.values(stats).forEach(stat => {
        const words = stat.englishText.trim().split(/\s+/).length;
        if (stat.lastTranslated >= oneWeekAgo) {
            thisWeekWords += words;
        } else if (stat.lastTranslated >= twoWeeksAgo) {
            lastWeekWords += words;
        }
    });

    // 计算增长趋势
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (thisWeekWords > lastWeekWords * 1.1) {
        trend = 'up';
    } else if (thisWeekWords < lastWeekWords * 0.9) {
        trend = 'down';
    }

    // 统计常见错误（只统计最近一周）
    const recentErrors = errors.filter(e => e.timestamp >= oneWeekAgo);
    const categoryCount: Record<string, { count: number; examples: string[]; type: string }> = {};

    recentErrors.forEach(error => {
        if (!categoryCount[error.category]) {
            categoryCount[error.category] = { count: 0, examples: [], type: error.type };
        }
        categoryCount[error.category].count++;
        if (categoryCount[error.category].examples.length < 3) {
            const example = `${error.original} → ${error.suggested}`;
            if (!categoryCount[error.category].examples.includes(example)) {
                categoryCount[error.category].examples.push(example);
            }
        }
    });

    // 转换为 MistakeStats 数组并按频率排序
    const commonMistakes: MistakeStats[] = Object.entries(categoryCount)
        .map(([category, data]) => ({
            type: data.type === 'grammar' ? 'grammar' as const :
                data.type === 'chinglish' ? 'expression' as const : 'vocabulary' as const,
            category: CATEGORY_CN_MAP[category] || category,
            count: data.count,
            examples: data.examples,
            suggestion: generateSuggestion(category, data.type),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);  // 只取前 3 个

    // 生成综合建议
    let recommendation = '继续保持学习节奏，你做得很好！';
    if (commonMistakes.length > 0) {
        const topMistake = commonMistakes[0];
        recommendation = `本周重点关注「${topMistake.category}」，${topMistake.suggestion}`;
    } else if (thisWeekWords === 0) {
        recommendation = '本周还没有学习记录，来记录第一个表达吧！';
    }

    return {
        commonMistakes,
        vocabularyGrowth: {
            thisWeek: thisWeekWords,
            lastWeek: lastWeekWords,
            trend,
        },
        recommendation,
        lastUpdated: now,
    };
}
