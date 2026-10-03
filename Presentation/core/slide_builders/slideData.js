import fs from 'fs';
import path from 'path';

export const unescapeText = (str) => {
  if (!str || typeof str !== 'string') return '';
  let text = str;
  text = text.replace(/\\+r\\+n/gi, '\n');
  text = text.replace(/\\+n/gi, '\n');
  text = text.replace(/\\+r/gi, '\n');
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  text = text.replace(/\\+\n/g, '\n');
  text = text.replace(/\n\\+/g, '\n');
  return text;
};

export const loadSlidesData = () => {
  try {
    const filePath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      if (Array.isArray(data)) {
        return data.map((slide) => {
          if (typeof slide.body === 'string') {
            slide.body = unescapeText(slide.body);
          }
          if (typeof slide.description === 'string') {
            slide.description = unescapeText(slide.description);
          }
          if (typeof slide.caption === 'string') {
            slide.caption = unescapeText(slide.caption);
          }
          if (typeof slide.title === 'string') {
            slide.title = unescapeText(slide.title);
          }
          if (typeof slide.codeTitle === 'string') {
            slide.codeTitle = unescapeText(slide.codeTitle);
          }
          if (typeof slide.CodeTitle === 'string') {
            slide.CodeTitle = unescapeText(slide.CodeTitle);
          }
          if (Array.isArray(slide.bullets)) {
            slide.bullets = slide.bullets.map((b) => typeof b === 'string' ? unescapeText(b) : b);
          }
          return slide;
        });
      }
      return data;
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
