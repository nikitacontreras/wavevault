import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/Sidebar";
import { SearchView } from "./components/SearchView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { ProjectsView } from "./components/ProjectsView";
import { TitleBar } from "./components/TitleBar";
import { useSettings, useHistory, useDebugMode, useLogs, useItemStates, useActiveDownloads } from "./hooks/useAppState";
import "./App.css";
import { SearchResult, HistoryItem } from "./types";
import { Play, Pause, Volume2, X, Music2, Loader2, Music, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SpotlightView } from "./components/SpotlightView";
import { ActiveDownloads } from "./components/ActiveDownloads";
import { CursorTrail } from "./components/CursorTrail";




declare global {
    interface Window {
        api: {
            download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string, smartOrganize?: boolean) => Promise<{
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
            }>;
            search: (query: string) => Promise<SearchResult[]>;
            getMeta: (url: string) => Promise<SearchResult>;
            getStreamUrl: (url: string) => Promise<string>;
            trimAudio: (src: string, start: number, end: number) => Promise<string>;

            onStatus: (callback: (payload: { ok: boolean, message: string }) => void) => void;
            onCommand: (callback: (command: string) => void) => void;
            onDownloadStarted: (callback: (payload: { url: string, title: string }) => void) => void;
            onDownloadSuccess: (callback: (payload: { url: string, result: any }) => void) => void;
            onDownloadError: (callback: (payload: { url: string, error: string }) => void) => void;
            cancelDownload: (url: string) => void;


            openItem: (path: string) => void;
            pickDir: () => Promise<string | null>;
            pickFile: () => Promise<string | null>;
            updateConfig: (config: any) => Promise<boolean>;
            getKeybinds: () => Promise<any[]>;
            resetKeybinds: () => Promise<any[]>;

            // Workspace Management
            getWorkspaces: () => Promise<any[]>;
            addWorkspace: (name: string, path: string) => Promise<any>;
            removeWorkspace: (id: string) => Promise<boolean>;
            scanProjects: () => Promise<any[]>;
            getProjectDB: () => Promise<any>;
            createAlbum: (name: string, artist: string) => Promise<any>;
            createTrack: (name: string, albumId: string) => Promise<any>;
            moveProjectVersion: (versionId: string, trackId: string) => Promise<boolean>;
            updateTrackMeta: (trackId: string, updates: any) => Promise<boolean>;
            deleteTrack: (trackId: string) => Promise<boolean>;
            updateAlbum: (albumId: string, updates: any) => Promise<boolean>;
            deleteAlbum: (albumId: string) => Promise<boolean>;
            deleteVersion: (versionId: string) => Promise<boolean>;

            checkDependencies: (manualPaths?: { python?: string, ffmpeg?: string, ffprobe?: string }) => Promise<{ python: boolean, ffmpeg: boolean, ffprobe: boolean }>;
            closeSpotlight: () => Promise<void>;
            resizeSpotlight: (height: number) => Promise<void>;
            checkForUpdates: () => Promise<any>;
            getAppVersion: () => Promise<string>;
            openExternal: (url: string) => Promise<void>;
            getPlatformInfo: () => Promise<string>;
            startDrag: (filepath: string, iconpath?: string) => void;
            minimizeWindow: () => void;
            toggleMaximizeWindow: () => void;
            closeWindow: () => void;
            platform: string;
        }
    }
}




import { DependencyChecker } from "./components/DependencyChecker";

export const App: React.FC = () => {
    const isSpotlight = window.location.hash === '#/spotlight';
    const [view, setView] = useState("search");

    const [dependencies, setDependencies] = useState<{ python: boolean, ffmpeg: boolean, ffprobe: boolean } | null>(null);
    const [query, setQuery] = useState("");

    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);

    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const [activeTrack, setActiveTrack] = useState<{ title: string, artist: string, thumbnail?: string } | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const settings = useSettings();
    const {
        format, setFormat,
        bitrate, setBitrate,
        sampleRate, setSampleRate,
        normalize, setNormalize,
        outDir, setOutDir,
        pythonPath, setPythonPath,
        ffmpegPath, setFfmpegPath,
        ffprobePath, setFfprobePath,
        keybinds, setKeybinds, updateKeybind,
        spotlightShortcut, setSpotlightShortcut,
        clipboardShortcut, setClipboardShortcut,
        volume, setVolume,
        sidebarCollapsed, setSidebarCollapsed,
        audioDeviceId, setAudioDeviceId,
        theme, setTheme,
        smartOrganize, setSmartOrganize
    } = settings;

    const isDark = theme === 'dark';



    const { resetKeybinds } = settings;





    const { history, clearHistory, addToHistory, updateHistoryItem, removeFromHistory } = useHistory();

    const { debugMode, setDebugMode } = useDebugMode();
    const { logs, addLog, clearLogs } = useLogs();
    const { itemStates, updateItemState, resetItemStates } = useItemStates();
    const { activeDownloads, addSpotlightDownload, updateSpotlightDownload, removeSpotlightDownload, clearSpotlightDownloads } = useActiveDownloads();
    const [version, setVersion] = useState("...");
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        window.api.getAppVersion().then(setVersion);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        const handleMouseUp = () => setIsDragging(false);
        const handleMouseEnter = (e: MouseEvent) => {
            if (e.buttons !== 1) setIsDragging(false);
        };
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mouseenter', handleMouseEnter);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, []);


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
                let finalUrl = "";
                if (url.startsWith('/') || url.includes(':\\')) {
                    finalUrl = `file://${url}`;
                } else {
                    addLog("Obteniendo stream para preview...");
                    setIsPreviewLoading(true);
                    finalUrl = await window.api.getStreamUrl(url);
                    setIsPreviewLoading(false);
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
                setIsPreviewLoading(false);
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
    }, [playingUrl, isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current && (audioRef.current as any).setSinkId) {
            (audioRef.current as any).setSinkId(audioDeviceId)
                .catch((err: any) => console.error("Error setting audio output device:", err));
        }
    }, [audioDeviceId]);


    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        setIsSearching(true);
        setResults([]);
        resetItemStates();
        try {
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
            const { path: dest, bpm, key, source, description, duration } = await window.api.download(item.url, format, bitrate, sampleRate, normalize, outDir, smartOrganize);
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

    const handleOpenItem = (path?: string) => {
        if (path) window.api.openItem(path);
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

    useEffect(() => {
        window.api.onStatus(({ ok, message }) => {
            addLog(message);
        });
    }, []);

    useEffect(() => {
        window.api.onCommand((command) => {
            if (command === 'playPause') {
                if (audioRef.current && audioRef.current.src) {
                    if (audioRef.current.paused) {
                        audioRef.current.play().catch(console.error);
                        setIsPlaying(true);
                    } else {
                        audioRef.current.pause();
                        setIsPlaying(false);
                    }
                }
            } else if (command === 'stop') {
                setPlayingUrl(null);
                setStreamUrl(null);
                setIsPlaying(false);
                setActiveTrack(null);
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = "";
                }
            }
        });
    }, []);

    useEffect(() => {
        window.api.onDownloadStarted(({ url, title }) => {
            addSpotlightDownload(url, title, url);
            addLog(`⏳ Descarga iniciada externamente: ${title}`);
        });

        window.api.onDownloadSuccess(({ url, result }) => {
            updateSpotlightDownload(url, { status: 'success', msg: 'Completado' });

            // Reconstruct history item
            const newItem: HistoryItem = {
                id: result.id || Math.random().toString(36).substring(7),
                title: result.title || "Unknown",
                channel: result.channel || result.source || "Unknown",
                thumbnail: result.thumbnail || "",
                path: result.path,
                date: new Date().toISOString(),
                format: format,
                sampleRate: sampleRate,
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

        window.api.onDownloadError(({ url, error }) => {
            updateSpotlightDownload(url, { status: 'error', msg: error });
            addLog(`❌ Error en descarga: ${error}`);
        });
    }, [format, sampleRate]);




    if (!dependencies) {
        return (
            <div className="h-screen w-screen bg-wv-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-wv-gray" size={32} />
            </div>
        );
    }

    const hasAllDeps = dependencies.python && dependencies.ffmpeg && dependencies.ffprobe;

    if (isSpotlight) {
        return <SpotlightView theme={theme} />;
    }

    return (

        <div id="app-root" className="flex flex-col h-screen w-screen transition-colors duration-300 overflow-hidden font-sans bg-wv-bg text-wv-text">
            <CursorTrail isDragging={isDragging} />
            <TitleBar theme={theme} version={version} />


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
                    theme={theme}
                />

            )}


            <div className="flex-1 flex overflow-hidden">

                <Sidebar
                    currentView={view}
                    onViewChange={setView}
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    theme={theme}
                    onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    version={version}
                />



                <main className="flex-1 flex flex-col min-w-0 transition-colors duration-300 bg-wv-bg">
                    <header className={`px-8 py-4 border-b flex justify-between items-center backdrop-blur-md z-20 transition-all ${isDark ? "bg-wv-bg/80 border-white/5" : "bg-white/80 border-black/5"}`}>


                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/5 text-wv-gray hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"}`}
                            >
                                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                            </button>

                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold tracking-tight">
                                    {view === 'search' && "Buscar"}
                                    {view === 'library' && "Librería"}
                                    {view === 'projects' && "Gestor de Proyectos"}
                                    {view === 'settings' && "Configuración"}
                                </h1>
                            </div>
                        </div>
                        {/* <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">Registros</span>
                                <span className="text-xs font-bold tabular-nums">{history.length}</span>
                            </div>
                        </div> */}
                    </header>

                    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_35%)]" : "bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_35%)]"}`}>


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
                                isPreviewLoading={isPreviewLoading}
                                theme={theme}
                                onStartDrag={() => setIsDragging(true)}
                            />

                        )}
                        {view === 'library' && (
                            <HistoryView
                                history={history}
                                onClearHistory={clearHistory}
                                onOpenItem={handleOpenItem}
                                onTogglePreview={handleTogglePreview}
                                onUpdateItem={updateHistoryItem}
                                onRemoveItem={removeFromHistory}

                                playingUrl={playingUrl}
                                isPreviewLoading={isPreviewLoading}
                                theme={theme}
                                onStartDrag={() => setIsDragging(true)}
                            />

                        )}
                        {view === 'projects' && (
                            <ProjectsView theme={theme} />
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
                                ffprobePath={ffprobePath}
                                setFfprobePath={setFfprobePath}
                                spotlightShortcut={spotlightShortcut}
                                setSpotlightShortcut={setSpotlightShortcut}
                                clipboardShortcut={clipboardShortcut}
                                setClipboardShortcut={setClipboardShortcut}
                                keybinds={keybinds}
                                updateKeybind={updateKeybind}
                                resetKeybinds={resetKeybinds}
                                audioDeviceId={audioDeviceId}
                                setAudioDeviceId={setAudioDeviceId}
                                theme={theme}
                                smartOrganize={smartOrganize}
                                setSmartOrganize={setSmartOrganize}
                            />

                        )}
                    </div>

                    <footer className={`h-20 border-t flex items-center px-8 gap-10 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/10"}`}>

                        <div className="w-1/3 flex items-center gap-4">
                            {activeTrack ? (
                                <>
                                    <div className={`h-12 w-12 rounded-lg overflow-hidden border shrink-0 ${isDark ? "border-white/10" : "border-black/5"}`}>
                                        <img src={activeTrack.thumbnail} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">{activeTrack.title}</span>
                                        <span className="text-[10px] text-wv-gray font-medium truncate uppercase tracking-wider">{activeTrack.artist}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 opacity-30">
                                    <div className={`h-10 w-10 rounded-lg border border-dashed flex items-center justify-center text-wv-gray ${isDark ? "border-white/10" : "border-black/10"}`}>
                                        <Music2 size={16} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-wv-gray">Selecciona un archivo</span>

                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex justify-center">
                            <button
                                type="button"
                                className={`h-10 w-10 rounded-full flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 ${isDark ? "bg-white text-black shadow-lg shadow-white/5" : "bg-black text-white shadow-lg shadow-black/10"}`}
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
                                    type="button"
                                    className={`p-1.5 rounded-md text-wv-gray transition-colors ${isDark ? "hover:bg-white/5 hover:text-white" : "hover:bg-black/5 hover:text-black"}`}
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
                            >
                                <track kind="captions" />
                            </audio>
                        )}
                    </footer>
                </main>
            </div>

            {/* Active Downloads Panel */}
            {activeDownloads.length > 0 && (
                <ActiveDownloads
                    activeDownloads={activeDownloads}
                    onClearDownload={removeSpotlightDownload}
                    theme={theme}
                />
            )}


        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}