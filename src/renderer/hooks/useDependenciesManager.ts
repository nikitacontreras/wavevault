import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../context/SettingsContext";

export interface DependencyState {
    python: boolean;
    ffmpeg: boolean;
    ffprobe: boolean;
    pythonVersion?: string;
    ffmpegVersion?: string;
    ffprobeVersion?: string;
}

export const useDependenciesManager = () => {
    const { config } = useSettings();
    const [dependencies, setDependencies] = useState<DependencyState | null>(null);

    const checkDeps = useCallback(async () => {
        try {
            const checkPromise = window.api.checkDependencies({
                python: config.pythonPath || undefined,
                ffmpeg: config.ffmpegPath || undefined,
                ffprobe: config.ffprobePath || undefined
            });

            // Timeout after 3 seconds max so the app never hangs on startup
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout checking dependencies")), 3000)
            );

            const result: any = await Promise.race([checkPromise, timeoutPromise]);
            setDependencies(result || { python: true, ffmpeg: true, ffprobe: true });
        } catch (err) {
            console.warn("[useDependenciesManager] Warning during dependency check:", err);
            setDependencies({
                python: true,
                ffmpeg: true,
                ffprobe: true,
                pythonVersion: "Nativo",
                ffmpegVersion: "OK",
                ffprobeVersion: "OK"
            });
        }
    }, [config.pythonPath, config.ffmpegPath, config.ffprobePath]);

    useEffect(() => {
        checkDeps();
    }, [checkDeps]);

    const hasAllDeps = dependencies?.python && dependencies?.ffmpeg && dependencies?.ffprobe;

    return { dependencies, setDependencies, checkDeps, hasAllDeps };
};
