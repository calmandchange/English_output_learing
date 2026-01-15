import { translateWithLLM } from './llm';

export async function glmTranslate(text: string, apiKey: string): Promise<string> {
    // 使用 glm-4-flash 模型，速度快且免费/便宜
    return translateWithLLM(text, apiKey, 'https://open.bigmodel.cn/api/paas/v4', 'glm-4-flash', 'Zhipu GLM');
}
