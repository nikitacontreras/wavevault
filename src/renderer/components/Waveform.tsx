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
    peaks?: number[][];
    onPeaksGenerated?: (peaks: number[][]) => void;
    audioMediaElement?: HTMLAudioElement | null;
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
    theme = 'dark',
    peaks,
    onPeaksGenerated,
    audioMediaElement
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

    const isLoopingRef = useRef(isLooping);
    useEffect(() => {
        isLoopingRef.current = isLooping;
    }, [isLooping]);

    useEffect(() => {
        if (wavesurferRef.current) {
            wavesurferRef.current.zoom(zoom);
        }
    }, [zoom]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!onZoomChange || !wavesurferRef.current) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const ws = wavesurferRef.current;
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;

            // Calculate time under cursor before zoom
            const scrollLeft = container.scrollLeft;
            const wrapperWidth = (ws as any).renderer.wrapper.scrollWidth;
            const duration = ws.getDuration();
            const timeAtCursor = ((scrollLeft + x) / wrapperWidth) * duration;

            const delta = e.deltaY > 0 ? -20 : 20;
            const newZoom = Math.max(0, Math.min(2000, zoom + delta));
            onZoomChange(newZoom);

            // The scroll adjustment needs to happen after the zoom effect takes place
            // because the wrapper width changes. We can do it in a small timeout or 
            // another effect, but here we can try to predict it.
            setTimeout(() => {
                const newWrapperWidth = (ws as any).renderer.wrapper.scrollWidth;
                const newScrollLeft = (timeAtCursor / duration) * newWrapperWidth - x;
                container.scrollLeft = newScrollLeft;
            }, 0);
        }
    }, [zoom, onZoomChange]);

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

        // Setup WaveSurfer options
        const options: any = {
            container: containerRef.current,
            height,
            waveColor: activeWaveColor,
            progressColor: activeProgressColor,
            cursorColor: isDark ? '#ffffff' : '#000000',
            cursorWidth: 2,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            normalize: true,
            minPxPerSec: 1,
            dragToSeek: true,
            peaks: peaks,
        };

        if (audioMediaElement) {
            options.media = audioMediaElement;
            // If we have media element but NO peaks, we must provide dummy peaks initially 
            // to prevent WaveSurfer from trying to fetch/decode internally which might conflict 
            // with the media element's source or playback state.
            if (!peaks) {
                options.peaks = [new Array(100).fill(0)]; // Placeholder
            }
        } else {
            options.backend = 'MediaElement';
            options.url = url.startsWith('/') || url.includes(':\\') ? `file://${url}` : url;
        }

        const ws = WaveSurfer.create(options);

        // If we have mixed usage (Media Element + No Peaks), we need to generate peaks 
        // essentially "offline" without disturbing the media element.
        if (audioMediaElement && !peaks) {
            const loadUrl = url.startsWith('/') || url.includes(':\\') ? `file://${url}` : url;

            // Fetch and decode separately
            fetch(loadUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    return audioContext.decodeAudioData(arrayBuffer);
                })
                .then(audioBuffer => {
                    // Calculate peaks from AudioBuffer
                    // Simple peak sampling
                    const channelData = audioBuffer.getChannelData(0);
                    const steps = Math.ceil(audioBuffer.duration * 20); // roughly 20 peaks per second? No, WaveSurfer manages this.
                    // Actually, WaveSurfer has a helper for this but it's internal?
                    // Let's just pass the decoded buffer to WaveSurfer? 
                    // WS v7 doesn't seem to have a 'setBuffer' that doesn't affect playback if backend is MediaElement.

                    // We will just re-load with the same media element but NOW with peaks options?
                    // No, we can't easily swap options.

                    // Option B: We calculate peaks manually and then destroy/re-create WS? 
                    // Or we assume the user will play the file and we just want to save the peaks for next time?
                    // But the user wants to see the waveform NOW.

                    // Let's try to calculate peaks manually.
                    const peaks: number[][] = [];
                    const channel1 = audioBuffer.getChannelData(0);
                    // We need enough peaks for the width. 
                    // WaveSurfer defaults?
                    // Let's generate a generous amount, say 100 per second of audio
                    const peaksPerSec = 100;
                    const totalPeaks = Math.ceil(audioBuffer.duration * peaksPerSec);
                    const sampleSize = Math.floor(channel1.length / totalPeaks);

                    const generatedPeaks = [];
                    for (let i = 0; i < totalPeaks; i++) {
                        const start = i * sampleSize;
                        let max = 0;
                        for (let j = 0; j < sampleSize; j++) {
                            const val = Math.abs(channel1[start + j]);
                            if (val > max) max = val;
                        }
                        generatedPeaks.push(max);
                    }

                    // Now that we have peaks, we need to update the waveform.
                    // WaveSurfer v7 doesn't let us just setOptions({ peaks }).
                    // We interact with the existing instance. 
                    // We can try calling load again with the SAME media element but with peaks?
                    // ws.load(url, peaks) -> but url sets src.

                    // If we pass the media element again, maybe it re-binds?
                    // Correct approach: Destroy and Re-create with calculated peaks.
                    // This is safe because 'audioMediaElement' is external and won't be destroyed.

                    if (onPeaksGenerated) onPeaksGenerated([generatedPeaks]);

                    // We force a visual update by destroying this instance and letting the parent 
                    // re-render or we assume onPeaksGenerated will trigger an update in the parent 
                    // which passes new 'peaks' prop down.
                    // If LibraryView updates 'folderFiles' state with new peaks, this component will re-render.
                })
                .catch(err => console.error("Error generating peaks:", err));
        }

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
                                if (isLoopingRef.current) {
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

            // Export peaks if not provided and callback exists
            if (!peaks && onPeaksGenerated) {
                try {
                    // exportPeaks returns the peak data
                    const generatedPeaks = (ws as any).exportPeaks();
                    if (generatedPeaks && generatedPeaks.length > 0) {
                        onPeaksGenerated(generatedPeaks);
                    }
                } catch (e) {
                    console.warn("Failed to export peaks:", e);
                }
            }
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
    }, [url, height, activeWaveColor, activeProgressColor, useRegions, isDark, audioMediaElement]);

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


