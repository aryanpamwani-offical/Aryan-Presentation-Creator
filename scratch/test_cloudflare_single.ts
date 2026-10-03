import { generateWithCloudflare } from '../Presentation/ai-core/providers/cloudflare.js';

async function testSingleModelCloudflare() {
    console.log('Testing Cloudflare Single Model Retry...');
    try {
        const res = await generateWithCloudflare(
            'Test topic: CSS Units',
            'You are a testing assistant. Return RAW JSON only: [{"status": "ok", "provider": "cloudflare_single_model"}]',
            'outline'
        );
        console.log('✅ Response:', res);
    } catch (err: any) {
        console.error('❌ Error:', err?.message || err);
    }
}

testSingleModelCloudflare();
