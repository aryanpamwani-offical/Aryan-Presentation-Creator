export const SLIDE_WIDTH = 720;
export const SLIDE_HEIGHT = 405;

const FONT_CHAR_WIDTH_RATIO = {
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
  __default__: 0.5
};

export const heightCalculator = (padding) => Math.max(SLIDE_HEIGHT - (padding * 2), 100);
export const widthCalculator = (padding) => Math.max(SLIDE_WIDTH - (padding * 2), 100);

export const estimateTextHeight = (text, fontSize, width, fontFamily = 'Inter') => {
  if (!text || fontSize <= 0) return 0;
  const widthPt = (width > 0 ? width : 480) > 100000 ? width / 12700 : width;
  const charWidthPt = fontSize * (FONT_CHAR_WIDTH_RATIO[fontFamily.toLowerCase().trim()] ?? FONT_CHAR_WIDTH_RATIO.__default__);
  const charsPerLine = Math.floor(widthPt / charWidthPt);
  const lineHeightPt = fontSize * 1.3;

  const totalLines = text.split('\n').reduce((sum, segment) => {
    if (!segment) return sum + 1;
    return sum + Math.max(1, Math.ceil(segment.length / charsPerLine));
  }, 0);

  return totalLines * lineHeightPt + 4;
};

export default estimateTextHeight;
