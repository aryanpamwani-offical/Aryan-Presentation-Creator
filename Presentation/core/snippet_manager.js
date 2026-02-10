import { selectOption, askQuestion } from "../utils/interaction.js";
import config from "../config/snippet_config.js";
import uploadCodeSnippets from "../utils/upload_code_snippets.js";

/**
 * Handles the interactive generation and uploading of code snippets,
 * and updates the slides data with the new image URLs.
 * 
 * @param {Array} slidesData - The array of slide objects to update.
 * @returns {Promise<void>}
 */
export const manageCodeSnippets = async (slidesData) => {
    // --- Interactive Code Snippet Generation & Upload ---
    console.log('\n--- Code Snippet Configuration ---');
    const shouldGenerateSnippets = await askQuestion('Do you want to generate/update code snippets?');

    let snippetMap = {};

    if (shouldGenerateSnippets) {
        // Interactive Selection
        const selectedThemeKey = await selectOption('Select Theme:', config.themes);
        const theme = selectedThemeKey || config.defaultTheme;
        console.log(`Selected Theme: ${config.themes[theme].name}`);

        const selectedFontKey = await selectOption('Select Font:', config.fonts);
        const font = selectedFontKey || config.defaultFont;
        console.log(`Selected Font: ${config.fonts[font].name}`);

        const withTransparent = await askQuestion('Do You Want with Transparent Background:');
        const omitBackground = withTransparent;

        // Generate & Upload
        snippetMap = await uploadCodeSnippets({
            regenerate: true,
            theme,
            font,
            omitBackground
        });
    } else {
        // Just upload whatever is there if needed
        console.log('Using existing snippets (if any)...');
        snippetMap = await uploadCodeSnippets({ regenerate: false });
    }

    // --- Update slidesData with new URLs ---
    for (const [index, slide] of slidesData.entries()) {
        // slide_number is 1-based index (i + 1)
        const slideNumber = index + 1;
        const imageUrl = snippetMap[slideNumber];

        if (imageUrl) {
            console.log(`Updating slide ${slideNumber} image to: ${imageUrl}`);
            slide.image = imageUrl;
            // Also update localImagePath/imageUrl just in case other builders usage differs
            slide.imageUrl = imageUrl;
        }
    }
};
