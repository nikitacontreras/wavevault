import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/Sidebar";
import { SearchView } from "./components/SearchView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { TitleBar } from "./components/TitleBar";
import { useSettings, useHistory, useDebugMode, useLogs, useItemStates } from "./hooks/useAppState";
import { SearchResult, HistoryItem } from "./types";
import { Play, Pause, Volume2, X, Music2, Loader2 } from "lucide-react";
import "./App.css";

declare global {
    interface Window {
        api: {
            download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string) => Promise<{
                path: string,
                bpm?: number,
                key?: string,
                source?: string,
                description?: string,
                duration?: string
            }>;
            search: (query: string) => Promise<SearchResult[]>;
            getMeta: (url: string) => Promise<SearchResult>;
            getStreamUrl: (url: string) => Promise<string>;
            onStatus: (callback: (payload: { ok: boolean, message: string }) => void) => void;
            openItem: (path: string) => void;
            pickDir: () => Promise<string | null>;
            pickFile: () => Promise<string | null>;
            updateConfig: (config: any) => Promise<boolean>;
            checkDependencies: (manualPaths?: { python?: string, ffmpeg?: string, ffprobe?: string }) => Promise<{ python: boolean, ffmpeg: boolean, ffprobe: boolean }>;
        }
    }
}



import { DependencyChecker } from "./components/DependencyChecker";

export const App: React.FC = () => {
    const [view, setView] = useState("search");
    const [dependencies, setDependencies] = useState<{ python: boolean, ffmpeg: boolean, ffprobe: boolean } | null>(null);
    const [query, setQuery] = useState("");

    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const [activeTrack, setActiveTrack] = useState<{ title: string, artist: string, thumbnail?: string } | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const {
        format, setFormat,
        bitrate, setBitrate,
        sampleRate, setSampleRate,
        normalize, setNormalize,
        outDir, setOutDir,
        pythonPath, setPythonPath,
        ffmpegPath, setFfmpegPath,
        ffprobePath, setFfprobePath,
        volume, setVolume
    } = useSettings();


    const { history, clearHistory, addToHistory, updateHistoryItem } = useHistory();
    const { debugMode, setDebugMode } = useDebugMode();
    const { logs, addLog, clearLogs } = useLogs();
    const { itemStates, updateItemState, resetItemStates } = useItemStates();

    const handleTogglePreview = async (url: string) => {
        const trackInfo = history.find(h => h.path === url) || results.find(r => r.url === url);

        if (playingUrl === url) {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }
        } else {
            try {
                let finalUrl = url;
                if (url.startsWith('/') || url.includes(':\\')) {
                    finalUrl = `file://${url}`;
                } else {
                    addLog("Obteniendo stream para preview...");
                    finalUrl = await window.api.getStreamUrl(url);
                }

                setPlayingUrl(url);
                setStreamUrl(finalUrl);
                setIsPlaying(true);
                if (trackInfo) {
                    setActiveTrack({
                        title: trackInfo.title,
                        artist: (trackInfo as any).channel || (trackInfo as any).uploader || "Unknown",
                        thumbnail: trackInfo.thumbnail
                    });
                }
            } catch (e: any) {
                addLog("Error al obtener preview: " + e.message);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (audioRef.current && playingUrl) {
                    if (isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                    } else {
                        audioRef.current.play().catch(() => { });
                        setIsPlaying(true);
                    }
                }
            }
            if (e.code === 'Escape') {
                if (playingUrl) {
                    audioRef.current?.pause();
                    setPlayingUrl(null);
                    setStreamUrl(null);
                    setIsPlaying(false);
                    setActiveTrack(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playingUrl, isSearching, isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume, playingUrl]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]);
        resetItemStates();
        try {
            if (query.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//)) {
                addLog("URL detectada. Obteniendo metadatos...");
                try {
                    const meta: any = await window.api.getMeta(query);
                    setResults([{
                        id: meta.id,
                        title: meta.title,
                        channel: meta.uploader ?? meta.channel ?? "Desconocido",
                        thumbnail: meta.thumbnail ?? "",
                        duration: meta.duration ? (typeof meta.duration === 'number' ? new Date(meta.duration * 1000).toISOString().substr(14, 5) : meta.duration) : "Video",
                        url: query
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
    };

    const handleDownload = async (item: SearchResult) => {
        const id = item.id;
        const currentState = itemStates[id];
        if (currentState?.status === 'loading') return;
        updateItemState(id, { status: 'loading', msg: 'Iniciando...' });
        addLog(`⏳ Iniciando descarga: ${item.title}...`);
        try {
            const { path: dest, bpm, key, source, description, duration } = await window.api.download(item.url, format, bitrate, sampleRate, normalize, outDir);
            updateItemState(id, { status: 'success', path: dest, msg: 'Completado' });
            addLog(`✅ Descarga completada: ${item.title}`);
            const newItem: HistoryItem = {
                id: item.id,
                title: item.title,
                channel: item.channel,
                thumbnail: item.thumbnail,
                path: dest,
                date: new Date().toISOString(),
                format: format,
                sampleRate: sampleRate,
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
    };

    const handleOpenItem = (path: string) => {
        window.api.openItem(path);
    };

    const handlePickDir = async () => {
        const path = await window.api.pickDir();
        if (path) setOutDir(path);
    };

    useEffect(() => {
        window.api.checkDependencies({
            python: pythonPath || undefined,
            ffmpeg: ffmpegPath || undefined,
            ffprobe: ffprobePath || undefined
        }).then(setDependencies);
    }, [pythonPath, ffmpegPath, ffprobePath]);


    if (!dependencies) {
        return (
            <div className="h-screen w-screen bg-wv-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-wv-gray" size={32} />
            </div>
        );
    }

    const hasAllDeps = dependencies.python && dependencies.ffmpeg && dependencies.ffprobe;

    return (
        <div id="app-root" className="flex flex-col h-screen w-screen bg-wv-bg text-white overflow-hidden font-sans">
            <TitleBar />

            {!hasAllDeps && (
                <DependencyChecker
                    dependencies={dependencies}
                    onRetry={() => window.api.checkDependencies({
                        python: pythonPath || undefined,
                        ffmpeg: ffmpegPath || undefined,
                        ffprobe: ffprobePath || undefined
                    }).then(setDependencies)}
                    pythonPath={pythonPath}
                    setPythonPath={setPythonPath}
                    ffmpegPath={ffmpegPath}
                    setFfmpegPath={setFfmpegPath}
                    ffprobePath={ffprobePath}
                    setFfprobePath={setFfprobePath}
                />
            )}


            <div className="flex-1 flex overflow-hidden">

                <Sidebar currentView={view} onViewChange={setView} />

                <main className="flex-1 flex flex-col min-w-0">
                    <header className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md z-20">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold tracking-tight">
                                {view === 'search' && "Buscador de Sonidos"}
                                {view === 'library' && "Librería Local"}
                                {view === 'settings' && "Configuración"}
                            </h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">Registros</span>
                                <span className="text-xs font-bold tabular-nums">{history.length}</span>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 flex flex-col min-h-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_35%)]">
                        {view === 'search' && (
                            <SearchView
                                query={query}
                                setQuery={setQuery}
                                isSearching={isSearching}
                                results={results}
                                itemStates={itemStates}
                                history={history}
                                onSearch={handleSearch}
                                onDownload={handleDownload}
                                onOpenItem={handleOpenItem}
                                onTogglePreview={handleTogglePreview}
                                playingUrl={playingUrl}
                            />
                        )}
                        {view === 'library' && (
                            <HistoryView
                                history={history}
                                onClearHistory={clearHistory}
                                onOpenItem={handleOpenItem}
                                onTogglePreview={handleTogglePreview}
                                onUpdateItem={updateHistoryItem}
                                playingUrl={playingUrl}
                            />
                        )}
                        {view === 'settings' && (
                            <SettingsView
                                format={format} setFormat={setFormat}
                                bitrate={bitrate} setBitrate={setBitrate}
                                sampleRate={sampleRate} setSampleRate={setSampleRate}
                                normalize={normalize} setNormalize={setNormalize}
                                outDir={outDir} onPickDir={handlePickDir}
                                logs={logs}
                                onClearLogs={clearLogs}
                                debugMode={debugMode}
                                pythonPath={pythonPath} setPythonPath={setPythonPath}
                                ffmpegPath={ffmpegPath} setFfmpegPath={setFfmpegPath}
                                ffprobePath={ffprobePath} setFfprobePath={setFfprobePath}

                            />
                        )}
                    </div>

                    <footer className="h-20 bg-wv-sidebar border-t border-white/5 flex items-center px-8 gap-10 z-[100]">
                        <div className="w-1/3 flex items-center gap-4">
                            {activeTrack ? (
                                <>
                                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                        <img src={activeTrack.thumbnail} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">{activeTrack.title}</span>
                                        <span className="text-[10px] text-wv-gray font-medium truncate uppercase tracking-wider">{activeTrack.artist}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 opacity-30">
                                    <div className="h-10 w-10 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
                                        <Music2 size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Selecciona un archivo</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex justify-center">
                            <button
                                className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20"
                                onClick={() => playingUrl && handleTogglePreview(playingUrl)}
                                disabled={!playingUrl}
                            >
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
                            </button>
                        </div>

                        <div className="w-1/3 flex items-center justify-end gap-3">
                            <Volume2 size={16} className="text-wv-gray" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="volume-slider w-24"
                            />
                            {playingUrl && (
                                <button
                                    className="p-1.5 hover:bg-white/5 rounded-md text-wv-gray hover:text-white transition-colors"
                                    onClick={() => { setPlayingUrl(null); setStreamUrl(null); setIsPlaying(false); setActiveTrack(null); }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {streamUrl && (
                            <audio
                                ref={audioRef}
                                src={streamUrl}
                                autoPlay
                                onEnded={() => { setPlayingUrl(null); setStreamUrl(null); setIsPlaying(false); setActiveTrack(null); }}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                style={{ display: 'none' }}
                            />
                        )}
                    </footer>
                </main>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}