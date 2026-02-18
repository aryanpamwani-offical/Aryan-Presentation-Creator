
import {
    elementSelect,
    selectTextStyle,
    translateX_and_translateY,
    updateParagraphStyle
} from "../../utils/text_utils.js";
import { slideTypes } from "../../constants/theme/slide_types.js";
import THEME_COLORS from "../../constants/theme/theme_colors.js";

const buildScreenshotTutorialSlide = (slideId, slideElements, slideData) => {
    const requests = [];
    const { title, image, caption, imageUrl, description } = slideData;

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
            totalContentHeight: titleHeight // Heading is on top. 
        }
    );
    // Align top-left
    // containerConfig has `alignItems: top_align, justifyContent: justify_flex_start`
    // So `translateX_and_translateY` should handle top-left alignment correctly or close to it.

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


    // --- Screenshot (Image/Code Block) ---
    // "Code screenshot: Rounded rectangle container. Dark editor-style background. Subtle glow or soft edge."

    const imageElementId = slideElements.image || slideElements.title + "_image";
    const imageWidth = 500;
    const imageHeight = 220; // Reduced from 300 to fit nicely on slide

    // Center on slide (720x405 standard? Or we calculate based on title height)
    // 720pt width, 405pt height (16:9 10"x5.625")
    // const centerX = (720 - imageWidth) / 2; // Original Center
    const startX = titleTransform.translateX;   // Align with Title
    const startY = titleTransform.translateY + titleHeight + 10; // Add gap below title

    const imageTransform = {
        scaleX: 1,
        scaleY: 1,
        translateX: startX,
        translateY: startY,
        unit: "PT"
    };

    if (finalImageUrl) {
        // If image URL provided, create an image element
        requests.push({
            createImage: {
                objectId: imageElementId,
                url: finalImageUrl,
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: imageWidth, unit: "PT" }, height: { magnitude: imageHeight, unit: "PT" } },
                    transform: imageTransform,
                },
            },
        });

    } else {
        // Create Background Shape (Dark Editor Style) - Fallback if no image
        requests.push({
            createShape: {
                objectId: imageElementId,
                shapeType: "ROUND_RECTANGLE", // Rounded corners
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: imageWidth, unit: "PT" }, height: { magnitude: imageHeight, unit: "PT" } },
                    transform: imageTransform,
                },
            },
        });

        // Style the background: Dark Grey/Black (from Theme or custom)

        requests.push({
            insertText: {
                objectId: imageElementId,
                text: "Code Example Placeholder",
                insertionIndex: 0,
            },
        });
        requests.push(selectTextStyle("body", imageElementId));
        requests.push(updateParagraphStyle(imageElementId, "CENTER"));
        // Set text color to codeAccent (Cyan)
        requests.push({
            updateTextStyle: {
                objectId: imageElementId,
                style: {
                    foregroundColor: {
                        opaqueColor: {
                            rgbColor: THEME_COLORS.codeAccent
                        }
                    }
                },
                textRange: { type: "ALL" },
                fields: "foregroundColor"
            }
        });
    }


    // --- Caption ---
    if (finalCaption) {
        const captionElementId = slideElements.caption || slideElements.title + "_caption";
        const captionHeight = 50;

        // Position: Directly under screenshot.
        const imageBottomY = startY + imageHeight;

        const captionTransform = {
            scaleX: 1,
            scaleY: 1,
            translateX: startX, // Align with Image/Title
            translateY: imageBottomY + 10,
            unit: "PT"
        };

        requests.push({
            createShape: {
                objectId: captionElementId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: slideId,
                    size: { width: { magnitude: 600, unit: "PT" }, height: { magnitude: captionHeight, unit: "PT" } },
                    transform: captionTransform,
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

        // Style: "Small, grey/white"
        requests.push(selectTextStyle("body", captionElementId));

        // Override color and size
        requests.push({
            updateTextStyle: {
                objectId: captionElementId,
                style: {
                    foregroundColor: {
                        opaqueColor: {
                            rgbColor: THEME_COLORS.secondaryText
                        }
                    },
                    fontSize: {
                        magnitude: 12,
                        unit: "PT"
                    }
                },
                textRange: {
                    type: "ALL"
                },
                fields: "foregroundColor,fontSize"
            }
        });

        requests.push(updateParagraphStyle(captionElementId, "START"));
    }

    return requests;
};

export default buildScreenshotTutorialSlide;
