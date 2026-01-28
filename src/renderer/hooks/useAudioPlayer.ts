import { useState, useEffect, useRef, useCallback } from "react";
import { SearchResult, HistoryItem } from "../types";

interface ActiveTrack {
    title: string;
    artist: string;
    thumbnail?: string;
}

export const useAudioPlayer = (volume: number, audioDeviceId: string, addLog: (msg: string) => void) => {
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [activeTrack, setActiveTrack] = useState<ActiveTrack | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    // Effect to handle time updates and duration
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handleReset = () => {
            setCurrentTime(0);
            setDuration(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('loadstart', handleReset);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('loadstart', handleReset);
        };
    }, [streamUrl]);

    const handleTogglePreview = useCallback(async (url: string, metadata?: any, history: HistoryItem[] = [], results: SearchResult[] = []) => {
        const trackInfo = metadata || history.find(h => h.path === url) || results.find(r => r.url === url);

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
                setPlayingUrl(url);
                setIsPreviewLoading(true);
                setIsPlaying(false);
                setCurrentTime(0);
                setDuration(0);
                addLog("Obteniendo stream para preview...");

                let finalUrl = "";
                if (url.startsWith('/') || url.includes(':\\')) {
                    const normalizedPath = url.replace(/\\/g, '/');
                    const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
                    finalUrl = `file://${encodedPath}`;
                    addLog("Reproduciendo archivo local: " + finalUrl);
                } else if ((trackInfo as any)?.streamUrl) {
                    finalUrl = (trackInfo as any).streamUrl;
                    addLog("Usando stream URL cacheado.");
                } else {
                    finalUrl = await window.api.getStreamUrl(url);
                }

                setStreamUrl(finalUrl);

                if (trackInfo) {
                    setActiveTrack({
                        title: trackInfo.title,
                        artist: (trackInfo as any).channel || (trackInfo as any).uploader || (trackInfo as any).artist || "Unknown",
                        thumbnail: trackInfo.thumbnail
                    });
                } else {
                    setActiveTrack({
                        title: url.split('/').pop() || "Unknown File",
                        artist: "Unknown Artist",
                        thumbnail: undefined
                    });
                }
            } catch (e: any) {
                setPlayingUrl(null);
                setIsPreviewLoading(false);
                addLog("Error al obtener preview: " + e.message);
            }
        }
    }, [playingUrl, isPlaying, addLog]);

    // Handle streamUrl changes
    useEffect(() => {
        if (audioRef.current && streamUrl) {
            audioRef.current.pause();
            audioRef.current.load();
            if (audioRef.current.src) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        if (err.name !== 'AbortError') {
                            console.error("Audio playback error:", err);
                        }
                        setIsPlaying(false);
                    });
                }
                setIsPlaying(true);
            }
        }
    }, [streamUrl]);

    // Sync volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume, streamUrl]);

    // Sync output device
    useEffect(() => {
        if (audioRef.current && (audioRef.current as any).setSinkId) {
            (audioRef.current as any).setSinkId(audioDeviceId)
                .catch((err: any) => console.error("Error setting audio output device:", err));
        }
    }, [audioDeviceId]);

    // Global keyboard shortcuts
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

    // Command listener
    useEffect(() => {
        return window.api.on('command', (command: string) => {
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

    return {
        playingUrl,
        streamUrl,
        isPlaying,
        setIsPlaying,
        isPreviewLoading,
        setIsPreviewLoading,
        activeTrack,
        currentTime,
        duration,
        audioRef,
        handleTogglePreview,
        stopPlayback,
        seek
    };
};
