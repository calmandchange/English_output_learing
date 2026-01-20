import { browser } from 'wxt/browser';

export interface TranslationStat {
    chineseText: string;    // 原文（中文）
    englishText: string;    // 译文（英文）
    count: number;
    lastTranslated: number;
}

/**
 * 记录翻译统计
 * @param chineseText 原文（中文）
 * @param englishText 译文（英文）
 */
export async function recordTranslation(chineseText: string, englishText: string) {
    const result = await browser.storage.local.get('stats');
    const stats: Record<string, TranslationStat> = (result.stats || {}) as Record<string, TranslationStat>;

    const existing = stats[chineseText] || { chineseText, englishText: '', count: 0, lastTranslated: 0 };
    existing.count += 1;
    existing.lastTranslated = Date.now();
    existing.englishText = englishText; // 更新为最新翻译结果

    stats[chineseText] = existing;

    await browser.storage.local.set({ stats });
    console.log('[Stats] Updated:', chineseText, '->', englishText, `(count: ${existing.count})`);
}

/**
 * 获取翻译统计，按次数从高到低排序
 */
export async function getTranslationStats(): Promise<TranslationStat[]> {
    const result = await browser.storage.local.get('stats');
    const stats = (result.stats || {}) as Record<string, TranslationStat>;
    return Object.values(stats).sort((a, b) => b.count - a.count);
}

/**
 * 清空翻译统计
 */
export async function clearTranslationStats(): Promise<void> {
    await browser.storage.local.remove('stats');
    console.log('[Stats] Cleared all translation stats');
}

/**
 * 今日统计数据
 */
export interface TodayStats {
    totalTranslations: number;  // 今日翻译次数
    newWords: number;           // 今日新学单词/短语数
    streakDays: number;         // 连续学习天数
    totalWords: number;         // 今日单词总数
}

/**
 * 获取今日学习统计
 */
export async function getTodayStats(): Promise<TodayStats> {
    const result = await browser.storage.local.get(['stats', 'streakData']);
    const stats = (result.stats || {}) as Record<string, TranslationStat>;

    // 今日开始时间戳
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    // 计算今日统计
    let totalTranslations = 0;
    let newWords = 0;
    let totalWords = 0;

    Object.values(stats).forEach(stat => {
        if (stat.lastTranslated >= todayTimestamp) {
            totalTranslations += 1;
            if (stat.count === 1) {
                newWords += 1;
            }
            // 简单的单词计数：按空格分割
            const words = stat.englishText.trim().split(/\s+/).length;
            totalWords += words;
        }
    });

    // 获取连续学习天数
    const streakData = result.streakData as { lastDate: string; count: number } | undefined;
    const today = new Date().toDateString();
    let streakDays = 0;

    if (streakData) {
        const lastDate = new Date(streakData.lastDate).toDateString();
        if (lastDate === today) {
            streakDays = streakData.count;
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate === yesterday.toDateString()) {
                streakDays = streakData.count;
            }
        }
    }

    return { totalTranslations, newWords, streakDays, totalWords };
}

/**
 * 获取最近学习的表达（按时间排序）
 * @param limit 返回数量限制
 */
export async function getRecentLearning(limit: number = 5): Promise<TranslationStat[]> {
    const result = await browser.storage.local.get('stats');
    const stats = (result.stats || {}) as Record<string, TranslationStat>;

    return Object.values(stats)
        .sort((a, b) => b.lastTranslated - a.lastTranslated)
        .slice(0, limit);
}

/**
 * 更新连续学习天数
 */
export async function updateStreakDays(): Promise<void> {
    const result = await browser.storage.local.get('streakData');
    const streakData = result.streakData as { lastDate: string; count: number } | undefined;

    const today = new Date().toDateString();

    if (!streakData) {
        await browser.storage.local.set({ streakData: { lastDate: today, count: 1 } });
        return;
    }

    const lastDate = new Date(streakData.lastDate).toDateString();

    if (lastDate === today) {
        // 今天已记录
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate === yesterday.toDateString()) {
        // 昨天有记录，连续天数+1
        await browser.storage.local.set({
            streakData: { lastDate: today, count: streakData.count + 1 }
        });
    } else {
        // 中断了，重新开始
        await browser.storage.local.set({ streakData: { lastDate: today, count: 1 } });
    }
}
