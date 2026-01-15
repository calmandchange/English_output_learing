export type TranslationService = 'google' | 'deepseek' | 'glm';

export interface AppConfig {
    translationService: TranslationService;
    deepseekApiKey: string;
    glmApiKey: string;
}

export const DEFAULT_CONFIG: AppConfig = {
    translationService: 'google',
    deepseekApiKey: '',
    glmApiKey: '',
};

export async function getConfig(): Promise<AppConfig> {
    const result = await chrome.storage.sync.get(['translationService', 'deepseekApiKey', 'glmApiKey']);
    return {
        translationService: result.translationService || DEFAULT_CONFIG.translationService,
        deepseekApiKey: result.deepseekApiKey || DEFAULT_CONFIG.deepseekApiKey,
        glmApiKey: result.glmApiKey || DEFAULT_CONFIG.glmApiKey,
    };
}

export async function setConfig(config: Partial<AppConfig>): Promise<void> {
    await chrome.storage.sync.set(config);
}
