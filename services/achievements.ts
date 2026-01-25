import { browser } from 'wxt/browser';

/**
 * 成就条件类型
 */
interface AchievementCondition {
    type: 'translations' | 'streak' | 'words' | 'vocabulary' | 'mastered';
    count?: number;
    days?: number;
}

/**
 * 成就定义
 */
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: AchievementCondition;
    unlockedAt?: number;
}

/**
 * 预定义成就列表
 */
export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_translation',
        name: '初次启程',
        description: '完成第一次翻译',
        icon: '🚀',
        condition: { type: 'translations', count: 1 },
    },
    {
        id: 'translations_10',
        name: '小试牛刀',
        description: '完成10次翻译',
        icon: '✨',
        condition: { type: 'translations', count: 10 },
    },
    {
        id: 'translations_50',
        name: '渐入佳境',
        description: '完成50次翻译',
        icon: '💫',
        condition: { type: 'translations', count: 50 },
    },
    {
        id: 'streak_3',
        name: '三日之约',
        description: '连续学习3天',
        icon: '🔥',
        condition: { type: 'streak', days: 3 },
    },
    {
        id: 'streak_7',
        name: '一周坚持',
        description: '连续学习7天',
        icon: '🏆',
        condition: { type: 'streak', days: 7 },
    },
    {
        id: 'words_100',
        name: '词汇达人',
        description: '累计学习100个单词',
        icon: '📚',
        condition: { type: 'words', count: 100 },
    },
    {
        id: 'vocab_5',
        name: '收藏家',
        description: '收藏5个单词到词库',
        icon: '⭐',
        condition: { type: 'vocabulary', count: 5 },
    },
    {
        id: 'vocab_20',
        name: '词库达人',
        description: '收藏20个单词到词库',
        icon: '🌟',
        condition: { type: 'vocabulary', count: 20 },
    },
    {
        id: 'mastery_3',
        name: '学有所成',
        description: '完全掌握3个单词',
        icon: '🎓',
        condition: { type: 'mastered', count: 3 },
    },
];

/**
 * 检查成就是否达成
 */
export async function checkAchievements(): Promise<Achievement[]> {
    const [storageResult, vocabResult] = await Promise.all([
        browser.storage.local.get(['stats', 'streakData', 'unlockedAchievements']),
        browser.storage.local.get('vocabulary'),
    ]);

    const stats = (storageResult.stats || {}) as Record<string, { count: number }>;
    const streakData = storageResult.streakData as { count: number } | undefined;
    const unlockedIds = (storageResult.unlockedAchievements || []) as string[];
    const vocabulary = (vocabResult.vocabulary || {}) as Record<string, { mastery: number }>;

    // 计算当前状态
    const totalTranslations = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    const totalWords = Object.values(stats).reduce((sum, s) => {
        // 假设每条记录的 englishText 用空格分割计算单词数
        return sum + 1; // 简化：每条记录算1个表达
    }, 0);
    const streakDays = streakData?.count || 0;
    const vocabCount = Object.keys(vocabulary).length;
    const masteredCount = Object.values(vocabulary).filter(v => v.mastery === 3).length;

    // 检查每个成就
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
        if (unlockedIds.includes(achievement.id)) continue;

        let unlocked = false;
        const { condition } = achievement;

        switch (condition.type) {
            case 'translations':
                unlocked = totalTranslations >= (condition.count || 0);
                break;
            case 'streak':
                unlocked = streakDays >= (condition.days || 0);
                break;
            case 'words':
                unlocked = totalWords >= (condition.count || 0);
                break;
            case 'vocabulary':
                unlocked = vocabCount >= (condition.count || 0);
                break;
            case 'mastered':
                unlocked = masteredCount >= (condition.count || 0);
                break;
        }

        if (unlocked) {
            achievement.unlockedAt = Date.now();
            newlyUnlocked.push(achievement);
            unlockedIds.push(achievement.id);
        }
    }

    // 保存已解锁成就
    if (newlyUnlocked.length > 0) {
        await browser.storage.local.set({ unlockedAchievements: unlockedIds });
        console.log('[Achievements] Newly unlocked:', newlyUnlocked.map(a => a.name));
    }

    return newlyUnlocked;
}

/**
 * 获取所有已解锁成就
 */
export async function getUnlockedAchievements(): Promise<Achievement[]> {
    const result = await browser.storage.local.get('unlockedAchievements');
    const unlockedIds = (result.unlockedAchievements || []) as string[];

    return ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
}

/**
 * 获取成就进度
 */
export async function getAchievementProgress(): Promise<{
    unlocked: number;
    total: number;
}> {
    const unlocked = await getUnlockedAchievements();
    return {
        unlocked: unlocked.length,
        total: ACHIEVEMENTS.length,
    };
}
