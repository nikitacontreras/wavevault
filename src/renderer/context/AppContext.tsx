import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AppContextType {
    view: string;
    setView: (view: string) => void;
    version: string;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    debugMode: boolean;
    setDebugMode: (debug: boolean) => void;
    logs: string[];
    addLog: (msg: string) => void;
    clearLogs: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [view, setView] = useState("search");
    const [version, setVersion] = useState("...");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
    const [debugMode, setDebugMode] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        window.api.getAppVersion().then(setVersion);
    }, []);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
    }, [sidebarCollapsed]);

    useEffect(() => {
        const handleStatus = (p: { ok: boolean, message: string }) => {
            addLog(p.message);
        };
        return window.api.onStatus(handleStatus);
    }, []);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    // Secret Debug Key Sequence
    useEffect(() => {
        let sequence = "";
        const handleKeyPress = (e: KeyboardEvent) => {
            sequence = (sequence + e.key).slice(-5);
            if (sequence === "debug") {
                setDebugMode(true);
                sequence = "";
            }
        };
        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, []);

    return (
        <AppContext.Provider value={{
            view, setView, version, sidebarCollapsed, setSidebarCollapsed,
            debugMode, setDebugMode, logs, addLog, clearLogs
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
