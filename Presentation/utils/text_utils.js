import THEME_FONTS from "../constants/theme/theme_fonts.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";
import THEME_FONTS_SIZE from "../constants/theme/theme_font_size.js";
import THEME_FONTS_WEIGHT from "../constants/theme/theme_font_weight.js";
import estimateTextHeight from "../config/dimension_calculator/textbox-height-calculator.js";
import widthcalculator from "../config/dimension_calculator/width_calculator.js";
import { title_padding } from "../constants/theme/padding.js";

const SLIDE_WIDTH = 720;
const SLIDE_HEIGHT = 405;

const textFields = {
  moduleLabel: {
    key: 'moduleLabel',
    size: THEME_FONTS_SIZE.moduleLabel,
    bold: true,
    font: THEME_FONTS.heading,
    color: THEME_COLORS.accent
  },
  title: {
    key: 'title',
    size: THEME_FONTS_SIZE.title,
    bold: true,
    font: THEME_FONTS.heading,
    color: THEME_COLORS.text
  },
  subTitle: {
    key: 'subtitle',
    size: THEME_FONTS_SIZE.subTitle,
    bold: false,
    font: THEME_FONTS.body,
    color: THEME_COLORS.accent
  },
  subHeading: {
    key: 'subheading',
    size: THEME_FONTS_SIZE.subHeadng,
    bold: false,
    font: THEME_FONTS.body,
    color: THEME_COLORS.text
  },
  body: {
    key: 'body',
    size: THEME_FONTS_SIZE.body,
    bold: false,
    font: THEME_FONTS.body,
    color: THEME_COLORS.text
  },
  description: {
    key: 'description',
    size: THEME_FONTS_SIZE.description,
    bold: false,
    font: THEME_FONTS.body,
    color: THEME_COLORS.text
  },

  // ── Title Slide specific styles ──────────────────────────────────────────
 
  titleSlideSubtitle: {
    key: 'titleSlideSubtitle',
    size: THEME_FONTS_SIZE.body,
    bold: false,
    font: THEME_FONTS.body,
   // weight: THEME_FONTS_SIZE.title,
    color: THEME_COLORS.secondaryText
  }
};

// ─── helpers ────────────────────────────────────────────────────────────────

const elementSelect = (selectedType, text) => {
  const request = [];
  const widthVal = widthcalculator(title_padding);

  if (textFields[selectedType]) {
    const field = textFields[selectedType];
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, field.size, widthVal), unit: 'PT' },
        width:  { magnitude: widthVal, unit: 'PT' }
      }
    });
  }

  return request;
};

/**
 * Builds an updateTextStyle request from a textFields key.
 * Supports the optional `weight` property used by titleSlide variants.
 */
const selectTextStyle = (selectedStyle, elementId) => {
  try {
    const field = textFields[selectedStyle];
    if (!field) throw new Error(`Unknown style: ${selectedStyle}`);

    // Prefer explicit weight, fall back to bold flag → theme weights
    const fontWeight =
      field.weight !== undefined
        ? field.weight
        : field.bold
        ? THEME_FONTS_WEIGHT.bold
        : THEME_FONTS_WEIGHT.normal;

    return {
      updateTextStyle: {
        objectId: elementId,
        style: {
          fontSize: { magnitude: field.size, unit: 'PT' },
          bold: field.bold,
          weightedFontFamily: {
            fontFamily: field.font,
            weight: fontWeight
          },
          foregroundColor: {
            opaqueColor: { rgbColor: field.color }
          }
        },
        fields: 'fontSize,bold,weightedFontFamily,foregroundColor'
      }
    };
  } catch (error) {
    console.log(error);
  }
};

const bullet_disc = (bullet_id) => {
  return [
    {
      createParagraphBullets: {
        objectId: bullet_id,
        textRange: { type: 'ALL' },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
      }
    }
  ];
};

const updateParagraphStyle = (objectId, alignType) => {
  let alignment = 'START';
  if (alignType === 'CENTER' || alignType === 'center') alignment = 'CENTER';
  if (alignType === 'END'    || alignType === 'right')  alignment = 'END';

  return {
    updateParagraphStyle: {
      objectId,
      style: { alignment },
      fields: 'alignment'
    }
  };
};

const translateX_and_translateY = (layoutProps, metrics) => {
  const {
    alignItems    = 'flex-start',
    justifyContent = 'flex-start',
    padding       = 40
  } = layoutProps || {};

  const {
    elementWidth       = SLIDE_WIDTH - padding * 2,
    elementHeight      = 0,
    totalContentHeight = 0,
    currentOffsetY     = 0
  } = metrics || {};

  let xPt = alignItems === 'center' ? (SLIDE_WIDTH - elementWidth) / 2 : padding;

  const availableSpace = Math.max(0, SLIDE_HEIGHT - padding * 2);
  let startY = padding;

  if (justifyContent === 'center') {
    startY = padding + Math.max(0, (availableSpace - totalContentHeight) / 2);
  } else if (justifyContent === 'flex-end') {
    startY = Math.max(padding, SLIDE_HEIGHT - totalContentHeight - padding);
  }

  return { scaleX: 1, scaleY: 1, translateX: xPt, translateY: startY + currentOffsetY, unit: 'PT' };
};

export {
  textFields,
  selectTextStyle,
  elementSelect,
  translateX_and_translateY,
  bullet_disc,
  updateParagraphStyle
};