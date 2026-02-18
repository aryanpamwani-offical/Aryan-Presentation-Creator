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
    // We update {{CONTAINER_CLASS}} based on omitBackground
    const omitBackground = options.omitBackground !== undefined ? options.omitBackground : config.screenshot.omitBackground;

    let containerClass = "";
    if (!omitBackground) {
        // Add padding to show the background gradient
        containerClass = `${themeObj.background} p-12 rounded-xl`;
    } else {
        // Transparent mode: Minimal padding/margin
        containerClass = "p-1 bg-transparent";
    }

    html = html.replace('{{CONTAINER_CLASS}}', containerClass);

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
 * Helper to retry a function
 */
async function retryOperation(operation, updatedParams = [], retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await operation(...updatedParams);
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`⚠️ Operation failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error.message);
            await new Promise(res => setTimeout(res, delay));
        }
    }
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

        // Set content with strict timeout to prevent hanging
        try {
            await page.setContent(html, {
                waitUntil: 'networkidle0', // 'domcontentloaded' might be faster but networkidle0 ensures font/tailwind load
                timeout: 30000 // 30s timeout
            });
        } catch (e) {
            console.warn(`⚠️ Page load timeout for slide ${snippet.slide_number}, trying to proceed anyway...`);
        }

        // Wait for fonts to load explicitly
        try {
            await page.evaluateHandle('document.fonts.ready');
        } catch (e) {
            // Ignore if it times out, might be fine
        }

        // Give extra time for rendering (short buffer)
        await new Promise(resolve => setTimeout(resolve, 500));

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

        // --- OPTIMIZATION: Identify slides that actually need updates FIRST ---
        const slidesToUpdate = codeSlides.filter(slide => {
            // If manual override or missing URL, we need to update
            if (!slide.imageUrl || (!slide.imageUrl.includes('drive.google.com') && !slide.imageUrl.startsWith('http'))) {
                return true;
            }
            return false;
        });

        if (slidesToUpdate.length === 0) {
            console.log("\n✅ All code snippets already have valid URLs. Skipping generation.");
            return; // EXIT EARLY - NO BROWSER LAUNCH
        }

        console.log(`\n⚡ ${slidesToUpdate.length} slide(s) need updated snippets. Launching browser...`);


        // Authenticate Google Drive
        let authClient;
        try {
            authClient = await AuthWithGoogle();
        } catch (e) {
            console.error("❌ Failed to authenticate with Google:", e);
            // We might still want to generate local images even if auth fails
        }

        // Launch browser once for all slides
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let updatedCount = 0;
        const CONCURRENCY_LIMIT = 5;

        // Save helper
        const saveProgress = () => {
            const saveSuccess = saveJSONFile(JSON.stringify(slides, null, 4));
            if (saveSuccess) {
                // console.log("💾 presentation.json updated.");
            } else {
                console.error("❌ Failed to save presentation.json progress.");
            }
        };

        // Helper to process a single slide
        const processSlide = async (slide) => {
            // Double check (though we filtered already, good for robustness if we change logic later)
            if (slide.imageUrl && (slide.imageUrl.includes('drive.google.com') || slide.imageUrl.startsWith('http'))) {
                // Should not happen for slidesToUpdate but safe to keep
                return false;
            }

            try {
                console.log(`Processing slide ${slide.slide_number}...`);

                // Generate local image (with timeout protection via generateCodeSnippet)
                const imagePath = await generateCodeSnippet(slide, options, browser);
                slide.image = imagePath;

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
                        const compressedPath = await resizeAndSaveImage(imagePath, tempDir, 'SkipResize');
                        if (compressedPath) {
                            uploadPath = compressedPath;
                        }
                    } catch (compErr) {
                        console.warn("Compression failed, using original:", compErr.message);
                    }

                    // Upload with Retry
                    console.log(`Uploading ${path.basename(uploadPath)}...`);
                    const imageUrl = await retryOperation(uploadImageToDrive, [authClient, uploadPath], 3, 2000);

                    if (imageUrl) {
                        console.log(`☁ Uploaded: ${imageUrl}`);
                        slide.imageUrl = imageUrl;

                        // Cleanup temp files
                        try {
                            if (uploadPath !== imagePath && fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
                            if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                        } catch (cleanupErr) {
                            // ignore
                        }

                        return true; // Updated
                    } else {
                        console.warn(`⚠️ Upload returned no URL for slide ${slide.slide_number}`);
                    }
                } else {
                    console.warn("Skipping upload (No Auth)");
                }
            } catch (err) {
                console.error(`❌ Failed to process slide ${slide.slide_number}:`, err.message);
            }
            return false;
        };

        // Batch Processing - ONLY operate on slidesToUpdate
        for (let i = 0; i < slidesToUpdate.length; i += CONCURRENCY_LIMIT) {
            const batch = slidesToUpdate.slice(i, i + CONCURRENCY_LIMIT);
            console.log(`\n--- Processing Batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(slidesToUpdate.length / CONCURRENCY_LIMIT)} ---`);

            // Run batch in parallel
            const results = await Promise.all(batch.map(slide => processSlide(slide)));

            // Check if any updates in this batch
            if (results.some(r => r)) {
                updatedCount += results.filter(r => r).length;
                saveProgress(); // Incremental save after batch
                console.log("💾 Batch progress saved.");
            }
        }

        if (updatedCount > 0) {
            console.log(`\n✨ Successfully updated ${updatedCount} code snippet(s)!`);
        } else {
            console.log("\n✅ No new updates required.");
        }

    } catch (error) {
        console.error('❌ Error in generateAllSnippets:', error);
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
