import { getConfig } from './config';
import { checkWritingQuality, type WritingSuggestion } from './llm';

/**
 * AI写作辅导：检测单个句子
 * 由 store.ts 调用，传入单个句子和完整上下文
 * 
 * @param sentenceToCheck - 需要检测的单个句子
 * @param fullContext - 完整的输入内容（用于上下文理解）
 * @param targetElement - 目标输入元素
 */
export async function checkWritingIncremental(
    sentenceToCheck: string,
    fullContext: string,
    targetElement: HTMLElement
): Promise<{
    suggestions: WritingSuggestion[];
} | null> {
    const config = await getConfig();

    // 检查是否开启AI写作辅导
    if (!config.aiWritingAssistant) {
        console.log('[WritingAssistant] AI writing assistant disabled');
        return null;
    }

    // 检查是否使用LLM服务
    if (config.translationService !== 'deepseek' && config.translationService !== 'glm') {
        console.log('[WritingAssistant] LLM service required (deepseek/glm)');
        return null;
    }

    // 如果句子为空或没有英文内容，跳过
    if (!sentenceToCheck || !/[a-zA-Z]/.test(sentenceToCheck)) {
        console.log('[WritingAssistant] No English content in sentence, skipping');
        return null;
    }

    console.log('[WritingAssistant] Checking sentence:', sentenceToCheck.substring(0, 80));

    // 获取API配置
    const apiKey = config.translationService === 'deepseek'
        ? config.deepseekApiKey
        : config.glmApiKey;

    const baseUrl = config.translationService === 'deepseek'
        ? 'https://api.deepseek.com/v1'
        : 'https://open.bigmodel.cn/api/paas/v4';

    const model = config.translationService === 'deepseek'
        ? 'deepseek-chat'
        : 'glm-4-flash';

    const providerName = config.translationService === 'deepseek'
        ? 'DeepSeek'
        : 'GLM';

    try {
        // 检测句子的写作质量
        const suggestions = await checkWritingQuality(
            sentenceToCheck,
            fullContext,
            apiKey,
            baseUrl,
            model,
            providerName
        );

        console.log('[WritingAssistant] Got suggestions:', suggestions.length);

        return {
            suggestions
        };
    } catch (error) {
        console.error('[WritingAssistant] Check failed:', error);
        return null;
    }
}
