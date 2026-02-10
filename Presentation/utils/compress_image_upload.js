import path from 'path';
import fs from 'fs';
import uploadImageToDrive from '../config/drive/google_drive.js';
import resizeAndSaveImage from './image_compress_utils.js';
import AuthWithGoogle from '../config/auth/google-oauth.js';



const compress_image_upload = async (fileName, slideType, folderName) => {
    try {
        let ImageUrl;

        // Construct absolute paths to avoid relative path issues from different execution contexts
        // Assuming this file is in Presentation/utils/
        // images are in Presentation/media/images/

        // Resolve the base directory for images relative to this file
        const baseImageDir = path.resolve(process.cwd(), 'Presentation', 'media', 'images');

        const imagePath = path.join(baseImageDir, folderName, fileName);
        const uploadDir = path.join(baseImageDir, 'temp_storage');

        if (fs.existsSync(imagePath)) {
            // Ensure upload directory exists - resizeAndSaveImage does this but good to be explicit/safe
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Pass the directory, not a file path, to resizeAndSaveImage as per its definition
            const compressed_image_path = await resizeAndSaveImage(imagePath, uploadDir, slideType);

            if (!compressed_image_path) {
                console.log("The image is not compressed");
                return null;
            }

            const authClient = await AuthWithGoogle();

            // uploadImageToDrive expects (auth, filePath) based on analysis
            ImageUrl = await uploadImageToDrive(authClient, compressed_image_path);

        } else {
            console.error(`Image file not found at: ${imagePath}`);
            return null;
        }

        console.log("Uploaded Image URL:", ImageUrl);
        return { ImageUrl };
    } catch (error) {
        console.log('Image Upload Error', error.message);
        return null;
    }
}

export default compress_image_upload