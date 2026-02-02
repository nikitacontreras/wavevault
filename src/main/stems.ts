import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { getSeparateStemsPath } from './binaries';
import { PythonShell } from './python-shell';
import fs from 'fs';
import { indexStemResults } from './localLibrary';


interface StemsTask {
    filePath: string;
    outDir: string;
    resolve: (val: any) => void;
    reject: (err: any) => void;
}

interface TaskStatus {
    type: 'progress' | 'error' | 'success';
    data: any;
    fileName: string;
    promise?: Promise<any>;
}

class StemsQueue {
    private queue: StemsTask[] = [];
    private processing = false;
    private activeTasks = new Map<string, TaskStatus>();

    async add(filePath: string, outDir: string): Promise<any> {
        // If already processing or queued this specific file, return its promise
        const existing = this.activeTasks.get(filePath);
        if (existing && existing.promise) {
            return existing.promise;
        }

        const promise = new Promise((resolve, reject) => {
            this.queue.push({ filePath, outDir, resolve, reject });
            this.process();
        });

        this.activeTasks.set(filePath, {
            type: 'progress',
            data: 'En cola...',
            fileName: path.basename(filePath),
            promise
        });

        return promise;
    }

    getStatus(filePath: string): any {
        const task = this.activeTasks.get(filePath);
        if (!task) return null;
        try {
            // Force deep clone to avoid IPC cloning errors (ReferenceError, Class instances, etc)
            return JSON.parse(JSON.stringify({
                type: task.type,
                data: task.data,
                fileName: task.fileName
            }));
        } catch (e) {
            return { type: task.type, fileName: task.fileName, data: String(task.data) };
        }
    }

    getAllStatuses(): any[] {
        return Array.from(this.activeTasks.entries()).map(([filePath, task]) => {
            try {
                return JSON.parse(JSON.stringify({
                    filePath,
                    type: task.type,
                    data: task.data,
                    fileName: task.fileName
                }));
            } catch (e) {
                return { filePath, type: task.type, fileName: task.fileName, data: String(task.data) };
            }
        });
    }

    private async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const task = this.queue.shift()!;
        try {
            const result = await this.execute(task.filePath, task.outDir);
            task.resolve(result);
        } catch (e: any) {
            console.error("[StemsQueue] Error:", e);
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) {
                    w.webContents.send('stems:update', {
                        filePath: task.filePath,
                        fileName: path.basename(task.filePath),
                        type: 'error',
                        data: e.message
                    });
                }
            });
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
        const { config, getPythonPath } = require('./config');
        const quality = config.stemsQuality || 'standard';
        console.log(`[StemsQueue] STARTING SEPARATION. Selected Quality: ${quality}. Config:`, JSON.stringify(config));

        // Use script in dev if available
        let finalPath = stemsPath;
        let finalArgs = stemsPath.includes('ai_engine')
            ? ['separate', filePath, outDir, quality]
            : [filePath, outDir, quality];

        const { app } = require('electron');
        if (!app.isPackaged) {
            const projectRoot = app.getAppPath();
            const venvFolders = ['.venv_build', '.venv', 'venv'];
            let venvPath: string | undefined;

            console.log(`[StemsQueue] Searching VENV in ${projectRoot}...`);
            for (const folder of venvFolders) {
                const py3 = path.resolve(projectRoot, folder, 'bin/python3');
                const py = path.resolve(projectRoot, folder, 'bin/python');
                if (fs.existsSync(py3)) {
                    venvPath = py3;
                    break;
                } else if (fs.existsSync(py)) {
                    venvPath = py;
                    break;
                }
            }

            // Fallback for this machine
            if (!venvPath && fs.existsSync('/Users/nikitastrike/Development/wavevault/.venv_build/bin/python3')) {
                venvPath = '/Users/nikitastrike/Development/wavevault/.venv_build/bin/python3';
            }

            const pythonExec = venvPath || getPythonPath();
            console.log(`[StemsQueue] VENV Result: ${venvPath ? 'FOUND ' + venvPath : 'NOT FOUND, using default ' + pythonExec}`);

            const possiblePaths = [
                path.join(projectRoot, 'scripts', 'separate_stems.py'),
                path.join(projectRoot, '..', 'scripts', 'separate_stems.py'),
                path.resolve(__dirname, '../../scripts/separate_stems.py'),
                path.resolve(__dirname, '../scripts/separate_stems.py'),
                '/Users/nikitastrike/Development/wavevault/scripts/separate_stems.py'
            ];

            const scriptPath = possiblePaths.find(p => fs.existsSync(p));
            if (scriptPath) {
                finalPath = pythonExec;
                finalArgs = [scriptPath, filePath, outDir, quality];
                console.log(`[StemsQueue] DEV MODE: Using script at ${scriptPath} with python: ${pythonExec}`);
            } else {
                console.warn(`[StemsQueue] DEV MODE: Script NOT found in any location:`, possiblePaths);
            }
        }

        return new Promise((resolve, reject) => {
            const proc = spawn(finalPath, finalArgs, { env });
            const fileName = path.basename(filePath);

            const updateUI = (type: string, data: any) => {
                console.log(`[StemsQueue] updateUI: ${type} - ${JSON.stringify(data)}`);
                // Update local status map
                const current = this.activeTasks.get(filePath);
                if (current) {
                    current.type = type as any;
                    current.data = data;
                }

                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) {
                        w.webContents.send('stems:update', {
                            filePath,
                            fileName,
                            type,
                            data
                        });
                    }
                });
            };

            updateUI('progress', 'Iniciando motor de IA...');

            let totalModels = 1;
            let currentModelIndex = 0;
            let lastPercent = 0;

            proc.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === 'success') {
                            updateUI('success', json.data);
                            this.activeTasks.delete(filePath); // Clean up on success

                            // Background indexing for library
                            indexStemResults(json.data).catch(err => {
                                console.error("[StemsQueue] Failed to index stems:", err);
                            });

                            resolve(json.data);

                        } else if (json.type === 'error') {
                            updateUI('error', json.data);
                            this.activeTasks.delete(filePath);
                            reject(new Error(json.data));
                        } else {
                            updateUI(json.type, json.data);
                        }
                    } catch (e) {
                        if (line.includes('Selected model is a bag of')) {
                            const match = line.match(/bag of (\d+) models/);
                            if (match) totalModels = parseInt(match[1], 10);
                        }
                    }
                }
            });

            proc.stderr.on('data', (data) => {
                const str = data.toString();
                const percentMatch = str.match(/(\d+)%/);

                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    if (percent < lastPercent && lastPercent > 80) {
                        currentModelIndex++;
                    }
                    lastPercent = percent;
                    const globalProgress = Math.min(99, Math.round(((currentModelIndex * 100) + percent) / totalModels));
                    updateUI('progress', globalProgress);
                } else {
                    // Si no hay porcentaje pero hay texto, podría ser un log de descarga o inicio
                    const lines = str.split('\n').filter(l => l.trim().length > 0);
                    const lastLine = lines[lines.length - 1]?.trim();
                    if (lastLine && lastLine.length < 100 && !lastLine.includes('|')) {
                        // Evitar ruido excesivo de logs internos de python si es posible
                        if (lastLine.includes('Downloading') || lastLine.includes('Extracting') || lastLine.includes('Loading')) {
                            updateUI('progress', lastLine);
                        }
                    }
                }
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    updateUI('error', `Motor falló (código ${code})`);
                    this.activeTasks.delete(filePath);
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

export function getStemsStatus(filePath: string) {
    return stemsQueue.getStatus(filePath);
}

export function getAllStemsStatuses() {
    return stemsQueue.getAllStatuses();
}
