import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface ProjectVersion {
    id: string;
    name: string;
    path: string;
    type: 'flp' | 'zip';
    lastModified: number;
}

export interface ProjectTrack {
    id: string;
    name: string;
    status: 'Idea' | 'Arreglo' | 'Mezcla' | 'Master' | 'Terminado';
    bpm?: number;
    key?: string;
    tags: string[];
    versions: ProjectVersion[];
}

export interface ProjectAlbum {
    id: string;
    name: string;
    artist: string;
    artwork?: string;
    tracks: ProjectTrack[];
}

export interface ProjectsDB {
    albums: ProjectAlbum[];
    unorganized: ProjectVersion[]; // Archivos escaneados pero no anidados aún
}

const DB_PATH = path.join(app.getPath("userData"), "projects_v2.json");

let db: ProjectsDB = {
    albums: [],
    unorganized: []
};

export function saveProjectsDB() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Failed to save projects DB:", e);
    }
}

export function loadProjectsDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

            // Migration & Safety
            db.albums = data.albums || [];
            db.unorganized = data.unorganized || data.inbox || data.looseTracks || [];

            // If we migrated from inbox or looseTracks, save the new format
            if (data.inbox || data.looseTracks) {
                saveProjectsDB();
            }
        }
    } catch (e) {
        console.error("Failed to load projects DB:", e);
    }
}

export function getProjectsDB() {
    return db;
}

export function addToUnorganized(version: ProjectVersion) {
    if (!db.unorganized.some(v => v.path === version.path)) {
        db.unorganized.push(version);
        saveProjectsDB();
    }
}

export function createAlbum(name: string, artist: string) {
    const album: ProjectAlbum = {
        id: "ALB-" + Date.now().toString(),
        name,
        artist,
        tracks: []
    };
    db.albums.push(album);
    saveProjectsDB();
    return album;
}

export function createTrack(name: string, albumId: string) {
    const track: ProjectTrack = {
        id: "TRK-" + Date.now().toString(),
        name,
        status: 'Idea',
        tags: [],
        versions: []
    };

    const album = db.albums.find(a => a.id === albumId);
    if (album) {
        album.tracks.push(track);
        saveProjectsDB();
    }
    return track;
}

export function moveVersionToTrack(versionId: string, trackId: string) {
    // 1. Find version in unorganized
    const versionIdx = db.unorganized.findIndex(v => v.id === versionId);
    if (versionIdx === -1) return false;

    const version = db.unorganized[versionIdx];

    // 2. Find target track
    for (const album of db.albums) {
        const track = album.tracks.find(t => t.id === trackId);
        if (track) {
            track.versions.push(version);
            db.unorganized.splice(versionIdx, 1);
            saveProjectsDB();
            return true;
        }
    }
    return false;
}

loadProjectsDB();
