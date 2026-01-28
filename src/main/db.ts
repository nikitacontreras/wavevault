import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(app.getPath('userData'), 'wavevault.db');
const db = new Database(dbPath);

// Initialize Tables
export function initDB() {
    // 1. Config Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS config (
            id TEXT PRIMARY KEY,
            value TEXT
        )
    `).run();

    // 2. Albums Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS albums (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            artist TEXT,
            artwork TEXT,
            createdAt INTEGER
        )
    `).run();

    // 3. Tracks Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            albumId TEXT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'Idea',
            bpm INTEGER,
            key TEXT,
            tags TEXT,
            createdAt INTEGER,
            FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE
        )
    `).run();

    // 4. Project Versions Table (Files)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS versions (
            id TEXT PRIMARY KEY,
            trackId TEXT,
            workspaceId TEXT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            type TEXT,
            lastModified INTEGER,
            isUnorganized INTEGER DEFAULT 0,
            FOREIGN KEY(trackId) REFERENCES tracks(id) ON DELETE CASCADE,
            FOREIGN KEY(workspaceId) REFERENCES workspaces(id) ON DELETE SET NULL
        )
    `).run();

    // 5. Download History / Samples Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS samples (
            id TEXT PRIMARY KEY,
            title TEXT,
            url TEXT,
            thumbnail TEXT,
            duration TEXT,
            format TEXT,
            localPath TEXT,
            timestamp INTEGER
        )
    `).run();

    // 6. DAW Paths Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS daw_paths (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            version TEXT
        )
    `).run();

    // 7. Indexed Workspaces Table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            createdAt INTEGER
        )
    `).run();

    // 8. Local Folders (Library)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_folders (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            scannedAt INTEGER
        )
    `).run();

    // 9. Local Files (Library Index)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS local_files (
            id TEXT PRIMARY KEY,
            folderId TEXT,
            path TEXT NOT NULL UNIQUE,
            filename TEXT NOT NULL,
            type TEXT, -- Loop, One-Shot
            instrument TEXT, -- Kick, Snare, etc.
            key TEXT,
            bpm INTEGER,
            duration REAL,
            size INTEGER,
            FOREIGN KEY(folderId) REFERENCES local_folders(id) ON DELETE CASCADE
        )
    `).run();

    // --- MIGRATIONS ---
    const tableInfoVersions = db.prepare("PRAGMA table_info(versions)").all() as any[];
    if (!tableInfoVersions.some(col => col.name === 'workspaceId')) {
        try {
            db.prepare("ALTER TABLE versions ADD COLUMN workspaceId TEXT").run();
            console.log("Database Migration: Added workspaceId to versions table.");
        } catch (e) { console.error("Migration failed:", e); }
    }

    // Waveform caching migrations
    const tableInfoTracks = db.prepare("PRAGMA table_info(tracks)").all() as any[];
    if (!tableInfoTracks.some(col => col.name === 'waveform')) {
        try { db.prepare("ALTER TABLE tracks ADD COLUMN waveform TEXT").run(); } catch (e) { }
    }
    const tableInfoSamples = db.prepare("PRAGMA table_info(samples)").all() as any[];
    if (!tableInfoSamples.some(col => col.name === 'waveform')) {
        try { db.prepare("ALTER TABLE samples ADD COLUMN waveform TEXT").run(); } catch (e) { }
    }
    const tableInfoLocalFiles = db.prepare("PRAGMA table_info(local_files)").all() as any[];
    if (!tableInfoLocalFiles.some(col => col.name === 'waveform')) {
        try { db.prepare("ALTER TABLE local_files ADD COLUMN waveform TEXT").run(); } catch (e) { }
    }
    if (!tableInfoLocalFiles.some(col => col.name === 'tags')) {
        try { db.prepare("ALTER TABLE local_files ADD COLUMN tags TEXT").run(); } catch (e) { }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS waveform_cache (
            url_id TEXT PRIMARY KEY,
            waveform TEXT,
            updatedAt INTEGER
        )
    `).run();

    // Cleanup orphans from unorganized projects if they have no workspace
    db.prepare('DELETE FROM versions WHERE isUnorganized = 1 AND workspaceId IS NULL').run();

    migrateOldData();
}

function migrateOldData() {
    const oldDbPath = path.join(app.getPath("userData"), "projects_v2.json");
    if (!fs.existsSync(oldDbPath)) return;

    // Check if we already migrated
    const row = db.prepare('SELECT value FROM config WHERE id = ?').get('migrated_v2') as { value: string } | undefined;
    if (row && JSON.parse(row.value) === true) return;

    console.log("Migrating data from projects_v2.json to SQLite...");
    try {
        const data = JSON.parse(fs.readFileSync(oldDbPath, 'utf8'));

        db.transaction(() => {
            // 1. Migrate Albums
            const albums = data.albums || [];
            for (const album of albums) {
                db.prepare('INSERT OR IGNORE INTO albums (id, name, artist, createdAt) VALUES (?, ?, ?, ?)').run(
                    album.id, album.name, album.artist, Date.now()
                );

                // 2. Migrate Tracks
                const tracks = album.tracks || [];
                for (const track of tracks) {
                    db.prepare('INSERT OR IGNORE INTO tracks (id, albumId, name, status, bpm, key, tags, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
                        track.id, album.id, track.name, track.status || 'Idea', track.bpm || null, track.key || null, JSON.stringify(track.tags || []), Date.now()
                    );

                    // 3. Migrate Versions
                    const versions = track.versions || [];
                    for (const ver of versions) {
                        db.prepare('INSERT OR IGNORE INTO versions (id, trackId, name, path, type, lastModified, isUnorganized) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                            ver.id, track.id, ver.name, ver.path, ver.type, ver.lastModified, 0
                        );
                    }
                }
            }

            // 4. Migrate Unorganized
            const unorganized = data.unorganized || data.inbox || data.looseTracks || [];
            for (const ver of unorganized) {
                db.prepare('INSERT OR IGNORE INTO versions (id, name, path, type, lastModified, isUnorganized) VALUES (?, ?, ?, ?, ?, 1)').run(
                    ver.id || "VER-" + Math.random().toString(36).substr(2, 9), ver.name, ver.path, ver.type, ver.lastModified
                );
            }

            db.prepare('INSERT OR REPLACE INTO config (id, value) VALUES (?, ?)').run('migrated_v2', JSON.stringify(true));
        })();
        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

// Config Helpers
export function setConfigDB(key: string, value: any) {
    db.prepare('INSERT OR REPLACE INTO config (id, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

export function getConfigDB(key: string, defaultValue: any = null) {
    const row = db.prepare('SELECT value FROM config WHERE id = ?').get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : defaultValue;
}

// Project Store Logic
export function getFullProjectDB() {
    const albums = db.prepare('SELECT * FROM albums ORDER BY createdAt DESC').all() as any[];

    // Join versions with workspaces to get the name
    const allVersions = db.prepare(`
        SELECT v.*, w.name as workspaceName 
        FROM versions v 
        LEFT JOIN workspaces w ON v.workspaceId = w.id 
        ORDER BY v.lastModified DESC
        `).all() as any[];

    const result = {
        albums: albums.map(album => ({
            ...album,
            tracks: db.prepare('SELECT * FROM tracks WHERE albumId = ? ORDER BY createdAt DESC').all(album.id).map((track: any) => ({
                ...track,
                versions: allVersions.filter(v => v.trackId === track.id)
            }))
        })),
        allVersions
    };

    return result;
}

export function createAlbumDB(name: string, artist: string) {
    const id = "ALB-" + Date.now();
    db.prepare('INSERT INTO albums (id, name, artist, createdAt) VALUES (?, ?, ?, ?)').run(id, name, artist, Date.now());
    return { id, name, artist };
}

export function createTrackDB(name: string, albumId: string) {
    const id = "TRK-" + Date.now();
    db.prepare('INSERT INTO tracks (id, albumId, name, createdAt) VALUES (?, ?, ?, ?)').run(id, albumId, name, Date.now());
    return { id, name, albumId };
}

export function addToUnorganizedDB(version: any, workspaceId?: string) {
    try {
        db.prepare(`
            INSERT INTO versions(id, name, path, type, lastModified, isUnorganized, workspaceId)
    VALUES(?, ?, ?, ?, ?, 1, ?)
            ON CONFLICT(path) DO UPDATE SET
    lastModified = excluded.lastModified,
        workspaceId = COALESCE(excluded.workspaceId, versions.workspaceId)
            `).run(version.id, version.name, version.path, version.type, version.lastModified, workspaceId || null);
    } catch (e) {
        console.error("DB Error adding to unorganized:", e);
    }
}

export function moveVersionToTrackDB(versionId: string, trackId: string) {
    db.prepare('UPDATE versions SET trackId = ?, isUnorganized = 0 WHERE id = ?').run(trackId, versionId);
    return true;
}

export function updateTrackMetaDB(trackId: string, updates: any) {
    const fields = Object.keys(updates);
    if (fields.length === 0) return false;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => {
        const val = updates[f];
        return (typeof val === 'object') ? JSON.stringify(val) : val;
    });

    db.prepare(`UPDATE tracks SET ${setClause} WHERE id = ? `).run(...values, trackId);
    return true;
}

export function deleteTrackDB(trackId: string) {
    db.prepare('DELETE FROM tracks WHERE id = ?').run(trackId);
    return true;
}

export function updateAlbumDB(albumId: string, updates: any) {
    const fields = Object.keys(updates);
    if (fields.length === 0) return false;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    db.prepare(`UPDATE albums SET ${setClause} WHERE id = ? `).run(...values, albumId);
    return true;
}

export function deleteAlbumDB(albumId: string) {
    db.prepare('DELETE FROM albums WHERE id = ?').run(albumId);
    return true;
}

export function deleteVersionDB(versionId: string) {
    db.prepare('DELETE FROM versions WHERE id = ?').run(versionId);
    return true;
}

// Workspace Helpers
export function getWorkspacesDB() {
    return db.prepare('SELECT * FROM workspaces ORDER BY createdAt DESC').all() as any[];
}

export function addWorkspaceDB(name: string, path: string) {
    const id = "WSP-" + Date.now();
    db.prepare('INSERT INTO workspaces (id, name, path, createdAt) VALUES (?, ?, ?, ?)').run(id, name, path, Date.now());
    return { id, name, path };
}

export function removeWorkspaceDB(id: string) {
    // Delete all versions belonging to this workspace
    db.prepare('DELETE FROM versions WHERE workspaceId = ?').run(id);
    // Delete the workspace itself
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    return true;
}

// DAW Helpers
export function getDAWPathsDB() {
    return db.prepare('SELECT * FROM daw_paths').all() as any[];
}

export function saveDAWPathDB(daw: any) {
    const id = daw.id || "DAW-" + Date.now();
    db.prepare('INSERT OR REPLACE INTO daw_paths (id, name, path, version) VALUES (?, ?, ?, ?)').run(id, daw.name, daw.path, daw.version || '');
    return { id, ...daw };
}

// Local Library Helpers
export function addLocalFolderDB(path: string, name: string) {
    const id = "LFD-" + Date.now();
    db.prepare('INSERT OR IGNORE INTO local_folders (id, path, name, scannedAt) VALUES (?, ?, ?, ?)').run(id, path, name, Date.now());
    return { id, path, name };
}

export function getLocalFoldersDB() {
    return db.prepare(`
        SELECT lf.*, COUNT(f.id) as fileCount 
        FROM local_folders lf 
        LEFT JOIN local_files f ON lf.id = f.folderId 
        GROUP BY lf.id 
        ORDER BY lf.name ASC
    `).all() as any[];
}

export function removeLocalFolderDB(id: string) {
    db.prepare('DELETE FROM local_folders WHERE id = ?').run(id);
    return true;
}

export function addLocalFileDB(file: any) {
    // file object: { folderId, path, filename, type, instrument, key, bpm, duration, size }
    const id = "LFL-" + Math.random().toString(36).substr(2, 9);
    try {
        db.prepare(`
            INSERT INTO local_files(id, folderId, path, filename, type, instrument, key, bpm, duration, size)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
    scannedAt = ? --Just to touch it if needed, but we don't have scannedAt on file. Re-insert logic basically.
        `).run(id, file.folderId, file.path, file.filename, file.type, file.instrument, file.key, file.bpm, file.duration, file.size);
    } catch (e) {
        // If conflict and we want to update metadata? For now ignore unique constraint if needed or REPLACE
        // Using replace for simple updates
        db.prepare(`
             INSERT OR REPLACE INTO local_files(id, folderId, path, filename, type, instrument, key, bpm, duration, size)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, file.folderId, file.path, file.filename, file.type, file.instrument, file.key, file.bpm, file.duration, file.size);
    }
}

export function getLocalFilesDB(folderId?: string) {
    if (folderId) {
        return db.prepare('SELECT * FROM local_files WHERE folderId = ?').all(folderId) as any[];
    }
    return db.prepare('SELECT * FROM local_files').all() as any[];
}

export function getLocalFilesGroupedDB() {
    // Determine thumbnail based on instrument?
    // Group by instrument
    return db.prepare(`
        SELECT instrument as category, COUNT(id) as count, MIN(path) as samplePath
        FROM local_files
        WHERE instrument IS NOT NULL
        GROUP BY instrument
        ORDER BY count DESC
    `).all() as any[];
}

export function getLocalFilesByCategoryDB(category: string) {
    return db.prepare(`
        SELECT * FROM local_files WHERE instrument = ?
    `).all(category) as any[];
}

export function saveWaveformDB(type: 'sample' | 'local' | 'track', id: string, waveform: string) {
    if (type === 'sample') {
        db.prepare('UPDATE samples SET waveform = ? WHERE id = ?').run(waveform, id);
    } else if (type === 'local') {
        db.prepare('UPDATE local_files SET waveform = ? WHERE id = ?').run(waveform, id);
    } else if (type === 'track') {
        db.prepare('UPDATE tracks SET waveform = ? WHERE id = ?').run(waveform, id);
    }
    return true;
}

export function saveWaveformCacheDB(urlId: string, waveform: string) {
    db.prepare('INSERT OR REPLACE INTO waveform_cache (url_id, waveform, updatedAt) VALUES (?, ?, ?)').run(urlId, waveform, Date.now());
    return true;
}

export function getWaveformCacheDB(urlId: string) {
    const row = db.prepare('SELECT waveform FROM waveform_cache WHERE url_id = ?').get(urlId) as { waveform: string } | undefined;
    return row ? row.waveform : null;
}

initDB();
export default db;
