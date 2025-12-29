import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Play, Pause, Repeat } from 'lucide-react';

interface WaveformProps {
    url: string;
    height?: number;
    waveColor?: string;
    progressColor?: string;
    onReady?: (wavesurfer: WaveSurfer) => void;
    showControls?: boolean;
    useRegions?: boolean;
    onRegionChange?: (start: number, end: number) => void;
    zoom?: number;
    onZoomChange?: (newZoom: number) => void;
    isLooping?: boolean;
    onLoopToggle?: () => void;
    theme?: 'light' | 'dark';
}

export const Waveform: React.FC<WaveformProps> = ({
    url,
    height = 40,
    waveColor,
    progressColor,
    onReady,
    showControls = false,
    useRegions = false,
    onRegionChange,
    zoom = 0,
    onZoomChange,
    isLooping = false,
    onLoopToggle,
    theme = 'dark'
}) => {
    const isDark = theme === 'dark';
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<any>(null);
    const activeRegionRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Provide default based on theme if not passed
    const activeWaveColor = waveColor || (isDark ? '#374151' : '#e5e7eb');
    const activeProgressColor = progressColor || (isDark ? '#ffffff' : '#000000');

    useEffect(() => {
        if (wavesurferRef.current) {
            wavesurferRef.current.zoom(zoom);
        }
    }, [zoom]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!useRegions || !onZoomChange) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -10 : 10;
            onZoomChange(Math.max(0, Math.min(500, zoom + delta)));
        }
    }, [zoom, onZoomChange, useRegions]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [handleWheel]);

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            height,
            waveColor: activeWaveColor,
            progressColor: activeProgressColor,
            cursorColor: isDark ? '#ffffff' : '#000000',
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            url: url.startsWith('/') || url.includes(':\\') ? `file://${url}` : url,
            normalize: true,
        });

        if (useRegions) {
            const regions = ws.registerPlugin(RegionsPlugin.create());
            regionsRef.current = regions;

            ws.on('ready', () => {
                const duration = ws.getDuration();
                const region = regions.addRegion({
                    start: 0,
                    end: duration,
                    color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    drag: true,
                    resize: true,
                });

                activeRegionRef.current = region;

                if (onRegionChange) {
                    onRegionChange(region.start, region.end);
                }

                regions.on('region-updated', (r) => {
                    activeRegionRef.current = r;
                    if (onRegionChange) {
                        onRegionChange(r.start, r.end);
                    }
                });

                // Play only region 
                ws.on('audioprocess', () => {
                    if (ws.isPlaying()) {
                        const currentTime = ws.getCurrentTime();
                        if (activeRegionRef.current) {
                            if (currentTime >= activeRegionRef.current.end) {
                                if (isLooping) {
                                    ws.setTime(activeRegionRef.current.start);
                                } else {
                                    ws.pause();
                                    ws.setTime(activeRegionRef.current.start);
                                }
                            }
                        }
                    }
                });
            });
        }

        ws.on('ready', () => {
            wavesurferRef.current = ws;
            if (onReady) onReady(ws);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => {
            setIsPlaying(false);
            if (useRegions && activeRegionRef.current) {
                ws.setTime(activeRegionRef.current.start);
            }
        });

        return () => {
            ws.destroy();
        };
    }, [url, height, activeWaveColor, activeProgressColor, useRegions, isLooping, isDark]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (wavesurferRef.current) {
            if (useRegions && activeRegionRef.current && !isPlaying) {
                const currentTime = wavesurferRef.current.getCurrentTime();
                if (currentTime < activeRegionRef.current.start || currentTime >= activeRegionRef.current.end) {
                    wavesurferRef.current.setTime(activeRegionRef.current.start);
                }
            }
            wavesurferRef.current.playPause();
        }
    };

    return (
        <div className="flex items-center gap-3 w-full group">
            {showControls && (
                <div className="flex flex-col gap-2 no-drag">
                    <button
                        onClick={handleToggle}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-all ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
                    </button>
                    {useRegions && onLoopToggle && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLoopToggle(); }}
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${isLooping ? (isDark ? 'bg-white border-white text-black' : 'bg-wv-accent border-wv-accent text-black') : (isDark ? 'bg-white/5 border-white/10 text-wv-gray hover:text-white' : 'bg-black/5 border-black/10 text-black/40 hover:text-black')}`}
                        >
                            <Repeat size={16} className={isLooping ? 'animate-pulse' : ''} />
                        </button>
                    )}
                </div>
            )}
            <div ref={containerRef} className="flex-1 min-w-0 no-drag" />
        </div>
    );
};


