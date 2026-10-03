import buildConceptSlide from '../Presentation/core/slide_builders/concept_slide.js';
import buildNotesSlide from '../Presentation/core/slide_builders/notes_slide.js';
import buildModuleIntroSlide from '../Presentation/core/slide_builders/module_intro_slide.js';
import buildTitleSlide from '../Presentation/core/slide_builders/title_slide.js';
import buildScreenshotTutorialSlide from '../Presentation/core/slide_builders/screenshot_tutorial_slide.js';
import { calculateTitleLayout } from '../Presentation/config/dimension_calculator/index.js';

console.log('=== Running Slide Title Breaking & Layout Integration Tests ===');

// Test 1: Concept Slide
{
  const slideElements = { title: 'CON_TITLE_1', body: 'CON_BODY_1' };
  
  // 1-line title
  const req1 = buildConceptSlide('page1', slideElements, {
    title: 'Introduction To JavaScript',
    body: 'Paragraph 1\nParagraph 2'
  });
  const titleShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const bodyShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.body)?.createShape;
  
  console.log('Concept 1-line:', {
    titleHeight: titleShape1.elementProperties.size.height.magnitude,
    bodyY: bodyShape1.elementProperties.transform.translateY
  });
  if (titleShape1.elementProperties.size.height.magnitude !== 50) {
    throw new Error('Expected 50pt for 1-line concept title');
  }
  if (bodyShape1.elementProperties.transform.translateY !== 60 + 50 + 16) {
    throw new Error('Expected body to start 16pt below title');
  }

  // 2-line title ("Modulus And Exponentiation" from problematic screenshot)
  const req2 = buildConceptSlide('page2', slideElements, {
    title: 'Modulus And Exponentiation',
    body: 'Some concept body text'
  });
  const titleShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const bodyShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.body)?.createShape;
  
  console.log('Concept 2-line (Modulus And Exponentiation):', {
    titleHeight: titleShape2.elementProperties.size.height.magnitude,
    bodyY: bodyShape2.elementProperties.transform.translateY
  });
  if (titleShape2.elementProperties.size.height.magnitude !== 96) {
    throw new Error(`Expected 96pt for 2-line title, got ${titleShape2.elementProperties.size.height.magnitude}`);
  }
  if (bodyShape2.elementProperties.transform.translateY !== 60 + 96 + 16) {
    throw new Error('Expected body to start 16pt below 2-line title');
  }

  // 3-line title
  const req3 = buildConceptSlide('page3', slideElements, {
    title: 'Understanding Asynchronous JavaScript Callbacks Promises And Async Await',
    body: 'Some concept body text'
  });
  const titleShape3 = req3.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const bodyShape3 = req3.find((r: any) => r.createShape?.objectId === slideElements.body)?.createShape;
  
  console.log('Concept 3+/4-line title:', {
    titleHeight: titleShape3.elementProperties.size.height.magnitude,
    bodyY: bodyShape3.elementProperties.transform.translateY
  });
  if (titleShape3.elementProperties.size.height.magnitude <= 96) {
    throw new Error('Expected title height > 96pt for 3+ line title');
  }
  if (bodyShape3.elementProperties.transform.translateY <= bodyShape2.elementProperties.transform.translateY) {
    throw new Error('Expected body to be pushed down dynamically for 3+ line title');
  }
}

// Test 2: Notes Slide
{
  const slideElements = { title: 'NOTE_TITLE_1', body: 'NOTE_BODY_1' };
  
  // 1-line title
  const req1 = buildNotesSlide('page1', slideElements, {
    title: 'Summary',
    bullets: ['Point 1', 'Point 2', 'Point 3']
  });
  const titleShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const bulletsShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.body)?.createShape;
  
  console.log('Notes 1-line:', {
    titleHeight: titleShape1.elementProperties.size.height.magnitude,
    bulletsY: bulletsShape1.elementProperties.transform.translateY
  });

  // 2-line title
  const req2 = buildNotesSlide('page2', slideElements, {
    title: 'Modulus And Exponentiation Summary Points',
    bullets: ['Point 1', 'Point 2']
  });
  const titleShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const bulletsShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.body)?.createShape;
  
  console.log('Notes 2-line:', {
    titleHeight: titleShape2.elementProperties.size.height.magnitude,
    bulletsY: bulletsShape2.elementProperties.transform.translateY
  });
  if (titleShape2.elementProperties.size.height.magnitude <= titleShape1.elementProperties.size.height.magnitude) {
    throw new Error('Expected 2-line title to have larger height');
  }
}

// Test 3: Module Intro Slide
{
  const slideElements = { title: 'MOD_TITLE_1', body: 'MOD_BODY_1' };
  
  const req1 = buildModuleIntroSlide('page1', slideElements, {
    moduleLabel: 'Module 1: Intro',
    title: 'Math And Operators',
    bullets: ['Topic 1', 'Topic 2']
  });
  const titleShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;

  const req2 = buildModuleIntroSlide('page2', slideElements, {
    moduleLabel: 'Module 2: Variables',
    title: 'JavaScript Variables And Memory',
    bullets: ['Topic 1', 'Topic 2']
  });
  const titleShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;

  console.log('Module Intro 1-line vs 2-line:', {
    t1: titleShape1.elementProperties.size.height.magnitude,
    t2: titleShape2.elementProperties.size.height.magnitude
  });
  if (titleShape2.elementProperties.size.height.magnitude <= titleShape1.elementProperties.size.height.magnitude) {
    throw new Error('Expected 2-line module intro title to be taller');
  }
}

// Test 4: Title Slide
{
  const slideElements = { title: 'TITLE_TXT', image: 'TITLE_IMG' };
  
  // 1-line
  const req1 = await buildTitleSlide('page1', slideElements, {
    title: 'React',
    subtitle: 'A JavaScript library for UI'
  }, 0);
  const titleShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const subShape1 = req1.find((r: any) => r.createShape?.objectId === slideElements.title + '_sub')?.createShape;

  // 2-line
  const req2 = await buildTitleSlide('page2', slideElements, {
    title: 'JavaScript Fundamentals',
    subtitle: 'Core concepts of modern JS'
  }, 0);
  const titleShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const subShape2 = req2.find((r: any) => r.createShape?.objectId === slideElements.title + '_sub')?.createShape;

  console.log('Title Slide 1-line vs 2-line:', {
    t1Height: titleShape1.elementProperties.size.height.magnitude,
    sub1Y: subShape1.elementProperties.transform.translateY,
    t2Height: titleShape2.elementProperties.size.height.magnitude,
    sub2Y: subShape2.elementProperties.transform.translateY
  });

  if (titleShape2.elementProperties.size.height.magnitude <= titleShape1.elementProperties.size.height.magnitude) {
    throw new Error('Expected 2-line title slide title to be taller');
  }
  if (subShape2.elementProperties.transform.translateY <= subShape1.elementProperties.transform.translateY) {
    throw new Error('Expected subtitle on 2-line title slide to be placed lower');
  }
}

// Test 5: Screenshot Tutorial Slide (Slide 22 from screenshot)
{
  const slideElements = { title: 'SS_TITLE', image: 'SS_IMG', caption: 'SS_CAP' };
  
  const req = buildScreenshotTutorialSlide('page1', slideElements, {
    title: 'Modulus And Exponentiation',
    codeTitle: 'Advanced Math Operators',
    description: 'Calculate division remainders and exponential powers easily.'
  });
  const titleShape = req.find((r: any) => r.createShape?.objectId === slideElements.title)?.createShape;
  const codeTitleShape = req.find((r: any) => r.createShape?.objectId === slideElements.title + '_sub')?.createShape;

  console.log('Screenshot Tutorial (Modulus And Exponentiation):', {
    titleHeight: titleShape.elementProperties.size.height.magnitude,
    codeTitleY: codeTitleShape.elementProperties.transform.translateY
  });

  if (titleShape.elementProperties.size.height.magnitude !== 96) {
    throw new Error(`Expected 96pt for title height, got ${titleShape.elementProperties.size.height.magnitude}`);
  }
  // Title starts at 45. Height 96. Gap 20. codeTitle must start at 45 + 96 + 20 = 161.
  if (codeTitleShape.elementProperties.transform.translateY < 160) {
    throw new Error(`Expected codeTitle Y >= 160, got ${codeTitleShape.elementProperties.transform.translateY}`);
  }
}

console.log('\n✓ ALL SLIDE BUILDER TESTS PASSED SUCCESSFULLY!');
