import { browser } from 'wxt/browser';

/**
 * 个人词库条目
 */
export interface PersonalVocabulary {
    word: string;           // 英文单词/短语
    translation: string;    // 中文翻译
    context?: string;       // 上下文例句
    learnedAt: number;      // 添加时间戳
    reviewCount: number;    // 复习次数
    mastery: 0 | 1 | 2 | 3; // 0=未学 1=认识 2=熟悉 3=掌握
    nextReview: number;     // 下次复习时间戳
}

/**
 * 复习间隔（毫秒）- 基于艾宾浩斯遗忘曲线
 */
const REVIEW_INTERVALS: Record<0 | 1 | 2 | 3, number> = {
    0: 1 * 24 * 60 * 60 * 1000,   // 1 天
    1: 3 * 24 * 60 * 60 * 1000,   // 3 天
    2: 7 * 24 * 60 * 60 * 1000,   // 7 天
    3: 30 * 24 * 60 * 60 * 1000,  // 30 天
};

/**
 * 添加单词到个人词库
 */
export async function addToVocabulary(
    word: string,
    translation: string,
    context?: string
): Promise<boolean> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary: Record<string, PersonalVocabulary> =
        (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    // 检查是否已存在
    if (vocabulary[word]) {
        console.log('[Vocabulary] Word already exists:', word);
        return false;
    }

    const now = Date.now();
    vocabulary[word] = {
        word,
        translation,
        context,
        learnedAt: now,
        reviewCount: 0,
        mastery: 0,
        nextReview: now + REVIEW_INTERVALS[0],
    };

    await browser.storage.local.set({ vocabulary });
    console.log('[Vocabulary] Added word:', word);
    return true;
}

/**
 * 获取所有词库单词
 */
export async function getVocabulary(): Promise<PersonalVocabulary[]> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary = (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    return Object.values(vocabulary).sort((a, b) => b.learnedAt - a.learnedAt);
}

/**
 * 获取需要复习的单词
 */
export async function getWordsForReview(): Promise<PersonalVocabulary[]> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary = (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    const now = Date.now();
    return Object.values(vocabulary)
        .filter(v => v.nextReview <= now && v.mastery < 3)
        .sort((a, b) => a.nextReview - b.nextReview);
}

/**
 * 更新单词掌握程度
 */
export async function updateMastery(
    word: string,
    newMastery: 0 | 1 | 2 | 3
): Promise<void> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary = (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    if (!vocabulary[word]) {
        console.warn('[Vocabulary] Word not found:', word);
        return;
    }

    const now = Date.now();
    vocabulary[word].mastery = newMastery;
    vocabulary[word].reviewCount += 1;
    vocabulary[word].nextReview = now + REVIEW_INTERVALS[newMastery];

    await browser.storage.local.set({ vocabulary });
    console.log('[Vocabulary] Updated mastery:', word, '->', newMastery);
}

/**
 * 从词库移除单词
 */
export async function removeFromVocabulary(word: string): Promise<void> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary = (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    delete vocabulary[word];
    await browser.storage.local.set({ vocabulary });
    console.log('[Vocabulary] Removed word:', word);
}

/**
 * 获取词库统计
 */
export async function getVocabularyStats(): Promise<{
    total: number;
    mastered: number;
    needReview: number;
}> {
    const result = await browser.storage.local.get('vocabulary');
    const vocabulary = (result.vocabulary || {}) as Record<string, PersonalVocabulary>;

    const all = Object.values(vocabulary);
    const now = Date.now();

    return {
        total: all.length,
        mastered: all.filter(v => v.mastery === 3).length,
        needReview: all.filter(v => v.nextReview <= now && v.mastery < 3).length,
    };
}
