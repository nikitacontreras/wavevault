import { ffmpegPath, ffprobeBinaryPath } from "./ffmpeg";

export interface AppConfig {
    pythonPath: string | null;
    ffmpegPath: string | null;
    ffprobePath: string | null;
}

export const config: AppConfig = {
    pythonPath: null,
    ffmpegPath: null,
    ffprobePath: null
};

export function getPythonPath(): string {
    return config.pythonPath || "python3";
}

export function getFFmpegPath(): string {
    return config.ffmpegPath || (ffmpegPath as string);
}

export function getFFprobePath(): string {
    return config.ffprobePath || (ffprobeBinaryPath as string);
}
