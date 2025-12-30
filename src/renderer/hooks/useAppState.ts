import { useState, useEffect } from "react";
import { TargetFormat, Bitrate, SampleRate, SearchResult, ItemState, HistoryItem, KeybindConfig } from "../types";

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
    const [pythonPath, setPythonPath] = useState<string>(localStorage.getItem('pythonPath') || "");
    const [ffmpegPath, setFfmpegPath] = useState<string>(localStorage.getItem('ffmpegPath') || "");
    const [ffprobePath, setFfprobePath] = useState<string>(localStorage.getItem('ffprobePath') || "");

    const [keybinds, setKeybinds] = useState<KeybindConfig[]>([]);
    const [spotlightShortcut, setSpotlightShortcut] = useState<string>("");
    const [clipboardShortcut, setClipboardShortcut] = useState<string>("");

    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });

    const [audioDeviceId, setAudioDeviceId] = useState<string>(() => {
        return localStorage.getItem('audioDeviceId') || 'default';
    });

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const stored = localStorage.getItem('theme');
        return (stored as 'light' | 'dark') || "light";
    });

    const [smartOrganize, setSmartOrganize] = useState<boolean>(() => {
        return localStorage.getItem('smartOrganize') === 'true';
    });





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

    useEffect(() => {
        localStorage.setItem('pythonPath', pythonPath);
        window.api.updateConfig({ pythonPath: pythonPath || null });
    }, [pythonPath]);

    useEffect(() => {
        localStorage.setItem('ffmpegPath', ffmpegPath);
        window.api.updateConfig({ ffmpegPath: ffmpegPath || null });
    }, [ffmpegPath]);

    useEffect(() => {
        localStorage.setItem('ffprobePath', ffprobePath);
        window.api.updateConfig({ ffprobePath: ffprobePath || null });
    }, [ffprobePath]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
    }, [sidebarCollapsed]);

    useEffect(() => {
        localStorage.setItem('audioDeviceId', audioDeviceId);
    }, [audioDeviceId]);

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('smartOrganize', smartOrganize.toString());
    }, [smartOrganize]);



    // Load keybinds from main process
    useEffect(() => {
        const loadKeybinds = async () => {
            try {
                const keybindsData = await window.api.getKeybinds();
                setKeybinds(keybindsData);

                // Set legacy shortcuts for backward compatibility
                const spotlightKeybind = keybindsData.find((k: any) => k.id === 'spotlight');
                const clipboardKeybind = keybindsData.find((k: any) => k.id === 'clipboard');

                if (spotlightKeybind) setSpotlightShortcut(spotlightKeybind.accelerator);
                if (clipboardKeybind) setClipboardShortcut(clipboardKeybind.accelerator);
            } catch (error) {
                console.error('Failed to load keybinds:', error);
            }
        };

        loadKeybinds();
    }, []);

    const updateKeybind = async (id: string, accelerator: string) => {
        try {
            const updatedKeybinds = keybinds.map((k: any) =>
                k.id === id ? { ...k, accelerator } : k
            );
            setKeybinds(updatedKeybinds);

            // Update legacy shortcuts for backward compatibility
            if (id === 'spotlight') setSpotlightShortcut(accelerator);
            if (id === 'clipboard') setClipboardShortcut(accelerator);

            await window.api.updateConfig({ keybinds: updatedKeybinds });
        } catch (error) {
            console.error('Failed to update keybind:', error);
        }
    };

    const resetKeybinds = async () => {
        try {
            const defaults = await window.api.resetKeybinds();
            setKeybinds(defaults);

            const spotlight = defaults.find((k: any) => k.id === 'spotlight');
            const clipboard = defaults.find((k: any) => k.id === 'clipboard');
            if (spotlight) setSpotlightShortcut(spotlight.accelerator);
            if (clipboard) setClipboardShortcut(clipboard.accelerator);
        } catch (error) {
            console.error('Failed to reset keybinds:', error);
        }
    };




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
        pythonPath, setPythonPath,
        ffmpegPath, setFfmpegPath,
        ffprobePath, setFfprobePath,
        keybinds, setKeybinds, updateKeybind, resetKeybinds,

        spotlightShortcut, setSpotlightShortcut,
        clipboardShortcut, setClipboardShortcut,
        volume, setVolume,
        sidebarCollapsed, setSidebarCollapsed,
        audioDeviceId, setAudioDeviceId,
        theme, setTheme,
        smartOrganize, setSmartOrganize
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
        setHistory(prev => {
            if (prev.some(i => i.id === item.id)) return prev;
            return [item, ...prev];
        });
    };


    const removeFromHistory = (id: string) => {
        if (confirm("¿Eliminar este sample de la librería?")) {
            setHistory(prev => prev.filter(item => item.id !== id));
        }
    };

    const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
        setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };


    return { history, clearHistory, addToHistory, updateHistoryItem, removeFromHistory };
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

    return { debugMode, setDebugMode, keySequence };
};

export const useLogs = () => {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const handleStatus = (p: { ok: boolean, message: string }) => {
            setLogs(prev => [...prev, `${p.message}`]);
        };
        window.api.onStatus(handleStatus);
    }, []);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const clearLogs = () => setLogs([]);

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

export const useActiveDownloads = () => {
    const [activeDownloads, setActiveDownloads] = useState<any[]>([]);

    const addSpotlightDownload = (id: string, title: string, url: string) => {
        setActiveDownloads(prev => [
            ...prev.filter(d => d.id !== id),
            { id, title, url, state: { status: 'loading', msg: 'Iniciando...' } }
        ]);
    };

    const updateSpotlightDownload = (id: string, state: Partial<ItemState>) => {
        setActiveDownloads(prev =>
            prev.map(d =>
                d.id === id
                    ? { ...d, state: { ...d.state, ...state } }
                    : d
            )
        );
    };

    const removeSpotlightDownload = (id: string) => {
        setActiveDownloads(prev => prev.filter(d => d.id !== id));
    };

    const clearSpotlightDownloads = () => {
        setActiveDownloads(prev =>
            prev.filter(d => d.state.status === 'loading')
        );
    };

    return {
        activeDownloads,
        addSpotlightDownload,
        updateSpotlightDownload,
        removeSpotlightDownload,
        clearSpotlightDownloads
    };
};
