import createSlides from "./Presentation/core/index.js";

async function main() {
    const slides = await createSlides();
    slides();
}

main();