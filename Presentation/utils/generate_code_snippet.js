import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import hljs from 'highlight.js';
import config from '../config/snippet_config.js';

/**
 * Detects the programming language from code content
 * @param {string} code - The code to analyze
 * @param {string} explicitLanguage - Explicitly provided language (takes precedence)
 * @returns {string} Detected language
 */
function detectLanguage(code, explicitLanguage = null) {
    if (explicitLanguage) {
        return explicitLanguage.toLowerCase();
    }

    const trimmedCode = code.trim().toLowerCase();

    // Check patterns
    for (const [pattern, language] of Object.entries(config.languagePatterns)) {
        if (trimmedCode.startsWith(pattern.toLowerCase())) {
            return language;
        }
    }

    return config.defaultLanguage;
}

/**
 * Generates HTML from template with replacements
 * @param {object} snippet - Snippet data
 * @returns {string} Generated HTML
 */
function generateHTML(snippet, options = {}) {
    const templatePath = path.resolve(process.cwd(), 'Presentation', 'templates', 'code_snippet_template.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Default options from config if not provided
    const themeKey = options.theme || config.defaultTheme;
    const fontKey = options.font || config.defaultFont;

    const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];
    const fontObj = config.fonts[fontKey] || config.fonts[config.defaultFont];

    // Server-side syntax highlighting with highlight.js
    let highlightedCode;
    const language = detectLanguage(snippet.codeblock, snippet.language);
    const title = snippet.title || '';

    // Check if we should use auto-detection or specific language
    const validLanguage = hljs.getLanguage(language);

    if (validLanguage) {
        try {
            highlightedCode = hljs.highlight(snippet.codeblock, { language: language }).value;
        } catch (e) {
            console.warn(`Failed to highlight with language ${language}, falling back to auto`);
            const result = hljs.highlightAuto(snippet.codeblock);
            highlightedCode = result.value;
        }
    } else {
        // Auto-detect if language is invalid or default
        const result = hljs.highlightAuto(snippet.codeblock);
        highlightedCode = result.value;
    }

    // Inject Tailwind CDN for gradients
    const tailwindCDN = '<script src="https://cdn.tailwindcss.com"></script>';
    html = html.replace('</head>', `${tailwindCDN}\n</head>`);

    // Inject Font CSS
    const fontLink = `<link href="${fontObj.src}" rel="stylesheet">`;
    html = html.replace('</head>', `${fontLink}\n</head>`);

    // Inject Hightlight.js Theme CSS
    const themeLink = `<link rel="stylesheet" href="${themeObj.theme}">`;
    html = html.replace('</head>', `${themeLink}\n</head>`);

    // Replace placeholders
    html = html.replace(/\{\{THEME\}\}/g, themeKey);
    // Note: We don't need {{LANGUAGE}} anymore since we inject highlighted code directly
    // But we might want to keep the class in the wrapper if needed for CSS
    // The highlightedCode already contains spans with classes.
    html = html.replace(/\{\{CODE\}\}/g, highlightedCode);

    // We also need to remove the <pre><code ...> wrapper from the template or adjust here.
    // The current template has: <pre><code class="language-{{LANGUAGE}}">{{CODE}}</code></pre>
    // hljs.highlight returns just the inner HTML of the code block. 
    // So we just need to replace {{LANGUAGE}} with the detected/used language_name

    const usedLanguage = validLanguage ? language : 'plaintext'; // simplified
    html = html.replace(/\{\{LANGUAGE\}\}/g, usedLanguage);

    // Apply Font Family
    html = html.replace('<style>', `<style>\n    code, pre { font-family: ${fontObj.fontFamily} !important; }\n`);


    // Apply Background Gradient to Container
    // We need to inject the background class into the snippet-container
    // If omitBackground is true, we should NOT apply the background gradient
    const omitBackground = options.omitBackground !== undefined ? options.omitBackground : config.screenshot.omitBackground;

    if (!omitBackground) {
        html = html.replace('class="snippet-container"', `class="snippet-container ${themeObj.background}"`);
    } else {
        // Ensure no background is applied if transparent is requested
        // The default class is just 'snippet-container', so we don't need to add anything.
        // But if there's a default background in CSS, we might need to override it.
        // Assuming .snippet-container has no background by default or it's transparent.
        // If we need to force transparent: style="background: transparent;"
        html = html.replace('class="snippet-container"', `class="snippet-container" style="background: transparent;"`);
    }

    // Handle conditional title
    if (title) {
        html = html.replace(/\{\{#if TITLE\}\}/g, '');
        html = html.replace(/\{\{\/if\}\}/g, '');
        html = html.replace(/\{\{TITLE\}\}/g, title);
    } else {
        html = html.replace(/\{\{#if TITLE\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    return html;
}

/**
 * Generates a code snippet image using Puppeteer
 * @param {object} snippet - Snippet data with codeblock, slide_number, etc.
 * @returns {Promise<string>} Path to generated image
 */
async function generateCodeSnippet(snippet, options = {}, browserInstance = null) {
    // Generate HTML content first
    let html = generateHTML(snippet, options);

    // Read CSS content
    const cssPath = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Inject CSS into HTML
    html = html.replace('<link rel="stylesheet" href="./snippet_styles.css">', `<style>${cssContent}</style>`);

    let browser = browserInstance;
    let ownBrowser = false;

    if (!browser) {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        ownBrowser = true;
    }

    let page;

    try {
        page = await browser.newPage();

        // Set viewport
        await page.setViewport(config.viewport);

        // Set content and wait for network idle (scripts loaded)
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 0
        });
        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');

        // Give extra time for rendering (reduced for performance, but kept safe)
        await new Promise(resolve => setTimeout(resolve, 100));


        // Get the bounding box of the snippet container
        const element = await page.$('.snippet-container');

        if (!element) {
            throw new Error('Snippet container not found');
        }

        // Prepare output path
        const outputDir = path.resolve(process.cwd(), config.output.directory);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `slide-${snippet.slide_number}.png`;
        const outputPath = path.join(outputDir, fileName);

        // Take screenshot
        const omitBackground = options.omitBackground !== undefined ? options.omitBackground : config.screenshot.omitBackground;
        await element.screenshot({
            path: outputPath,
            omitBackground: omitBackground,
            type: config.output.format
        });

        console.log(`✓ Generated: ${fileName}`);
        return outputPath;

    } catch (error) {
        console.error(`Error generating snippet for slide ${snippet.slide_number}:`, error);
        throw error;
    } finally {
        if (page) await page.close();
        if (ownBrowser && browser) await browser.close();
    }
}


/**
 * Main function to generate all code snippets from code.json
 */
async function generateAllSnippets(options = {}) {
    let browser;
    try {
        const codeJsonPath = path.resolve(process.cwd(), 'code.json');

        if (!fs.existsSync(codeJsonPath)) {
            console.error('❌ code.json not found!');
            return;
        }

        const rawData = fs.readFileSync(codeJsonPath, 'utf8');
        let codeBlocks = JSON.parse(rawData);

        if (!Array.isArray(codeBlocks)) {
            codeBlocks = [codeBlocks];
        }

        console.log(`\n📸 Generating ${codeBlocks.length} code snippet(s)...\n`);

        // Launch browser once
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const block of codeBlocks) {
            if (!block.slide_number) {
                console.warn(`⚠ Skipping block: No slide_number found.`);
                continue;
            }

            await generateCodeSnippet(block, options, browser);
        }

        console.log(`\n✨ Successfully generated ${codeBlocks.length} code snippet(s)!\n`);

    } catch (error) {
        console.error('❌ Error in generateAllSnippets:', error);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
}

// Export functions
export { generateCodeSnippet, generateAllSnippets, detectLanguage };

// Run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    generateAllSnippets();
}
