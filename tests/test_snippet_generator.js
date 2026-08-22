import { generateAllSnippets } from '../Presentation/utils/generate_code_snippet.js';
import config from '../Presentation/config/snippet_config.js';
import readline from 'readline';

async function selectOption(promptText, options) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const optionsList = Object.keys(options);

    console.log(`\n${promptText}`);
    optionsList.forEach((key, index) => {
        const option = options[key];
        console.log(`${index + 1}. ${option.name || key}`);
    });

    return new Promise((resolve) => {
        rl.question(`\nSelect an option (1-${optionsList.length}): `, (answer) => {
            rl.close();
            const selectedIndex = parseInt(answer) - 1;
            if (selectedIndex >= 0 && selectedIndex < optionsList.length) {
                resolve(optionsList[selectedIndex]);
            } else {
                console.log('Invalid selection. Using default.');
                resolve(null);
            }
        });
    });
}

console.log('🚀 Testing Code Snippet Generator\n');
console.log('This will generate code snippets from presentation.json...\n');

try {
    // Select Theme
    const selectedThemeKey = await selectOption('Select Theme:', config.themes);
    const theme = selectedThemeKey || config.defaultTheme;
    console.log(`\n✅ Selected Theme: ${config.themes[theme].name}`);

    // Select Font
    const selectedFontKey = await selectOption('Select Font:', config.fonts);
    const font = selectedFontKey || config.defaultFont;
    console.log(`✅ Selected Font: ${config.fonts[font].name}`);

    // Select Background Preference
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const withBackground = await new Promise((resolve) => {
        rl.question('\nDo You Want with Transparent Background: (Y/N): ', (answer) => {
            rl.close();
            // If Y/y, user WANTS transparent background -> omitBackground = true
            // If N/n, user wants background -> omitBackground = false
            const isYes = answer.trim().toLowerCase() === 'y';
            resolve(isYes); // withTransparent = true
        });
    });

    const omitBackground = withBackground; // withBackground variable name is confusing, it holds "isTransparent"
    console.log(`✅ Transparent : ${omitBackground ? 'Yes' : 'No (Background)'}`);

    console.log('\nGenerating snippets with selected options...');
    await generateAllSnippets({ theme, font, omitBackground });

} catch (error) {
    console.error('Test failed:', error);
}
