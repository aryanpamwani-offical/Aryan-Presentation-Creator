import { createSlideIds } from "../constants/theme/generateId.js";
import { elementSelect, selectTextStyle, translateX_and_translateY, bullet_disc } from "../utils/text_utils.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";

/**
 * Build a presentation with Title, Module, and Thank You slides
 * @returns {Array} requests - Google Slides API batchUpdate requests
 */
const buildPresentation = () => {
  const requests = [];
  const slideIds = [];

  // --- Title Slide ---
  const { pageId: titlePageId, elements: titleElements } = createSlideIds("Title");
  requests.push({
    createSlide: { objectId: titlePageId, insertionIndex: 0 }
  });
  slideIds.push(titlePageId);


// Title text box
requests.push({
  createShape: {
    objectId: titleElements.title,
    shapeType: "TEXT_BOX",
    elementProperties: {
      pageObjectId: titlePageId,
      ...elementSelect("title", "Welcome to My Presentation")[0],
      transform: translateX_and_translateY("Title", "title"),
    },
  },
});

// Insert text into that box
requests.push({
  insertText: {
    objectId: titleElements.title,
    text: "Welcome to My Presentation",
    insertionIndex: 0,
  },
});

// Apply style
requests.push(selectTextStyle("title", titleElements.title));

 
  

  // --- Apply Background Color to All Slides ---
  slideIds.forEach((id) => {
    requests.push({
      updatePageProperties: {
        objectId: id,
        pageProperties: {
          pageBackgroundFill: {
            solidFill: { color: { rgbColor: THEME_COLORS.bg } }
          }
        },
        fields: "pageBackgroundFill.solidFill.color"
      }
    });
  });

  return requests;
};

export default buildPresentation;
