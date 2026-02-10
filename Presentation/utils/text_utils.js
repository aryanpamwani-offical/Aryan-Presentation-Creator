import THEME_FONTS from "../constants/theme/theme_fonts.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";
import THEME_FONTS_SIZE from "../constants/theme/theme_font_size.js";
import THEME_FONTS_WEIGHT from "../constants/theme/theme_font_weight.js";
import estimateTextHeight from "../config/dimension_calculator/textbox-height-calculator.js";
import widthcalculator from "../config/dimension_calculator/width_calculator.js";
import { title_padding } from "../constants/theme/padding.js"; // Keep specific padding imports if used in elementSelect

// Standard 16:9 Slide Dimensions (in Points)
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
  }
};

/**
 * Select element properties based on element type
 * (Retained from your original file)
 */
const elementSelect = (selectedType, text) => {
  const request = [];
  
  // Note: This logic calculates specific box sizes. 
  // Ensure 'widthcalculator(title_padding)' aligns with the actual padding used in the slide layout.
  
  const widthVal = widthcalculator(title_padding); 
  // You might want to pass the specific padding dynamically in the future, 
  // but for now, we keep your existing logic.

  if (textFields[selectedType]) {
     const field = textFields[selectedType];
     request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, field.size, widthVal), unit: 'PT' },
        width: { magnitude: widthVal, unit: 'PT' }
      }
    });
  }
  
  return request;
}

const selectTextStyle = (selectedStyle, elementId) => {
  try {
    const field = textFields[selectedStyle];
    if (field) {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: field.size, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: field.font,
              weight: field.bold ? THEME_FONTS_WEIGHT.bold : THEME_FONTS_WEIGHT.normal
            },
            foregroundColor: {
              opaqueColor: { rgbColor: field.color }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else {
      throw new Error(`Unknown style: ${selectedStyle}`);
    }
  } catch (error) {
    console.log(error)
  }
};

const bullet_disc=(bullet_id)=>{
  const request=[];
    request.push({
        createParagraphBullets: {
            objectId: bullet_id,
            textRange: { type: 'ALL' },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
        }
    });
    return request;
}
const updateParagraphStyle = (objectId, alignType) => {
  // Map your config constants to Google API constants
  // Assuming 'center_align' string equals 'CENTER' or you map it here
  // Google API values: 'START', 'CENTER', 'END', 'JUSTIFIED'
  
  let alignment = 'START'; 
  if (alignType === 'CENTER' || alignType === 'center') alignment = 'CENTER';
  if (alignType === 'END' || alignType === 'right') alignment = 'END';

  return {
    updateParagraphStyle: {
      objectId: objectId,
      style: {
        alignment: alignment
      },
      fields: 'alignment'
    }
  };
};

const translateX_and_translateY = (layoutProps, metrics) => {
  // Destructure with safe defaults
  const { 
    alignItems = 'flex-start', 
    justifyContent = 'flex-start', 
    padding = 40 
  } = layoutProps || {};

  const {
    elementWidth = SLIDE_WIDTH - (padding * 2),
    elementHeight = 0,
    totalContentHeight = 0,
    currentOffsetY = 0
  } = metrics || {};

  // 1. Calculate Horizontal Position (X)
  let xPt = padding;
  
  if (alignItems === 'center') {
    // Center logic: (SlideWidth - ElementWidth) / 2
    xPt = (SLIDE_WIDTH - elementWidth) / 2;
  } else {
    // Default / flex-start logic: Just use padding
    xPt = padding;
  }

  // 2. Calculate Vertical Start Position (Y) of the entire stack
  let startY = padding;
  const availableSpace = Math.max(0, SLIDE_HEIGHT - (padding * 2));

  if (justifyContent === 'center') {
    // Center vertically: (AvailableSpace - TotalStackHeight) / 2
    const centeringOffset = (availableSpace - totalContentHeight) / 2;
    // Ensure we don't start off-screen (negative) if content is huge
    startY = padding + Math.max(0, centeringOffset);
  } else if (justifyContent === 'flex-end') {
    // Bottom align: SlideHeight - TotalStackHeight - Padding
    startY = Math.max(padding, SLIDE_HEIGHT - totalContentHeight - padding);
  } else {
    // Top align: padding
    startY = padding;
  }

  // 3. Final Y for this specific element
  const yPt = startY + currentOffsetY;

  return {
    scaleX: 1,
    scaleY: 1,
    translateX: xPt,
    translateY: yPt,
    unit: 'PT'
  };
};

export { textFields, selectTextStyle, elementSelect, translateX_and_translateY, bullet_disc,updateParagraphStyle };