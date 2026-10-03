export const SLIDE_WIDTH = 720;
export const SLIDE_HEIGHT = 405;

/**
 * Proportional character width ratios (relative to font size) for Poppins Bold (weight 700).
 * Measured directly against Google Fonts Poppins Bold font metrics.
 */
export const POPPINS_BOLD_CHAR_WIDTHS: Record<string, number> = {
  "0":0.65,"1":0.38,"2":0.57,"3":0.61,"4":0.68,"5":0.65,"6":0.64,"7":0.54,"8":0.65,"9":0.62,
  " ":0.25,"!":0.39,"\"":0.41,"#":0.90,"$":0.66,"%":0.87,"&":0.80,"'":0.22,"(":0.48,")":0.48,
  "*":0.53,"+":0.63,",":0.29,"-":0.58,".":0.28,"/":0.45,":":0.28,";":0.35,"<":0.55,"=":0.70,
  ">":0.54,"?":0.54,"@":1.08,"A":0.74,"B":0.66,"C":0.76,"D":0.73,"E":0.54,"F":0.55,"G":0.76,
  "H":0.73,"I":0.30,"J":0.58,"K":0.70,"L":0.48,"M":0.92,"N":0.75,"O":0.79,"P":0.62,"Q":0.79,
  "R":0.65,"S":0.62,"T":0.59,"U":0.71,"V":0.73,"W":1.05,"X":0.72,"Y":0.67,"Z":0.60,"[":0.51,
  "\\":0.80,"]":0.51,"^":0.71,"_":0.78,"`":0.29,"a":0.68,"b":0.68,"c":0.61,"d":0.68,"e":0.62,
  "f":0.36,"g":0.68,"h":0.67,"i":0.30,"j":0.29,"k":0.62,"l":0.30,"m":1.06,"n":0.67,"o":0.64,
  "p":0.68,"q":0.68,"r":0.43,"s":0.56,"t":0.41,"u":0.67,"v":0.63,"w":0.87,"x":0.59,"y":0.63,
  "z":0.50,"{":0.50,"|":0.29,"}":0.50,"~":0.64
};

const FONT_CHAR_WIDTH_RATIO: Record<string, number> = {
  inter: 0.52,
  roboto: 0.52,
  arial: 0.5,
  helvetica: 0.5,
  'times new roman': 0.48,
  georgia: 0.5,
  'courier new': 0.6,
  'open sans': 0.53,
  lato: 0.51,
  montserrat: 0.54,
  poppins: 0.64,
  __default__: 0.52
};

export const heightCalculator = (padding: number) => Math.max(SLIDE_HEIGHT - (padding * 2), 100);
export const widthCalculator = (padding: number) => Math.max(SLIDE_WIDTH - (padding * 2), 100);

export function measureWordWidth(word: string, fontSize: number): number {
  let w = 0;
  for (const ch of word) {
    w += (POPPINS_BOLD_CHAR_WIDTHS[ch] ?? 0.62) * fontSize;
  }
  return w;
}

export interface TitleLayoutOptions {
  lineHeight?: number;
  baseHeight?: number;
  boxPadding?: number;
}

export interface TitleLayoutResult {
  lineCount: number;
  height: number;
  lines: string[];
  isMultiLine: boolean;
}

/**
 * Determines the optimal title font size so that individual words do not break/hyphenate
 * across lines. If any word exceeds the usable container width, scales down the font size.
 */
export function getOptimalTitleFontSize(
  text: string,
  maxWidth: number,
  baseFontSize: number = 42,
  minFontSize: number = 28,
  boxPadding: number = 16
): number {
  if (!text || typeof text !== 'string' || !text.trim()) return baseFontSize;
  const usableWidth = Math.max(40, maxWidth - boxPadding);
  const words = text.trim().split(/\s+/).filter(Boolean);

  let minScale = 1.0;
  for (const word of words) {
    const wordWidthAtBase = measureWordWidth(word, baseFontSize);
    if (wordWidthAtBase > usableWidth) {
      const requiredScale = usableWidth / wordWidthAtBase;
      if (requiredScale < minScale) {
        minScale = requiredScale;
      }
    }
  }

  if (minScale < 1.0) {
    // Apply 2% buffer so words do not touch the text box margin boundary
    const scaled = Math.floor(baseFontSize * minScale * 0.98);
    return Math.max(minFontSize, Math.min(baseFontSize, scaled));
  }

  return baseFontSize;
}

/**
 * Calculates the number of lines a title will occupy and the corresponding height needed.
 * Uses realistic proportional character metrics and word-wrapping simulation matching
 * Google Slides text rendering.
 */
export const calculateTitleLayout = (
  text: string,
  maxWidth: number = 600,
  fontSize: number = 42,
  options?: TitleLayoutOptions
): TitleLayoutResult => {
  const baseHeight = options?.baseHeight ?? 50;
  const lineIncrement = options?.lineHeight ?? Math.round(fontSize * 1.1);

  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      lineCount: 1,
      height: baseHeight,
      lines: [''],
      isMultiLine: false
    };
  }

  const cleanText = text.trim();
  const boxPadding = options?.boxPadding ?? 16; // Internal padding of Google Slides text box (8pt each side)
  const usableWidth = Math.max(40, maxWidth - boxPadding);
  const spaceWidth = (POPPINS_BOLD_CHAR_WIDTHS[' '] ?? 0.25) * fontSize;

  const rawParagraphs = cleanText.split('\n');
  const wrappedLines: string[] = [];

  for (const paragraph of rawParagraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) {
      wrappedLines.push('');
      continue;
    }

    const words = trimmedPara.split(/\s+/).filter(Boolean);
    let currentLine = '';
    let currentLineWidth = 0;

    for (const word of words) {
      const wordWidth = measureWordWidth(word, fontSize);

      if (!currentLine) {
        if (wordWidth > usableWidth) {
          // Word alone exceeds usable width: Google Slides wraps it across multiple lines
          const wordLines = Math.max(1, Math.ceil(wordWidth / usableWidth));
          wrappedLines.push(word);
          for (let i = 1; i < wordLines; i++) {
            wrappedLines.push('');
          }
          currentLine = '';
          currentLineWidth = 0;
        } else {
          currentLine = word;
          currentLineWidth = wordWidth;
        }
      } else {
        const potentialWidth = currentLineWidth + spaceWidth + wordWidth;
        if (potentialWidth <= usableWidth) {
          currentLine += ' ' + word;
          currentLineWidth = potentialWidth;
        } else {
          // Does not fit on current line, wrap to next line
          wrappedLines.push(currentLine);
          if (wordWidth > usableWidth) {
            // Word alone exceeds usable width on next line
            const wordLines = Math.max(1, Math.ceil(wordWidth / usableWidth));
            wrappedLines.push(word);
            for (let i = 1; i < wordLines; i++) {
              wrappedLines.push('');
            }
            currentLine = '';
            currentLineWidth = 0;
          } else {
            currentLine = word;
            currentLineWidth = wordWidth;
          }
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  const lineCount = Math.max(1, wrappedLines.length);
  const height = Math.round(baseHeight + (lineCount - 1) * lineIncrement);

  return {
    lineCount,
    height,
    lines: wrappedLines,
    isMultiLine: lineCount > 1
  };
};

export const estimateTextHeight = (
  text: string,
  fontSize: number,
  width: number,
  fontFamily: string = 'Inter'
): number => {
  if (!text || fontSize <= 0) return 0;
  const widthPt = (width > 0 ? width : 480) > 100000 ? width / 12700 : width;

  if (fontFamily.toLowerCase().trim() === 'poppins' || fontSize >= 36) {
    return calculateTitleLayout(text, widthPt, fontSize).height;
  }

  const defaultRatio = fontSize >= 32 ? 0.62 : (FONT_CHAR_WIDTH_RATIO.__default__ || 0.52);
  const charWidthPt = fontSize * (FONT_CHAR_WIDTH_RATIO[fontFamily.toLowerCase().trim()] ?? defaultRatio);
  const charsPerLine = Math.max(1, Math.floor(widthPt / charWidthPt));
  const lineHeightPt = fontSize * 1.3;

  const totalLines = text.split('\n').reduce((sum, segment) => {
    if (!segment) return sum + 1;
    return sum + Math.max(1, Math.ceil(segment.length / charsPerLine));
  }, 0);

  return totalLines * lineHeightPt + 8;
};

export default estimateTextHeight;
