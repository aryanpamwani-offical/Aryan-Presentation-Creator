import createSlides from "./Presentation/core/index.js";

async function main() {
    try {
        await createSlides();
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();