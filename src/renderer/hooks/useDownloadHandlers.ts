import { useEffect, useCallback } from "react";
import { SearchResult, HistoryItem, ItemState } from "../types";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useLibrary } from "../context/LibraryContext";

export const useDownloadHandlers = () => {
    const { addLog } = useApp();
    const { config } = useSettings();
    const {
        addToHistory, itemStates, updateItemState,
        addActiveDownload, updateActiveDownload
    } = useLibrary();

    const handleDownload = useCallback(async (item: SearchResult) => {
        const id = item.id;
        if (itemStates[id]?.status === 'loading') return;
        updateItemState(id, { status: 'loading', msg: 'Iniciando...' });
        addLog(`⏳ Iniciando descarga: ${item.title}...`);

        try {
            const { path: dest, bpm, key, source, description, duration } = await window.api.download(
                item.url, config.format, config.bitrate, config.sampleRate, config.normalize, config.outDir || undefined, config.smartOrganize
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
                format: config.format,
                sampleRate: config.sampleRate,
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
    }, [config, itemStates, updateItemState, addLog, addToHistory]);

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
                url, config.format, config.bitrate, config.sampleRate, config.normalize, config.outDir || undefined, config.smartOrganize
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
                format: config.format,
                sampleRate: config.sampleRate,
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
    }, [config, itemStates, updateItemState, addLog, addToHistory]);

    // IPC Download Listeners
    useEffect(() => {
        const unsubStarted = window.api.onDownloadStarted(({ url, title }: any) => {
            addActiveDownload(url, title, url);
            addLog(`⏳ Descarga iniciada externamente: ${title}`);
        });

        const unsubSuccess = window.api.onDownloadSuccess(({ url, result }: any) => {
            updateActiveDownload(url, { status: 'success', msg: 'Completado' });

            const newItem: HistoryItem = {
                id: result.id || Math.random().toString(36).substring(7),
                title: result.title || "Unknown",
                channel: result.channel || result.source || "Unknown",
                thumbnail: result.thumbnail || "",
                path: result.path,
                date: new Date().toISOString(),
                format: config.format,
                sampleRate: config.sampleRate,
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

        const unsubProgress = window.api.onDownloadProgress(({ url, message }: any) => {
            updateActiveDownload(url, { status: 'loading', msg: message });
            updateItemState(url, { status: 'loading', msg: message });
        });

        const unsubError = window.api.onDownloadError(({ url, error }: any) => {
            updateActiveDownload(url, { status: 'error', msg: error });
            addLog(`❌ Error en descarga: ${error}`);
        });

        return () => {
            unsubStarted(); unsubSuccess(); unsubProgress(); unsubError();
        };
    }, [config, addActiveDownload, updateActiveDownload, updateItemState, addLog, addToHistory]);

    return { handleDownload, handleBatchDownload, handleDownloadFromUrl };
};
