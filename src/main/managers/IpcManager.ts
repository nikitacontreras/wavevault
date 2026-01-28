import { ipcMain, dialog, app, shell, clipboard } from 'electron';
import fs from 'fs';
import { createSuccessResponse, createErrorResponse } from '../core/ApiResponse';
import { processJob, fetchMeta, getStreamUrl, searchYoutube, batchSearchAndStream, fetchPlaylistMeta } from '../downloader';
import { config, saveConfig, resetKeybinds } from '../config';
import {
    getFullProjectDB, createAlbumDB, createTrackDB, moveVersionToTrackDB,
    updateTrackMetaDB, deleteTrackDB, updateAlbumDB, deleteAlbumDB,
    deleteVersionDB, addWorkspaceDB, removeWorkspaceDB, getLocalFoldersDB,
    removeLocalFolderDB, getLocalFilesDB, saveWaveformCacheDB, getWaveformCacheDB,
    getWorkspacesDB, getDAWPathsDB, saveDAWPathDB, getLocalFilesByCategoryDB,
    getLocalFilesGroupedDB
} from '../db';
import { separateStems } from '../stems';
import { scanProjects } from '../projects';
import { detectDAWs } from '../daws';
import { checkDependencies } from '../dependencies';
import { convertFile } from '../converter';
import { WindowManager } from './WindowManager';
import { indexLocalConnect } from '../localLibrary';
import { ShortcutManager } from './ShortcutManager';
import path from 'path';

export function setupIpcHandlers() {
    console.log("Registering IPC Handlers...");
    const wm = WindowManager.getInstance();

    // Downloads
    ipcMain.handle("download", async (_evt, url, format, bitrate, sampleRate, normalize, outDir, smartOrganize) => {
        try {
            const result = await processJob({
                url, outDir: outDir || app.getPath("music"),
                format, bitrate, sampleRate, normalize, smartOrganize
            }, new AbortController());
            return createSuccessResponse(result);
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    ipcMain.handle("getMeta", async (_evt, url) => {
        try {
            return createSuccessResponse(await fetchMeta(url));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    ipcMain.handle("getStreamUrl", async (_evt, url) => {
        try {
            return createSuccessResponse(await getStreamUrl(url));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    ipcMain.handle("search", async (_evt, query, offset, limit) => {
        try {
            return createSuccessResponse(await searchYoutube(query, offset, limit));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    ipcMain.handle("batch-search-and-stream", async (_evt, queries) => {
        try {
            return createSuccessResponse(await batchSearchAndStream(queries));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    // Config & Keybinds
    ipcMain.handle("get-config", () => createSuccessResponse(config));
    ipcMain.handle("get-keybinds", () => createSuccessResponse(config.keybinds));
    ipcMain.handle("reset-keybinds", () => {
        const newKeybinds = resetKeybinds();
        ShortcutManager.getInstance().registerAll();
        return createSuccessResponse(newKeybinds);
    });
    ipcMain.handle("update-keybind", (_evt, id, newAccelerator) => {
        const kb = config.keybinds.find(k => k.id === id);
        if (kb) {
            kb.accelerator = newAccelerator;
            saveConfig();
            ShortcutManager.getInstance().registerAll();
            return createSuccessResponse(config.keybinds);
        }
        return createErrorResponse("Keybind not found");
    });

    ipcMain.handle("update-config", async (_evt, newConfig) => {
        try {
            Object.assign(config, newConfig);
            saveConfig();
            return createSuccessResponse(true);
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    // Dependencies
    ipcMain.handle("check-dependencies", async (_evt, manualPaths) => {
        try {
            return createSuccessResponse(await checkDependencies(manualPaths));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    // Dialogs
    ipcMain.handle("pick-dir", async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return createSuccessResponse(result.canceled ? null : result.filePaths[0]);
    });

    ipcMain.handle("pick-file", async (_evt, filters) => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: filters || [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] }]
        });
        return createSuccessResponse(result.canceled ? null : result.filePaths[0]);
    });

    // Database & Workspaces
    ipcMain.handle("get-project-db", async () => createSuccessResponse(getFullProjectDB()));
    ipcMain.handle("get-workspaces", async () => createSuccessResponse(getWorkspacesDB()));
    ipcMain.handle("add-workspace", async (_evt, name, path) => createSuccessResponse(addWorkspaceDB(name, path)));
    ipcMain.handle("remove-workspace", async (_evt, id) => createSuccessResponse(removeWorkspaceDB(id)));
    ipcMain.handle("scan-projects", async () => {
        const workspaces = getWorkspacesDB();
        const results = [];
        for (const ws of workspaces) {
            results.push(...(await scanProjects(ws.path, ws.id)));
        }
        return createSuccessResponse(results);
    });

    ipcMain.handle("get-local-folders", async () => createSuccessResponse(getLocalFoldersDB()));
    ipcMain.handle("add-local-folder", async (_evt, folderPath) => createSuccessResponse(await indexLocalConnect(folderPath)));
    ipcMain.handle("remove-local-folder", async (_evt, id) => createSuccessResponse(removeLocalFolderDB(id)));
    ipcMain.handle("get-local-files", async (_evt, folderId) => createSuccessResponse(getLocalFilesDB(folderId)));
    ipcMain.handle("get-local-files-grouped", async () => createSuccessResponse(getLocalFilesGroupedDB()));
    ipcMain.handle("get-local-files-by-category", async (_evt, category) => createSuccessResponse(getLocalFilesByCategoryDB(category)));
    ipcMain.handle("get-playlist-meta", async (_evt, url) => {
        try {
            return createSuccessResponse(await fetchPlaylistMeta(url));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    // Stems & Projects
    ipcMain.handle("stems:separate", async (_evt, filePath, outDir) => {
        try {
            return createSuccessResponse(await separateStems(filePath, outDir));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    ipcMain.handle("create-album", async (_evt, name, artist) => createSuccessResponse(createAlbumDB(name, artist)));
    ipcMain.handle("update-album", async (_evt, albumId, updates) => createSuccessResponse(updateAlbumDB(albumId, updates)));
    ipcMain.handle("delete-album", async (_evt, albumId) => createSuccessResponse(deleteAlbumDB(albumId)));
    ipcMain.handle("create-track", async (_evt, name, albumId) => createSuccessResponse(createTrackDB(name, albumId)));
    ipcMain.handle("move-project-version", async (_evt, versionId, trackId) => createSuccessResponse(moveVersionToTrackDB(versionId, trackId)));
    ipcMain.handle("delete-track", async (_evt, trackId) => createSuccessResponse(deleteTrackDB(trackId)));
    ipcMain.handle("delete-version", async (_evt, versionId) => createSuccessResponse(deleteVersionDB(versionId)));
    ipcMain.handle("update-track-meta", async (_evt, trackId, updates) => createSuccessResponse(updateTrackMetaDB(trackId, updates)));
    ipcMain.handle("detect-daws", async () => createSuccessResponse(await detectDAWs()));
    ipcMain.handle("get-daw-paths", async () => createSuccessResponse(getDAWPathsDB()));
    ipcMain.handle("save-daw-path", async (_evt, daw) => createSuccessResponse(saveDAWPathDB(daw)));

    ipcMain.handle("backup-db", () => createSuccessResponse(true));
    ipcMain.handle("restore-db", () => createSuccessResponse(true));
    ipcMain.handle("convert-file", async (_evt, job) => {
        try {
            return createSuccessResponse(await convertFile(job));
        } catch (e: any) {
            return createErrorResponse(e.message);
        }
    });

    // Window & OS
    ipcMain.handle("get-app-version", () => {
        // In dev mode, app.getVersion() might return Electron's version
        if (!app.isPackaged) {
            try {
                const pkgPath = path.join(process.cwd(), 'package.json');
                if (fs.existsSync(pkgPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                    return createSuccessResponse(pkg.version);
                }
            } catch (e) { console.error("Error reading package.json", e); }
        }
        return createSuccessResponse(app.getVersion());
    });
    ipcMain.handle("get-platform", () => createSuccessResponse(process.platform));
    ipcMain.handle("get-platform-info", () => createSuccessResponse(process.platform));
    ipcMain.handle("open-external", async (_evt, url) => {
        shell.openExternal(url);
        return createSuccessResponse(true);
    });

    ipcMain.handle("close-spotlight", () => {
        wm.spotlightWindow?.hide();
        return createSuccessResponse(true);
    });

    ipcMain.handle("resize-spotlight", (_evt, height) => {
        wm.spotlightWindow?.setSize(700, Math.round(height));
        return createSuccessResponse(true);
    });

    ipcMain.handle("show-item", (_evt, p) => {
        shell.showItemInFolder(p);
        return createSuccessResponse(true);
    });

    ipcMain.handle("trim-audio", () => createErrorResponse("Not implemented"));
    ipcMain.handle("check-for-updates", () => createSuccessResponse(null));

    // Peak & Waveforms
    ipcMain.handle("save-peaks", async (_evt, type, id, peaks) => {
        if (type === 'cache') return createSuccessResponse(saveWaveformCacheDB(id, peaks));
        return createSuccessResponse(true);
    });
    ipcMain.handle("get-cached-peaks", async (_evt, id) => createSuccessResponse(getWaveformCacheDB(id)));

    // Window Controls
    ipcMain.handle("window-minimize", () => {
        wm.mainWindow?.minimize();
        return createSuccessResponse(true);
    });
    ipcMain.handle("window-toggle-maximize", () => {
        if (wm.mainWindow?.isMaximized()) wm.mainWindow.unmaximize();
        else wm.mainWindow?.maximize();
        return createSuccessResponse(true);
    });
    ipcMain.handle("window-close", () => {
        wm.mainWindow?.close();
        return createSuccessResponse(true);
    });
}
