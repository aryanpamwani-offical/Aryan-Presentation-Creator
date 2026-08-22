import fs from 'fs';
import path from 'path';
import AuthWithGoogle from '../Presentation/config/auth/google-oauth.js';
import { resizeAndSaveImage } from '../Presentation/utils/image_helper.js';
import { getLogoFromDrive } from '../Presentation/config/drive/google_drive.js';

const LOCAL_LOGOS_DIR = path.resolve(process.cwd(), 'Presentation', 'media', 'images', 'logos');
const TEMP_DIR = path.join(LOCAL_LOGOS_DIR, 'temp_storage');

async function main() {
  try {
    console.log('🔐 Authenticating with Google...');
    const auth = await AuthWithGoogle();

    if (!fs.existsSync(LOCAL_LOGOS_DIR)) {
      console.error('❌ Logos directory not found.');
      return;
    }

    const files = fs.readdirSync(LOCAL_LOGOS_DIR);
    const logoFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

    if (logoFiles.length === 0) {
      console.log('ℹ️ No local logos found to upload.');
      return;
    }

    console.log(`🚀 Resizing and uploading ${logoFiles.length} logos to Google Drive...`);
    for (const filename of logoFiles) {
      if (filename === 'no-image.png') continue; // Skip generic placeholder
      
      const localPath = path.join(LOCAL_LOGOS_DIR, filename);
      console.log(`\nProcessing: ${filename}...`);

      // Check if it already exists on Drive
      const existingUrl = await getLogoFromDrive(auth, filename);
      if (existingUrl) {
        console.log(`🎯 Logo already exists in Drive: ${filename}. Skipping.`);
        continue;
      }

      // Resize locally first
      const resizedPath = await resizeAndSaveImage(localPath, TEMP_DIR, 'Title');
      if (resizedPath) {
        // Upload to Drive logo cache folder
        const newUrl = await getLogoFromDrive(auth, filename, resizedPath);
        console.log(`✅ Uploaded and cached: ${filename} -> ${newUrl}`);

        // Cleanup temporary resized file
        if (fs.existsSync(resizedPath)) {
          fs.unlinkSync(resizedPath);
        }
      } else {
        console.error(`❌ Failed to resize ${filename}`);
      }
    }

    // Cleanup temp directory if empty
    if (fs.existsSync(TEMP_DIR)) {
      try {
        fs.rmdirSync(TEMP_DIR);
      } catch (_) {}
    }

    console.log('\n🎉 Logo upload batch completed successfully!');
  } catch (error) {
    console.error('❌ Error during logo upload script:', error.message);
  }
}

main();
