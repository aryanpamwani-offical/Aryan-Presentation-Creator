import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import crypto from "crypto";

import createSlides from "./Presentation/core/index.js";
import { manageCodeSnippets } from "./Presentation/core/snippet_manager.js";
import google_ai_core, { getConfiguredProviders, getPreferredProvider } from "./Presentation/ai-core/google_ai_code.js";
import exportPresentationToPDF from "./Presentation/utils/export_pdf.js";
import AuthWithGoogle, { TOKEN_PATH } from "./Presentation/config/auth/google-oauth.js";
// Google Drive integration for code snippets commented out in favor of Cloudflare R2
// import { deleteResolvedFolder } from "./Presentation/config/drive/google_drive.js";
import { askTextInput, selectOption } from "./Presentation/utils/interaction.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, "Presentation", "media", "json");
const JSON_FILE = path.join(MEDIA_DIR, "presentation.json");
const OUTLINE_FILE = path.join(MEDIA_DIR, "outline.json");

const DEFAULT_TOPIC = "CSS Units: px, em, rem, %, vh, vw  module 1: Introduction to CSS Units, absolute vs relative units, pixels (px) as a fixed unit . module 2: Relative font units (%, em, rem), inheritance and font scaling, difference between em and rem . module 3: Viewport units (vh, vw) vs percentages (%), responsive fluid design, and best use cases for each unit . ";

function ensureAiCredentials() {
    const configured = getConfiguredProviders();
    if (configured.length === 0) {
        console.error("❌ No AI provider configured. Please set at least one in .env:");
        console.error("   • OPENROUTER_API_KEY (for OpenRouter: Llama, DeepSeek, etc.)");
        console.error("   • CLOUDFLARE_TOKEN_API (for Cloudflare Workers AI)");
        console.error("   • GEMINI_API_KEY (for Google Gemini)");
        process.exit(1);
    }
    const preferred = getPreferredProvider();
    console.log(`🤖 Active AI Provider: ${preferred.toUpperCase()} (Available: ${configured.join(', ')})`);
}

function getTopicSlug(topic: string): string {
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
    const hash = crypto.createHash('md5').update(topic).digest('hex');
    return `${cleanTopic.substring(0, 50)}_${hash}`;
}

function manageTopicCache(topic: string, isForce: boolean) {
    const slug = getTopicSlug(topic);
    const lastTopicPath = path.join(MEDIA_DIR, "last_topic.txt");
    
    let lastTopic = "";
    if (fs.existsSync(lastTopicPath)) {
        lastTopic = fs.readFileSync(lastTopicPath, 'utf8').trim();
    }
    
    const currentOutlineCache = path.join(MEDIA_DIR, `outline_cache_${slug}.json`);
    const currentJsonCache = path.join(MEDIA_DIR, `presentation_cache_${slug}.json`);

    if (isForce) {
        console.log(`\n🔄 Force flag passed. Deleting cache files for topic: "${topic}"...`);
        if (fs.existsSync(currentOutlineCache)) fs.unlinkSync(currentOutlineCache);
        if (fs.existsSync(currentJsonCache)) fs.unlinkSync(currentJsonCache);
        if (fs.existsSync(OUTLINE_FILE)) fs.unlinkSync(OUTLINE_FILE);
        if (fs.existsSync(JSON_FILE)) fs.unlinkSync(JSON_FILE);
        fs.writeFileSync(lastTopicPath, topic, 'utf8');
        return;
    }
    
    if (lastTopic === topic) {
        return;
    }
    
    // Backup current files to last topic's cache
    if (lastTopic) {
        const lastSlug = getTopicSlug(lastTopic);
        if (fs.existsSync(OUTLINE_FILE)) {
            fs.copyFileSync(OUTLINE_FILE, path.join(MEDIA_DIR, `outline_cache_${lastSlug}.json`));
        }
        if (fs.existsSync(JSON_FILE)) {
            fs.copyFileSync(JSON_FILE, path.join(MEDIA_DIR, `presentation_cache_${lastSlug}.json`));
        }
    }
    
    // Restore new topic's cache if it exists, otherwise delete active files to trigger generation
    if (fs.existsSync(currentOutlineCache)) {
        fs.copyFileSync(currentOutlineCache, OUTLINE_FILE);
        console.log(`♻️  Restored outline cache for topic: "${topic}"`);
    } else if (fs.existsSync(OUTLINE_FILE)) {
        fs.unlinkSync(OUTLINE_FILE);
    }
    
    if (fs.existsSync(currentJsonCache)) {
        fs.copyFileSync(currentJsonCache, JSON_FILE);
        console.log(`♻️  Restored presentation cache for topic: "${topic}"`);
    } else if (fs.existsSync(JSON_FILE)) {
        fs.unlinkSync(JSON_FILE);
    }
    
    // Write new topic as last_topic
    fs.writeFileSync(lastTopicPath, topic, 'utf8');
}

async function ensureGenerated(
    filePath: string,
    label: string,
    mode: "outline" | "presentation",
    activeTopic: string,
    options?: { provider?: string; model?: string }
) {
    if (await Bun.file(filePath).exists()) {
        console.log(`✅ ${label} found. Skipping generation.`);
        return;
    }
    console.log(`📝 ${label} not found. Generating...`);
    const success = await google_ai_core(mode, activeTopic, options);
    if (!success) {
        throw new Error(`Failed to generate ${label}. Please review the AI model error above.`);
    }
}

async function buildAndExport(auth: unknown): Promise<{ presentationId: string; pdfPath: string } | null> {
    const t = performance.now();
    const slides = await createSlides(null, auth);
    console.log(`   🗂️  Slides build+upload : ${(performance.now() - t).toFixed(0)}ms`);

    if (typeof slides === "function") {
        await slides();
        return null;
    }

    const presentationId = (slides as any)?.data?.presentationId;
    if (!presentationId) {
        console.log("✅ Process completed successfully.");
        return null;
    }

    const title = (slides as any).data.title ?? "Presentation";
    const fileName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;

    const tPdf = performance.now();
    const pdfPath = (await exportPresentationToPDF(presentationId, fileName, auth)) as string;
    console.log(`   📄 PDF export           : ${(performance.now() - tPdf).toFixed(0)}ms`);

    return { presentationId, pdfPath };
}

export async function runPresentationPipeline(
    activeTopic: string,
    isForce: boolean = false,
    onProgress?: (message: string) => void,
    options?: { provider?: string; model?: string }
): Promise<{ presentationId: string; pdfPath: string } | null> {
    const log = (msg: string) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
    };

    const tTotal = performance.now();
    log(`\n📚 Active Topic: "${activeTopic}"`);

    // Initialize cache state for the active topic
    manageTopicCache(activeTopic, isForce);

    // Authenticate once — reused across all steps
    const tAuth = performance.now();
    const auth = await AuthWithGoogle();
    log(`   🔑 Auth                 : ${(performance.now() - tAuth).toFixed(0)}ms`);

    ensureAiCredentials();

    await ensureGenerated(OUTLINE_FILE, "outline.json", "outline", activeTopic, options);
    await ensureGenerated(JSON_FILE, "presentation.json", "presentation", activeTopic, options);

    const tSnippets = performance.now();
    await manageCodeSnippets();
    log(`   🖼️  Code snippets        : ${(performance.now() - tSnippets).toFixed(0)}ms`);

    const result = await buildAndExport(auth);

    log(`\n⏱️  Total pipeline        : ${((performance.now() - tTotal) / 1000).toFixed(2)}s`);

    if (result) {
        log(`\n🖥️  Google Slides URL: https://docs.google.com/presentation/d/${result.presentationId}/edit`);
        log(`📂 Saved PDF Location: ${result.pdfPath}`);
    }

    return result;
}

async function main() {
    try {
        const args = process.argv.slice(2);
        const isForce = args.includes('--force');
        const isInteractive = args.includes('--interactive') || args.includes('-i');
        const isWeb = args.includes('--web') || args.includes('-w');

        if (isWeb) {
            const { startServer } = await import("./server.js");
            await startServer();
            return;
        }

        // Parse CLI provider and model flags:
        // e.g. --provider cloudflare --model @cf/zai-org/glm-4.7-flash
        // or -p openrouter -m z-ai/glm-5.2:free
        let cliProvider: string | undefined;
        let cliModel: string | undefined;

        for (let i = 0; i < args.length; i++) {
            if ((args[i] === '--provider' || args[i] === '-p') && args[i + 1]) {
                cliProvider = args[i + 1].toLowerCase().trim();
            }
            if ((args[i] === '--model' || args[i] === '-m') && args[i + 1]) {
                cliModel = args[i + 1].trim();
            }
        }

        // Extract topic arguments (ignoring flags and their values)
        const topicTokens: string[] = [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--provider' || args[i] === '-p' || args[i] === '--model' || args[i] === '-m') {
                i++; // skip flag value
                continue;
            }
            if (args[i].startsWith('-')) continue;
            topicTokens.push(args[i]);
        }
        const cliTopic = topicTokens.join(' ').trim();

        let activeTopic = cliTopic;
        if (isInteractive) {
            activeTopic = await askTextInput("Please enter/paste your topic name");
            if (!activeTopic) {
                console.error("❌ No topic provided. Aborting.");
                process.exit(1);
            }

            // Interactive Provider & Model selection:
            const providerChoices = {
                auto: { name: `Auto-Detect (Current default: ${getPreferredProvider().toUpperCase()})` },
                cloudflare: { name: "Cloudflare Workers AI" },
                openrouter: { name: "OpenRouter" },
                gemini: { name: "Google Gemini" }
            };

            const selectedProvider = await selectOption("🤖 Select AI Provider:", providerChoices);
            if (selectedProvider && selectedProvider !== 'auto') {
                cliProvider = selectedProvider;

                // Preset models per provider
                let modelChoices: Record<string, { name: string; model: string }> = {};
                if (selectedProvider === 'cloudflare') {
                    const currentModel = process.env.CLOUDFLARE_AI_MODEL || '@cf/zai-org/glm-4.7-flash';
                    modelChoices = {
                        default: { name: `Default (${currentModel})`, model: currentModel },
                        glm: { name: "GLM-4.7-Flash (@cf/zai-org/glm-4.7-flash)", model: "@cf/zai-org/glm-4.7-flash" },
                        llama70b: { name: "Llama 3.1 70B (@cf/meta/llama-3.1-70b-instruct)", model: "@cf/meta/llama-3.1-70b-instruct" },
                        deepseekR1: { name: "DeepSeek R1 Distill 32B (@cf/deepseek-ai/deepseek-r1-distill-qwen-32b)", model: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b" },
                        custom: { name: "Enter custom model slug...", model: "custom" }
                    };
                } else if (selectedProvider === 'openrouter') {
                    const currentModel = process.env.OPENROUTER_MODEL || 'z-ai/glm-5.2:free';
                    modelChoices = {
                        default: { name: `Default (${currentModel})`, model: currentModel },
                        glmFree: { name: "GLM-5.2 Free (z-ai/glm-5.2:free)", model: "z-ai/glm-5.2:free" },
                        llama70b: { name: "Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)", model: "meta-llama/llama-3.3-70b-instruct" },
                        deepseek: { name: "DeepSeek V3 (deepseek/deepseek-chat)", model: "deepseek/deepseek-chat" },
                        custom: { name: "Enter custom model slug...", model: "custom" }
                    };
                } else if (selectedProvider === 'gemini') {
                    const currentModel = process.env.GOOGLE_MODEL || 'gemini-flash-lite-latest';
                    modelChoices = {
                        default: { name: `Default (${currentModel})`, model: currentModel },
                        flashLite: { name: "Gemini Flash Lite (gemini-flash-lite-latest)", model: "gemini-flash-lite-latest" },
                        flash: { name: "Gemini 3.6 Flash (gemini-3.6-flash)", model: "gemini-3.6-flash" },
                        custom: { name: "Enter custom model slug...", model: "custom" }
                    };
                }

                const selectedModelKey = await selectOption("🧠 Select Model:", modelChoices);
                if (selectedModelKey && selectedModelKey !== 'default') {
                    if (selectedModelKey === 'custom') {
                        const customModel = await askTextInput("Enter custom model name/slug:");
                        if (customModel) cliModel = customModel.trim();
                    } else {
                        cliModel = modelChoices[selectedModelKey]?.model;
                    }
                }
            }
        } else if (!activeTopic) {
            const lastTopicPath = path.join(MEDIA_DIR, "last_topic.txt");
            if (fs.existsSync(lastTopicPath)) {
                const savedTopic = fs.readFileSync(lastTopicPath, "utf8").trim();
                if (savedTopic) {
                    activeTopic = savedTopic;
                }
            }
            if (!activeTopic) {
                activeTopic = DEFAULT_TOPIC;
            }
        }

        const pipelineOptions = (cliProvider || cliModel) ? { provider: cliProvider, model: cliModel } : undefined;
        await runPresentationPipeline(activeTopic, isForce, undefined, pipelineOptions);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

if (import.meta.main) {
    main();
}
