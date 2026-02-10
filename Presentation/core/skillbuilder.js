import { createSlideIds } from "../constants/theme/generateId.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";
import { manageCodeSnippets } from "./snippet_manager.js";

import buildTitleSlide from "./slide_builders/title_slide.js";
import buildThankYouSlide from "./slide_builders/thank_you_slide.js";
import buildModuleIntroSlide from "./slide_builders/module_intro_slide.js";
import buildConceptSlide from "./slide_builders/concept_slide.js";
import buildScreenshotTutorialSlide from "./slide_builders/screenshot_tutorial_slide.js";
import buildNotesSlide from "./slide_builders/notes_slide.js";
import { slidesData } from "./slide_builders/slideData.js";





const buildPresentation = async (defaultSlideId) => {
  const requests = [];
  const slideIds = [];

  // --- 0. Interactive Code Snippet Generation & Upload ---
  await manageCodeSnippets(slidesData);

  // --- Generate Requests for Each Slide ---
  for (const [index, slide] of slidesData.entries()) {
    const { type } = slide;
    const { pageId, elements } = createSlideIds(type); // Use slide.type which matches our new mapping

    slideIds.push(pageId);

    // Create Slide
    requests.push({
      createSlide: { objectId: pageId, insertionIndex: index }
    });

    // Background Color
    requests.push({
      updatePageProperties: {
        objectId: pageId,
        pageProperties: {
          pageBackgroundFill: { solidFill: { color: { rgbColor: THEME_COLORS.bg } } }
        },
        fields: "pageBackgroundFill.solidFill.color"
      }
    });

    // Build Slide Content
    if (type === "title") { // Handle lowercase 'title' mapping if needed, or update createSlideIds to be case insensitive/consistent
      // Note: `createSlideIds` expects "Title" (case sensitive in original, but I updated it to handle 'Title'). 
      // My mock data uses lowercase. I should standardise.
      // `createSlideIds` acts on "Title" or "title" now? 
      // I updated `generateId.js` to handle "Title", but my mock data has "title".
      // I should probably ensure `createSlideIds` handles the types correctly (I added OR conditions).

      const titleRequests = await buildTitleSlide(pageId, elements, slide);
      requests.push(...titleRequests);
    } else if (type === "module_intro") {
      requests.push(...buildModuleIntroSlide(pageId, elements, slide));
    } else if (type === "concept") {
      requests.push(...buildConceptSlide(pageId, elements, slide));
    } else if (type === "code") {
      requests.push(...buildScreenshotTutorialSlide(pageId, elements, slide));
    } else if (type === "notes") {
      requests.push(...buildNotesSlide(pageId, elements, slide));
    } else if (type === "thank_you") {
      requests.push(...buildThankYouSlide(pageId, elements));
    }
  }

  // --- DELETE DEFAULT SLIDE ---
  if (defaultSlideId) {
    requests.push({
      deleteObject: { objectId: defaultSlideId }
    });
  }

  return requests;
};

export default buildPresentation;