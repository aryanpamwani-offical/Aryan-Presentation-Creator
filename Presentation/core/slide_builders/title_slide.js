
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes } from "../../constants/theme/slide_types.js";
import compress_image_upload from "../../utils/compress_image_upload.js";
import createImage from "../../utils/image_utils.js";

const buildTitleSlide = async (titlePageId, titleElements, slideData) => {
    const requests = [];

    // 1. Setup Data
    const { title, localImagePath, imageUrl } = slideData;
    const titleText = title || "Untitled Presentation";
    const containerConfig = slideTypes["title"].layout.container;

    // 2. Calculate Size & Positioning
    const titleSizeData = elementSelect("title", titleText)[0];
    const titleHeight = titleSizeData.size.height.magnitude;
    const titleWidth = titleSizeData.size.width.magnitude;

    const gap = 20;
    const shiftUp = 10;
    const imageOffset = -((titleHeight + gap) / 2) - shiftUp;

    // Calculate Text Transform (Centered by default)
    const titleTransform = translateX_and_translateY(
        containerConfig,
        {
            elementWidth: titleWidth,
            elementHeight: titleHeight,
            totalContentHeight: titleHeight,
        }
    );

    // 3. Compress and Upload Image (or use existing URL)
    let finalImageUrl = imageUrl;

    // If no URL, try local path (assuming in 'logos')
    if (!finalImageUrl && localImagePath) {
        const result = await compress_image_upload(localImagePath, 'Title', 'logos');
        if (result && result.ImageUrl) finalImageUrl = result.ImageUrl;
    }

    // Fallback if still no image
    if (!finalImageUrl) {
        const result = await compress_image_upload('html-logo.png', 'Title', 'logos');
        if (result && result.ImageUrl) finalImageUrl = result.ImageUrl;
    }

    if (finalImageUrl) {
        requests.push(...createImage(titleElements.image, titlePageId, finalImageUrl, 'Title', imageOffset));
    }

    // 4. Create Text Box
    requests.push({
        createShape: {
            objectId: titleElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: titlePageId,
                size: titleSizeData.size,
                transform: titleTransform,
            },
        },
    });

    // 5. Insert Text
    requests.push({
        insertText: {
            objectId: titleElements.title,
            text: titleText,
            insertionIndex: 0,
        },
    });

    // 6. Apply Formatting
    requests.push(selectTextStyle("title", titleElements.title));
    requests.push(updateParagraphStyle(titleElements.title, containerConfig.alignItems));

    return requests;
};

export default buildTitleSlide;
