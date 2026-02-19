import createSlides from "./Presentation/core/index.js";
import ai_core from "./Presentation/ai-core/index.js";
import { manageCodeSnippets } from "./Presentation/core/snippet_manager.js";
import exportPresentationToPDF from "./Presentation/utils/export_pdf.js"; 
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Helper to handle paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        // Define the path to your presentation.json
        const jsonFilePath = path.join(__dirname, "Presentation", "media", "json", "presentation.json");

        let ai_response = null;

        // Check if the file exists
        if (fs.existsSync(jsonFilePath)) {
            console.log("presentation.json found. Skipping AI core...");
            // If the file exists, we skip ai_core. 
        } else {
            console.log("presentation.json not found. Running AI core...");
            ai_response = await ai_core();
        }

        // --- NEW: Generate/Update Code Snippets if needed ---
        // This runs the optimized check logic. If no updates needed, it is very fast.
        await manageCodeSnippets();

        // Run the slides generation
        // Pass the ai_response (which will be null if the file existed)
        const slides = await createSlides(ai_response);

        if (typeof slides === 'function') {
            await slides();
        }

        // --- NEW: Export to PDF ---
        if (slides && slides.data && slides.data.presentationId) {
            const pId = slides.data.presentationId;
            const pTitle = slides.data.title || "Presentation";
            // Clean title for filename potentially?
            const safeTitle = pTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeTitle}.pdf`;

            console.log(`\n🎉 Presentation Created: https://docs.google.com/presentation/d/${pId}/edit`);

            // Export
            await exportPresentationToPDF(pId, fileName);
        } else {
            console.log("Process completed successfully.");
        }

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();