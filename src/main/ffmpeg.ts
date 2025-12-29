import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath as any);
if (ffprobePath && (ffprobePath as any).path) {
    ffmpeg.setFfprobePath((ffprobePath as any).path);
} else {
    ffmpeg.setFfprobePath(ffprobePath as any);
}

export { ffmpegPath };
export const ffprobeBinaryPath = (ffprobePath as any).path || ffprobePath;
export default ffmpeg;