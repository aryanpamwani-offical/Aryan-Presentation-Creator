const generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${randomPart}`;
};


export const createSlideIds = (slideType, bulletCount = 0) => {
  const pageId = generateId(`${slideType.toUpperCase()}_PAGE`);
  const elements = {};

  // Define element keys based on slide type
  if (slideType === 'Concept') {
    elements.title = generateId('CON_TITLE');
    elements.description = generateId('CON_DESC');
  } 
  else if (slideType === 'Module') {
    elements.moduleLabel = generateId('MOD_LBL');
    elements.title = generateId('MOD_TITLE');
    // Generate an ID for each bullet point
    elements.bullets = Array.from({ length: bulletCount }).map((_, i) => generateId(`MOD_BULLET_${i}`));
  } 
  else if (slideType === 'Code') {
    elements.image = generateId('CODE_IMG');
    elements.description = generateId('CODE_DESC');
  } 
  else if (slideType === 'Title') {
    elements.image = generateId('TITLE_IMG');
    elements.title = generateId('TITLE_TXT');
    elements.description = generateId('TITLE_DESC');
  } 
  else if (slideType === 'ThankYou') {
    elements.mainText = generateId('TY_TXT');
  }

return { pageId, elements };
};  