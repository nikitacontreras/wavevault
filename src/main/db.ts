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
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            type TEXT,
            lastModified INTEGER,
            isUnorganized INTEGER DEFAULT 0,
            FOREIGN KEY(trackId) REFERENCES tracks(id) ON DELETE CASCADE
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
    const allVersions = db.prepare('SELECT * FROM versions ORDER BY lastModified DESC').all() as any[];

    const result = {
        albums: albums.map(album => ({
            ...album,
            tracks: db.prepare('SELECT * FROM tracks WHERE albumId = ? ORDER BY createdAt DESC').all(album.id).map((track: any) => ({
                ...track,
                versions: db.prepare('SELECT * FROM versions WHERE trackId = ? ORDER BY lastModified DESC').all(track.id)
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

export function addToUnorganizedDB(version: any) {
    try {
        db.prepare(`
            INSERT OR IGNORE INTO versions (id, name, path, type, lastModified, isUnorganized)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(version.id, version.name, version.path, version.type, version.lastModified);
    } catch (e) {
        // Path might already exist
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

    db.prepare(`UPDATE tracks SET ${setClause} WHERE id = ?`).run(...values, trackId);
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
    db.prepare(`UPDATE albums SET ${setClause} WHERE id = ?`).run(...values, albumId);
    return true;
}

export function deleteAlbumDB(albumId: string) {
    db.prepare('DELETE FROM albums WHERE id = ?').run(albumId);
    return true;
}

export function deleteVersionDB(versionId: string) {
    // If it's unorganized, we just remove the entry. 
    // If it's in a track, we could mark it as unorganized instead? 
    // User asked for "eliminar", so let's delete the reference.
    db.prepare('DELETE FROM versions WHERE id = ?').run(versionId);
    return true;
}

initDB();
export default db;
