import { getConfig } from './config';
import { checkWritingQuality, type WritingSuggestion } from './llm';

/**
 * AI写作辅导：检测完整输入内容
 * 由 store.ts 调用，传入完整文本进行检测
 * 
 * @param fullContent - 完整的输入内容
 * @param targetElement - 目标输入元素
 */
export async function checkWritingFull(
    fullContent: string,
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

    // 如果内容为空或没有英文内容，跳过
    if (!fullContent || !/[a-zA-Z]/.test(fullContent)) {
        console.log('[WritingAssistant] No English content, skipping');
        return null;
    }

    console.log('[WritingAssistant] Checking full content:', fullContent.substring(0, 100));

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
        // 检测完整内容的写作质量
        const suggestions = await checkWritingQuality(
            fullContent,
            fullContent,  // 上下文就是完整内容本身
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
