import {
    selectTextStyle,
    updateParagraphStyle,
    unescapeText,
    calculateTitleLayout
} from "../../utils/text_utils.js";
import { THEME_COLORS } from "../../constants/theme/index.js";

const buildScreenshotTutorialSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, image, caption, imageUrl, description, codeTitle } = slideData;

    // Use imageUrl if provided and valid
    let finalImageUrl = imageUrl;
    if (!finalImageUrl && image && (image.startsWith("http://") || image.startsWith("https://"))) {
        finalImageUrl = image;
    }
    // Explicitly ignore local paths for API calls
    if (finalImageUrl && !finalImageUrl.startsWith("http")) {
        finalImageUrl = null;
    }

    // Use description if provided, fallback to caption
    const rawCaption = description || caption || "";
    const finalCaption = unescapeText(rawCaption).trim();
    const resolvedCodeTitle = unescapeText(slideData.codeTitle || slideData.CodeTitle || "").trim();

    // --- 1. TITLE (Top-left, matching solved template) ---
    const cleanTitle = unescapeText(title || "").trim();
    const titleStartX = 60;
    const titleStartY = 45;
    const titleWidth = 600;
    const { height: titleHeight, isMultiLine: isMultiLineTitle } = calculateTitleLayout(cleanTitle, titleWidth, 42);

    requests.push({
        createShape: {
            objectId: slideElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: titleWidth, unit: "PT" }, height: { magnitude: titleHeight, unit: "PT" } },
                transform: { scaleX: 1, scaleY: 1, translateX: titleStartX, translateY: titleStartY, unit: "PT" },
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

    // --- 2. LAYOUT GEOMETRY & SPACING ---
    // Generous gap below title matching solved template
    const gapBelowTitle = isMultiLineTitle ? 24 : 34;
    const contentStartY = titleStartY + titleHeight + gapBelowTitle;

    const leftColX = 60;
    const leftColWidth = 225;
    const colGap = 25;
    const rightColX = leftColX + leftColWidth + colGap; // 310
    const rightColWidth = 360; // 360pt hero card width
    const imageHeight = 210;   // 210pt hero card height

    let currentTextY = contentStartY;

    // --- LEFT COLUMN: 1. Code Title (Subheading) ---
    if (resolvedCodeTitle) {
        const codeTitleId = slideElements.title + "_sub";
        const isMultiLineCodeTitle = resolvedCodeTitle.length > 18 || resolvedCodeTitle.includes('\n');
        const codeTitleHeight = isMultiLineCodeTitle ? 48 : 28;

        requests.push({
            createShape: {
                objectId: codeTitleId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: leftColWidth, unit: "PT" }, height: { magnitude: codeTitleHeight, unit: "PT" } },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: leftColX,
                        translateY: currentTextY,
                        unit: "PT"
                    },
                },
            },
        });

        requests.push({
            insertText: {
                objectId: codeTitleId,
                text: resolvedCodeTitle,
                insertionIndex: 0,
            },
        });

        requests.push(selectTextStyle("subHeading", codeTitleId));
        requests.push(updateParagraphStyle(codeTitleId, "START"));
        requests.push({
            updateTextStyle: {
                objectId: codeTitleId,
                style: {
                    fontSize: { magnitude: 18, unit: "PT" },
                    bold: true,
                    foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.accent } } // Blue accent color
                },
                fields: "fontSize,bold,foregroundColor"
            }
        });

        // Tight natural gap between heading and description (matching solved template)
        const gapCodeTitleToDesc = 14;
        currentTextY += codeTitleHeight + gapCodeTitleToDesc;
    }

    // --- LEFT COLUMN: 2. Description / Caption ---
    if (finalCaption) {
        const captionElementId = slideElements.caption || slideElements.title + "_caption";
        const captionHeight = 150;

        requests.push({
            createShape: {
                objectId: captionElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: leftColWidth, unit: "PT" }, height: { magnitude: captionHeight, unit: "PT" } },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: leftColX,
                        translateY: currentTextY,
                        unit: "PT"
                    },
                },
            },
        });

        requests.push({
            insertText: {
                objectId: captionElementId,
                text: finalCaption,
                insertionIndex: 0,
            },
        });

        requests.push(selectTextStyle("body", captionElementId));
        requests.push(updateParagraphStyle(captionElementId, "START"));
        requests.push({
            updateTextStyle: {
                objectId: captionElementId,
                style: {
                    fontSize: { magnitude: 13, unit: "PT" },
                    foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.secondaryText } }
                },
                fields: "fontSize,foregroundColor"
            }
        });
    }

    // --- RIGHT COLUMN: CODE IMAGE ---
    // The image starts from the top of codeTitle (contentStartY)
    const imageElementId = slideElements.image || slideElements.title + "_image";
    const imageY = contentStartY;
    const imageTransform = {
        scaleX: 1,
        scaleY: 1,
        translateX: rightColX,
        translateY: imageY,
        unit: "PT"
    };

    if (finalImageUrl) {
        requests.push({
            createImage: {
                objectId: imageElementId,
                url: finalImageUrl,
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: rightColWidth, unit: "PT" }, height: { magnitude: imageHeight, unit: "PT" } },
                    transform: imageTransform,
                },
            },
        });
    } else {
        requests.push({
            createShape: {
                objectId: imageElementId,
                shapeType: "ROUND_RECTANGLE",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: rightColWidth, unit: "PT" }, height: { magnitude: imageHeight, unit: "PT" } },
                    transform: imageTransform,
                },
            },
        });
    }

    return requests;
};

export default buildScreenshotTutorialSlide;
