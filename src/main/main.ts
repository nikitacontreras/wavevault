import { app, BrowserWindow, globalShortcut, ipcMain, clipboard, dialog, shell, Menu, Notification, Tray, nativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import path from "node:path";
import fs from "node:fs";


process.title = "WaveVault";
app.name = "WaveVault";
if (app.setName) app.setName("WaveVault");

const isMac = process.platform === 'darwin';

// Read version from package.json
const pkg = require(path.join(__dirname, "../../package.json"));

if (!app.isPackaged) {
    Object.defineProperty(app, 'getVersion', {
        value: () => pkg.version
    });
}

if (isMac) {
    app.setAboutPanelOptions({
        applicationName: "WaveVault",
        applicationVersion: pkg.version
    });
}

function broadcastStatus(ok: boolean, message: string) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(w => {
        if (!w.isDestroyed()) {
            w.webContents.send("status", { ok, message });
        }
    });
}

const template = [
    ...(isMac ? [{
        label: "WaveVault",
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    }] : []),
    {
        label: "Edit",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" }
        ]
    }
];



import { processJob, searchYoutube, fetchMeta, getStreamUrl } from "./downloader";
import { checkDependencies } from "./dependencies";
import { config, saveConfig, resetKeybinds } from "./config";
import { scanProjects } from "./projects";
import { getFullProjectDB, createAlbumDB, createTrackDB, moveVersionToTrackDB, updateTrackMetaDB, deleteTrackDB, updateAlbumDB, deleteAlbumDB, deleteVersionDB, setConfigDB, getConfigDB, getWorkspacesDB, addWorkspaceDB, removeWorkspaceDB } from "./db";


// ...

// IPC: Show item in folder
ipcMain.handle("show-item", async (_evt: any, filepath: string) => {

    shell.showItemInFolder(filepath);
});

import { TargetFormat, Bitrate } from "./types";

let win: BrowserWindow;
let spotlightWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;


function createWindow() {
    const inDist = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.endsWith(path.sep + 'dist');
    const isDev = !inDist;

    let preloadPath = "";
    let rendererPath = "";

    if (isDev) {
        preloadPath = path.resolve(__dirname, "../../dist/preload.js");
        rendererPath = path.resolve(__dirname, "../../dist/renderer/index.html");

        template.push({
            label: 'debug',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        })
    } else {
        preloadPath = path.resolve(__dirname, "../preload.js");
        rendererPath = path.resolve(__dirname, "../renderer/index.html");
    }

    const menu = Menu.buildFromTemplate(template as any);
    Menu.setApplicationMenu(isMac ? menu : null);

    console.log("Running in:", isDev ? "DEV" : "PROD");
    console.log("Preload:", preloadPath);
    console.log("Renderer:", rendererPath);

    win = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: "#ffffff",

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


    win.loadFile(rendererPath);
    // win.webContents.openDevTools(); // Optional: debug

    win.on('close', (event) => {
        if (!isQuitting && config.minimizeToTray) {
            event.preventDefault();
            win.hide();
            return false;
        }
    });
}

function createTray() {
    if (tray) return;

    const inDist = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.endsWith(path.sep + 'dist');
    const isDev = !inDist;
    const iconPath = isDev
        ? path.join(__dirname, "../../icon.png")
        : path.join(process.resourcesPath, "icon.png");

    // Fallback if the path above fails in some production environments
    const finalIconPath = fs.existsSync(iconPath) ? iconPath : path.join(__dirname, "icon.png");

    const icon = nativeImage.createFromPath(finalIconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Mostrar WaveVault', click: () => win?.show() },
        { type: 'separator' },
        {
            label: 'Salir de WaveVault',
            click: async () => {
                const choice = await dialog.showMessageBox({
                    type: 'question',
                    buttons: ['Cancelar', 'Salir'],
                    title: 'Confirmación',
                    message: '¿Estás seguro de que quieres cerrar WaveVault por completo?',
                    defaultId: 1,
                    cancelId: 0
                });
                if (choice.response === 1) {
                    isQuitting = true;
                    app.quit();
                }
            }
        }
    ]);

    tray.setToolTip('WaveVault');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (win) {
            win.isVisible() ? win.hide() : win.show();
        }
    });
}

function registerShortcuts() {
    globalShortcut.unregisterAll();

    // Register global keybinds
    const globalKeybinds = config.keybinds.filter(k => k.category === 'global' && k.enabled);

    globalKeybinds.forEach(keybind => {
        try {
            globalShortcut.register(keybind.accelerator, () => {
                handleKeybindAction(keybind.id);
            });
            console.log(`Registered keybind: ${keybind.name} (${keybind.accelerator})`);
        } catch (e) {
            console.error(`Failed to register keybind ${keybind.name}:`, e);
        }
    });
}




function broadcastDownloadStarted(url: string, title: string) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(w => {
        if (!w.isDestroyed()) {
            w.webContents.send("download-started", { url, title });
        }
    });
}

function broadcastDownloadSuccess(url: string, result: any) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(w => {
        if (!w.isDestroyed()) {
            w.webContents.send("download-success", { url, result });
        }
    });

    // Send native OS notification
    if (Notification.isSupported()) {
        new Notification({
            title: "WaveVault - Descarga Finalizada",
            body: `Se ha descargado correctamente: ${result.title || path.basename(result.path)}`,
            silent: false,
            icon: path.join(__dirname, "../../assets/icon.png") // Optional: check if icon exists
        }).show();
    }
}



function handleKeybindAction(keybindId: string) {
    switch (keybindId) {
        case 'spotlight':
            if (spotlightWin && !spotlightWin.isDestroyed()) {
                if (spotlightWin.isVisible()) {
                    spotlightWin.hide();
                } else {
                    spotlightWin.show();
                    spotlightWin.focus();
                }
            } else {
                createSpotlightWindow();
            }
            break;

        case 'clipboard':
            clipboardProcess();
            break;

        case 'playPause':
            broadcastStatus(true, "Comando: Reproducir/Pausar");
            const activeWin = BrowserWindow.getFocusedWindow() || win;
            if (activeWin) activeWin.webContents.send("command", "playPause");
            break;

        case 'stop':
            broadcastStatus(true, "Comando: Detener");
            const stopWin = BrowserWindow.getFocusedWindow() || win;
            if (stopWin) stopWin.webContents.send("command", "stop");
            break;
    }
}


async function clipboardProcess() {
    try {
        const text = clipboard.readText().trim();
        if (!text) return;

        const { processJob, fetchMeta } = require("./downloader");

        // Broadcast starting info
        const meta = await fetchMeta(text).catch(() => ({ title: text, id: text }));
        broadcastDownloadStarted(text, meta.title);
        broadcastStatus(true, `Portapapeles: Iniciando ${meta.title}`);

        const dir = app.getPath("music");
        const result = await processJob({
            url: text,
            outDir: dir,
            format: "m4a",
            bitrate: "192k",
            sampleRate: "44100",
            normalize: false
        });

        broadcastDownloadSuccess(text, result);
        broadcastStatus(true, `Descarga completada: ${path.basename(result.path)}`);
    } catch (e: any) {
        broadcastStatus(false, e?.message ?? String(e));
    }
}




function createSpotlightWindow() {
    if (spotlightWin) {
        spotlightWin.focus();
        return;
    }

    const inDist = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.endsWith(path.sep + 'dist');
    const isDev = !inDist;

    let preloadPath = "";
    let rendererPath = "";

    if (isDev) {
        preloadPath = path.resolve(__dirname, "../../dist/preload.js");
        rendererPath = path.resolve(__dirname, "../../dist/renderer/index.html");
    } else {
        preloadPath = path.resolve(__dirname, "../preload.js");
        rendererPath = path.resolve(__dirname, "../renderer/index.html");
    }

    spotlightWin = new BrowserWindow({
        width: 600,
        height: 80,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        center: true,
        backgroundColor: "#00000000",
        vibrancy: "under-window",
        visualEffectState: "active",
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webSecurity: false
        }
    });

    spotlightWin.loadURL(`file://${rendererPath}#/spotlight`);

    spotlightWin.on("blur", () => {
        if (spotlightWin) {
            spotlightWin.hide();
        }
    });

    spotlightWin.on("closed", () => {
        spotlightWin = null;
    });
}

let isManualCheck = false;

function setupAutoUpdater() {
    if (!app.isPackaged) {
        autoUpdater.forceDevUpdateConfig = true;
    }

    autoUpdater.autoDownload = false;

    // Check on startup (silent)
    autoUpdater.checkForUpdates().catch(e => console.error(e));

    autoUpdater.on('checking-for-update', () => {
        if (isManualCheck) broadcastStatus(true, "Buscando actualizaciones...");
    });

    autoUpdater.on('update-available', (info) => {
        broadcastStatus(true, `Nueva versión encontrada: ${info.version}`);

        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización disponible',
            message: `Hay una nueva versión disponible (${info.version}). ¿Quieres descargarla?`,
            detail: "La descarga se realizará en segundo plano.",
            buttons: ['Sí, descargar', 'No, gracias']
        }).then((result) => {
            if (result.response === 0) {
                broadcastStatus(true, "Iniciando descarga de actualización...");
                autoUpdater.downloadUpdate();
            } else {
                broadcastStatus(true, "Actualización cancelada por el usuario.");
                isManualCheck = false;
            }
        });
    });

    autoUpdater.on('update-not-available', () => {
        if (isManualCheck) {
            dialog.showMessageBox({
                type: 'info',
                title: 'Sin actualizaciones',
                message: 'WaveVault está actualizado.',
                detail: `Versión actual: ${app.getVersion()}`
            });
            broadcastStatus(true, "El sistema está actualizado.");
            isManualCheck = false;
        }
    });

    autoUpdater.on('update-downloaded', () => {
        broadcastStatus(true, "Actualización descargada.");

        dialog.showMessageBox({
            type: 'question',
            title: 'Actualización lista',
            message: 'La actualización se ha descargado correctamente.',
            detail: '¿Deseas reiniciar ahora para instalarla?',
            buttons: ['Reiniciar y Actualizar', 'Más tarde']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    autoUpdater.on('error', (err) => {
        console.error("Auto-updater error:", err);
        if (isManualCheck) {
            dialog.showErrorBox('Error de actualización', 'No se pudo verificar la actualización. Revisa tu conexión.');
            isManualCheck = false;
        }
        broadcastStatus(false, "Error al buscar actualizaciones.");
    });
}


app.whenReady().then(() => {
    createWindow();
    registerShortcuts();
    createTray();
    setupAutoUpdater();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

// Track active jobs for cancellation
const activeJobs = new Map<string, AbortController>();

function broadcastDownloadError(url: string, error: string) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(w => {
        if (!w.isDestroyed()) {
            w.webContents.send("download-error", { url, error });
        }
    });
}

// IPC: procesar descarga desde UI
ipcMain.handle("download", async (_evt: any, url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string, smartOrganize?: boolean) => {

    const dir = outDir || app.getPath("music");

    const controller = new AbortController();
    activeJobs.set(url, controller);

    try {
        // Try to get meta first to broadcast a nice title
        const meta = await fetchMeta(url);

        if (controller.signal.aborted) throw new Error("Aborted");

        broadcastDownloadStarted(url, meta.title);
        broadcastStatus(true, `Iniciando descarga: ${meta.title}`);

        const result = await processJob({
            url,
            outDir: dir,
            format: format as any,
            bitrate: bitrate as any,
            sampleRate: sampleRate as any,
            normalize,
            signal: controller.signal,
            smartOrganize // Pass the new flag
        });

        broadcastDownloadSuccess(url, result);
        broadcastStatus(true, `Descarga completada: ${path.basename(result.path)}`);

        return result;
    } catch (e: any) {
        if (e.message === "Aborted") {
            broadcastStatus(true, `Descarga cancelada: ${url}`);
        } else {
            console.error("Download error:", e);
            broadcastStatus(false, e.message);
            broadcastDownloadError(url, e.message);
        }
        throw e;
    } finally {
        activeJobs.delete(url);
    }
});

ipcMain.handle("cancel-download", (_evt, url) => {
    const controller = activeJobs.get(url);
    if (controller) {
        controller.abort();
        activeJobs.delete(url);
    }
});


// IPC: obtener URL de stream (para preview)
ipcMain.handle("getStreamUrl", async (_evt: any, url: string) => {
    return await getStreamUrl(url);
});


// IPC: búsqueda
ipcMain.handle("search", async (_evt: any, query: string) => {
    return await searchYoutube(query);
});


ipcMain.handle("getMeta", async (_evt: any, url: string) => {
    return await fetchMeta(url);
});


// Diálogo para elegir carpeta
ipcMain.handle("pick-dir", async () => {
    const r = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return r.canceled ? null : r.filePaths[0];
});

// Diálogo para elegir archivo (ejecutable)
ipcMain.handle("pick-file", async (_evt, filters: any[]) => {
    const r = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: filters || []
    });
    return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("update-config", async (_evt: any, newConfig: Partial<typeof config>) => {
    // Handle keybinds updates
    if (newConfig.keybinds) {
        config.keybinds = newConfig.keybinds;
        delete newConfig.keybinds;
        registerShortcuts();
    }

    // Handle legacy shortcuts for backward compatibility
    if ((newConfig as any).shortcuts) {
        const legacyShortcuts = (newConfig as any).shortcuts;
        if (legacyShortcuts.spotlight) {
            const spotlightKeybind = config.keybinds.find(k => k.id === 'spotlight');
            if (spotlightKeybind) spotlightKeybind.accelerator = legacyShortcuts.spotlight;
        }
        if (legacyShortcuts.clipboard) {
            const clipboardKeybind = config.keybinds.find(k => k.id === 'clipboard');
            if (clipboardKeybind) clipboardKeybind.accelerator = legacyShortcuts.clipboard;
        }
        delete (newConfig as any).shortcuts;
        registerShortcuts();
    }

    Object.assign(config, newConfig);

    // Apply FFmpeg/Analyzer updates immediately
    if (newConfig.ffmpegPath !== undefined || newConfig.ffprobePath !== undefined) {
        const { setupFfmpeg } = require("./ffmpeg");
        setupFfmpeg(config.ffmpegPath, config.ffprobePath);
    }

    saveConfig();
    return true;
});



ipcMain.handle("trim-audio", async (_evt: any, src: string, start: number, end: number) => {
    const { trimAudio } = require("./downloader");
    return await trimAudio(src, start, end);
});


ipcMain.handle("check-dependencies", async (_evt: any, manualPaths?: any) => {
    return await checkDependencies(manualPaths);
});


ipcMain.handle("close-spotlight", () => {
    if (spotlightWin) {
        spotlightWin.hide();
    }
});

ipcMain.handle("resize-spotlight", (_evt: any, height: number) => {
    if (spotlightWin) {
        spotlightWin.setBounds({ height: Math.round(height) });
    }
});

ipcMain.handle("get-keybinds", () => {
    return config.keybinds;
});

ipcMain.handle("reset-keybinds", () => {
    const { resetKeybinds } = require("./config");
    const newKeybinds = resetKeybinds();
    registerShortcuts();
    return newKeybinds;
});

ipcMain.handle("check-for-updates", async () => {
    isManualCheck = true;
    return await autoUpdater.checkForUpdates();
});

ipcMain.handle("get-app-version", () => {
    return pkg.version;
});

ipcMain.handle("open-external", async (_evt, url) => {
    shell.openExternal(url);
});

ipcMain.handle("get-workspaces", () => {
    return getWorkspacesDB();
});

ipcMain.handle("add-workspace", async (_evt, name: string, path: string) => {
    const ws = addWorkspaceDB(name, path);
    // Auto-scan after adding
    await scanProjects(path, ws.id);
    return ws;
});

ipcMain.handle("remove-workspace", (_evt, id: string) => {
    return removeWorkspaceDB(id);
});

ipcMain.handle("scan-projects", async () => {
    const workspaces = getWorkspacesDB();
    const results = [];
    for (const ws of workspaces) {
        const projs = await scanProjects(ws.path, ws.id);
        results.push(...projs);
    }
    return results;
});

ipcMain.handle("get-project-db", () => {
    return getFullProjectDB();
});

ipcMain.handle("create-album", (_evt, name: string, artist: string) => {
    return createAlbumDB(name, artist);
});

ipcMain.handle("create-track", (_evt, name: string, albumId: string) => {
    return createTrackDB(name, albumId);
});

ipcMain.handle("add-project-version", async (_evt, trackId: string, filePath?: string) => {
    // This handler is now mostly handled via Inbox -> Move, but keeping for direct adds if needed
    // For now, let's just use it to pick and add to Inbox
    if (!filePath) {
        const picked = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'FL Studio Projects', extensions: ['flp', 'zip'] }]
        });
        if (picked.canceled) return null;
        filePath = picked.filePaths[0];
    }
    const { addToUnorganizedDB } = require("./db");
    const stats = require("fs").statSync(filePath);
    const version = {
        id: "VER-" + stats.ino || Date.now().toString(),
        name: require("path").basename(filePath),
        path: filePath,
        type: (require("path").extname(filePath).toLowerCase() === '.flp' ? 'flp' : 'zip') as any,
        lastModified: stats.mtimeMs
    };
    addToUnorganizedDB(version);
    return version;
});

ipcMain.handle("update-track-meta", (_evt, trackId: string, updates: any) => {
    return updateTrackMetaDB(trackId, updates);
});

ipcMain.handle("move-project-version", (_evt, versionId: string, trackId: string) => {
    return moveVersionToTrackDB(versionId, trackId);
});

ipcMain.handle("delete-track", (_evt, trackId: string) => {
    return deleteTrackDB(trackId);
});

ipcMain.handle("update-album", (_evt, albumId: string, updates: any) => {
    return updateAlbumDB(albumId, updates);
});

ipcMain.handle("delete-album", (_evt, albumId: string) => {
    return deleteAlbumDB(albumId);
});

ipcMain.handle("delete-version", (_evt, versionId: string) => {
    return deleteVersionDB(versionId);
});

ipcMain.handle("detect-daws", async () => {
    const daws: { name: string, path: string, version: string }[] = [];
    const isMac = process.platform === "darwin";

    if (isMac) {
        const appsDir = "/Applications";
        try {
            const files = require("fs").readdirSync(appsDir);
            for (const file of files) {
                if (file.toLowerCase().includes("fl studio")) {
                    const fullPath = require("path").join(appsDir, file, "Contents/MacOS/FL Studio");
                    if (require("fs").existsSync(fullPath)) {
                        daws.push({ name: file.replace(".app", ""), path: fullPath, version: file.match(/\d+/)?.[0] || "Unknown" });
                    }
                }
            }
        } catch (e) { }
    } else {
        // Windows
        const progFiles = process.env["ProgramFiles"] || "C:\\Program Files";
        const ilDir = require("path").join(progFiles, "Image-Line");
        try {
            if (require("fs").existsSync(ilDir)) {
                const versions = require("fs").readdirSync(ilDir);
                for (const v of versions) {
                    if (v.toLowerCase().includes("fl studio")) {
                        const exePath = require("path").join(ilDir, v, "FL64.exe");
                        if (require("fs").existsSync(exePath)) {
                            daws.push({ name: v, path: exePath, version: v.match(/\d+/)?.[0] || "Unknown" });
                        }
                    }
                }
            }
        } catch (e) { }
    }
    return daws;
});

ipcMain.handle("save-daw-path", (_evt, daw: any) => {
    const db = require("./db").default;
    db.prepare('INSERT OR REPLACE INTO daw_paths (id, name, path, version) VALUES (?, ?, ?, ?)').run(daw.path, daw.name, daw.path, daw.version);
    return true;
});

ipcMain.handle("get-daw-paths", () => {
    const db = require("./db").default;
    return db.prepare('SELECT * FROM daw_paths').all();
});


ipcMain.handle("window-minimize", () => {
    if (win) win.minimize();
});

ipcMain.handle("window-toggle-maximize", () => {
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.handle("window-close", () => {
    if (win) win.close();
});

ipcMain.on("start-drag", (event, filepath: string, iconpath?: string) => {
    if (!filepath) return;
    const fs = require('fs');
    const { nativeImage } = require('electron');
    const path = require('path');

    // Ensure absolute path
    const absolutePath = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);

    if (!fs.existsSync(absolutePath)) {
        broadcastStatus(false, `No se puede arrastrar: El archivo no existe en ${absolutePath}`);
        return;
    }

    let finalIcon;
    try {
        if (iconpath && !iconpath.startsWith("http") && fs.existsSync(iconpath)) {
            finalIcon = nativeImage.createFromPath(iconpath).resize({ height: 48 });
        } else {
            const appIconPath = path.join(__dirname, "../../icon.png");
            if (fs.existsSync(appIconPath)) {
                finalIcon = nativeImage.createFromPath(appIconPath).resize({ height: 48 });
            } else {
                finalIcon = nativeImage.createEmpty();
            }
        }
    } catch (e) {
        finalIcon = nativeImage.createEmpty();
    }

    event.sender.startDrag({
        file: absolutePath,
        icon: finalIcon
    });
});

// Capture Global Main Process Errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    broadcastStatus(false, `[Main Process Error] ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    broadcastStatus(false, `[Main Process Rejection] ${String(reason)}`);
});

ipcMain.handle("get-platform-info", () => {
    return `${process.platform}-${process.arch}`;
});