import { browser } from 'wxt/browser';

interface TranslationStat {
    text: string;
    count: number;
    lastTranslated: number;
}

export async function recordTranslation(text: string) {
    const result = await browser.storage.local.get('stats');
    const stats: Record<string, TranslationStat> = (result.stats || {}) as Record<string, TranslationStat>;

    const existing = stats[text] || { text, count: 0, lastTranslated: 0 };
    existing.count += 1;
    existing.lastTranslated = Date.now();

    stats[text] = existing;

    await browser.storage.local.set({ stats });
    console.log('Stats updated:', stats);
}
