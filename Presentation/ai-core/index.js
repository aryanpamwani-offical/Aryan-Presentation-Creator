// ai-core/index.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { callWithRetry } from '../utils/retry.js';

dotenv.config();
import saveJSONFile from './saveJSONFile.js';
import system_prompt from './systemprompt.js';

const openai = new OpenAI({
  baseURL: process.env.BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function ai_core() {
  try {
    if (!system_prompt || typeof system_prompt !== 'string') {
      throw new Error('System prompt missing or invalid');
    }

    const completion = await callWithRetry(() => openai.chat.completions.create({
      model: process.env.MODEL,
      temperature: 0.7,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000", // required by OpenRouter
        "X-Title": "My Presentation App",
      },
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: 'NEW TOPIC:CSS FLEXBOX' },
      ],
    }));

    if (!completion?.choices?.length) {
      throw new Error('No completion choices returned from OpenRouter');
    }

    const content = completion.choices[0].message?.content;

    if (!content) {
      throw new Error('Model response content is empty');
    }

    //console.log(content);

    const saved = saveJSONFile(content);

    if (!saved) {
      console.error('Failed to save JSON file');
    }
  } catch (error) {
    console.error('❌ Error in main():', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    // If it's an OpenAI SDK error, check:
    console.error('Status:', error.status);
    console.error('Error body:', error.error);
  }
}

