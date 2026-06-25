import React, { useEffect, useState, useRef } from "react";
import { useApp } from "../context/AppContext";

export const StatsOverlay: React.FC = () => {
    const { showStats } = useApp();
    const [fps, setFps] = useState(0);
    const [frameTime, setFrameTime] = useState(0);
    const [memory, setMemory] = useState<any>(null);
    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const fpsTimerRef = useRef<number>(performance.now());

    useEffect(() => {
        if (!showStats) {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
            return;
        }

        const renderLoop = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;
            lastTimeRef.current = now;
            
            // Frame time is delta for current frame in ms
            setFrameTime(delta);

            frameCountRef.current += 1;

            // Recalculate FPS every 500ms
            if (now - fpsTimerRef.current >= 500) {
                setFps(Math.round((frameCountRef.current * 1000) / (now - fpsTimerRef.current)));
                frameCountRef.current = 0;
                fpsTimerRef.current = now;

                // Update memory stats from performance API if available (Chrome/Electron only)
                const perf = (performance as any);
                if (perf.memory) {
                    setMemory({
                        usedJSHeapSize: Math.round(perf.memory.usedJSHeapSize / 1024 / 1024),
                        totalJSHeapSize: Math.round(perf.memory.totalJSHeapSize / 1024 / 1024),
                        jsHeapSizeLimit: Math.round(perf.memory.jsHeapSizeLimit / 1024 / 1024),
                    });
                }
            }

            requestRef.current = requestRef.current = requestAnimationFrame(renderLoop);
        };

        requestRef.current = requestAnimationFrame(renderLoop);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [showStats]);

    if (!showStats) return null;

    return (
        <div 
            id="stats-overlay"
            className="fixed top-12 left-4 z-[9999] pointer-events-none bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 text-[10px] font-mono text-green-400 select-none shadow-xl flex flex-col gap-1 w-44"
        >
            <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
                <span className="text-white font-bold tracking-wider uppercase text-[9px]">Performance</span>
                <span className="animate-pulse">● Live</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-400">FPS:</span>
                <span className={fps >= 58 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400"}>
                    {fps} fps
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-400">Frame Time:</span>
                <span>{frameTime.toFixed(1)} ms</span>
            </div>
            {memory && (
                <>
                    <div className="flex justify-between mt-1 border-t border-white/5 pt-1">
                        <span className="text-gray-400">Heap Used:</span>
                        <span>{memory.usedJSHeapSize} MB</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Heap Total:</span>
                        <span>{memory.totalJSHeapSize} MB</span>
                    </div>
                </>
            )}
        </div>
    );
};
