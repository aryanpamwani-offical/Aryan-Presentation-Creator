import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// ../../media/json
const __dirname = path.resolve(
  path.dirname(__filename),
  '../',
  'media',
  'json'
);

async function saveJSONFile(data, fileName = 'presentation.json') {
  try {
    if (!data) {
      console.error('❌ No data provided to saveJSONFile');
      return false;
    }

    const filePath = path.join(__dirname, fileName);

    // Bun.write automatically creates missing parent directories
    await Bun.write(filePath, data);
    console.log(`✅ JSON file saved to ${filePath}`);

    return true;
  } catch (error) {
    console.error('❌ Error saving JSON file:', error.message);
    return false;
  }
}

export default saveJSONFile;
