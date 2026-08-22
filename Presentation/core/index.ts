import { google } from "googleapis";
import AuthWithGoogle from "../config/auth/google-oauth.js";
import buildPresentation from "./buildPresentation.js";
import { loadSlidesData } from "./slide_builders/slideData.js";
import { callWithRetry } from "../utils/retry.js"; // Import retry utility

const createSlides = async (defaultSlideId, auth = null) => {
  try {
    const authClient = auth ?? await AuthWithGoogle();
    const slidesApi = google.slides({ version: "v1", auth: authClient });

    // Reload data to ensure we have the latest generated content
    const slidesData = loadSlidesData();

    if (!slidesData || slidesData.length === 0) {
      throw new Error("No slides data found in presentation.json");
    }

    // 1. Create the presentation (returns default slide info)
    const tCreate = performance.now();
    const response = await callWithRetry(() => slidesApi.presentations.create({
      requestBody: { title: slidesData[0].title }
    }));
    console.log(`   📋 Create presentation  : ${(performance.now() - tCreate).toFixed(0)}ms`);

    const presentationId = response.data.presentationId;

    // 2. Identify the default slide ID created automatically by Google
    const defaultSlideId2 = response.data.slides[0].objectId;

    // 3. Generate the request array, passing the ID to be deleted
    const tBuild = performance.now();
    const slideRequests = await buildPresentation(defaultSlideId2);
    console.log(`   🔧 Build requests        : ${(performance.now() - tBuild).toFixed(0)}ms`);

    // 4. Execute all requests in a single batch
    const tBatch = performance.now();
    await callWithRetry(() => slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: slideRequests }
    }));
    console.log(`   📤 Batch update          : ${(performance.now() - tBatch).toFixed(0)}ms`);

    console.log(`View here: https://docs.google.com/presentation/d/${presentationId}/edit`);
    return response;
  } catch (error) {
    console.error("Error:", error.message);
  }
}

export default createSlides;