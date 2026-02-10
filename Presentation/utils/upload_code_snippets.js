import fs from 'fs';
import path from 'path';
import uploadImageToDrive from '../config/drive/google_drive.js';
import AuthWithGoogle from '../config/auth/google-oauth.js';
import { generateAllSnippets } from './generate_code_snippet.js';
import { compressImage } from './image_compress_utils.js';

const uploadCodeSnippets = async (options = {}) => {
    const { regenerate = false, theme, font, omitBackground } = options;
    try {
        const codeJsonPath = path.resolve(process.cwd(), 'code.json');
        if (!fs.existsSync(codeJsonPath)) {
            console.error('code.json not found!');
            return {};
        }

        const rawData = fs.readFileSync(codeJsonPath, 'utf8');
        let codeBlocks = JSON.parse(rawData);

        if (!Array.isArray(codeBlocks)) {
            codeBlocks = [codeBlocks];
        }

        // Step 1: Generate code snippet images
        console.log('\n🎨 Step 1: Generating code snippet images...');
        const baseImageDir = path.resolve(process.cwd(), 'Presentation', 'media', 'images', 'code_snippets');

        // Check if we need to generate images
        const needsGeneration = regenerate || codeBlocks.some(block => {
            const fileName = `slide-${block.slide_number}.png`;
            const filePath = path.join(baseImageDir, fileName);
            return !fs.existsSync(filePath);
        });

        if (needsGeneration) {
            // Pass options to generateAllSnippets
            await generateAllSnippets({ theme, font, omitBackground });
        } else {
            console.log('✓ All snippet images already exist. Use regenerate=true to recreate them.');
        }

        // Step 2: Upload to Google Drive
        console.log('\n☁️  Step 2: Uploading images to Google Drive...\n');

        const uploadedSnippets = [];
        const uploadedSnippetsMap = {}; // Map slide_number -> imageUrl

        // Load existing uploads to check for duplicates/cache
        let existingUploads = {};
        const uploadedJsonPath = path.resolve(process.cwd(), 'uploaded_code_snippets.json');
        if (fs.existsSync(uploadedJsonPath)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(uploadedJsonPath, 'utf8'));
                if (Array.isArray(existingData)) {
                    existingData.forEach(item => {
                        if (item.slide_number && item.imageUrl) {
                            existingUploads[item.slide_number] = item.imageUrl;
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not parse existing uploaded_code_snippets.json');
            }
        }

        const authClient = await AuthWithGoogle();

        for (const [index, block] of codeBlocks.entries()) {
            if (!block.slide_number) {
                console.warn(`Skipping block index ${index}: No slide_number found.`);
                continue;
            }

            // Check if we can reuse existing URL
            if (!regenerate && existingUploads[block.slide_number]) {
                const cachedUrl = existingUploads[block.slide_number];
                console.log(`✓ reusing existing URL for slide ${block.slide_number}`);

                uploadedSnippets.push({
                    ...block,
                    imageUrl: cachedUrl
                });
                uploadedSnippetsMap[block.slide_number] = cachedUrl;
                continue;
            }

            const fileName = `slide-${block.slide_number}.png`;
            const filePath = path.join(baseImageDir, fileName);

            if (!fs.existsSync(filePath)) {
                console.warn(`Image not found: ${fileName} in ${baseImageDir}`);
                continue;
            }

            console.log(`Uploading ${fileName}...`);

            // Compress image
            const tempDir = path.join(baseImageDir, 'temp_storage');

            // Ensure temp_storage exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const compressedPath = await compressImage(filePath, tempDir);
            let uploadPath = filePath;

            if (compressedPath) {
                console.log(`Using compressed image for upload: ${compressedPath}`);
                uploadPath = compressedPath;
            } else {
                console.warn(`Compression failed, falling back to original image: ${filePath}`);
            }

            // Upload to Google Drive
            const imageUrl = await uploadImageToDrive(authClient, uploadPath);

            if (imageUrl) {
                uploadedSnippets.push({
                    ...block,
                    imageUrl: imageUrl
                });
                uploadedSnippetsMap[block.slide_number] = imageUrl;
                console.log(`Uploaded ${fileName}: ${imageUrl}`);
            } else {
                console.error(`Failed to upload ${fileName}`);
            }
        }

        if (uploadedSnippets.length > 0) {
            fs.writeFileSync(uploadedJsonPath, JSON.stringify(uploadedSnippets, null, 2));
            console.log(`Successfully saved ${uploadedSnippets.length} snippets to uploaded_code_snippets.json`);
        } else {
            console.log('No snippets were uploaded or found.');
        }

        // --- Cleanup ---
        try {
            const tempStorageDir = path.join(baseImageDir, 'temp_storage');
            
            // Delete generated slide images
            if (fs.existsSync(baseImageDir) && fs.existsSync(tempStorageDir)) {
                const files = fs.readdirSync(baseImageDir);
                const tempFiles = fs.readdirSync(tempStorageDir);
                for (const file of files) {
                    if (file.startsWith('slide-') && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))) {
                        fs.unlinkSync(path.join(baseImageDir, file));
                    }
                }
                for (const file of tempFiles) {
                    if (file.startsWith('slide-') && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))) {
                        fs.unlinkSync(path.join(tempStorageDir, file));
                    }
                }
                console.log(`Deleted generated slide images in ${baseImageDir}`);
            }
        } catch (err) {
            console.warn('Error during cleanup:', err);
        }

        return uploadedSnippetsMap;

    } catch (error) {
        console.error('Error in uploadCodeSnippets:', error);
        return {};
    }
};

// Execute if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    // Check for --regenerate flag
    const regenerate = process.argv.includes('--regenerate');
    uploadCodeSnippets({ regenerate });
}

export default uploadCodeSnippets;
