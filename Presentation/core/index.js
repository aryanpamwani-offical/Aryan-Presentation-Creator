import { google } from "googleapis"
import AuthWithGoogle from "../config/auth/google-oauth.js";

import buildPresentation from "./skillbuilder.js";


const createSlides = async () => {
  try {
    const authClient = await AuthWithGoogle(); 
    const slidesApi = google.slides({ version: "v1", auth: authClient });

    const response = await slidesApi.presentations.create({
        requestBody: { title: "A1" }
    });
    
    const presentationId = response.data.presentationId;
   
    // Pass both IDs to your bodySlides function
    const slideRequests = await buildPresentation();

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
const slides=await createSlides();
// console.log(slides)