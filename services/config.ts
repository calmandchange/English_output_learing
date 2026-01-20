export type TranslationService = 'google' | 'deepseek' | 'glm';

export interface AppConfig {
    translationService: TranslationService;
    deepseekApiKey: string;
    glmApiKey: string;
    aiWritingAssistant: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
    translationService: 'google',
    deepseekApiKey: '',
    glmApiKey: '',
    aiWritingAssistant: false,
};

export async function getConfig(): Promise<AppConfig> {
    const result = await chrome.storage.sync.get(['translationService', 'deepseekApiKey', 'glmApiKey', 'aiWritingAssistant']) as any;
    return {
        translationService: (result.translationService as TranslationService) || DEFAULT_CONFIG.translationService,
        deepseekApiKey: (result.deepseekApiKey as string) || DEFAULT_CONFIG.deepseekApiKey,
        glmApiKey: (result.glmApiKey as string) || DEFAULT_CONFIG.glmApiKey,
        aiWritingAssistant: (result.aiWritingAssistant as boolean) ?? DEFAULT_CONFIG.aiWritingAssistant,
    };
}

export async function setConfig(config: Partial<AppConfig>): Promise<void> {
    await chrome.storage.sync.set(config);
}
