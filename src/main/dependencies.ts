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
        python: false,
        ffmpeg: false,
        ffprobe: false,
        pythonVersion: undefined,
        ffmpegVersion: undefined,
        ffprobeVersion: undefined
    };

    // Check Python
    const pythonCmd = manualPaths?.python || "python3";
    try {
        const { stdout } = await execAsync(`"${pythonCmd}" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"`);
        const ver = stdout.trim();
        status.pythonVersion = ver;
        const [major, minor] = ver.split('.').map(Number);
        status.python = major > 3 || (major === 3 && minor >= 10);
    } catch {
        status.python = false;
    }

    // If auto-detecting and default failed, test common candidate paths on macOS / Linux
    if (!status.python && !manualPaths?.python) {
        const candidates = [
            "/opt/homebrew/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.10/bin/python3",
            "/usr/local/bin/python3",
            "python"
        ];

        for (const candidate of candidates) {
            try {
                if (candidate.startsWith("/") && !fs.existsSync(candidate)) continue;
                const { stdout } = await execAsync(`"${candidate}" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"`);
                const ver = stdout.trim();
                const [major, minor] = ver.split('.').map(Number);
                if (major > 3 || (major === 3 && minor >= 10)) {
                    status.python = true;
                    status.pythonVersion = ver;
                    break;
                }
            } catch {
                // Ignore and try next
            }
        }
    }

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
