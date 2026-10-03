import { parse } from 'node-html-parser';
import hljs from 'highlight.js';

const code = 'if (x < 5 && y > 10) console.log("Hello &lt;");';
const highlighted = hljs.highlight(code, { language: 'javascript' }).value;
console.log('Highlighted HTML:', highlighted);

const root = parse(highlighted);
function walk(node: any) {
    if (node.nodeType === 3) {
        console.log('node.rawText:', JSON.stringify(node.rawText));
        console.log('node.text:   ', JSON.stringify(node.text));
    } else if (node.nodeType === 1) {
        for (const child of node.childNodes) {
            walk(child);
        }
    }
}
walk(root);
