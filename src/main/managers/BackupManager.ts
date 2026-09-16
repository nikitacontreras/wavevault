import { app, dialog, BrowserWindow } from "electron";
import AdmZip from "adm-zip";
import path from "node:path";
import fs from "node:fs";
import { getDB, getDBPath, closeDB, initDB } from "../db";

export interface BackupOptions {
    includeMedia?: boolean;
    libraryPath?: string;
}

export interface BackupResult {
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    includesMedia?: boolean;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    restoredMedia?: boolean;
    restoredCount?: number;
    error?: string;
}

export class BackupManager {
    /**
     * Exports settings and SQLite database to a .wsb (WaveVault Settings Backup) archive.
     * Optionally includes downloaded audio files.
     */
    static async exportBackup(options?: BackupOptions): Promise<BackupResult> {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const defaultName = `WaveVault_Backup_${dateStr}.wsb`;

        const res = await dialog.showSaveDialog(win, {
            title: "Exportar Respaldo de WaveVault (.wsb)",
            defaultPath: defaultName,
            filters: [
                { name: "WaveVault Settings & Audio Backup (*.wsb)", extensions: ["wsb"] },
                { name: "Todos los archivos", extensions: ["*"] }
            ]
        });

        if (res.canceled || !res.filePath) {
            return { success: false, canceled: true };
        }

        let targetPath = res.filePath;
        if (!targetPath.toLowerCase().endsWith(".wsb")) {
            targetPath += ".wsb";
        }

        const tempDbPath = path.join(app.getPath("temp"), `wv_export_${Date.now()}.db`);

        try {
            const db = getDB();

            // Safe atomic SQLite backup
            await db.backup(tempDbPath);

            const zip = new AdmZip();

            // Add SQLite DB
            zip.addLocalFile(tempDbPath, "", "wavevault.db");

            // Add Manifest
            const manifest = {
                app: "WaveVault",
                format: "wsb",
                version: "1.0",
                appVersion: app.getVersion() || "1.0.0",
                createdAt: new Date().toISOString(),
                includesMedia: Boolean(options?.includeMedia),
                libraryPath: options?.libraryPath || null
            };
            zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));

            // If includeMedia is requested, add audio files
            if (options?.includeMedia) {
                const addedFiles = new Set<string>();

                // 1. Scan directory if libraryPath provided
                if (options.libraryPath && fs.existsSync(options.libraryPath)) {
                    try {
                        const stat = fs.statSync(options.libraryPath);
                        if (stat.isDirectory()) {
                            zip.addLocalFolder(options.libraryPath, "media");
                            // Track files already added
                            const listFilesRecursive = (dir: string) => {
                                const entries = fs.readdirSync(dir, { withFileTypes: true });
                                for (const entry of entries) {
                                    const full = path.join(dir, entry.name);
                                    if (entry.isDirectory()) {
                                        listFilesRecursive(full);
                                    } else {
                                        addedFiles.add(full);
                                    }
                                }
                            };
                            listFilesRecursive(options.libraryPath);
                        }
                    } catch (e) {
                        console.warn("[BackupManager] Could not add library folder:", e);
                    }
                }

                // 2. Add files tracked in database samples / versions if not already added
                try {
                    const samples = db.prepare("SELECT localPath FROM samples WHERE localPath IS NOT NULL").all() as { localPath: string }[];
                    for (const s of samples) {
                        if (s.localPath && fs.existsSync(s.localPath) && !addedFiles.has(s.localPath)) {
                            zip.addLocalFile(s.localPath, "media");
                            addedFiles.add(s.localPath);
                        }
                    }
                } catch (e) {
                    console.warn("[BackupManager] Could not read samples for backup:", e);
                }

                try {
                    const versions = db.prepare("SELECT path FROM versions WHERE path IS NOT NULL").all() as { path: string }[];
                    for (const v of versions) {
                        if (v.path && fs.existsSync(v.path) && !addedFiles.has(v.path)) {
                            zip.addLocalFile(v.path, "media");
                            addedFiles.add(v.path);
                        }
                    }
                } catch (e) {
                    console.warn("[BackupManager] Could not read versions for backup:", e);
                }
            }

            // Write output zip file
            zip.writeZip(targetPath);

            return {
                success: true,
                filePath: targetPath,
                includesMedia: Boolean(options?.includeMedia)
            };
        } catch (e: any) {
            console.error("[BackupManager] Export error:", e);
            return {
                success: false,
                error: e.message || "Error al exportar el respaldo"
            };
        } finally {
            try {
                if (fs.existsSync(tempDbPath)) {
                    fs.unlinkSync(tempDbPath);
                }
            } catch {}
        }
    }

    /**
     * Restores database and optional media from a .wsb or legacy .db file.
     */
    static async restoreBackup(options?: { targetLibraryPath?: string }): Promise<RestoreResult> {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

        const res = await dialog.showOpenDialog(win, {
            title: "Restaurar Respaldo de WaveVault",
            filters: [
                { name: "WaveVault Backup (*.wsb, *.db)", extensions: ["wsb", "db"] },
                { name: "Todos los archivos", extensions: ["*"] }
            ],
            properties: ["openFile"]
        });

        if (res.canceled || !res.filePaths?.[0]) {
            return { success: false, canceled: true };
        }

        const backupPath = res.filePaths[0];

        try {
            const currentDbPath = getDBPath();

            // Case 1: Plain .db backup
            if (backupPath.toLowerCase().endsWith(".db")) {
                closeDB();
                fs.copyFileSync(backupPath, currentDbPath);
                initDB();
                return {
                    success: true,
                    filePath: backupPath,
                    restoredMedia: false
                };
            }

            // Case 2: .wsb (ZIP archive)
            const zip = new AdmZip(backupPath);
            const dbEntry = zip.getEntry("wavevault.db");

            if (!dbEntry) {
                throw new Error("El archivo seleccionado no contiene una base de datos válida de WaveVault (falta wavevault.db).");
            }

            const dbData = dbEntry.getData();

            // Close DB before overwriting
            closeDB();
            fs.writeFileSync(currentDbPath, dbData);
            // Reinitialize DB connection
            initDB();

            // Extract media files if present
            const mediaEntries = zip.getEntries().filter(
                (entry) => !entry.isDirectory && (entry.entryName.startsWith("media/") || entry.entryName.startsWith("library/"))
            );

            let restoredCount = 0;
            if (mediaEntries.length > 0) {
                const targetDir = options?.targetLibraryPath || path.join(app.getPath("music"), "WaveVault");
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }

                for (const entry of mediaEntries) {
                    const relativeName = entry.entryName.replace(/^(media|library)\//, "");
                    if (!relativeName) continue;

                    const targetFile = path.join(targetDir, relativeName);
                    const targetSubDir = path.dirname(targetFile);

                    if (!fs.existsSync(targetSubDir)) {
                        fs.mkdirSync(targetSubDir, { recursive: true });
                    }

                    fs.writeFileSync(targetFile, entry.getData());
                    restoredCount++;
                }
            }

            return {
                success: true,
                filePath: backupPath,
                restoredMedia: restoredCount > 0,
                restoredCount
            };
        } catch (e: any) {
            console.error("[BackupManager] Restore error:", e);
            // Re-open DB in case of failure to keep app working
            try {
                initDB();
            } catch {}
            return {
                success: false,
                error: e.message || "Error al restaurar el respaldo"
            };
        }
    }
}
