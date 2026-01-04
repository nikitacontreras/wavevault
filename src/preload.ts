const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string, smartOrganize?: boolean) =>
        ipcRenderer.invoke("download", url, format, bitrate, sampleRate, normalize, outDir, smartOrganize),
    search: (query: string, offset?: number, limit?: number) => ipcRenderer.invoke("search", query, offset, limit),
    getMeta: (url: string) => ipcRenderer.invoke("getMeta", url),
    getStreamUrl: (url: string) => ipcRenderer.invoke("getStreamUrl", url),
    pickDir: () => ipcRenderer.invoke("pick-dir"),
    openItem: (path: string) => ipcRenderer.invoke("show-item", path),
    trimAudio: (src: string, start: number, end: number) => ipcRenderer.invoke("trim-audio", src, start, end),
    checkDependencies: (manualPaths?: any) => ipcRenderer.invoke("check-dependencies", manualPaths),
    pickFile: (filters?: any[]) => ipcRenderer.invoke("pick-file", filters),
    updateConfig: (config: any) => ipcRenderer.invoke("update-config", config),
    getKeybinds: () => ipcRenderer.invoke("get-keybinds"),
    resetKeybinds: () => ipcRenderer.invoke("reset-keybinds"),

    onStatus: (cb: (val: any) => void) => ipcRenderer.on("status", (_evt: any, value: any) => cb(value)),
    onCommand: (cb: (val: string) => void) => ipcRenderer.on("command", (_evt: any, value: string) => cb(value)),
    onDownloadStarted: (cb: (val: any) => void) => ipcRenderer.on("download-started", (_evt: any, value: any) => cb(value)),
    onDownloadSuccess: (cb: (val: any) => void) => ipcRenderer.on("download-success", (_evt: any, value: any) => cb(value)),
    onDownloadError: (cb: (val: any) => void) => ipcRenderer.on("download-error", (_evt: any, value: any) => cb(value)),
    onDownloadProgress: (cb: (val: { url: string, message: string }) => void) => ipcRenderer.on("download-progress", (_evt: any, value: any) => cb(value)),

    cancelDownload: (url: string) => ipcRenderer.invoke("cancel-download", url),
    closeSpotlight: () => ipcRenderer.invoke("close-spotlight"),


    resizeSpotlight: (height: number) => ipcRenderer.invoke("resize-spotlight", height),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    getAppVersion: () => ipcRenderer.invoke("get-app-version"),
    openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
    getPlatformInfo: () => ipcRenderer.invoke("get-platform-info"),
    startDrag: (filepath: string, iconpath?: string) => ipcRenderer.send("start-drag", filepath, iconpath),

    minimizeWindow: () => ipcRenderer.invoke("window-minimize"),
    toggleMaximizeWindow: () => ipcRenderer.invoke("window-toggle-maximize"),
    closeWindow: () => ipcRenderer.invoke("window-close"),

    // Workspace Management
    getWorkspaces: () => ipcRenderer.invoke("get-workspaces"),
    addWorkspace: (name: string, path: string) => ipcRenderer.invoke("add-workspace", name, path),
    removeWorkspace: (id: string) => ipcRenderer.invoke("remove-workspace", id),
    scanProjects: () => ipcRenderer.invoke("scan-projects"),

    getProjectDB: () => ipcRenderer.invoke("get-project-db"),
    createAlbum: (name: string, artist: string) => ipcRenderer.invoke("create-album", name, artist),
    updateAlbum: (albumId: string, updates: any) => ipcRenderer.invoke("update-album", albumId, updates),
    deleteAlbum: (albumId: string) => ipcRenderer.invoke("delete-album", albumId),
    createTrack: (name: string, albumId?: string) => ipcRenderer.invoke("create-track", name, albumId),
    addProjectVersion: (trackId: string, filePath?: string) => ipcRenderer.invoke("add-project-version", trackId, filePath),
    moveProjectVersion: (versionId: string, trackId: string) => ipcRenderer.invoke("move-project-version", versionId, trackId),
    deleteTrack: (trackId: string) => ipcRenderer.invoke("delete-track", trackId),
    deleteVersion: (versionId: string) => ipcRenderer.invoke("delete-version", versionId),
    updateTrackMeta: (trackId: string, updates: any) => ipcRenderer.invoke("update-track-meta", trackId, updates),
    detectDAWs: () => ipcRenderer.invoke("detect-daws"),
    saveDAWPath: (daw: any) => ipcRenderer.invoke("save-daw-path", daw),
    getDAWPaths: () => ipcRenderer.invoke("get-daw-paths"),

    // Local Library
    addLocalFolder: (path: string) => ipcRenderer.invoke("add-local-folder", path),
    getLocalFolders: () => ipcRenderer.invoke("get-local-folders"),
    removeLocalFolder: (id: string) => ipcRenderer.invoke("remove-local-folder", id),
    getLocalFiles: (folderId?: string) => ipcRenderer.invoke("get-local-files", folderId),
    getLocalFilesGrouped: () => ipcRenderer.invoke("get-local-files-grouped"),
    getLocalFilesByCategory: (category: string) => ipcRenderer.invoke("get-local-files-by-category", category),
    getPlaylistMeta: (url: string) => ipcRenderer.invoke('get-playlist-meta', url),
    batchSearchAndStream: (queries: string[]) => ipcRenderer.invoke('batch-search-and-stream', queries),
    backupDB: () => ipcRenderer.invoke("backup-db"),
    restoreDB: () => ipcRenderer.invoke("restore-db"),
    convertFile: (job: any) => ipcRenderer.invoke("convert-file", job),
    savePeaks: (type: string, id: string, peaks: any) => ipcRenderer.invoke("save-peaks", type, id, peaks),
    getCachedPeaks: (id: string) => ipcRenderer.invoke("get-cached-peaks", id),

    on: (channel: string, callback: (data: any) => void) => {
        const subscription = (_event: any, data: any) => callback(data);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },

    platform: process.platform
});