import { selectOption, askQuestion } from "../utils/interaction.js";
import config from "../config/snippet_config.js";


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
    let shouldGenerate = true; // Default to true for non-interactive? User said "runs this method optimize it even after not selecting to run ai core but still runs". 
    // Wait, the user said "It takes time run this method optimize it even after not selecting to run ai core but still runs".
    // And "Also add the default conditon where there's no interractive mode in the terminal... These are my default condition util I give the flag in the command"
    // This implies they WANT it to run by default with these settings, without asking.

    if (isInteractive) {
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
        // Generate Snippets (updates presentation.json on disk)
        // Dynamic import to save startup time if we were to skip it (though now we default to run)
        // But it still helps if we add a --skip-snippets flag later or if logic changes.
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

