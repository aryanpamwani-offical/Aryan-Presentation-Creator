import { google } from "googleapis";
import AuthWithGoogle from "../config/auth/google-oauth.js";
import fs from "fs";
import path from "path";

/**
 * Exports a Google Slides presentation to PDF.
 * @param {string} presentationId - The ID of the Google Slides presentation.
 * @param {string} outputName - The desired name for the output PDF file.
 */
const exportPresentationToPDF = async (presentationId, outputName = "Presentation.pdf") => {
    try {
        console.log(`\n📄 Starting PDF Export for ID: ${presentationId}...`);

        const auth = await AuthWithGoogle();
        const drive = google.drive({ version: "v3", auth });

        const destPath = path.resolve(process.cwd(), "Presentation", "outputs", outputName);

        // Ensure directory exists
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const dest = fs.createWriteStream(destPath);

        const res = await drive.files.export(
            {
                fileId: presentationId,
                mimeType: "application/pdf",
            },
            { responseType: "stream" }
        );

        return new Promise((resolve, reject) => {
            res.data
                .on("end", () => {
                    console.log(`✅ PDF exported successfully to: ${destPath}`);
                    resolve(destPath);
                })
                .on("error", (err) => {
                    console.error("❌ Error downloading PDF:", err);
                    reject(err);
                })
                .pipe(dest);
        });
    } catch (error) {
        console.error("❌ Failed to export PDF:", error.message);
        throw error; // Re-throw to handle in main loop if needed
    }
};

export default exportPresentationToPDF;
