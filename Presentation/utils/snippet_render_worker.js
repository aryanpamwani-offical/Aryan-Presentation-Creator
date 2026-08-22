/**
 * snippet_render_worker.js
 * Bun Worker — runs in its own OS thread.
 * Handles the full CPU-bound pipeline: highlight → HTML → VNode → SVG → PNG
 */
import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { parse } from 'node-html-parser';
import hljs from 'highlight.js';
import config from '../config/snippet_config.js';
import juice from 'juice';

const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');

// ── Worker-local caches ───────────────────────────────────────────────────────
let _fontBuffer = null;
let _templateHtml = null;
let _snippetCss = null;
const _themeCssCache = new Map();

function getCachedFont() {
    if (!_fontBuffer) _fontBuffer = fs.readFileSync(FONT_PATH);
    return _fontBuffer;
}

function getCachedTemplate() {
    if (!_templateHtml) {
        const p = path.resolve(process.cwd(), 'Presentation', 'templates', 'code_snippet_template.html');
        _templateHtml = fs.readFileSync(p, 'utf8');
    }
    return _templateHtml;
}

function getCachedCss() {
    if (!_snippetCss) {
        const p = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');
        _snippetCss = fs.readFileSync(p, 'utf8');
    }
    return _snippetCss;
}

async function getCachedThemeCss(themeObj, themeKey) {
    if (_themeCssCache.has(themeKey)) return _themeCssCache.get(themeKey);

    let themeCss = '';
    const cleanRel = themeObj.theme.includes('styles/') ? themeObj.theme.split('styles/')[1] : null;

    if (cleanRel) {
        const localFileName = cleanRel.replace('.min.css', '.css');
        // Try multiple ways to resolve highlight.js style path
        const pathsToTry = [
            path.resolve(import.meta.dir, '..', '..', 'node_modules', 'highlight.js', 'styles', localFileName),
            path.resolve(process.cwd(), 'node_modules', 'highlight.js', 'styles', localFileName),
            path.resolve(process.cwd(), '..', 'node_modules', 'highlight.js', 'styles', localFileName)
        ];

        for (const localPath of pathsToTry) {
            try {
                if (fs.existsSync(localPath)) {
                    themeCss = fs.readFileSync(localPath, 'utf8');
                    console.log(`  ✓ Loaded theme [${themeKey}] locally from: ${path.basename(localPath)}`);
                    break;
                }
            } catch (_) {}
        }
    }

    if (!themeCss) {
        console.warn(`  ⚠️ Theme [${themeKey}] not found locally. Fetching from CDN: ${themeObj.theme}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

            const res = await fetch(themeObj.theme, { signal: controller.signal });
            clearTimeout(timeoutId);
            themeCss = await res.text();
        } catch (err) {
            console.error(`  ❌ Failed to fetch theme [${themeKey}] from CDN:`, err.message);
        }
    }

    _themeCssCache.set(themeKey, themeCss);
    return themeCss;
}

function detectLanguage(code, explicitLanguage = null) {
    if (explicitLanguage) return explicitLanguage.toLowerCase();
    const t = code.trim().toLowerCase();
    if (t.includes('<!doctype html>') || t.includes('<html') || t.includes('<div') ||
        t.includes('<span') || t.includes('<style') || t.includes('</style>') || t.includes('</div>'))
        return 'html';
    if (t.includes('display:') || t.includes('color:') || t.includes('background-color:') ||
        t.includes('margin:') || t.includes('padding:'))
        return 'css';
    for (const [pattern, lang] of Object.entries(config.languagePatterns)) {
        if (t.startsWith(pattern.toLowerCase())) return lang;
    }
    return config.defaultLanguage;
}

function htmlToSatori(htmlString) {
    const root = parse(htmlString.trim(), {
        blockTextElements: { script: true, noscript: true, style: true }
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
            if (type === 'pre' || type === 'code') type = 'div';
            for (const [key, val] of Object.entries(node.attributes)) {
                if (key === 'class') {
                    props.className = val;
                } else if (key === 'style') {
                    const styleObj = {};
                    val.split(';').forEach(rule => {
                        const parts = rule.split(':');
                        if (parts.length >= 2) {
                            const k = parts[0].trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                            styleObj[k] = parts.slice(1).join(':').trim();
                        }
                    });
                    props.style = styleObj;
                } else {
                    props[key] = val;
                }
            }
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
                    if (typeof child === 'string') return nextInCode ? true : child.trim().length > 0;
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
    if (container) return parseNode(container);
    for (const child of root.childNodes) {
        if (child.nodeType === 1) return parseNode(child);
    }
    return null;
}

const GRADIENTS = {
    hyper:    'linear-gradient(to bottom right, #d946ef, #dc2626, #fb923c)',
    oceanic:  'linear-gradient(to bottom right, #86efac, #3b82f6, #9333ea)',
    candy:    'linear-gradient(to bottom right, #fbcfe8, #d8b4fe, #818cf8)',
    sublime:  'linear-gradient(to bottom right, #fb7185, #d946ef, #6366f1)',
    horizon:  'linear-gradient(to bottom right, #f97316, #fde047)',
    coral:    'linear-gradient(to bottom right, #60a5fa, #34d399)',
    peach:    'linear-gradient(to bottom right, #fb7185, #fdba74)',
    flamingo: 'linear-gradient(to bottom right, #f472b6, #db2777)',
    gotham:   'linear-gradient(to bottom right, #374151, #111827, #000000)',
    ice:      'linear-gradient(to bottom right, #ffe4e6, #ccfbf1)'
};

async function renderSnippet(snippet, options = {}) {
    const themeKey = options.theme || config.defaultTheme;
    const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];

    let htmlContent = getCachedTemplate();
    const cssContent = getCachedCss();
    const themeCss = await getCachedThemeCss(themeObj, themeKey);

    const language = detectLanguage(snippet.codeblock, snippet.language);
    const title = snippet.title || '';
    const validLanguage = hljs.getLanguage(language);

    let highlightedCode;
    if (validLanguage) {
        try { highlightedCode = hljs.highlight(snippet.codeblock, { language }).value; }
        catch (_) { highlightedCode = hljs.highlightAuto(snippet.codeblock).value; }
    } else {
        highlightedCode = hljs.highlightAuto(snippet.codeblock).value;
    }

    htmlContent = htmlContent.replace('<link rel="stylesheet" href="./snippet_styles.css">', `<style>${cssContent}${themeCss}</style>`);

    const omitBackground = options.omitBackground !== undefined ? options.omitBackground : config.screenshot.omitBackground;
    let containerStyle = !omitBackground
        ? `background-image: ${GRADIENTS[themeKey] || GRADIENTS[config.defaultTheme]}; padding: 48px; border-radius: 12px; display: flex;`
        : `background: transparent; padding: 4px; display: flex;`;

    const codeLines = highlightedCode.split('\n').map(line =>
        `<div class="code-line" style="display: flex; flex-direction: row; align-items: center; min-height: 20px; white-space: pre; color: #e5e7eb;">${line || ' '}</div>`
    ).join('');

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

    const inlinedHtml = juice(htmlContent);
    const vnode = htmlToSatori(inlinedHtml);
    const fontBuffer = getCachedFont();

    let svg;
    try {
        svg = await satori(vnode, {
            width: 800,
            tailwindConfig: {},
            fonts: [{ name: 'JetBrains Mono', data: fontBuffer, weight: 400, style: 'normal' }]
        });
    } catch (err) {
        throw new Error(`Satori failed for slide ${snippet.slide_number}: ${err.message}`);
    }

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } });
    const pngBuffer = resvg.render().asPng();

    const outputDir = path.resolve(process.cwd(), config.output.directory);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `slide-${snippet.slide_number}.png`;
    const outputPath = path.join(outputDir, fileName);
    await Bun.write(outputPath, pngBuffer);

    return outputPath;
}

// ── Bun Worker message handler ────────────────────────────────────────────────
self.onmessage = async (event) => {
    const { type, snippet, options, taskId } = event.data;

    // 'init' — pre-warm all caches AND trigger Satori/Resvg WASM JIT compilation
    if (type === 'init') {
        try {
            const themeKey = options?.theme || config.defaultTheme;
            const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];

            // 1. Populate file caches
            getCachedFont();
            getCachedTemplate();
            getCachedCss();
            await getCachedThemeCss(themeObj, themeKey);

            // 2. Trigger Satori + Resvg WASM JIT with a minimal dummy render
            //    (1 line of code, tiny SVG — costs ~1s now, saves ~2s on first real slide)
            const dummySnippet = {
                slide_number: 0,
                codeblock: 'const x = 1;',
                language: 'javascript',
                title: ''
            };
            await renderSnippet(dummySnippet, options);

            self.postMessage({ type: 'init_done', success: true });
        } catch (err) {
            self.postMessage({ type: 'init_done', success: false, error: err.message });
        }
        return;
    }

    // 'render' — actual slide render task
    try {
        const outputPath = await renderSnippet(snippet, options);
        self.postMessage({ taskId, success: true, outputPath });
    } catch (err) {
        self.postMessage({ taskId, success: false, error: err.message });
    }
};
