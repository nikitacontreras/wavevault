import { useState, useEffect } from "react";
import { TargetFormat, Bitrate, SampleRate, SearchResult, ItemState, HistoryItem } from "../types";

export const useSettings = () => {
    const [format, setFormat] = useState<TargetFormat>(() => {
        const stored = localStorage.getItem('format');
        return (stored as TargetFormat) || "mp3";
    });

    const [bitrate, setBitrate] = useState<Bitrate>(() => {
        const stored = localStorage.getItem('bitrate');
        return (stored as Bitrate) || "192k";
    });

    const [sampleRate, setSampleRate] = useState<SampleRate>(() => {
        const stored = localStorage.getItem('sampleRate');
        return (stored as SampleRate) || "44100";
    });

    const [normalize, setNormalize] = useState<boolean>(() => {
        const stored = localStorage.getItem('normalize');
        return stored === 'true';
    });

    const [outDir, setOutDir] = useState<string | undefined>(undefined);

    useEffect(() => {
        const storedDir = localStorage.getItem('outDir');
        if (storedDir) setOutDir(storedDir);
    }, []);

    useEffect(() => {
        localStorage.setItem('format', format);
    }, [format]);

    useEffect(() => {
        localStorage.setItem('bitrate', bitrate);
    }, [bitrate]);

    useEffect(() => {
        localStorage.setItem('sampleRate', sampleRate);
    }, [sampleRate]);

    useEffect(() => {
        localStorage.setItem('normalize', normalize.toString());
    }, [normalize]);

    useEffect(() => {
        if (outDir) localStorage.setItem('outDir', outDir);
    }, [outDir]);

    const [volume, setVolume] = useState<number>(() => {
        const stored = localStorage.getItem('volume');
        return stored ? parseFloat(stored) : 0.8;
    });

    useEffect(() => {
        localStorage.setItem('volume', volume.toString());
    }, [volume]);

    return {
        format, setFormat,
        bitrate, setBitrate,
        sampleRate, setSampleRate,
        normalize, setNormalize,
        outDir, setOutDir,
        volume, setVolume
    };
};

export const useHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('downloadHistory') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('downloadHistory', JSON.stringify(history));
    }, [history]);

    const clearHistory = () => {
        if (confirm("¿Borrar todo el historial?")) setHistory([]);
    };

    const addToHistory = (item: HistoryItem) => {
        setHistory(prev => [item, ...prev]);
    };

    const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
        setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    return { history, clearHistory, addToHistory, updateHistoryItem };
};

export const useDebugMode = () => {
    const [debugMode, setDebugMode] = useState(false);
    const [keySequence, setKeySequence] = useState("");

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            setKeySequence(prev => {
                const newSeq = (prev + e.key).slice(-5);
                if (newSeq === "debug") {
                    setDebugMode(true);
                    return "";
                }
                return newSeq;
            });
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, []);

    return { debugMode, setDebugMode };
};

export const useLogs = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const clearLogs = () => setLogs([]);

    useEffect(() => {
        window.api.onStatus((p) => {
            addLog((p.ok ? "✅ " : "❌ ") + p.message);
        });
    }, []);

    return { logs, addLog, clearLogs };
};

export const useItemStates = () => {
    const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

    const updateItemState = (id: string, state: Partial<ItemState>) => {
        setItemStates(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { status: 'idle' }), ...state }
        }));
    };

    const resetItemStates = () => setItemStates({});

    return { itemStates, updateItemState, resetItemStates };
};
