import fs from 'fs';
import path from 'path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import hljs from 'highlight.js';
import { parse } from 'node-html-parser';
import config from '../config/snippet_config.js';
import saveJSONFile from '../ai-core/saveJSONFile.js';
// Google Drive integration for code snippets commented out in favor of Cloudflare R2
// import AuthWithGoogle from '../config/auth/google-oauth.js';
// import uploadImageToDrive from '../config/drive/google_drive.js';
import { uploadSnippetToR2 } from '../config/cloudflare/r2.js';
import { IMAGE_CONFIG, convertToPt } from './image_helper.js';
import type { Slide, CodeSlide, RenderOptions } from '../types/index.ts';

// ── 1. Paths & Font Initialization ───────────────────────────────────────────
const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');
const SNIPPET_STYLES_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');

if (fs.existsSync(FONT_PATH)) {
    GlobalFonts.registerFromPath(FONT_PATH, 'JetBrains Mono');
}

export const downloadFontIfNeeded = async () => {
    if (fs.existsSync(FONT_PATH)) return;
    console.log('📥 Downloading JetBrains Mono font locally...');
    if (typeof Bun !== 'undefined') {
        const res = await fetch('https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf');
        if (res.ok) {
            await Bun.write(FONT_PATH, res);
            GlobalFonts.registerFromPath(FONT_PATH, 'JetBrains Mono');
        }
    }
};

// ── 2. CSS Parsing & Theme Management ────────────────────────────────────────
function parseCssToMap(cssString: string): Record<string, Record<string, string>> {
    const map: Record<string, Record<string, string>> = {};
    if (!cssString) return map;

    const cleanCss = cssString.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /([^{]+)\s*\{\s*([^}]+)\s*\}/g;
    let match: RegExpExecArray | null;

    while ((match = ruleRegex.exec(cleanCss)) !== null) {
        const selectorStr = match[1].trim();
        const rulesStr = match[2].trim();

        const styleObj: Record<string, string> = {};
        rulesStr.split(';').forEach((decl) => {
            const index = decl.indexOf(':');
            if (index !== -1) {
                const prop = decl.substring(0, index).trim();
                const val = decl.substring(index + 1).trim().replace(/\s*!important/gi, '');
                const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                styleObj[camelProp] = val;
            }
        });

        selectorStr.split(',').forEach((selector) => {
            let cleanSel = selector.trim();
            cleanSel = cleanSel.replace(/\[[^\]]+\]/g, '');
            cleanSel = cleanSel.replace(/\s+/g, '');
            if (cleanSel) {
                map[cleanSel] = { ...map[cleanSel], ...styleObj };
            }
        });
    }
    return map;
}

const _cssMapCache = new Map<string, Record<string, Record<string, string>>>();

function getCombinedCssMap(themeKey: string = 'candy'): Record<string, Record<string, string>> {
    if (_cssMapCache.has(themeKey)) {
        return _cssMapCache.get(themeKey)!;
    }

    const snippetStylesCss = fs.existsSync(SNIPPET_STYLES_PATH) ? fs.readFileSync(SNIPPET_STYLES_PATH, 'utf8') : '';

    // Locate theme file in highlight.js
    let themeCssPath = path.resolve(process.cwd(), 'node_modules', 'highlight.js', 'styles', 'base16', 'chalk.css');
    const themeConfig = config.themes[themeKey];
    if (themeConfig && themeConfig.theme) {
        if (themeConfig.theme.includes('styles/')) {
            const rel = themeConfig.theme.split('styles/')[1].replace('.min.css', '.css');
            const candidate = path.resolve(process.cwd(), 'node_modules', 'highlight.js', 'styles', rel);
            if (fs.existsSync(candidate)) themeCssPath = candidate;
        }
    }

    const themeCss = fs.existsSync(themeCssPath) ? fs.readFileSync(themeCssPath, 'utf8') : '';

    const combinedMap = {
        ...parseCssToMap(themeCss),
        ...parseCssToMap(snippetStylesCss), // snippet_styles overrides theme
    };

    _cssMapCache.set(themeKey, combinedMap);
    return combinedMap;
}

function resolveTokenStyle(cssMap: Record<string, Record<string, string>>, classList: string[]): { color: string; isItalic: boolean } {
    let color = '#d0d0d0'; // default foreground
    let isItalic = false;

    Object.keys(cssMap).forEach((selector) => {
        if (selector.startsWith('.')) {
            const classes = selector.slice(1).split('.');
            if (classes.every((cls) => classList.includes(cls))) {
                const rule = cssMap[selector];
                if (rule.color) color = rule.color;
                if (rule.fontStyle === 'italic') isItalic = true;
            }
        }
    });

    return { color, isItalic };
}

// ── 3. Code Formatter with Inline Comments ───────────────────────────────────
function formatCodeSnippet(raw: string): string {
    if (!raw) return '';
    let code = raw.replace(/\\n/g, '\n');
    if (code.includes('\n')) return code.trim();

    // 1. Separate opening and closing braces
    code = code.replace(/\{\s*/g, ' {\n  ');
    code = code.replace(/\s*\}\s*/g, '\n}\n');

    // 2. Protect semicolons followed by inline comments (keep comments on the same line!)
    code = code.replace(/;\s*(\/\*[\s\S]*?\*\/)/g, '__INLINE_COMMENT__$1\n  ');

    // 3. For all other semicolons, add newline
    code = code.replace(/;\s*/g, ';\n  ');

    // 4. Restore the protected semicolons with inline comments
    code = code.replace(/__INLINE_COMMENT__/g, '; ');

    // 5. Clean up indentation and blank lines
    return code
        .split('\n')
        .map((l) => l.trimEnd().replace(/\{\s*$/, ' {'))
        .filter((l) => l.trim().length > 0)
        .map((l) => (l.startsWith(' ') ? '  ' + l.trimStart() : l))
        .join('\n')
        .trim();
}

export function splitHighlightedCodeIntoLines(highlightedHtml: string): string[] {
    return highlightedHtml.split('\n');
}

// ── 4. Fast Canvas Snippet Generator ─────────────────────────────────────────
export async function generateCodeSnippet(
    snippet: CodeSlide,
    options: RenderOptions = {}
): Promise<string> {
    const rawCode = (snippet.codeblock || '').trim();
    const formattedCode = formatCodeSnippet(rawCode);
    const language = (snippet.language || 'javascript').toLowerCase();
    const title = snippet.codeTitle || snippet.title || 'Code Snippet';
    const themeKey = options.theme || config.defaultTheme || 'candy';

    const cssMap = getCombinedCssMap(themeKey);

    // 1. Highlight code using highlight.js
    let highlightedHtml: string;
    try {
        highlightedHtml = hljs.highlight(formattedCode, {
            language: hljs.getLanguage(language) ? language : 'plaintext',
        }).value;
    } catch {
        highlightedHtml = hljs.highlightAuto(formattedCode).value;
    }

    // 2. Dynamic card dimensions
    const lines = formattedCode.split('\n');
    const lineCount = Math.max(lines.length, 1);

    const CARD_WIDTH = 800;
    const HEADER_HEIGHT = 44;
    const LINE_HEIGHT = 28;
    const PADDING_TOP = 24;
    const PADDING_BOTTOM = 32;
    const PADDING_LEFT = 32;
    const FONT_SIZE = 16;

    const minCardHeight = 320;
    const contentHeight = HEADER_HEIGHT + PADDING_TOP + lineCount * LINE_HEIGHT + PADDING_BOTTOM;
    const CARD_HEIGHT = Math.max(minCardHeight, contentHeight);

    // 2x Retina resolution
    const SCALE = 2;
    const canvas = createCanvas(CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // 3. Draw Outer Card Container
    const CORNER_RADIUS = 10;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
    ctx.clip();

    // Background from snippet_styles.css
    ctx.fillStyle = cssMap['.snippet-window']?.background || '#18181b';
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Subtle 1px inner border
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // 4. Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, CARD_WIDTH, HEADER_HEIGHT);

    // Header bottom border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(CARD_WIDTH, HEADER_HEIGHT);
    ctx.stroke();

    // macOS Window Controls from snippet_styles.css
    const DOT_Y = HEADER_HEIGHT / 2;
    const closeColor = cssMap['.light.close']?.background || 'rgb(239, 68, 68)';
    const minColor = cssMap['.light.minimize']?.background || 'rgb(234, 179, 8)';
    const maxColor = cssMap['.light.maximize']?.background || 'rgb(34, 197, 94)';

    const dots = [
        { x: 24, color: closeColor },
        { x: 42, color: minColor },
        { x: 60, color: maxColor },
    ];

    for (const dot of dots) {
        ctx.beginPath();
        ctx.arc(dot.x, DOT_Y, 6, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
    }

    // Title from snippet_styles.css
    const titleColor = cssMap['.snippet-title']?.color || 'rgb(156, 163, 175)';
    ctx.font = '500 13px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, CARD_WIDTH / 2, DOT_Y);

    // 5. Render Syntax-Highlighted Code
    const regularFont = `400 ${FONT_SIZE}px "JetBrains Mono", Consolas, monospace`;
    const italicFont = `italic 400 ${FONT_SIZE}px "JetBrains Mono", Consolas, monospace`;
    ctx.font = regularFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentX = PADDING_LEFT;
    let currentY = HEADER_HEIGHT + PADDING_TOP;

    const root = parse(highlightedHtml);

    function walkNodes(node: any, inheritedColor = '#d0d0d0', inheritedItalic = false) {
        if (node.nodeType === 3) {
            const text = node.text || '';
            const textLines = text.split('\n');

            ctx.font = inheritedItalic ? italicFont : regularFont;
            ctx.fillStyle = inheritedColor;

            for (let i = 0; i < textLines.length; i++) {
                const segment = textLines[i];
                if (segment.length > 0) {
                    ctx.fillText(segment, currentX, currentY);
                    currentX += ctx.measureText(segment).width;
                }

                if (i < textLines.length - 1) {
                    currentX = PADDING_LEFT;
                    currentY += LINE_HEIGHT;
                }
            }
        } else if (node.nodeType === 1) {
            const classNames = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean);
            const { color, isItalic } = resolveTokenStyle(cssMap, classNames);

            for (const child of node.childNodes) {
                walkNodes(child, color || inheritedColor, isItalic || inheritedItalic);
            }
        }
    }

    for (const child of root.childNodes) {
        walkNodes(child);
    }

    ctx.restore();

    // 6. Direct Resize to Target Dimensions (560px × 440px)
    const outputDir = path.resolve(process.cwd(), config.output.directory);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `slide-${snippet.slide_number}.png`;
    const outputPath = path.join(outputDir, fileName);
    const tempRawPath = path.join(outputDir, `.temp_${fileName}`);
    const pngBuffer = canvas.toBuffer('image/png');

    const targetWidth = convertToPt(IMAGE_CONFIG.Code.width) * 2;
    const targetHeight = convertToPt(IMAGE_CONFIG.Code.height) * 2;

    try {
        fs.writeFileSync(tempRawPath, pngBuffer);
        const file = Bun.file(tempRawPath);
        const image = file.image().resize(targetWidth, targetHeight, { fit: 'inside' });
        await image.png().write(outputPath);
    } finally {
        if (fs.existsSync(tempRawPath)) {
            fs.unlinkSync(tempRawPath);
        }
    }

    return outputPath;
}

// ── 5. Main Batch Generator ──────────────────────────────────────────────────
export async function generateAllSnippets(options: RenderOptions = {}): Promise<void> {
    try {
        const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');

        if (!fs.existsSync(presentationJsonPath)) {
            console.error('❌ presentation.json not found!', presentationJsonPath);
            return;
        }

        const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
        let slides: Slide[] = JSON.parse(rawData);

        if (!Array.isArray(slides)) {
            console.error('❌ presentation.json is not an array!');
            return;
        }

        const codeSlides = slides.filter((slide): slide is CodeSlide => slide.type === 'code' && !!slide.codeblock);
        console.log(`\n📸 Found ${codeSlides.length} code slide(s) in presentation.json\n`);

        if (codeSlides.length === 0) {
            console.log('No code slides to process.');
            return;
        }

        // Google Drive auth commented out for code snippets in favor of Cloudflare R2
        // let authClient: any = null;
        // try {
        //     authClient = await AuthWithGoogle();
        // } catch (e) {
        //     console.error('❌ Failed to authenticate with Google:', e);
        // }

        let updatedCount = 0;
        const titleSlide = slides.find((s) => s.type === 'title');
        const topicName = titleSlide ? titleSlide.title : 'General';

        const tStart = performance.now();

        // ── Stage 1: Generate ALL code snippets locally in a single go ──────────
        console.log(`⚡ Generating all ${codeSlides.length} code snippets locally...`);
        const tGenStart = performance.now();

        const renderTasks = codeSlides.map(async (slide) => {
            const tSlide = performance.now();
            try {
                const outputPath = await generateCodeSnippet(slide, options);
                const renderElapsed = (performance.now() - tSlide).toFixed(0);
                return { slide, outputPath, renderElapsed };
            } catch (err: any) {
                console.error(`❌ Failed generating slide ${slide.slide_number}:`, err.message || err);
                return { slide, outputPath: null, renderElapsed: '0' };
            }
        });

        const renderedResults = await Promise.all(renderTasks);
        const validRenders = renderedResults.filter((r) => r.outputPath !== null) as {
            slide: CodeSlide;
            outputPath: string;
            renderElapsed: string;
        }[];

        const totalGenMs = (performance.now() - tGenStart).toFixed(0);
        console.log(`✅ All ${validRenders.length} snippets generated locally in ${totalGenMs}ms!\n`);

        // ── Stage 2: Batch upload ALL snippets to Cloudflare R2 in parallel ──────
        if (validRenders.length > 0) {
            console.log(`🚀 Uploading ${validRenders.length} snippets to Cloudflare R2 in parallel...`);
            const tUploadStart = performance.now();

            const uploadTasks = validRenders.map(async ({ slide, outputPath, renderElapsed }) => {
                const tUpload = performance.now();
                try {
                    const objectKey = `code_snippets/slide-${slide.slide_number}.png`;
                    const imageUrl = await uploadSnippetToR2(outputPath, objectKey);
                    const uploadElapsed = (performance.now() - tUpload).toFixed(0);

                    if (imageUrl) {
                        slide.imageUrl = imageUrl;
                        console.log(
                            `  ☁️  slide-${slide.slide_number}.png ➜ ${imageUrl} (render: ${renderElapsed}ms, upload: ${uploadElapsed}ms)`
                        );
                        updatedCount++;
                    }
                } catch (err: any) {
                    console.error(`❌ Cloudflare R2 upload failed for slide ${slide.slide_number}:`, err.message || err);
                } finally {
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                }
            });

            await Promise.all(uploadTasks);
            const totalUploadMs = (performance.now() - tUploadStart).toFixed(0);
            console.log(`\n🎉 Parallel R2 upload finished in ${totalUploadMs}ms!`);
        }

        /* [Google Drive integration commented out for code snippets]
        if (authClient && validRenders.length > 0) {
            console.log(`🚀 Uploading ${validRenders.length} snippets to Google Drive in parallel...`);
            const tUploadStart = performance.now();

            const uploadTasks = validRenders.map(async ({ slide, outputPath, renderElapsed }) => {
                const tUpload = performance.now();
                try {
                    const imageUrl = await uploadImageToDrive(authClient, outputPath, topicName);
                    const uploadElapsed = (performance.now() - tUpload).toFixed(0);

                    if (imageUrl) {
                        slide.imageUrl = imageUrl;
                        console.log(
                            `  ☁️  slide-${slide.slide_number}.png ➜ ${imageUrl} (render: ${renderElapsed}ms, upload: ${uploadElapsed}ms)`
                        );
                        updatedCount++;
                    }
                } catch (err: any) {
                    console.error(`❌ Drive upload failed for slide ${slide.slide_number}:`, err.message || err);
                } finally {
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                }
            });

            await Promise.all(uploadTasks);
            const totalUploadMs = (performance.now() - tUploadStart).toFixed(0);
            console.log(`\n🎉 Parallel upload finished in ${totalUploadMs}ms!`);
        }
        */

        if (updatedCount > 0) {
            await saveJSONFile(JSON.stringify(slides, null, 2), 'presentation.json');
            console.log(`\n🎉 Successfully updated ${updatedCount} code snippets in presentation.json`);
        }

        const totalMs = Math.round(performance.now() - tStart);
        console.log(`\n⏱️  Total pipeline time: ${totalMs}ms (${(totalMs / 1000).toFixed(2)}s)`);
    } catch (error) {
        console.error('❌ generateAllSnippets failed:', error);
    }
}
