import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);

// ../../media/json
const __dirname = path.resolve(
  path.dirname(__filename),
  '../',
  'media',
  'json'
);

function saveJSONFile(data) {
  try {
    if (!data) {
      console.error('❌ No data provided to saveJSONFile');
      return false;
    }

    // Create folder only if it does not exist
    if (!fs.existsSync(__dirname)) {
      fs.mkdirSync(__dirname, { recursive: true });
      console.log(`📁 Created directory: ${__dirname}`);
    } else {
      console.log(`📂 Directory already exists: ${__dirname}`);
    }

    const filePath = path.join(__dirname, 'presentation.json');

    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`✅ JSON file saved to ${filePath}`);

    return true;
  } catch (error) {
    console.error('❌ Error saving JSON file:', error.message);
    return false;
  }
}

export default saveJSONFile;
