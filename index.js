import RaySo from 'rayso';
import fs from 'fs';
import path from 'path';

// Define directories
const previewDir = path.resolve('previews'); 
const codeFile = 'code.json';

// Ensure the preview directory exists
if (!fs.existsSync(previewDir)){
    fs.mkdirSync(previewDir);
}

// Initialize RaySo
const raySo = new RaySo({
    theme: 'candy',
    padding: 32,
    background: false,
    darkMode: true,
    title: "Vs-code",
    
});

async function generateScreenshots() {
    try {
        console.log(`Reading ${codeFile}...`);
        const rawData = fs.readFileSync(codeFile, 'utf8');
        
        let codeBlocks = JSON.parse(rawData);
        
        // Ensure codeBlocks is an array even if the JSON is a single object
        if (!Array.isArray(codeBlocks)) {
            codeBlocks = [codeBlocks];
        }

        for (const [index, block] of codeBlocks.entries()) {
            // Map your specific JSON keys here:
            // Use 'id' for the filename (e.g., snippet_1.png)
            const fileId = block.id || (index + 1);
            const fileName = `snippet_${fileId}`;
            
            // Use 'codeblock' for the actual code content
            const code = block.codeblock;

            if (!code) {
                console.warn(`Skipping item ${fileId}: No 'codeblock' found.`);
                continue;
            }

            console.log(`Processing: ${fileName}...`);

            // Generate the image
            const response = await raySo.cook(code);
            
            // Save the screenshot
            const outputPath = path.join(previewDir, `${fileName}.png`);
            fs.writeFileSync(outputPath, response);
            
            console.log(`Saved: ${outputPath}`);
        }

        console.log('All screenshots generated successfully!');

    } catch (err) {
        console.error('Error:', err);
    }
}

generateScreenshots();