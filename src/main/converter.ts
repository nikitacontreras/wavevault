import ff from "./ffmpeg";
import path from "node:path";
import fs from "node:fs/promises";
import { TargetFormat, Bitrate, SampleRate } from "./types";

export interface ConversionJob {
    src: string;
    outDir: string;
    format: TargetFormat;
    bitrate: Bitrate;
    sampleRate: SampleRate;
    normalize: boolean;
}

export interface ConversionResult {
    path: string;
    originalName: string;
    format: string;
    size: number;
}

export async function convertFile(job: ConversionJob): Promise<ConversionResult> {
    const ext = path.extname(job.src);
    const baseName = path.basename(job.src, ext);
    const destName = `${baseName}_converted_${Date.now()}.${job.format}`;
    const dest = path.join(job.outDir, destName);

    await fs.mkdir(job.outDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
        let codec = "libmp3lame";
        if (job.format === "m4a") codec = "aac";
        else if (job.format === "ogg") codec = "libvorbis";
        else if (job.format === "wav") codec = "pcm_s16le";
        else if (job.format === "flac") codec = "flac";
        else if (job.format === "aiff") codec = "pcm_s16be";

        const cmd = ff(job.src)
            .audioCodec(codec)
            .audioFrequency(parseInt(job.sampleRate));

        if (job.normalize) {
            cmd.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
        }

        if (job.format !== "wav" && job.format !== "flac" && job.format !== "aiff") {
            cmd.audioBitrate(job.bitrate);
        }

        cmd.on("error", (err: any) => reject(err))
            .on("end", () => resolve())
            .save(dest);
    });

    const stats = await fs.stat(dest);

    return {
        path: dest,
        originalName: baseName,
        format: job.format,
        size: stats.size
    };
}
