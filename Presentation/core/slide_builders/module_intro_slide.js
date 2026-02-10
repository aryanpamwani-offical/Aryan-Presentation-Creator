
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes } from "../../constants/theme/slide_types.js";
import THEME_COLORS from "../../constants/theme/theme_colors.js";

const buildModuleIntroSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, bullets, moduleLabel } = slideData;

    // 1. Text Config
    const containerConfig = slideTypes["module_intro"].layout.container;

    // --- Title ---
    const titleSizeData = elementSelect("title", title)[0];
    const titleWidth = titleSizeData.size.width.magnitude;
    const titleHeight = titleSizeData.size.height.magnitude;

    // Calculate Position (Top-left aligned, with wide top margin)
    // For module_intro, it acts as a section header. 
    // "Wide top margin above title" -> We can use padding from slide_types, but let's manual position for now to be safe or use the existing utils.
    // The existing utils `translateX_and_translateY` seems to center things or align based on config.
    // slideTypes["module_intro"] has alignItems: top_align, justifyContent: justify_center. 
    // But the spec says "Left-aligned block". "Wide top margin".

    // Let's rely on the container config for now, assuming it places it correctly, or adjust if needed.
    // Actually, `translateX_and_translateY` might not handle "Left-aligned block" perfectly if `justifyContent` is `justify_center`.
    // The spec says "Left-aligned block" but `slide_types.js` says `justifyContent: justify_center`. 
    // I should probably trust the spec over the existing `slide_types.js` if they conflict, but `slide_types.js` was provided by the user (or exists).
    // Let's stick to the existing `slide_types.js` config for now, but user requirement says "Left-aligned block".
    // "justify_center" in `slide_types.js` likely centers the block horizontally. 
    // If the spec says "Left-aligned block", maybe it means text alignment? 
    // "Single-column text stack on dark background." "Acts as a section header slide."

    // Let's assume the existing `slide_types.js` is correct for the container alignment (maybe centered container, left aligned text?)
    // But "Left-aligned block" usually means the block itself is left aligned or the text inside is.
    // Let's use the provided `slide_types.js` config.

    // --- Module Label (if exists) ---
    let moduleLabelHeight = 0;
    if (moduleLabel) {
        const labelSizeData = elementSelect("moduleLabel", moduleLabel)[0];
        const labelWidth = labelSizeData.size.width.magnitude;
        moduleLabelHeight = labelSizeData.size.height.magnitude;

        const labelTransform = translateX_and_translateY(
            containerConfig,
            {
                elementWidth: labelWidth,
                elementHeight: moduleLabelHeight,
                totalContentHeight: moduleLabelHeight + titleHeight + (bullets ? 200 : 0),
            }
        );

        // Move label down to top position
        labelTransform.translateY += 20;

        const labelElementId = slideElements.title + "_label";

        requests.push({
            createShape: {
                objectId: labelElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: labelSizeData.size,
                    transform: labelTransform,
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

        // Apply accent color to label
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
    }

    const titleTransform = translateX_and_translateY(
        containerConfig,
        {
            elementWidth: titleWidth,
            elementHeight: titleHeight,
            totalContentHeight: titleHeight + (bullets ? 200 : 0), // Estimate
        }
    );

    // Move title down (more if label exists)
    titleTransform.translateY += moduleLabel ? (20 + moduleLabelHeight + 10) : 40;

    // Create Title Shape
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

    // Insert Title Text
    requests.push({
        insertText: {
            objectId: slideElements.title,
            text: title,
            insertionIndex: 0,
        },
    });

    // Format Title
    requests.push(selectTextStyle("title", slideElements.title));
    requests.push(updateParagraphStyle(slideElements.title, "START")); // Left aligned text

    // --- Bullets ---
    if (bullets && bullets.length > 0) {
        // Position bullets below title
        const bulletText = bullets.join("\n");
        const bulletSizeData = elementSelect("body", bulletText)[0]; // Use body style for size est

        // We need to position this below the title. 
        // The current `translateX_and_translateY` util is a bit limited for multi-element vertical stacking if it only takes 1 element dimensions.
        // It seems to center the *group* if we pass totalContentHeight.
        // But here we are creating separate shapes.
        // A better approach might be to put them in one text box?
        // "Strong hierarchy: title ≫ bullets."
        // "No paragraphs—only short learning objectives."
        // "Bullets spaced evenly with generous line height."

        // If we use one text box, we can control internal formatting. 
        // If we use two shapes, we need to calculate positions manually relative to each other.
        // `translateX_and_translateY` returns a transform. We can offset the Y for the second element.

        // Let's use two shapes for flexibility.

        // Re-calculate title transform to account for total height?
        // Actually, if `top_align` is used, it might just start from top + padding.
        // Let's look at `slide_types.js`: `module_intro` has `alignItems: top_align`.
        // `alignItems` usually affects Y axis in this context (flex-direction column implied?).

        // Let's simply place the bullets.

        // ID for bullets? We need to generate one? 
        // The `slideElements` passed in should ideally contain it. I will assume `slideElements.bullets` exists or I need to handle it.
        // For now, I will assume `slideElements.body` or similar.

        const bulletElementId = slideElements.body || slideElements.title + "_bullets";

        const bulletTransform = {
            scaleX: 1,
            scaleY: 1,
            translateX: titleTransform.translateX, // Align with title
            translateY: titleTransform.translateY + titleHeight + 15, // Reduced gap from 50 to 15
            unit: "PT"
        };

        requests.push({
            createShape: {
                objectId: bulletElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: 300, unit: "PT" } }, // Fixed width for bullets? 
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

        requests.push(selectTextStyle("body", bulletElementId)); // Use body style
        requests.push(updateParagraphStyle(bulletElementId, "START"));

        // Bullet points styling
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
