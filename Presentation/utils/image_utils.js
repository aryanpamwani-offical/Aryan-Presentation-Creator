import { translateX_and_translateY } from "./textbox.js";

// 1. Centralize your dimensions in a config object
export const IMAGE_CONFIG = {
    Code: { height: 6.95, width: 3.45 },
    Title: { height: 4.1, width: 4.1 },
    // Easy to add more types here later, like 'Content' or 'Footer'
};

export const PT_UNIT = 28;
export const convertToPt = (value) => Math.round(value * PT_UNIT);

const createImage = (imageId, pageId, link, slideType, elementType) => {
    // 2. Get dimensions based on slideType, fallback to a default if not found
    const dim = IMAGE_CONFIG[slideType] || IMAGE_CONFIG.Code;
    
    // 3. Get the transform data once to keep the code clean
    const transformData = translateX_and_translateY(slideType, elementType);

    // 4. Return the single request structure
    return [{
        createImage: {
            objectId: imageId,
            url: link,
            elementProperties: {
                pageObjectId: pageId,
                size: {
                    height: { magnitude: convertToPt(dim.height), unit: 'PT' },
                    width: { magnitude: convertToPt(dim.width), unit: 'PT' }
                },
                transform: {
                    ...transformData, // Spread operator pulls in scaleX, scaleY, etc.
                    unit: 'PT'
                }
            }
        }
    }];
};

export default createImage;