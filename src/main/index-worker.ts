import { parentPort, workerData } from 'worker_threads';
import { parseFile } from 'music-metadata';
import path from 'path';

/**
 * Worker thread for extracting audio metadata without blocking the main process.
 */

async function processFile(fullPath: string) {
    try {
        const metadata = await parseFile(fullPath, { duration: true, skipCovers: true });
        return {
            path: fullPath,
            duration: metadata.format.duration || 0,
            bpm: Math.round(metadata.common.bpm || 0),
            key: metadata.common.key || null,
            success: true
        };
    } catch (e: any) {
        return {
            path: fullPath,
            success: false,
            error: e.message
        };
    }
}

if (parentPort) {
    parentPort.on('message', async (filePath: string) => {
        const result = await processFile(filePath);
        parentPort?.postMessage(result);
    });
}
