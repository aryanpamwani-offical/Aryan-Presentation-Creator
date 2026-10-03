// ai-core/google_ai_code.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
import saveJSONFile from './saveJSONFile.js';
import { prestentation_system_prompt, prestentation_topics_system_prompt } from './systemprompt.js';
import {
    executeMultiProviderGeneration,
    getConfiguredProviders,
    getPreferredProvider,
} from './providers/index.js';

export { executeMultiProviderGeneration, getConfiguredProviders, getPreferredProvider };

/**
 * Main AI generation entry point for outline.json and presentation.json.
 * Supports Google Gemini, OpenRouter, and Cloudflare Workers AI with automatic fallback.
 */
export default async function google_ai_core(
    mode: 'presentation' | 'outline' | string = 'presentation',
    topic: string,
    options?: { provider?: string; model?: string }
): Promise<boolean> {
    try {
        // ── 1. Auth guard ──────────────────────────────────────────────────────────
        const configured = getConfiguredProviders();
        if (configured.length === 0) {
            throw new Error(
                '❌ No AI provider authenticated: Missing API keys in .env. Please set OPENROUTER_API_KEY, CLOUDFLARE_TOKEN_API, or GEMINI_API_KEY.'
            );
        }

        // ── 2. Pick system prompt & output file based on mode ─────────────────────
        let systemPrompt: string;
        let outputFileName: string;

        if (mode === 'outline') {
            systemPrompt = prestentation_topics_system_prompt;
            outputFileName = 'outline.json';

            if (!systemPrompt || typeof systemPrompt !== 'string') {
                throw new Error('prestentation_topics_system_prompt is missing or invalid');
            }
        } else if (mode === 'presentation') {
            systemPrompt = prestentation_system_prompt;
            outputFileName = 'presentation.json';

            if (!systemPrompt || typeof systemPrompt !== 'string') {
                throw new Error('prestentation_system_prompt is missing or invalid');
            }
        } else {
            throw new Error(`Unknown mode "${mode}". Use "presentation" or "outline".`);
        }

        // Prepare prompt contents
        let promptContents = `NEW TOPIC: ${topic}`;
        if (mode === 'presentation') {
            const outlinePath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'outline.json');
            if (fs.existsSync(outlinePath)) {
                try {
                    const outlineRaw = fs.readFileSync(outlinePath, 'utf8');
                    promptContents = `NEW TOPIC: ${topic}\n\nCOURSE OUTLINE TO FOLLOW STRICTLY (Generate slides for all 3 modules and cover each topic in this exact order):\n${outlineRaw}`;
                } catch {
                    // fallback to simple topic string
                }
            }
        }

        // Interpolate topic template placeholders if present
        const resolvedSystemPrompt = systemPrompt
            .replace(/{{NEW_TOPIC}}/g, topic)
            .replace(/{{TOPIC_LIST}}/g, topic);

        // ── 3. Execute multi-provider generation with fallback ────────────────────
        const validatedJson = await executeMultiProviderGeneration(
            promptContents,
            resolvedSystemPrompt,
            mode as 'outline' | 'presentation',
            options
        );

        // ── 4. Save validated JSON ────────────────────────────────────────────────
        const saved = await saveJSONFile(validatedJson, outputFileName);

        if (!saved) {
            throw new Error(`Failed to save ${outputFileName}`);
        }

        console.log(`✅ ${outputFileName} saved successfully.`);
        return true;
    } catch (error: any) {
        console.error('❌ Error in AI generation core:', error?.message || error);
        if (error?.stack) console.error('Stack:', error.stack);
        return false;
    }
}