import { useEffect, useCallback } from "react";
import { SearchResult, HistoryItem, ItemState } from "../types";

interface DownloadOptions {
    format: string;
    bitrate: string;
    sampleRate: string;
    normalize: boolean;
    outDir?: string;
    smartOrganize: boolean;
}

interface UseDownloadHandlersProps {
    options: DownloadOptions;
    itemStates: Record<string, ItemState>;
    updateItemState: (id: string, state: Partial<ItemState>) => void;
    addLog: (msg: string) => void;
    addToHistory: (item: HistoryItem) => void;
    addSpotlightDownload: (id: string, title: string, url: string) => void;
    updateSpotlightDownload: (id: string, state: Partial<ItemState>) => void;
}

export const useDownloadHandlers = ({
    options,
    itemStates,
    updateItemState,
    addLog,
    addToHistory,
    addSpotlightDownload,
    updateSpotlightDownload
}: UseDownloadHandlersProps) => {

    const handleDownload = useCallback(async (item: SearchResult) => {
        const id = item.id;
        const currentState = itemStates[id];
        if (currentState?.status === 'loading') return;
        updateItemState(id, { status: 'loading', msg: 'Iniciando...' });
        addLog(`⏳ Iniciando descarga: ${item.title}...`);
        try {
            const { path: dest, bpm, key, source, description, duration } = await window.api.download(
                item.url, options.format, options.bitrate, options.sampleRate, options.normalize, options.outDir, options.smartOrganize
            );
            updateItemState(id, { status: 'success', path: dest, msg: 'Completado' });
            addLog(`✅ Descarga completada: ${item.title}`);
            const newItem: HistoryItem = {
                id: item.id,
                title: item.title,
                channel: item.channel,
                thumbnail: item.thumbnail,
                path: dest,
                date: new Date().toISOString(),
                format: options.format,
                sampleRate: options.sampleRate,
                bpm: bpm,
                key: key,
                source: source,
                description: description,
                tags: [],
                duration: duration
            };
            addToHistory(newItem);
        } catch (e: any) {
            updateItemState(id, { status: 'error', msg: 'Error' });
            addLog("❌ Error: " + e.message);
        }
    }, [options, itemStates, updateItemState, addLog, addToHistory]);

    const handleBatchDownload = useCallback(async (entries: any[]) => {
        addLog(`📦 Iniciando descarga por lotes: ${entries.length} pistas`);
        for (const entry of entries) {
            handleDownload({
                id: entry.id,
                title: entry.title,
                url: entry.url,
                channel: entry.uploader || "Playlist",
                thumbnail: `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
                duration: entry.duration ? new Date(entry.duration * 1000).toISOString().substr(14, 5) : "Video"
            });
            await new Promise(r => setTimeout(r, 500));
        }
    }, [handleDownload, addLog]);

    const handleDownloadFromUrl = useCallback(async (url: string, title: string) => {
        const id = url;
        if (itemStates[id]?.status === 'loading') return;

        updateItemState(id, { status: 'loading', msg: 'Iniciando...' });
        addLog(`⏳ Iniciando descarga: ${title}...`);

        try {
            const { path: dest, bpm, key, source, description, duration, thumbnail } = await window.api.download(
                url, options.format, options.bitrate, options.sampleRate, options.normalize, options.outDir, options.smartOrganize
            );

            updateItemState(id, { status: 'success', path: dest, msg: 'Completado' });
            addLog(`✅ Descarga completada: ${title}`);

            const newItem: HistoryItem = {
                id: id,
                title: title,
                channel: "Discovery",
                thumbnail: thumbnail || "",
                path: dest,
                date: new Date().toISOString(),
                format: options.format,
                sampleRate: options.sampleRate,
                bpm: bpm,
                key: key,
                source: source || "YouTube",
                description: description,
                tags: [],
                duration: duration
            };
            addToHistory(newItem);
        } catch (e: any) {
            updateItemState(id, { status: 'error', msg: 'Error' });
            addLog("❌ Error en descarga: " + e.message);
        }
    }, [options, itemStates, updateItemState, addLog, addToHistory]);

    // IPC Download Listeners
    useEffect(() => {
        window.api.onDownloadStarted(({ url, title }) => {
            addSpotlightDownload(url, title, url);
            addLog(`⏳ Descarga iniciada externamente: ${title}`);
        });

        window.api.onDownloadSuccess(({ url, result }) => {
            updateSpotlightDownload(url, { status: 'success', msg: 'Completado' });

            const newItem: HistoryItem = {
                id: result.id || Math.random().toString(36).substring(7),
                title: result.title || "Unknown",
                channel: result.channel || result.source || "Unknown",
                thumbnail: result.thumbnail || "",
                path: result.path,
                date: new Date().toISOString(),
                format: options.format,
                sampleRate: options.sampleRate,
                bpm: result.bpm,
                key: result.key,
                source: result.source || "YouTube",
                description: result.description,
                tags: [],
                duration: result.duration
            };
            addToHistory(newItem);
            addLog(`✅ Descarga completada: ${newItem.title}`);
        });

        window.api.onDownloadProgress(({ url, message }) => {
            updateSpotlightDownload(url, { status: 'loading', msg: message });
            updateItemState(url, { status: 'loading', msg: message });
            // Note: Results deduction will happen in App.tsx by passing relevant data
        });

        window.api.onDownloadError(({ url, error }) => {
            updateSpotlightDownload(url, { status: 'error', msg: error });
            addLog(`❌ Error en descarga: ${error}`);
        });
    }, [options, addSpotlightDownload, updateSpotlightDownload, updateItemState, addLog, addToHistory]);

    return {
        handleDownload,
        handleBatchDownload,
        handleDownloadFromUrl
    };
};
