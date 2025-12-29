import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(ffmpegPath as any);
export default ffmpeg;