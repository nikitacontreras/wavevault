import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { HistoryItem, ItemState } from '../types';

interface LibraryContextType {
    history: HistoryItem[];
    addToHistory: (item: HistoryItem) => void;
    removeFromHistory: (id: string) => void;
    updateHistoryItem: (id: string, updates: Partial<HistoryItem>) => void;
    clearHistory: () => void;

    itemStates: Record<string, ItemState>;
    updateItemState: (id: string, state: Partial<ItemState>) => void;
    resetItemStates: () => void;

    activeDownloads: any[];
    addActiveDownload: (id: string, title: string, url: string) => void;
    updateActiveDownload: (id: string, state: Partial<ItemState>) => void;
    removeActiveDownload: (id: string) => void;

    activeStems: any[];
    addStemsTask: (filePath: string, title: string) => void;
    removeStemsTask: (filePath: string) => void;
    separateStems: (filePath: string, outDir: string, title: string) => Promise<any>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // History
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try { return JSON.parse(localStorage.getItem('downloadHistory') || '[]'); } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('downloadHistory', JSON.stringify(history));
    }, [history]);

    const addToHistory = useCallback((item: HistoryItem) => {
        setHistory(prev => prev.some(i => i.id === item.id) ? prev : [item, ...prev]);
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        if (confirm("¿Eliminar este sample de la librería?")) {
            setHistory(prev => prev.filter(item => item.id !== id));
        }
    }, []);

    const updateHistoryItem = useCallback((id: string, updates: Partial<HistoryItem>) => {
        setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }, []);

    const clearHistory = useCallback(() => {
        if (confirm("¿Borrar todo el historial?")) setHistory([]);
    }, []);

    // Item States (UI status for search results)
    const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
    const updateItemState = useCallback((id: string, state: Partial<ItemState>) => {
        setItemStates(prev => ({
            ...prev,
            [id]: { ...(prev[id] || { status: 'idle' }), ...state }
        }));
    }, []);
    const resetItemStates = useCallback(() => setItemStates({}), []);

    // Active Downloads
    const [activeDownloads, setActiveDownloads] = useState<any[]>([]);
    const addActiveDownload = useCallback((id: string, title: string, url: string) => {
        setActiveDownloads(prev => [...prev.filter(d => d.id !== id), { id, title, url, state: { status: 'loading', msg: 'Iniciando...' } }]);
    }, []);
    const updateActiveDownload = useCallback((id: string, state: Partial<ItemState>) => {
        setActiveDownloads(prev => prev.map(d => d.id === id ? { ...d, state: { ...d.state, ...state } } : d));
    }, []);
    const removeActiveDownload = useCallback((id: string) => {
        setActiveDownloads(prev => prev.filter(d => d.id !== id));
    }, []);

    // Active Stems
    const [activeStems, setActiveStems] = useState<any[]>([]);

    const updateStemsFromEvent = useCallback(({ filePath, fileName, type, data }: any) => {
        console.log(`[LibraryContext] stems:update event for ${fileName}:`, { type, data });
        setActiveStems(prev => {
            const existing = prev.find(s => s.filePath === filePath);
            const msg = type === 'progress'
                ? (typeof data === 'number' ? `Separando pistas...` : data)
                : (type === 'success' ? 'Completado' : data);

            if (!existing) {
                return [...prev, {
                    filePath, title: fileName,
                    status: type === 'progress' ? 'loading' : (type === 'success' ? 'success' : 'error'),
                    progress: typeof data === 'number' ? data : 0,
                    msg
                }];
            }
            return prev.map(s => {
                if (s.filePath === filePath) {
                    return {
                        ...s,
                        status: type === 'progress' ? 'loading' : (type === 'success' ? 'success' : 'error'),
                        progress: typeof data === 'number' ? data : s.progress,
                        msg,
                        data: type === 'success' ? data : s.data
                    };
                }
                return s;
            });
        });
    }, []);

    useEffect(() => {
        // Sync with backend on startup
        const syncStems = async () => {
            try {
                const statuses = await (window as any).api.getAllStemsStatuses();
                console.log("[LibraryContext] Synced stems from backend:", statuses);
                if (statuses && Array.isArray(statuses)) {
                    setActiveStems(statuses.map(s => ({
                        filePath: s.filePath,
                        title: s.fileName,
                        status: s.type === 'progress' ? 'loading' : (s.type === 'success' ? 'success' : 'error'),
                        progress: typeof s.data === 'number' ? s.data : 0,
                        msg: s.type === 'progress' ? (typeof s.data === 'number' ? `Separando pistas...` : s.data) : (s.type === 'success' ? 'Completado' : s.data),
                        data: s.type === 'success' ? s.data : null
                    })));
                }
            } catch (e) {
                console.error("Failed to sync stems:", e);
            }
        };
        syncStems();

        return (window as any).api.on('stems:update', updateStemsFromEvent);
    }, [updateStemsFromEvent]);

    const addStemsTask = useCallback((filePath: string, title: string) => {
        setActiveStems(prev => {
            if (prev.some(s => s.filePath === filePath)) return prev;
            return [...prev, { filePath, title, status: 'loading', progress: 0, msg: 'Iniciando...' }];
        });
    }, []);

    const removeStemsTask = useCallback((filePath: string) => {
        setActiveStems(prev => prev.filter(s => s.filePath !== filePath));
    }, []);

    const separateStems = useCallback(async (filePath: string, outDir: string, title: string) => {
        addStemsTask(filePath, title);
        try {
            return await (window as any).api.separateStems(filePath, outDir);
        } catch (e: any) {
            console.error("Separate Stems Error:", e);
            throw e;
        }
    }, [addStemsTask]);

    return (
        <LibraryContext.Provider value={{
            history, addToHistory, removeFromHistory, updateHistoryItem, clearHistory,
            itemStates, updateItemState, resetItemStates,
            activeDownloads, addActiveDownload, updateActiveDownload, removeActiveDownload,
            activeStems, addStemsTask, removeStemsTask, separateStems
        }}>
            {children}
        </LibraryContext.Provider>
    );
};

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) throw new Error('useLibrary must be used within LibraryProvider');
    return context;
};
