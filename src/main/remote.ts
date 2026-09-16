import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import ip from 'ip';
import cors from 'cors';
import { BrowserWindow } from 'electron';
import { searchYoutube } from './downloader';
import path from 'path';
import fs from 'fs';

let server: http.Server | null = null;
let io: Server | null = null;
let currentPort: number | null = null;

// Pairing state management
interface PendingPairing {
    id: string;
    deviceName: string;
    code: string;
    socketId: string;
    expires: number;
}

export interface TrustedDevice {
    id: string;
    name: string;
    lastSeen: number;
}

export interface ActivePeer {
    id: string;
    socketId: string;
    name: string;
    authorized: boolean;
}

let pendingPairings: PendingPairing[] = [];
let trustedDevices: TrustedDevice[] = [];
let activePeers: ActivePeer[] = [];

// Playback state cache
let lastState: any = {
    isPlaying: false,
    track: null,
    volume: 1.0,
    currentTime: 0,
    duration: 0
};

export function startRemoteServer(port = 0): Promise<{ port: number, ip: string }> {
    return new Promise((resolve, reject) => {
        if (server) {
            resolve({ port: currentPort!, ip: ip.address() });
            return;
        }

        const expressApp = express();
        expressApp.use(cors());
        expressApp.use(express.json());

        const clientDir = path.join(__dirname, 'remote-client');
        expressApp.use(express.static(clientDir));

        expressApp.get('/', (req, res) => {
            res.sendFile(path.join(clientDir, 'index.html'));
        });

        server = http.createServer(expressApp);
        io = new Server(server, { cors: { origin: '*' } });

        io.on('connection', (socket) => {
            let socketDeviceId: string | null = null;

            socket.on('identify', (data) => {
                socketDeviceId = data.deviceId;

                // Add to active peers
                activePeers = activePeers.filter(p => p.socketId !== socket.id);
                const isTrusted = trustedDevices.find(d => d.id === data.deviceId);

                activePeers.push({
                    id: data.deviceId,
                    socketId: socket.id,
                    name: data.deviceName,
                    authorized: !!isTrusted
                });

                if (isTrusted) {
                    isTrusted.lastSeen = Date.now();
                    socket.emit('authorized');
                    socket.emit('state_update', lastState);
                } else {
                    const code = Math.floor(1000 + Math.random() * 9000).toString();
                    pendingPairings.push({
                        id: socketDeviceId!,
                        deviceName: data.deviceName,
                        code,
                        socketId: socket.id,
                        expires: Date.now() + 60000
                    });
                    notifyRendererPairingRequest(socketDeviceId!, data.deviceName, code);
                    socket.emit('auth_required', { code });
                }
                notifyStatusChange();
            });

            socket.on('command', (cmd) => {
                if (!socketDeviceId || !trustedDevices.some(d => d.id === socketDeviceId)) return;
                notifyRendererCommand(cmd);
            });

            socket.on('search', async (query) => {
                if (!socketDeviceId || !trustedDevices.some(d => d.id === socketDeviceId)) {
                    console.warn(`[Remote] Unauthorized search attempt from: ${socketDeviceId}`);
                    return;
                }
                console.log(`[Remote] Search request: "${query}"`);
                try {
                    const searchPromise = searchYoutube(query);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Search timeout")), 15000)
                    );

                    const results = await Promise.race([searchPromise, timeoutPromise]) as any[];
                    console.log(`[Remote] Search results found: ${results.length}`);
                    socket.emit('search_results', results);
                } catch (e: any) {
                    console.error(`[Remote] Search failed for "${query}":`, e.message);
                    socket.emit('search_results', []);
                }
            });

            socket.on('get_library', () => {
                if (!socketDeviceId || !trustedDevices.some(d => d.id === socketDeviceId)) return;
                const { getFullProjectDB, getConfigDB } = require('./db');
                const dbData = getFullProjectDB();
                const history = getConfigDB('download_history') || [];
                socket.emit('library_data', { ...dbData, history });
            });

            socket.on('download', (data) => {
                if (!socketDeviceId || !trustedDevices.some(d => d.id === socketDeviceId)) return;
                notifyRendererCommand({ type: 'download', url: data.url, title: data.title });
            });

            socket.on('play_url', (data) => {
                if (!socketDeviceId || !trustedDevices.some(d => d.id === socketDeviceId)) return;
                notifyRendererCommand({ type: 'playUrl', url: data.url, metadata: data });
            });

            socket.on('disconnect', () => {
                activePeers = activePeers.filter(p => p.socketId !== socket.id);
                notifyStatusChange();
            });
        });

        server.listen(port || 3000, '0.0.0.0', () => {
            const addr = server?.address();
            const p = typeof addr === 'string' ? 0 : addr?.port;
            currentPort = p!;
            resolve({ port: p!, ip: ip.address() });
        });

        server.on('error', (err) => {
            reject(err);
        });
    });
}

function notifyRendererPairingRequest(id: string, name: string, code: string) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('remote:pairing-request', { id, name, code });
    });
}

function notifyRendererCommand(cmd: any) {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('remote:command', cmd);
    });
}

export function stopRemoteServer() {
    if (server) {
        server.close();
        server = null;
        currentPort = null;
    }
    if (io) {
        io.close();
        io = null;
    }
}

export function broadcastState(state: any) {
    if (!io) return;
    lastState = { ...lastState, ...state };
    io.emit('state_update', lastState);
}

export function approvePairing(deviceId: string) {
    const idx = pendingPairings.findIndex(p => p.id === deviceId);
    if (idx !== -1) {
        const p = pendingPairings[idx];
        trustedDevices.push({
            id: deviceId,
            name: p.deviceName,
            lastSeen: Date.now()
        });

        io?.to(p.socketId).emit('authorized');
        io?.to(p.socketId).emit('state_update', lastState);
        pendingPairings.splice(idx, 1);

        // Update active peer status
        activePeers.forEach(peer => {
            if (peer.id === deviceId) peer.authorized = true;
        });

        notifyStatusChange();
        return true;
    }
    return false;
}

export function rejectPairing(deviceId: string) {
    pendingPairings = pendingPairings.filter(p => p.id !== deviceId);
    notifyStatusChange();
}

export function getRemoteStatus() {
    return {
        trustedDevices,
        activePeers
    };
}

export function forgetDevice(deviceId: string) {
    trustedDevices = trustedDevices.filter(d => d.id !== deviceId);

    // De-authorize active peers with this ID
    activePeers.forEach(peer => {
        if (peer.id === deviceId) {
            peer.authorized = false;
            io?.to(peer.socketId).emit('auth_required', { code: 'FORGOTTEN' });
        }
    });

    notifyStatusChange();
}

function notifyStatusChange() {
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('remote:status-updated', getRemoteStatus());
    });
}
