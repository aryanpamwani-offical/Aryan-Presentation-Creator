import { THEME_COLORS, FONTS, FONT_SIZES, FONT_WEIGHTS, PADDING } from "../constants/theme/index.js";
import { estimateTextHeight, widthCalculator } from "../config/dimension_calculator/index.js";

const SLIDE_WIDTH = 720;
const SLIDE_HEIGHT = 405;

const textFields = {
  moduleLabel: {
    key: 'moduleLabel',
    size: FONT_SIZES.moduleLabel,
    bold: true,
    font: FONTS.heading,
    color: THEME_COLORS.accent
  },
  title: {
    key: 'title',
    size: FONT_SIZES.title,
    bold: true,
    font: FONTS.heading,
    color: THEME_COLORS.text
  },
  subTitle: {
    key: 'subtitle',
    size: FONT_SIZES.subTitle,
    bold: false,
    font: FONTS.body,
    color: THEME_COLORS.accent
  },
  subHeading: {
    key: 'subheading',
    size: FONT_SIZES.subHeadng,
    bold: false,
    font: FONTS.body,
    color: THEME_COLORS.text
  },
  body: {
    key: 'body',
    size: FONT_SIZES.body,
    bold: false,
    font: FONTS.body,
    color: THEME_COLORS.text
  },
  description: {
    key: 'description',
    size: FONT_SIZES.description,
    bold: false,
    font: FONTS.body,
    color: THEME_COLORS.text
  },
  titleSlideSubtitle: {
    key: 'titleSlideSubtitle',
    size: FONT_SIZES.body,
    bold: false,
    font: FONTS.body,
    color: THEME_COLORS.secondaryText
  }
};

const elementSelect = (selectedType, text) => {
  const request = [];
  const widthVal = widthCalculator(PADDING.title_padding);

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

const selectTextStyle = (selectedStyle, elementId) => {
  try {
    const field = textFields[selectedStyle];
    if (!field) throw new Error(`Unknown style: ${selectedStyle}`);

    const fontWeight =
      field.weight !== undefined
        ? field.weight
        : field.bold
        ? FONT_WEIGHTS.bold
        : FONT_WEIGHTS.normal;

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