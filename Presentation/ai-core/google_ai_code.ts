// ai-core/google_ai_code.js
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { callWithRetry } from '../utils/retry.js';

dotenv.config();
import saveJSONFile from './saveJSONFile.js';
import { prestentation_system_prompt, prestentation_topics_system_prompt } from './systemprompt.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


export default async function google_ai_core(mode = 'presentation', topic) {
  try {
    // ── 1. Auth guard ──────────────────────────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('❌ Not authenticated: GEMINI_API_KEY is missing. Aborting.');
    }

    // ── 2. Pick system prompt & output file based on mode ─────────────────────
    let systemPrompt;
    let outputFileName;

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

    console.log(`⏳ Calling Gemini in "${mode}" mode for topic: "${topic}"...`);

    // ── 3. Call Gemini ─────────────────────────────────────────────────────────
    const response = await callWithRetry(() =>
      genAI.models.generateContent({
        model: process.env.GOOGLE_MODEL,
        contents: `NEW TOPIC:${topic}`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
        },
      })
    );

    const content = response.text;

    if (!content) {
      throw new Error('Model response content is empty');
    }

    // ── 4. Save JSON ───────────────────────────────────────────────────────────
    const saved = await saveJSONFile(content, outputFileName);

    if (!saved) {
      throw new Error(`Failed to save ${outputFileName}`);
    }

    console.log(`✅ ${outputFileName} saved successfully.`);
    return true;

  } catch (error) {
    console.error('❌ Error in google_ai_core():', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}