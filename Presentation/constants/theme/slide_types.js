import { center_align, top_align } from "./align_items.js";
import { justify_center, justify_flex_end, justify_flex_start } from "./justify_items.js";
import {
    title_padding,
    module_intro_Padding,
    concept_Padding,
    code_Padding,
    screenshot_tutorial_Padding,
    notes_Padding,
    thank_you_Padding
} from "./padding.js";

const slideTypes = {
    "title": {
      "layout": {
        "container": { "alignItems": center_align, "justifyContent": justify_flex_end, "padding": title_padding }
      }
    },
    "module_intro": {
      "layout": {
        "container": { "alignItems": top_align, "justifyContent": justify_center, "padding": module_intro_Padding }
      }
    },
    "concept": {
      "layout": {
        "container": { "alignItems": top_align, "justifyContent": justify_center, "padding": concept_Padding }
      }
    },
    "code": {
      "layout": {
        "container": { "alignItems": top_align, "justifyContent": justify_center, "padding": code_Padding }
      }
    },
    "screenshot_tutorial": {
      "layout": {
        "container": { "alignItems": top_align, "justifyContent": justify_flex_start, "padding": screenshot_tutorial_Padding }
      }
    },
    "notes": {
      "layout": {
        "container": { "alignItems": top_align, "justifyContent": justify_center, "padding": notes_Padding }
      }
    },
    "thank_you": {
      "layout": {
        "container": { "alignItems": center_align, "justifyContent": justify_center, "padding": thank_you_Padding }
      }
    }
  };
const globalSlides= (title, subtitle, imagePath) => {
  return {
    titleSlide: {
      template: "title",
      title: title || "Untitled Presentation",
      subtitle: subtitle || "",
      localImagePath: imagePath || null,
      // imagePrompt: "Fallback: No image is found"
    },
    thankYouSlide: {
      template: "thank_you",
      title: "Thank You"
    }
  };
};



export {
    slideTypes,
    globalSlides
}
