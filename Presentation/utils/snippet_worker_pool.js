/**
 * snippet_worker_pool.js
 * Manages a pool of Bun Workers for parallel CPU-bound Satori rendering.
 * Automatically sizes pool to available CPU cores (capped at slide count).
 */
import os from 'os';
import path from 'path';

const WORKER_PATH = path.resolve(process.cwd(), 'Presentation', 'utils', 'snippet_render_worker.js');

/**
 * Creates a pool of Bun Workers and distributes render tasks across them.
 * @param {Array} slides     - Array of slide objects to render
 * @param {Object} options   - Render options (theme, omitBackground, etc.)
 * @returns {Promise<Array>} - Array of { slide, outputPath, error } results
 */
export async function renderWithWorkerPool(slides, options = {}, onSlideRendered = null) {
    const cpuCount = os.cpus().length;
    const poolSize = Math.min(cpuCount, slides.length);

    console.log(`⚡ Worker pool: ${poolSize} workers across ${cpuCount} CPU cores for ${slides.length} slide(s)`);

    // Spin up all workers upfront
    const workers = Array.from({ length: poolSize }, () =>
        new Worker(WORKER_PATH, { type: 'module' })
    );

    // ── Pre-warm: load all module caches on every worker simultaneously ────────
    const warmStart = performance.now();
    await Promise.all(workers.map((worker, i) =>
        new Promise((resolve) => {
            worker.onmessage = (event) => {
                if (event.data.type === 'init_done') resolve();
            };
            worker.postMessage({ type: 'init', options });
        })
    ));
    const warmMs = (performance.now() - warmStart).toFixed(0);
    console.log(`  🔥 All ${poolSize} workers warmed up in ${warmMs}ms`);

    const results = new Array(slides.length).fill(null);
    const slideTimes = new Array(slides.length).fill(0); // ms per slide
    let taskIndex = 0;
    let doneCount  = 0;

    const poolStart = performance.now();

    return new Promise((resolve) => {
        function assignNext(worker, workerIndex) {
            if (taskIndex >= slides.length) {
                worker.terminate();
                return;
            }

            const myIndex = taskIndex++;
            const slide = slides[myIndex];
            const slideStart = performance.now();

            worker.postMessage({ snippet: slide, options, taskId: myIndex });

            worker.onmessage = (event) => {
                const { taskId, success, outputPath, error } = event.data;
                const elapsed = (performance.now() - slideStart).toFixed(0);
                slideTimes[taskId] = Number(elapsed);

                results[taskId] = { slide: slides[taskId], outputPath: success ? outputPath : null, error: error || null };

                if (success) {
                    console.log(`  ✓ [Worker ${workerIndex + 1}] slide-${slides[taskId].slide_number}.png  (${elapsed}ms)`);
                    if (onSlideRendered) {
                        onSlideRendered(slides[taskId], outputPath);
                    }
                } else {
                    console.error(`  ❌ [Worker ${workerIndex + 1}] slide-${slides[taskId].slide_number}: ${error}`);
                }

                doneCount++;
                if (doneCount === slides.length) {
                    const totalMs = (performance.now() - poolStart).toFixed(0);
                    const avgMs   = (slideTimes.reduce((a, b) => a + b, 0) / slideTimes.length).toFixed(0);
                    const fastestMs = Math.min(...slideTimes);
                    const slowestMs = Math.max(...slideTimes);
                    console.log(`\n📊 Render stats:`);
                    console.log(`   Total wall time : ${totalMs}ms`);
                    console.log(`   Avg per slide   : ${avgMs}ms`);
                    console.log(`   Fastest slide   : ${fastestMs}ms`);
                    console.log(`   Slowest slide   : ${slowestMs}ms`);
                    workers.forEach(w => { try { w.terminate(); } catch (_) {} });
                    resolve(results);
                } else {
                    assignNext(worker, workerIndex);
                }
            };

            worker.onerror = (err) => {
                console.error(`  ❌ [Worker ${workerIndex + 1}] crashed:`, err.message);
                results[myIndex] = { slide, outputPath: null, error: err.message };
                doneCount++;
                if (doneCount === slides.length) {
                    workers.forEach(w => { try { w.terminate(); } catch (_) {} });
                    resolve(results);
                } else {
                    assignNext(worker, workerIndex);
                }
            };
        }

        // Kick off all workers simultaneously
        workers.forEach((worker, i) => assignNext(worker, i));
    });
}
