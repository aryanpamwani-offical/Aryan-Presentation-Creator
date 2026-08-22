import fs from 'fs';
import path from 'path';

const presentationJsonPath = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'presentation.json');

async function main() {
  if (fs.existsSync(presentationJsonPath)) {
    const rawData = fs.readFileSync(presentationJsonPath, 'utf8');
    const slides = JSON.parse(rawData);

    if (Array.isArray(slides)) {
      const updatedSlides = slides.map(slide => {
        if (slide.imageUrl) {
          const { imageUrl, ...rest } = slide;
          return rest;
        }
        return slide;
      });

      fs.writeFileSync(presentationJsonPath, JSON.stringify(updatedSlides, null, 2), 'utf8');
      console.log('✅ Successfully removed all imageUrl fields from presentation.json.');
    } else {
      console.error('❌ presentation.json is not an array.');
    }
  } else {
    console.error('❌ presentation.json not found.');
  }
}

main();
