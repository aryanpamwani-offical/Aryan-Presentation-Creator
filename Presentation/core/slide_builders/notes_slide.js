
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes } from "../../constants/theme/slide_types.js";
import THEME_COLORS from "../../constants/theme/theme_colors.js";

const buildNotesSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, bullets } = slideData;

    // 1. Text Config
    const containerConfig = slideTypes["notes"].layout.container;

    // --- Heading (Title) ---
    const titleSizeData = elementSelect("title", title)[0];
    const titleWidth = titleSizeData.size.width.magnitude;
    const titleHeight = titleSizeData.size.height.magnitude;

    const titleTransform = translateX_and_translateY(
        containerConfig,
        {
            elementWidth: titleWidth,
            elementHeight: titleHeight,
            totalContentHeight: titleHeight + (bullets ? 200 : 0) // Estimate
        }
    );

    // Title down by 40pt (matching module_intro)
    titleTransform.translateY += 40;

    requests.push({
        createShape: {
            objectId: slideElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: slideId,
                size: titleSizeData.size,
                transform: titleTransform,
            },
        },
    });

    requests.push({
        insertText: {
            objectId: slideElements.title,
            text: title,
            insertionIndex: 0,
        },
    });

    requests.push(selectTextStyle("title", slideElements.title));
    requests.push(updateParagraphStyle(slideElements.title, "START"));

    // Apply accent color to title (Summary)
    requests.push({
        updateTextStyle: {
            objectId: slideElements.title,
            textRange: { type: "ALL" },
            style: {
                foregroundColor: {
                    opaqueColor: { rgbColor: THEME_COLORS.summaryAccent }
                }
            },
            fields: "foregroundColor"
        }
    });


    // --- Bullets (Notes) ---
    if (bullets && bullets.length > 0) {
        const bulletElementId = slideElements.body || slideElements.title + "_notes";
        const bulletText = bullets.join("\n");
        // "Tight relationship between heading and body." -> Smaller gap.
        const gap = 15; // Matching module_intro

        const bulletTransform = {
            scaleX: 1,
            scaleY: 1,
            translateX: titleTransform.translateX,
            translateY: titleTransform.translateY + titleHeight + gap,
            unit: "PT"
        };

        requests.push({
            createShape: {
                objectId: bulletElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 300, unit: "PT" } },
                    transform: bulletTransform,
                },
            },
        });

        requests.push({
            insertText: {
                objectId: bulletElementId,
                text: bulletText,
                insertionIndex: 0,
            },
        });

        requests.push(selectTextStyle("body", bulletElementId));
        requests.push(updateParagraphStyle(bulletElementId, "START"));

        // Bullet styling
        requests.push({
            createParagraphBullets: {
                objectId: bulletElementId,
                textRange: {
                    type: "ALL",
                },
                bulletPreset: "BULLET_DISC_CIRCLE_SQUARE",
            },
        });
    }

    return requests;
};

export default buildNotesSlide;
