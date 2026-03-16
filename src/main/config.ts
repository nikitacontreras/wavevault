import { ffmpegBinaryPath, ffprobeBinaryPath } from "./ffmpeg";
import { getConfigDB, setConfigDB } from "./db";

export interface KeybindConfig {
    id: string;
    name: string;
    description: string;
    accelerator: string;
    category: 'global' | 'app' | 'media';
    enabled: boolean;
}

export interface AppConfig {
    pythonPath: string | null;
    ffmpegPath: string | null;
    ffprobePath: string | null;
    projectPaths: string[];
    keybinds: KeybindConfig[];
    minimizeToTray: boolean;
    stemsQuality: 'standard' | 'best' | 'pro';
    autoCheckUpdates: boolean;
}

export const DEFAULT_KEYBINDS: KeybindConfig[] = [
    {
        id: 'spotlight',
        name: 'Abrir Spotlight',
        description: 'Abre la ventana rápida de búsqueda',
        accelerator: 'CommandOrControl+Shift+Space',
        category: 'global',
        enabled: true
    },
    {
        id: 'clipboard',
        name: 'Procesar Portapapeles',
        description: 'Descarga el audio del enlace en el portapapeles',
        accelerator: 'CommandOrControl+Shift+Y',
        category: 'global',
        enabled: true
    },
    {
        id: 'playPause',
        name: 'Reproducir/Pausar',
        description: 'Controla la reproducción del audio actual',
        accelerator: 'Space',
        category: 'media',
        enabled: true
    },
    {
        id: 'stop',
        name: 'Detener',
        description: 'Detiene la reproducción actual',
        accelerator: 'Escape',
        category: 'media',
        enabled: true
    }
];

export const config: AppConfig = {
    pythonPath: null,
    ffmpegPath: null,
    ffprobePath: null,
    projectPaths: [],
    keybinds: JSON.parse(JSON.stringify(DEFAULT_KEYBINDS)),
    minimizeToTray: true,
    stemsQuality: 'standard',
    autoCheckUpdates: true
};

export function saveConfig() {
    try {
        setConfigDB('app_config', config);
    } catch (e) {
        console.error("Failed to save config to DB:", e);
    }
}

export function loadConfig() {
    try {
        const data = getConfigDB('app_config');
        if (data) {
            Object.assign(config, data);
        }
    } catch (e) {
        console.error("Failed to load config from DB:", e);
    }
}

// Note: loadConfig() is called explicitly from IpcManager or Main startup
// to avoid issues with DB initialization order.

export function getPythonPath(): string {
    if (config.pythonPath && config.pythonPath.trim().length > 0) {
        return config.pythonPath;
    }
    return "python3";
}

export function getFFmpegPath(): string {
    return config.ffmpegPath || (ffmpegBinaryPath as string);
}

export function getFFprobePath(): string {
    return config.ffprobePath || (ffprobeBinaryPath as string);
}

export function getKeybind(id: string): KeybindConfig | undefined {
    return config.keybinds.find(k => k.id === id);
}

export function updateKeybind(id: string, accelerator: string): boolean {
    const keybind = config.keybinds.find(k => k.id === id);
    if (keybind) {
        keybind.accelerator = accelerator;
        saveConfig();
        return true;
    }
    return false;
}

export function getGlobalKeybinds(): KeybindConfig[] {
    return config.keybinds.filter(k => k.category === 'global' && k.enabled);
}

export function getMediaKeybinds(): KeybindConfig[] {
    return config.keybinds.filter(k => k.category === 'media' && k.enabled);
}

export function resetKeybinds(): KeybindConfig[] {
    config.keybinds = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    saveConfig();
    return config.keybinds;
}
