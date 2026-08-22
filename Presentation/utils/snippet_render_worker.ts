/**
 * snippet_render_worker.js
 * Bun Worker — runs in its own OS thread.
 * Handles the full CPU-bound pipeline: highlight → HTML → VNode → SVG → PNG
 */
import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { parse, Node, HTMLElement } from 'node-html-parser';
import hljs from 'highlight.js';
import config from '../config/snippet_config.js';
import type { CodeSlide, ThemeConfig, RenderOptions, SatoriNode } from '../types/index.ts';
import { getErrorMessage } from '../types/index.ts';

const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');

// ── Worker-local caches ───────────────────────────────────────────────────────
let _fontBuffer: Buffer | null = null;
let _templateHtml: string | null = null;
let _snippetCss: string | null = null;
const _themeCssCache = new Map<string, string>();

function getCachedFont(): Buffer {
    if (!_fontBuffer) _fontBuffer = fs.readFileSync(FONT_PATH);
    return _fontBuffer;
}

function getCachedTemplate(): string {
    if (!_templateHtml) {
        const p = path.resolve(process.cwd(), 'Presentation', 'templates', 'code_snippet_template.html');
        _templateHtml = fs.readFileSync(p, 'utf8');
    }
    return _templateHtml;
}

function getCachedCss(): string {
    if (!_snippetCss) {
        const p = path.resolve(process.cwd(), 'Presentation', 'templates', 'snippet_styles.css');
        _snippetCss = fs.readFileSync(p, 'utf8');
    }
    return _snippetCss;
}

async function getCachedThemeCss(themeObj: ThemeConfig, themeKey: string): Promise<string> {
    if (_themeCssCache.has(themeKey)) return _themeCssCache.get(themeKey);

    let themeCss = '';
    const cleanRel = themeObj.theme.includes('styles/') ? themeObj.theme.split('styles/')[1] : null;

    if (cleanRel) {
        const localFileName = cleanRel.replace('.min.css', '.css');
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
            const timeoutId = setTimeout(() => controller.abort(), 1500);

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

function detectLanguage(code: string, explicitLanguage: string | null = null): string {
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

// ── Lightweight CSS-to-Style Map Parser ──────────────────────────────────────
function parseCssToMap(cssString: string): Record<string, Record<string, string>> {
    const map: Record<string, Record<string, string>> = {};
    if (!cssString) return map;

    const cleanCss = cssString.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /([^{]+)\s*\{\s*([^}]+)\s*\}/g;
    let match;

    while ((match = ruleRegex.exec(cleanCss)) !== null) {
        const selectorStr = match[1].trim();
        const rulesStr = match[2].trim();

        const styleObj: Record<string, string> = {};
        rulesStr.split(';').forEach(decl => {
            const index = decl.indexOf(':');
            if (index !== -1) {
                const prop = decl.substring(0, index).trim();
                const val = decl.substring(index + 1).trim().replace(/\s*!important/gi, '');
                const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                styleObj[camelProp] = val;
            }
        });

        selectorStr.split(',').forEach(selector => {
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

function htmlToSatori(htmlString: string, cssMap: Record<string, Record<string, string>>): SatoriNode | null {
    const root = parse(htmlString.trim(), {
        blockTextElements: { script: true, noscript: true, style: true }
    });

    function parseNode(node: Node, inCode = false): SatoriNode | string | null {
        if (node.nodeType === 3) {
            return inCode ? node.textContent : node.textContent.trim().replace(/\s+/g, ' ');
        }
        if (node.nodeType === 1) {
            const element = node as HTMLElement;
            let type = element.tagName.toLowerCase();
            const props: Record<string, unknown> = {};
            const isCodeElement = type === 'pre' || type === 'code' || element.attributes.class?.includes('code-line');
            const nextInCode = inCode || isCodeElement;
            if (type === 'pre' || type === 'code') type = 'div';

            // Extract class list
            const classAttr = element.attributes.class || '';
            const classList = classAttr.split(/\s+/).filter(Boolean);

            // Apply base props from HTML
            for (const [key, val] of Object.entries(element.attributes)) {
                if (key === 'class') {
                    props.className = val;
                } else if (key === 'style') {
                    const styleObj: Record<string, string> = {};
                    (val as string).split(';').forEach(rule => {
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

            // Apply styles from CSS Map
            const style = (props.style || {}) as Record<string, string>;
            Object.keys(cssMap).forEach(selector => {
                if (selector === type) {
                    Object.assign(style, cssMap[selector]);
                } else if (selector.startsWith('.')) {
                    const classes = selector.slice(1).split('.');
                    if (classes.every(cls => classList.includes(cls))) {
                        Object.assign(style, cssMap[selector]);
                    }
                }
            });
            props.style = style;

            if (type === 'div') {
                if (!style.display) {
                    style.display = 'flex';
                    style.flexDirection = 'column';
                }
            }

            const children = element.childNodes
                .map((child: Node) => parseNode(child, nextInCode))
                .filter((child): child is string | SatoriNode => {
                    if (typeof child === 'string') return nextInCode ? true : child.trim().length > 0;
                    return !!child;
                });
            if (children.length > 0) {
                props.children = children.length === 1 ? children[0] : children;
            }
            return { type, props } as SatoriNode;
        }
        return null;
    }

    const container = root.querySelector('.snippet-container');
    if (container) return parseNode(container) as SatoriNode;
    for (const child of root.childNodes) {
        if (child.nodeType === 1) return parseNode(child) as SatoriNode;
    }
    return null;
}

const GRADIENTS: Record<string, string> = {
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

async function renderSnippet(snippet: CodeSlide, options: RenderOptions = {}): Promise<string> {
    const themeKey = options.theme || config.defaultTheme;
    const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];

    let htmlContent = getCachedTemplate();
    const cssContent = getCachedCss();
    const themeCss = await getCachedThemeCss(themeObj, themeKey);

    const cssMap = {
        ...parseCssToMap(cssContent),
        ...parseCssToMap(themeCss)
    };

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

    const vnode = htmlToSatori(htmlContent, cssMap);
    const fontBuffer = getCachedFont();

    let svg;
    try {
        svg = await satori(vnode, {
            width: 800,
            fonts: [{ name: 'JetBrains Mono', data: fontBuffer, weight: 400, style: 'normal' }]
        });
    } catch (err: unknown) {
        throw new Error(`Satori failed for slide ${snippet.slide_number}: ${getErrorMessage(err)}`);
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
self.onmessage = async (event: MessageEvent) => {
    const { type, snippet, options, taskId } = event.data;

    if (type === 'init') {
        try {
            const themeKey = options?.theme || config.defaultTheme;
            const themeObj = config.themes[themeKey] || config.themes[config.defaultTheme];

            getCachedFont();
            getCachedTemplate();
            getCachedCss();
            await getCachedThemeCss(themeObj, themeKey);

            const dummySnippet: CodeSlide = {
                id: 0,
                slide_number: 0,
                type: 'code',
                title: '',
                image: '',
                imageUrl: '',
                codeblock: 'const x = 1;',
                codeTitle: '',
                description: '',
                language: 'javascript'
            };
            await renderSnippet(dummySnippet, options);

            self.postMessage({ type: 'init_done', success: true });
        } catch (err: unknown) {
            self.postMessage({ type: 'init_done', success: false, error: getErrorMessage(err) });
        }
        return;
    }

    try {
        const outputPath = await renderSnippet(snippet, options);
        self.postMessage({ taskId, success: true, outputPath });
    } catch (err: unknown) {
        self.postMessage({ taskId, success: false, error: getErrorMessage(err) });
    }
};

