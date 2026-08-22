import fs from 'fs';
import path from 'path';
import https from 'https';

const LOGO_DIRECTORY = path.resolve(process.cwd(), 'Presentation', 'media', 'images', 'logos');

const logos = {
  python: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/python/python.png',
  cplusplus: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/cpp/cpp.png',
  csharp: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/csharp/csharp.png',
  typescript: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/typescript/typescript.png',
  go: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/go/go.png',
  rust: 'https://www.rust-lang.org/static/images/rust-logo-blk.png',
  ruby: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/ruby/ruby.png',
  php: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/php/php.png',
  swift: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/swift/swift.png',
  kotlin: 'https://cdn.jsdelivr.net/npm/programming-languages-logos/src/kotlin/kotlin.png'
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}, status code: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function main() {
  if (!fs.existsSync(LOGO_DIRECTORY)) {
    fs.mkdirSync(LOGO_DIRECTORY, { recursive: true });
  }

  console.log('🚀 Downloading major programming logos...');
  for (const [name, url] of Object.entries(logos)) {
    const dest = path.join(LOGO_DIRECTORY, `${name}.png`);
    try {
      console.log(`Downloading ${name} logo...`);
      await downloadFile(url, dest);
      console.log(`✅ Saved ${name}.png`);
    } catch (error) {
      console.error(`❌ Failed to download ${name} logo:`, error.message);
    }
  }
  console.log('🎉 Logo download batch complete!');
}

main();
