import fs from 'fs';
import path from 'path';
import https from 'https';

const dest = path.resolve(process.cwd(), 'Presentation', 'templates', 'tailwind.min.js');
console.log(`Downloading Tailwind CDN to: ${dest}`);

const downloadFile = (url, destPath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirect
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const nextUrl = response.headers.location.startsWith('http') 
          ? response.headers.location 
          : new URL(response.headers.location, url).toString();
        console.log(`Following redirect to: ${nextUrl}`);
        downloadFile(nextUrl, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download (status code: ${response.statusCode})`));
        return;
      }
      
      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

downloadFile('https://cdn.tailwindcss.com', dest)
  .then(() => {
    console.log('✅ Tailwind compiler downloaded successfully!');
  })
  .catch((err) => {
    console.error('❌ Error downloading:', err.message);
  });
