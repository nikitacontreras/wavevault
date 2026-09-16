import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { ffmpegBinaryPath, ffprobeBinaryPath } from "./ffmpeg";

const execAsync = promisify(exec);

export interface DependencyStatus {
    python: boolean;
    ffmpeg: boolean;
    ffprobe: boolean;
    pythonVersion?: string;
    ffmpegVersion?: string;
    ffprobeVersion?: string;
}

export async function checkDependencies(manualPaths?: { python?: string; ffmpeg?: string; ffprobe?: string }): Promise<DependencyStatus> {
    const status: DependencyStatus = {
        python: true, // Native ONNX runtime embedded - No system Python required!
        ffmpeg: false,
        ffprobe: false,
        pythonVersion: "Nativo (ONNX)",
        ffmpegVersion: undefined,
        ffprobeVersion: undefined
    };

    // Check FFmpeg
    const fPath = manualPaths?.ffmpeg || (ffmpegBinaryPath as string);
    try {
        const { stdout } = await execAsync(`"${fPath}" -version`);
        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/version\s+([^\s]+)/i);
        status.ffmpegVersion = match ? match[1] : "OK";
        status.ffmpeg = true;
    } catch {
        if (!manualPaths?.ffmpeg && fs.existsSync(fPath)) {
            status.ffmpeg = true;
            status.ffmpegVersion = "Integrado";
        } else {
            status.ffmpeg = false;
        }
    }

    // Check FFprobe
    const fpPath = manualPaths?.ffprobe || (ffprobeBinaryPath as string);
    try {
        const { stdout } = await execAsync(`"${fpPath}" -version`);
        const firstLine = stdout.split('\n')[0] || '';
        const match = firstLine.match(/version\s+([^\s]+)/i);
        status.ffprobeVersion = match ? match[1] : "OK";
        status.ffprobe = true;
    } catch {
        if (!manualPaths?.ffprobe && fs.existsSync(fpPath)) {
            status.ffprobe = true;
            status.ffprobeVersion = "Integrado";
        } else {
            status.ffprobe = false;
        }
    }

    return status;
}
