export type TargetFormat = "mp3" | "m4a" | "ogg" | "wav" | "flac" | "aiff";
export type Bitrate = "128k" | "192k" | "256k" | "320k";
export type SampleRate = "44100" | "48000" | "96000";

export interface KeybindConfig {
    id: string;
    name: string;
    description: string;
    accelerator: string;
    category: 'global' | 'app' | 'media';
    enabled: boolean;
}

export interface SearchResult {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    url: string;
    streamUrl?: string; // Cache direct stream URL
}

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ItemState {
    status: DownloadStatus;
    path?: string;
    msg?: string;
}

export interface HistoryItem {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    path: string;
    date: string;
    format: string;
    sampleRate?: string;
    bpm?: number;
    key?: string;
    source?: string;
    description?: string;
    tags: string[];
    category?: string;
    duration?: string;
}

