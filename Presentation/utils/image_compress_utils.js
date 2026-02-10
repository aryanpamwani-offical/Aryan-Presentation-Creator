import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Dimension config (centralized)
export const IMAGE_CONFIG = {
  Code: { height: 6.95, width: 3.45 },
  Title: { height: 4.1, width: 4.1 },

};

export const PT_UNIT = 144;
export const convertToPt = (value) => Math.round(value * PT_UNIT);


const resizeAndSaveImage = async (inputPath, outputDir, slideType = 'Code') => {
  try {
    // Ensure secure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get dimensions from config, fallback to Code
    const dim = IMAGE_CONFIG[slideType] || IMAGE_CONFIG.Code;

    // Convert to points (or pixels depending on sharp usage)
    const width = convertToPt(dim.width);
    const height = convertToPt(dim.height);

    // Generate a safe filename
    const safeFileName = `resized_${slideType}_${Date.now()}.jpg`;
    const outputPath = path.join(outputDir, safeFileName);

    // Resize and save
    await sharp(inputPath)
      .resize(width, height)
      .toFile(outputPath);

    console.log(`Image (${slideType}) saved securely at: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error('Error resizing image:', err);
    return null;
  }
};

export const compressImage = async (inputPath, outputDir) => {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = path.basename(inputPath);
    const outputPath = path.join(outputDir, fileName);

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      image.jpeg({ quality: 80 });
    } else if (metadata.format === 'png') {
      image.png({ compressionLevel: 9, palette: true });
    }

    await image.toFile(outputPath);

    console.log(`Image compressed and saved at: ${outputPath}`);
    return outputPath;
  } catch (err) {
    console.error('Error compressing image:', err);
    return null;
  }
};

export default resizeAndSaveImage;
