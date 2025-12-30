const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string, smartOrganize?: boolean) =>
        ipcRenderer.invoke("download", url, format, bitrate, sampleRate, normalize, outDir, smartOrganize),
    search: (query: string) => ipcRenderer.invoke("search", query),
    getMeta: (url: string) => ipcRenderer.invoke("getMeta", url),
    getStreamUrl: (url: string) => ipcRenderer.invoke("getStreamUrl", url),
    pickDir: () => ipcRenderer.invoke("pick-dir"),
    openItem: (path: string) => ipcRenderer.invoke("show-item", path),
    trimAudio: (src: string, start: number, end: number) => ipcRenderer.invoke("trim-audio", src, start, end),
    checkDependencies: (manualPaths?: any) => ipcRenderer.invoke("check-dependencies", manualPaths),
    pickFile: () => ipcRenderer.invoke("pick-file"),
    updateConfig: (config: any) => ipcRenderer.invoke("update-config", config),
    getKeybinds: () => ipcRenderer.invoke("get-keybinds"),
    resetKeybinds: () => ipcRenderer.invoke("reset-keybinds"),

    onStatus: (cb: (val: any) => void) => ipcRenderer.on("status", (_evt: any, value: any) => cb(value)),
    onCommand: (cb: (val: string) => void) => ipcRenderer.on("command", (_evt: any, value: string) => cb(value)),
    onDownloadStarted: (cb: (val: any) => void) => ipcRenderer.on("download-started", (_evt: any, value: any) => cb(value)),
    onDownloadSuccess: (cb: (val: any) => void) => ipcRenderer.on("download-success", (_evt: any, value: any) => cb(value)),
    onDownloadError: (cb: (val: any) => void) => ipcRenderer.on("download-error", (_evt: any, value: any) => cb(value)),

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
    platform: process.platform
});