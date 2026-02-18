
import {

    updateParagraphStyle
} from "../../utils/text_utils.js";

import compress_image_upload from "../../utils/compress_image_upload.js";
import { updateSlideImage } from "./slideData.js";

import THEME_COLORS from "../../constants/theme/theme_colors.js";

const buildTitleSlide = async (titlePageId, titleElements, slideData, slideIndex) => {
    const requests = [];

    // 1. Setup Data
    const { title, subtitle, localImagePath, image, imageUrl } = slideData;
    const titleText = title || "Untitled Presentation";

  
  

    // 1. Large Accent Shape (Top Right Dynamic)
    const shape1Id = titleElements.title + "_shape1";
    requests.push({
        createShape: {
            objectId: shape1Id,
            shapeType: "ROUND_RECTANGLE", // Soft geometric
            elementProperties: {
                pageObjectId: titlePageId,
                size: { width: { magnitude: 400, unit: "PT" }, height: { magnitude: 500, unit: "PT" } }, // Large
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 400, // pushed to right
                    translateY: -100, // pushed up
                    unit: "PT"
                },
            },
        },
    });

    // Rotate and Style Shape 1
    requests.push({
        updateShapeProperties: {
            objectId: shape1Id,
            shapeProperties: {
                shapeBackgroundFill: {
                    solidFill: {
                        color: { rgbColor: THEME_COLORS.accent },
                        alpha: 0.1 // Subtle background tint
                    }
                },
                outline: { propertyState: "NOT_RENDERED" }
            },
            fields: "shapeBackgroundFill,outline"
        }
    });

    // 2. Bold Accent Stripe (Left)
    const shape2Id = titleElements.title + "_shape2";
    requests.push({
        createShape: {
            objectId: shape2Id,
            shapeType: "ROUND_RECTANGLE",
            elementProperties: {
                pageObjectId: titlePageId,
                size: { width: { magnitude: 15, unit: "PT" }, height: { magnitude: 150, unit: "PT" } },
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 40,
                    translateY: 120, // Aligned with title start roughly
                    unit: "PT"
                },
            },
        },
    });
    requests.push({
        updateShapeProperties: {
            objectId: shape2Id,
            shapeProperties: {
                shapeBackgroundFill: { solidFill: { color: { rgbColor: THEME_COLORS.accent } } },
                outline: { propertyState: "NOT_RENDERED" }
            },
            fields: "shapeBackgroundFill,outline"
        }
    });


    // 2. Compress and Upload Image (or use existing URL)
    let finalImageUrl = imageUrl || image;

    if (!finalImageUrl && localImagePath) {
        const result = await compress_image_upload(localImagePath, 'Title', 'logos');
        if (result && result.ImageUrl) {
            finalImageUrl = result.ImageUrl;
            if (slideIndex !== undefined) {
                updateSlideImage(slideIndex, finalImageUrl);
            }
        }
    }

    if (!finalImageUrl) {
        const result = await compress_image_upload('no-image.png', 'Title', 'logos');
        if (result && result.ImageUrl) {
            finalImageUrl = result.ImageUrl;
            if (slideIndex !== undefined) {
                updateSlideImage(slideIndex, finalImageUrl);
            }
        }
    }

    // 3. Image with "Shadow" Effect
    if (finalImageUrl) {
        const imgWidth = 320;
        const imgHeight = 240;
        const imgX = 360; // Right side
        const imgY = 82; // Vertically centered approx

        // Shadow Shape (Behind Image)
        const shadowId = titleElements.image + "_shadow";
        requests.push({
            createShape: {
                objectId: shadowId,
                shapeType: "ROUND_RECTANGLE",
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: { width: { magnitude: imgWidth, unit: "PT" }, height: { magnitude: imgHeight, unit: "PT" } },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: imgX + 15, // Offset
                        translateY: imgY + 15, // Offset
                        unit: "PT"
                    },
                },
            },
        });
        requests.push({
            updateShapeProperties: {
                objectId: shadowId,
                shapeProperties: {
                    shapeBackgroundFill: { solidFill: { color: { rgbColor: THEME_COLORS.accent }, alpha: 0.3 } },
                    outline: { propertyState: "NOT_RENDERED" }
                },
                fields: "shapeBackgroundFill,outline"
            }
        });

        // The Image itself
        requests.push({
            createImage: {
                objectId: titleElements.image,
                url: finalImageUrl,
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: { width: { magnitude: imgWidth, unit: "PT" }, height: { magnitude: imgHeight, unit: "PT" } },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: imgX,
                        translateY: imgY,
                        unit: "PT"
                    },
                },
            },
        });
    }

    // 4. Typography (Massive & Bold)

    // Title
    const titleMaxWidth = 300;
    const titleEstHeight = 200; // Allow 2-3 lines
    const textStartX = 70; // Next to accent stripe
    let textStartY = 110;

    requests.push({
        createShape: {
            objectId: titleElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: titlePageId,
                size: { width: { magnitude: titleMaxWidth, unit: "PT" }, height: { magnitude: titleEstHeight, unit: "PT" } },
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: textStartX,
                    translateY: textStartY,
                    unit: "PT"
                },
            },
        },
    });

    requests.push({
        insertText: {
            objectId: titleElements.title,
            text: titleText,
            insertionIndex: 0,
        },
    });

    requests.push({
        updateTextStyle: {
            objectId: titleElements.title,
            style: {
                fontSize: { magnitude: 48, unit: "PT" }, // Massive
                bold: true,
                foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.text } }, // Dark text on light bg
                weightedFontFamily: { fontFamily: "Roboto", weight: 900 }
            },
            fields: "fontSize,bold,foregroundColor,weightedFontFamily"
        }
    });
    requests.push(updateParagraphStyle(titleElements.title, "START"));

    // Subtitle
    if (subtitle) {
        const subtitleId = titleElements.title + "_sub";
        const subHeight = 80;
        // Position below title. Hard to know exact line count without measuring, 
        // but we push it down significantly to be safe or overlap bottom.
        // Let's assume title takes ~140pt
        const subY = textStartY + 140;

        requests.push({
            createShape: {
                objectId: subtitleId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: { width: { magnitude: titleMaxWidth, unit: "PT" }, height: { magnitude: subHeight, unit: "PT" } },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: textStartX,
                        translateY: subY,
                        unit: "PT"
                    },
                },
            },
        });

        requests.push({
            insertText: {
                objectId: subtitleId,
                text: subtitle,
                insertionIndex: 0,
            },
        });

        requests.push({
            updateTextStyle: {
                objectId: subtitleId,
                style: {
                    fontSize: { magnitude: 14, unit: "PT" },
                    bold: false,
                    foregroundColor: { opaqueColor: { rgbColor: THEME_COLORS.secondaryText } },
                    weightedFontFamily: { fontFamily: "Roboto", weight: 400 }
                },
                fields: "fontSize,bold,foregroundColor,weightedFontFamily"
            }
        });
        requests.push(updateParagraphStyle(subtitleId, "START"));
    }

    return requests;
};

export default buildTitleSlide;
