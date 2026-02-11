// ai-core/index.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

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

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: 'NEW TOPIC:CSS FLEXBOX' },
      ],
    });

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
  }
}

