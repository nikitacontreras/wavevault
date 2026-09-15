import { parentPort } from 'worker_threads';
import { parseFile } from 'music-metadata';
import path from 'path';
import { classifyAudioNative } from './ai/audio-classifier';

/**
 * Worker thread for extracting audio metadata and AI features without blocking the main process.
 */
async function processFile(fullPath: string) {
    try {
        const metadata = await parseFile(fullPath, { duration: true, skipCovers: true });

        // Run Native AI Classification
        const aiResult = await classifyAudioNative(fullPath);

        let bpm = Math.round(metadata.common.bpm || 0);
        if (bpm === 0 && aiResult.success && aiResult.features && aiResult.features.bpm > 0) {
            bpm = Math.round(aiResult.features.bpm);
        }

        let key = metadata.common.key || '';
        if (!key && aiResult.success && aiResult.key) {
            key = aiResult.key;
        }

        return {
            path: fullPath,
            title: metadata.common.title || path.basename(fullPath, path.extname(fullPath)),
            artist: metadata.common.artist || '',
            album: metadata.common.album || '',
            genre: (metadata.common.genre || []).join(', '),
            duration: metadata.format.duration || 0,
            bpm: bpm || undefined,
            key: key || undefined,
            sampleRate: metadata.format.sampleRate || 44100,
            bitrate: metadata.format.bitrate || 0,
            format: path.extname(fullPath).replace('.', '').toUpperCase(),
            category: aiResult.success ? aiResult.category : null,
            features: aiResult.success ? aiResult.features : null
        };
    } catch (e: any) {
        return {
            path: fullPath,
            title: path.basename(fullPath, path.extname(fullPath)),
            format: path.extname(fullPath).replace('.', '').toUpperCase(),
            error: e.message
        };
    }
}

if (parentPort) {
    parentPort.on('message', async (task: { id: string; files: string[] }) => {
        const results = [];
        for (const file of task.files) {
            results.push(await processFile(file));
        }
        parentPort!.postMessage({ id: task.id, results });
    });
}
