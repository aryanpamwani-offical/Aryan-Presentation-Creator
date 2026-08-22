import buildScreenshotTutorialSlide from "../Presentation/core/slide_builders/screenshot_tutorial_slide.js";
import { createSlideIds } from "../Presentation/constants/theme/index.js";

const mockSlideData = {
    type: "code",
    title: "Git Pull Code",
    imageUrl: "https://drive.google.com/uc?id=1BiXrlYg5ouUse-BadIaWbMXZTbfhd-kJ&export=download",
    description: "This command fetches the latest changes from the main branch of the remote repository and merges them into the current local branch."
};

const { pageId, elements } = createSlideIds("screenshot_tutorial");

console.log("Generated Page ID:", pageId);
console.log("Generated Elements:", elements);

const requests = buildScreenshotTutorialSlide(pageId, elements, mockSlideData);

console.log("Generated Requests:", JSON.stringify(requests, null, 2));

// Check if createImage request exists and has correct URL
const createImageRequest = requests.find(r => r.createImage);
if (createImageRequest && createImageRequest.createImage.url === mockSlideData.imageUrl) {
    console.log("PASS: createImage request found with correct URL.");
} else {
    console.error("FAIL: createImage request not found or has incorrect URL.");
}

// Check if caption text exists
const insertTextRequest = requests.find(r => r.insertText && r.insertText.text === mockSlideData.description);
if (insertTextRequest) {
    console.log("PASS: insertText request for description found.");
} else {
    console.error("FAIL: insertText request for description not found.");
}
