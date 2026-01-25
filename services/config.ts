export type TranslationService = 'google' | 'deepseek' | 'glm';

export interface AppConfig {
    translationService: TranslationService;
    deepseekApiKey: string;
    glmApiKey: string;
    aiWritingAssistant: boolean;
    customAnimationJson?: string; // 用户粘贴的 Lottie JSON 字符串
    tabAcceptsGhostText: boolean; // 是否允许 Tab 键接受虚字
    onboardingCompleted: boolean; // 是否完成首次使用引导
}

export const DEFAULT_CONFIG: AppConfig = {
    translationService: 'google',
    deepseekApiKey: '',
    glmApiKey: '',
    aiWritingAssistant: false,
    customAnimationJson: '',
    tabAcceptsGhostText: true, // 默认开启，大多数用户期望这个行为
    onboardingCompleted: false // 首次使用引导未完成
};

export async function getConfig(): Promise<AppConfig> {
    const result = await chrome.storage.sync.get(['translationService', 'deepseekApiKey', 'glmApiKey', 'aiWritingAssistant', 'customAnimationJson', 'tabAcceptsGhostText', 'onboardingCompleted']) as any;
    return {
        translationService: (result.translationService as TranslationService) || DEFAULT_CONFIG.translationService,
        deepseekApiKey: (result.deepseekApiKey as string) || DEFAULT_CONFIG.deepseekApiKey,
        glmApiKey: (result.glmApiKey as string) || DEFAULT_CONFIG.glmApiKey,
        aiWritingAssistant: (result.aiWritingAssistant as boolean) ?? DEFAULT_CONFIG.aiWritingAssistant,
        customAnimationJson: (result.customAnimationJson as string) || DEFAULT_CONFIG.customAnimationJson,
        tabAcceptsGhostText: (result.tabAcceptsGhostText as boolean) ?? DEFAULT_CONFIG.tabAcceptsGhostText,
        onboardingCompleted: (result.onboardingCompleted as boolean) ?? DEFAULT_CONFIG.onboardingCompleted,
    };
}

export async function setConfig(config: Partial<AppConfig>): Promise<void> {
    await chrome.storage.sync.set(config);
}
