
import {
    selectTextStyle,
    updateParagraphStyle
} from "../../utils/text_utils.js";

const buildThankYouSlide = (thankYouPageId, thankYouElements) => {
    const requests = [];
    const thankYouText = "Thank You";

    // Centered Title: 600 wide, 80 high on 720x405 canvas
    const boxWidth = 600;
    const boxHeight = 80;
    const x = (720 - boxWidth) / 2; // 60
    const y = (405 - boxHeight) / 2; // 162.5

    requests.push({
        createShape: {
            objectId: thankYouElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: thankYouPageId,
                size: { width: { magnitude: boxWidth, unit: "PT" }, height: { magnitude: boxHeight, unit: "PT" } },
                transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: "PT" },
            },
        },
    });

    requests.push({
        insertText: {
            objectId: thankYouElements.title,
            text: thankYouText,
            insertionIndex: 0,
        },
    });

    requests.push(selectTextStyle("title", thankYouElements.title));
    requests.push(updateParagraphStyle(thankYouElements.title, "CENTER"));

    return requests;
};

export default buildThankYouSlide;
