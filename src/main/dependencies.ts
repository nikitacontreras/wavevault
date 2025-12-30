import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { ffmpegBinaryPath, ffprobeBinaryPath } from "./ffmpeg";

const execAsync = promisify(exec);

export interface DependencyStatus {
    python: boolean;
    ffmpeg: boolean;
    ffprobe: boolean;
}

export async function checkDependencies(manualPaths?: { python?: string; ffmpeg?: string; ffprobe?: string }): Promise<DependencyStatus> {
    const status: DependencyStatus = {
        python: false,
        ffmpeg: false,
        ffprobe: false
    };

    // Check Python
    const pythonCmd = manualPaths?.python || "python3";
    try {
        await execAsync(`${pythonCmd} --version`);
        status.python = true;
    } catch (e) {
        if (!manualPaths?.python) {
            try {
                await execAsync("python --version");
                status.python = true;
            } catch (e2) {
                status.python = false;
            }
        } else {
            status.python = false;
        }
    }

    // Check FFmpeg
    const fPath = manualPaths?.ffmpeg || (ffmpegBinaryPath as string);
    try {
        if (manualPaths?.ffmpeg) {
            await execAsync(`${fPath} -version`);
            status.ffmpeg = true;
        } else {
            status.ffmpeg = fs.existsSync(fPath);
        }
    } catch {
        status.ffmpeg = false;
    }

    // Check FFprobe
    const fpPath = manualPaths?.ffprobe || (ffprobeBinaryPath as string);
    try {
        if (manualPaths?.ffprobe) {
            await execAsync(`${fpPath} -version`);
            status.ffprobe = true;
        } else {
            status.ffprobe = fs.existsSync(fpPath);
        }
    } catch {
        status.ffprobe = false;
    }

    return status;
}
