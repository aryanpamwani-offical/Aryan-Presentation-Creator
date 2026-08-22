import fs from 'fs';
import path from 'path';

/**
 * Handles the interactive generation of code snippets.
 * Updates presentation.json directly via generateAllSnippets.
 * 
 * @returns {Promise<void>}
 */
export const manageCodeSnippets = async () => {
    // Check for interactive flag
    const isInteractive = process.argv.includes('--interactive');

    let theme = 'candy';
    let font = 'firaCode';
    let omitBackground = true;
    let shouldGenerate = true;

    // Pre-check optimization: Check if presentation.json exists and all code slides already have valid URLs
    const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
    if (fs.existsSync(presentationJsonPath)) {
        try {
            const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
            const slides = JSON.parse(rawData);
            if (Array.isArray(slides)) {
                const codeSlides = slides.filter(slide => slide.type === 'code' && slide.codeblock);
                
                // Fast check to see if any cached image URLs are dead (404)
                const checkPromises = codeSlides
                    .filter(slide => slide.imageUrl && slide.imageUrl.startsWith('http'))
                    .map(async (slide) => {
                        try {
                            const res = await fetch(slide.imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
                            if (res.status === 404) {
                                slide.imageUrl = null; // Mark for regeneration
                            }
                        } catch (_) {}
                    });
                await Promise.all(checkPromises);

                const needsUpdate = codeSlides.some(slide => !slide.imageUrl || (!slide.imageUrl.startsWith('http') && !slide.imageUrl.includes('drive.google.com')));
                if (!needsUpdate && !isInteractive) {
                    console.log('✅ All code snippets already have valid URLs. Skipping snippet generation step.');
                    return;
                }
            }
        } catch (e) {
            console.warn('Could not pre-parse presentation.json, proceeding with default generator.');
        }
    }

    if (isInteractive) {
        const { selectOption, askQuestion } = await import("../utils/interaction.js");
        const { default: config } = await import("../config/snippet_config.js");
        console.log('\n--- Code Snippet Configuration ---');
        shouldGenerate = await askQuestion('Do you want to generate/update code snippets?');

        if (shouldGenerate) {
            // Interactive Selection
            const selectedThemeKey = await selectOption('Select Theme:', config.themes);
            theme = selectedThemeKey || config.defaultTheme;
            console.log(`Selected Theme: ${config.themes[theme].name}`);

            const selectedFontKey = await selectOption('Select Font:', config.fonts);
            font = selectedFontKey || config.defaultFont;
            console.log(`Selected Font: ${config.fonts[font].name}`);

            const withTransparent = await askQuestion('Do You Want with Transparent Background:');
            omitBackground = withTransparent;
        }
    } else {
        console.log('Running with default snippet settings (Candy, Fira Code, Transparent). Use --interactive to change.');
    }

    if (shouldGenerate) {
        const { generateAllSnippets } = await import("../utils/generate_code_snippet.js");
        await generateAllSnippets({
            theme,
            font,
            omitBackground
        });
    } else {
        console.log('Skipping code snippet generation.');
    }
};
