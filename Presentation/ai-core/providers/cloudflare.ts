import dotenv from 'dotenv';
import { callWithRetry } from '../../utils/retry.js';

dotenv.config();

export function getCloudflareAccountId(): string | undefined {
    if (process.env.CLOUDFLARE_ACCOUNT_ID) {
        return process.env.CLOUDFLARE_ACCOUNT_ID.trim();
    }
    const endpoint = process.env.CLOUDFLARE_JURISDICTION_SPECIFIC_ENDPOINT;
    if (endpoint) {
        const match = endpoint.match(/https?:\/\/([a-f0-9]+)\./i);
        if (match && match[1]) {
            return match[1];
        }
    }
    return undefined;
}

export function isCloudflareConfigured(): boolean {
    const token = process.env.CLOUDFLARE_TOKEN_API || process.env.CLOUDFLARE_API_TOKEN;
    const accountId = getCloudflareAccountId();
    return Boolean(token && token.trim().length > 0 && accountId && accountId.length > 0);
}

export async function generateWithCloudflare(
    promptContents: string,
    systemPrompt: string,
    mode: 'outline' | 'presentation',
    modelOverride?: string
): Promise<string> {
    const apiToken = (process.env.CLOUDFLARE_TOKEN_API || process.env.CLOUDFLARE_API_TOKEN)?.trim();
    const accountId = getCloudflareAccountId();

    if (!apiToken) {
        throw new Error('❌ CLOUDFLARE_TOKEN_API is missing in environment variables.');
    }
    if (!accountId) {
        throw new Error(
            '❌ Cloudflare Account ID could not be determined. Please set CLOUDFLARE_ACCOUNT_ID in .env.'
        );
    }

    // Strictly use the single configured model without changing models
    const modelToUse = modelOverride || process.env.CLOUDFLARE_AI_MODEL || '@cf/zai-org/glm-4.7-flash';
    const maxRetries = 5;
    const initialDelayMs = 5000; // 5 seconds initial delay

    console.log(`⏳ Using Cloudflare Workers AI model "${modelToUse}" in "${mode}" mode...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`⏳ Attempt ${attempt}/${maxRetries} with Cloudflare Workers AI (${modelToUse})...`);

            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelToUse}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: promptContents },
                        ],
                        max_tokens: 8192,
                        temperature: 0.25,
                    }),
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                const isTransient = response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504;

                if (isTransient && attempt < maxRetries) {
                    const delayMs = initialDelayMs * Math.pow(1.8, attempt - 1);
                    console.warn(`⚠️ Cloudflare Workers AI busy/rate-limited (${response.status}). Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt + 1}/${maxRetries}...`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    continue;
                }

                throw new Error(`Cloudflare AI HTTP ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (!data.success && data.errors?.length) {
                const errMsg = data.errors.map((e: any) => e.message).join(', ');
                if (attempt < maxRetries) {
                    const delayMs = initialDelayMs * Math.pow(1.8, attempt - 1);
                    console.warn(`⚠️ Cloudflare AI error: ${errMsg}. Retrying in ${(delayMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})...`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    continue;
                }
                throw new Error(`Cloudflare AI error: ${errMsg}`);
            }

            const text =
                data?.result?.response ||
                data?.result?.choices?.[0]?.message?.content ||
                data?.result?.text;

            if (!text) {
                if (attempt < maxRetries) {
                    const delayMs = initialDelayMs * Math.pow(1.8, attempt - 1);
                    console.warn(`⚠️ Cloudflare AI returned empty content for ${modelToUse}. Retrying in ${(delayMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})...`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    continue;
                }
                throw new Error(`Cloudflare AI response returned no text for model ${modelToUse}`);
            }

            console.log(`✨ Successfully generated ${mode} content with Cloudflare Workers AI (${modelToUse}).`);
            return text;
        } catch (err: any) {
            if (attempt === maxRetries) {
                throw err;
            }
            const message = err?.message || String(err);
            const isTransient = message.includes('429') || message.includes('500') || message.includes('502') || message.includes('503') || message.includes('rate limit');
            if (isTransient) {
                const delayMs = initialDelayMs * Math.pow(1.8, attempt - 1);
                console.warn(`⚠️ Transient error: ${message.slice(0, 90)}... Retrying in ${(delayMs / 1000).toFixed(1)}s (${attempt}/${maxRetries})...`);
                await new Promise((res) => setTimeout(res, delayMs));
            } else {
                throw err;
            }
        }
    }

    throw new Error(`Cloudflare Workers AI generation failed for model ${modelToUse} after ${maxRetries} attempts.`);
}
