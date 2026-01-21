import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { getFFmpegPath, getFFprobePath } from './config';
import { getSeparateStemsPath } from './binaries';

/**
 * Handle Stem Separation using the compiled separate_stems binary.
 * We run the binary DIRECTLY because it is an independent executable
 * produced by PyInstaller, containing its own Python environment and dependencies (demucs).
 */
export async function separateStems(filePath: string, outDir: string): Promise<any> {
    const stemsPath = getSeparateStemsPath();

    // Check if the binary exists to avoid "silent freeze"
    const fs = require('fs');
    if (!fs.existsSync(stemsPath)) {
        throw new Error(`El motor de separación de pistas no se encuentra en: ${stemsPath}. Por favor, ejecuta 'npm run build:python'`);
    }

    const ffmpegPath = getFFmpegPath();
    const ffprobePath = getFFprobePath();

    // Prepare environment: Inyect FFmpeg/FFprobe so Demucs can find them internally
    const env = { ...process.env };
    const binDirs = new Set<string>();
    if (ffmpegPath) binDirs.add(path.dirname(ffmpegPath));
    if (ffprobePath) binDirs.add(path.dirname(ffprobePath));

    const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
    if (binDirs.size > 0) {
        env[pathKey] = Array.from(binDirs).join(path.delimiter) + path.delimiter + (env[pathKey] || '');
    }

    const args = [filePath, outDir];

    console.log('[Stems] Ejecuando binario:', stemsPath);
    console.log('[Stems] Argumentos:', args);

    return new Promise((resolve, reject) => {
        try {
            const proc = spawn(stemsPath, args, { env });
            const win = BrowserWindow.getAllWindows()[0];

            let hasStarted = false;

            proc.stdout.on('data', (data) => {
                hasStarted = true;
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === 'progress') {
                            if (win) win.webContents.send('stems:progress', json.data);
                        } else if (json.type === 'success') {
                            resolve(json.data);
                        } else if (json.type === 'error') {
                            reject(new Error(json.data));
                        }
                    } catch (e) {
                        // Not JSON, likely raw output from demucs or python
                        console.log('[Stems] RAW:', line);
                        if (win) win.webContents.send('stems:progress', line);
                    }
                }
            });

            proc.stderr.on('data', (data) => {
                const errStr = data.toString();
                console.error(`[Stems] STDERR: ${errStr}`);
                // Demucs prints progress to stderr sometimes via tqdm
                if (win && (errStr.includes('%') || errStr.includes('it/s'))) {
                    win.webContents.send('stems:progress', errStr.trim());
                }
            });

            proc.on('close', (code) => {
                console.log(`[Stems] Proceso cerrado con código ${code}`);
                if (code !== 0) {
                    reject(new Error(`La separación falló (código ${code}). Revisa la terminal para más detalles.`));
                }
            });

            proc.on('error', (err) => {
                console.error('[Stems] Error al iniciar proceso:', err);
                reject(err);
            });

        } catch (error) {
            console.error('[Stems] Excepción al lanzar proceso:', error);
            reject(error);
        }
    });
}
