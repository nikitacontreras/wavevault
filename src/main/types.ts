export type TargetFormat = "mp3" | "m4a" | "ogg" | "wav" | "flac" | "aiff";
export type Bitrate = "128k" | "192k" | "256k" | "320k";
export type SampleRate = "44100" | "48000" | "96000";

export interface DownloadJob {
    url: string;
    outDir: string;
    format: TargetFormat;
    bitrate: Bitrate;
    sampleRate: SampleRate;
    normalize: boolean;
    shortcut?: boolean;
    signal?: AbortSignal;
    smartOrganize?: boolean;
    onProgress?: (msg: string) => void;
}

export interface VideoMeta {
    id: string;
    title: string;
    uploader?: string;
    uploader_id?: string;
    channel?: string;
    album?: string;
    track?: string;
    release_year?: number;
    description?: string;
    upload_date?: string; // YYYYMMDD
    thumbnail?: string;
    duration?: number;
}

export interface SearchResult {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    url: string;
    streamUrl?: string;
}