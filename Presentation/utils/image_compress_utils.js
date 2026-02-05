import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Dimension config (centralized)
export const IMAGE_CONFIG = {
  Code: { height: 6.95, width: 3.45 },
  Title: { height: 4.1, width: 4.1 },
  
};

export const PT_UNIT = 28;
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
  } catch (err) {
    console.error('Error resizing image:', err);
  }
};

export default resizeAndSaveImage;
