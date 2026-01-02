import fs from "node:fs/promises";
import path from "node:path";
import { parseFile } from "music-metadata";
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

export async function indexLocalConnect(folderPath: string) {
    // 1. Register Folder
    const folderName = path.basename(folderPath);
    const folder = addLocalFolderDB(folderPath, folderName);

    // 2. Start Scan (Async but we might await it for feedback)
    await scanRecursive(folderPath, folder.id);

    return folder;
}

async function scanRecursive(dir: string, folderId: string) {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
        console.error("Error reading dir:", dir, e);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name.startsWith('.')) continue; // Skip hidden
            await scanRecursive(fullPath, folderId);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (AUDIO_EXTENSIONS.has(ext)) {
                try {
                    const stats = await fs.stat(fullPath);
                    let duration = 0;
                    let bpm = 0;
                    let key = null;

                    try {
                        const metadata = await parseFile(fullPath, { duration: true, skipCovers: true });
                        duration = metadata.format.duration || 0;
                        bpm = metadata.common.bpm || 0;
                        key = metadata.common.key || null;
                    } catch (err) {
                        // console.warn("Metadata fail for", entry.name);
                    }

                    const instrument = guessInstrument(entry.name);
                    const type = guessType(duration, entry.name);

                    addLocalFileDB({
                        folderId,
                        path: fullPath,
                        filename: entry.name,
                        type,
                        instrument,
                        key,
                        bpm: Math.round(bpm),
                        duration,
                        size: stats.size
                    });
                } catch (e) {
                    console.error("Error indexing file:", fullPath, e);
                }
            }
        }
    }
}
