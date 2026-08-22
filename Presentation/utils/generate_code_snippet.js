import fs from 'fs';
import path from 'path';
import https from 'https';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { parse } from 'node-html-parser';
import juice from 'juice';
import hljs from 'highlight.js';
import config from '../config/snippet_config.js';
import saveJSONFile from '../ai-core/saveJSONFile.js';
import AuthWithGoogle from '../config/auth/google-oauth.js';
import uploadImageToDrive from '../config/drive/google_drive.js';
import resizeAndSaveImage from './image_helper.js';
import { renderWithWorkerPool } from './snippet_worker_pool.js';

const TAILWIND_LOCAL_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'tailwind.min.js');
const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');

const GRADIENTS = {
    hyper: 'linear-gradient(to bottom right, #d946ef, #dc2626, #fb923c)',
    oceanic: 'linear-gradient(to bottom right, #86efac, #3b82f6, #9333ea)',
    candy: 'linear-gradient(to bottom right, #fbcfe8, #d8b4fe, #818cf8)',
    sublime: 'linear-gradient(to bottom right, #fb7185, #d946ef, #6366f1)',
    horizon: 'linear-gradient(to bottom right, #f97316, #fde047)',
    coral: 'linear-gradient(to bottom right, #60a5fa, #34d399)',
    peach: 'linear-gradient(to bottom right, #fb7185, #fdba74)',
    flamingo: 'linear-gradient(to bottom right, #f472b6, #db2777)',
    gotham: 'linear-gradient(to bottom right, #374151, #111827, #000000)',
    ice: 'linear-gradient(to bottom right, #ffe4e6, #ccfbf1)'
};

// ── Module-level caches (populated once, reused across all slides) ────────────
let _fontBuffer = null;          // font.ttf binary
let _templateHtml = null;        // code_snippet_template.html content
let _snippetCss = null;          // snippet_styles.css content
const _themeCssCache = new Map();// highlight.js theme CSS, keyed by themeKey

function getCachedFont() {
    if (!_fontBuffer) _fontBuffer = fs.readFileSync(FONT_PATH);
    return _fontBuffer;
}

function getCachedTemplate() {
    if (!_templateHtml) {
        const templatePath = path.resolve(process.cwd(), 'Presentation', 'templates', 'code_snippet_template.html');
        _templateHtml = fs.readFileSync(templatePath, 'utf8');
    }
    return _templateHtml;
}

function getCachedCss() {
    if (!_snippetCss) {
        const cssPath = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');
        _snippetCss = fs.readFileSync(cssPath, 'utf8');
    }
    return _snippetCss;
}

async function getCachedThemeCss(themeObj, themeKey) {
    if (_themeCssCache.has(themeKey)) return _themeCssCache.get(themeKey);

    let themeCss = '';
    try {
        if (themeObj.theme.includes('styles/')) {
            const relativePath = themeObj.theme.split('styles/')[1];
            const localPath = path.resolve(process.cwd(), 'node_modules', 'highlight.js', 'styles', relativePath.replace('.min.css', '.css'));
            if (fs.existsSync(localPath)) {
                themeCss = fs.readFileSync(localPath, 'utf8');
            }
        }
    } catch (e) {
        console.warn('⚠️ Failed to load local highlight theme CSS:', e.message);
    }

    if (!themeCss) {
        try {
            const res = await fetch(themeObj.theme);
            themeCss = await res.text();
        } catch (e) {
            console.warn('⚠️ Failed to fetch highlight theme CSS online.');
        }
    }

    _themeCssCache.set(themeKey, themeCss);
    return themeCss;
}

// Function to pre-download Tailwind (handles redirects)
export const downloadTailwindIfNeeded = async () => {
    if (fs.existsSync(TAILWIND_LOCAL_PATH)) {
        return;
    }
    console.log('📥 Downloading Tailwind CDN script locally for offline rendering...');
    
    if (typeof Bun !== 'undefined') {
        try {
            const res = await fetch('https://cdn.tailwindcss.com');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            await Bun.write(TAILWIND_LOCAL_PATH, res);
            console.log('✅ Saved tailwind.min.js locally using Bun.');
            return;
        } catch (e) {
            console.warn('⚠️ Bun fetch failed, falling back to Node.js downloader...', e.message);
        }
    }

    const download = (url) => {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const nextUrl = res.headers.location.startsWith('http') 
                        ? res.headers.location 
                        : new URL(res.headers.location, url).toString();
                    download(nextUrl).then(resolve).catch(reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download Tailwind: ${res.statusCode}`));
                    return;
                }
                const fileStream = fs.createWriteStream(TAILWIND_LOCAL_PATH);
                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log('✅ Saved tailwind.min.js locally.');
                    resolve();
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    };
    return download('https://cdn.tailwindcss.com');
};

// Function to pre-download Font (handles redirects)
export const downloadFontIfNeeded = async () => {
    if (fs.existsSync(FONT_PATH)) {
        return;
    }
    console.log('📥 Downloading JetBrains Mono font locally for offline Satori rendering...');
    if (typeof Bun !== 'undefined') {
        try {
            const res = await fetch('https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            await Bun.write(FONT_PATH, res);
            console.log('✅ Saved font.ttf locally using Bun.');
            return;
        } catch (e) {
            console.warn('⚠️ Bun font fetch failed, falling back to Node.js downloader...', e.message);
        }
    }
    return new Promise((resolve, reject) => {
        https.get('https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf', (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download Font: ${res.statusCode}`));
                return;
            }
            const fileStream = fs.createWriteStream(FONT_PATH);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log('✅ Saved font.ttf locally.');
                resolve();
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

/**
 * Detects the programming language from code content
 */
function detectLanguage(code, explicitLanguage = null) {
    if (explicitLanguage) {
        return explicitLanguage.toLowerCase();
    }

    const trimmedCode = code.trim().toLowerCase();

    // Smart detection for HTML
    if (trimmedCode.includes('<!doctype html>') || 
        trimmedCode.includes('<html') || 
        trimmedCode.includes('<div') || 
        trimmedCode.includes('<span') || 
        trimmedCode.includes('<style') ||
        trimmedCode.includes('</style>') ||
        trimmedCode.includes('</div>')) {
        return 'html';
    }

    // Smart detection for CSS
    if (trimmedCode.includes('display:') || 
        trimmedCode.includes('color:') || 
        trimmedCode.includes('background-color:') || 
        trimmedCode.includes('margin:') || 
        trimmedCode.includes('padding:')) {
        return 'css';
    }

    // Check patterns
    for (const [pattern, language] of Object.entries(config.languagePatterns)) {
        if (trimmedCode.startsWith(pattern.toLowerCase())) {
            return language;
        }
    }

    return config.defaultLanguage;
}

/**
 * Parses HTML string into Satori-compatible VNode structure
 */
function htmlToSatori(htmlString) {
    const root = parse(htmlString.trim(), {
        blockTextElements: {
            script: true,
            noscript: true,
            style: true
        }
    });
    
    function parseNode(node, inCode = false) {
        if (node.nodeType === 3) {
            return inCode ? node.textContent : node.textContent.trim().replace(/\s+/g, ' ');
        }
        
        if (node.nodeType === 1) {
            let type = node.tagName.toLowerCase();
            const props = {};
            
            const isCodeElement = type === 'pre' || type === 'code' || node.attributes.class?.includes('code-line');
            const nextInCode = inCode || isCodeElement;
            
            // Map pre and code tags to div for Satori layout compliance
            if (type === 'pre' || type === 'code') {
                type = 'div';
            }
            
            for (const [key, val] of Object.entries(node.attributes)) {
                if (key === 'class') {
                    props.className = val;
                } else if (key === 'style') {
                    const styleObj = {};
                    val.split(';').forEach(styleRule => {
                        const parts = styleRule.split(':');
                        if (parts.length >= 2) {
                            const styleKey = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            styleObj[styleKey] = parts.slice(1).join(':').trim();
                        }
                    });
                    props.style = styleObj;
                } else {
                    props[key] = val;
                }
            }
            
            // Enforce display: flex on all div wrappers with children to satisfy Satori
            if (type === 'div') {
                props.style = props.style || {};
                if (!props.style.display) {
                    props.style.display = 'flex';
                    props.style.flexDirection = 'column';
                }
            }
            
            const children = node.childNodes
                .map(child => parseNode(child, nextInCode))
                .filter(child => {
                    if (typeof child === 'string') {
                        if (nextInCode) return true;
                        return child.trim().length > 0;
                    }
                    return !!child;
                });
                
            if (children.length > 0) {
                props.children = children.length === 1 ? children[0] : children;
            }
            
            return { type, props };
        }
        
        return null;
    }
    
    const container = root.querySelector('.snippet-container');
    if (container) {
        return parseNode(container);
    }
    for (const child of root.childNodes) {
        if (child.nodeType === 1) {
            return parseNode(child);
        }
    }
    return null;
}

/**
 * Generates inline-styled HTML markup using highlight.js and juice
 */
async function generateInlinedHTML(snippet, options = {}) {
    const themeKey = options.theme || config.defaultTheme;
    const fontKey = options.font || config.defaultFont;

    const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];
    const fontObj = config.fonts[fontKey] || config.fonts[config.defaultFont];

    // Load templates and styles from cache (read once, reused per slide)
    let htmlContent = getCachedTemplate();
    const cssContent = getCachedCss();

    // Highlight code using Highlight.js
    let highlightedCode;
    const language = detectLanguage(snippet.codeblock, snippet.language);
    const title = snippet.title || '';
    const validLanguage = hljs.getLanguage(language);

    if (validLanguage) {
        try {
            highlightedCode = hljs.highlight(snippet.codeblock, { language: language }).value;
        } catch (e) {
            const result = hljs.highlightAuto(snippet.codeblock);
            highlightedCode = result.value;
        }
    } else {
        const result = hljs.highlightAuto(snippet.codeblock);
        highlightedCode = result.value;
    }

    // Load theme CSS from cache (avoids re-reading disk or re-fetching per slide)
    const themeCss = await getCachedThemeCss(themeObj, themeKey);

    // Inject CSS styles into the template
    htmlContent = htmlContent.replace('<link rel="stylesheet" href="./snippet_styles.css">', `
        <style>
            ${cssContent}
            ${themeCss}
        </style>
    `);

    // Prepare container class with gradient background (inlined style)
    const omitBackground = options.omitBackground !== undefined ? options.omitBackground : config.screenshot.omitBackground;
    let containerStyle = '';
    
    if (!omitBackground) {
        const gradientCss = GRADIENTS[themeKey] || GRADIENTS[config.defaultTheme];
        containerStyle = `background-image: ${gradientCss}; padding: 48px; border-radius: 12px; display: flex;`;
    } else {
        containerStyle = `background: transparent; padding: 4px; display: flex;`;
    }

    // Split highlighted code by newline and wrap each line in a flex-row div
    const codeLines = highlightedCode.split('\n').map(line => {
        return `<div class="code-line" style="display: flex; flex-direction: row; align-items: center; min-height: 20px; white-space: pre; color: #e5e7eb;">${line || ' '}</div>`;
    }).join('');

    // Inject styles and replace placeholders
    htmlContent = htmlContent.replace('class="snippet-container {{CONTAINER_CLASS}}', `class="snippet-container" style="${containerStyle}"`);
    


    htmlContent = htmlContent.replace(/\{\{THEME\}\}/g, themeKey);
    htmlContent = htmlContent.replace(/\{\{LANGUAGE\}\}/g, language);
    htmlContent = htmlContent.replace(/\{\{CODE\}\}/g, codeLines);

    if (title) {
        htmlContent = htmlContent.replace(/\{\{#if TITLE\}\}/g, '');
        htmlContent = htmlContent.replace(/\{\{\/if\}\}/g, '');
        htmlContent = htmlContent.replace(/\{\{TITLE\}\}/g, title);
    } else {
        htmlContent = htmlContent.replace(/\{\{#if TITLE\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    // Inline all CSS properties using Juice
    return juice(htmlContent);
}

/**
 * Generates a code snippet image using Satori + Resvg
 */
export async function generateCodeSnippet(snippet, options = {}, browserInstance = null) {
    await downloadFontIfNeeded();

    // Generate inlined HTML markup
    const inlinedHtml = await generateInlinedHTML(snippet, options);

    // Convert inlined HTML to VNode
    const vnode = htmlToSatori(inlinedHtml);

    // Read local font file (cached after first load)
    const fontBuffer = getCachedFont();

    // Generate SVG via Satori
    let svg;
    try {
        svg = await satori(vnode, {
            width: 800,
            tailwindConfig: {}, // Supports standard Tailwind spacing/flex utilities
            fonts: [
                {
                    name: 'JetBrains Mono',
                    data: fontBuffer,
                    weight: 400,
                    style: 'normal',
                }
            ]
        });
    } catch (err) {
        console.error("VDOM structure causing error:", JSON.stringify(vnode, null, 2));
        throw err;
    }

    // Rasterize SVG to PNG using Resvg
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 800 }
    });
    const pngBuffer = resvg.render().asPng();

    // Save PNG file to output directory
    const outputDir = path.resolve(process.cwd(), config.output.directory);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `slide-${snippet.slide_number}.png`;
    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, pngBuffer);

    console.log(`✓ Generated: ${fileName} (800px width via Satori)`);
    return outputPath;
}

/**
 * Main function to generate all code snippets from presentation.json, compress, and upload to Google Drive.
 */
export async function generateAllSnippets(options = {}) {
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
        }

        let updatedCount = 0;

        // Pre-resolve topicName and outputDir once (avoid repeating per slide)
        const titleSlide = slides.find(s => s.type === 'title');
        const topicName = titleSlide ? titleSlide.title : 'General';
        const outputDir = path.resolve(process.cwd(), config.output.directory);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // ── Phase 1: Render and Upload code slides concurrently (Eager uploads) ─
        const t1Start = performance.now();
        const uploadPromises = [];
        const t2Start = performance.now();

        const rawResults = await renderWithWorkerPool(codeSlides, options, (slide, outputPath) => {
            if (authClient) {
                const uploadPromise = (async () => {
                    try {
                        const imageUrl = await uploadImageToDrive(authClient, outputPath, topicName);
                        if (imageUrl) {
                            slide.imageUrl = imageUrl;
                            console.log(`✅ slide-${slide.slide_number}.png → ${imageUrl}`);
                        }
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                        updatedCount++;
                    } catch (err) {
                        console.error(`❌ Upload failed for slide ${slide.slide_number}:`, err.message);
                    }
                })();
                uploadPromises.push(uploadPromise);
            }
        });

        const t1Ms = (performance.now() - t1Start).toFixed(0);

        // Normalise results shape to { slide, localImagePath, error }
        const renderResults = rawResults.map(r => {
            if (r.outputPath) r.slide.image = r.outputPath;
            return { slide: r.slide, localImagePath: r.outputPath, error: r.error };
        });

        // ── Phase 2: Await any remaining uploads ──────────────────────────────
        let t2Ms = 0;
        if (authClient && uploadPromises.length > 0) {
            console.log(`\n📤 Waiting for remaining Drive uploads to complete...`);
            await Promise.all(uploadPromises);
            t2Ms = (performance.now() - t2Start).toFixed(0);
        } else {
            updatedCount = renderResults.filter(r => r.localImagePath).length;
        }

        if (updatedCount > 0) {
            await saveJSONFile(JSON.stringify(slides, null, 2), 'presentation.json');
            console.log(`\n🎉 Successfully updated ${updatedCount} code snippets in presentation.json`);
        }

        // ── Pipeline timing summary ───────────────────────────────────────────
        const totalMs = (performance.now() - t1Start).toFixed(0);
        console.log(`\n⏱️  Pipeline timing:`);
        console.log(`   🖼️  Render phase  : ${t1Ms}ms`);
        if (authClient) console.log(`   ☁️  Upload phase  : ${t2Ms}ms (overlapping with render)`);
        console.log(`   ⚡ Total (Wall)  : ${totalMs}ms  (${(totalMs / 1000).toFixed(2)}s)`);

    } catch (error) {
        console.error('❌ generateAllSnippets failed:', error);
    }
}
