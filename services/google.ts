/**
 * 免费的 Google 翻译 API 服务
 * 使用 translate.googleapis.com 接口（无需 API Key）
 * 参考 FluentRead 的实现
 */

/**
 * 使用 Google 翻译 API 翻译文本
 * @param text 要翻译的文本
 * @param targetLang 目标语言代码，默认为英语
 * @param sourceLang 源语言代码，默认为 auto（自动检测）
 * @returns 翻译后的文本
 */
export async function googleTranslate(
    text: string,
    targetLang: string = 'en',
    sourceLang: string = 'auto'
): Promise<string> {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLang,
        tl: targetLang,
        dt: 't',
        strip: '1',
        nonced: '1',
        q: text
    });

    const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
        { method: 'GET' }
    );

    if (!response.ok) {
        throw new Error(`Google 翻译请求失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // 解析 Google 翻译 API 响应格式
    // 响应格式: [[["translated text","original text",null,null,10],...],null,"source_lang",...]
    if (result && result[0] && Array.isArray(result[0])) {
        let translatedText = '';
        result[0].forEach((segment: any) => {
            if (segment && segment[0]) {
                translatedText += segment[0];
            }
        });
        return translatedText;
    }

    throw new Error('Google 翻译响应格式错误');
}
