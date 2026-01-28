/**
 * Simple task queue with concurrency limit
 */
export async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let currentTask = 0;

    async function runWorker() {
        while (currentTask < tasks.length) {
            const index = currentTask++;
            results[index] = await tasks[index]();
        }
    }

    const workers = new Array(Math.min(limit, tasks.length))
        .fill(null)
        .map(() => runWorker());

    await Promise.all(workers);
    return results;
}
