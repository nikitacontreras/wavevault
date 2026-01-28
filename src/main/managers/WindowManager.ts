import { BrowserWindow, nativeTheme, shell, Menu, app } from 'electron';
import path from 'path';
import fs from 'fs';

export class WindowManager {
    static instance: WindowManager;
    mainWindow: BrowserWindow | null = null;
    spotlightWindow: BrowserWindow | null = null;

    private constructor() { }

    static getInstance() {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }

    private getAppIconPath() {
        let iconPath = path.join(process.cwd(), 'build', 'icon.png');
        if (fs.existsSync(iconPath)) return iconPath;
        iconPath = path.join(process.cwd(), 'icon.png');
        if (fs.existsSync(iconPath)) return iconPath;
        return undefined;
    }

    updateAppIcon() {
        const iconPath = this.getAppIconPath();
        if (process.platform === 'darwin' && app.dock && iconPath) {
            app.dock.setIcon(iconPath);
        }
        if (this.mainWindow && iconPath) {
            this.mainWindow.setIcon(iconPath);
        }
    }

    createMainWindow(preloadPath: string, rendererPath: string, isMac: boolean, template: any[]) {
        const isDark = nativeTheme.shouldUseDarkColors;

        this.mainWindow = new BrowserWindow({
            width: 1000,
            height: 700,
            backgroundColor: isDark ? "#0c0c0c" : "#ffffff",
            show: false,
            titleBarStyle: "hidden",
            trafficLightPosition: { x: 15, y: 15 },
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false
            }
        });

        const menu = Menu.buildFromTemplate(template as any);
        Menu.setApplicationMenu(isMac ? menu : null);

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        this.mainWindow.loadFile(rendererPath);

        this.mainWindow.on('close', (event) => {
            // This logic will be handled by the orchestrator
        });

        return this.mainWindow;
    }

    createSpotlightWindow(preloadPath: string, rendererPath: string) {
        if (this.spotlightWindow) return this.spotlightWindow;

        this.spotlightWindow = new BrowserWindow({
            width: 700,
            height: 450,
            show: false,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                webSecurity: false
            }
        });

        this.spotlightWindow.loadFile(rendererPath, { hash: '/spotlight' });

        this.spotlightWindow.on('blur', () => {
            this.spotlightWindow?.hide();
        });

        return this.spotlightWindow;
    }
}
