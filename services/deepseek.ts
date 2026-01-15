import { translateWithLLM } from './llm';

export async function deepseekTranslate(text: string, apiKey: string): Promise<string> {
    return translateWithLLM(text, apiKey, 'https://api.deepseek.com', 'deepseek-chat', 'DeepSeek');
}
