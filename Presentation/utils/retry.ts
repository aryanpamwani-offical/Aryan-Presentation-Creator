/**
 * Retries an async function when it fails with a specific error condition (e.g., rate limits).
 * 
 * @param {Function} fn - The async function to retry.
 * @param {number} retries - Number of retry attempts.
 * @param {number} delayMs - Delay in milliseconds between retries.
 * @returns {Promise<any>} - The result of the function call.
 */
export async function callWithRetry(fn, retries = 3, delayMs = 60000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            // Check for Gemini 429 or generic 429 status
            const isRateLimit = error.status === 429 || (error.response && error.response.status === 429);

            // If it's the last attempt or not a rate limit error, throw it
            if (!isRateLimit || i === retries - 1) {
                throw error;
            }

            console.log(`⚠️ Rate limit hit (429). Waiting ${delayMs / 1000}s before retry ${i + 1}/${retries - 1}...`);
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
}
