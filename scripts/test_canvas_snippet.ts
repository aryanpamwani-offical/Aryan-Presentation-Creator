import fs from 'fs';
import path from 'path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import hljs from 'highlight.js';
import { parse } from 'node-html-parser';
import { resizeAndSaveImage, IMAGE_CONFIG, convertToPt } from '../Presentation/utils/image_helper.js';

// ── 1. Configuration & Constants ─────────────────────────────────────────────
const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');
const JSON_PATH = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
const OUTPUT_DIR = path.resolve(process.cwd(), 'Presentation', 'media', 'images', 'code_snippets');

// Register font family once
if (fs.existsSync(FONT_PATH)) {
    GlobalFonts.registerFromPath(FONT_PATH, 'JetBrains Mono');
}

// ── Dynamic CSS Map Loader (Matches original generate_code_snippet.ts) ────────
const SNIPPET_STYLES_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');
const CHALK_CSS_PATH = path.resolve(process.cwd(), 'node_modules', 'highlight.js', 'styles', 'base16', 'chalk.css');

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

// Load and combine styles from snippet_styles.css and theme CSS
const snippetStylesCss = fs.existsSync(SNIPPET_STYLES_PATH) ? fs.readFileSync(SNIPPET_STYLES_PATH, 'utf8') : '';
const themeCss = fs.existsSync(CHALK_CSS_PATH) ? fs.readFileSync(CHALK_CSS_PATH, 'utf8') : '';

const cssMap = {
    ...parseCssToMap(themeCss),
    ...parseCssToMap(snippetStylesCss), // snippet_styles overrides theme (e.g. comment color & window bg)
};

function resolveTokenStyle(classList: string[]): { color: string; isItalic: boolean } {
    let color = '#d0d0d0'; // default chalk foreground
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

interface CodeSlide {
    id: number;
    slide_number: number;
    type: string;
    title: string;
    codeblock: string;
    codeTitle?: string;
    language?: string;
    [key: string]: any;
}

/**
 * Formats code snippet with proper line breaks:
 * - Unescapes literal \n
 * - Keeps inline comments on the SAME line (e.g. z-index: 100; // or block comments)
 * - Formats single-line CSS/JS with clean indentation
 */
function formatCodeSnippet(raw: string): string {
    if (!raw) return '';
    let code = raw.replace(/\\n/g, '\n');
    if (code.includes('\n')) return code.trim();

    // 1. Separate opening and closing braces
    code = code.replace(/\{\s*/g, ' {\n  ');
    code = code.replace(/\s*\}\s*/g, '\n}\n');

    // 2. Protect semicolons followed by inline comments (keep comment on same line!)
    code = code.replace(/;\s*(\/\*[\s\S]*?\*\/)/g, '__INLINE_COMMENT__$1\n  ');

    // 3. For all other semicolons, add newline
    code = code.replace(/;\s*/g, ';\n  ');

    // 4. Restore the protected semicolons with their inline comments
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

// ── 2. Canvas Code Snippet Generator ─────────────────────────────────────────
export async function renderSnippetWithCanvas(
    slide: CodeSlide,
    outputDir: string
): Promise<{ outputPath: string; renderTimeMs: number; resizeTimeMs: number }> {
    const tStart = performance.now();

    const rawCode = (slide.codeblock || '').trim();
    const formattedCode = formatCodeSnippet(rawCode);
    const language = slide.language || 'javascript';
    const title = slide.codeTitle || slide.title || 'Code Snippet';

    // 1. Highlight code using highlight.js
    let highlightedHtml: string;
    try {
        highlightedHtml = hljs.highlight(formattedCode, { language: hljs.getLanguage(language) ? language : 'plaintext' }).value;
    } catch {
        highlightedHtml = hljs.highlightAuto(formattedCode).value;
    }

    // 2. Calculate dynamic dimensions
    const lines = formattedCode.split('\n');
    const lineCount = Math.max(lines.length, 1);

    const CARD_WIDTH = 800;
    const HEADER_HEIGHT = 44;
    const LINE_HEIGHT = 28;
    const PADDING_TOP = 24;
    const PADDING_BOTTOM = 32;
    const PADDING_LEFT = 32;
    const FONT_SIZE = 16;

    // Minimum card height to ensure it never looks like a squished bar
    const minCardHeight = 320;
    const contentHeight = HEADER_HEIGHT + PADDING_TOP + lineCount * LINE_HEIGHT + PADDING_BOTTOM;
    const CARD_HEIGHT = Math.max(minCardHeight, contentHeight);

    // 2x Retina resolution for razor-sharp rendering
    const SCALE = 2;
    const canvas = createCanvas(CARD_WIDTH * SCALE, CARD_HEIGHT * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // 3. Draw Outer Card Container (Matches .snippet-window in snippet_styles.css)
    const CORNER_RADIUS = 10;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
    ctx.clip();

    // Background from snippet_styles.css (.snippet-window)
    const windowBg = cssMap['.snippet-window']?.background || '#18181b';
    ctx.fillStyle = windowBg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Subtle 1px inner border matching box-shadow in snippet_styles.css
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // 4. Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, CARD_WIDTH, HEADER_HEIGHT);

    // Header bottom border from snippet_styles.css (.window-header)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(CARD_WIDTH, HEADER_HEIGHT);
    ctx.stroke();

    // macOS Window Controls from snippet_styles.css (.light.close, .light.minimize, .light.maximize)
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

    // Title from snippet_styles.css (.snippet-title)
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

    // Parse highlight.js HTML tokens into flat items
    const root = parse(highlightedHtml);

    function walkNodes(node: any, inheritedColor = '#d0d0d0', inheritedItalic = false) {
        if (node.nodeType === 3) {
            // Text node
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

                // Move down when reaching newline
                if (i < textLines.length - 1) {
                    currentX = PADDING_LEFT;
                    currentY += LINE_HEIGHT;
                }
            }
        } else if (node.nodeType === 1) {
            // Element node (e.g. <span class="hljs-keyword">)
            const classNames = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean);
            const { color, isItalic } = resolveTokenStyle(classNames);

            for (const child of node.childNodes) {
                walkNodes(child, color || inheritedColor, isItalic || inheritedItalic);
            }
        }
    }

    for (const child of root.childNodes) {
        walkNodes(child);
    }

    ctx.restore();

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 6. Direct Resize to target slide dimensions (560x440)
    // Output is written directly to slide-${n}.png and temp file is cleaned up immediately
    const fileName = `slide-${slide.slide_number}.png`;
    const outputPath = path.join(outputDir, fileName);
    const tempRawPath = path.join(outputDir, `.temp_${fileName}`);
    const pngBuffer = canvas.toBuffer('image/png');

    const renderTimeMs = performance.now() - tStart;

    const tResize = performance.now();
    const targetWidth = convertToPt(IMAGE_CONFIG.Code.width) * 2;  // 560px
    const targetHeight = convertToPt(IMAGE_CONFIG.Code.height) * 2; // 440px

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

    const resizeTimeMs = performance.now() - tResize;

    return { outputPath, renderTimeMs, resizeTimeMs };
}

// ── 3. Test Runner ───────────────────────────────────────────────────────────
async function runTest() {
    console.log('🚀 Testing Canvas Snippet Generation (Comments Inline + Direct slide-$n.png Resize)...\n');

    if (!fs.existsSync(JSON_PATH)) {
        console.error(`❌ presentation.json not found at: ${JSON_PATH}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(JSON_PATH, 'utf8');
    const slides: CodeSlide[] = JSON.parse(rawData);

    const codeSlides = slides.filter((s) => s.type === 'code' && s.codeblock);

    if (codeSlides.length === 0) {
        console.log('⚠️ No code slides found in presentation.json');
        return;
    }

    console.log(`Found ${codeSlides.length} code slide(s) in presentation.json.\n`);

    let totalMs = 0;

    for (const slide of codeSlides) {
        const { outputPath, renderTimeMs, resizeTimeMs } = await renderSnippetWithCanvas(slide, OUTPUT_DIR);
        totalMs += renderTimeMs + resizeTimeMs;
        console.log(
            `  ✅ Slide #${slide.slide_number} [${slide.language || 'text'}]: ${(renderTimeMs + resizeTimeMs).toFixed(1)}ms ➜ ${path.basename(outputPath)}`
        );
    }

    console.log(`\n🎉 Successfully generated all ${codeSlides.length} snippets in ${totalMs.toFixed(1)}ms total!`);
    console.log(`⚡ Average per snippet: ${(totalMs / codeSlides.length).toFixed(1)}ms`);
    console.log(`📂 Output saved directly to: ${OUTPUT_DIR}\n`);
}

runTest().catch((err) => {
    console.error('❌ Test failed with error:', err);
});
