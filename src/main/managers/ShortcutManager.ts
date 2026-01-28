import { globalShortcut, clipboard, BrowserWindow } from 'electron';
import { config, getGlobalKeybinds } from '../config';
import { WindowManager } from './WindowManager';
import { fetchMeta, processJob } from '../downloader';
import { app } from 'electron';

export class ShortcutManager {
    static instance: ShortcutManager;

    private constructor() { }

    static getInstance() {
        if (!ShortcutManager.instance) {
            ShortcutManager.instance = new ShortcutManager();
        }
        return ShortcutManager.instance;
    }

    registerAll() {
        globalShortcut.unregisterAll();
        const globalKeybinds = getGlobalKeybinds();

        globalKeybinds.forEach(kb => {
            try {
                globalShortcut.register(kb.accelerator, () => {
                    this.handleAction(kb.id);
                });
            } catch (e) {
                console.error(`Failed to register shortcut ${kb.id}: ${kb.accelerator}`, e);
            }
        });
    }

    private handleAction(id: string) {
        const wm = WindowManager.getInstance();

        switch (id) {
            case 'spotlight':
                this.toggleSpotlight();
                break;
            case 'clipboard':
                this.processClipboard();
                break;
            // Media keys can be handled here if they are global
        }
    }

    private toggleSpotlight() {
        const wm = WindowManager.getInstance();
        if (!wm.spotlightWindow) {
            // This should ideally be handled by WindowManager
            // But for now let's assume it's created or we trigger creation
            return;
        }

        if (wm.spotlightWindow.isVisible()) {
            wm.spotlightWindow.hide();
        } else {
            wm.spotlightWindow.show();
            wm.spotlightWindow.focus();
        }
    }

    private async processClipboard() {
        const text = clipboard.readText();
        if (!text || !text.startsWith('http')) return;

        try {
            // We might want to notify the user that we are processing
            const meta = await fetchMeta(text);
            if (meta) {
                await processJob({
                    url: text,
                    outDir: app.getPath("music"),
                    format: 'mp3',
                    bitrate: '320k',
                    sampleRate: '44100',
                    normalize: false,
                    smartOrganize: true,
                    signal: new AbortController().signal
                });
            }
        } catch (e) {
            console.error("Failed to process clipboard link:", e);
        }
    }

    unregisterAll() {
        globalShortcut.unregisterAll();
    }
}
