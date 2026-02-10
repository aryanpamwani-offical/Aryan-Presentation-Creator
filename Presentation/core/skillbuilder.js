import { createSlideIds } from "../constants/theme/generateId.js";
import THEME_COLORS from "../constants/theme/theme_colors.js";
import uploadCodeSnippets from "../utils/upload_code_snippets.js";
import { selectOption, askQuestion } from "../utils/interaction.js";
import config from "../config/snippet_config.js";

import buildTitleSlide from "./slide_builders/title_slide.js";
import buildThankYouSlide from "./slide_builders/thank_you_slide.js";
import buildModuleIntroSlide from "./slide_builders/module_intro_slide.js";
import buildConceptSlide from "./slide_builders/concept_slide.js";
import buildScreenshotTutorialSlide from "./slide_builders/screenshot_tutorial_slide.js";
import buildNotesSlide from "./slide_builders/notes_slide.js";


// --- Mock Content Data (In a real app, this would be passed in) ---
export const slidesData = [
  // ===== GLOBAL TITLE =====
  {
    type: "title",
    title: "Understanding Git Pull, Fetch, and Merge",
    localImagePath: "git.png",
    imageUrl: "https://drive.google.com/uc?id=1M63L4TD6F-JJNDDIL78BQ8HOuGiNBoDX&export=download",
    subtitle: "A clear analogy-based explanation of core Git collaboration commands."
  },

  // ===== MODULE 1 =====
  {
    type: "module_intro",
    moduleLabel: "Module 1",
    title: "Git Pull and Git Fetch",
    bullets: [
      "Difference between git pull and git fetch",
      "Git pull",
      "Git pull code",
      "Git fetch",
      "Git fetch code",
      "Summary"
    ]
  },
  {
    type: "concept",
    title: "Difference Between Git Pull and Git Fetch",
    body:
      "Git pull and git fetch are used to get updates from a remote repository. Git fetch only downloads changes, while git pull downloads and applies those changes to the current branch."
  },
  {
    type: "concept",
    title: "Git Pull",
    body:
      "Git pull is a combination of fetching and merging. It retrieves changes from the remote repository and immediately integrates them into the current working branch."
  },
  {
    type: "code",
    title: "Git Pull Code",
  //  image: "https://drive.google.com/uc?id=1ObJUTX-AMixmZQ6RR6-O5VZI54kKBChZ&export=download",
    description:
      "This command fetches the latest changes from the main branch of the remote repository and merges them into the current local branch."
  },
  {
    type: "concept",
    title: "Git Fetch",
    body:
      "Git fetch downloads updates from a remote repository without modifying the local working branch. It allows developers to review changes before merging."
  },
  {
    type: "code",
    title: "Git Fetch Code",
   // image: "https://drive.google.com/uc?id=1xS3sLx0QSJKYbl7ycoqiBMn9wSpUVN-f&export=download",
    description:
      "This command retrieves all updates from the remote repository but keeps the local branch unchanged."
  },
  {
    type: "notes",
    title: "Summary",
    bullets: [
      "Git fetch downloads changes without merging.",
      "Git pull fetches and merges changes automatically.",
      "Fetch is safer for reviewing updates before integration."
    ]
  },

  // ===== MODULE 2 =====
  {
    type: "module_intro",
    moduleLabel: "Module 2",
    title: "Git Merging",
    bullets: [
      "Merging in git",
      "Git merge",
      "Git merge code",
      "Summary"
    ]
  },
  {
    type: "concept",
    title: "Merging in Git",
    body:
      "Merging in git is the process of combining changes from different branches into a single branch. It is commonly used to integrate feature branches into the main branch."
  },
  {
    type: "concept",
    title: "Git Merge",
    body:
      "Git merge takes the changes from a specified branch and applies them to the current branch, creating a new merge commit if necessary."
  },
  {
    type: "code",
    title: "Git Merge Code",
   // image: "https://drive.google.com/uc?id=1EGPc3yYOFJYzZMibboV2-L5GitWjcnRz&export=download",
    description:
      "This command merges the feature-branch into the currently active branch."
  },
  {
    type: "notes",
    title: "Summary",
    bullets: [
      "Merging combines work from multiple branches.",
      "Git merge preserves commit history.",
      "Conflicts may occur and must be resolved manually."
    ]
  },


  // ===== GLOBAL THANK YOU =====
  {
    type: "thank_you",
    title: "Thank You"
  }
];

const buildPresentation = async (defaultSlideId) => {
  const requests = [];
  const slideIds = [];

  // --- 0. Interactive Code Snippet Generation & Upload ---
  console.log('\n--- Code Snippet Configuration ---');
  const shouldGenerateSnippets = await askQuestion('Do you want to generate/update code snippets?');

  let snippetMap = {};

  if (shouldGenerateSnippets) {
    // Interactive Selection
    const selectedThemeKey = await selectOption('Select Theme:', config.themes);
    const theme = selectedThemeKey || config.defaultTheme;
    console.log(`Selected Theme: ${config.themes[theme].name}`);

    const selectedFontKey = await selectOption('Select Font:', config.fonts);
    const font = selectedFontKey || config.defaultFont;
    console.log(`Selected Font: ${config.fonts[font].name}`);

    const withTransparent = await askQuestion('Do You Want with Transparent Background:');
    const omitBackground = withTransparent;

    // Generate & Upload
    snippetMap = await uploadCodeSnippets({
      regenerate: true,
      theme,
      font,
      omitBackground
    });
  } else {
    // Just upload whatever is there if needed, or maybe just read existing JSON?
    // For now, let's assume if they say NO, they might still want to use existing uploaded snippets.
    // But uploadCodeSnippets handles generation too.
    // We can call it with regenerate: false to just ensure everything is uploaded/get map.
    console.log('Using existing snippets (if any)...');
    snippetMap = await uploadCodeSnippets({ regenerate: false });
  }

  // --- Update slidesData with new URLs ---
  for (let i = 0; i < slidesData.length; i++) {
    const slide = slidesData[i];
    // slide_number is 1-based index (i + 1)
    const slideNumber = i + 1;

    if (snippetMap[slideNumber]) {
      console.log(`Updating slide ${slideNumber} image to: ${snippetMap[slideNumber]}`);
      slide.image = snippetMap[slideNumber];
      // Also update localImagePath/imageUrl just in case other builders usage differs
      slide.imageUrl = snippetMap[slideNumber];
    }
  }

  // --- Generate Requests for Each Slide ---
  for (let i = 0; i < slidesData.length; i++) {
    const slide = slidesData[i];
    const { pageId, elements } = createSlideIds(slide.type); // Use slide.type which matches our new mapping

    slideIds.push(pageId);

    // Create Slide
    requests.push({
      createSlide: { objectId: pageId, insertionIndex: i }
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
    if (slide.type === "title") { // Handle lowercase 'title' mapping if needed, or update createSlideIds to be case insensitive/consistent
      // Note: `createSlideIds` expects "Title" (case sensitive in original, but I updated it to handle 'Title'). 
      // My mock data uses lowercase. I should standardise.
      // `createSlideIds` acts on "Title" or "title" now? 
      // I updated `generateId.js` to handle "Title", but my mock data has "title".
      // I should probably ensure `createSlideIds` handles the types correctly (I added OR conditions).

      const titleRequests = await buildTitleSlide(pageId, elements, slide);
      requests.push(...titleRequests);
    } else if (slide.type === "module_intro") {
      requests.push(...buildModuleIntroSlide(pageId, elements, slide));
    } else if (slide.type === "concept") {
      requests.push(...buildConceptSlide(pageId, elements, slide));
    } else if (slide.type === "code") {
      requests.push(...buildScreenshotTutorialSlide(pageId, elements, slide));
    } else if (slide.type === "notes") {
      requests.push(...buildNotesSlide(pageId, elements, slide));
    } else if (slide.type === "thank_you") {
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