import { google } from 'googleapis';
import AuthWithGoogle from '../Presentation/config/auth/google-oauth.js';

async function cleanupDriveRoot() {
  try {
    console.log('🔐 Authenticating with Google...');
    const auth = await AuthWithGoogle();
    const drive = google.drive({ version: 'v3', auth });

    console.log('🔍 Listing files in Google Drive root...');
    // In Google Drive v3, root folder has alias 'root'.
    const res = await drive.files.list({
      q: "'root' in parents and trashed = false",
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
    });

    const files = res.data.files || [];
    if (files.length === 0) {
      console.log('✅ No files found in the root directory.');
      return;
    }

    // Pattern matching:
    // 1. Starts with "slide-" (case-insensitive, matches e.g. "slide-1-concept")
    // 2. Contains the term "resized" (case-insensitive, matches e.g. "css_resized_file")
    // 3. Supported extensions: .png, .jpg, .jpeg, .webp
    const imageExtensions = /\.(png|jpe?g|webp)$/i;
    const slidePattern = /^slide-/i;
    const resizedPattern = /resized/i;

    const filesToDelete = files.filter(file => {
      const name = file.name;
      const matchesPattern = slidePattern.test(name) || resizedPattern.test(name);
      const isAcceptedImage = imageExtensions.test(name);
      return matchesPattern && isAcceptedImage;
    });

    if (filesToDelete.length === 0) {
      console.log('✅ No matching slide or resized images found in root to delete.');
      return;
    }

    console.log(`🗑️ Found ${filesToDelete.length} slide/resized image(s) in root. Deleting...`);
    for (const file of filesToDelete) {
      console.log(`Deleting: ${file.name} (ID: ${file.id})...`);
      await drive.files.delete({ fileId: file.id });
    }
    console.log('🎉 Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

cleanupDriveRoot();
