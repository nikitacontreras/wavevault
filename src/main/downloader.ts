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
// Helper function to get yt-dlp path correctly
function getYtDlpBinary() {
    const isWin = process.platform === 'win32';
    const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    let binPath = path.join(__dirname, "../../node_modules/yt-dlp-exec/bin", binName);

    // Fix for ASAR: If path is inside app.asar, point to app.asar.unpacked
    if (binPath.includes("app.asar")) {
        binPath = binPath.replace("app.asar", "app.asar.unpacked");
    }

    return binPath;
}

// Global helper for running yt-dlp with the right environment/python
async function runYtDlp(args: string[], options: any = {}) {
    const isWin = process.platform === 'win32';
    const ytDlpBinary = getYtDlpBinary();
    const configPython = getPythonPath();

    // Enable verbose logging by default or via option
    const verbose = options.verbose ?? true;

    const run = async (bin: string, runArgs: string[]) => {
        const subprocess = execa(bin, runArgs, options);

        if (verbose) {
            subprocess.stdout?.pipe(process.stdout);
            subprocess.stderr?.pipe(process.stderr);
        }

        return await subprocess;
    };

    if (isWin) {
        return await run(ytDlpBinary, args);
    } else {
        try {
            return await run(configPython, [ytDlpBinary, ...args]);
        } catch (e: any) {
            if (e.stderr?.includes("unsupported version of Python") && configPython !== "python3") {
                console.warn(`[runYtDlp] Configured python ${configPython} failed with version error. Trying fallback "python3"`);
                return await run("python3", [ytDlpBinary, ...args]);
            }
            throw e;
        }
    }
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
        // Use a targeted --print with a JSON template to avoid fetching heavy metadata (subs, comments, etc)
        const { stdout } = await runYtDlp([
            `ytsearch10:${query}`,
            "--no-playlist",
            "--no-check-certificate",
            "--no-warnings",
            "--no-call-home",
            "--no-cache-dir",
            "-f", "bestaudio/best",
            "--print", "{\"id\":%(id)j,\"title\":%(title)j,\"channel\":%(uploader)j,\"thumbnail\":%(thumbnail)j,\"duration\":%(duration)j,\"url\":%(webpage_url)j,\"streamUrl\":%(url)j}"
        ], { verbose: false }); // Disable pipe for search to avoid terminal clutter

        return stdout.split('\n')
            .filter(l => !!l.trim())
            .map(l => {
                const e = JSON.parse(l);
                return {
                    id: e.id,
                    title: e.title,
                    channel: e.channel ?? "Unknown",
                    thumbnail: e.thumbnail ?? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
                    duration: (typeof e.duration === 'number')
                        ? new Date(e.duration * 1000).toISOString().substr(14, 5)
                        : (e.duration || "0:00"),
                    url: e.url,
                    streamUrl: e.streamUrl
                };
            });
    } catch (e: any) {
        console.error("Search failed:", e);
        throw new Error(e.stderr || e.stdout || e.message || "Unknown error during search");
    }
}

/**
 * Optimized batch search that gets metadata + stream URL in one single yt-dlp process
 * Pass an array of search queries like ["artist1 title1", "artist2 title2"]
 */
export async function batchSearchAndStream(queries: string[]): Promise<any[]> {
    if (!queries || queries.length === 0) return [];

    // Get 3 results per query to have options for filtering official/topic channels
    const searchArgs = queries.map(q => `ytsearch3:${q}`);

    try {
        const { stdout } = await runYtDlp([
            ...searchArgs,
            "--no-playlist",
            "--no-check-certificate",
            "--no-warnings",
            "--no-call-home",
            "-f", "bestaudio/best",
            "--print", "{\"id\":%(id)j,\"title\":%(title)j,\"thumbnail\":%(thumbnail)j,\"streamUrl\":%(url)j,\"youtubeUrl\":%(webpage_url)j,\"duration\":%(duration)j,\"uploader\":%(uploader)j}"
        ], { verbose: false });

        const allResults = stdout.split('\n')
            .filter(l => !!l.trim())
            .map(line => JSON.parse(line));

        // Group by 3s and pick the best (preferring Topic/Official)
        const finalResults = [];
        for (let i = 0; i < allResults.length; i += 3) {
            const chunk = allResults.slice(i, i + 3);
            if (chunk.length === 0) continue;

            // Priority: Channels ending in "- Topic" or containing "Official"
            const bestResult = chunk.find(r =>
                r.uploader?.toLowerCase().endsWith("- topic") ||
                r.uploader?.toLowerCase().includes("official")
            ) || chunk[0]; // Fallback to first search result

            finalResults.push(bestResult);
        }

        return finalResults;
    } catch (e) {
        console.error("[batchSearchAndStream] Failed:", e);
        return [];
    }
}

export async function fetchMeta(url: string): Promise<VideoMeta | any> {
    try {
        const { stdout } = await runYtDlp([
            url,
            "--no-playlist",
            "--no-check-certificate",
            "--no-warnings",
            "--no-call-home",
            "-f", "bestaudio/best",
            "--print", "{\"id\":%(id)j,\"title\":%(title)j,\"uploader\":%(uploader)j,\"upload_date\":%(upload_date)j,\"description\":%(description)j,\"thumbnail\":%(thumbnail)j,\"duration\":%(duration)j,\"streamUrl\":%(url)j}"
        ], { verbose: false });

        return JSON.parse(stdout);
    } catch (e: any) {
        console.error("Meta fetch failed:", e);
        throw new Error(e.stderr || e.stdout || e.message || "Unknown error fetching metadata");
    }
}

export async function fetchPlaylistMeta(url: string): Promise<{ title: string, entries: any[] }> {
    try {
        const { stdout } = await runYtDlp([
            url,
            "--dump-single-json",
            "--flat-playlist",
            "--no-check-certificate",
            "--no-warnings"
        ]);

        const info = JSON.parse(stdout);
        return {
            title: info.title || "Playlist",
            entries: (info.entries || []).map((e: any) => ({
                id: e.id,
                title: e.title,
                url: `https://www.youtube.com/watch?v=${e.id}`,
                duration: e.duration,
                uploader: e.uploader
            }))
        };
    } catch (e: any) {
        console.error("Playlist meta fetch failed:", e);
        throw new Error(e.stderr || e.stdout || e.message || "Unknown error fetching playlist metadata");
    }
}

export async function getStreamUrl(url: string): Promise<string> {
    try {
        const { stdout } = await runYtDlp([
            url,
            "-g",
            "-f", "bestaudio/best",
            "--no-check-certificate",
            "--no-warnings"
        ]);

        return stdout.trim();
    } catch (e) {
        console.error("Failed to get stream URL:", e);
        throw e;
    }
}

// Updated signatures to accept signal
async function downloadBestAudio(url: string, outDir: string, signal?: AbortSignal): Promise<string> {
    await fs.mkdir(outDir, { recursive: true });

    // Check abort before starting
    if (signal?.aborted) throw new Error("Aborted");

    // Use a unique temp filename to avoid collision with final output
    const outputTemplate = path.join(outDir, `temp_${Date.now()}_%(id)s.%(ext)s`);
    // Use --print filepath to get the exact final absolute path
    const { stdout } = await runYtDlp([
        url,
        '-f', 'bestaudio/best',
        '-o', outputTemplate,
        '--no-check-certificate',
        '--no-warnings',
        '--print', 'after_move:filepath' // Get exact final path after all moves
    ], { signal });

    const fullPath = stdout.trim().split('\n').pop()?.trim();
    if (!fullPath) throw new Error("Could not determine downloaded filename");

    // Verify file exists
    await fs.access(fullPath);

    return fullPath;
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
    normalize: boolean = false,
    signal?: AbortSignal
): Promise<string> {
    await new Promise<void>((resolve, reject) => {
        let codec = "libmp3lame";
        let isLossless = false;

        if (fmt === "m4a") codec = "aac";
        else if (fmt === "ogg") codec = "libvorbis";
        else if (fmt === "wav") { codec = "pcm_s16le"; isLossless = true; }
        else if (fmt === "flac") { codec = "flac"; isLossless = true; }
        else if (fmt === "aiff") { codec = "pcm_s16be"; isLossless = true; }

        const safeTitle = sanitizeMetadata(meta.title ?? "");
        const safeArtist = sanitizeMetadata(meta.uploader ?? meta.channel ?? "");
        const safeAlbum = sanitizeMetadata(meta.channel ?? meta.uploader ?? "");
        const safeComment = sanitizeMetadata(meta.description?.substring(0, 512) ?? "");
        const safeDate = meta.upload_date ? meta.upload_date.slice(0, 4) : "";

        const cmd = ff(src)
            .audioCodec(codec)
            .audioFrequency(parseInt(sampleRate))
            .addOutputOption("-vn");

        if (normalize) cmd.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
        if (!isLossless) cmd.audioBitrate(bitrate);

        if (safeTitle) cmd.addOutputOption("-metadata", `title=${safeTitle}`);
        if (safeArtist) cmd.addOutputOption("-metadata", `artist=${safeArtist}`);
        if (safeAlbum) cmd.addOutputOption("-metadata", `album=${safeAlbum}`);
        if (safeDate) cmd.addOutputOption("-metadata", `date=${safeDate}`);
        if (safeComment) cmd.addOutputOption("-metadata", `comment=${safeComment}`);

        // Handle Signal Abort
        if (signal) {
            signal.addEventListener('abort', () => {
                cmd.kill('SIGKILL');
                reject(new Error("Aborted"));
            });
        }

        cmd.on("error", (err) => {
            if (signal?.aborted) {
                reject(new Error("Aborted"));
            } else {
                reject(err);
            }
        })
            .on("end", () => resolve());

        if (coverPath) {
            if (fmt === "mp3") {
                cmd.input(coverPath).addOutputOption("-map", "0:a").addOutputOption("-map", "1:v").addOutputOption("-id3v2_version", "3");
            } else if (fmt === "m4a" || fmt === "flac") {
                cmd.input(coverPath).addOutputOption("-map", "0:a").addOutputOption("-map", "1:v").addOutputOption("-disposition:v:0", "attached_pic");
            }
        }
        cmd.save(dest);
    });

    // ID3 Logic ...
    if (dest.endsWith(".mp3") && !signal?.aborted) {
        const tags: NodeID3.Tags = {
            title: meta.title,
            artist: meta.uploader ?? meta.channel,
            album: meta.channel ?? meta.uploader,
            year: meta.upload_date ? meta.upload_date.slice(0, 4) : undefined,
            comment: { language: "eng", text: meta.description?.substring(0, 512) ?? "" }
        };
        if (coverPath) tags.image = coverPath;
        NodeID3.update(tags, dest);
    }

    // Cleanup
    if (coverPath) fs.unlink(coverPath).catch(() => { });
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

    if (job.signal?.aborted) throw new Error("Aborted");

    const rawPath = await downloadBestAudio(url, job.outDir, job.signal);

    if (job.signal?.aborted) throw new Error("Aborted");

    const cover = await downloadCover(meta.thumbnail, job.outDir);
    const baseName = toSafeFilename(`${meta.title} - ${meta.uploader ?? meta.channel ?? meta.id}`);
    const dest = `${path.join(job.outDir, baseName)}.${job.format}`;

    await convertWithFfmpeg(rawPath, dest, meta, cover, job.format, job.bitrate, job.sampleRate, job.normalize, job.signal);

    // Analysis
    if (job.signal?.aborted) throw new Error("Aborted");

    const bpm = await analyzeBPM(dest);
    const key = await analyzeKey(dest);
    const duration = await getDuration(dest);

    let finalPath = dest;

    // Smart Organization Logic
    if (job.smartOrganize && key) {
        // Camelot Notation safe folder name
        const keyFolder = key.replace("/", "_");
        const smartDir = path.join(path.dirname(dest), keyFolder);

        await fs.mkdir(smartDir, { recursive: true });

        const newDest = path.join(smartDir, path.basename(dest));
        await fs.rename(dest, newDest);
        finalPath = newDest;
    }

    return {
        id: meta.id,
        title: meta.title,
        thumbnail: meta.thumbnail,
        channel: meta.uploader || meta.channel,
        path: finalPath,
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