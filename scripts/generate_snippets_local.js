import fs from 'fs';
import path from 'path';
import { generateCodeSnippet } from '../Presentation/utils/generate_code_snippet.js';
import config from '../Presentation/config/snippet_config.js';

async function main() {
    try {
        console.log('🚀 Starting local snippet generation (No Upload)...');
        
        const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');

        if (!fs.existsSync(presentationJsonPath)) {
            console.error('❌ presentation.json not found at:', presentationJsonPath);
            return;
        }

        const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
        const slides = JSON.parse(rawData);

        if (!Array.isArray(slides)) {
            console.error('❌ presentation.json is not an array.');
            return;
        }

        const codeSlides = slides.filter(slide => slide.type === 'code' && slide.codeblock);
        console.log(`📸 Found ${codeSlides.length} code slide(s) to render locally.\n`);

        if (codeSlides.length === 0) {
            console.log("No code slides to process.");
            return;
        }

        // Default test options (Renders with gradient background)
        const options = {
            theme: config.defaultTheme,
            font: config.defaultFont,
            omitBackground: false 
        };

        console.log(`Config: Theme=${options.theme}, Font=${options.font}, OmitBackground=${options.omitBackground}\n`);

        let count = 0;
        for (const slide of codeSlides) {
            try {
                console.log(`Rendering Slide ${slide.slide_number} (${slide.title || 'Untitled'})...`);
                const outputPath = await generateCodeSnippet(slide, options);
                console.log(`✅ Saved locally: ${outputPath}`);
                count++;
            } catch (err) {
                console.error(`❌ Failed to render slide ${slide.slide_number}:`, err.message);
            }
        }

        console.log(`\n🎉 Completed! Generated ${count}/${codeSlides.length} snippet images locally.`);
        console.log(`Preview folder: ${path.resolve(process.cwd(), config.output.directory)}`);

    } catch (error) {
        console.error('❌ Local generator failed:', error.message);
    }
}

main();
