/**
 * Retries an async function when it fails with a specific error condition (e.g., rate limits, 503 high demand).
 * 
 * @param {Function} fn - The async function to retry.
 * @param {number} retries - Number of retry attempts.
 * @param {number} initialDelayMs - Initial delay in milliseconds between retries.
 * @returns {Promise<any>} - The result of the function call.
 */
export async function callWithRetry(fn: () => Promise<any>, retries = 3, initialDelayMs = 3000): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const status = error?.status || error?.statusCode || error?.response?.status;
            const message = error?.message || String(error);
            const isTransient =
                status === 429 ||
                status === 503 ||
                status === 500 ||
                status === 502 ||
                status === 504 ||
                message.includes("503") ||
                message.includes("high demand") ||
                message.includes("UNAVAILABLE") ||
                message.includes("ResourceExhausted") ||
                message.includes("rate limit");

            if (!isTransient || i === retries - 1) {
                throw error;
            }

            const currentDelay = initialDelayMs * Math.pow(2, i);
            console.log(`⚠️ Transient error (${status || 'API error'}: ${message.slice(0, 80)}...). Waiting ${(currentDelay / 1000).toFixed(1)}s before retry ${i + 1}/${retries - 1}...`);
            await new Promise((res) => setTimeout(res, currentDelay));
        }
    }
}
