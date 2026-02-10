import { google } from "googleapis";
import AuthWithGoogle from "../config/auth/google-oauth.js";
import buildPresentation, { slidesData } from "./skillbuilder.js";


const createSlides = async () => {
  try {
    const authClient = await AuthWithGoogle();
    const slidesApi = google.slides({ version: "v1", auth: authClient });

    // 1. Create the presentation (returns default slide info)
    const response = await slidesApi.presentations.create({
      requestBody: { title: slidesData[0].title }
    });

    const presentationId = response.data.presentationId;

    // 2. Identify the default slide ID created automatically by Google

    const defaultSlideId = response.data.slides[0].objectId;
    // 3. Generate the request array, passing the ID to be deleted
    const slideRequests = await buildPresentation(defaultSlideId);

    // 4. Execute all requests in a single batch
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: slideRequests }
    });

    console.log(`View here: https://docs.google.com/presentation/d/${presentationId}/edit`);
    return response;
  } catch (error) {
    console.error("Error:", error.message);
  }
}

const slides = await createSlides();