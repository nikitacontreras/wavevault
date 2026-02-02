import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import ip from 'ip';
import cors from 'cors';
import { BrowserWindow } from 'electron';
import { searchYoutube } from './downloader';

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

        expressApp.get('/', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>WaveVault Link</title>
    <style>
        :root {
            --bg: #000000;
            --surface: #121212;
            --surface-light: #2a2a2a;
            --primary: #ffffff;
            --secondary: #a0a0a0;
            --accent: #3b82f6;
            --danger: #ef4444;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: var(--bg); color: var(--primary); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        
        /* Layout */
        .page { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding: 20px; padding-bottom: 80px; }
        .page.active { display: flex; }
        
        /* Auth */
        #auth-screen { justify-content: center; align-items: center; text-align: center; height: 100%; display: none; }
        #auth-screen.active { display: flex; }
        .code-display { font-size: 32px; font-family: monospace; letter-spacing: 4px; margin: 20px 0; color: var(--accent); }
        
        /* Player */
        .album-art { width: 100%; aspect-ratio: 1; background: var(--surface); border-radius: 12px; margin-bottom: 25px; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .album-art img { width: 100%; height: 100%; object-fit: cover; }
        .album-art.empty::after { content: "🎵"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 64px; opacity: 0.2; }
        
        .track-info { text-align: center; margin-bottom: 20px; }
        .track-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 10px; }
        .track-artist { font-size: 15px; color: var(--secondary); font-weight: 500; }
        
        /* Progress */
        .progress-container { margin-bottom: 30px; padding: 0 10px; }
        .time-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--secondary); font-weight: 700; margin-top: 8px; font-family: monospace; }
        
        /* Universal Range Style */
        input[type=range] { -webkit-appearance: none; background: transparent; width: 100%; cursor: pointer; }
        input[type=range]:focus { outline: none; }
        input[type=range]::-webkit-slider-runnable-track { background: var(--surface-light); height: 4px; border-radius: 2px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: var(--primary); border-radius: 50%; margin-top: -5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }

        .controls { display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 30px; }
        .btn-control { background: none; border: none; color: var(--primary); cursor: pointer; padding: 10px; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }
        .btn-control:active { opacity: 0.5; }
        .btn-play { width: 68px; height: 68px; background: var(--primary); color: var(--bg); border-radius: 50%; box-shadow: 0 4px 12px rgba(255,255,255,0.2); }
        
        .volume-container { display: flex; align-items: center; gap: 15px; padding: 0 10px; opacity: 0.7; }
        .volume-container svg { flex-shrink: 0; }

        /* Search & Downloads */
        .section-header { font-size: 10px; font-weight: 900; color: var(--secondary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; margin-top: 25px; padding-left: 5px; }
        
        .search-bar { position: sticky; top: 0; background: var(--bg); padding: 5px 0 15px 0; z-index: 10; display: flex; gap: 10px; }
        .search-input { flex: 1; background: var(--surface); border: 1px solid rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 12px; color: var(--primary); font-size: 15px; outline: none; }
        .search-btn { background: var(--primary); color: var(--bg); border: none; padding: 0 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        
        .link-container { background: var(--surface); padding: 15px; border-radius: 15px; border: 1px dashed rgba(255,255,255,0.1); margin-top: 10px; }
        .link-input { width: 100%; background: rgba(0,0,0,0.3); border: none; padding: 12px; border-radius: 8px; color: var(--primary); font-size: 13px; margin-bottom: 10px; outline: none; }
        .btn-download-link { width: 100%; background: var(--accent); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }

        .results-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .result-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface); border-radius: 12px; }
        .result-thumb { width: 45px; height: 45px; border-radius: 6px; object-fit: cover; background: #333; }
        .result-info { flex: 1; min-width: 0; }
        .result-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .result-meta { font-size: 11px; color: var(--secondary); }
        .btn-result { background: var(--surface-light); color: var(--primary); border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }

        /* Navigation */
        .nav-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: rgba(10,10,10,0.95); backdrop-filter: blur(20px); display: flex; border-top: 1px solid rgba(255,255,255,0.05); z-index: 100; padding: 0 10px; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--secondary); text-decoration: none; font-size: 9px; font-weight: 700; cursor: pointer; opacity: 0.6; transition: all 0.2s; }
        .nav-item.active { color: var(--primary); opacity: 1; }
        .nav-icon { width: 20px; height: 20px; }
        
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>

    <!-- Auth -->
    <div id="auth-screen">
        <div>
            <h2>WaveVault Link</h2>
            <p style="color:var(--secondary)">Pairing with desktop...</p>
            <div class="code-display" id="pairing-code">...</div>
            <p style="font-size:12px; color:var(--secondary)">Confirm this code on your computer</p>
        </div>
    </div>

    <!-- Player -->
    <div id="player-page" class="page">
        <div class="album-art empty" id="album-art-container">
            <img id="album-img" style="display:none;" />
        </div>
        
        <div class="track-info">
            <div class="track-title" id="track-title">Not Playing</div>
            <div class="track-artist" id="track-artist">WaveVault</div>
        </div>

        <div class="progress-container">
            <input type="range" id="progress-slider" min="0" max="100" value="0" step="0.1">
            <div class="time-labels">
                <span id="time-current">0:00</span>
                <span id="time-duration">0:00</span>
            </div>
        </div>
        
        <div class="controls">
            <button class="btn-control" onclick="sendCmd('prev')">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="btn-control btn-play" id="play-btn" onclick="togglePlay()">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" id="play-icon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="btn-control" onclick="sendCmd('next')">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
        </div>
        
        <div class="volume-container">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <input type="range" min="0" max="1" step="0.05" oninput="setVolume(this.value)" id="vol-slider">
        </div>
    </div>

    <!-- Search/Link Page -->
    <div id="search-page" class="page">
        <div class="section-header">Download from URL</div>
        <div class="link-container">
            <input type="text" class="link-input" id="url-input" placeholder="Paste YouTube link here...">
            <button class="btn-download-link" id="btn-quick-dl" onclick="quickDownload()">Download Audio</button>
        </div>

        <div class="section-header">Search YouTube</div>
        <div class="search-bar">
            <input type="text" class="search-input" id="search-input" placeholder="Search..." onkeypress="if(event.key==='Enter')performSearch()">
            <button class="search-btn" onclick="performSearch()">Go</button>
        </div>
        <div class="results-list" id="results-list">
            <div style="text-align:center; color:var(--secondary); margin-top:30px; font-size:12px;">Search for songs or playlists</div>
        </div>
    </div>

    <!-- Navigation -->
    <div class="nav-bar" id="nav-bar" style="display:none;">
        <div class="nav-item active" onclick="switchTab('player')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span>Player</span>
        </div>
        <div class="nav-item" onclick="switchTab('search')">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Discovery</span>
        </div>
    </div>

    <script>
        const socket = io();
        const deviceId = localStorage.getItem('wv_device_id') || Math.random().toString(36).substring(7);
        localStorage.setItem('wv_device_id', deviceId);

        const authScreen = document.getElementById('auth-screen');
        const playerPage = document.getElementById('player-page');
        const searchPage = document.getElementById('search-page');
        const navBar = document.getElementById('nav-bar');
        const playIcon = document.getElementById('play-icon');
        const progressSlider = document.getElementById('progress-slider');
        
        let currentResults = [];
        let isUserSeeking = false;
        let lastDuration = 0;

        socket.on('connect', () => {
            socket.emit('identify', { deviceId, deviceName: navigator.userAgent });
        });

        socket.on('auth_required', (data) => {
            authScreen.classList.add('active');
            navBar.style.display = 'none';
            document.getElementById('pairing-code').innerText = data.code;
        });

        socket.on('authorized', () => {
            authScreen.classList.remove('active');
            navBar.style.display = 'flex';
            switchTab('player');
        });

        progressSlider.oninput = () => { isUserSeeking = true; };
        progressSlider.onchange = () => {
            const time = (progressSlider.value / 100) * lastDuration;
            socket.emit('command', { type: 'seek', value: time });
            isUserSeeking = false;
        };

        function formatTime(s) {
            if (isNaN(s)) return '0:00';
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        socket.on('state_update', (state) => {
            document.getElementById('track-title').innerText = state.track?.title || "Not Playing";
            document.getElementById('track-artist').innerText = state.track?.artist || "WaveVault";
            const img = document.getElementById('album-img');
            const cont = document.getElementById('album-art-container');
            if (state.track?.thumbnail) {
                img.src = state.track.thumbnail;
                img.style.display = 'block';
                cont.classList.remove('empty');
            } else {
                img.style.display = 'none';
                cont.classList.add('empty');
            }
            playIcon.innerHTML = state.isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
            document.getElementById('vol-slider').value = state.volume;

            // Progress Update
            lastDuration = state.duration;
            document.getElementById('time-current').innerText = formatTime(state.currentTime);
            document.getElementById('time-duration').innerText = formatTime(state.duration);
            
            if (!isUserSeeking && state.duration > 0) {
                progressSlider.value = (state.currentTime / state.duration) * 100;
            }
        });

        socket.on('search_results', (results) => {
            currentResults = results;
            const list = document.getElementById('results-list');
            list.innerHTML = '';
            
            if (results.length === 0) {
                list.innerHTML = '<div style="text-align:center; color:var(--secondary); margin-top:40px;">No results found</div>';
                return;
            }

            results.forEach((r, i) => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = \`
                    <img src="\${r.thumbnail}" class="result-thumb">
                    <div class="result-info">
                        <div class="result-title">\${r.title}</div>
                        <div class="result-meta">\${r.channel} • \${r.duration}</div>
                    </div>
                    <button class="btn-result" onclick="requestDownload(\${i})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button class="btn-result" onclick="requestPlay(\${i})" style="margin-left:8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                \`;
                list.appendChild(div);
            });
        });

        function switchTab(tab) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            if(tab === 'player') {
                document.querySelector('.nav-item:nth-child(1)').classList.add('active');
                playerPage.classList.add('active');
                searchPage.classList.remove('active');
            } else {
                document.querySelector('.nav-item:nth-child(2)').classList.add('active');
                searchPage.classList.add('active');
                playerPage.classList.remove('active');
            }
        }

        function togglePlay() { socket.emit('command', { type: 'playPause' }); }
        function sendCmd(cmd) { socket.emit('command', { type: cmd }); }
        function setVolume(val) { socket.emit('command', { type: 'volume', value: parseFloat(val) }); }
        
        function performSearch() {
            const q = document.getElementById('search-input').value;
            if(!q) return;
            document.getElementById('results-list').innerHTML = '<div style="text-align:center; margin-top:40px;">Searching...</div>';
            socket.emit('search', q);
        }

        function requestDownload(idx) {
            const r = currentResults[idx];
            event.currentTarget.innerHTML = '<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
            socket.emit('download', { url: r.url, title: r.title });
        }

        function requestPlay(idx) {
            const r = currentResults[idx];
            socket.emit('play_url', { url: r.url, title: r.title, thumbnail: r.thumbnail, channel: r.channel });
            switchTab('player');
        }

        function quickDownload() {
            const url = document.getElementById('url-input').value;
            if (!url) return;
            const btn = document.getElementById('btn-quick-dl');
            const originalText = btn.innerText;
            btn.innerText = 'Starting...';
            btn.disabled = true;
            socket.emit('download', { url, title: 'URL download' });
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
                document.getElementById('url-input').value = '';
            }, 2000);
        }
    </script>
</body>
</html>
            `);
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

        server.listen(port || 3000, () => {
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
