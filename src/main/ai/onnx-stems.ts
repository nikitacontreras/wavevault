import * as ort from 'onnxruntime-node';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';
import { getFFmpegPath } from '../config';

export interface StemSeparationProgressCallback {
    (type: 'progress' | 'error' | 'success', data: any): void;
}

export interface StemSeparationResult {
    drums: string;
    bass: string;
    other: string;
    vocals: string;
    [key: string]: string;
}

const DEFAULT_MODEL_URL = 'https://github.com/sevagh/demucs-onnx/releases/download/v0.0.1/htdemucs.onnx';

export class OnnxStemSeparator {
    private static sessionCache: Map<string, ort.InferenceSession> = new Map();

    /**
     * Resolves or downloads the htdemucs.onnx model
     */
    static async getOrDownloadModel(onProgress?: (msg: string) => void): Promise<string> {
        const candidatePaths = [
            path.join(process.resourcesPath || '', 'models', 'htdemucs.onnx'),
            path.join(app.getAppPath(), 'resources', 'models', 'htdemucs.onnx'),
            path.join(app.getPath('userData'), 'models', 'htdemucs.onnx')
        ];

        for (const p of candidatePaths) {
            if (fs.existsSync(p) && fs.statSync(p).size > 10 * 1024 * 1024) {
                return p;
            }
        }

        const targetDir = path.join(app.getPath('userData'), 'models');
        fs.mkdirSync(targetDir, { recursive: true });
        const targetPath = path.join(targetDir, 'htdemucs.onnx');

        onProgress?.('Descargando modelo de IA (htdemucs.onnx)...');
        await this.downloadFile(DEFAULT_MODEL_URL, targetPath, (pct) => {
            onProgress?.(`Descargando modelo de IA (${pct}%)...`);
        });

        return targetPath;
    }

    private static downloadFile(url: string, destPath: string, onPercent?: (pct: number) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const tempPath = destPath + '.tmp';
            const fileStream = fs.createWriteStream(tempPath);

            const handleRequest = (reqUrl: string) => {
                const client = reqUrl.startsWith('https') ? https : http;
                client.get(reqUrl, (res) => {
                    // Handle HTTP Redirects (301, 302, 307, 308)
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        return handleRequest(res.headers.location);
                    }

                    if (res.statusCode !== 200) {
                        fileStream.close();
                        fs.unlinkSync(tempPath);
                        return reject(new Error(`Failed to download model: HTTP ${res.statusCode}`));
                    }

                    const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
                    let downloadedBytes = 0;

                    res.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        fileStream.write(chunk);
                        if (totalBytes > 0 && onPercent) {
                            const pct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                            onPercent(pct);
                        }
                    });

                    res.on('end', () => {
                        fileStream.end(() => {
                            fs.renameSync(tempPath, destPath);
                            resolve();
                        });
                    });

                    res.on('error', (err) => {
                        fileStream.close();
                        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                        reject(err);
                    });
                }).on('error', (err) => {
                    fileStream.close();
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                    reject(err);
                });
            };

            handleRequest(url);
        });
    }

    /**
     * Get or create an ONNX Inference Session
     */
    static async getSession(modelPath: string): Promise<ort.InferenceSession> {
        if (this.sessionCache.has(modelPath)) {
            return this.sessionCache.get(modelPath)!;
        }

        const options: ort.InferenceSession.SessionOptions = {
            executionProviders: [
                process.platform === 'darwin' ? 'coreml' : 'cpu',
                'cpu'
            ],
            graphOptimizationLevel: 'all'
        };

        const session = await ort.InferenceSession.create(modelPath, options);
        this.sessionCache.set(modelPath, session);
        return session;
    }

    /**
     * Decode audio file to raw Float32 stereo PCM array at 44100Hz
     */
    private static decodeAudio(filePath: string): Promise<{ left: Float32Array; right: Float32Array; totalSamples: number }> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(getFFmpegPath(), [
                '-i', filePath,
                '-f', 'f32le',
                '-ac', '2',
                '-ar', '44100',
                'pipe:1'
            ], { stdio: ['ignore', 'pipe', 'ignore'] });

            const chunks: Buffer[] = [];
            ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
            ffmpeg.on('error', reject);
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`FFmpeg decoding failed with code ${code}`));
                }

                const totalBuffer = Buffer.concat(chunks);
                const totalFloats = totalBuffer.length / 4;
                const totalSamples = Math.floor(totalFloats / 2);

                const left = new Float32Array(totalSamples);
                const right = new Float32Array(totalSamples);

                for (let i = 0; i < totalSamples; i++) {
                    left[i] = totalBuffer.readFloatLE(i * 8);
                    right[i] = totalBuffer.readFloatLE(i * 8 + 4);
                }

                resolve({ left, right, totalSamples });
            });
        });
    }

    /**
     * Encode raw Float32 stereo PCM array to output audio file
     */
    private static encodeAudio(left: Float32Array, right: Float32Array, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const numSamples = left.length;
            const buffer = Buffer.alloc(numSamples * 8);

            for (let i = 0; i < numSamples; i++) {
                // Clamp between -1.0 and 1.0 to avoid clipping distortion
                const l = Math.max(-1.0, Math.min(1.0, left[i]));
                const r = Math.max(-1.0, Math.min(1.0, right[i]));
                buffer.writeFloatLE(l, i * 8);
                buffer.writeFloatLE(r, i * 8 + 4);
            }

            const ffmpeg = spawn(getFFmpegPath(), [
                '-y',
                '-f', 'f32le',
                '-ar', '44100',
                '-ac', '2',
                '-i', 'pipe:0',
                '-c:a', 'pcm_s16le',
                outputPath
            ], { stdio: ['pipe', 'ignore', 'ignore'] });

            ffmpeg.stdin.write(buffer);
            ffmpeg.stdin.end();

            ffmpeg.on('error', reject);
            ffmpeg.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg encoding failed with code ${code}`));
            });
        });
    }

    /**
     * Separate audio into 4 stems (drums, bass, other, vocals)
     */
    static async separate(
        filePath: string,
        outputDir: string,
        onProgress: StemSeparationProgressCallback
    ): Promise<StemSeparationResult> {
        onProgress('progress', 'Iniciando motor de IA nativo...');

        const modelPath = await this.getOrDownloadModel((msg) => onProgress('progress', msg));
        const session = await this.getSession(modelPath);

        onProgress('progress', 'Decodificando audio...');
        const { left, right, totalSamples } = await this.decodeAudio(filePath);

        if (totalSamples === 0) {
            throw new Error('El archivo de audio está vacío o no se pudo decodificar.');
        }

        // Stem order in htdemucs: 0=drums, 1=bass, 2=other, 3=vocals
        const stemNames = ['drums', 'bass', 'other', 'vocals'];
        const stemLeft = [new Float32Array(totalSamples), new Float32Array(totalSamples), new Float32Array(totalSamples), new Float32Array(totalSamples)];
        const stemRight = [new Float32Array(totalSamples), new Float32Array(totalSamples), new Float32Array(totalSamples), new Float32Array(totalSamples)];

        // Segment processing: 10 second chunks with 25% overlap for cross-fading
        const sampleRate = 44100;
        const segmentSamples = sampleRate * 10;
        const hopSamples = Math.floor(segmentSamples * 0.75);
        const totalChunks = Math.max(1, Math.ceil(totalSamples / hopSamples));

        onProgress('progress', 5);

        const inputName = session.inputNames[0] || 'audio';
        const outputName = session.outputNames[0] || 'stems';

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
            const start = chunkIdx * hopSamples;
            const end = Math.min(totalSamples, start + segmentSamples);
            const chunkLen = end - start;

            // Prepare chunk buffer padded to segmentSamples if needed
            const chunkBuffer = new Float32Array(2 * segmentSamples);
            for (let i = 0; i < chunkLen; i++) {
                chunkBuffer[i] = left[start + i];
                chunkBuffer[segmentSamples + i] = right[start + i];
            }

            const inputTensor = new ort.Tensor('float32', chunkBuffer, [1, 2, segmentSamples]);
            const feeds: Record<string, ort.Tensor> = {};
            feeds[inputName] = inputTensor;

            const results = await session.run(feeds);
            const outputTensor = results[outputName];
            const outData = outputTensor.data as Float32Array;

            // Shape: [1, 4, 2, segmentSamples]
            for (let s = 0; s < 4; s++) {
                for (let i = 0; i < chunkLen; i++) {
                    const lVal = outData[s * 2 * segmentSamples + i];
                    const rVal = outData[(s * 2 + 1) * segmentSamples + i];

                    const destIdx = start + i;
                    if (destIdx < totalSamples) {
                        // Hann window weight for overlap region
                        let weight = 1.0;
                        if (i < hopSamples && chunkIdx > 0) {
                            weight = 0.5 * (1 - Math.cos((Math.PI * i) / (segmentSamples - hopSamples)));
                        } else if (i >= hopSamples && chunkIdx < totalChunks - 1) {
                            weight = 0.5 * (1 + Math.cos((Math.PI * (i - hopSamples)) / (segmentSamples - hopSamples)));
                        }

                        stemLeft[s][destIdx] = stemLeft[s][destIdx] === 0 ? lVal : (stemLeft[s][destIdx] + lVal * weight);
                        stemRight[s][destIdx] = stemRight[s][destIdx] === 0 ? rVal : (stemRight[s][destIdx] + rVal * weight);
                    }
                }
            }

            const progressPct = Math.min(90, Math.round(5 + ((chunkIdx + 1) / totalChunks) * 85));
            onProgress('progress', progressPct);
        }

        // Save output stems
        onProgress('progress', 92);
        fs.mkdirSync(outputDir, { recursive: true });
        const baseName = path.basename(filePath, path.extname(filePath));

        const outputPaths: Record<string, string> = {};

        for (let s = 0; s < 4; s++) {
            const outPath = path.join(outputDir, `${baseName}_${stemNames[s]}.wav`);
            await this.encodeAudio(stemLeft[s], stemRight[s], outPath);
            outputPaths[stemNames[s]] = outPath;
        }

        onProgress('progress', 100);

        const finalResult: StemSeparationResult = {
            drums: outputPaths.drums,
            bass: outputPaths.bass,
            other: outputPaths.other,
            vocals: outputPaths.vocals
        };

        onProgress('success', finalResult);
        return finalResult;
    }
}
