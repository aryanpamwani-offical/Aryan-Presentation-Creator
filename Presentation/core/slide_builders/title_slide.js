import {
    updateParagraphStyle,
    selectTextStyle
} from "../../utils/text_utils.js";

import { estimateTextHeight } from "../../config/dimension_calculator/index.js";
import { compressImageAndUpload as compress_image_upload } from "../../utils/image_helper.js";
import { updateSlideImage } from "./slideData.js";
import { THEME_COLORS } from "../../constants/theme/index.js";

const buildTitleSlide = async (titlePageId, titleElements, slideData, slideIndex) => {
    const requests = [];

    // 1. Setup Data
    const { title, subtitle, localImagePath, image, imageUrl } = slideData;
    const titleText = title || "Untitled Presentation";

    // ── Shape 1: Large Accent Shape (Top Right) ──────────────────────────────
    const shape1Id = titleElements.title + "_shape1";
    requests.push({
        createShape: {
            objectId: shape1Id,
            shapeType: "ROUND_RECTANGLE",
            elementProperties: {
                pageObjectId: titlePageId,
                size: {
                    width:  { magnitude: 400, unit: "PT" },
                    height: { magnitude: 500, unit: "PT" }
                },
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 400,
                    translateY: -100,
                    unit: "PT"
                },
            },
        },
    });

    requests.push({
        updateShapeProperties: {
            objectId: shape1Id,
            shapeProperties: {
                shapeBackgroundFill: {
                    solidFill: {
                        color: { rgbColor: THEME_COLORS.accent },
                        alpha: 0.1
                    }
                },
                outline: { propertyState: "NOT_RENDERED" }
            },
            fields: "shapeBackgroundFill,outline"
        }
    });

    // ── Shape 2: Bold Accent Stripe (Left) ───────────────────────────────────
    const shape2Id = titleElements.title + "_shape2";
    requests.push({
        createShape: {
            objectId: shape2Id,
            shapeType: "ROUND_RECTANGLE",
            elementProperties: {
                pageObjectId: titlePageId,
                size: {
                    width:  { magnitude: 15,  unit: "PT" },
                    height: { magnitude: 150, unit: "PT" }
                },
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 40,
                    translateY: 120,
                    unit: "PT"
                },
            },
        },
    });

    requests.push({
        updateShapeProperties: {
            objectId: shape2Id,
            shapeProperties: {
                shapeBackgroundFill: {
                    solidFill: {
                        color: { rgbColor: THEME_COLORS.accent }
                    }
                },
                outline: { propertyState: "NOT_RENDERED" }
            },
            fields: "shapeBackgroundFill,outline"
        }
    });

    // ── Image: Compress / Upload ──────────────────────────────────────────────
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

    // ── Image with Shadow Effect ──────────────────────────────────────────────
    if (finalImageUrl) {
        const imgWidth  = 320;
        const imgHeight = 240;
        const imgX      = 360;
        const imgY      = 82;

        // Shadow shape (behind image)
        const shadowId = titleElements.image + "_shadow";
        requests.push({
            createShape: {
                objectId: shadowId,
                shapeType: "ROUND_RECTANGLE",
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: {
                        width:  { magnitude: imgWidth,  unit: "PT" },
                        height: { magnitude: imgHeight, unit: "PT" }
                    },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: imgX + 15,
                        translateY: imgY + 15,
                        unit: "PT"
                    },
                },
            },
        });

        requests.push({
            updateShapeProperties: {
                objectId: shadowId,
                shapeProperties: {
                    shapeBackgroundFill: {
                        solidFill: {
                            color: { rgbColor: THEME_COLORS.accent },
                            alpha: 0.3
                        }
                    },
                    outline: { propertyState: "NOT_RENDERED" }
                },
                fields: "shapeBackgroundFill,outline"
            }
        });

        // Actual image
        requests.push({
            createImage: {
                objectId: titleElements.image,
                url: finalImageUrl,
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: {
                        width:  { magnitude: imgWidth,  unit: "PT" },
                        height: { magnitude: imgHeight, unit: "PT" }
                    },
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

    // ── Title Text ────────────────────────────────────────────────────────────
    const titleMaxWidth  = 300;
    const titleEstHeight = estimateTextHeight(titleText, 48, titleMaxWidth);
    const textStartX     = 70;
    const textStartY     = 110;

    requests.push({
        createShape: {
            objectId: titleElements.title,
            shapeType: "TEXT_BOX",
            elementProperties: {
                pageObjectId: titlePageId,
                size: {
                    width:  { magnitude: titleMaxWidth,  unit: "PT" },
                    height: { magnitude: titleEstHeight, unit: "PT" }
                },
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

    // ✅ Style pulled from text_utils textFields.titleSlideTitle
    requests.push(selectTextStyle('title', titleElements.title));
    requests.push(updateParagraphStyle(titleElements.title, "START"));

    // ── Subtitle Text ─────────────────────────────────────────────────────────
    if (subtitle) {
        const subtitleId = titleElements.title + "_sub";
        const subHeight  = 80;
        const subY       = textStartY + titleEstHeight + 35;

        requests.push({
            createShape: {
                objectId: subtitleId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                    pageObjectId: titlePageId,
                    size: {
                        width:  { magnitude: titleMaxWidth, unit: "PT" },
                        height: { magnitude: subHeight,     unit: "PT" }
                    },
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

        // ✅ Style pulled from text_utils textFields.titleSlideSubtitle
        requests.push(selectTextStyle('titleSlideSubtitle', subtitleId));
        requests.push(updateParagraphStyle(subtitleId, "START"));
    }

    return requests;
};

export default buildTitleSlide;