import { app, BrowserWindow, globalShortcut, nativeTheme, Notification, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs";
import { WindowManager } from "./managers/WindowManager";
import { setupIpcHandlers } from "./managers/IpcManager";
import { ShortcutManager } from "./managers/ShortcutManager";
import { TrayManager } from "./managers/TrayManager";
import { config } from "./config";

// App identity set in boot.js
const isMac = process.platform === 'darwin';
const appId = "com.strikemedia.wavevault";
app.setAppUserModelId(appId);

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

const wm = WindowManager.getInstance();
const sm = ShortcutManager.getInstance();
const tm = TrayManager.getInstance();

app.on('second-instance', () => {
    const win = wm.mainWindow;
    if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
        if (!win.isVisible()) win.show();
    }
});

app.whenReady().then(() => {
    const isDev = !app.isPackaged;
    const preloadPath = isDev
        ? path.resolve(__dirname, "../../dist/preload.js")
        : path.resolve(__dirname, "../preload.js");
    const rendererPath = isDev
        ? path.resolve(__dirname, "../../dist/renderer/index.html")
        : path.resolve(__dirname, "../renderer/index.html");

    // Menu template
    const template: any[] = [
        ...(isMac ? [{
            label: "WaveVault",
            submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
        }] : []),
        {
            label: "Edit",
            submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }]
        }
    ];

    if (isDev) {
        template.push({
            label: 'Debug',
            submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }]
        });
    }

    // Setup Handlers early to avoid race conditions
    setupIpcHandlers();

    // Initialize Windows
    wm.createMainWindow(preloadPath, rendererPath, isMac, template);
    wm.createSpotlightWindow(preloadPath, rendererPath);

    // Register Shortcuts
    sm.registerAll();

    // Create Tray
    tm.createTray();

    wm.updateAppIcon();

    nativeTheme.on('updated', () => wm.updateAppIcon());

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            wm.createMainWindow(preloadPath, rendererPath, isMac, template);
        }
    });
});

app.on("will-quit", () => {
    sm.unregisterAll();
});

// Broadcast helper
export function broadcastStatus(ok: boolean, message: string) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(w => {
        if (!w.isDestroyed()) w.webContents.send("status", { ok, message });
    });
}