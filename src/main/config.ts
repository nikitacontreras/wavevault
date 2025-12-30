import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { ffmpegPath, ffprobeBinaryPath } from "./ffmpeg";

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
    projectPaths: string[]; // Nuevo: Rutas de carpetas de proyectos DAW
    keybinds: KeybindConfig[];
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
    keybinds: JSON.parse(JSON.stringify(DEFAULT_KEYBINDS))
};

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

export function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Failed to save config:", e);
    }
}

export function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
            Object.assign(config, data);
        }
    } catch (e) {
        console.error("Failed to load config:", e);
    }
}

// Initial load
loadConfig();



export function getPythonPath(): string {
    return config.pythonPath || "python3";
}

export function getFFmpegPath(): string {
    return config.ffmpegPath || (ffmpegPath as string);
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
    return config.keybinds;
}

