import { title_padding } from "../constants/theme/padding.js";
import { translateX_and_translateY } from "./text_utils.js";


// 1. Centralize your dimensions in a config object
export const IMAGE_CONFIG = {
    Code: { height: 6.95, width: 3.45 },
    Title: { height: 2.5, width: 2.5 },
    // Easy to add more types here later, like 'Content' or 'Footer'
};

export const PT_UNIT = 72;
export const convertToPt = (value) => Math.round(value * PT_UNIT);

const createImage = (imageId, pageId, link, slideType, currentOffsetY = 0) => {
    let requests = []
    // 2. Get dimensions based on slideType, fallback to a default if not found
    const dim = IMAGE_CONFIG[slideType] || IMAGE_CONFIG.Code;

    // 3. Get the transform data once to keep the code clean
    let imageLayout = {
        alignItems: 'center',
        justifyContent: 'center',
        padding: title_padding,
    }
    let imageMetrics = {
        elementWidth: convertToPt(dim.width),
        elementHeight: convertToPt(dim.height),
        totalContentHeight: convertToPt(dim.height),
        currentOffsetY: currentOffsetY
    }
    const transformData = translateX_and_translateY(imageLayout, imageMetrics);
    // 4. Pushing the image component into the array
    requests.push({
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
                    ...transformData,
                    unit: 'PT'
                }
            }
        }
    })
    // 5. Return the single request structure
    return requests;
};

export default createImage;