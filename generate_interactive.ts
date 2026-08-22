import { generateAllSnippets } from './Presentation/utils/generate_code_snippet.js';
import config from './Presentation/config/snippet_config.js';
import { selectOption, askQuestion } from './Presentation/utils/interaction.js';

(async () => {
    try {
        console.log('🚀 Starting Code Snippet Generator...');

        // Select Theme
        const selectedThemeKey = await selectOption('Select Theme:', config.themes);
        const theme = selectedThemeKey || config.defaultTheme;
        console.log(`Selected Theme: ${config.themes[theme].name}`);

        // Select Font
        const selectedFontKey = await selectOption('Select Font:', config.fonts);
        const font = selectedFontKey || config.defaultFont;
        console.log(`Selected Font: ${config.fonts[font].name}`);

        // Select Background Preference
        const withTransparent = await askQuestion('Do You Want with Transparent Background:');

        const omitBackground = withTransparent;
        console.log(`Transparent: ${omitBackground ? 'Yes' : 'No (Background)'}`);

        // Generate Snippets
        console.log('\nGenerating snippets with selected options...');
        await generateAllSnippets({ theme, font, omitBackground });

    } catch (error) {
        console.error('Error:', error);
    }
})();
