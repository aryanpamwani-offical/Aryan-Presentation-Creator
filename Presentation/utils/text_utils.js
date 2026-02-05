import THEME_FONTS from "../constants/theme/theme_fonts.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";
import THEME_FONTS_SIZE from "../constants/theme/theme_font_size.js";
import THEME_FONTS_WEIGHT from "../constants/theme/theme_font_weight.js"; // assuming you have this
import estimateTextHeight from "../config/dimension_calculator/textbox-height-calculator.js";
import widthcalculator from "../config/dimension_calculator/width_calculator.js";
import { title_padding } from "../constants/theme/padding.js";

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
    color: THEME_COLORS.text
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
 */
const elementSelect = (selectedType, text) => {
  const request = [];
  
  if (selectedType === 'moduleLabel') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.moduleLabel, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  } else if (selectedType === 'title') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.title, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  } else if (selectedType === 'subTitle') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.subTitle, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  } else if (selectedType === 'subHeading') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.subHeadng, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  } else if (selectedType === 'body') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.body, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  } else if (selectedType === 'description') {
    request.push({
      size: {
        height: { magnitude: estimateTextHeight(text, THEME_FONTS_SIZE.description, widthcalculator(title_padding)), unit: 'PT' },
        width: { magnitude: widthcalculator(title_padding), unit: 'PT' }
      }
    });
  }
  
  return request;
}

const selectTextStyle = (selectedStyle, elementId) => {
  try {
    
    if (selectedStyle === 'moduleLabel') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.moduleLabel, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.heading,
              weight: THEME_FONTS_WEIGHT.bold
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.accent }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else if (selectedStyle === 'title') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.title, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.heading,
              weight: THEME_FONTS_WEIGHT.bold
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.text }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else if (selectedStyle === 'subTitle') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.subTitle, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.body,
              weight: THEME_FONTS_WEIGHT.normal
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.text }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else if (selectedStyle === 'subHeading') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.subHeadng, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.body,
              weight: THEME_FONTS_WEIGHT.normal
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.text }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else if (selectedStyle === 'body') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.body, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.body,
              weight: THEME_FONTS_WEIGHT.normal
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.text }
            }
          },
          fields: 'fontSize,weightedFontFamily,foregroundColor'
        }
      };
    } else if (selectedStyle === 'description') {
      return {
        updateTextStyle: {
          objectId: elementId,
          style: {
            fontSize: { magnitude: THEME_FONTS_SIZE.description, unit: 'PT' },
            weightedFontFamily: {
              fontFamily: THEME_FONTS.body,
              weight: THEME_FONTS_WEIGHT.normal
            },
            foregroundColor: {
              opaqueColor: { rgbColor: THEME_COLORS.text }
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

const translateX_and_translateY = (slideType, elementType, index = 0) => {
  const INCH_TO_PT = 28;
  let xInches = 0;
  let yInches = 0;

  switch (slideType) {
    // 1. Concept Slide
    case 'Concept':
      if (elementType === 'title') {
        xInches = 1;
        yInches = 1.85;
      } else if (elementType === 'description') {
        xInches = 1;
        yInches = 3.05;
      }
      break;

    // 2. Module Slide
    case 'Module':
      if (elementType === 'moduleLabel') { // "Module Number"
        xInches = 1.25;
        yInches = 2.1;
      } else if (elementType === 'title') {
        xInches = 1.25;
        yInches = 2.53;
      } else if (elementType === 'body') { // "Bullet Points"
        xInches = 1.58;
        // Base Y is 3.83, add 0.52 for every subsequent item
        yInches = 3.83 + (index * 0.52); 
      }
      break;

    // 3. Code Slide
    case 'Code':
      if (elementType === 'image') {
        xInches = 1;
        yInches = 2.41;
      } else if (elementType === 'description') {
        xInches = 1;
        yInches = 6.03;
      }
      break;

    // 4. Title Slide
    case 'Title':
      if (elementType === 'image') {
        xInches = 4.72;
        yInches = 1.2;
      } else if (elementType === 'title') {
        xInches = 3.16;
        yInches = 5.73;
      } else if (elementType === 'description') {
        xInches = 3.06;
        yInches = 6.58;
      }
      break;

    // 5. ThankYou Slide
    case 'ThankYou':
      if (elementType === 'mainText') {
        xInches = 4.53;
        yInches = 3.3;
      }
      break;

    default:
      console.warn(`Unknown slide type or element: ${slideType} - ${elementType}`);
      return null;
  }

  return {
    scaleX: 1,
    scaleY: 1,
    translateX: xInches * INCH_TO_PT,
    translateY: yInches * INCH_TO_PT,
    unit: 'PT'
  };
};


export { textFields, selectTextStyle, elementSelect,translateX_and_translateY, bullet_disc };
