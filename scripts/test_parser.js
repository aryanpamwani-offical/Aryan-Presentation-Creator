import { parse } from 'node-html-parser';

const htmlString = `<pre><code class="language-css"><span>Hello</span></code></pre>`;

const root = parse(htmlString, {
  blockTextElements: {
    script: true,
    noscript: true,
    style: true
  }
});

console.log('Parsed HTML Structure:', root.toString());
const pre = root.querySelector('pre');
console.log('Pre tag child count:', pre.childNodes.length);
console.log('Pre child tagName:', pre.childNodes[0].tagName);
console.log('Pre child classList:', pre.childNodes[0].classList?.toString());
