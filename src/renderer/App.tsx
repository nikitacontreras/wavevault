import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/Sidebar";
import { SearchView } from "./components/SearchView";
import { LibraryView } from "./components/LibraryView";
import { DiscoveryView } from "./components/DiscoveryView";
import { PlaylistModal } from "./components/PlaylistModal";
import { ConverterView } from "./components/ConverterView";
import { SettingsView } from "./components/SettingsView";
import { ProjectsView } from "./components/ProjectsView";
import { TitleBar } from "./components/TitleBar";
import { useSettings, useHistory, useDebugMode, useLogs, useItemStates, useActiveDownloads } from "./hooks/useAppState";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useSearchManager } from "./hooks/useSearchManager";
import { useDownloadHandlers } from "./hooks/useDownloadHandlers";
import { useDependenciesManager } from "./hooks/useDependenciesManager";
import "./App.css";
import { SearchResult, HistoryItem } from "./types";
import { Play, Pause, Volume2, X, Music2, Loader2, Music, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SpotlightView } from "./components/SpotlightView";
import { ActiveDownloads } from "./components/ActiveDownloads";
import { CursorTrail } from "./components/CursorTrail";
import { useTranslation } from "react-i18next";
import "./i18n";




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
            search: (query: string, offset?: number, limit?: number) => Promise<SearchResult[]>;
            getMeta: (url: string) => Promise<SearchResult>;
            getStreamUrl: (url: string) => Promise<string>;
            trimAudio: (src: string, start: number, end: number) => Promise<string>;

            onStatus: (callback: (payload: { ok: boolean, message: string }) => void) => void;
            onCommand: (callback: (command: string) => void) => void;
            onDownloadStarted: (callback: (payload: { url: string, title: string }) => void) => void;
            onDownloadSuccess: (callback: (payload: { url: string, result: any }) => void) => void;
            onDownloadError: (callback: (payload: { url: string, error: string }) => void) => void;
            onDownloadProgress: (callback: (payload: { url: string, message: string }) => void) => void;
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
            savePeaks: (type: 'sample' | 'local' | 'track' | 'cache', id: string, peaks: any) => Promise<void>;
            getCachedPeaks: (id: string) => Promise<any>;
            minimizeWindow: () => void;
            toggleMaximizeWindow: () => void;
            closeWindow: () => void;
            platform: string;
        }
    }
}

import { DependencyChecker } from "./components/DependencyChecker";

export const App: React.FC = () => {
    const { t } = useTranslation();
    const isSpotlight = window.location.hash === '#/spotlight';
    const [view, setView] = useState("search");

    const settings = useSettings();
    const {
        format, bitrate, sampleRate, normalize, outDir, setOutDir,
        pythonPath, ffmpegPath, ffprobePath, setPythonPath, setFfmpegPath, setFfprobePath,
        keybinds, updateKeybind, resetKeybinds, spotlightShortcut, setSpotlightShortcut,
        clipboardShortcut, setClipboardShortcut, volume, setVolume,
        sidebarCollapsed, setSidebarCollapsed, audioDeviceId, setAudioDeviceId,
        theme, setTheme, smartOrganize, setSmartOrganize, minimizeToTray, setMinimizeToTray,
        discogsToken, setDiscogsToken, lowPowerMode, setLowPowerMode
    } = settings;

    const { history, clearHistory, addToHistory, updateHistoryItem, removeFromHistory } = useHistory();
    const { debugMode } = useDebugMode();
    const { logs, addLog, clearLogs } = useLogs();
    const { itemStates, updateItemState, resetItemStates } = useItemStates();
    const { addSpotlightDownload, updateSpotlightDownload } = useActiveDownloads();

    const [version, setVersion] = useState("...");
    const [isDragging, setIsDragging] = useState(false);

    // Custom Hooks
    const { dependencies, checkDeps, hasAllDeps } = useDependenciesManager({
        python: pythonPath, ffmpeg: ffmpegPath, ffprobe: ffprobePath
    });

    const {
        playingUrl, isPlaying, isPreviewLoading, activeTrack, audioRef, handleTogglePreview
    } = useAudioPlayer(volume, audioDeviceId, addLog);

    const {
        query, setQuery, results, isSearching, handleSearch, handleLoadMore
    } = useSearchManager(addLog, resetItemStates);

    const {
        handleDownload, handleDownloadFromUrl
    } = useDownloadHandlers({
        options: { format, bitrate, sampleRate, normalize, outDir, smartOrganize },
        itemStates, updateItemState, addLog, addToHistory,
        addSpotlightDownload, updateSpotlightDownload
    });

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
        if (lowPowerMode) {
            document.documentElement.classList.add('low-power');
        } else {
            document.documentElement.classList.remove('low-power');
        }
    }, [lowPowerMode]);

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


    const handleOpenItem = (path?: string) => {
        if (path) window.api.openItem(path);
    };

    const handlePickDir = async () => {
        const path = await window.api.pickDir();
        if (path) setOutDir(path);
    };

    const isDark = theme === 'dark';

    useEffect(() => {
        const handleStatus = ({ ok, message }: { ok: boolean, message: string }) => {
            addLog(message);
        };
        window.api.onStatus(handleStatus);
    }, [addLog]);

    if (!dependencies) {
        return (
            <div className="h-screen w-screen bg-wv-bg flex items-center justify-center">
                <Loader2 className="animate-spin text-wv-gray" size={32} />
            </div>
        );
    }

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
                    onRetry={checkDeps}
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
                                    {view === 'search' && t('header.search')}
                                    {view === 'library' && t('header.library')}
                                    {view === 'discovery' && t('sidebar.discovery')}
                                    {view === 'converter' && t('sidebar.converter')}
                                    {view === 'projects' && t('header.projects')}
                                    {view === 'settings' && t('header.settings')}
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
                                onTogglePreview={(url, meta) => handleTogglePreview(url, meta, history, results)}
                                playingUrl={playingUrl}
                                isPreviewLoading={isPreviewLoading}
                                theme={theme}
                                onStartDrag={() => setIsDragging(true)}
                                onLoadMore={handleLoadMore}
                            />

                        )}
                        {view === 'library' && (
                            <LibraryView
                                history={history}
                                onClearHistory={clearHistory}
                                onOpenItem={handleOpenItem}
                                onTogglePreview={(url, meta) => handleTogglePreview(url, meta, history, results)}
                                onUpdateItem={updateHistoryItem}
                                onRemoveItem={removeFromHistory}

                                playingUrl={playingUrl}
                                isPreviewLoading={isPreviewLoading}
                                theme={theme}
                                onStartDrag={() => setIsDragging(true)}
                                audioMediaElement={audioRef.current}
                            />


                        )}
                        {view === 'converter' && (
                            <ConverterView theme={theme} />
                        )}
                        {view === 'discovery' && (
                            <DiscoveryView
                                itemStates={itemStates}
                                history={history}
                                onDownload={handleDownload}
                                onOpenItem={handleOpenItem}
                                onTogglePreview={(url, meta) => handleTogglePreview(url, meta, history, results)}
                                playingUrl={playingUrl}
                                isPreviewLoading={isPreviewLoading}
                                theme={theme}
                                onStartDrag={() => setIsDragging(true)}
                                discogsToken={discogsToken}
                                onDownloadFromUrl={handleDownloadFromUrl}
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
                                minimizeToTray={minimizeToTray}
                                setMinimizeToTray={setMinimizeToTray}
                                discogsToken={discogsToken}
                                setDiscogsToken={setDiscogsToken}
                                lowPowerMode={lowPowerMode}
                                setLowPowerMode={setLowPowerMode}
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
                                onClick={() => playingUrl && handleTogglePreview(playingUrl, undefined, history, results)}
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
                                onLoadStart={(e) => {
                                    e.currentTarget.volume = volume;
                                    setIsPreviewLoading(true);
                                }}
                                onWaiting={() => setIsPreviewLoading(true)}
                                onPlaying={() => setIsPreviewLoading(false)}
                                onCanPlay={() => setIsPreviewLoading(false)}
                                onEnded={() => { setPlayingUrl(null); setStreamUrl(null); setIsPlaying(false); setActiveTrack(null); setIsPreviewLoading(false); }}
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

            {/* Playlist Batch Download Modal */}
            {playlistUrl && (
                <PlaylistModal
                    url={playlistUrl}
                    onClose={() => setPlaylistUrl(null)}
                    onDownloadBatch={handleBatchDownload}
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