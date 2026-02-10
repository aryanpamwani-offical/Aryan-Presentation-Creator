
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes } from "../../constants/theme/slide_types.js";

const buildThankYouSlide = (thankYouPageId, thankYouElements) => {
    const requests = [];
    const thankYouText = "Thank You";

    // 1. Calculate Size & Position
    const thankYouSizeData = elementSelect("title", thankYouText)[0];
    const thankYouTransform = translateX_and_translateY(
        slideTypes["thank_you"].layout.container,
        {
            elementWidth: thankYouSizeData.size.width.magnitude,
            elementHeight: thankYouSizeData.size.height.magnitude,
            totalContentHeight: thankYouSizeData.size.height.magnitude,
        }
    );

    // 2. Create Shape
    requests.push({
        createShape: {
            objectId: thankYouElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: thankYouPageId,
                size: thankYouSizeData.size,
                transform: thankYouTransform,
            },
        },
    });

    // 3. Insert Text
    requests.push({
        insertText: {
            objectId: thankYouElements.title,
            text: thankYouText,
            insertionIndex: 0,
        },
    });

    // 4. Apply Formatting
    requests.push(selectTextStyle("title", thankYouElements.title));
    requests.push(updateParagraphStyle(thankYouElements.title, "CENTER"));

    return requests;
};

export default buildThankYouSlide;
