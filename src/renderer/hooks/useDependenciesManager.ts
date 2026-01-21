import { useState, useEffect, useCallback } from "react";

interface DependencyPaths {
    python?: string;
    ffmpeg?: string;
    ffprobe?: string;
}

export const useDependenciesManager = (paths: DependencyPaths) => {
    const [dependencies, setDependencies] = useState<{ python: boolean, ffmpeg: boolean, ffprobe: boolean } | null>(null);

    const checkDeps = useCallback(async () => {
        const result = await window.api.checkDependencies({
            python: paths.python || undefined,
            ffmpeg: paths.ffmpeg || undefined,
            ffprobe: paths.ffprobe || undefined
        });
        setDependencies(result);
    }, [paths]);

    useEffect(() => {
        checkDeps();
    }, [checkDeps]);

    const hasAllDeps = dependencies?.python && dependencies?.ffmpeg && dependencies?.ffprobe;

    return { dependencies, setDependencies, checkDeps, hasAllDeps };
};
