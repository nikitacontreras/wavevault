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
    useEffect(() => {
        return window.api.on('stems:update', ({ filePath, fileName, type, data }: any) => {
            setActiveStems(prev => {
                const existing = prev.find(s => s.filePath === filePath);
                if (!existing) {
                    return [...prev, {
                        filePath, title: fileName,
                        status: type === 'progress' ? 'loading' : 'idle',
                        progress: type === 'progress' ? data : 0,
                        msg: type === 'progress' ? `Procesando... ${data}%` : data
                    }];
                }
                return prev.map(s => {
                    if (s.filePath === filePath) {
                        if (type === 'progress') return { ...s, status: 'loading', progress: data, msg: `Separando... ${data}%` };
                        if (type === 'success') return { ...s, status: 'success', progress: 100, msg: 'Completado' };
                        if (type === 'error') return { ...s, status: 'error', msg: data };
                    }
                    return s;
                });
            });
        });
    }, []);

    const addStemsTask = useCallback((filePath: string, title: string) => {
        setActiveStems(prev => [...prev.filter(s => s.filePath !== filePath), { filePath, title, status: 'loading', progress: 0, msg: 'En cola...' }]);
    }, []);
    const removeStemsTask = useCallback((filePath: string) => {
        setActiveStems(prev => prev.filter(s => s.filePath !== filePath));
    }, []);

    return (
        <LibraryContext.Provider value={{
            history, addToHistory, removeFromHistory, updateHistoryItem, clearHistory,
            itemStates, updateItemState, resetItemStates,
            activeDownloads, addActiveDownload, updateActiveDownload, removeActiveDownload,
            activeStems, addStemsTask, removeStemsTask
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
