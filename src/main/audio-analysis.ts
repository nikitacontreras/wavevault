import { execa } from "execa";
import path from "node:path";
import { getFFprobePath } from "./config";
import { classifyAudioNative } from "./ai/audio-classifier";

export async function analyzeBPM(filePath: string): Promise<number | undefined> {
    try {
        const result = await classifyAudioNative(filePath);
        if (result.success && result.features && result.features.bpm > 0) {
            return result.features.bpm;
        }
    } catch (e) {
        console.warn("BPM analysis error:", e);
    }
    return undefined;
}

export async function analyzeKey(filePath: string): Promise<string | undefined> {
    try {
        const result = await classifyAudioNative(filePath);
        if (result.success && result.key) {
            return result.key;
        }
    } catch (e) {
        console.warn("Key analysis error:", e);
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
        const stdoutStr = stdout?.toString() || "";
        const seconds = parseFloat(stdoutStr.trim());
        if (isNaN(seconds)) return undefined;

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    } catch (e) {
        return undefined;
    }
}
