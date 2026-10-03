import open from "open";
import { runPresentationPipeline } from "./index.js";

const DEFAULT_PORT = 3333;

interface GenerateRequestBody {
    topic: string;
    isForce?: boolean;
    provider?: string;
    model?: string;
}

export async function startServer(port: number = DEFAULT_PORT) {
    let isGenerating = false;

    const server = Bun.serve({
        port,
        async fetch(req) {
            const url = new URL(req.url);

            // API: Health / Ping
            if (url.pathname === "/api/health") {
                return Response.json({ status: "ok", isGenerating });
            }

            // API: Generate with SSE streaming
            if (url.pathname === "/api/generate" && req.method === "POST") {
                if (isGenerating) {
                    return new Response(JSON.stringify({ error: "Another generation is already in progress." }), {
                        status: 429,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                let body: GenerateRequestBody;
                try {
                    body = await req.json();
                } catch {
                    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const topic = (body.topic || "").trim();
                if (!topic) {
                    return new Response(JSON.stringify({ error: "Topic is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const isForce = Boolean(body.isForce);
                const provider = (body.provider || "").trim();
                const model = (body.model || "").trim();

                // Stream response using SSE
                const stream = new ReadableStream({
                    async start(controller) {
                        const encoder = new TextEncoder();
                        const send = (type: string, data: any) => {
                            try {
                                const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
                                controller.enqueue(encoder.encode(msg));
                            } catch {}
                        };

                        const origLog = console.log;
                        const origError = console.error;
                        const origWarn = console.warn;
                        const origInfo = console.info;

                        const formatArgs = (args: any[]) => {
                            return args
                                .map((arg) => {
                                    if (arg instanceof Error) {
                                        return `${arg.message}\n${arg.stack || ""}`;
                                    }
                                    if (typeof arg === "object" && arg !== null) {
                                        try {
                                            return JSON.stringify(arg, null, 2);
                                        } catch {
                                            return String(arg);
                                        }
                                    }
                                    return String(arg);
                                })
                                .join(" ");
                        };

                        console.log = (...args: any[]) => {
                            origLog(...args);
                            send("log", { message: formatArgs(args) });
                        };
                        console.error = (...args: any[]) => {
                            origError(...args);
                            send("log", { message: `❌ ${formatArgs(args)}` });
                        };
                        console.warn = (...args: any[]) => {
                            origWarn(...args);
                            send("log", { message: `⚠️ ${formatArgs(args)}` });
                        };
                        console.info = (...args: any[]) => {
                            origInfo(...args);
                            send("log", { message: formatArgs(args) });
                        };

                        isGenerating = true;
                        try {
                            send("log", { message: `🚀 Starting presentation generation pipeline...` });
                            send("log", { message: `📚 Topic: "${topic}"` });
                            if (isForce) send("log", { message: `🔄 Force cache regeneration enabled.` });
                            if (provider) send("log", { message: `🤖 Selected Provider: ${provider.toUpperCase()}` });
                            if (model) send("log", { message: `🧠 Selected Model: ${model}` });

                            const pipelineOptions = (provider || model) ? { provider, model } : undefined;
                            const result = await runPresentationPipeline(topic, isForce, undefined, pipelineOptions);

                            if (result) {
                                send("done", {
                                    success: true,
                                    presentationId: result.presentationId,
                                    slidesUrl: `https://docs.google.com/presentation/d/${result.presentationId}/edit`,
                                    pdfPath: result.pdfPath
                                });
                            } else {
                                send("done", {
                                    success: true,
                                    message: "Presentation generated successfully."
                                });
                            }
                        } catch (err: any) {
                            const errMessage = err?.message || String(err);
                            const errStack = err?.stack || "";
                            origError("Pipeline error:", err);
                            send("log", { message: `\n❌ Pipeline Error: ${errMessage}` });
                            if (errStack) {
                                send("log", { message: `Stack Trace:\n${errStack}` });
                            }
                            send("error", { message: errMessage, stack: errStack });
                        } finally {
                            console.log = origLog;
                            console.error = origError;
                            console.warn = origWarn;
                            console.info = origInfo;
                            isGenerating = false;
                            controller.close();
                        }
                    }
                });

                return new Response(stream, {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                });
            }

            // HTML Webpage
            if (url.pathname === "/" || url.pathname === "/index.html") {
                return new Response(INDEX_HTML, {
                    headers: { "Content-Type": "text/html; charset=utf-8" }
                });
            }

            return new Response("Not Found", { status: 404 });
        }
    });

    const localUrl = `http://localhost:${server.port}`;
    console.log(`\n=================================================`);
    console.log(`🚀 Presentation Creator Web UI`);
    console.log(`🌐 Local URL: ${localUrl}`);
    console.log(`=================================================\n`);

    try {
        await open(localUrl);
    } catch {
        console.log(`ℹ️  Open ${localUrl} in your browser.`);
    }

    return server;
}

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presentation Creator UI</title>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --border: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --accent: #10b981;
            --danger: #ef4444;
            --terminal-bg: #090d16;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: var(--bg); color: var(--text-main); min-height: 100vh; padding: 2rem 1rem; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 860px; display: flex; flex-direction: column; gap: 1.5rem; }
        
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
        .header h1 { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .badge { background: #1e3a8a; color: #93c5fd; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 600; }
        
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); }
        .field { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; }
        label { font-size: 0.9rem; font-weight: 600; color: #cbd5e1; }
        .sublabel { font-size: 0.8rem; color: var(--text-muted); }
        
        textarea {
            width: 100%; min-height: 140px; padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border);
            background: #0b1120; color: var(--text-main); font-size: 0.95rem; line-height: 1.5; resize: vertical; outline: none; transition: border-color 0.2s;
        }
        textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25); }
        select, input[type="text"] {
            width: 100%; padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid var(--border);
            background: #0b1120; color: var(--text-main); font-size: 0.9rem; outline: none; transition: border-color 0.2s;
        }
        select:focus, input[type="text"]:focus { border-color: var(--primary); }
        
        .row-options { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; }
        .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer; color: var(--text-muted); user-select: none; }
        .checkbox-label input { accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; }
        
        .quick-presets { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .preset-btn { background: #334155; border: none; color: #e2e8f0; font-size: 0.75rem; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; }
        .preset-btn:hover { background: #475569; }

        .btn-generate {
            width: 100%; background: var(--primary); color: white; border: none; padding: 0.85rem; font-size: 1rem; font-weight: 600;
            border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s;
        }
        .btn-generate:hover:not(:disabled) { background: var(--primary-hover); }
        .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .status-container { margin-top: 1rem; display: none; flex-direction: column; gap: 0.75rem; }
        .status-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
        .status-title { font-size: 0.95rem; font-weight: 600; color: #cbd5e1; display: flex; align-items: center; gap: 0.5rem; }
        .terminal-actions { display: flex; gap: 0.5rem; }
        .action-btn { background: #334155; border: 1px solid var(--border); color: #cbd5e1; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 4px; cursor: pointer; }
        .action-btn:hover { background: #475569; }
        
        .terminal {
            background: var(--terminal-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.1rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem;
            color: #38bdf8; min-height: 220px; max-height: 480px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6;
            word-break: break-word;
        }
        
        .success-box {
            background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 1.25rem; display: none; flex-direction: column; gap: 0.75rem;
        }
        .success-box h3 { color: #34d399; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; }
        .success-links { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
        .link-btn {
            background: #059669; color: white; text-decoration: none; padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem;
        }
        .link-btn:hover { background: #047857; }
        .pdf-path-info { font-size: 0.82rem; color: #94a3b8; word-break: break-all; }
        
        .spinner {
            width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%;
            animation: spin 0.8s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Aryan Presentation Creator</h1>
            <span class="badge">Web UI</span>
        </div>

        <div class="card">
            <div class="field">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label for="topicInput">Presentation Topic / Outline</label>
                    <div class="quick-presets">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Presets:</span>
                        <button type="button" class="preset-btn" onclick="setPreset('css')">CSS Units</button>
                        <button type="button" class="preset-btn" onclick="setPreset('flexbox')">Flexbox</button>
                    </div>
                </div>
                <div class="sublabel">Paste single-line or multi-line topics, outline notes, or module descriptions.</div>
                <textarea id="topicInput" placeholder="Paste your topic outline here... e.g.&#10;CSS Units: px, em, rem, %, vh, vw&#10;module 1: Introduction to CSS Units...&#10;module 2: Relative font units..."></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                <div class="field" style="margin-bottom:0;">
                    <label for="providerSelect">🤖 AI Provider</label>
                    <select id="providerSelect" onchange="onProviderChange()">
                        <option value="auto">Auto (Priority Fallback)</option>
                        <option value="cloudflare">Cloudflare Workers AI</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="gemini">Google Gemini</option>
                    </select>
                </div>
                <div class="field" style="margin-bottom:0;">
                    <label for="modelSelect">🧠 Model</label>
                    <select id="modelSelect" onchange="onModelChange()">
                        <option value="">Default (From .env)</option>
                    </select>
                    <input type="text" id="customModelInput" placeholder="Enter custom model slug..." style="display:none; margin-top:0.4rem;">
                </div>
            </div>

            <div class="row-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="forceCheck">
                    <span>Force regeneration (ignore cached files)</span>
                </label>
            </div>

            <button type="button" id="generateBtn" class="btn-generate" onclick="startGeneration()">
                <span>🚀 Generate Presentation</span>
            </button>

            <div class="status-container" id="statusContainer">
                <div class="status-header">
                    <div class="status-title">
                        <span id="statusText">⏳ Processing pipeline...</span>
                    </div>
                    <div class="terminal-actions">
                        <button type="button" class="action-btn" onclick="copyLogs()">📋 Copy Logs</button>
                        <button type="button" class="action-btn" onclick="clearLogs()">🧹 Clear</button>
                    </div>
                </div>
                <div class="terminal" id="terminalLog"></div>
                <div class="success-box" id="successBox">
                    <h3>✅ Presentation Generated Successfully!</h3>
                    <div class="pdf-path-info" id="pdfPathText"></div>
                    <div class="success-links" id="successLinks"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const presets = {
            css: "CSS Units: px, em, rem, %, vh, vw  module 1: Introduction to CSS Units, absolute vs relative units, pixels (px) as a fixed unit . module 2: Relative font units (%, em, rem), inheritance and font scaling, difference between em and rem . module 3: Viewport units (vh, vw) vs percentages (%), responsive fluid design, and best use cases for each unit . ",
            flexbox: "CSS Flexbox Properties  module 1: flexbox introduction, display: flex, main axis and cross axis, flex container and flex items . module 2: Flexbox Parent properties, flex-direction, flex-wrap, flex-flow, justify-content, align-items, align-content . module 3: Flexbox child properties, order, flex-grow, flex-shrink, flex-basis, flex shorthand, align-self . "
        };

        const providerModels = {
            auto: [{ label: "Default (From .env)", value: "" }],
            cloudflare: [
                { label: "Default (From .env)", value: "" },
                { label: "GLM-4.7-Flash (@cf/zai-org/glm-4.7-flash)", value: "@cf/zai-org/glm-4.7-flash" },
                { label: "Llama 3.1 70B (@cf/meta/llama-3.1-70b-instruct)", value: "@cf/meta/llama-3.1-70b-instruct" },
                { label: "DeepSeek R1 Distill 32B (@cf/deepseek-ai/deepseek-r1-distill-qwen-32b)", value: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b" },
                { label: "Custom model...", value: "custom" }
            ],
            openrouter: [
                { label: "Default (From .env)", value: "" },
                { label: "GLM-5.2 Free (z-ai/glm-5.2:free)", value: "z-ai/glm-5.2:free" },
                { label: "Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)", value: "meta-llama/llama-3.3-70b-instruct" },
                { label: "DeepSeek V3 (deepseek/deepseek-chat)", value: "deepseek/deepseek-chat" },
                { label: "Custom model...", value: "custom" }
            ],
            gemini: [
                { label: "Default (From .env)", value: "" },
                { label: "Gemini Flash Lite (gemini-flash-lite-latest)", value: "gemini-flash-lite-latest" },
                { label: "Gemini 3.6 Flash (gemini-3.6-flash)", value: "gemini-3.6-flash" },
                { label: "Custom model...", value: "custom" }
            ]
        };

        function onProviderChange() {
            const provider = document.getElementById('providerSelect').value;
            const modelSelect = document.getElementById('modelSelect');
            const customInput = document.getElementById('customModelInput');
            modelSelect.innerHTML = '';
            customInput.style.display = 'none';

            const models = providerModels[provider] || providerModels.auto;
            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.value;
                opt.textContent = m.label;
                modelSelect.appendChild(opt);
            });
        }

        function onModelChange() {
            const val = document.getElementById('modelSelect').value;
            const customInput = document.getElementById('customModelInput');
            if (val === 'custom') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        }

        function setPreset(type) {
            document.getElementById('topicInput').value = presets[type] || '';
        }

        async function startGeneration() {
            const topic = document.getElementById('topicInput').value.trim();
            if (!topic) {
                alert('Please enter or paste a presentation topic!');
                return;
            }

            const isForce = document.getElementById('forceCheck').checked;
            const provider = document.getElementById('providerSelect').value;
            let model = document.getElementById('modelSelect').value;
            if (model === 'custom') {
                model = document.getElementById('customModelInput').value.trim();
            }

            const btn = document.getElementById('generateBtn');
            const statusContainer = document.getElementById('statusContainer');
            const statusText = document.getElementById('statusText');
            const terminalLog = document.getElementById('terminalLog');
            const successBox = document.getElementById('successBox');
            const successLinks = document.getElementById('successLinks');
            const pdfPathText = document.getElementById('pdfPathText');

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> <span>Generating Slides...</span>';
            statusContainer.style.display = 'flex';
            successBox.style.display = 'none';
            terminalLog.textContent = '';
            statusText.textContent = '⏳ Processing pipeline...';

            try {
                const payload = {
                    topic,
                    isForce,
                    provider: provider !== 'auto' ? provider : undefined,
                    model: model || undefined
                };

                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Request failed');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const lines = buffer.split('\\n\\n');
                    buffer = lines.pop(); // keep last incomplete chunk

                    for (const block of lines) {
                        if (!block.trim()) continue;
                        let eventType = 'message';
                        let dataStr = '';

                        for (const line of block.split('\\n')) {
                            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                            if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
                        }

                        if (!dataStr) continue;
                        try {
                            const data = JSON.parse(dataStr);

                            if (eventType === 'log') {
                                terminalLog.textContent += data.message + '\\n';
                                terminalLog.scrollTop = terminalLog.scrollHeight;
                            } else if (eventType === 'done') {
                                statusText.textContent = '🎉 Generation Complete!';
                                successBox.style.display = 'flex';
                                pdfPathText.textContent = data.pdfPath ? ('Saved PDF: ' + data.pdfPath) : '';
                                
                                successLinks.innerHTML = '';
                                if (data.slidesUrl) {
                                    successLinks.innerHTML += '<a href="' + data.slidesUrl + '" target="_blank" class="link-btn">🖥️ Open Google Slides</a>';
                                }
                            } else if (eventType === 'error') {
                                statusText.textContent = '❌ Generation Failed';
                                terminalLog.textContent += '\\n❌ ERROR: ' + data.message + '\\n';
                            }
                        } catch (parseErr) {
                            console.error('Error parsing SSE event:', parseErr);
                        }
                    }
                }
            } catch (err) {
                statusText.textContent = '❌ Generation Failed';
                terminalLog.textContent += '\\n❌ ERROR: ' + err.message + '\\n';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>🚀 Generate Presentation</span>';
            }
        }

        function copyLogs() {
            const text = document.getElementById('terminalLog').textContent;
            navigator.clipboard.writeText(text).then(() => {
                alert('Logs copied to clipboard!');
            });
        }

        function clearLogs() {
            document.getElementById('terminalLog').textContent = '';
        }
    </script>
</body>
</html>`;

if (import.meta.main) {
    startServer();
}
