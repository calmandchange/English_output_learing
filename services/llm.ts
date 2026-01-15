interface LLMMessage {
    role: 'system' | 'user';
    content: string;
}

interface LLMResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export async function translateWithLLM(
    text: string,
    apiKey: string,
    baseUrl: string,
    model: string,
    providerName: string
): Promise<string> {
    if (!apiKey) {
        throw new Error(`${providerName} API Key is missing`);
    }

    const messages: LLMMessage[] = [
        {
            role: 'system',
            content: 'You are a professional translator. Translate the following text into English. Only return the translated text without any explanation.'
        },
        {
            role: 'user',
            content: text
        }
    ];

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${providerName} API Error: ${response.status} ${response.statusText} - ${error}`);
        }

        const data: LLMResponse = await response.json();
        const translatedText = data.choices[0]?.message?.content?.trim();

        if (!translatedText) {
            throw new Error(`${providerName} returned empty response`);
        }

        return translatedText;
    } catch (error) {
        console.error(`${providerName} Translation Error:`, error);
        throw error;
    }
}
