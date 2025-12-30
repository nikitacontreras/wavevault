import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import path from "node:path";

// Helper to fix ASAR paths for executables
function fixAsarPath(p: string | null | undefined): string | null {
    if (!p) return null;
    if (p.includes("app.asar") && !p.includes("app.asar.unpacked")) {
        return p.replace("app.asar", "app.asar.unpacked");
    }
    return p;
}

// Function to update paths dynamically
export function setupFfmpeg(customFfmpeg?: string | null, customFfprobe?: string | null) {
    const rawFfmpeg = customFfmpeg || (ffmpegPath as any);
    const rawFfprobe = customFfprobe || (ffprobePath as any).path || ffprobePath;

    const finalFfmpeg = fixAsarPath(rawFfmpeg);
    const finalFfprobe = fixAsarPath(rawFfprobe);

    if (finalFfmpeg) ffmpeg.setFfmpegPath(finalFfmpeg);
    if (finalFfprobe) ffmpeg.setFfprobePath(finalFfprobe);

    console.log("FFmpeg Configured:", finalFfmpeg);
    console.log("FFprobe Configured:", finalFfprobe);
}

// Initial setup
setupFfmpeg();

export const ffmpegBinaryPath = fixAsarPath(ffmpegPath as any);
export const ffprobeBinaryPath = fixAsarPath((ffprobePath as any).path || ffprobePath);
export default ffmpeg;