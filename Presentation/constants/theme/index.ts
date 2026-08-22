export const THEME_COLORS = {
  bg: { red: 0.00, green: 0.00, blue: 0.00 },
  text: { red: 0.88, green: 0.88, blue: 0.88 },
  accent: { red: 0.26, green: 0.52, blue: 0.96 },
  secondaryText: { red: 0.6, green: 0.6, blue: 0.6 },
  summaryAccent: { red: 0.259, green: 0.522, blue: 0.961 },
  codeAccent: { red: 0.0, green: 1.0, blue: 1.0 }
};

export const FONTS = {
  heading: 'Poppins',
  body: 'Inter'
};

export const FONT_SIZES = {
  moduleLabel: 18,
  title: 42,
  subTitle: 20,
  subHeadng: 18,
  body: 14,
  description: 12
};

export const FONT_WEIGHTS = {
  normal: 400,
  bold: 700
};

export const PADDING = {
  title_padding: 40,
  module_intro_padding: 60
};

export const slideTypes = {
  title: {
    layout: {
      container: { alignItems: "center", justifyContent: "flex-end", padding: 40 }
    }
  },
  module_intro: {
    layout: {
      container: { alignItems: "flex-start", justifyContent: "center", padding: 60 }
    }
  },
  concept: {
    layout: {
      container: { alignItems: "flex-start", justifyContent: "center", padding: 60 }
    }
  },
  screenshot_tutorial: {
    layout: {
      container: { alignItems: "flex-start", justifyContent: "flex-start", padding: 40 }
    }
  },
  code: {
    layout: {
      container: { alignItems: "flex-start", justifyContent: "flex-start", padding: 40 }
    }
  },
  notes: {
    layout: {
      container: { alignItems: "flex-start", justifyContent: "center", padding: 60 }
    }
  },
  thank_you: {
    layout: {
      container: { alignItems: "center", justifyContent: "center", padding: 80 }
    }
  }
};

export const globalSlides = (title: string | null, subtitle: string | null, imagePath: string | null) => {
  return {
    titleSlide: {
      template: "title",
      title: title || "Untitled Presentation",
      subtitle: subtitle || "",
      localImagePath: imagePath || null,
    },
    thankYouSlide: {
      template: "thank_you",
      title: "Thank You"
    }
  };
};

const generateId = (prefix: string) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${randomPart}`;
};

export const createSlideIds = (slideType: string) => {
  const pageId = generateId(`${slideType.toUpperCase()}_PAGE`);
  const elements: Record<string, string> = {};
  const lowerType = slideType.toLowerCase();

  if (lowerType === 'concept') {
    elements.title = generateId('CON_TITLE');
    elements.body = generateId('CON_BODY');
    elements.image = generateId('CON_IMG');
  } else if (lowerType === 'module' || lowerType === 'module_intro') {
    elements.title = generateId('MOD_TITLE');
    elements.body = generateId('MOD_BODY');
  } else if (lowerType === 'code' || lowerType === 'screenshot_tutorial') {
    elements.title = generateId('SS_TITLE');
    elements.image = generateId('SS_IMG');
    elements.caption = generateId('SS_CAPTION');
  } else if (lowerType === 'notes') {
    elements.title = generateId('NOTE_TITLE');
    elements.body = generateId('NOTE_BODY');
  } else if (lowerType === 'title') {
    elements.image = generateId('TITLE_IMG');
    elements.title = generateId('TITLE_TXT');
    elements.description = generateId('TITLE_DESC');
  } else if (lowerType === 'thankyou' || lowerType === 'thank_you') {
    elements.title = generateId('TY_TXT');
  }

  return { pageId, elements };
};

export default THEME_COLORS;
