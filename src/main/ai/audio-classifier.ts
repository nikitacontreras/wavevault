import { execa } from 'execa';
import MusicTempo from 'music-tempo';
import path from 'path';
import { getFFmpegPath } from '../config';

export interface AudioClassificationResult {
    success: boolean;
    category: string | null;
    key?: string;
    features?: {
        centroid: number;
        zcr: number;
        flatness: number;
        bpm: number;
    };
    error?: string;
}

/**
 * Native Audio Classifier & Feature Extractor (No Python/Librosa required)
 */
export async function classifyAudioNative(filePath: string): Promise<AudioClassificationResult> {
    try {
        const sampleRate = 22050;
        const durationSec = 2.0;

        // 1. Decode first 2 seconds to PCM s16le mono using ffmpeg
        const { stdout } = await execa(getFFmpegPath(), [
            '-i', filePath,
            '-f', 's16le',
            '-ac', '1',
            '-ar', String(sampleRate),
            '-t', String(durationSec),
            'pipe:1'
        ], { encoding: 'buffer' });

        const buffer = Buffer.from(stdout);
        const numSamples = Math.floor(buffer.length / 2);
        if (numSamples === 0) {
            return { success: false, category: null, error: 'Empty audio buffer' };
        }

        const y = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            y[i] = buffer.readInt16LE(i * 2) / 32768.0;
        }

        // 2. Zero Crossing Rate (ZCR)
        let crossings = 0;
        for (let i = 1; i < numSamples; i++) {
            if ((y[i] >= 0 && y[i - 1] < 0) || (y[i] < 0 && y[i - 1] >= 0)) {
                crossings++;
            }
        }
        const zcrMean = crossings / numSamples;

        // 3. Simple FFT for Spectral Analysis
        const fftSize = 1024;
        const hopSize = 512;
        const numFrames = Math.max(1, Math.floor((numSamples - fftSize) / hopSize));

        let totalCentroid = 0;
        let totalFlatness = 0;
        const chromaAccum = new Float64Array(12);

        let validFrames = 0;

        for (let frame = 0; frame < numFrames; frame++) {
            const offset = frame * hopSize;
            let sumMagnitude = 0;
            let weightedSum = 0;
            let logSum = 0;
            let geomCount = 0;

            const halfFft = fftSize / 2;
            const binWidth = sampleRate / fftSize;

            for (let k = 0; k < halfFft; k++) {
                let real = 0;
                let imag = 0;
                const freq = k * binWidth;

                for (let n = 0; n < fftSize; n++) {
                    const sampleIdx = offset + n;
                    if (sampleIdx < numSamples) {
                        const windowVal = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (fftSize - 1)));
                        const val = y[sampleIdx] * windowVal;
                        const angle = (2 * Math.PI * k * n) / fftSize;
                        real += val * Math.cos(angle);
                        imag -= val * Math.sin(angle);
                    }
                }

                const magnitude = Math.sqrt(real * real + imag * imag);
                sumMagnitude += magnitude;
                weightedSum += freq * magnitude;

                if (magnitude > 1e-6) {
                    logSum += Math.log(magnitude);
                    geomCount++;
                }

                if (freq > 60 && freq < 2000) {
                    const midiNote = 12 * Math.log2(freq / 440.0) + 69;
                    const pitchClass = Math.round(midiNote) % 12;
                    const positivePitch = (pitchClass + 12) % 12;
                    chromaAccum[positivePitch] += magnitude;
                }
            }

            if (sumMagnitude > 1e-4) {
                const centroid = weightedSum / sumMagnitude;
                const geometricMean = geomCount > 0 ? Math.exp(logSum / geomCount) : 0;
                const arithmeticMean = sumMagnitude / halfFft;
                const flatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

                totalCentroid += centroid;
                totalFlatness += flatness;
                validFrames++;
            }
        }

        const centMean = validFrames > 0 ? totalCentroid / validFrames : 1500;
        const flatMean = validFrames > 0 ? totalFlatness / validFrames : 0.05;

        // 4. Key Detection from Chroma profile correlation (Krumhansl-Schmuckler)
        const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
        const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        function correlation(x: Float64Array, y: number[]): number {
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
            const n = x.length;
            for (let i = 0; i < n; i++) {
                sumX += x[i];
                sumY += y[i];
                sumXY += x[i] * y[i];
                sumX2 += x[i] * x[i];
                sumY2 += y[i] * y[i];
            }
            const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
            return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
        }

        let bestScore = -Infinity;
        let detectedKey = "C Major";

        for (let i = 0; i < 12; i++) {
            const rotMajor = [...majorProfile.slice(12 - i), ...majorProfile.slice(0, 12 - i)];
            const rotMinor = [...minorProfile.slice(12 - i), ...minorProfile.slice(0, 12 - i)];

            const majScore = correlation(chromaAccum, rotMajor);
            const minScore = correlation(chromaAccum, rotMinor);

            if (majScore > bestScore) {
                bestScore = majScore;
                detectedKey = `${keys[i]} Major`;
            }
            if (minScore > bestScore) {
                bestScore = minScore;
                detectedKey = `${keys[i]} Minor`;
            }
        }

        // 5. BPM Detection using MusicTempo
        let bpm = 0;
        try {
            const mt = new MusicTempo(y);
            bpm = Math.round(mt.tempo) || 0;
        } catch (_) {}

        // 6. Classification heuristics (identical to classify_audio.py)
        const duration = numSamples / sampleRate;
        let category = "Unknown";
        const isLoop = duration > 4.0;

        if (isLoop) {
            category = "Loop";
            if (centMean < 1000) category = "Bass Loop";
            else if (centMean > 3000) category = "Synth Loop";
            else category = "Drum Loop";
        } else {
            if (centMean < 1000 && flatMean < 0.05) {
                category = "Kick";
            } else if (centMean >= 1000 && centMean < 3000 && zcrMean > 0.1) {
                category = "Snare";
            } else if (centMean > 3500 && flatMean > 0.1) {
                category = duration > 0.5 ? "Cymbal" : "Hi-Hat";
            } else if (centMean > 100 && centMean < 800 && flatMean < 0.02) {
                category = "Bass";
            } else if (centMean > 2000 && zcrMean < 0.1) {
                category = "Synth";
            } else if (centMean > 3000 && flatMean > 0.2) {
                category = "FX";
            }
        }

        return {
            success: true,
            category,
            key: detectedKey,
            features: {
                centroid: Math.round(centMean),
                zcr: Number(zcrMean.toFixed(4)),
                flatness: Number(flatMean.toFixed(4)),
                bpm
            }
        };
    } catch (e: any) {
        return {
            success: false,
            category: null,
            error: e.message || 'Analysis failed'
        };
    }
}
