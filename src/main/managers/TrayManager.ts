import { app, Tray, Menu, nativeImage, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import { WindowManager } from './WindowManager';

export class TrayManager {
    static instance: TrayManager;
    tray: Tray | null = null;

    private constructor() { }

    static getInstance() {
        if (!TrayManager.instance) {
            TrayManager.instance = new TrayManager();
        }
        return TrayManager.instance;
    }

    private getTrayIconPath() {
        // Simple heuristic for tray icon
        let iconPath = path.join(process.cwd(), 'resources', 'tray_icon.png');
        if (fs.existsSync(iconPath)) return iconPath;

        // Fallback to main icon
        iconPath = path.join(process.cwd(), 'build', 'icon.png');
        if (fs.existsSync(iconPath)) return iconPath;

        return path.join(process.cwd(), 'icon.png');
    }

    createTray() {
        if (this.tray) return this.tray;

        const iconPath = this.getTrayIconPath();
        if (!fs.existsSync(iconPath)) {
            console.warn("Tray icon not found, skipping tray creation");
            return null;
        }

        const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        this.tray = new Tray(icon);
        this.tray.setToolTip('WaveVault');

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show WaveVault',
                click: () => {
                    WindowManager.getInstance().mainWindow?.show();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
        this.tray.on('double-click', () => {
            WindowManager.getInstance().mainWindow?.show();
        });

        return this.tray;
    }

    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }
}
