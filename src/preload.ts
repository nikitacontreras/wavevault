const { contextBridge, ipcRenderer } = require("electron");

const safeInvoke = async (channel: string, ...args: any[]) => {
    const response = await ipcRenderer.invoke(channel, ...args);
    if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) return response.data;
        throw new Error(response.error || 'Unknown IPC error');
    }
    return response;
};

contextBridge.exposeInMainWorld("api", {
    download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string, smartOrganize?: boolean) =>
        safeInvoke("download", url, format, bitrate, sampleRate, normalize, outDir, smartOrganize),
    search: (query: string, offset?: number, limit?: number) => safeInvoke("search", query, offset, limit),
    getMeta: (url: string) => safeInvoke("getMeta", url),
    getStreamUrl: (url: string) => safeInvoke("getStreamUrl", url),
    pickDir: () => safeInvoke("pick-dir"),
    openItem: (path: string) => safeInvoke("show-item", path),
    trimAudio: (src: string, start: number, end: number) => safeInvoke("trim-audio", src, start, end),
    checkDependencies: (manualPaths?: any) => safeInvoke("check-dependencies", manualPaths),
    pickFile: (filters?: any[]) => safeInvoke("pick-file", filters),
    updateConfig: (config: any) => safeInvoke("update-config", config),
    getKeybinds: () => safeInvoke("get-keybinds"),
    getConfig: () => safeInvoke("get-config"),
    resetKeybinds: () => safeInvoke("reset-keybinds"),
    separateStems: (filePath: string, outDir: string) => safeInvoke("stems:separate", filePath, outDir),

    onStatus: (cb: (val: any) => void) => {
        const sub = (_evt: any, value: any) => cb(value);
        ipcRenderer.on("status", sub);
        return () => ipcRenderer.removeListener("status", sub);
    },
    onCommand: (cb: (val: string) => void) => {
        const sub = (_evt: any, value: string) => cb(value);
        ipcRenderer.on("command", sub);
        return () => ipcRenderer.removeListener("command", sub);
    },
    onDownloadStarted: (cb: (val: any) => void) => {
        const sub = (_evt: any, value: any) => cb(value);
        ipcRenderer.on("download-started", sub);
        return () => ipcRenderer.removeListener("download-started", sub);
    },
    onDownloadSuccess: (cb: (val: any) => void) => {
        const sub = (_evt: any, value: any) => cb(value);
        ipcRenderer.on("download-success", sub);
        return () => ipcRenderer.removeListener("download-success", sub);
    },
    onDownloadError: (cb: (val: any) => void) => {
        const sub = (_evt: any, value: any) => cb(value);
        ipcRenderer.on("download-error", sub);
        return () => ipcRenderer.removeListener("download-error", sub);
    },
    onDownloadProgress: (cb: (val: { url: string, message: string }) => void) => {
        const sub = (_evt: any, value: any) => cb(value);
        ipcRenderer.on("download-progress", sub);
        return () => ipcRenderer.removeListener("download-progress", sub);
    },

    cancelDownload: (url: string) => safeInvoke("cancel-download", url),
    closeSpotlight: () => safeInvoke("close-spotlight"),


    resizeSpotlight: (height: number) => safeInvoke("resize-spotlight", height),
    checkForUpdates: () => safeInvoke("check-for-updates"),
    getAppVersion: () => safeInvoke("get-app-version"),
    openExternal: (url: string) => safeInvoke("open-external", url),
    getPlatformInfo: () => safeInvoke("get-platform-info"),
    startDrag: (filepath: string, iconpath?: string) => ipcRenderer.send("start-drag", filepath, iconpath),

    minimizeWindow: () => safeInvoke("window-minimize"),
    toggleMaximizeWindow: () => safeInvoke("window-toggle-maximize"),
    closeWindow: () => safeInvoke("window-close"),

    // Workspace Management
    getWorkspaces: () => safeInvoke("get-workspaces"),
    addWorkspace: (name: string, path: string) => safeInvoke("add-workspace", name, path),
    removeWorkspace: (id: string) => safeInvoke("remove-workspace", id),
    scanProjects: () => safeInvoke("scan-projects"),

    getProjectDB: () => safeInvoke("get-project-db"),
    createAlbum: (name: string, artist: string) => safeInvoke("create-album", name, artist),
    updateAlbum: (albumId: string, updates: any) => safeInvoke("update-album", albumId, updates),
    deleteAlbum: (albumId: string) => safeInvoke("delete-album", albumId),
    createTrack: (name: string, albumId?: string) => safeInvoke("create-track", name, albumId),
    addProjectVersion: (trackId: string, filePath?: string) => safeInvoke("add-project-version", trackId, filePath),
    moveProjectVersion: (versionId: string, trackId: string) => safeInvoke("move-project-version", versionId, trackId),
    deleteTrack: (trackId: string) => safeInvoke("delete-track", trackId),
    deleteVersion: (versionId: string) => safeInvoke("delete-version", versionId),
    updateTrackMeta: (trackId: string, updates: any) => safeInvoke("update-track-meta", trackId, updates),
    detectDAWs: () => safeInvoke("detect-daws"),
    saveDAWPath: (daw: any) => safeInvoke("save-daw-path", daw),
    getDAWPaths: () => safeInvoke("get-daw-paths"),

    // Local Library
    addLocalFolder: (path: string) => safeInvoke("add-local-folder", path),
    getLocalFolders: () => safeInvoke("get-local-folders"),
    removeLocalFolder: (id: string) => safeInvoke("remove-local-folder", id),
    getLocalFiles: (folderId?: string) => safeInvoke("get-local-files", folderId),
    getLocalFilesGrouped: () => safeInvoke("get-local-files-grouped"),
    getLocalFilesByCategory: (category: string) => safeInvoke("get-local-files-by-category", category),
    getPlaylistMeta: (url: string) => safeInvoke('get-playlist-meta', url),
    batchSearchAndStream: (queries: string[]) => safeInvoke('batch-search-and-stream', queries),
    backupDB: () => safeInvoke("backup-db"),
    restoreDB: () => safeInvoke("restore-db"),
    convertFile: (job: any) => safeInvoke("convert-file", job),
    savePeaks: (type: string, id: string, peaks: any) => safeInvoke("save-peaks", type, id, peaks),
    getCachedPeaks: (id: string) => safeInvoke("get-cached-peaks", id),

    on: (channel: string, callback: (data: any) => void) => {
        const subscription = (_event: any, data: any) => callback(data);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },

    platform: process.platform
});