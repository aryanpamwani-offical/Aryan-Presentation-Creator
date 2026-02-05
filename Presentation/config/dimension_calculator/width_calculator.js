import { SLIDE_WIDTH } from "../dimension_calculator/dimension.js";


const widthcalculator = (padding)=>{
 const usableWidth= Math.max(SLIDE_WIDTH - (padding * 2), 100);
 return usableWidth;
   
}
export default widthcalculator;