import {
    updateParagraphStyle,
    selectTextStyle,
    unescapeText,
    calculateTitleLayout,
    getOptimalTitleFontSize
} from "../../utils/text_utils.js";

import { compressImageAndUpload as compress_image_upload } from "../../utils/image_helper.js";
import { updateSlideImage } from "./slideData.js";
import { THEME_COLORS } from "../../constants/theme/index.js";

const buildTitleSlide = async (titlePageId, titleElements, slideData, slideIndex) => {
    const requests = [];

    // 1. Setup Data
    const { title, subtitle, localImagePath, image, imageUrl } = slideData;
    const titleText = unescapeText(title || "Untitled Presentation").trim();
    const cleanSubtitle = subtitle ? unescapeText(subtitle).trim() : "";

    // Calculate dynamic title dimensions and vertical positioning
    // Compute optimal font size (e.g. 38pt instead of 42pt if long words would break mid-word)
    const titleMaxWidth = 310;
    const titleFontSize = getOptimalTitleFontSize(titleText, titleMaxWidth, 42, 30);
    const { height: titleEstHeight, lineCount: titleLineCount } = calculateTitleLayout(titleText, titleMaxWidth, titleFontSize);
    const textStartX = 70;
    const textStartY = titleLineCount >= 3 ? Math.max(60, 110 - (titleLineCount - 2) * 22) : (titleLineCount === 2 ? 105 : 115);

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
    const stripeY = Math.min(115, textStartY);
    const stripeHeight = Math.max(150, titleEstHeight + (cleanSubtitle ? 85 : 30));

    requests.push({
        createShape: {
            objectId: shape2Id,
            shapeType: "ROUND_RECTANGLE",
            elementProperties: {
                pageObjectId: titlePageId,
                size: {
                    width:  { magnitude: 15,  unit: "PT" },
                    height: { magnitude: stripeHeight, unit: "PT" }
                },
                transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 40,
                    translateY: stripeY,
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

    // ── Image: Cloudflare R2 Logo Resolution ──────────────────────────────────
    let finalImageUrl = imageUrl || image;
    const isGoogleDriveUrl = typeof finalImageUrl === 'string' && finalImageUrl.includes('drive.google.com');

    // If imageUrl is missing or points to old Google Drive URL, resolve via Cloudflare R2
    if ((!finalImageUrl || isGoogleDriveUrl) && localImagePath) {
        const cleanLogoName = localImagePath.replace(/^\/+/, '');
        const result = await compress_image_upload(cleanLogoName, 'Title', 'logos');
        if (result && result.ImageUrl) {
            finalImageUrl = result.ImageUrl;
            if (slideIndex !== undefined) {
                updateSlideImage(slideIndex, finalImageUrl);
            }
        }
    }

    if (!finalImageUrl || (typeof finalImageUrl === 'string' && finalImageUrl.includes('drive.google.com'))) {
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
        const imgWidth  = 300;
        const imgHeight = 225;
        const imgX      = 380;
        const imgY      = 90;

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
    if (titleFontSize !== 42) {
        requests.push({
            updateTextStyle: {
                objectId: titleElements.title,
                style: {
                    fontSize: { magnitude: titleFontSize, unit: 'PT' }
                },
                fields: 'fontSize'
            }
        });
    }
    requests.push(updateParagraphStyle(titleElements.title, "START"));

    // ── Subtitle Text ─────────────────────────────────────────────────────────
    if (cleanSubtitle) {
        const subtitleId = titleElements.title + "_sub";
        const subHeight  = 70;
        const subY       = textStartY + titleEstHeight + 18;

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
                text: cleanSubtitle,
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