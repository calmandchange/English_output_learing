/**
 * 从 Markdown 代码块中提取 JSON 内容
 * LLM 有时会将 JSON 包裹在 ```json ... ``` 中，需要清理
 */
function extractJsonFromMarkdown(text: string): string {
    // 尝试匹配 ```json ... ``` 或 ``` ... ``` 格式
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    // 如果没有代码块，返回原始文本
    return text.trim();
}

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
            content: `You are a native English speaker and professional translator. Translate the following text into NATURAL, IDIOMATIC English.

**TRANSLATION PRINCIPLES:**
1. **Sound Native**: Use expressions a native speaker would actually say, NOT word-for-word translations
2. **Prefer Phrasal Verbs**: "figure out" over "understand", "come up with" over "think of"
3. **Use Common Collocations**: "make a decision" (not "do a decision"), "heavy rain" (not "big rain")
4. **Avoid Chinglish**: 
   - "long time no see" → "It's been a while" (in formal context)
   - "give you some color see see" → completely rephrase
   - "I very like" → "I really like" / "I'm really fond of"
5. **Natural Word Order**: Adverbs, adjectives in native-sounding positions
6. **Appropriate Register**: Match formality to context (casual/professional)

The user will provide text wrapped in double quotes (e.g., "text"). Please translate the content INSIDE the quotes.
Only return the translated text without any explanation.`
        },
        {
            role: 'user',
            content: `"${text}"`
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

/**
 * 检查英文句子的语法错误和更地道的表达方式
 */
export async function checkGrammar(
    fullSentence: string,
    apiKey: string,
    baseUrl: string,
    model: string,
    providerName: string
): Promise<{
    hasSuggestion: boolean;
    issue?: string;
    reason?: string;
    original?: string;
    suggested?: string;
}> {
    if (!apiKey) {
        throw new Error(`${providerName} API Key is missing`);
    }

    const messages: LLMMessage[] = [
        {
            role: 'system',
            content: `You are an English writing tutor. Analyze the sentence for:
1. Grammar errors (subject-verb agreement, tense, articles, etc.)
2. More natural or idiomatic expressions

Return ONLY valid JSON in this exact format:
{
  "hasSuggestion": true,
  "issue": "Brief issue description (e.g., 'Missing article', 'Awkward phrasing')",
  "reason": "Detailed explanation of WHY this is an issue and HOW to improve it. Be specific and educational.",
  "original": "the original sentence or phrase with the issue",
  "suggested": "the improved version"
}

If no issues found, return:
{
  "hasSuggestion": false
}

Only suggest improvements that significantly enhance clarity or naturalness. Minor stylistic preferences should not trigger suggestions.`
        },
        {
            role: 'user',
            content: `Please check this sentence: "${fullSentence}"`
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
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${providerName} API Error: ${response.status} ${response.statusText} - ${error}`);
        }

        const data: LLMResponse = await response.json();
        const resultText = data.choices[0]?.message?.content?.trim();

        if (!resultText) {
            throw new Error(`${providerName} returned empty response`);
        }

        // 解析 JSON 响应（处理 Markdown 代码块包装）
        try {
            const jsonText = extractJsonFromMarkdown(resultText);
            const parsed = JSON.parse(jsonText);
            return parsed;
        } catch (e) {
            console.error('[LLM] Failed to parse grammar check result:', resultText);
            return { hasSuggestion: false };
        }
    } catch (error) {
        console.error('[LLM] Grammar check failed:', error);
        throw error;
    }
}

/**
 * 写作建议项
 */
export interface WritingSuggestion {
    type: 'grammar' | 'idiom' | 'style' | 'chinglish';  // 问题类型：语法错误 | 地道表达 | 风格建议 | 中式英语
    level: 1 | 2 | 3 | 4 | 5;             // 错误层级：1=单词 2=短语 3=句子 4=语篇 5=中式英语
    category: string;                      // 错误类别：Spelling, Tense, Article, Chinglish 等
    position: { start: number; end: number };  // 问题位置（相对于 fullSentence）
    original: string;           // 有问题的具体单词/短语
    suggested: string;          // 修正后的单词/短语
    fullSentence: string;       // 完整的原句
    correctedSentence: string;  // 修正后的完整句子
    reason: string;             // 原因说明（包含为什么更地道的解释）
}

/**
 * 去重辅助函数：过滤重复建议和同位置多个建议
 * 规则：
 * 1. 同一位置只保留优先级最高的建议
 * 2. 相同 original + suggested 的建议只保留一个
 * 3. 优先级顺序：Spelling > Grammar > Word Choice > Style
 */
function deduplicateSuggestions(suggestions: WritingSuggestion[]): WritingSuggestion[] {
    // 类别优先级映射（数字越小优先级越高）
    const categoryPriority: Record<string, number> = {
        'Spelling': 1,
        'Capitalization': 2,
        'Sentence Capitalization': 2,
        'Word Form': 3,
        'Article': 4,
        'Preposition': 5,
        'Subject-Verb Agreement': 6,
        'Tense': 7,
        'Tense Errors': 7,
        // Chinglish 相关类别
        'Word Order': 8,
        'Redundant Be-verb': 8,
        'Verb Choice': 9,
        'Direct Translation': 9,
        'Literal Translation': 9,
        'Redundant Preposition': 10,
        'Redundancy': 10,
        'Overuse of "very"': 11,
        'Overused Pattern': 11,
        'Fixed Expression': 11,
        // 一般建议类别
        'Word Choice': 12,
        'Collocation': 13,
        'Collocations': 13,
        'Phrasal Verb': 14,
        'Style': 15,
    };

    const getPriority = (s: WritingSuggestion): number => {
        return categoryPriority[s.category] || 99;
    };

    // Step 1: 按位置分组
    const byPosition = new Map<string, WritingSuggestion[]>();
    for (const s of suggestions) {
        const key = `${s.position?.start}-${s.position?.end}`;
        if (!byPosition.has(key)) {
            byPosition.set(key, []);
        }
        byPosition.get(key)!.push(s);
    }

    // Step 2: 每个位置只保留优先级最高的
    const positionDeduped: WritingSuggestion[] = [];
    for (const group of byPosition.values()) {
        // 按优先级排序，取第一个
        group.sort((a, b) => getPriority(a) - getPriority(b));
        positionDeduped.push(group[0]);
    }

    // Step 3: 去除 original + suggested 完全相同的重复项
    const seen = new Set<string>();
    const finalDeduped: WritingSuggestion[] = [];
    for (const s of positionDeduped) {
        const key = `${s.original}|${s.suggested}`;
        if (!seen.has(key)) {
            seen.add(key);
            finalDeduped.push(s);
        }
    }

    return finalDeduped;
}

/**
 * 检测英文写作质量（语法错误 + 地道表达）
 * @param newContent - 需要检测的新增内容
 * @param fullContext - 完整上下文（用于更准确的检测）
 */
export async function checkWritingQuality(
    newContent: string,
    fullContext: string,
    apiKey: string,
    baseUrl: string,
    model: string,
    providerName: string
): Promise<WritingSuggestion[]> {
    if (!apiKey) {
        throw new Error(`${providerName} API Key is missing`);
    }

    const messages: LLMMessage[] = [
        {
            role: 'system',
            content: `You are a strict English writing tutor specializing in helping non-native speakers write IDIOMATIC English. Analyze text systematically through FIVE linguistic levels.

===== ERROR TAXONOMY (Five Levels) =====

【LEVEL 1: WORD 单词层】
- Spelling: recieve → receive, definately → definitely
- Capitalization: english → English, monday → Monday
- Word Form: He go → He goes, She walk → She walks
- Confusable Words: affect vs effect, their vs there vs they're, its vs it's

【LEVEL 2: PHRASE 短语层】
- Articles: I have apple → I have an apple, She is student → She is a student
- Prepositions: arrive to → arrive at, interested for → interested in
- Collocations: do a mistake → make a mistake, have a rest → take a break
- Modifier Order: red big apple → big red apple, Chinese old man → old Chinese man
- Possessives: the book of John → John's book, friend of me → my friend

【LEVEL 3: SENTENCE 句子层】
- Sentence Capitalization: the cat is cute → The cat is cute
- Subject-Verb Agreement: He don't know → He doesn't know
- Tense Errors: I go yesterday → I went yesterday
- Sentence Structure: Because tired, I slept → Because I was tired, I slept
- Parallelism: I like reading, writing and to swim → I like reading, writing, and swimming

【LEVEL 4: DISCOURSE 语篇层】
- Pronoun Reference: John told Bob that he was wrong → (Unclear who "he" is)
- Transition Words: Missing connectors between ideas
- Register/Tone: Slang in formal writing, overly formal in casual context

【LEVEL 5: CHINGLISH 中式英语层】 ⭐ CRITICAL FOR CHINESE LEARNERS
This level catches expressions that are grammatically correct but unnatural to native speakers:

**Common Chinglish Patterns (MUST detect):**
| Chinglish | Native English | Category |
|-----------|---------------|----------|
| I very like | I really like / I'm fond of | Word Order |
| I am agree | I agree | Redundant Be-verb |
| open the light | turn on the light | Verb Choice |
| close the light | turn off the light | Verb Choice |
| play computer | use the computer / play games | Collocation |
| my body is not good | I'm not feeling well | Direct Translation |
| give you some color see see | (rephrase entirely) | Literal Translation |
| I have no idea about it | I have no idea / I don't know | Redundant Preposition |
| the quality is very good | the quality is excellent / great | Overuse of "very" |
| study knowledge | acquire knowledge / learn | Verb Choice |
| improve my English | improve my English skills | Collocation |
| do homework | do my/the homework | Article Missing |
| return back | return | Redundancy |
| repeat again | repeat | Redundancy |
| discuss about | discuss | Redundant Preposition |
| emphasize on | emphasize | Redundant Preposition |
| comprise of | comprise / consist of | Wrong Verb Pattern |
| according to my opinion | in my opinion | Fixed Expression |
| by my opinion | in my opinion | Fixed Expression |
| more and more people | an increasing number of people | Overused Pattern |
| with the development of | as X develops / with X's development | Overused Pattern |
| in recently years | in recent years | Word Form |
| have a good rest | get some rest / rest well | Collocation |
| take a good time | have a good time | Verb Choice |

**Phrasal Verb Opportunities:**
| Normal | More Natural (Phrasal) | When to suggest |
|--------|------------------------|------------------|
| tolerate | put up with | casual context |
| discover | find out | general use |
| investigate | look into | general use |
| postpone | put off | casual context |
| continue | keep on | casual context |
| understand | figure out | problem-solving context |

===== OUTPUT FORMAT =====

**CRITICAL RULES:**
1. "original" = ONLY the problematic word(s), NOT the entire sentence
2. "suggested" = ONLY the corrected word(s)
3. "fullSentence" = complete original sentence
4. "correctedSentence" = complete corrected sentence
5. "position" = problematic word(s) position in fullSentence (0-indexed)
6. "level" = which level (1-5) this error belongs to

**DEDUPLICATION RULES (CRITICAL):**
7. NO DUPLICATE SUGGESTIONS: Each error appears EXACTLY ONCE
8. ONE SUGGESTION PER POSITION: Pick MOST IMPORTANT if overlapping
9. MERGE RELATED FIXES: Combine if one fix resolves multiple issues
10. PRIORITY: Spelling > Grammar > Chinglish > Word Choice > Style
11. USE ORIGINAL TEXT ONLY: "fullSentence" must be exact original input

Return ONLY a valid JSON array:
[
  {
    "type": "grammar" | "idiom" | "style" | "chinglish",
    "level": 1 | 2 | 3 | 4 | 5,
    "category": "Spelling" | "Chinglish" | "Collocation" | "Phrasal Verb" | etc.,
    "position": { "start": number, "end": number },
    "original": "problematic word(s) only",
    "suggested": "corrected word(s) only",
    "fullSentence": "complete original sentence",
    "correctedSentence": "complete corrected sentence",
    "reason": "中文解释（说明为什么更地道）"
  }
]

If no issues found, return: []

===== PRIORITY (Focus Order) =====
HIGH: Spelling, Tense, Subject-Verb Agreement, Articles, Chinglish patterns
MEDIUM: Word Choice, Collocations, Phrasal Verbs, Possessives
LOW: Style preferences (only if significantly unnatural)

===== EXAMPLES =====

Input: "I very like this movie."
Output: [
  {
    "type": "chinglish",
    "level": 5,
    "category": "Word Order",
    "position": { "start": 2, "end": 11 },
    "original": "very like",
    "suggested": "really like",
    "fullSentence": "I very like this movie.",
    "correctedSentence": "I really like this movie.",
    "reason": "中式英语：英语中副词 'very' 不能直接修饰动词，应使用 'really' 或 'I like X very much'"
  }
]

Input: "Please open the light."
Output: [
  {
    "type": "chinglish",
    "level": 5,
    "category": "Verb Choice",
    "position": { "start": 7, "end": 11 },
    "original": "open",
    "suggested": "turn on",
    "fullSentence": "Please open the light.",
    "correctedSentence": "Please turn on the light.",
    "reason": "中式英语：英语中灯的开关使用 'turn on/off'，不用 'open/close'"
  }
]

Input: "I go to school yesterday."
Output: [
  {
    "type": "grammar",
    "level": 3,
    "category": "Tense",
    "position": { "start": 2, "end": 4 },
    "original": "go",
    "suggested": "went",
    "fullSentence": "I go to school yesterday.",
    "correctedSentence": "I went to school yesterday.",
    "reason": "时态错误：'yesterday' 表示过去，动词应使用过去式 'went'"
  }
]

Input: "I need to investigate this problem."
Output: [
  {
    "type": "idiom",
    "level": 5,
    "category": "Phrasal Verb",
    "position": { "start": 10, "end": 21 },
    "original": "investigate",
    "suggested": "look into",
    "fullSentence": "I need to investigate this problem.",
    "correctedSentence": "I need to look into this problem.",
    "reason": "地道表达：在日常口语中，短语动词 'look into' 比 'investigate' 更自然常用"
  }
]`
        },
        {
            role: 'user',
            content: `CONTENT TO CHECK: "${newContent}"
FULL CONTEXT: "${fullContext}"`
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
        const resultText = data.choices[0]?.message?.content?.trim();

        if (!resultText) {
            return [];
        }

        // 解析 JSON 数组（处理 Markdown 代码块包装）
        try {
            const jsonText = extractJsonFromMarkdown(resultText);
            const suggestions = JSON.parse(jsonText);
            if (Array.isArray(suggestions)) {
                const validSuggestions = suggestions.filter(s =>
                    s.type && s.level && s.category && s.position && s.original && s.suggested && s.reason
                );

                // 去重逻辑：同一位置只保留优先级最高的建议
                const deduped = deduplicateSuggestions(validSuggestions);
                return deduped;
            }
            return [];
        } catch (parseError) {
            console.warn(`[LLM] Failed to parse writing quality result:`, resultText);
            return [];
        }
    } catch (error) {
        console.error(`[LLM] Writing quality check failed:`, error);
        throw error;
    }
}
