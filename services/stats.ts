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
