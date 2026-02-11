import { selectOption, askQuestion } from "../utils/interaction.js";
import config from "../config/snippet_config.js";
import { generateAllSnippets } from "../utils/generate_code_snippet.js";

/**
 * Handles the interactive generation of code snippets.
 * Updates presentation.json directly via generateAllSnippets.
 * 
 * @returns {Promise<void>}
 */
export const manageCodeSnippets = async () => {
    // --- Interactive Code Snippet Generation ---
    console.log('\n--- Code Snippet Configuration ---');
    const shouldGenerateSnippets = await askQuestion('Do you want to generate/update code snippets?');

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

        // Generate Snippets (updates presentation.json on disk)
        await generateAllSnippets({
            theme,
            font,
            omitBackground
        });
    } else {
        console.log('Skipping code snippet generation.');
    }
};

