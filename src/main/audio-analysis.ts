import execa from "execa";
import MusicTempo from "music-tempo";

import path from "node:path";
import { getFFmpegPath, getFFprobePath } from "./config";



import { getClassifyAudioPath } from './binaries';

function extractJson(str: string): any {
    if (!str) return null;
    // Try to find the last valid JSON block that has a 'success' property
    const blocks = str.match(/\{[\s\S]*?\}/g);
    if (blocks) {
        for (let i = blocks.length - 1; i >= 0; i--) {
            try {
                const parsed = JSON.parse(blocks[i]);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {}
        }
    }
    // Greedy fallback
    const greedy = str.match(/\{[\s\S]*\}/);
    if (greedy) {
        try {
            return JSON.parse(greedy[0]);
        } catch (e) {}
    }
    return null;
}
export async function analyzeBPM(filePath: string): Promise<number | undefined> {
    try {
        const binPath = getClassifyAudioPath();
        const { PythonShell } = require('./python-shell');

        const isUnified = binPath.includes('ai_engine');
        const args = isUnified ? ['classify', filePath] : [filePath];

        const result = await PythonShell.run(binPath, args);
        const data = extractJson(result.stdout);

        if (data && data.success && data.features && data.features.bpm) {
            return Math.round(data.features.bpm);
        }
    } catch (e) {
        console.warn("Python BPM analysis failed, falling back to MusicTempo:", e);
    }

    try {
        const { stdout } = await execa(getFFmpegPath(), [
            '-i', filePath,
            '-f', 's16le',
            '-ac', '1',
            '-ar', '44100',
            '-t', '60',
            'pipe:1'
        ], { encoding: null });

        const buffer = stdout as Buffer;
        const pcmData = new Float32Array(buffer.length / 2);
        for (let i = 0; i < pcmData.length; i++) {
            pcmData[i] = buffer.readInt16LE(i * 2) / 32768;
        }

        const mt = new MusicTempo(pcmData);
        return Math.round(mt.tempo);
    } catch (e) {
        console.error("BPM analysis failed:", e);
        return undefined;
    }
}

export async function analyzeKey(filePath: string): Promise<string | undefined> {
    try {
        const binPath = getClassifyAudioPath();
        const { PythonShell } = require('./python-shell');

        const isUnified = binPath.includes('ai_engine');
        const args = isUnified ? ['classify', filePath] : [filePath];

        const result = await PythonShell.run(binPath, args);
        const data = extractJson(result.stdout);

        if (data && data.success && data.key) {
            return data.key;
        }
    } catch (e) {
        console.warn("Python key analysis failed, falling back to regex:", e);
    }

    // Fallback Regex Logic
    const fileName = path.basename(filePath).toLowerCase();
    const keys = ["c", "c#", "db", "d", "d#", "eb", "e", "f", "f#", "gb", "g", "g#", "ab", "a", "a#", "bb", "b"];
    const modes = ["major", "minor", "maj", "min", "m"];

    for (const k of keys) {
        for (const m of modes) {
            const regex = new RegExp(`\\b${k.replace('#', '\\#')}${m}\\b`, 'i');
            if (regex.test(fileName)) {
                return k.toUpperCase() + (m.startsWith('mi') || m === 'm' ? ' Minor' : ' Major');
            }
        }
        const loneKeyRegex = new RegExp(`[\\s_]${k.toUpperCase()}[\\s_\\.]`);
        if (loneKeyRegex.test(path.basename(filePath))) {
            return k.toUpperCase() + " Major";
        }
    }

    return undefined;
}

export async function getDuration(filePath: string): Promise<string | undefined> {
    try {
        const { stdout } = await execa(getFFprobePath(), [
            '-v', 'error',


            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ]);
        const seconds = parseFloat(stdout.trim());
        if (isNaN(seconds)) return undefined;

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    } catch (e) {
        return undefined;
    }
}
