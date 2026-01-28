export { };

declare global {
    interface Window {
        api: {
            // System & Window
            platform: string;
            minimizeWindow: () => Promise<void>;
            toggleMaximizeWindow: () => Promise<void>;
            closeWindow: () => Promise<void>;
            getAppVersion: () => Promise<string>;
            onStatus: (callback: (status: { ok: boolean, message: string }) => void) => () => void;

            // Config & Settings
            getConfig: () => Promise<any>;
            updateConfig: (config: any) => Promise<boolean>;
            getKeybinds: () => Promise<any[]>;
            updateKeybind: (id: string, accelerator: string) => Promise<any[]>;
            resetKeybinds: () => Promise<any[]>;
            checkDependencies: (paths?: any) => Promise<any>;

            // Filesystem & Dialogs
            pickDir: () => Promise<string | null>;
            pickFile: (filters?: any[]) => Promise<string | null>;
            openItem: (path: string) => Promise<void>;
            openExternal: (url: string) => Promise<void>;

            // Downloads & Media
            download: (
                url: string,
                format: string,
                bitrate: string,
                sampleRate: string,
                normalize: boolean,
                outDir?: string | null,
                smartOrganize?: boolean
            ) => Promise<any>;
            getMeta: (url: string) => Promise<any>;
            getStreamUrl: (url: string) => Promise<string>;
            search: (query: string, offset?: number, limit?: number) => Promise<any[]>;
            batchSearchAndStream: (queries: string[]) => Promise<any[]>;
            getPlaylistMeta: (url: string) => Promise<any>;

            // Events
            on: (channel: string, callback: (data: any) => void) => () => void;
            onDownloadStarted: (cb: (data: any) => void) => () => void;
            onDownloadSuccess: (cb: (data: any) => void) => () => void;
            onDownloadError: (cb: (data: any) => void) => () => void;
            onDownloadProgress: (cb: (data: any) => void) => () => void;

            // Libraries & Database
            getProjectDB: () => Promise<any>;
            getWorkspaces: () => Promise<any[]>;
            addWorkspace: (name: string, path: string) => Promise<any>;
            removeWorkspace: (id: string) => Promise<any>;
            scanProjects: () => Promise<any[]>;

            getLocalFolders: () => Promise<any[]>;
            addLocalFolder: (path: string) => Promise<any>;
            removeLocalFolder: (id: string) => Promise<any>;
            getLocalFiles: (folderId?: string) => Promise<any[]>;
            getLocalFilesGrouped: () => Promise<any>;
            getLocalFilesByCategory: (category: string) => Promise<any[]>;

            // Stems & Advanced
            separateStems: (filePath: string, outDir: string) => Promise<any>;
            savePeaks: (type: string, id: string, peaks: any) => Promise<any>;
            getCachedPeaks: (id: string) => Promise<any>;

            closeSpotlight: () => void;
            resizeSpotlight: (height: number) => void;
            cancelDownload: (url: string) => void;
            onCommand: (callback: (command: string) => void) => () => void;

            // DAW & System
            getDAWPaths: () => Promise<any[]>;
            saveDAWPath: (daw: any) => Promise<any>;
            detectDAWs: () => Promise<any[]>;
            showItem: (path: string) => void;
            trimAudio: (filePath: string, start: number, end: number) => Promise<any>;
            checkForUpdates: () => Promise<any>;
            getPlatform: () => Promise<string>;
            getPlatformInfo: () => Promise<any>;

            startDrag: (filepath: string, iconpath?: string) => void;
        };
    }
}
