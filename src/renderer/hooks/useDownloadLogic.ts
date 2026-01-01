import { useState } from 'react';
import { SearchResult } from '../types';

interface DownloadOptions {
    format: string;
    bitrate: string;
    sampleRate: string;
    normalize: boolean;
    outDir?: string;
    smartOrganize: boolean;
}

export const useDownloadLogic = () => {
    const [isDownloading, setIsDownloading] = useState(false);

    const startDownload = async (
        url: string,
        options: DownloadOptions,
        callbacks?: {
            onStart?: () => void;
            onSuccess?: (result: any) => void;
            onError?: (error: any) => void;
        }
    ) => {
        if (isDownloading) return;
        setIsDownloading(true);
        callbacks?.onStart?.();

        try {
            const result = await window.api.download(
                url,
                options.format,
                options.bitrate,
                options.sampleRate,
                options.normalize,
                options.outDir,
                options.smartOrganize
            );
            callbacks?.onSuccess?.(result);
            return result;
        } catch (error) {
            console.error("Download failed:", error);
            callbacks?.onError?.(error);
            throw error;
        } finally {
            setIsDownloading(false);
        }
    };

    return { startDownload, isDownloading };
};
