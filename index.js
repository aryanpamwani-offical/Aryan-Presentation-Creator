import createSlides from "./Presentation/core/index.js";
import ai_core from "./Presentation/ai-core/index.js";
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
            // Note: Ensure createSlides can handle a null input or 
            // modify this to read the existing JSON file if needed.
        } else {
            console.log("presentation.json not found. Running AI core...");
            ai_response = await ai_core();
        }

        // Run the slides generation
        // Pass the ai_response (which will be null if the file existed)
        const slides = await createSlides(ai_response);
        
        if (typeof slides === 'function') {
            await slides();
        }
        
        console.log("Process completed successfully.");

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();