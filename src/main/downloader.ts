import execa from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import * as mm from "music-metadata";
import NodeID3 from "node-id3";
import ff from "./ffmpeg";
import { DownloadJob, VideoMeta, TargetFormat, Bitrate, SampleRate, SearchResult } from "./types";
import ytDlp from "yt-dlp-exec";
import { analyzeBPM, analyzeKey, getDuration } from "./audio-analysis";
import { getPythonPath, getFFmpegPath } from "./config";

// Helper function to get Python command
async function getPythonCommand() {
    const pythonPath = await getPythonPath();
    return pythonPath;
}

// Helper function to get yt-dlp path
function getYtDlpPath() {
    return ytDlp;
}


const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;
const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function normalizeUrl(input: any): string {
    if (typeof input !== 'string') {
        console.error("[normalizeUrl] Received non-string input:", input);
        // Try to recover if it's an object with a url property
        if (input && typeof input === 'object' && typeof input.url === 'string') {
            input = input.url;
        } else {
            throw new Error("URL no válida: se esperaba un string");
        }
    }

    const trimmed = input.trim();

    // If it's just a video ID (11 characters), construct full URL
    if (YT_ID_REGEX.test(trimmed)) {
        return `https://www.youtube.com/watch?v=${trimmed}`;
    }

    // If it doesn't look like a YouTube URL at all, throw error
    if (!YT_REGEX.test(trimmed) && !trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
        throw new Error("URL no válida de YouTube");
    }

    // Ensure it has protocol
    const urlWithProtocol = trimmed.startsWith("http") ? trimmed : "https://" + trimmed;

    try {
        const u = new URL(urlWithProtocol);

        // youtu.be/<id> → https://www.youtube.com/watch?v=<id>
        if (u.hostname === "youtu.be") {
            const id = u.pathname.replace("/", "");
            return `https://www.youtube.com/watch?v=${id}`;
        }

        return urlWithProtocol;
    } catch {
        // If URL parsing fails, return the cleaned original
        return urlWithProtocol;
    }
}

export async function searchYoutube(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    try {
        const pythonCmd = await getPythonCommand();
        const ytDlpBinary = path.join(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");
        const { stdout } = await execa(pythonCmd, [
            ytDlpBinary,
            `ytsearch10:${query}`,
            "--dump-json",
            "--no-playlist",
            "--no-check-certificate",
            "--no-warnings"
        ]);

        const results = stdout.split('\n').filter(l => !!l.trim()).map(l => JSON.parse(l));

        return results.map((e: any) => ({
            id: e.id,
            title: e.title,
            channel: e.uploader ?? e.channel ?? "Unknown",
            thumbnail: e.thumbnail ?? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
            duration: e.duration_string ?? "0:00",
            url: `https://www.youtube.com/watch?v=${e.id}`
        }));
    } catch (e) {
        console.error("Search failed:", e);
        return [];
    }
}

export async function fetchMeta(url: string): Promise<VideoMeta> {
    try {
        const pythonCmd = await getPythonCommand();
        const ytDlpBinary = path.join(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");
        const { stdout } = await execa(pythonCmd, [
            ytDlpBinary,
            url,
            "--dump-json",
            "--no-playlist",
            "--no-check-certificate",
            "--no-warnings"
        ]);

        const info = JSON.parse(stdout);
        return {
            id: info.id,
            title: info.title,
            uploader: info.uploader,
            channel: info.uploader,
            upload_date: info.upload_date,
            description: info.description,
            thumbnail: info.thumbnail ?? `https://i.ytimg.com/vi/${info.id}/mqdefault.jpg`,
            duration: info.duration
        };
    } catch (e) {
        console.error("Search failed:", e);
        return {
            id: "",
            title: "Error",
            uploader: "Error",
            channel: "Error",
            upload_date: "",
            description: "",
            thumbnail: "",
            duration: 0
        };
    }
}

export async function getStreamUrl(url: string): Promise<string> {
    try {
        const pythonCmd = await getPythonCommand();
        const ytDlpBinary = path.join(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");
        const { stdout } = await execa(pythonCmd, [
            ytDlpBinary,
            "--get-url",
            "-f", "bestaudio",
            url,
            "--no-check-certificate",
            "--no-warnings"
        ]);

        return stdout.trim();
    } catch (e) {
        console.error("Failed to get stream URL:", e);
        throw e;
    }
}

async function downloadBestAudio(url: string, outDir: string): Promise<string> {
    await fs.mkdir(outDir, { recursive: true });

    // Manual execution
    // Output template: outDir/%(id)s.%(ext)s - Usar template compatible
    const outputTemplate = path.join(outDir, "%(title)s.%(ext)s");

    const pythonCmd = await getPythonCommand();
    const ytDlpBinary = path.join(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");
    await execa(pythonCmd, [
        ytDlpBinary,
        url,
        '--extract-audio',
        '--audio-format', 'mp3',
        '-f', 'bestaudio/best',
        '-o', outputTemplate,
        '--no-check-certificate',
        '--no-warnings',
        '--embed-thumbnail',
        '--add-metadata'
    ]);

    // yt-dlp imprime paths en stdout; para fiabilidad, listamos el fichero más reciente
    const files = await fs.readdir(outDir);
    const stats = await Promise.all(
        files.map(async f => {
            try {
                const s = await fs.stat(path.join(outDir, f));
                return { f, t: s.mtime.getTime() };
            } catch { return undefined; }
        })
    );
    const validStats = stats.filter(s => s !== undefined) as { f: string, t: number }[];
    if (validStats.length === 0) throw new Error("No file downloaded");

    // Filtramos para evitar seleccionar ficheros antiguos si la descarga falló
    // Pero asumiendo flujo limpio, el más nuevo es el correcto.
    const latest = validStats.sort((a, b) => b.t - a.t)[0].f;
    return path.join(outDir, latest);
}

async function downloadCover(url?: string, outDir?: string): Promise<string | undefined> {
    if (!url) return;
    try {
        const r = await axios.get(url, { responseType: "arraybuffer" });
        const coverPath = path.join(outDir ?? process.cwd(), `cover_${Date.now()}.jpg`);
        await fs.writeFile(coverPath, Buffer.from(r.data));
        return coverPath;
    } catch (e) {
        return undefined;
    }
}

// Helper function to create safe filename
function toSafeFilename(s: string): string {
    const invalidChars = /[<>"\/\\|?*\x00-\x1F]/g;
    const controlChars = /[\x00-\x1F\x7F]/g;

    return s
        .replace(invalidChars, "_")
        .replace(controlChars, "")
        .slice(0, 180);
}

// Helper function to sanitize metadata for ffmpeg
function sanitizeMetadata(s: string): string {
    if (!s) return "";

    // Replace problematic characters that cause issues with ffmpeg metadata
    const problematicChars = /[=:\\]/g;
    const controlChars = /[\x00-\x1F\x7F]/g;

    return s
        .replace(problematicChars, " ")
        .replace(controlChars, "")
        .trim();
}

async function convertWithFfmpeg(
    src: string,
    dest: string,
    meta: VideoMeta,
    coverPath?: string,
    fmt: TargetFormat = "mp3",
    bitrate: Bitrate = "192k",
    sampleRate: SampleRate = "44100",
    normalize: boolean = false
): Promise<string> {
    await new Promise<void>((resolve, reject) => {
        let codec = "libmp3lame";
        let isLossless = false;

        // Determine codec based on format
        if (fmt === "m4a") codec = "aac";
        else if (fmt === "ogg") codec = "libvorbis";
        else if (fmt === "wav") {
            codec = "pcm_s16le";
            isLossless = true;
        }
        else if (fmt === "flac") {
            codec = "flac";
            isLossless = true;
        }
        else if (fmt === "aiff") {
            codec = "pcm_s16be";
            isLossless = true;
        }

        // Sanitize all metadata fields
        const safeTitle = sanitizeMetadata(meta.title ?? "");
        const safeArtist = sanitizeMetadata(meta.uploader ?? meta.channel ?? "");
        const safeAlbum = sanitizeMetadata(meta.channel ?? meta.uploader ?? "");
        const safeComment = sanitizeMetadata(meta.description?.substring(0, 512) ?? "");
        const safeDate = meta.upload_date ? meta.upload_date.slice(0, 4) : "";

        const cmd = ff(src)
            .audioCodec(codec)
            .audioFrequency(parseInt(sampleRate))
            .addOutputOption("-vn");

        if (normalize) {
            cmd.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
        }

        // Only add bitrate for compressed formats
        if (!isLossless) {
            cmd.audioBitrate(bitrate);
        }

        // Add metadata individually to avoid escaping issues
        if (safeTitle) {
            cmd.addOutputOption("-metadata", `title=${safeTitle}`);
        }
        if (safeArtist) {
            cmd.addOutputOption("-metadata", `artist=${safeArtist}`);
        }
        if (safeAlbum) {
            cmd.addOutputOption("-metadata", `album=${safeAlbum}`);
        }
        if (safeDate) {
            cmd.addOutputOption("-metadata", `date=${safeDate}`);
        }
        if (safeComment) {
            cmd.addOutputOption("-metadata", `comment=${safeComment}`);
        }

        cmd.on("error", (err) => reject(err))
            .on("end", () => resolve());

        if (coverPath) {
            if (fmt === "mp3") {
                cmd.input(coverPath)
                    .addOutputOption("-map", "0:a")
                    .addOutputOption("-map", "1:v")
                    .addOutputOption("-id3v2_version", "3");
            } else if (fmt === "m4a") {
                cmd.input(coverPath)
                    .addOutputOption("-map", "0:a")
                    .addOutputOption("-map", "1:v")
                    .addOutputOption("-disposition:v:0", "attached_pic")
                    .addOutputOption("-metadata:s:v", "title=Album cover")
                    .addOutputOption("-metadata:s:v", "comment=Cover (front)");
            } else if (fmt === "flac") {
                cmd.input(coverPath)
                    .addOutputOption("-map", "0:a")
                    .addOutputOption("-map", "1:v")
                    .addOutputOption("-disposition:v:0", "attached_pic")
                    .addOutputOption("-metadata:s:v", "title=Album cover")
                    .addOutputOption("-metadata:s:v", "comment=Cover (front)");
            }
            // WAV and AIFF don't support embedded cover art natively
        }
        cmd.save(dest);
    });

    // Add ID3 tags to MP3 (more compatible)
    if (dest.endsWith(".mp3")) {
        const tags: NodeID3.Tags = {
            title: meta.title,
            artist: meta.uploader ?? meta.channel,
            album: meta.channel ?? meta.uploader,
            year: meta.upload_date ? meta.upload_date.slice(0, 4) : undefined,
            comment: { language: "eng", text: meta.description?.substring(0, 512) ?? "" }
        };
        if (coverPath) {
            tags.image = coverPath;
        }
        NodeID3.update(tags, dest);
    }

    if (coverPath) {
        fs.unlink(coverPath).catch(() => { });
    }
    fs.unlink(src).catch(() => { });

    return dest;
}

export async function processJob(job: DownloadJob): Promise<{
    path: string,
    id: string,
    title: string,
    thumbnail?: string,
    channel?: string,
    bpm?: number,
    key?: string,


    source?: string,
    description?: string,
    duration?: string
}> {
    const url = normalizeUrl(job.url);
    const meta = await fetchMeta(url);
    const rawPath = await downloadBestAudio(url, job.outDir);
    const cover = await downloadCover(meta.thumbnail, job.outDir);

    const baseName = toSafeFilename(`${meta.title} - ${meta.uploader ?? meta.channel ?? meta.id}`);
    const dest = `${path.join(job.outDir, baseName)}.${job.format}`;

    await convertWithFfmpeg(rawPath, dest, meta, cover, job.format, job.bitrate, job.sampleRate, job.normalize);

    // Analyze BPM, Key and Duration after conversion
    const bpm = await analyzeBPM(dest);
    const key = await analyzeKey(dest);
    const duration = await getDuration(dest);

    return {
        id: meta.id,
        title: meta.title,
        thumbnail: meta.thumbnail,
        channel: meta.uploader || meta.channel,
        path: dest,
        bpm,
        key,
        source: meta.uploader || meta.channel || "YouTube",
        description: meta.description,
        duration: duration || meta.duration?.toString()
    };

}

export async function trimAudio(
    src: string,
    start: number,
    end: number
): Promise<string> {
    const ext = path.extname(src);
    const dir = path.dirname(src);
    const base = path.basename(src, ext);
    const dest = path.join(dir, `${base}_chop_${Date.now()}${ext}`);

    await new Promise<void>((resolve, reject) => {
        ff(src)
            .setStartTime(start)
            .setDuration(end - start)
            .on("error", (err: any) => reject(err))
            .on("end", () => resolve())
            .save(dest);
    });

    return dest;
}