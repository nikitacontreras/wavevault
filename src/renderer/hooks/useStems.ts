import { useState, useEffect, useCallback } from 'react';

export function useStems() {
    const [isSeparating, setIsSeparating] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [stems, setStems] = useState<Record<string, string> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const separate = useCallback(async (filePath: string, outDir: string) => {
        setIsSeparating(true);
        setProgress('Iniciando separación...');
        setStems(null);
        setError(null);

        const removeListener = (window as any).api.on('stems:progress', (data: string) => {
            setProgress(data);
        });

        try {
            const result = await (window as any).api.separateStems(filePath, outDir);
            setStems(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            removeListener();
            setIsSeparating(false);
        }
    }, []);

    return {
        isSeparating,
        progress,
        stems,
        error,
        separate
    };
}
