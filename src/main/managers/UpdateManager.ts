import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createSuccessResponse, createErrorResponse } from '../core/ApiResponse';
import { config } from '../config';
import { WindowManager } from './WindowManager';
import { logEventDB } from '../db';
import { broadcastStatus } from '../main';

export class UpdateManager {
    private static instance: UpdateManager;
    private initialized = false;

    private constructor() {
        if (!app.isPackaged) {
            autoUpdater.forceDevUpdateConfig = true;
            // Try to find dev-app-update.yml in the source directory
            const devConfig = path.join(app.getAppPath(), 'src', 'main', 'dev-app-update.yml');
            if (fs.existsSync(devConfig)) {
                autoUpdater.updateConfigPath = devConfig;
            } else {
                // Fallback for different build structures
                const altDevConfig = path.join(__dirname, '..', 'dev-app-update.yml');
                if (fs.existsSync(altDevConfig)) {
                    autoUpdater.updateConfigPath = altDevConfig;
                }
            }
        }
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for update...');
            this.sendStatus('checking');
            broadcastStatus(true, '[Update] Checking for updates...');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            this.sendStatus('available', info);
            broadcastStatus(true, `[Update] New version available: ${info.version}`);
        });

        autoUpdater.on('update-not-available', () => {
            console.log('No update available.');
            this.sendStatus('not-available');
            broadcastStatus(true, '[Update] System is up to date.');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            logEventDB('ERROR', 'update', err.message || 'Unknown update error', err);
            
            let message = err.message || err.toString();
            broadcastStatus(false, `[Update Error] ${message}`);
            
            // In development, technical errors are common and shouldn't scare the user
            if (!app.isPackaged && (message.includes('Dev-updater') || message.includes('could not find'))) {
                this.sendStatus('not-available'); // Quietly hide the error in dev
                return;
            }

            // Handle specific technical errors with friendly keys
            if (message.includes('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND')) {
                message = 'updates.errorNotFound';
            } else {
                message = 'updates.errorGeneric';
            }
            
            this.sendStatus('error', message);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.sendStatus('downloading', progressObj.percent);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded');
            this.sendStatus('downloaded', info);
            broadcastStatus(true, `[Update] Download complete: ${info.version}`);
        });
    }

    private sendStatus(type: string, data?: any) {
        const wm = WindowManager.getInstance();
        if (wm.mainWindow && !wm.mainWindow.isDestroyed()) {
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

        // Only auto-check if packaged, to avoid annoying errors in dev
        if (config.autoCheckUpdates && app.isPackaged) {
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
            broadcastStatus(true, '[Update] Manual check initiated...');
            const result = await autoUpdater.checkForUpdates();
            return createSuccessResponse(result);
        } catch (e: any) {
            console.error('Manual check failed:', e);
            
            let message = e.message || e.toString();
            broadcastStatus(false, `[Update Error] Manual check failed: ${message}`);
            
            // Friendly handling for dev mode
            if (!app.isPackaged && message.includes('Dev-updater')) {
                this.sendStatus('not-available');
                return createSuccessResponse({ updateInfo: { version: app.getVersion() } });
            }

            if (message.includes('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND')) {
                message = 'updates.errorNotFound';
            } else {
                message = 'updates.errorGeneric';
            }
            
            this.sendStatus('error', message);
            return createErrorResponse(message);
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
