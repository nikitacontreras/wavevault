import React, { useState, useEffect, useRef, useCallback } from "react";

import { Search, Loader2, Music, CheckCircle2, AlertCircle, X } from "lucide-react";
import { SearchResult } from "../types";
import { useDownloadLogic } from "../hooks/useDownloadLogic";

// Importamos el hook de descargas activas (crearemos una implementación simple aquí)
const useSpotlightDownloads = () => {
    const [downloads, setDownloads] = useState<any[]>([]);

    // Escuchar eventos de descarga desde el main process
    useEffect(() => {
        if (window.api) {
            const unsubStarted = window.api.onDownloadStarted(({ url, title }) => {
                setDownloads(prev => [
                    ...prev.filter(d => d.url !== url),
                    { id: url, title, url, state: { status: 'loading', msg: 'Iniciando...' } }
                ]);
            });

            const unsubSuccess = window.api.onDownloadSuccess(({ url, result }) => {
                setDownloads(prev =>
                    prev.map(d =>
                        d.url === url
                            ? { ...d, state: { status: 'success', msg: 'Completado' } }
                            : d
                    )
                );

                // Remover descarga completada después de 3 segundos
                setTimeout(() => {
                    setDownloads(prev => prev.filter(d => d.url !== url));
                }, 3000);
            });

            const unsubError = window.api.onDownloadError(({ url, error }) => {
                setDownloads(prev =>
                    prev.map(d =>
                        d.url === url
                            ? { ...d, state: { status: 'error', msg: error } }
                            : d
                    )
                );
            });

            return () => {
                unsubStarted();
                unsubSuccess();
                unsubError();
            };
        }
    }, []);


    // Limpiar descargas cuando se cierra el spotlight
    useEffect(() => {
        const handleBeforeUnload = () => {
            setDownloads([]);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const addDownload = useCallback((id: string, title: string, url: string) => {
        setDownloads(prev => [
            ...prev.filter(d => d.id !== id),
            { id, title, url, state: { status: 'loading', msg: 'Iniciando...' } }
        ]);
    }, []);

    const cancelDownload = useCallback((url: string) => {
        window.api.cancelDownload(url);
        // Optimistically set to error/cancelled
        setDownloads(prev => prev.filter(d => d.url !== url));
    }, []);

    const clearDownloads = useCallback(() => {
        setDownloads([]);
    }, []);

    return { downloads, addDownload, cancelDownload, clearDownloads };
};


interface SpotlightViewProps {
    theme?: 'light' | 'dark';
}

import { useTranslation } from "react-i18next";

export const SpotlightView: React.FC<SpotlightViewProps> = ({ theme = 'dark' }) => {
    const isDark = theme === 'dark';
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: "" });
    const inputRef = useRef<HTMLInputElement>(null);
    const { downloads, addDownload, cancelDownload, clearDownloads } = useSpotlightDownloads();
    const { startDownload: performDownload } = useDownloadLogic();
    const { t } = useTranslation();

    const isYoutubeUrl = (input: string) => {
        const trimmed = input.trim();
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed) || /^[a-zA-Z0-9_-]{11}$/.test(trimmed);
    };

    useEffect(() => {
        inputRef.current?.focus();

        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                (window as any).api.closeSpotlight();
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, []);


    useEffect(() => {
        // Dynamic Height Calculation
        let height = 80; // Base height (form)

        if (status.type !== 'idle') height += 36; // Status message height

        if (isSearching) {
            height += 44; // Loading search height
        } else if (searchResults.length > 0) {
            const resultsHeight = 24 + (searchResults.length * 48);
            height += Math.min(resultsHeight, 260);
        }

        if (downloads.length > 0) {
            const downloadsHeight = 24 + (downloads.length * 44);
            height += Math.min(downloadsHeight, 160);
        }

        (window as any).api.resizeSpotlight(height);
    }, [status, downloads, isSearching, searchResults]);


    const startDownload = async (targetUrl: string, title?: string) => {
        setIsLoading(true);
        setStatus({ type: 'idle', message: t('spotlight.startDownload') });

        const options = {
            format: localStorage.getItem('format') || 'mp3',
            bitrate: localStorage.getItem('bitrate') || '192k',
            sampleRate: localStorage.getItem('sampleRate') || '44100',
            normalize: localStorage.getItem('normalize') === 'true',
            outDir: localStorage.getItem('outDir') || undefined,
            smartOrganize: localStorage.getItem('smartOrganize') === 'true'
        };

        try {
            await performDownload(targetUrl, options, {
                onSuccess: () => {
                    setStatus({ type: 'success', message: t('spotlight.successSent', { title: title || targetUrl }) });
                    setUrl("");
                    setSearchResults([]);
                    setTimeout(() => {
                        window.api.closeSpotlight();
                        setStatus({ type: 'idle', message: "" });
                    }, 3000);
                },
                onError: (err: any) => {
                    setStatus({ type: 'error', message: err.message || t('spotlight.errorProcess') });
                }
            });
        } catch (e) {
            // Handled in onError
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const input = url.trim();
        if (!input || isLoading || isSearching) return;

        if (isYoutubeUrl(input)) {
            await startDownload(input);
        } else {
            // It's a search query
            setIsSearching(true);
            setSearchResults([]);
            setStatus({ type: 'idle', message: "" });
            try {
                const results = await window.api.search(input);
                setSearchResults(results.slice(0, 5));
            } catch (error) {
                setStatus({ type: 'error', message: t('spotlight.errorSearch') });
            } finally {
                setIsSearching(false);
            }
        }
    };


    return (
        <div className="h-screen w-screen flex flex-col p-2 select-none overflow-hidden" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className={`
                backdrop-blur-xl border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out transition-colors
                ${isDark ? "bg-wv-bg/95 border-white/10" : "bg-white/95 border-black/10"}
            `} style={{ WebkitAppRegion: 'no-drag' } as any}>

                <form onSubmit={handleSubmit} className="flex items-center px-5 py-4 gap-4">
                    <div className={isDark ? "text-white/40" : "text-black/40"}>
                        {(isLoading || isSearching) ? <Loader2 size={18} className={`animate-spin ${isDark ? "text-white" : "text-black"}`} /> : <Search size={18} />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        className={`flex-1 bg-transparent border-none outline-none text-[15px] font-medium transition-colors ${isDark ? "text-white placeholder:text-white/20" : "text-black placeholder:text-black/20"}`}
                        placeholder={t('spotlight.placeholder')}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading || isSearching}
                    />

                    <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest leading-none border transition-colors ${isDark ? "text-white/40 border-white/5 bg-white/5" : "text-black/40 border-black/5 bg-black/5"}`}>
                        {t('spotlight.enter')}
                    </div>
                </form>


                {status.type !== 'idle' && (
                    <div className={`px-4 py-2 text-[11px] font-medium flex items-center gap-2 border-t animate-in slide-in-from-top-1 ${isDark ? "border-white/5" : "border-black/5"} ${status.type === 'success' ? 'text-green-500 bg-green-500/5' : 'text-red-500 bg-red-500/5'}`}>
                        {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {status.message}
                    </div>
                )}

                {isSearching && (
                    <div className={`px-10 py-4 flex items-center gap-3 border-t animate-pulse ${isDark ? "border-white/5" : "border-black/5"}`}>
                        <Loader2 size={14} className={`animate-spin ${isDark ? "text-white/40" : "text-black/40"}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? "text-white/40" : "text-black/40"}`}>{t('spotlight.searchingYoutube')}</span>
                    </div>
                )}

                {searchResults.length > 0 && !isSearching && (
                    <section className={`border-t max-h-[260px] overflow-y-auto custom-scrollbar-hidden ${isDark ? "border-white/5" : "border-black/5"}`}>
                        <div className={`px-4 py-2 text-[8px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-white/20 bg-white/[0.02]" : "text-black/40 bg-black/[0.02]"}`}>
                            {t('spotlight.resultsFound')}
                        </div>

                        {searchResults.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => startDownload(r.url, r.title)}
                                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors border-b last:border-none ${isDark ? "border-white/[0.03] hover:bg-white/5" : "border-black/[0.03] hover:bg-black/5"}`}
                            >
                                <div className={`w-10 h-10 rounded-lg overflow-hidden border bg-black/20 shrink-0 ${isDark ? "border-white/10" : "border-black/5"}`}>
                                    <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-xs font-bold truncate ${isDark ? "text-white" : "text-black"}`}>{r.title}</h4>
                                    <p className={`text-[10px] truncate ${isDark ? "text-white/40" : "text-black/40"}`}>{r.channel} • {r.duration}</p>
                                </div>
                            </button>
                        ))}
                    </section>
                )}

                {downloads.length > 0 && (
                    <section className={`border-t max-h-[160px] overflow-y-auto custom-scrollbar-hidden ${isDark ? "border-white/5" : "border-black/5"}`}>
                        <div className={`px-4 py-2 text-[8px] font-bold uppercase tracking-[0.2em] ${isDark ? "text-white/20 bg-white/[0.02]" : "text-black/40 bg-black/[0.02]"}`}>
                            {t('spotlight.downloadsInProgress')} • {downloads.length}
                        </div>

                        {downloads.map((download) => (
                            <div key={download.id} className={`px-4 py-2 flex items-center justify-between border-b last:border-none ${isDark ? "border-white/[0.03]" : "border-black/[0.03]"}`}>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-xs font-medium truncate mb-1 ${isDark ? "text-white/80" : "text-black/80"}`}>
                                        {download.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {download.state.status === 'loading' && (
                                            <>
                                                <Loader2 size={10} className={`animate-spin ${isDark ? "text-white/40" : "text-black/40"}`} />
                                                <span className={`text-[9px] ${isDark ? "text-white/40" : "text-black/40"}`}>
                                                    {download.state.msg || t('spotlight.downloading')}
                                                </span>
                                                <button
                                                    onClick={() => cancelDownload(download.url)}
                                                    className="ml-2 hover:text-red-500 transition-colors"
                                                    title={t('common.cancel')}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </>
                                        )}
                                        {download.state.status === 'success' && (
                                            <>
                                                <CheckCircle2 size={10} className="text-green-500" />
                                                <span className="text-[9px] text-green-500">{t('spotlight.completed')}</span>
                                            </>
                                        )}
                                        {download.state.status === 'error' && (
                                            <>
                                                <AlertCircle size={10} className="text-red-500" />
                                                <span className="text-[9px] text-red-500">{t('spotlight.error')}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </div>
    );
};

