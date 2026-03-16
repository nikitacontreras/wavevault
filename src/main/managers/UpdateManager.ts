import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { createSuccessResponse, createErrorResponse } from '../core/ApiResponse';
import { config } from '../config';
import { WindowManager } from './WindowManager';

export class UpdateManager {
    private static instance: UpdateManager;
    private initialized = false;

    private constructor() {
        if (!app.isPackaged) {
            autoUpdater.forceDevUpdateConfig = true;
        }
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for update...');
            this.sendStatus('checking');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            this.sendStatus('available', info);
        });

        autoUpdater.on('update-not-available', () => {
            console.log('No update available.');
            this.sendStatus('not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            this.sendStatus('error', err.message || err.toString());
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.sendStatus('downloading', progressObj.percent);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded');
            this.sendStatus('downloaded', info);
        });
    }

    private sendStatus(type: string, data?: any) {
        const wm = WindowManager.getInstance();
        if (wm.mainWindow) {
            wm.mainWindow.webContents.send('update-event', { type, data });
        }
    }

    public static getInstance() {
        if (!UpdateManager.instance) {
            UpdateManager.instance = new UpdateManager();
        }
        return UpdateManager.instance;
    }

    public async init() {
        if (this.initialized) return;
        this.initialized = true;

        if (config.autoCheckUpdates) {
            console.log('[UpdateManager] Auto-check enabled. Checking for updates...');
            try {
                // Wait a bit to not slow down startup
                setTimeout(() => {
                    autoUpdater.checkForUpdates().catch(err => {
                        console.error('[UpdateManager] Auto-check failed:', err);
                    });
                }, 5000);
            } catch (e) {
                console.error('[UpdateManager] Failed to start auto-check:', e);
            }
        }
    }

    public async checkForUpdates() {
        try {
            console.log('Manual check for updates initiated.');
            const result = await autoUpdater.checkForUpdates();
            return createSuccessResponse(result);
        } catch (e: any) {
            console.error('Manual check failed:', e);
            this.sendStatus('error', e.message);
            return createErrorResponse(e.message);
        }
    }

    public async downloadUpdate() {
        await autoUpdater.downloadUpdate();
        return createSuccessResponse(true);
    }

    public async installUpdate() {
        autoUpdater.quitAndInstall();
        return createSuccessResponse(true);
    }
}
