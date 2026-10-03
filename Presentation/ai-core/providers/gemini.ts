import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { callWithRetry } from '../../utils/retry.js';

dotenv.config();

export function isGeminiConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export async function generateWithGemini(
    promptContents: string,
    systemPrompt: string,
    mode: 'outline' | 'presentation',
    modelOverride?: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('❌ GEMINI_API_KEY is missing in environment variables.');
    }

    const genAI = new GoogleGenAI({ apiKey });
    const primaryModel = modelOverride || process.env.GOOGLE_MODEL || 'gemini-flash-lite-latest';
    const candidateModels = [
        primaryModel,
        'gemini-flash-lite-latest',
        'gemini-3.6-flash',
        'gemini-2.5-flash-lite',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let content: string | undefined;
    let lastError: any;

    for (const modelToUse of candidateModels) {
        try {
            console.log(`⏳ Calling Gemini (${modelToUse}) in "${mode}" mode...`);

            const response = await callWithRetry(
                () =>
                    genAI.models.generateContent({
                        model: modelToUse,
                        contents: promptContents,
                        config: {
                            systemInstruction: systemPrompt,
                            temperature: 0.25,
                            maxOutputTokens: 16384,
                            responseMimeType: 'application/json',
                        },
                    }),
                4,
                2500
            );

            content = response?.text;
            if (content) {
                console.log(`✨ Successfully generated ${mode} content with Gemini (${modelToUse}).`);
                break;
            }
        } catch (err: any) {
            lastError = err;
            console.warn(`⚠️ Gemini model "${modelToUse}" failed: ${err?.message || err}.`);
        }
    }

    if (!content) {
        throw lastError || new Error('Gemini generation failed across all candidate models.');
    }

    return content;
}
