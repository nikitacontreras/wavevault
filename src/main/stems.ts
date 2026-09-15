import { BrowserWindow } from 'electron';
import path from 'path';
import { OnnxStemSeparator } from './ai/onnx-stems';
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
                        data: e.message || 'Error en la separación de pistas'
                    });
                }
            });
            task.reject(e);
        } finally {
            this.processing = false;
            this.process();
        }
    }

    private async execute(filePath: string, outDir: string): Promise<any> {
        const fileName = path.basename(filePath);

        const updateUI = (type: 'progress' | 'error' | 'success', data: any) => {
            const current = this.activeTasks.get(filePath);
            if (current) {
                current.type = type;
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

        try {
            const result = await OnnxStemSeparator.separate(filePath, outDir, (type, data) => {
                updateUI(type, data);
            });

            this.activeTasks.delete(filePath);

            // Index stems in library
            indexStemResults(result).catch(err => {
                console.error("[StemsQueue] Failed to index stems:", err);
            });

            return result;
        } catch (err: any) {
            updateUI('error', err.message || 'Error en la separación de pistas');
            this.activeTasks.delete(filePath);
            throw err;
        }
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
