import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import process from 'process';
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';

// --- CONFIGURATION ---
const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive'
];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// --- SLIDE CONSTANTS (16:9 Aspect Ratio in Points) ---
const SLIDE_WIDTH = 720;
const SLIDE_HEIGHT = 405;

// --- YOUR TEMPLATE & CONTENT DATA ---
const PRESENTATION_DATA = {
  "templates": {
    "theme": {
      "name": "Lectutes Dark",
      "backgroundColor": "#000000",
      "textColor": "#FFFFFF",
      "fontFamilyHeading": "Poppins",
      "fontFamilyBody": "Inter"
    },
    "slideTypes": {
      "title": {
        "layout": {
          "container": { "alignItems": "center", "justifyContent": "flex-end", "padding": 40 }
        }
      },
      "module_intro": {
        "layout": {
          "container": { "alignItems": "flex-start", "justifyContent": "center", "padding": 60 }
        }
      },
      "concept": {
        "layout": {
          "container": { "alignItems": "flex-start", "justifyContent": "center", "padding": 60 }
        }
      },
      "code": {
        "layout": {
          "container": { "alignItems": "flex-start", "justifyContent": "center", "padding": 50 }
        }
      },
      "screenshot_tutorial": {
        "layout": {
          "container": { "alignItems": "flex-start", "justifyContent": "flex-start", "padding": 40 }
        }
      },
      "notes": {
        "layout": {
          "container": { "alignItems": "flex-start", "justifyContent": "center", "padding": 60 }
        }
      },
      "thank_you": {
        "layout": {
          "container": { "alignItems": "center", "justifyContent": "center", "padding": 80 }
        }
      }
    }
  },
  "content": {
    "topic": "HTML & GitHub Basics",
    "modules": [
      {
        "name": "Module 1: HTML Basics",
        "slides": [
          {
            "template": "module_intro",
            "title": "HTML Overview",
            "moduleLabel": "Module 1",
            "bullets": [ "What is HTML?", "Where HTML is used", "Basic structure of an HTML document" ]
          },
          {
            "template": "concept",
            "title": "What is HTML?",
            "body": "HTML stands for HyperText Markup Language. It defines the structure and content of web pages using tags and elements that are interpreted by web browsers."
          },
          {
            "template": "code",
            "title": "HTML Boilerplate",
            "codeBlock": "<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>Document</title>\n  </head>\n  <body>\n    <!-- content here -->\n  </body>\n</html>",
            "description": "This basic HTML skeleton includes the doctype, root <html> element, metadata in <head>, and visible content in <body>."
          }
        ]
      },
      {
        "name": "Module 2: GitHub Repositories",
        "slides": [
          {
            "template": "module_intro",
            "moduleLabel": "Module 2",
            "title": "Creating a GitHub Repository",
            "bullets": [ "Navigate to GitHub", "Click on 'New' repository", "Configure repo settings" ]
          },
          {
            "template": "screenshot_tutorial",
            "title": "Click on the 'New' button",
            "subheading": "This opens the form to create a new repository.",
            "localImagePath": "./images/github-new-button.png", 
            "imagePrompt": "Fallback: Screenshot of New Button" 
          },
          {
            "template": "notes",
            "title": "Important Notes",
            "bullets": [ "Always check the repository name before creating.", "Use a meaningful description for your repository.", "Decide whether the repository should be public or private." ]
          }
        ]
      }
    ],
    "globalSlides": {
      "titleSlide": {
        "template": "title",
        "title": "HTML & GitHub Basics",
        "subtitle": "This is just the beginning of something big.",
        "localImagePath": "./snippet_1.png",
        "imagePrompt": "Fallback: Neon coding illustration"
      },
      "thankYouSlide": {
        "template": "thank_you",
        "title": "Thank You"
      }
    }
  }
};

// --- HELPERS ---

function hexToRgb(hex) {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  return { red: r, green: g, blue: b };
}

/**
 * Robustly parses padding values which might be numbers (40) or strings ("40px" or "64px 96px").
 * Returns a safe number (defaults to 40).
 */
function parsePadding(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Take the first number found (e.g. "64px 96px" -> 64)
    const match = val.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : NaN;
    return isNaN(num) ? 40 : num;
  }
  return 40;
}

const THEME_COLORS = {
  bg: hexToRgb(PRESENTATION_DATA.templates.theme.backgroundColor),
  text: hexToRgb(PRESENTATION_DATA.templates.theme.textColor),
  codeBg: hexToRgb("#111111"),
  accent: hexToRgb("#4285F4")
};

const FONTS = {
  heading: PRESENTATION_DATA.templates.theme.fontFamilyHeading,
  body: PRESENTATION_DATA.templates.theme.fontFamilyBody,
  code: "JetBrains Mono"
};

/** Uploads image to Drive and gets a link */
async function uploadImageToDrive(auth, filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const drive = google.drive({ version: 'v3', auth });
    const file = await drive.files.create({
      requestBody: { name: path.basename(filePath) },
      media: { mimeType: 'image/png', body: createReadStream(filePath) },
      fields: 'id',
    });
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });
    const result = await drive.files.get({
      fileId: file.data.id,
      fields: 'webContentLink',
    });
    return result.data.webContentLink;
  } catch (err) {
    console.error('Drive Upload Error:', err.message);
    return null;
  }
}

/**
 * Calculates estimated height of a text block to help with vertical centering.
 */
function estimateTextHeight(text, fontSize, width) {
  if (!text) return 0;
  // Ensure we have a valid width for calculation
  const safeWidth = (width && width > 0) ? width : 600;
  
  // Crude estimation: Average char width ~0.5 * fontSize
  const charsPerLine = safeWidth / (fontSize * 0.55); 
  const lines = Math.ceil(text.length / charsPerLine) + (text.match(/\n/g) || []).length;
  const lineHeight = fontSize * 1.3;
  return Math.max(lines * lineHeight, lineHeight) + 10; // +10 buffer
}

/**
 * --- SMART LAYOUT ENGINE ---
 * Calculates requests based on Content Size and Justification
 */
async function generateSlideRequests(auth, slideData, pageId, index) {
  const requests = [];
  
  // 1. Basic Slide Setup
  requests.push({
    createSlide: {
      objectId: pageId,
      insertionIndex: index,
      slideLayoutReference: { predefinedLayout: 'BLANK' }
    }
  });
  requests.push({
    updatePageProperties: {
      objectId: pageId,
      pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: THEME_COLORS.bg } } } },
      fields: "pageBackgroundFill"
    }
  });

  // 2. Determine Layout Strategy
  const layout = PRESENTATION_DATA.templates.slideTypes[slideData.template]?.layout?.container || { padding: 40, alignItems: 'flex-start', justifyContent: 'flex-start' };
  
  // ROBUST FIX: Parse padding to ensure it's a number. Invalid/String padding causes NaN coordinates.
  const padding = parsePadding(layout.padding);
  const usableWidth = Math.max(SLIDE_WIDTH - (padding * 2), 100); // Ensure width is never negative
  
  // 3. Prepare Content Objects (Calculate heights first)
  const elements = [];

  // Helper to register an element for placement
  const registerElement = (type, data) => {
    elements.push({ type, ...data });
  };

  // -- Analyze Content --
  
  // Images (Title slides often have images at top or middle)
  let imageLink = null;
  if (slideData.localImagePath || slideData.imagePrompt) {
     imageLink = await uploadImageToDrive(auth, slideData.localImagePath);
     // Fixed height for images for simplicity in calculation
     const imgHeight = slideData.template === 'title' ? 180 : 200; 
     registerElement('image', { height: imgHeight, link: imageLink, prompt: slideData.imagePrompt });
  }

  // Module Label
  if (slideData.moduleLabel) {
    const h = estimateTextHeight(slideData.moduleLabel, 18, usableWidth);
    registerElement('text', { text: slideData.moduleLabel, fontSize: 18, bold: true, font: FONTS.heading, color: THEME_COLORS.accent, height: h });
  }

  // Title
  if (slideData.title) {
    const size = slideData.template === 'title' ? 42 : 32;
    const h = estimateTextHeight(slideData.title, size, usableWidth);
    registerElement('text', { text: slideData.title, fontSize: size, bold: true, font: FONTS.heading, color: THEME_COLORS.text, height: h });
  }

  // Subtitle / Subheading
  if (slideData.subtitle) {
    const h = estimateTextHeight(slideData.subtitle, 20, usableWidth);
    registerElement('text', { text: slideData.subtitle, fontSize: 20, bold: false, font: FONTS.body, color: THEME_COLORS.text, height: h });
  }
  if (slideData.subheading) {
    const h = estimateTextHeight(slideData.subheading, 18, usableWidth);
    registerElement('text', { text: slideData.subheading, fontSize: 18, bold: false, font: FONTS.body, color: THEME_COLORS.text, height: h });
  }

  // Code Block
  if (slideData.codeBlock) {
    const h = 150; // Fixed height for code blocks
    registerElement('code', { text: slideData.codeBlock, height: h });
  }

  // Body Text
  if (slideData.body) {
    const h = estimateTextHeight(slideData.body, 14, usableWidth);
    registerElement('text', { text: slideData.body, fontSize: 14, bold: false, font: FONTS.body, color: THEME_COLORS.text, height: h });
  }

  // Description
  if (slideData.description) {
    const h = estimateTextHeight(slideData.description, 12, usableWidth);
    registerElement('text', { text: slideData.description, fontSize: 12, bold: false, font: FONTS.body, color: THEME_COLORS.text, height: h });
  }

  // Bullets
  if (slideData.bullets) {
    // Approx height: lines * 30pt
    const h = slideData.bullets.length * 35;
    registerElement('bullets', { text: slideData.bullets.join('\n'), fontSize: 18, font: FONTS.body, color: THEME_COLORS.text, height: h });
  }


  // 4. Calculate Vertical Start Position (Y)
  const totalContentHeight = elements.reduce((sum, el) => sum + el.height + 20, 0); // 20pt gap
  
  let currentY = padding;

  if (layout.justifyContent === 'center') {
    // Center vertically: (AvailableSpace - ContentHeight) / 2
    // If totalContentHeight > SLIDE_HEIGHT, default to padding (top align) to avoid negative Y
    const availableSpace = Math.max(0, SLIDE_HEIGHT - (padding * 2));
    const centeringOffset = (availableSpace - totalContentHeight) / 2;
    currentY = padding + Math.max(0, centeringOffset);
  } else if (layout.justifyContent === 'flex-end') {
    // Bottom align
    currentY = Math.max(padding, SLIDE_HEIGHT - totalContentHeight - padding);
  } else {
    // Top align ('flex-start')
    currentY = padding;
  }
  
  // Safety fallback if math goes wrong
  if (isNaN(currentY)) currentY = padding;

  // 5. Generate Requests for Elements
  elements.forEach(el => {
    const boxId = `${pageId}_el_${Math.random().toString(36).substr(2, 9)}`;
    
    // Horizontal Alignment
    let startX = padding;
    let alignStyle = 'START';
    
    if (layout.alignItems === 'center') {
      // For images/shapes, we physically move X. For text, we center align.
      alignStyle = 'CENTER';
    }

    if (el.type === 'image') {
       // Images need X calculation because they don't have "text-align"
       const imgWidth = usableWidth * 0.8;
       if (layout.alignItems === 'center') {
         startX = (SLIDE_WIDTH - imgWidth) / 2;
       } else {
         startX = padding;
       }

       if (el.link) {
         requests.push({
          createImage: {
            objectId: boxId,
            url: el.link,
            elementProperties: {
              pageObjectId: pageId,
              size: { height: { magnitude: el.height, unit: 'PT' }, width: { magnitude: imgWidth, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: 'PT' }
            }
          }
         });
       } else {
         // Placeholder
         requests.push({
           createShape: {
             objectId: boxId,
             shapeType: 'ROUND_RECTANGLE',
             elementProperties: {
               pageObjectId: pageId,
               size: { height: { magnitude: el.height, unit: 'PT' }, width: { magnitude: imgWidth, unit: 'PT' } },
               transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: 'PT' }
             }
           }
         });
         requests.push({
            updateShapeProperties: {
                objectId: boxId,
                shapeProperties: {
                    shapeBackgroundFill: { solidFill: { color: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } } } },
                    outline: { outlineFill: { solidFill: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } } } }
                },
                fields: "shapeBackgroundFill,outline"
            }
         });
         requests.push({ insertText: { objectId: boxId, text: `[Image]\n${el.prompt}` } });
       }
    } else if (el.type === 'code') {
        requests.push({
            createShape: {
                objectId: boxId,
                shapeType: 'RECTANGLE',
                elementProperties: {
                    pageObjectId: pageId,
                    size: { height: { magnitude: el.height, unit: 'PT' }, width: { magnitude: usableWidth, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: 'PT' }
                }
            }
        });
        requests.push({
            updateShapeProperties: {
                objectId: boxId,
                shapeProperties: {
                    shapeBackgroundFill: { solidFill: { color: { rgbColor: THEME_COLORS.codeBg } } },
                    outline: { outlineFill: { solidFill: { alpha: 0 } } }
                },
                fields: "shapeBackgroundFill,outline"
            }
        });
        requests.push({ insertText: { objectId: boxId, text: el.text } });
        requests.push({
            updateTextStyle: {
                objectId: boxId,
                style: { fontFamily: FONTS.code, fontSize: { magnitude: 14, unit: 'PT' }, foregroundColor: { opaqueColor: { rgbColor: {red:0.8,green:0.8,blue:0.8} } } },
                fields: "fontFamily,fontSize,foregroundColor"
            }
        });
    } else {
        // Text / Bullets
        requests.push({
            createShape: {
                objectId: boxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                    pageObjectId: pageId,
                    size: { height: { magnitude: el.height, unit: 'PT' }, width: { magnitude: usableWidth, unit: 'PT' } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: 'PT' }
                }
            }
        });
        requests.push({ insertText: { objectId: boxId, text: el.text } });
        requests.push({
            updateTextStyle: {
                objectId: boxId,
                style: {
                    fontFamily: el.font,
                    fontSize: { magnitude: el.fontSize, unit: 'PT' },
                    bold: el.bold || false,
                    foregroundColor: { opaqueColor: { rgbColor: el.color } }
                },
                fields: "fontFamily,fontSize,bold,foregroundColor"
            }
        });
        
        // Apply Center or Left alignment
        requests.push({
            updateParagraphStyle: {
                objectId: boxId,
                style: { alignment: alignStyle },
                fields: "alignment"
            }
        });

        if (el.type === 'bullets') {
             requests.push({
                createParagraphBullets: {
                    objectId: boxId,
                    textRange: { type: 'ALL' },
                    bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
                }
            });
        }
    }

    currentY += el.height + 20; // Move cursor
  });

  return requests;
}

// --- AUTH ---
async function authorize() {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const client = new google.auth.OAuth2(key.client_id, key.client_secret, 'http://localhost:8080/');

  try {
    const tokenData = await fs.readFile(TOKEN_PATH);
    const tokens = JSON.parse(tokenData);
    client.setCredentials(tokens);
    await client.getAccessToken();
    return client;
  } catch (err) {
    console.log('Token error, please delete token.json and restart to re-auth.');
    return getNewToken(client);
  }
}

async function getNewToken(client) {
  return new Promise((resolve, reject) => {
    const authUrl = client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
    console.log('Authorize:', authUrl);
    const server = http.createServer(async (req, res) => {
        if (req.url.indexOf('/') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:8080').searchParams;
            if (qs.get('code')) {
                res.end('Auth successful');
                const { tokens } = await client.getToken(qs.get('code'));
                client.setCredentials(tokens);
                await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
                server.close();
                resolve(client);
            }
        }
    }).listen(8080, () => open(authUrl));
  });
}


// --- MAIN ---
async function createDynamicPresentation(auth) {
  const slidesApi = google.slides({ version: 'v1', auth });
  
  console.log(`Creating presentation: "${PRESENTATION_DATA.content.topic}"...`);
  const presentation = await slidesApi.presentations.create({
    requestBody: { title: PRESENTATION_DATA.content.topic }
  });
  const presentationId = presentation.data.presentationId;

  let allRequests = [];
  let slideIndex = 1;
  console.log("Generating slides and uploading images...");

  // Title
  allRequests.push(...await generateSlideRequests(auth, PRESENTATION_DATA.content.globalSlides.titleSlide, `slide_title`, slideIndex++));

  // Modules
  for (const [mIdx, module] of PRESENTATION_DATA.content.modules.entries()) {
    for (const [sIdx, slide] of module.slides.entries()) {
        allRequests.push(...await generateSlideRequests(auth, slide, `slide_m${mIdx}_s${sIdx}`, slideIndex++));
    }
  }

  // Thank You
  allRequests.push(...await generateSlideRequests(auth, PRESENTATION_DATA.content.globalSlides.thankYouSlide, `slide_ty`, slideIndex++));
  allRequests.push({ deleteObject: { objectId: presentation.data.slides[0].objectId } });

  console.log(`Executing ${allRequests.length} changes...`);
  await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: allRequests }
  });
  console.log(`View here: https://docs.google.com/presentation/d/${presentationId}/edit`);
}

try {
  const auth = await authorize();
  await createDynamicPresentation(auth);
} catch (e) {
  console.error(e);
}