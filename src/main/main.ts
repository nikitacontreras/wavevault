const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, dialog, shell, Menu } = require("electron");
process.title = "WaveVault";
app.name = "WaveVault";
if (app.setName) app.setName("WaveVault");

const isMac = process.platform === 'darwin';

if (isMac) {
    app.setAboutPanelOptions({
        applicationName: "WaveVault",
        applicationVersion: "1.0.0"
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
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' }
        ]
    },
    {
        label: 'View',
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
    },
    {
        role: 'window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ] : [
                { role: 'close' }
            ])
        ]
    }
];

const menu = Menu.buildFromTemplate(template as any);
Menu.setApplicationMenu(isMac ? menu : null);

import path from "node:path";
import { processJob, searchYoutube, fetchMeta, getStreamUrl } from "./downloader";
import { checkDependencies } from "./dependencies";
import { config } from "./config";


// ...

// IPC: Show item in folder
ipcMain.handle("show-item", async (_evt, filepath: string) => {
    shell.showItemInFolder(filepath);
});

// In CJS, __dirname is available.
// If needed, we can use path.resolve() if __dirname is tricky, but usually it works.
// const _dirname = path.resolve();

// Actually, in Electron main process with CJS, __dirname is safe.
// Let's just use __dirname directly in the code and rely
import { TargetFormat, Bitrate } from "./types";

let win: BrowserWindow;

function createWindow() {
    // Determine if we are running from source (dev) or built (prod)
    // In dev: __dirname is .../src/main (running via ts-node/tsx)
    // In prod: __dirname is .../resources/app.asar/dist/main (bundled) or .../dist/main

    // Check if we are in 'dist' folder
    const inDist = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.endsWith(path.sep + 'dist');
    const isDev = !inDist;

    let preloadPath = "";
    let rendererPath = "";

    if (isDev) {
        // Dev: project root is two levels up from src/main
        preloadPath = path.resolve(__dirname, "../../dist/preload.js");
        rendererPath = path.resolve(__dirname, "../../dist/renderer/index.html");
    } else {
        // Prod: project root is one level up from dist/main
        preloadPath = path.resolve(__dirname, "../preload.js");
        rendererPath = path.resolve(__dirname, "../renderer/index.html");
    }

    console.log("Running in:", isDev ? "DEV" : "PROD");
    console.log("Preload:", preloadPath);
    console.log("Renderer:", rendererPath);

    win = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: "#0a0a0a",
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
}

app.whenReady().then(() => {
    createWindow();

    // Atajo global: Ctrl/Cmd+Shift+Y → toma URL del portapapeles y procesa
    globalShortcut.register("CommandOrControl+Shift+Y", async () => {
        try {
            const text = clipboard.readText().trim();
            if (!text) return;
            const outDir = app.getPath("music"); // destino por defecto
            const dest = await processJob({
                url: text,
                outDir,
                format: "m4a",
                bitrate: "192k",
                sampleRate: "44100",
                normalize: false
            }); // default
            win.webContents.send("status", { ok: true, message: dest });
        } catch (e: any) {
            win.webContents.send("status", { ok: false, message: e?.message ?? String(e) });
        }
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

// IPC: procesar descarga desde UI
ipcMain.handle("download", async (_evt, url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string) => {
    const dir = outDir || app.getPath("music");
    const dest = await processJob({
        url,
        outDir: dir,
        format: format as any,
        bitrate: bitrate as any,
        sampleRate: sampleRate as any,
        normalize
    });
    return dest;
});

// IPC: obtener URL de stream (para preview)
ipcMain.handle("getStreamUrl", async (_evt, url: string) => {
    return await getStreamUrl(url);
});

// IPC: búsqueda
ipcMain.handle("search", async (_evt, query: string) => {
    return await searchYoutube(query);
});

ipcMain.handle("getMeta", async (_evt, url: string) => {
    return await fetchMeta(url);
});

// Diálogo para elegir carpeta
ipcMain.handle("pick-dir", async () => {
    const r = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return r.canceled ? null : r.filePaths[0];
});

// Diálogo para elegir archivo (ejecutable)
ipcMain.handle("pick-file", async () => {
    const r = await dialog.showOpenDialog({ properties: ["openFile"] });
    return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("update-config", async (_evt, newConfig: Partial<typeof config>) => {
    Object.assign(config, newConfig);
    return true;
});


ipcMain.handle("trim-audio", async (_evt, src: string, start: number, end: number) => {
    const { trimAudio } = require("./downloader");
    return await trimAudio(src, start, end);
});

ipcMain.handle("check-dependencies", async (_evt, manualPaths?: any) => {
    return await checkDependencies(manualPaths);
});