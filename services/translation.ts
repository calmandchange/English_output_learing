

export async function translateText(text: string): Promise<{ translatedText: string; phonetic?: string }> {
    try {
        console.log('[Translation] Sending message to background:', { type: 'TRANSLATE_REQ_BACKGROUND', text });

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
            return getMockTranslation(text);
        }
    } catch (e) {
        console.error("[Translation] Messaging Error:", e);
        console.error("[Translation] Error details:", {
            message: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined
        });
        return getMockTranslation(text);
    }
}

function getMockTranslation(text: string) {
    console.log("Translating via Mock (Fallback):", text);
    return {
        translatedText: `[Mock EN] ${text} (Translated)`,
        phonetic: `/mɒk fəˈnɛtɪk/`
    };
}
