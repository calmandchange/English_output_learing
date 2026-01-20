import { googleTranslate } from '@/services/google';
import { deepseekTranslate } from '@/services/deepseek';
import { glmTranslate } from '@/services/glm';
import { getConfig } from '@/services/config';

export default defineBackground({
  persistent: false,
  main() {
    console.log('[Background] Script initialized');

    /**
     * 使用配置的翻译服务翻译文本
     */
    async function translate(text: string, targetLang: string = 'en'): Promise<string> {
      try {
        const config = await getConfig();
        console.log(`[Background] Translating using service: ${config.translationService}`);

        if (config.translationService === 'deepseek') {
          return await deepseekTranslate(text, config.deepseekApiKey);
        } else if (config.translationService === 'glm') {
          return await glmTranslate(text, config.glmApiKey);
        } else {
          return await googleTranslate(text, targetLang);
        }
      } catch (error) {
        console.error('[Background] Translation error:', error);
        throw error;
      }
    }

    // 监听来自 Content Script 的消息
    chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.log('[Background] Received message:', message);

      if (message.type === 'TRANSLATE_REQ_BACKGROUND') {
        const { text } = message;
        console.log('[Background] Translating:', text.substring(0, 50));

        translate(text, 'en')
          .then(translatedText => {
            console.log('[Background] Translation success:', translatedText.substring(0, 50));
            sendResponse({ success: true, result: translatedText });
          })
          .catch(error => {
            console.error('[Background] Translation error:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
          });

        return true; // 保持消息通道开放
      }
    });
  }
});
