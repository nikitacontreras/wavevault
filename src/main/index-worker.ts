import { parentPort } from 'worker_threads';
import { parseFile } from 'music-metadata';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';

// Persistent Python Process Manager
let pythonProc: ChildProcess | null = null;
const lineReader = new EventEmitter();

function getPythonProcess() {
    if (pythonProc && !pythonProc.killed) return pythonProc;

    const { getClassifyAudioPath } = require('./binaries');

    const binPath = getClassifyAudioPath();
    const args: string[] = []; // No script arg needed for the binary

    try {
        pythonProc = spawn(binPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
        });

        // Handle stdout (line by line)
        let buffer = '';
        pythonProc.stdout?.on('data', (data) => {
            buffer += data.toString();
            let lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep unfinished line

            for (const line of lines) {
                if (line.trim()) lineReader.emit('line', line.trim());
            }
        });

        pythonProc.stderr?.on('data', (data) => {
            // console.error("PY_ERR:", data.toString());
        });

        pythonProc.on('exit', () => {
            pythonProc = null;
        });

    } catch (e) {
        console.error("Failed to spawn python:", e);
    }

    return pythonProc;
}

// Helper to send query and wait for response
// Helper to safely write to Python
function askPython(filePath: string): Promise<any> {
    const proc = getPythonProcess();

    // If we couldn't spawn, fallback immediately
    if (!proc || !proc.stdin || proc.stdin.destroyed) {
        // Force cleanup just in case
        if (proc) killPython();
        return Promise.resolve({ category: null });
    }

    return new Promise((resolve) => {
        let isResolved = false;
        let timeout: NodeJS.Timeout;

        const cleanup = () => {
            clearTimeout(timeout);
            lineReader.off('line', onLine);
            proc.stdin?.off('error', onStdinError);
        };

        const onLine = (line: string) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();

            try {
                const res = JSON.parse(line);
                resolve(res);
            } catch (e) {
                resolve({ category: null });
            }
        };

        const onStdinError = (err: Error) => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                // Kill process if pipe broke to ensure restart
                killPython();
                resolve({ category: null });
            }
        };

        // Timeout to prevent hanging forever
        timeout = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                cleanup();
                // Too slow? probably stuck.
                killPython();
                resolve({ category: null });
            }
        }, 5000); // 5 sec timeout per file

        lineReader.once('line', onLine);
        proc.stdin!.on('error', onStdinError);

        try {
            const ok = proc.stdin!.write(filePath + '\n');
            if (!ok) {
                proc.stdin!.once('drain', () => { });
            }
        } catch (e) {
            onStdinError(e as Error);
        }
    });
}

function killPython() {
    if (pythonProc) {
        try { pythonProc.kill(); } catch (e) { }
        pythonProc = null;
    }
}

/**
 * Worker thread for extracting audio metadata without blocking the main process.
 */

async function classifyWithPython(filePath: string): Promise<{ category: string | null, features?: any }> {
    try {
        const result = await askPython(filePath);
        if (result && result.success) {
            return { category: result.category, features: result.features };
        }
    } catch (e) {
        // Silent fail
    }
    return { category: null };
}

async function processFile(fullPath: string) {
    try {
        const metadata = await parseFile(fullPath, { duration: true, skipCovers: true });

        // Run AI Classification
        const aiResult = await classifyWithPython(fullPath);

        // Merge BPM if librosa found it and metadata didn't? 
        // Librosa BPM is often more accurate for loops, metadata for tagged files.
        // We'll prefer metadata if present.
        let bpm = Math.round(metadata.common.bpm || 0);
        if (bpm === 0 && aiResult.features && aiResult.features.bpm > 0) {
            bpm = Math.round(aiResult.features.bpm);
        }

        return {
            path: fullPath,
            duration: metadata.format.duration || 0,
            bpm: bpm,
            key: metadata.common.key || null,
            category: aiResult.category, // New field
            features: aiResult.features, // New field, maybe store as tags?
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
