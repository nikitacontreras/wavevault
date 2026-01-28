import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface KeybindConfig {
    id: string;
    name: string;
    description: string;
    accelerator: string;
    category: 'global' | 'app' | 'media';
    enabled: boolean;
}

interface AppConfig {
    pythonPath: string | null;
    ffmpegPath: string | null;
    ffprobePath: string | null;
    keybinds: KeybindConfig[];
    minimizeToTray: boolean;
    stemsQuality: 'standard' | 'best';
    format: 'mp3' | 'wav' | 'flac' | 'm4a' | 'ogg' | 'aiff';
    bitrate: string;
    sampleRate: string;
    normalize: boolean;
    outDir: string | null;
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    audioDeviceId: string;
    smartOrganize: boolean;
    discogsToken: string;
    lowPowerMode: boolean;
    volume: number;
}

interface SettingsContextType {
    config: AppConfig;
    updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
    updateKeybind: (id: string, accelerator: string) => Promise<void>;
    resetKeybinds: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_CONFIG: AppConfig = {
    pythonPath: localStorage.getItem('pythonPath') || '',
    ffmpegPath: localStorage.getItem('ffmpegPath') || '',
    ffprobePath: localStorage.getItem('ffprobePath') || '',
    keybinds: [],
    minimizeToTray: localStorage.getItem('minimizeToTray') !== 'false',
    stemsQuality: (localStorage.getItem('stemsQuality') as any) || 'standard',
    format: (localStorage.getItem('format') as any) || 'mp3',
    bitrate: localStorage.getItem('bitrate') || '192k',
    sampleRate: localStorage.getItem('sampleRate') || '44100',
    normalize: localStorage.getItem('normalize') === 'true',
    outDir: localStorage.getItem('outDir') || null,
    theme: (localStorage.getItem('theme') as any) || 'light',
    sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
    audioDeviceId: localStorage.getItem('audioDeviceId') || 'default',
    smartOrganize: localStorage.getItem('smartOrganize') === 'true',
    discogsToken: localStorage.getItem('discogsToken') || '',
    lowPowerMode: localStorage.getItem('lowPowerMode') === 'true',
    volume: parseFloat(localStorage.getItem('volume') || '0.8')
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

    const refreshConfig = async () => {
        try {
            const mainConfig = await (window as any).api.getConfig();
            const keybinds = await (window as any).api.getKeybinds();
            setConfig(prev => ({
                ...prev,
                ...mainConfig,
                keybinds
            }));
        } catch (error) {
            console.error('Failed to load main settings:', error);
        }
    };

    useEffect(() => {
        refreshConfig();
    }, []);

    const updateConfig = async (updates: Partial<AppConfig>) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);

        // Persist to localStorage
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                localStorage.setItem(key, value.toString());
            }
        });

        // Sync with Main Process
        try {
            await (window as any).api.updateConfig(updates);
        } catch (e) {
            console.error("Failed to sync config with main:", e);
        }
    };

    const updateKeybind = async (id: string, accelerator: string) => {
        try {
            const newKeybinds = await (window as any).api.updateKeybind(id, accelerator);
            if (newKeybinds) {
                setConfig(prev => ({ ...prev, keybinds: newKeybinds }));
            }
        } catch (error) {
            console.error('Failed to update keybind:', error);
        }
    };

    const resetKeybinds = async () => {
        try {
            const newKeybinds = await (window as any).api.resetKeybinds();
            if (newKeybinds) {
                setConfig(prev => ({ ...prev, keybinds: newKeybinds }));
            }
        } catch (error) {
            console.error('Failed to reset keybinds:', error);
        }
    };

    return (
        <SettingsContext.Provider value={{ config, updateConfig, updateKeybind, resetKeybinds }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};
