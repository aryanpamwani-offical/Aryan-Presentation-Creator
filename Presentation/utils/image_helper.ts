import fs from 'fs';
import path from 'path';
import uploadImageToDrive, { getLogoFromDrive } from '../config/drive/google_drive.js';
import AuthWithGoogle from '../config/auth/google-oauth.js';
import { PADDING } from '../constants/theme/index.js';
import { translateX_and_translateY } from './text_utils.js';

export const IMAGE_CONFIG = {
  Code: { height: 3.06, width: 3.89 },
  Title: { height: 4.1, width: 4.1 }
};

export const PT_UNIT = 72;
export const convertToPt = (value) => Math.round(value * PT_UNIT);

export const compressImage = async (inputPath, outputDir) => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, path.basename(inputPath));

  // Use native Bun.Image if running on Bun
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(inputPath);
    const image = file.image();
    if (inputPath.toLowerCase().endsWith('.png')) {
      await image.png().write(outputPath);
    } else {
      await image.jpeg({ quality: 80 }).write(outputPath);
    }
    return outputPath;
  }

  // Node.js fallback using sharp
  const { default: sharp } = await import('sharp');
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
    image.jpeg({ quality: 80 });
  } else if (metadata.format === 'png') {
    image.png({ compressionLevel: 9, palette: true });
  }
  await image.toFile(outputPath);
  return outputPath;
};

export const resizeAndSaveImage = async (inputPath, outputDir, slideType = 'Code') => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (slideType === 'SkipResize') {
    return compressImage(inputPath, outputDir);
  }
  const dim = IMAGE_CONFIG[slideType] || IMAGE_CONFIG.Code;
  const width = convertToPt(dim.width) * 2; // double size for resolution
  const height = convertToPt(dim.height) * 2;

  const safeFileName = `${path.basename(inputPath, path.extname(inputPath))}_resized${path.extname(inputPath)}`;
  const outputPath = path.join(outputDir, safeFileName);

  // Use native Bun.Image if running on Bun
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(inputPath);
    const image = file.image().resize(width, height, { fit: 'inside' });
    if (inputPath.toLowerCase().endsWith('.png')) {
      await image.png().write(outputPath);
    } else {
      await image.jpeg({ quality: 80 }).write(outputPath);
    }
    return outputPath;
  }

  // Node.js fallback using sharp
  const { default: sharp } = await import('sharp');
  const image = sharp(inputPath).resize(width, height);
  const metadata = await image.metadata();

  if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
    image.jpeg({ quality: 80 });
  } else if (metadata.format === 'png') {
    image.png({ compressionLevel: 9, palette: true });
  }
  await image.toFile(outputPath);
  return outputPath;
};

export const compressImageAndUpload = async (fileName, slideType, folderName) => {
  let compressedPath = null;
  try {
    const baseImageDir = path.resolve(process.cwd(), 'Presentation', 'media', 'images');
    const imagePath = path.join(baseImageDir, folderName, fileName);
    const uploadDir = path.join(baseImageDir, 'code_snippets', 'temp_storage');

    if (!fs.existsSync(imagePath)) {
      console.error(`Image file not found at: ${imagePath}`);
      return null;
    }

    const authClient = await AuthWithGoogle();

    // Check Drive Cache if it's a logo
    if (folderName === 'logos') {
      const cachedUrl = await getLogoFromDrive(authClient, fileName);
      if (cachedUrl) {
        return { ImageUrl: cachedUrl };
      }
      
      // If it doesn't exist, we resize it first locally
      compressedPath = await resizeAndSaveImage(imagePath, uploadDir, slideType);
      if (compressedPath) {
        // Upload and save to logo cache
        const newUrl = await getLogoFromDrive(authClient, fileName, compressedPath);
        if (fs.existsSync(compressedPath)) {
          fs.unlinkSync(compressedPath);
        }
        return { ImageUrl: newUrl };
      }
      return null;
    }

    compressedPath = await resizeAndSaveImage(imagePath, uploadDir, slideType);
    if (!compressedPath) return null;

    let topicName = 'General';
    try {
      const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
      if (fs.existsSync(presentationJsonPath)) {
        const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
        const slides = JSON.parse(rawData);
        if (Array.isArray(slides)) {
          const titleSlide = slides.find(s => s.type === 'title');
          if (titleSlide && titleSlide.title) {
            topicName = titleSlide.title;
          }
        }
      }
    } catch (_) {}

    const imageUrl = await uploadImageToDrive(authClient, compressedPath, topicName);

    if (imageUrl && fs.existsSync(compressedPath)) {
      fs.unlinkSync(compressedPath);
    }
    return { ImageUrl: imageUrl };
  } catch (error) {
    console.error('Image Upload Error:', error.message);
    if (compressedPath && fs.existsSync(compressedPath)) {
      try { fs.unlinkSync(compressedPath); } catch (_) {}
    }
    return null;
  }
};

export const createImage = (imageId, pageId, link, slideType, currentOffsetY = 0, alignment = 'flex-start', justifyContent = 'center') => {
  let requests = [];
  const dim = IMAGE_CONFIG[slideType] || IMAGE_CONFIG.Code;

  let imageLayout = {
    alignItems: alignment,
    justifyContent: justifyContent,
    padding: PADDING.title_padding,
  };
  let imageMetrics = {
    elementWidth: convertToPt(dim.width),
    elementHeight: convertToPt(dim.height),
    totalContentHeight: convertToPt(dim.height),
    currentOffsetY: currentOffsetY
  };
  const transformData = translateX_and_translateY(imageLayout, imageMetrics);
  requests.push({
    createImage: {
      objectId: imageId,
      url: link,
      elementProperties: {
        pageObjectId: pageId,
        size: {
          height: { magnitude: convertToPt(dim.height), unit: 'PT' },
          width: { magnitude: convertToPt(dim.width), unit: 'PT' }
        },
        transform: {
          ...transformData,
          unit: 'PT'
        }
      }
    }
  });
  return requests;
};

export default resizeAndSaveImage;
