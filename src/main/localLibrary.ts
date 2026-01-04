import { Worker } from "worker_threads";
import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { addLocalFileDB, addLocalFolderDB } from "./db";

// Supported Extensions
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.flac', '.aif', '.aiff', '.ogg', '.m4a']);

// Simple Heuristics for AI Tagging (MVP)
function guessInstrument(filename: string): string | null {
    const lower = filename.toLowerCase();
    if (lower.includes('kick')) return 'Kick';
    if (lower.includes('snare') || lower.includes('clap') || lower.includes('rim')) return 'Snare';
    if (lower.includes('hat') || lower.includes('cymbal') || lower.includes('ride') || lower.includes('crash')) return 'Hi-Hat';
    if (lower.includes('bass') || lower.includes('808')) return 'Bass';
    if (lower.includes('perc') || lower.includes('conga') || lower.includes('bongo')) return 'Percussion';
    if (lower.includes('voc') || lower.includes('acapella')) return 'Vocal';
    if (lower.includes('fx') || lower.includes('riser') || lower.includes('noise')) return 'FX';
    if (lower.includes('pad')) return 'Pad';
    if (lower.includes('synth') || lower.includes('lead')) return 'Synth';
    return null;
}

function guessType(duration: number, filename: string): 'One-Shot' | 'Loop' {
    // If filename explicitly says loop
    if (filename.toLowerCase().includes('loop')) return 'Loop';

    // Heuristic: < 2.5s is usually a one-shot
    if (duration < 2.5) return 'One-Shot';

    return 'Loop';
}

// Worker Pool Simplified
let worker: Worker | null = null;
const pendingCallbacks = new Map<string, (res: any) => void>();

const workerPath = app.isPackaged
    ? path.join(__dirname, 'index-worker.js')
    : path.join(__dirname, 'index-worker.ts');

function getWorker() {
    if (!worker) {
        // In dev, we need to register ts-node for the worker
        if (!app.isPackaged) {
            worker = new Worker(`
                require('ts-node').register({ transpileOnly: true });
                require('${workerPath}');
            `, { eval: true });
        } else {
            worker = new Worker(workerPath);
        }

        // Global listener for this worker
        worker.on('message', (res: any) => {
            const resolve = pendingCallbacks.get(res.path);
            if (resolve) {
                resolve(res);
                pendingCallbacks.delete(res.path);
            }
        });

        // Error handling
        worker.on('error', (err) => console.error("Worker error:", err));
    }
    return worker;
}

// Progress State
interface ScanProgress {
    total: number;
    processed: number;
    currentFile: string;
}
const scanStats = new Map<string, ScanProgress>();

function broadcastProgress(folderId: string, status: 'scanning' | 'processing' | 'completed', stats?: ScanProgress) {
    const wins = BrowserWindow.getAllWindows();
    for (const win of wins) {
        win.webContents.send('local-library-progress', {
            folderId,
            status,
            stats
        });
    }
}

export async function indexLocalConnect(folderPath: string) {
    // 1. Register Folder
    const folderName = path.basename(folderPath);
    const folder = addLocalFolderDB(folderPath, folderName);

    // 2. Start Scan (Async)
    // We don't await this so the UI is responsive immediately
    scanRecursive(folderPath, folder.id).then(() => {
        // Cleanup?
    });

    return folder;
}

async function scanRecursive(dir: string, folderId: string) {
    // Initialize stats
    if (!scanStats.has(folderId)) {
        scanStats.set(folderId, { total: 0, processed: 0, currentFile: '' });
        broadcastProgress(folderId, 'scanning', scanStats.get(folderId));
    }

    // 1. Collect all files first to know total
    const filesToProcess: string[] = [];

    async function traverse(currentDir: string) {
        let entries;
        try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (e) {
            console.error("Error reading dir:", currentDir, e);
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.')) continue; // Skip hidden
                await traverse(fullPath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (AUDIO_EXTENSIONS.has(ext)) {
                    filesToProcess.push(fullPath);
                }
            }
        }
    }

    // Initial broadcast
    broadcastProgress(folderId, 'scanning');
    await traverse(dir);

    // Update total
    const stats = scanStats.get(folderId)!;
    stats.total = filesToProcess.length;
    broadcastProgress(folderId, 'processing', stats);

    // 2. Process Files
    const currentWorker = getWorker();

    for (const fullPath of filesToProcess) {
        const filename = path.basename(fullPath);
        stats.currentFile = filename;
        broadcastProgress(folderId, 'processing', stats);

        const fileStats = await fs.stat(fullPath);

        try {
            const res: any = await new Promise((resolve) => {
                pendingCallbacks.set(fullPath, resolve);
                currentWorker.postMessage(fullPath);
            });

            if (res.success) {
                // Prioritize AI Category if available, otherwise fallback to filename guess
                const instrument = res.category || guessInstrument(filename);
                const type = guessType(res.duration, filename);

                // Store extra AI info in tags if present
                let tagsList = [];
                if (res.features) {
                    tagsList.push("AI_ANALYZED");
                }
                if (instrument) tagsList.push(instrument);

                addLocalFileDB({
                    folderId,
                    path: fullPath,
                    filename: filename,
                    type,
                    instrument: instrument,
                    key: res.key,
                    bpm: res.bpm,
                    duration: res.duration,
                    size: fileStats.size,
                    tags: JSON.stringify(tagsList)
                });
            }
        } catch (err) {
            console.error("Error processing file:", fullPath, err);
        }

        stats.processed++;
        broadcastProgress(folderId, 'processing', stats);
    }

    broadcastProgress(folderId, 'completed', stats);
    scanStats.delete(folderId);
}
