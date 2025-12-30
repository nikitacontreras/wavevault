import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";

// Function to update paths dynamically
export function setupFfmpeg(customFfmpeg?: string | null, customFfprobe?: string | null) {
    const finalFfmpeg = customFfmpeg || (ffmpegPath as any);
    const finalFfprobe = customFfprobe || (ffprobePath as any).path || ffprobePath;

    if (finalFfmpeg) ffmpeg.setFfmpegPath(finalFfmpeg);
    if (finalFfprobe) ffmpeg.setFfprobePath(finalFfprobe);

    console.log("FFmpeg Configured:", finalFfmpeg);
    console.log("FFprobe Configured:", finalFfprobe);
}

// Initial setup
setupFfmpeg();

export { ffmpegPath };
export const ffprobeBinaryPath = (ffprobePath as any).path || ffprobePath;
export default ffmpeg;