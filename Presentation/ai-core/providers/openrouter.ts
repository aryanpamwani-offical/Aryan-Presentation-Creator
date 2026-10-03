import dotenv from 'dotenv';
import { callWithRetry } from '../../utils/retry.js';

dotenv.config();

export function getOpenRouterApiKey(): string | undefined {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
        return process.env.OPENROUTER_API_KEY.trim();
    }
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0) {
        return process.env.OPENAI_API_KEY.trim();
    }
    return undefined;
}

export function isOpenRouterConfigured(): boolean {
    return Boolean(getOpenRouterApiKey());
}

export async function generateWithOpenRouter(
    promptContents: string,
    systemPrompt: string,
    mode: 'outline' | 'presentation',
    modelOverride?: string
): Promise<string> {
    const apiKey = getOpenRouterApiKey();
    if (!apiKey) {
        throw new Error('❌ OPENROUTER_API_KEY (or OPENAI_API_KEY) is missing in environment variables.');
    }

    // Use modelOverride if supplied, otherwise env variable or fallback
    const modelToUse = modelOverride || process.env.OPENROUTER_MODEL || process.env.MODEL || 'z-ai/glm-5.2:free';
    const maxRetries = 5;
    // Default wait is 6s on OpenRouter, so we set a minimum of 8s and scale up
    const initialDelayMs = 8000;

    console.log(`⏳ Using OpenRouter model "${modelToUse}" in "${mode}" mode...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`⏳ Attempt ${attempt}/${maxRetries} with OpenRouter (${modelToUse})...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/aryanpamwani-offical/Aryan-Presentation-Creator',
                    'X-Title': 'Aryan Presentation Creator',
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: promptContents },
                    ],
                    temperature: 0.25,
                    max_tokens: 16384,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                const retryAfterHeader = response.headers.get('retry-after');
                const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
                const isTransient = response.status === 429 || response.status === 503 || response.status === 502 || response.status === 504;

                if (isTransient && attempt < maxRetries) {
                    // Always guarantee more than 6s wait (at least 8s or Retry-After + 3s buffer)
                    const baseBackoff = initialDelayMs * Math.pow(1.5, attempt - 1);
                    const headerDelay = retryAfterSec && !isNaN(retryAfterSec) ? (retryAfterSec + 3) * 1000 : 0;
                    const delayMs = Math.max(8000, Math.max(headerDelay, baseBackoff));

                    console.warn(`⚠️ OpenRouter model busy/rate-limited (${response.status}). Waiting ${(delayMs / 1000).toFixed(1)}s (cooldown > 6s) before retry ${attempt + 1}/${maxRetries}...`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    continue;
                }

                throw new Error(`OpenRouter HTTP ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content;
            if (!text) {
                throw new Error(`OpenRouter response returned no content for model ${modelToUse}`);
            }

            console.log(`✨ Successfully generated ${mode} content with OpenRouter (${modelToUse}).`);
            return text;
        } catch (err: any) {
            if (attempt === maxRetries) {
                throw err;
            }
            const message = err?.message || String(err);
            const isTransient = message.includes('429') || message.includes('503') || message.includes('rate limit') || message.includes('overloaded');
            if (isTransient) {
                const delayMs = Math.max(8000, initialDelayMs * Math.pow(1.5, attempt - 1));
                console.warn(`⚠️ Transient error: ${message.slice(0, 90)}... Retrying in ${(delayMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})...`);
                await new Promise((res) => setTimeout(res, delayMs));
            } else {
                throw err;
            }
        }
    }

    throw new Error(`OpenRouter generation failed for model ${modelToUse} after ${maxRetries} attempts.`);
}
