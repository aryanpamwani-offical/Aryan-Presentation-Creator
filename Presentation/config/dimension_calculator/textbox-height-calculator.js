const estimateTextHeight=(text, fontSize, width)=> {
  if (!text) return 0;
  // Ensure we have a valid width for calculation
  const safeWidth = (width && width > 0) ? width : 600;
  
  // Crude estimation: Average char width ~0.5 * fontSize
  const charsPerLine = safeWidth / (fontSize * 0.55); 
  const lines = Math.ceil(text.length / charsPerLine) + (text.match(/\n/g) || []).length;
  const lineHeight = fontSize * 1.3;
  return Math.max(lines * lineHeight, lineHeight) + 10; // +10 buffer
}
export default estimateTextHeight;