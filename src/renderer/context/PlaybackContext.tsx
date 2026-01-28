import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { useApp } from './AppContext';
import { useLibrary } from './LibraryContext';
import { SearchResult, HistoryItem } from '../types';

interface PlaybackContextType {
    playingUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    activeTrack: any;
    isPreviewLoading: boolean;
    handleTogglePreview: (url: string, metadata?: any) => void;
    seek: (time: number) => void;
    stopPlayback: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { config } = useSettings();
    const { addLog } = useApp();
    const { history, itemStates } = useLibrary();

    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [activeTrack, setActiveTrack] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const seek = useCallback((time: number) => {
        if (audioRef.current) audioRef.current.currentTime = time;
    }, []);

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        setPlayingUrl(null);
        setStreamUrl(null);
        setIsPlaying(false);
        setActiveTrack(null);
    }, []);

    const handleTogglePreview = useCallback(async (url: string, metadata?: any) => {
        if (playingUrl === url) {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    audioRef.current.play().catch(() => { });
                    setIsPlaying(true);
                }
            }
            return;
        }

        try {
            setPlayingUrl(url);
            setIsPreviewLoading(true);
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);

            let finalUrl = "";
            if (url.startsWith('/') || url.includes(':\\')) {
                finalUrl = `file://${url.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
            } else if (metadata?.streamUrl) {
                finalUrl = metadata.streamUrl;
            } else {
                finalUrl = await (window as any).api.getStreamUrl(url);
            }

            setStreamUrl(finalUrl);

            const trackInfo = metadata || history.find(h => h.id === url || h.path === url);
            if (trackInfo) {
                setActiveTrack({
                    title: trackInfo.title,
                    artist: trackInfo.artist || trackInfo.channel || "Unknown",
                    thumbnail: trackInfo.thumbnail
                });
            } else {
                setActiveTrack({ title: url.split('/').pop() || "Unknown", artist: "Unknown" });
            }
        } catch (e: any) {
            addLog("Error preview: " + e.message);
            stopPlayback();
        }
    }, [playingUrl, isPlaying, history, addLog, stopPlayback]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (playingUrl) handleTogglePreview(playingUrl);
            }
            if (e.code === 'Escape') stopPlayback();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [playingUrl, handleTogglePreview, stopPlayback]);

    return (
        <PlaybackContext.Provider value={{
            playingUrl, isPlaying, currentTime, duration, activeTrack,
            isPreviewLoading, handleTogglePreview, seek, stopPlayback
        }}>
            <audio
                ref={audioRef}
                src={streamUrl || undefined}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={stopPlayback}
                onLoadStart={() => setIsPreviewLoading(true)}
                onCanPlay={() => setIsPreviewLoading(false)}
                onWaiting={() => setIsPreviewLoading(true)}
                onPlaying={() => setIsPreviewLoading(false)}
                style={{ display: 'none' }}
            />
            {children}
        </PlaybackContext.Provider>
    );
};

export const usePlayback = () => {
    const context = useContext(PlaybackContext);
    if (!context) throw new Error('usePlayback must be used within PlaybackProvider');
    return context;
};
