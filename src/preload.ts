const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    download: (url: string, format: string, bitrate: string, sampleRate: string, normalize: boolean, outDir?: string) =>
        ipcRenderer.invoke("download", url, format, bitrate, sampleRate, normalize, outDir),
    search: (query: string) => ipcRenderer.invoke("search", query),
    getMeta: (url: string) => ipcRenderer.invoke("getMeta", url),
    getStreamUrl: (url: string) => ipcRenderer.invoke("getStreamUrl", url),
    pickDir: () => ipcRenderer.invoke("pick-dir"),
    openItem: (path: string) => ipcRenderer.invoke("show-item", path),
    trimAudio: (src: string, start: number, end: number) => ipcRenderer.invoke("trim-audio", src, start, end),
    onStatus: (cb: (val: any) => void) => ipcRenderer.on("status", (_evt: any, value: any) => cb(value))
});