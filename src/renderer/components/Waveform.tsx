import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Play, Pause } from 'lucide-react';

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
}

export const Waveform: React.FC<WaveformProps> = ({
    url,
    height = 40,
    waveColor = '#4a4a4a',
    progressColor = '#ffffff',
    onReady,
    showControls = false,
    useRegions = false,
    onRegionChange,
    zoom = 0
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionsRef = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (wavesurferRef.current) {
            wavesurferRef.current.zoom(zoom);
        }
    }, [zoom]);

    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            height,
            waveColor,
            progressColor,
            cursorColor: 'transparent',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            url: url.startsWith('/') || url.includes(':\\') ? `file://${url}` : url,
        });

        // Initialize regions if requested
        if (useRegions) {
            const regions = ws.registerPlugin(RegionsPlugin.create());
            regionsRef.current = regions;

            ws.on('ready', () => {
                const duration = ws.getDuration();
                // Create an initial region covering the first 25% if it's long, or the whole thing
                const initialRegion = regions.addRegion({
                    start: 0,
                    end: duration,
                    color: 'rgba(255, 255, 255, 0.15)',
                    drag: true,
                    resize: true,
                });

                if (onRegionChange) {
                    onRegionChange(initialRegion.start, initialRegion.end);
                }

                regions.on('region-updated', (region) => {
                    if (onRegionChange) {
                        onRegionChange(region.start, region.end);
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
        ws.on('finish', () => setIsPlaying(false));

        return () => {
            ws.destroy();
        };
    }, [url, height, waveColor, progressColor, useRegions]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };

    return (
        <div className="flex items-center gap-3 w-full group">
            {showControls && (
                <button
                    onClick={handleToggle}
                    className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full shadow-lg hover:scale-105 transition-transform no-drag"
                >
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
                </button>
            )}
            <div ref={containerRef} className="flex-1 min-w-0 no-drag" />
        </div>
    );
};
