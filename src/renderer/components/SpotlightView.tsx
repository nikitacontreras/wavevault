import React, { useState, useEffect, useRef, useCallback } from "react";

import { Search, Loader2, Music, CheckCircle2, AlertCircle } from "lucide-react";
import { SearchResult } from "../types";

// Importamos el hook de descargas activas (crearemos una implementación simple aquí)
const useSpotlightDownloads = () => {
    const [downloads, setDownloads] = useState<any[]>([]);

    // Escuchar eventos de descarga desde el main process
    useEffect(() => {
        if (window.api) {
            window.api.onDownloadStarted(({ url, title }) => {
                setDownloads(prev => [
                    ...prev.filter(d => d.url !== url),
                    { id: url, title, url, state: { status: 'loading', msg: 'Iniciando...' } }
                ]);
            });

            window.api.onDownloadSuccess(({ url, result }) => {
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

    const clearDownloads = useCallback(() => {
        setDownloads([]);
    }, []);

    return { downloads, addDownload, clearDownloads };
};


export const SpotlightView: React.FC = () => {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: "" });
    const inputRef = useRef<HTMLInputElement>(null);
    const { downloads, addDownload, clearDownloads } = useSpotlightDownloads();

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

        if (downloads.length > 0) {
            // Header (24px) + items (approx 44px each)
            const downloadsHeight = 24 + (downloads.length * 44);
            height += Math.min(downloadsHeight, 160); // Cap at 160px for scrollable area
        }

        (window as any).api.resizeSpotlight(height);
    }, [status, downloads]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || isLoading) return;

        setIsLoading(true);
        setStatus({ type: 'idle', message: "Procesando URL..." });

        try {
            // Obtener configuración actual
            const format = localStorage.getItem('format') || 'mp3';
            const bitrate = localStorage.getItem('bitrate') || '192k';
            const sampleRate = localStorage.getItem('sampleRate') || '44100';
            const normalize = localStorage.getItem('normalize') === 'true';
            const outDir = localStorage.getItem('outDir') || undefined;

            // Iniciamos la descarga y dejamos que los eventos de broadcast manejen el feedback
            window.api.download(url, format, bitrate, sampleRate, normalize, outDir)
                .catch((err: any) => console.error("Spotlight download error:", err));

            setStatus({ type: 'success', message: "¡Enlace enviado a descargas!" });
            setUrl("");

            // Cerramos la ventana pronto para no estorbar
            setTimeout(() => {
                window.api.closeSpotlight();
                setStatus(null);
            }, 2000);

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || "Error al procesar la URL" });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="h-screen w-screen flex flex-col p-2 select-none overflow-hidden" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className="bg-wv-sidebar/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 ease-out" style={{ WebkitAppRegion: 'no-drag' } as any}>

                <form onSubmit={handleSubmit} className="flex items-center px-5 py-4 gap-4">
                    <div className="text-wv-gray/60">
                        {isLoading ? <Loader2 size={18} className="animate-spin text-white" /> : <Search size={18} />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-white placeholder-wv-gray/40"
                        placeholder="Busca o pega una URL..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />

                    <div className="text-[10px] font-bold text-wv-gray border border-white/10 px-2 py-1 rounded bg-black/20 uppercase tracking-widest leading-none">
                        Enter
                    </div>
                </form>

                {status.type !== 'idle' && (
                    <div className={`px-4 py-2 text-[11px] font-medium flex items-center gap-2 border-t border-white/5 animate-in slide-in-from-top-1 ${status.type === 'success' ? 'text-green-400 bg-green-500/5' : 'text-red-400 bg-red-500/5'
                        }`}>
                        {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {status.message}
                    </div>
                )}

                {downloads.length > 0 && (
                    <section className="border-t border-white/5 max-h-[160px] overflow-y-auto custom-scrollbar-hidden">
                        <div className="px-4 py-2 text-[8px] font-bold text-wv-gray uppercase tracking-[0.2em] bg-white/[0.02]">
                            En curso • {downloads.length}
                        </div>

                        {downloads.map((download) => (
                            <div key={download.id} className="px-4 py-2 flex items-center justify-between border-b border-white/[0.03]">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-medium text-white truncate mb-1">
                                        {download.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {download.state.status === 'loading' && (
                                            <>
                                                <Loader2 size={10} className="animate-spin text-wv-gray" />
                                                <span className="text-[9px] text-wv-gray">
                                                    {download.state.msg || "Descargando..."}
                                                </span>
                                            </>
                                        )}
                                        {download.state.status === 'success' && (
                                            <>
                                                <CheckCircle2 size={10} className="text-green-400" />
                                                <span className="text-[9px] text-green-400">
                                                    Completado
                                                </span>
                                            </>
                                        )}
                                        {download.state.status === 'error' && (
                                            <>
                                                <AlertCircle size={10} className="text-red-400" />
                                                <span className="text-[9px] text-red-400">
                                                    Error
                                                </span>
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
