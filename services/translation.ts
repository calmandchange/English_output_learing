

export class TranslationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TranslationError';
    }
}

export async function translateText(text: string): Promise<{ translatedText: string; phonetic?: string }> {
    try {
        console.log('[Translation] Sending message to background:', {
            type: 'TRANSLATE_REQ_BACKGROUND',
            text
        });

        const response = await chrome.runtime.sendMessage({
            type: 'TRANSLATE_REQ_BACKGROUND',
            text
        });

        console.log('[Translation] Received response from background:', response);

        if (response && response.success) {
            return {
                translatedText: response.result,
                phonetic: ''
            };
        } else {
            console.warn("[Translation] Background Translation failed:", response?.error);
            throw new TranslationError('翻译失败,请检查网络连接');
        }
    } catch (e) {
        console.error("[Translation] Messaging Error:", e);
        console.error("[Translation] Error details:", {
            message: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined
        });
        if (e instanceof TranslationError) {
            throw e;
        }
        throw new TranslationError('网络连接异常，请稍后重试');
    }
}
