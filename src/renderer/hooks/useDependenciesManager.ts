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
        const result = await window.api.checkDependencies({
            python: config.pythonPath || undefined,
            ffmpeg: config.ffmpegPath || undefined,
            ffprobe: config.ffprobePath || undefined
        });
        setDependencies(result);
    }, [config.pythonPath, config.ffmpegPath, config.ffprobePath]);

    useEffect(() => {
        checkDeps();
    }, [checkDeps]);

    const hasAllDeps = dependencies?.python && dependencies?.ffmpeg && dependencies?.ffprobe;

    return { dependencies, setDependencies, checkDeps, hasAllDeps };
};
