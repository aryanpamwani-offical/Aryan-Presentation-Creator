import { startTunnel } from 'untun';

async function test() {
    console.log('🚀 Starting temporary local HTTP server...');
    const server = Bun.serve({
        port: 0, // pick random available port
        fetch(req) {
            const url = new URL(req.url);
            if (url.pathname === '/ping') {
                return new Response('PONG from local Bun server!');
            }
            return new Response('Hello World from local machine!');
        }
    });

    console.log(`📡 Local server listening on http://localhost:${server.port}`);

    console.log('🌐 Opening Cloudflare Quick Tunnel...');
    const tunnel = await startTunnel({ port: server.port });
    const publicUrl = await tunnel.getURL();

    console.log(`🎉 Cloudflare Tunnel URL: ${publicUrl}`);
    console.log(`🔗 Test endpoint: ${publicUrl}/ping`);

    console.log('⏳ Waiting for Cloudflare DNS propagation...');
    let connected = false;
    for (let i = 0; i < 10; i++) {
        try {
            await new Promise(r => setTimeout(r, 1000));
            const res = await fetch(`${publicUrl}/ping`);
            if (res.ok) {
                const text = await res.text();
                console.log(`✅ Success on attempt ${i + 1}! Response through Cloudflare: "${text}"`);
                connected = true;
                break;
            }
        } catch (e: any) {
            console.log(`   ... waiting for DNS (${e.code || e.message}) [attempt ${i + 1}/10]`);
        }
    }

    if (!connected) {
        throw new Error('❌ Cloudflare Tunnel DNS failed to propagate in time.');
    }

    console.log('🧹 Closing tunnel and stopping local server...');
    await tunnel.close();
    server.stop();
    console.log('✨ Cleaned up successfully!');
}

test().catch(console.error);
