import { generateWithOpenRouter, isOpenRouterConfigured, getOpenRouterApiKey } from '../Presentation/ai-core/providers/openrouter.js';
import { prestentation_topics_system_prompt } from '../Presentation/ai-core/systemprompt.js';
import { cleanAndValidateJson } from '../Presentation/ai-core/json_cleaner.js';

async function testOpenRouter() {
    console.log('Testing OpenRouter Configuration...');
    console.log('Is Configured:', isOpenRouterConfigured());
    console.log('Key Preview:', getOpenRouterApiKey()?.slice(0, 15) + '...');
    console.log('Configured Model:', process.env.OPENROUTER_MODEL);

    const topic = 'CSS Units: px, em, rem, %, vh, vw';
    const systemPrompt = prestentation_topics_system_prompt
        .replace(/{{NEW_TOPIC}}/g, topic)
        .replace(/{{TOPIC_LIST}}/g, topic);

    try {
        console.log('\n⏳ Initiating OpenRouter test for outline generation...');
        const rawResult = await generateWithOpenRouter(
            `NEW TOPIC: ${topic}`,
            systemPrompt,
            'outline'
        );

        console.log('\n✨ Raw Result Preview (first 300 chars):');
        console.log(rawResult.slice(0, 300));

        const cleaned = cleanAndValidateJson(rawResult, 'outline');
        console.log('\n✅ JSON Cleaner Validation Successful!');
        console.log('Cleaned JSON sample:\n', cleaned.slice(0, 400) + '\n...');
    } catch (err: any) {
        console.error('\n❌ OpenRouter Test Failed:', err?.message || err);
    }
}

testOpenRouter();
