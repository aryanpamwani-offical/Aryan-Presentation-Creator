import fs from 'fs';
import path from 'path';
import { generateAllSnippets } from './Presentation/utils/generate_code_snippet.js';
import config from './Presentation/config/snippet_config.js';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import open from 'open';
import { selectOption, askQuestion } from './Presentation/utils/interaction.js';

// ... (keep authentication and drive upload logic if needed, but for now focusing on CLI)
// Actually, I'll keep the structure but add the CLI part at the beginning.

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// ... (Function to upload to drive would be here, but let's focus on the interactive part)

// Main execution
(async () => {
    try {
        // Only run interactive mode if flag is present or argument is passed, OR just always run it for this script
        // The user specifically wants interaction "It must ask me..."

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

        // ... (Upload to Drive logic would follow here if configured)

    } catch (error) {
        console.error('Error:', error);
    }
})();
