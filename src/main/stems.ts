import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { getSeparateStemsPath } from './binaries';
import { PythonShell } from './python-shell';
import fs from 'fs';

interface StemsTask {
    filePath: string;
    outDir: string;
    resolve: (val: any) => void;
    reject: (err: any) => void;
}

class StemsQueue {
    private queue: StemsTask[] = [];
    private processing = false;

    async add(filePath: string, outDir: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push({ filePath, outDir, resolve, reject });
            this.process();
        });
    }

    private async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const task = this.queue.shift()!;
        try {
            const result = await this.execute(task.filePath, task.outDir);
            task.resolve(result);
        } catch (e) {
            task.reject(e);
        } finally {
            this.processing = false;
            this.process();
        }
    }

    private execute(filePath: string, outDir: string): Promise<any> {
        const stemsPath = getSeparateStemsPath();
        if (!fs.existsSync(stemsPath)) {
            throw new Error(`El motor de separación de pistas no se encuentra en: ${stemsPath}`);
        }

        const env = PythonShell.getEnv();
        const { config } = require('./config');
        const quality = config.stemsQuality || 'standard';
        const args = [filePath, outDir, quality];

        return new Promise((resolve, reject) => {
            const proc = spawn(stemsPath, args, { env });
            const win = BrowserWindow.getAllWindows()[0];
            const fileName = path.basename(filePath);
            // ... rest remains same but logic is cleaner now

            let totalModels = 1;
            let currentModelIndex = 0;
            let lastPercent = 0;

            const updateUI = (type: string, data: any) => {
                if (win) win.webContents.send('stems:update', {
                    filePath,
                    fileName,
                    type,
                    data
                });
            };

            proc.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === 'success') {
                            updateUI('success', json.data);
                            resolve(json.data);
                        } else if (json.type === 'error') {
                            updateUI('error', json.data);
                            reject(new Error(json.data));
                        } else {
                            updateUI(json.type, json.data);
                        }
                    } catch (e) {
                        // Raw output
                        if (line.includes('Selected model is a bag of')) {
                            const match = line.match(/bag of (\d+) models/);
                            if (match) totalModels = parseInt(match[1], 10);
                        }
                    }
                }
            });

            proc.stderr.on('data', (data) => {
                const str = data.toString();

                // Regex para capturar el progreso de tqdm: [00:00<00:00] etc
                // Ejemplo: 45%|████▍     | 44.0M/80.2M [00:00<00:00, 92.1MB/s]
                const percentMatch = str.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);

                    // Si el porcentaje baja de repente, es que hemos empezado un nuevo modelo de la bolsa
                    if (percent < lastPercent && lastPercent > 80) {
                        currentModelIndex++;
                    }
                    lastPercent = percent;

                    // Calcular progreso global
                    const globalProgress = Math.min(99, Math.round(((currentModelIndex * 100) + percent) / totalModels));
                    updateUI('progress', globalProgress);
                }
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    updateUI('error', `Motor falló (código ${code})`);
                    reject(new Error(`Motor falló con código ${code}`));
                }
            });
        });
    }
}

export const stemsQueue = new StemsQueue();

export async function separateStems(filePath: string, outDir: string): Promise<any> {
    return stemsQueue.add(filePath, outDir);
}
