import { SLIDE_HEIGHT } from "../dimension_calculator/dimension";


const heightcalculator = (padding)=>{
 const usableHeight= Math.max(SLIDE_HEIGHT - (padding * 2), 100);
 return usableHeight;
   
}
export default heightcalculator;