/**
 * Utility to safely extract, clean, and validate JSON from AI model responses.
 * Works seamlessly across Gemini, OpenRouter, and Cloudflare Workers AI.
 */
export function cleanAndValidateJson(rawText: string, mode: 'outline' | 'presentation'): string {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Empty or invalid response received from AI model.');
    }

    let cleaned = rawText.trim();

    // 1. Remove markdown fences (e.g. ```json ... ``` or ``` ...)
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/i, '').replace(/\s*```$/, '').trim();
    }

    // 2. Find outermost array brackets `[` and `]` or object `{` and `}`
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    let jsonSubstring = cleaned;

    // We primarily expect arrays for both outline and presentation
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        // If there's an array bracket before or without an outer brace
        if (firstBrace === -1 || firstBracket < firstBrace) {
            jsonSubstring = cleaned.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            // An object wraps the response
            jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
        }
    } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    }

function repairTruncatedJson(jsonStr: string): string {
    let str = jsonStr.trim();

    // 1. Unescaped control characters inside JSON strings
    str = str.replace(/[\x00-\x1F]/g, (c) => {
        if (c === '\n') return '\\n';
        if (c === '\r') return '\\r';
        if (c === '\t') return '\\t';
        return '';
    });

    // 2. Remove dangling incomplete key-values at the end, e.g. `, "key":` or `, "key"`
    str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '');
    str = str.replace(/,\s*$/, '');

    // 3. Check for unclosed string literal
    let inString = false;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inString = !inString;
        }
    }
    if (inString) {
        str += '"';
    }

    // 4. Remove dangling trailing commas again after quote closure
    str = str.replace(/,\s*([\]}])/g, '$1');
    str = str.replace(/,\s*$/, '');

    // 5. Balance open/close brackets
    const stack: string[] = [];
    inString = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inString = !inString;
        } else if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }
    }

    while (stack.length > 0) {
        str += stack.pop();
    }

    return str;
}

    let parsed: any;
    try {
        parsed = JSON.parse(jsonSubstring);
    } catch (firstErr: any) {
        // Try repairing truncated or malformed LLM JSON output
        try {
            const repaired = repairTruncatedJson(jsonSubstring);
            parsed = JSON.parse(repaired);
        } catch {
            throw new Error(`Failed to parse AI output as JSON: ${firstErr.message}\nRaw preview: ${rawText.slice(0, 200)}...`);
        }
    }

    // 3. If model wrapped array inside an object (e.g. { "slides": [...] } or { "modules": [...] })
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const potentialKeys = ['slides', 'modules', 'presentation', 'outline', 'topics', 'data'];
        for (const key of potentialKeys) {
            if (Array.isArray(parsed[key])) {
                parsed = parsed[key];
                break;
            }
        }

        // If not found in well-known keys, check if any property is an array
        if (!Array.isArray(parsed)) {
            const firstArrayValue = Object.values(parsed).find((val) => Array.isArray(val));
            if (firstArrayValue) {
                parsed = firstArrayValue;
            }
        }
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`Expected JSON Array for mode "${mode}", but got ${typeof parsed}`);
    }

    // Normalize escaped newlines in presentation slides so they serialize cleanly as standard JSON newlines
    if (mode === 'presentation' && Array.isArray(parsed)) {
        const unescapeText = (str: any): string => {
            if (!str || typeof str !== 'string') return '';
            let text = str;
            text = text.replace(/\\+r\\+n/gi, '\n');
            text = text.replace(/\\+n/gi, '\n');
            text = text.replace(/\\+r/gi, '\n');
            text = text.replace(/\r\n/g, '\n');
            text = text.replace(/\r/g, '\n');
            text = text.replace(/\\+\n/g, '\n');
            text = text.replace(/\n\\+/g, '\n');
            return text;
        };

        for (const slide of parsed) {
            if (typeof slide.body === 'string') {
                slide.body = unescapeText(slide.body);
            }
            if (typeof slide.description === 'string') {
                slide.description = unescapeText(slide.description);
            }
            if (typeof slide.caption === 'string') {
                slide.caption = unescapeText(slide.caption);
            }
            if (typeof slide.title === 'string') {
                slide.title = unescapeText(slide.title);
            }
            if (typeof slide.codeTitle === 'string') {
                slide.codeTitle = unescapeText(slide.codeTitle);
            }
            if (typeof slide.CodeTitle === 'string') {
                slide.CodeTitle = unescapeText(slide.CodeTitle);
            }
            if (Array.isArray(slide.bullets)) {
                slide.bullets = slide.bullets.map((b: any) => typeof b === 'string' ? unescapeText(b) : b);
            }
        }
    }

    return JSON.stringify(parsed, null, 2);
}
