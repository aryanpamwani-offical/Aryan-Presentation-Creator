import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { parse } from 'node-html-parser';
import juice from 'juice';

const FONT_PATH = path.resolve(process.cwd(), 'Presentation', 'templates', 'font.ttf');

function htmlToSatori(htmlString) {
  const root = parse(htmlString.trim());
  
  function parseNode(node) {
    if (node.nodeType === 3) {
      return node.textContent;
    }
    
    if (node.nodeType === 1) {
      const type = node.tagName.toLowerCase();
      const props = {};
      
      for (const [key, val] of Object.entries(node.attributes)) {
        if (key === 'class') {
          props.className = val;
        } else if (key === 'style') {
          const styleObj = {};
          val.split(';').forEach(styleRule => {
            const parts = styleRule.split(':');
            if (parts.length >= 2) {
              const styleKey = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
              // Join in case the value contains colons (like urls or gradients)
              styleObj[styleKey] = parts.slice(1).join(':').trim();
            }
          });
          props.style = styleObj;
        } else {
          props[key] = val;
        }
      }
      
      const children = node.childNodes
        .map(parseNode)
        .filter(child => {
          if (typeof child === 'string') {
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
  
  for (const child of root.childNodes) {
    if (child.nodeType === 1) {
      return parseNode(child);
    }
  }
  return null;
}

async function test() {
  try {
    console.log('⚡ Running Satori + Resvg + juice test...');
    
    const htmlWithStyles = `
      <style>
        .box {
          background-image: linear-gradient(to bottom right, #a855f7, #ec4899);
          padding: 40px;
          border-radius: 10px;
          width: 600px;
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .heading {
          color: white;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .text {
          color: #f3f4f6;
          font-size: 18px;
        }
      </style>
      <div class="box">
        <h1 class="heading">Hello from Satori with Juice!</h1>
        <p class="text">CSS classes are now successfully inlined.</p>
      </div>
    `;
    
    // Inline classes
    const inlinedHtml = juice(htmlWithStyles);
    console.log('Inlined HTML:', inlinedHtml);
    
    const markup = htmlToSatori(inlinedHtml);
    console.log('Parsed VDOM:', JSON.stringify(markup, null, 2));
    
    const fontData = fs.readFileSync(FONT_PATH);
    
    // Generate SVG
    const svg = await satori(markup, {
      width: 600,
      height: 400,
      fonts: [
        {
          name: 'JetBrains Mono',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    });
    
    // Convert to PNG
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 600 }
    });
    const pngBuffer = resvg.render().asPng();
    
    fs.writeFileSync('scratch_satori_test.png', pngBuffer);
    console.log('✅ Success! Test image generated at scratch_satori_test.png');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
