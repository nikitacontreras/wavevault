import { useState, useCallback } from "react";
import { SearchResult } from "../types";
import { useApp } from "../context/AppContext";
import { useLibrary } from "../context/LibraryContext";

export const useSearchManager = () => {
    const { addLog } = useApp();
    const { resetItemStates } = useLibrary();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]);
        resetItemStates();
        try {
            if (query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.*[?&]list=([^#&?]+)/)) {
                setPlaylistUrl(query);
                setIsSearching(false);
                return;
            }

            if (query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|soundcloud\.com)\//)) {
                addLog("URL detectada. Obteniendo metadatos...");
                try {
                    const meta: any = await window.api.getMeta(query);
                    setResults([{
                        id: meta.id,
                        title: meta.title,
                        channel: meta.uploader ?? meta.channel ?? "Desconocido",
                        thumbnail: meta.thumbnail ?? "",
                        duration: meta.duration ? (typeof meta.duration === 'number' ? new Date(meta.duration * 1000).toISOString().substr(14, 5) : meta.duration) : "Video",
                        url: query,
                        streamUrl: (meta as any).streamUrl
                    }]);
                } catch (err: any) {
                    addLog("Error al obtener metadatos: " + err.message);
                }
            } else {
                addLog(`Buscando: ${query}...`);
                const res = await window.api.search(query);
                setResults(res);
            }
        } catch (e: any) {
            addLog("Error en búsqueda: " + e.message);
        } finally {
            setIsSearching(false);
        }
    }, [query, addLog, resetItemStates]);

    const handleLoadMore = useCallback(async () => {
        if (isSearching || !query.trim() || results.length === 0) return;
        setIsSearching(true);
        try {
            const more = await window.api.search(query, results.length, 12);
            const existingIds = new Set(results.map(r => r.id));
            const uniqueMore = more.filter((r: any) => !existingIds.has(r.id));
            setResults(prev => [...prev, ...uniqueMore]);
        } catch (e: any) {
            addLog("Error al cargar más: " + e.message);
        } finally {
            setIsSearching(false);
        }
    }, [isSearching, query, results, addLog]);

    return {
        query, setQuery, results, setResults, isSearching,
        playlistUrl, setPlaylistUrl, handleSearch, handleLoadMore
    };
};
