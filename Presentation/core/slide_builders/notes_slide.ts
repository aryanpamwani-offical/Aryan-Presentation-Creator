
import {
    selectTextStyle,
    updateParagraphStyle,
    unescapeText,
    calculateTitleLayout
} from "../../utils/text_utils.js";
import { THEME_COLORS } from "../../constants/theme/index.js";

const buildNotesSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, bullets } = slideData;

    const cleanTitle = unescapeText(title || "Summary").trim();
    const startX = 60;
    const contentWidth = 600;

    // Dynamically calculate title lines and height for 42pt Poppins font
    const { height: titleHeight } = calculateTitleLayout(cleanTitle, contentWidth, 42);

    // Calculate vertical centering for summary slide to eliminate bottom void
    const bulletCount = bullets?.length || 0;
    const bulletsEstimatedHeight = Math.max(120, bulletCount * 34);
    const gapBetweenTitleAndBullets = 16; // Equal 16pt gap after title ends
    const totalStackHeight = titleHeight + gapBetweenTitleAndBullets + bulletsEstimatedHeight;
    const startY = Math.max(60, Math.round((405 - totalStackHeight) / 2));

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

    // Apply summary accent color to title
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

    // Bullets (Notes): Positioned below title
    if (bullets && bullets.length > 0) {
        const bulletElementId = slideElements.body || slideElements.title + "_notes";
        const bulletText = bullets.map(b => unescapeText(b).trim()).join("\n");
        const bulletsY = startY + titleHeight + gapBetweenTitleAndBullets;
        const bulletsHeight = bulletsEstimatedHeight + 20;

        requests.push({
            createShape: {
                objectId: bulletElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: contentWidth, unit: "PT" }, height: { magnitude: bulletsHeight, unit: "PT" } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: bulletsY, unit: "PT" },
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
