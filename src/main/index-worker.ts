import { parentPort } from 'worker_threads';
import { parseFile } from 'music-metadata';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { classifyAudioNative } from './ai/audio-classifier';

export interface WorkerTaskPayload {
    id: string;
    path: string;
    computeHash?: boolean;
}

export interface WorkerTaskResult {
    id: string;
    path: string;
    success: boolean;
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    duration?: number;
    bpm?: number;
    key?: string;
    sampleRate?: number;
    bitrate?: number;
    format?: string;
    category?: string | null;
    features?: any;
    hash?: string;
    error?: string;
}

/**
 * Calculates a fast MD5 hash of the file using its size + first 64KB + middle 64KB
 */
async function computeFastHash(filePath: string): Promise<string> {
    try {
        const stats = await fs.promises.stat(filePath);
        const fileSize = stats.size;
        const hash = crypto.createHash('md5');
        hash.update(String(fileSize));

        const fd = await fs.promises.open(filePath, 'r');
        const chunkSize = 64 * 1024; // 64KB
        const buffer = Buffer.alloc(chunkSize);

        // Read start
        const bytesReadStart = await fd.read(buffer, 0, chunkSize, 0);
        hash.update(buffer.subarray(0, bytesReadStart.bytesRead));

        // Read middle if file is large enough
        if (fileSize > chunkSize * 2) {
            const midPos = Math.floor(fileSize / 2);
            const bytesReadMid = await fd.read(buffer, 0, chunkSize, midPos);
            hash.update(buffer.subarray(0, bytesReadMid.bytesRead));
        }

        await fd.close();
        return hash.digest('hex');
    } catch {
        return '';
    }
}

/**
 * Worker task processor
 */
async function processTask(task: WorkerTaskPayload): Promise<WorkerTaskResult> {
    const fullPath = task.path;
    try {
        const metadata = await parseFile(fullPath, { duration: true, skipCovers: true });

        // Run Native AI Classification (features & BPM/Key detection)
        const aiResult = await classifyAudioNative(fullPath);

        let bpm = Math.round(metadata.common.bpm || 0);
        if (bpm === 0 && aiResult.success && aiResult.features && aiResult.features.bpm > 0) {
            bpm = Math.round(aiResult.features.bpm);
        }

        let key = metadata.common.key || '';
        if (!key && aiResult.success && aiResult.key) {
            key = aiResult.key;
        }

        let fileHash = '';
        if (task.computeHash !== false) {
            fileHash = await computeFastHash(fullPath);
        }

        return {
            id: task.id,
            path: fullPath,
            success: true,
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
            features: aiResult.success ? aiResult.features : null,
            hash: fileHash
        };
    } catch (e: any) {
        let fallbackHash = '';
        try {
            fallbackHash = await computeFastHash(fullPath);
        } catch {}

        return {
            id: task.id,
            path: fullPath,
            success: false,
            title: path.basename(fullPath, path.extname(fullPath)),
            format: path.extname(fullPath).replace('.', '').toUpperCase(),
            hash: fallbackHash,
            error: e.message
        };
    }
}

if (parentPort) {
    parentPort.on('message', async (task: WorkerTaskPayload | { id: string; files: string[] } | string) => {
        if (typeof task === 'string') {
            // Simple path string format
            const res = await processTask({ id: task, path: task });
            parentPort!.postMessage(res);
        } else if ('files' in task) {
            // Batch format
            const results = [];
            for (const file of task.files) {
                results.push(await processTask({ id: file, path: file }));
            }
            parentPort!.postMessage({ id: task.id, results });
        } else if ('path' in task) {
            // Structured task payload
            const res = await processTask(task);
            parentPort!.postMessage(res);
        }
    });
}
