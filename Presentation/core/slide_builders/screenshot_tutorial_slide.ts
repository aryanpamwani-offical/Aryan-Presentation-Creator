
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes, THEME_COLORS } from "../../constants/theme/index.js";

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
    const finalCaption = description || caption;

    // 1. Text Config (Heading)
    const containerConfig = slideTypes["screenshot_tutorial"].layout.container;

    // --- Heading (Top-left) ---
    const titleSizeData = elementSelect("title", title)[0];
    const titleWidth = titleSizeData.size.width.magnitude;
    const titleHeight = titleSizeData.size.height.magnitude;

    const titleTransform = translateX_and_translateY(
        containerConfig,
        {
            elementWidth: titleWidth,
            elementHeight: titleHeight,
            totalContentHeight: titleHeight
        }
    );

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


    // --- 2-COLUMN LAYOUT CONTENT ---

    // Layout Constants
    const titleWordCount = title ? title.trim().split(/\s+/).filter(Boolean).length : 0;
    const baseGap = 20;
    const gapBelowTitle = titleWordCount > 2 ? baseGap + 25 : baseGap; // Add 25pt extra space for 3+ word titles
    const marginX = 50;
    const startY = titleTransform.translateY + titleHeight + gapBelowTitle; // Start below title with adjusted gap
    const contentHeight = 405 - startY - 20; // Remaining height (approx)
    const slideWidth = 720;
    const gap = 30;

    // Calculate Column Widths
    // Image takes ~60%, Text takes ~40%? Or 50/50?
    // Let's go with Image on Right (larger) or Centered if text is small.
    // User requested "aligned in the same line". Side-by-side.

    const leftColWidth = 250;
    const rightColWidth = 380; // Total 630 + gap + margins

    const leftColX = marginX;
    const rightColX = marginX + leftColWidth + gap;


    // --- RIGHT COLUMN: CODE IMAGE ---
    const imageElementId = slideElements.image || slideElements.title + "_image";
    // Reduce image height when title has 3+ words to accommodate spacing
    const baseImageHeight = 250;
    const imageHeight = titleWordCount > 2 ? baseImageHeight - 25 : baseImageHeight; // Reduce image height for 3+ word titles

    const imageTransform = {
        scaleX: 1,
        scaleY: 1,
        translateX: rightColX,
        translateY: startY,
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
        // Fallback Shape
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
        // (Skipping styling details for brevity, assumed handled or not needed if URL exists usually)
    }

    // --- LEFT COLUMN: CODE TITLE & DESCRIPTION ---
    // We stack them vertically in the left column

    let currentTextY = startY;

    // 1. Code Title (Subheading)
    if (codeTitle) {
        const codeTitleId = slideElements.title + "_sub";
        const codeTitleHeight = 30;
        const codeTitleWordCount = codeTitle ? codeTitle.trim().split(/\s+/).filter(Boolean).length : 0;
        const codeTitleBottomSpace = codeTitleWordCount > 2 ? 15 : 0; // Add 15pt extra space for 3+ word codeTitle

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
                text: codeTitle,
                insertionIndex: 0,
            },
        });

        // Style Code Title - Bold, Accent Color?
        requests.push(selectTextStyle("subHeading", codeTitleId)); // Use h2 style or similar
        requests.push(updateParagraphStyle(codeTitleId, "START"));
        requests.push({
            updateTextStyle: {
                objectId: codeTitleId,
                style: {
                    fontSize: { magnitude: 18, unit: "PT" },
                    bold: true,
                    foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.text } }
                },
                fields: "fontSize,bold,foregroundColor"
            }
        });

        currentTextY += codeTitleHeight + 10 + codeTitleBottomSpace;
    }

    // 2. Description/Caption
    if (finalCaption) {
        const captionElementId = slideElements.caption || slideElements.title + "_caption";
        const captionHeight = 150; // Allow more space

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
                    fontSize: { magnitude: 12, unit: "PT" },
                    foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.secondaryText } }
                },
                fields: "fontSize,foregroundColor"
            }
        });
    }

    return requests;
};

export default buildScreenshotTutorialSlide;
