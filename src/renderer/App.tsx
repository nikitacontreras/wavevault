import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useApp, AppProvider } from "./context/AppContext";
import { useSettings, SettingsProvider } from "./context/SettingsContext";
import { useLibrary, LibraryProvider } from "./context/LibraryContext";
import { usePlayback, PlaybackProvider } from "./context/PlaybackContext";
import { useSearchManager } from "./hooks/useSearchManager";
import { useDownloadHandlers } from "./hooks/useDownloadHandlers";
import { useDependenciesManager } from "./hooks/useDependenciesManager";
import "./App.css";
import { Play, Pause, Volume2, X, Music2, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SpotlightView } from "./components/SpotlightView";
import { ActivityPanel } from "./components/ActivityPanel";
import { CursorTrail } from "./components/CursorTrail";
import { DependencyChecker } from "./components/DependencyChecker";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { SearchView } from "./components/SearchView";
import { LibraryView } from "./components/LibraryView";
import { ConverterView } from "./components/ConverterView";
import { DiscoveryView } from "./components/DiscoveryView";
import { ProjectsView } from "./components/ProjectsView";
import { SettingsView } from "./components/SettingsView";
import { PlaylistModal } from "./components/PlaylistModal";
import { UpdateNotification } from "./components/UpdateNotification";
import { useTranslation } from "react-i18next";
import "./i18n";

export const App: React.FC = () => {
    const { t } = useTranslation();
    const isSpotlight = window.location.hash === '#/spotlight';
    const { view, setView, version, sidebarCollapsed, setSidebarCollapsed } = useApp();
    const { config, updateConfig } = useSettings();
    const {
        itemStates, history
    } = useLibrary();
    const {
        playingUrl, isPlaying, currentTime, duration, activeTrack,
        handleTogglePreview, seek, stopPlayback
    } = usePlayback();

    const [isDragging, setIsDragging] = useState(false);

    // Custom Hooks (now pre-configured with contexts internally)
    const { dependencies, checkDeps, hasAllDeps } = useDependenciesManager();
    const { query, setQuery, results, isSearching, playlistUrl, setPlaylistUrl, handleSearch, handleLoadMore } = useSearchManager();
    const { handleDownload, handleBatchDownload, handleDownloadFromUrl } = useDownloadHandlers();

    useEffect(() => {
        const themeClass = config.theme === 'dark' ? 'dark' : '';
        document.documentElement.className = themeClass;
        if (config.lowPowerMode) document.documentElement.classList.add('low-power');
    }, [config.theme, config.lowPowerMode]);

    useEffect(() => {
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Remote Control Logic
    useEffect(() => {
        const unsub = window.api.onRemoteCommand((cmd: any) => {
            console.log("[App] Remote Command:", cmd);

            if (cmd.type === 'playPause') {
                if (playingUrl) handleTogglePreview(playingUrl);
            }
            else if (cmd.type === 'volume') {
                const vol = Number(cmd.value);
                if (!isNaN(vol)) updateConfig({ volume: vol });
            }
            else if (cmd.type === 'download') {
                handleDownloadFromUrl(cmd.url, cmd.title || "Remote Download");
            }
            else if (cmd.type === 'playUrl') {
                handleTogglePreview(cmd.url, cmd.metadata);
            }
            else if (cmd.type === 'next') {
                // Seek forward 10s as fallback
                if (playingUrl) seek(Math.min(duration, currentTime + 10));
            }
            else if (cmd.type === 'seek') {
                const time = Number(cmd.value);
                if (!isNaN(time)) seek(time);
            }
            else if (cmd.type === 'prev') {
                // Seek backward 10s as fallback
                if (playingUrl) seek(Math.max(0, currentTime - 10));
            }
        });
        return () => { unsub(); };
    }, [playingUrl, handleTogglePreview, updateConfig, handleDownloadFromUrl, seek, currentTime, duration]);

    // Sync State to Remote
    useEffect(() => {
        window.api.updateRemoteState({
            isPlaying,
            volume: config.volume,
            track: activeTrack,
            currentTime,
            duration
        });
    }, [isPlaying, config.volume, activeTrack, currentTime, duration]);

    if (!dependencies) {
        return <div className="h-screen w-screen bg-wv-bg flex items-center justify-center"><Loader2 className="animate-spin text-wv-gray" size={32} /></div>;
    }

    if (isSpotlight) return <SpotlightView theme={config.theme} />;

    const isDark = config.theme === 'dark';

    return (
        <div id="app-root" className="flex flex-col h-screen w-screen overflow-hidden font-sans bg-wv-bg text-wv-text">
            <CursorTrail isDragging={isDragging} />
            <TitleBar />

            {!hasAllDeps && (
                <DependencyChecker dependencies={dependencies} onRetry={checkDeps} />
            )}

            <div className="flex-1 flex overflow-hidden">
                <Sidebar />

                <main className="flex-1 flex flex-col min-w-0 bg-wv-bg">
                    <header className={`px-8 py-4 border-b flex justify-between items-center z-20 transition-all ${isDark ? "bg-wv-bg border-white/5" : "bg-white border-black/5"}`}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/5 text-wv-gray hover:text-white" : "hover:bg-black/5 text-black/40 hover:text-black"}`}>
                                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                            </button>
                            <h1 className="text-lg font-bold tracking-tight">{t(`header.${view}`)}</h1>
                        </div>
                    </header>

                    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_35%)]" : "bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_35%)]"}`}>
                        {view === 'search' && (
                            <SearchView
                                query={query} setQuery={setQuery} isSearching={isSearching} results={results}
                                itemStates={itemStates} history={history} onSearch={handleSearch}
                                onDownload={handleDownload} onOpenItem={(p) => p && window.api.openItem(p)}
                                onStartDrag={() => setIsDragging(true)} onLoadMore={handleLoadMore}
                            />
                        )}
                        {view === 'library' && (
                            <LibraryView onStartDrag={() => setIsDragging(true)} />
                        )}
                        {view === 'converter' && <ConverterView theme={config.theme} />}
                        {view === 'discovery' && (
                            <DiscoveryView onStartDrag={() => setIsDragging(true)} />
                        )}
                        {view === 'projects' && <ProjectsView theme={config.theme} />}
                        {view === 'settings' && (
                            <SettingsView />
                        )}
                    </div>

                    <footer className={`relative h-20 border-t flex items-center px-8 gap-10 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 ${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/10"}`}>
                        <div className="absolute -top-[1px] left-0 right-0 h-1 z-50 group/progress">
                            <input type="range" min="0" max={duration || 100} step="0.1" value={currentTime} onChange={(e) => seek(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className={`absolute top-0 left-0 right-0 h-0.5 group-hover/progress:h-1.5 transition-all ${isDark ? "bg-white/10" : "bg-black/5"}`}>
                                <div className={`h-full transition-all duration-75 ease-out ${isDark ? "bg-white" : "bg-black"}`} style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                            </div>
                        </div>

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
                                    <div className={`h-10 w-10 rounded-lg border border-dashed flex items-center justify-center text-wv-gray ${isDark ? "border-white/10" : "border-black/10"}`}><Music2 size={16} /></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-wv-gray">{t('player.none')}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center gap-1">
                            <button onClick={() => playingUrl && handleTogglePreview(playingUrl)} className={`h-10 w-10 rounded-full flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 ${isDark ? "bg-white text-black shadow-lg shadow-white/5" : "bg-black text-white shadow-lg shadow-black/10"}`} disabled={!playingUrl}>
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
                            </button>
                            {playingUrl && (
                                <div className="flex items-center gap-2 opacity-50">
                                    <span className="text-[9px] font-bold tabular-nums">{formatTime(currentTime)}</span>
                                    <span className="text-[9px] font-medium opacity-30">/</span>
                                    <span className="text-[9px] font-bold tabular-nums">{formatTime(duration)}</span>
                                </div>
                            )}
                        </div>

                        <div className="w-1/3 flex items-center justify-end gap-3">
                            <Volume2 size={16} className="text-wv-gray" />
                            <input type="range" min="0" max="1" step="0.01" value={config.volume} onChange={(e) => updateConfig({ volume: parseFloat(e.target.value) })} className="volume-slider w-24" />
                            {playingUrl && (
                                <button className={`p-1.5 rounded-md text-wv-gray transition-colors ${isDark ? "hover:bg-white/5 hover:text-white" : "hover:bg-black/5 hover:text-black"}`} onClick={stopPlayback}><X size={16} /></button>
                            )}
                        </div>
                    </footer>
                </main>
            </div>

            <ActivityPanel />
            <UpdateNotification />
            {playlistUrl && <PlaylistModal url={playlistUrl} onClose={() => setPlaylistUrl(null)} onDownloadBatch={handleBatchDownload} />}
        </div>
    );
};


const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <AppProvider>
            <SettingsProvider>
                <LibraryProvider>
                    <PlaybackProvider>
                        <App />
                    </PlaybackProvider>
                </LibraryProvider>
            </SettingsProvider>
        </AppProvider>
    );
}