import fs from 'fs';
import path from 'path';

export const loadSlidesData = () => {
  try {
    const filePath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(rawData);
    } else {
      console.warn('⚠ presentation.json not found, returning empty array');
      return [];
    }
  } catch (error) {
    console.error('❌ Error loading slides data:', error);
    return [];
  }
};

// Deprecated: For backward compatibility if needed, but preferably use loadSlidesData
export const slidesData = loadSlidesData();

export const saveSlidesData = (data) => {
  try {
    const filePath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ presentation.json updated successfully.');
  } catch (error) {
    console.error('❌ Error saving slides data:', error);
  }
};

export const updateSlideImage = (index, imageUrl) => {
  const currentData = loadSlidesData();
  if (currentData[index]) {
    currentData[index].imageUrl = imageUrl;
    saveSlidesData(currentData);
  } else {
    console.warn(`⚠ Slide at index ${index} not found.`);
  }
};
