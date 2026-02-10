const generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${randomPart}`;
};


export const createSlideIds = (slideType, bulletCount = 0) => {
  const pageId = generateId(`${slideType.toUpperCase()}_PAGE`);
  const elements = {};

  // Define element keys based on slide type
  // Define element keys based on slide type
  if (slideType === 'Concept' || slideType === 'concept') {
    elements.title = generateId('CON_TITLE');
    elements.body = generateId('CON_BODY');
    elements.image = generateId('CON_IMG');
  }
  else if (slideType === 'Module' || slideType === 'module_intro') {
    elements.title = generateId('MOD_TITLE');
    elements.body = generateId('MOD_BODY'); // For bullets or text
  }
  else if (slideType === 'Code' || slideType === 'code' || slideType === 'screenshot_tutorial') {
    elements.title = generateId('SS_TITLE');
    elements.image = generateId('SS_IMG');
    elements.caption = generateId('SS_CAPTION');
  }
  else if (slideType === 'Notes' || slideType === 'notes') {
    elements.title = generateId('NOTE_TITLE');
    elements.body = generateId('NOTE_BODY');
  }
  else if (slideType === 'Title' || slideType === 'title') {
    elements.image = generateId('TITLE_IMG');
    elements.title = generateId('TITLE_TXT');
    elements.description = generateId('TITLE_DESC');
  }
  else if (slideType === 'ThankYou' || slideType === 'thank_you') {
    elements.title = generateId('TY_TXT');
  }

  return { pageId, elements };
};  