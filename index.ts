import path from "path";
import { fileURLToPath } from "url";

import createSlides from "./Presentation/core/index.js";
import { manageCodeSnippets } from "./Presentation/core/snippet_manager.js";
import google_ai_core from "./Presentation/ai-core/google_ai_code.js";
import exportPresentationToPDF from "./Presentation/utils/export_pdf.js";
import AuthWithGoogle, { TOKEN_PATH } from "./Presentation/config/auth/google-oauth.js";
import { deleteResolvedFolder } from "./Presentation/config/drive/google_drive.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, "Presentation", "media", "json");
const JSON_FILE = path.join(MEDIA_DIR, "presentation.json");
const OUTLINE_FILE = path.join(MEDIA_DIR, "outline.json");

const TOPIC = "CSS Flexbox Properties  module 1: flexbox introduction, display: flex, main axis and cross axis, flex container and flex items . module 2: Flexbox Parent properties, flex-direction, flex-wrap, flex-flow, justify-content, align-items, align-content . module 3: Flexbox child properties, order, flex-grow, flex-shrink, flex-basis, flex shorthand, align-self . ";



function ensureGeminiKey() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing. Aborting.");
        process.exit(1);
    }
}

async function ensureGenerated(filePath: string, label: string, mode: string) {
    if (await Bun.file(filePath).exists()) {
        console.log(`✅ ${label} found. Skipping generation.`);
        return;
    }
    console.log(`📝 ${label} not found. Generating...`);
    const success = await google_ai_core(mode, TOPIC);
    if (!success) {
        console.error(`❌ Failed to generate ${label}. Aborting.`);
        process.exit(1);
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

async function main() {
    try {
        const tTotal = performance.now();

        // Authenticate once — reused across all steps
        const tAuth = performance.now();
        const auth = await AuthWithGoogle();
        console.log(`   🔑 Auth                 : ${(performance.now() - tAuth).toFixed(0)}ms`);

        ensureGeminiKey();

        await ensureGenerated(OUTLINE_FILE, "outline.json", "outline");
        await ensureGenerated(JSON_FILE, "presentation.json", "presentation");

        const tSnippets = performance.now();
        await manageCodeSnippets();
        console.log(`   🖼️  Code snippets        : ${(performance.now() - tSnippets).toFixed(0)}ms`);

        const result = await buildAndExport(auth);

        // Clean up temporary Google Drive folder after PDF export is complete
        const tClean = performance.now();
        await deleteResolvedFolder(auth);
        console.log(`   🧹 Clean Drive          : ${(performance.now() - tClean).toFixed(0)}ms`);

        console.log(`\n⏱️  Total pipeline        : ${((performance.now() - tTotal) / 1000).toFixed(2)}s`);

        if (result) {
            console.log(`\n🖥️  Google Slides URL: https://docs.google.com/presentation/d/${result.presentationId}/edit`);
            console.log(`📂 Saved PDF Location: ${result.pdfPath}`);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
