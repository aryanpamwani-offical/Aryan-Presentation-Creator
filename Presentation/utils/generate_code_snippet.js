import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import hljs from 'highlight.js';
import config from '../config/snippet_config.js';
import saveJSONFile from '../ai-core/saveJSONFile.js';
import AuthWithGoogle from '../config/auth/google-oauth.js';
import uploadImageToDrive from '../config/drive/google_drive.js';
import resizeAndSaveImage from './image_compress_utils.js';

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

        // Initial large viewport to allow rendering
        await page.setViewport({ width: 1600, height: 1600, deviceScaleFactor: 2 });

        // Set content and wait for network idle (scripts loaded)
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 0
        });
        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');

        // Give extra time for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get the bounding box of the snippet container dynamically
        const dimensions = await page.evaluate(() => {
            const container = document.querySelector('.snippet-container');
            if (!container) return null;

            // Allow container to fit content naturally
            container.style.width = 'fit-content';
            container.style.height = 'fit-content';

            const rect = container.getBoundingClientRect();
            return {
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height)
            };
        });

        if (!dimensions) {
            throw new Error('Snippet container not found');
        }

        // Resize viewport to match content exactly
        await page.setViewport({
            width: dimensions.width,
            height: dimensions.height,
            deviceScaleFactor: 2 // High res
        });

        const element = await page.$('.snippet-container');

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

        console.log(`✓ Generated: ${fileName} (${dimensions.width}x${dimensions.height})`);
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
 * Main function to generate all code snippets from presentation.json, compress, and upload to Google Drive.
 */
async function generateAllSnippets(options = {}) {
    let browser;
    try {
        const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');

        if (!fs.existsSync(presentationJsonPath)) {
            console.error('❌ presentation.json not found!', presentationJsonPath);
            return;
        }

        const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
        let slides = JSON.parse(rawData);

        if (!Array.isArray(slides)) {
            console.error('❌ presentation.json is not an array!');
            return;
        }

        // Filter for code slides
        const codeSlides = slides.filter(slide => slide.type === 'code' && slide.codeblock);

        console.log(`\n📸 Found ${codeSlides.length} code slide(s) in presentation.json\n`);

        if (codeSlides.length === 0) {
            console.log("No code slides to process.");
            return;
        }

        // Authenticate Google Drive
        let authClient;
        try {
            authClient = await AuthWithGoogle();
        } catch (e) {
            console.error("❌ Failed to authenticate with Google:", e);
            // Fallback or exit? If upload is required, exit.
            // But lets try to generate locally at least.
        }

        // Launch browser once
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let updatedCount = 0;

        for (const slide of slides) {
            if (slide.type === 'code' && slide.codeblock) {
                try {
                    console.log(`Processing slide ${slide.slide_number}...`);

                    // Generate local image
                    const imagePath = await generateCodeSnippet(slide, options, browser);
                    slide.image = imagePath; // Update presentation.json with absolute path (fallback)

                    // Upload logic
                    if (authClient) {
                        // Compress image
                        const baseImageDir = path.dirname(imagePath);
                        const tempDir = path.join(baseImageDir, 'temp_storage');
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }

                        let uploadPath = imagePath;
                        try {
                            // Just compress, don't resize (keep dynamic dimensions)
                            const compressedPath = await resizeAndSaveImage(imagePath, tempDir, 'SkipResize'); // We'll handle 'SkipResize' in utils or just assume it defaults
                            if (compressedPath) {
                                console.log(`Using compressed image: ${path.basename(compressedPath)}`);
                                uploadPath = compressedPath;
                            }
                        } catch (compErr) {
                            console.warn("Compression failed, using original:", compErr.message);
                        }

                        console.log(`Uploading ${path.basename(uploadPath)} to Drive...`);
                        const imageUrl = await uploadImageToDrive(authClient, uploadPath);

                        if (imageUrl) {
                            console.log(`☁ Uploaded: ${imageUrl}`);
                            slide.imageUrl = imageUrl;

                            // Cleanup: Delete the compressed temp file
                            if (uploadPath && fs.existsSync(uploadPath)) {
                                try {
                                    fs.unlinkSync(uploadPath);
                                    console.log(`Deleted temp file: ${path.basename(uploadPath)}`);
                                } catch (e) {
                                    console.warn(`Failed to delete temp file ${path.basename(uploadPath)}:`, e.message);
                                }
                            }

                            // Cleanup: Delete the original generated file in code_snippets
                            if (imagePath && fs.existsSync(imagePath)) {
                                try {
                                    fs.unlinkSync(imagePath);
                                    console.log(`Deleted local file: ${path.basename(imagePath)}`);
                                } catch (e) {
                                    console.warn(`Failed to delete local file ${path.basename(imagePath)}:`, e.message);
                                }
                            }

                        } else {
                            console.warn("Failed to get imageUrl from upload.");
                        }

                        // Cleanup temp compressed file
                        if (uploadPath !== imagePath && fs.existsSync(uploadPath)) {
                            // fs.unlinkSync(uploadPath); // strict cleanup might be safer later
                        }

                    } else {
                        console.warn("Skipping upload due to auth failure.");
                    }

                    updatedCount++;
                } catch (err) {
                    console.error(`Failed to handle slide ${slide.slide_number}`, err);
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`\n✨ Successfully processed ${updatedCount} code snippet(s)!`);
            // Save updated presentation.json
            const saveSuccess = saveJSONFile(JSON.stringify(slides, null, 4));
            if (saveSuccess) {
                console.log("✅ Updated presentation.json saved successfully.");
            } else {
                console.error("❌ Failed to save updated presentation.json.");
            }

        } else {
            console.log("\nNo changes made.");
        }

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
