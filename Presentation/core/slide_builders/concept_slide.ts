
import {
    selectTextStyle,
    updateParagraphStyle,
    unescapeText,
    calculateTitleLayout
} from "../../utils/text_utils.js";

const buildConceptSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, body } = slideData;

    const cleanTitle = unescapeText(title || "").trim();
    const startX = 60;
    const startY = 60;
    const contentWidth = 600;

    // Dynamically calculate title lines and height for 42pt Poppins font
    const { height: titleHeight } = calculateTitleLayout(cleanTitle, contentWidth, 42);

    requests.push({
        createShape: {
            objectId: slideElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: contentWidth, unit: "PT" }, height: { magnitude: titleHeight, unit: "PT" } },
                transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: startY, unit: "PT" },
            },
        },
    });

    requests.push({
        insertText: {
            objectId: slideElements.title,
            text: cleanTitle,
            insertionIndex: 0,
        },
    });

    requests.push(selectTextStyle("title", slideElements.title));
    requests.push(updateParagraphStyle(slideElements.title, "START"));

    // Body Text: Starts 16pt below title
    if (body) {
        const cleanBody = unescapeText(body || "").trim();
        const bodyElementId = slideElements.body || slideElements.title + "_body";
        const bodyY = startY + titleHeight + 16;
        const bodyHeight = 405 - bodyY - 30;

        // Split into paragraphs (handling single, double, or multiple newlines and escape sequences)
        const paragraphs = cleanBody
            .split(/\n+/)
            .map(p => p.trim())
            .filter(Boolean);

        // Join paragraphs with double newline for clean, visible separation between paragraphs
        const formattedBody = paragraphs.join('\n\n');

        requests.push({
            createShape: {
                objectId: bodyElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: contentWidth, unit: "PT" }, height: { magnitude: bodyHeight, unit: "PT" } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: bodyY, unit: "PT" },
                },
            },
        });

        requests.push({
            insertText: {
                objectId: bodyElementId,
                text: formattedBody,
                insertionIndex: 0,
            },
        });

        requests.push(selectTextStyle("body", bodyElementId));
        requests.push(updateParagraphStyle(bodyElementId, "START"));
    }

    return requests;
};

export default buildConceptSlide;
