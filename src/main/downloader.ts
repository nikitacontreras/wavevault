import execa from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import * as mm from "music-metadata";
import NodeID3 from "node-id3";
import ff from "./ffmpeg";
import { DownloadJob, VideoMeta, TargetFormat, Bitrate, SearchResult } from "./types";
import ytDlp from "yt-dlp-exec";
import { analyzeBPM, analyzeKey, getDuration } from "./audio-analysis";
import { getPythonPath, getFFmpegPath } from "./config";


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

        return u.toString();
    } catch (e) {
        throw new Error("URL no válida de YouTube");
    }
}


// Dynamic Python Detection
let CACHED_PYTHON: string | null = null;
async function getPythonCommand(): Promise<string> {
    const manual = getPythonPath();
    if (manual && manual !== "python3") return manual;

    if (CACHED_PYTHON) return CACHED_PYTHON;
    try {
        await execa("python3", ["--version"]);
        CACHED_PYTHON = "python3";
    } catch {
        try {
            await execa("python", ["--version"]);
            CACHED_PYTHON = "python";
        } catch {
            throw new Error("Python no encontrado en el sistema.");
        }
    }
    return CACHED_PYTHON;
}


export async function fetchMeta(url: string): Promise<VideoMeta> {
    const pythonCmd = await getPythonCommand();

    // Determine path based on environment similar to searchYoutube
    const isProd = __dirname.includes('dist');
    const ytDlpPath = isProd
        ? path.resolve(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp")
        : path.resolve(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");

    try {
        const { stdout } = await execa(pythonCmd, [ytDlpPath, url, '--dump-single-json']);
        const out = JSON.parse(stdout);

        return {
            id: out.id,
            title: out.title,
            uploader: out.uploader,
            uploader_id: out.uploader_id,
            channel: out.channel,
            description: out.description,
            upload_date: out.upload_date,
            release_year: out.release_year,
            thumbnail: out.thumbnail,
            duration: out.duration // Add duration if available for UI
        };
    } catch (e: any) {
        throw new Error("Failed to fetch metadata: " + e.message);
    }
}

// Helper to identify production path
const isProd = __dirname.includes('dist');
const ytDlpPath = isProd
    ? path.resolve(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp") // In prod might need adjustment based on how node_modules are packed, usually ASAR problem.
    // BUT for local "npm run electron" which runs from src/main, we need:
    : path.resolve(__dirname, "../../node_modules/yt-dlp-exec/bin/yt-dlp");

// Note: In a real packaged app (electron-builder), node_modules aren't always available like this. 
// We would usually explicitly unpack the binary. For now, since user runs locally, this works.

export async function getStreamUrl(url: string): Promise<string> {
    try {
        const pythonCmd = await getPythonCommand();
        const normalized = normalizeUrl(url);
        const { stdout } = await execa(pythonCmd, [
            ytDlpPath,

            normalized,
            '-f', 'bestaudio',
            '--get-url',
            '--no-check-certificate',
            '--no-warnings'
        ]);
        return stdout.trim();
    } catch (e) {
        console.error("Failed to get stream URL:", e);
        throw e;
    }
}

export async function searchYoutube(query: string): Promise<SearchResult[]> {
    try {
        const pythonCmd = await getPythonCommand();
        const { stdout } = await execa(pythonCmd, [ytDlpPath, `ytsearch10:${query}`, '--dump-single-json', '--default-search', 'ytsearch', '--flat-playlist']);
        const out = JSON.parse(stdout);


        if (!out.entries) return [];

        return out.entries.map((e: any) => ({
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

async function downloadBestAudio(url: string, outDir: string): Promise<string> {
    await fs.mkdir(outDir, { recursive: true });

    // Manual execution
    // Output template: outDir/%(id)s.%(ext)s
    const outputTemplate = path.join(outDir, "%(id)s.%(ext)s");

    const pythonCmd = await getPythonCommand();
    await execa(pythonCmd, [
        ytDlpPath,

        url,
        '--extract-audio', // actually we want original container first then convert, but bestaudio is usually enough
        '-f', 'bestaudio/best',
        '-o', outputTemplate,
        '--no-check-certificate',
        '--no-warnings'
        // '--prefer-free-formats'
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

function toSafeFilename(s: string): string {
    return s.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 180);
}

// Sanitize metadata for ffmpeg to avoid "Invalid argument" errors
function sanitizeMetadata(s: string): string {
    if (!s) return "";
    // Escape special characters that cause issues with ffmpeg metadata
    // Replace problematic characters: = : \ and control characters
    return s.replace(/[=:\\]/g, " ")
        .replace(/[\u0000-\u001F\u007F]/g, "")
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

    // Afinar etiquetas ID3 en MP3 (más compatibles)
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