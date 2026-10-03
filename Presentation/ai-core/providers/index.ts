import dotenv from 'dotenv';
import { generateWithOpenRouter, isOpenRouterConfigured } from './openrouter.js';
import { generateWithCloudflare, isCloudflareConfigured } from './cloudflare.js';
import { generateWithGemini, isGeminiConfigured } from './gemini.js';
import { cleanAndValidateJson } from '../json_cleaner.js';
import type { AIProviderName } from './types.js';

dotenv.config();

export * from './types.js';
export { isOpenRouterConfigured, generateWithOpenRouter } from './openrouter.js';
export { isCloudflareConfigured, generateWithCloudflare } from './cloudflare.js';
export { isGeminiConfigured, generateWithGemini } from './gemini.js';

/**
 * Returns a list of all providers that currently have valid credentials configured.
 */
export function getConfiguredProviders(): AIProviderName[] {
    const list: AIProviderName[] = [];
    if (isOpenRouterConfigured()) list.push('openrouter');
    if (isCloudflareConfigured()) list.push('cloudflare');
    if (isGeminiConfigured()) list.push('gemini');
    return list;
}

/**
 * Determines the primary AI provider to use based on env variables and available keys.
 */
export function getPreferredProvider(): AIProviderName {
    const specified = (process.env.AI_PROVIDER || '').toLowerCase().trim() as AIProviderName;

    if (specified === 'openrouter' && isOpenRouterConfigured()) return 'openrouter';
    if (specified === 'cloudflare' && isCloudflareConfigured()) return 'cloudflare';
    if (specified === 'gemini' && isGeminiConfigured()) return 'gemini';

    // Auto-detect based on priority: OpenRouter -> Cloudflare -> Gemini
    if (isOpenRouterConfigured()) return 'openrouter';
    if (isCloudflareConfigured()) return 'cloudflare';
    if (isGeminiConfigured()) return 'gemini';

    return 'gemini'; // default fallback
}

/**
 * Unified generation pipeline that supports OpenRouter, Cloudflare Workers AI, and Gemini
 * with automatic fallback between providers if one fails.
 */
export async function executeMultiProviderGeneration(
    promptContents: string,
    systemPrompt: string,
    mode: 'outline' | 'presentation',
    options?: { provider?: string; model?: string }
): Promise<string> {
    let preferred: AIProviderName;
    const requestedProvider = options?.provider?.toLowerCase().trim() as AIProviderName;
    if (requestedProvider && ['openrouter', 'cloudflare', 'gemini'].includes(requestedProvider)) {
        preferred = requestedProvider;
    } else {
        preferred = getPreferredProvider();
    }

    const configured = getConfiguredProviders();

    if (configured.length === 0) {
        throw new Error(
            '❌ No AI provider is configured. Please provide at least one API key in .env: OPENROUTER_API_KEY, CLOUDFLARE_TOKEN_API, or GEMINI_API_KEY.'
        );
    }

    // Build the ordered provider sequence starting with preferred
    const providerSequence: AIProviderName[] = [
        preferred,
        ...configured.filter((p) => p !== preferred),
    ];

    const modelInfo = options?.model ? ` | Model=${options.model}` : '';
    console.log(`🤖 AI Provider Strategy: Active=${preferred.toUpperCase()}${modelInfo} | Fallbacks=[${providerSequence.slice(1).join(', ') || 'none'}]`);

    let rawOutput: string | undefined;
    let lastError: any;

    for (const provider of providerSequence) {
        try {
            console.log(`🚀 Attempting generation using provider: [${provider.toUpperCase()}]`);

            // Only pass model override to the specifically requested provider
            const modelForProvider = (provider === preferred) ? options?.model : undefined;

            if (provider === 'openrouter') {
                rawOutput = await generateWithOpenRouter(promptContents, systemPrompt, mode, modelForProvider);
            } else if (provider === 'cloudflare') {
                rawOutput = await generateWithCloudflare(promptContents, systemPrompt, mode, modelForProvider);
            } else if (provider === 'gemini') {
                rawOutput = await generateWithGemini(promptContents, systemPrompt, mode, modelForProvider);
            }

            if (rawOutput) {
                // Validate JSON before accepting
                const validatedJson = cleanAndValidateJson(rawOutput, mode);
                console.log(`✅ [${provider.toUpperCase()}] successfully produced valid ${mode}.json.`);
                return validatedJson;
            }
        } catch (err: any) {
            lastError = err;
            console.warn(`⚠️ Provider [${provider.toUpperCase()}] failed: ${err?.message || err}`);
            console.log(`🔄 Attempting next available provider in fallback sequence...`);
        }
    }

    throw lastError || new Error(`Generation failed across all available AI providers (${providerSequence.join(', ')}).`);
}
