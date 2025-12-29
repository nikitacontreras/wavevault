import execa from "execa";
import MusicTempo from "music-tempo";
import path from "node:path";

export async function analyzeBPM(filePath: string): Promise<number | undefined> {
    try {
        const { stdout } = await execa('ffmpeg', [
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
    // Note: Accurate key detection requires more advanced chroma analysis.
    // For now, let's try to detect if it's in the filename as a improvement.
    const fileName = path.basename(filePath).toLowerCase();
    const keys = ["c", "c#", "db", "d", "d#", "eb", "e", "f", "f#", "gb", "g", "g#", "ab", "a", "a#", "bb", "b"];
    const modes = ["major", "minor", "maj", "min", "m"];

    // Simple regex to find things like "Am", "C#major", "Db_min"
    for (const k of keys) {
        for (const m of modes) {
            const regex = new RegExp(`\\b${k.replace('#', '\\#')}${m}\\b`, 'i');
            if (regex.test(fileName)) {
                return k.toUpperCase() + (m.startsWith('mi') || m === 'm' ? ' Minor' : ' Major');
            }
        }
        // Just the key alone if it's uppercase and follows a space or underscore
        const loneKeyRegex = new RegExp(`[\\s_]${k.toUpperCase()}[\\s_\\.]`);
        if (loneKeyRegex.test(path.basename(filePath))) {
            return k.toUpperCase() + " Major";
        }
    }

    return undefined;
}

export async function getDuration(filePath: string): Promise<string | undefined> {
    try {
        const { stdout } = await execa('ffprobe', [
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
