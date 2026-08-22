// Type definitions for Aryan's Presentation Creator

export type SlideType = 'title' | 'module_intro' | 'concept' | 'code' | 'notes' | 'thank_you';

export interface BaseSlide {
  id: number;
  slide_number: number;
  type: SlideType;
}

export interface TitleSlide extends BaseSlide {
  type: 'title';
  title: string;
  subtitle: string;
  localImagePath: string;
  imageUrl: string;
}

export interface ModuleIntroSlide extends BaseSlide {
  type: 'module_intro';
  moduleLabel: string;
  title: string;
  bullets: string[];
}

export interface ConceptSlide extends BaseSlide {
  type: 'concept';
  title: string;
  body: string;
}

export interface CodeSlide extends BaseSlide {
  type: 'code';
  title: string;
  image: string;
  imageUrl: string;
  codeblock: string;
  codeTitle: string;
  description: string;
  language: string;
}

export interface NotesSlide extends BaseSlide {
  type: 'notes';
  title: 'Summary';
  bullets: string[];
}

export interface ThankYouSlide extends BaseSlide {
  type: 'thank_you';
  title: string;
}

export type Slide = TitleSlide | ModuleIntroSlide | ConceptSlide | CodeSlide | NotesSlide | ThankYouSlide;

// Outline Structure Types
export interface Subtopic {
  id: number;
  subtopic_title: string;
  subtopic_description: string;
}

export interface Topic {
  id: number;
  topic_title: string;
  topic_description: string;
  subtopics: Subtopic[];
}

export interface ModuleOutline {
  id: number;
  module_number: number;
  module_title: string;
  module_description: string;
  topics: Topic[];
}

export type Outline = ModuleOutline[];

// Snippet Configuration Types
export interface ThemeConfig {
  name: string;
  background: string;
  theme: string;
}

export interface FontConfig {
  name: string;
  src: string;
  fontFamily: string;
}

export interface SnippetConfig {
  defaultTheme: string;
  defaultFont: string;
  defaultLanguage: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  output: {
    directory: string;
    format: string;
    quality: number;
  };
  screenshot: {
    omitBackground: boolean;
    fullPage: boolean;
  };
  themes: Record<string, ThemeConfig>;
  fonts: Record<string, FontConfig>;
  languagePatterns: Record<string, string>;
}
