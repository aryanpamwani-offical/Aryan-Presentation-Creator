
import {
    selectTextStyle,
    updateParagraphStyle,
    unescapeText,
    calculateTitleLayout
} from "../../utils/text_utils.js";
import { THEME_COLORS } from "../../constants/theme/index.js";

const buildModuleIntroSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, bullets, moduleLabel } = slideData;

    const cleanLabel = unescapeText(moduleLabel || "").trim();
    // Ensure title is specific to the module theme (replace generic "Module 1 Intro" or "Module One Overview")
    let resolvedTitle = unescapeText(title || "").trim();
    if (/^module\s+(one|two|three|\d+)\s*(intro|overview)?$/i.test(resolvedTitle) || !resolvedTitle) {
        const extracted = cleanLabel ? cleanLabel.replace(/^module\s+\d+:\s*/i, '').trim() : '';
        if (extracted) {
            resolvedTitle = extracted;
        }
    }

    const startX = 60;
    const contentWidth = 600;

    // Dynamically calculate title lines and height for 42pt Poppins font
    const { height: titleHeight, isMultiLine: isMultiLineTitle } = calculateTitleLayout(resolvedTitle, contentWidth, 42);

    // Calculate dimensions and vertical centering with equal 16pt gaps
    const labelHeight = moduleLabel ? 24 : 0;
    const gapLabelTitle = moduleLabel ? 16 : 0;
    const gapTitleBullets = 16; // Equal 16pt gap after title ends
    const bulletCount = bullets?.length || 0;
    const bulletsEstimatedHeight = Math.max(90, bulletCount * 30);

    const totalStackHeight = labelHeight + gapLabelTitle + titleHeight + gapTitleBullets + bulletsEstimatedHeight;
    const startY = Math.max(50, Math.round((405 - totalStackHeight) / 2));
    let currentY = startY;

    // 1. Module Label (if present)
    if (moduleLabel) {
        const labelHeight = 24;
        const labelElementId = slideElements.title + "_label";

        requests.push({
            createShape: {
                objectId: labelElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: labelHeight, unit: "PT" } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: "PT" },
                },
            },
        });

        requests.push({
            insertText: {
                objectId: labelElementId,
                text: moduleLabel,
                insertionIndex: 0,
            },
        });

        requests.push(selectTextStyle("moduleLabel", labelElementId));
        requests.push(updateParagraphStyle(labelElementId, "START"));

        requests.push({
            updateTextStyle: {
                objectId: labelElementId,
                textRange: { type: "ALL" },
                style: {
                    foregroundColor: {
                        opaqueColor: { rgbColor: THEME_COLORS.accent }
                    }
                },
                fields: "foregroundColor"
            }
        });

        currentY += labelHeight + gapLabelTitle; // Equal 16pt gap between label & title
    }

    // 2. Title (42pt font)
    requests.push({
        createShape: {
            objectId: slideElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: titleHeight, unit: "PT" } },
                transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: "PT" },
            },
        },
    });

    requests.push({
        insertText: {
            objectId: slideElements.title,
            text: resolvedTitle,
            insertionIndex: 0,
        },
    });

    requests.push(selectTextStyle("title", slideElements.title));
    requests.push(updateParagraphStyle(slideElements.title, "START"));

    currentY += titleHeight + gapTitleBullets; // Equal 16pt gap below title

    // 3. Bullets
    if (bullets && bullets.length > 0) {
        const bulletText = bullets.map(b => unescapeText(b).trim()).join("\n");
        const bulletElementId = slideElements.body || slideElements.title + "_bullets";
        const bulletHeight = Math.max(150, bullets.length * 35);

        requests.push({
            createShape: {
                objectId: bulletElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: bulletHeight, unit: "PT" } },
                    transform: { scaleX: 1, scaleY: 1, translateX: startX, translateY: currentY, unit: "PT" },
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

export default buildModuleIntroSlide;
