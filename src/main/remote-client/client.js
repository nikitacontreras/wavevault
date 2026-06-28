var socket = io();
var deviceId = localStorage.getItem('wv_device_id') || Math.random().toString(36).substring(7);
localStorage.setItem('wv_device_id', deviceId);

var authScreen = document.getElementById('auth-screen');
var playerPage = document.getElementById('player-page');
var searchPage = document.getElementById('search-page');
var libraryPage = document.getElementById('library-page');
var navBar = document.getElementById('nav-bar');
var playIcon = document.getElementById('play-icon');
var progressSlider = document.getElementById('progress-slider');
var libraryList = document.getElementById('library-list');

var currentResults = [];
var isUserSeeking = false;
var lastDuration = 0;

socket.on('connect', function() {
    socket.emit('identify', { deviceId: deviceId, deviceName: navigator.userAgent });
});

socket.on('auth_required', function(data) {
    authScreen.classList.add('active');
    navBar.style.display = 'none';
    document.getElementById('pairing-code').innerText = data.code;
});

socket.on('authorized', function() {
    authScreen.classList.remove('active');
    navBar.style.display = 'flex';
    switchTab('player');
});

progressSlider.oninput = function() { isUserSeeking = true; };
progressSlider.onchange = function() {
    var time = (progressSlider.value / 100) * lastDuration;
    socket.emit('command', { type: 'seek', value: time });
    isUserSeeking = false;
};

function formatTime(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

socket.on('state_update', function(state) {
    document.getElementById('track-title').innerText = (state.track && state.track.title) ? state.track.title : "Not Playing";
    document.getElementById('track-artist').innerText = (state.track && state.track.artist) ? state.track.artist : "WaveVault";
    var img = document.getElementById('album-img');
    var cont = document.getElementById('album-art-container');
    if (state.track && state.track.thumbnail) {
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

socket.on('search_results', function(results) {
    currentResults = results;
    var list = document.getElementById('results-list');
    list.innerHTML = '';
    
    if (results.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--secondary); margin-top:40px;">No results found</div>';
        return;
    }

    results.forEach(function(r, i) {
        var div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = 
            '<img src="' + r.thumbnail + '" class="result-thumb">' +
            '<div class="result-info">' +
                '<div class="result-title">' + r.title + '</div>' +
                '<div class="result-meta">' + r.channel + ' • ' + r.duration + '</div>' +
            '</div>' +
            '<button class="btn-result" onclick="requestDownload(this, ' + i + ')">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
             '</button>' +
             '<button class="btn-result" onclick="requestPlay(' + i + ')" style="margin-left:8px;">' +
                 '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
             '</button>';
        list.appendChild(div);
    });
});

socket.on('library_data', function(data) {
    libraryList.innerHTML = '';
    var allTracks = [];
    
    // Flatten Albums -> Tracks -> Versions (Downloads)
    if (data.albums) {
        data.albums.forEach(function(album) {
            if (album.tracks) {
                album.tracks.forEach(function(track) {
                    if (track.versions && track.versions.length > 0) {
                        track.versions.forEach(function(v) {
                            allTracks.push({
                                id: v.id,
                                title: v.name || track.title,
                                artist: album.artist || 'Unknown',
                                path: v.path,
                                thumbnail: album.artwork || '',
                                type: 'Download'
                            });
                        });
                    }
                });
            }
        });
    }

    // Flatten Local Folders -> Local Files
    if (data.localFolders) {
        data.localFolders.forEach(function(folder) {
            if (folder.files) {
                folder.files.forEach(function(file) {
                    allTracks.push({
                        id: file.id,
                        title: file.filename,
                        artist: folder.name || 'Local',
                        path: file.path,
                    });
                });
            }
        });
    }

    // Flatten Download History
    if (data.history) {
        data.history.forEach(function(item) {
            allTracks.push({
                id: item.id,
                title: item.title,
                artist: item.channel || item.source || 'Download',
                path: item.path,
                thumbnail: item.thumbnail || '',
                type: 'Download'
            });
        });
    }

    if (allTracks.length === 0) {
        libraryList.innerHTML = '<div style="text-align:center; color:var(--secondary); margin-top:40px;">Library is empty</div>';
        return;
    }

    allTracks.forEach(function(t) {
        var div = document.createElement('div');
        div.className = 'result-item';
        var safePath = t.path.replace(/\\\\/g, '/'); // Normalize for JS string
        div.innerHTML = 
            '<div class="result-thumb" style="display:flex; align-items:center; justify-content:center; background:var(--surface-light); font-size:20px; overflow:hidden;">' +
                (t.thumbnail ? '<img src="' + t.thumbnail + '" class="result-thumb">' : '🎵') +
            '</div>' +
            '<div class="result-info">' +
                '<div class="result-title">' + t.title + '</div>' +
                '<div class="result-meta">' + t.artist + '</div>' +
            '</div>' +
            '<div style="font-size: 8px; color: var(--secondary); background: rgba(255,255,255,0.05); padding: 2px 5px; border-radius: 4px; margin-right: 8px; border: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; font-weight: bold;">' + (t.type || 'Local') + '</div>' +
            '<button class="btn-result" onclick="playLibraryTrack(\'' + safePath.replace(/'/g, "\\'") + '\', \'' + t.title.replace(/'/g, "\\'") + '\', \'' + t.artist.replace(/'/g, "\\'") + '\', \'' + (t.thumbnail || '') + '\')">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</button>';
        libraryList.appendChild(div);
    });
});

function switchTab(tab) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function(el) {
        el.classList.remove('active');
    });
    playerPage.classList.remove('active');
    searchPage.classList.remove('active');
    libraryPage.classList.remove('active');

    if(tab === 'player') {
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
        playerPage.classList.add('active');
    } else if(tab === 'library') {
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        libraryPage.classList.add('active');
        socket.emit('get_library');
    } else if(tab === 'search') {
        document.querySelector('.nav-item:nth-child(3)').classList.add('active');
        searchPage.classList.add('active');
    }
}

function togglePlay() { socket.emit('command', { type: 'playPause' }); }
function sendCmd(cmd) { socket.emit('command', { type: cmd }); }
function setVolume(val) { socket.emit('command', { type: 'volume', value: parseFloat(val) }); }

function performSearch() {
    var q = document.getElementById('search-input').value;
    if(!q) return;
    document.getElementById('results-list').innerHTML = '<div style="text-align:center; margin-top:40px;">Searching...</div>';
    socket.emit('search', q);
}

function requestDownload(btn, idx) {
    var r = currentResults[idx];
    btn.innerHTML = '<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
    socket.emit('download', { url: r.url, title: r.title });
}

function requestPlay(idx) {
    var r = currentResults[idx];
    socket.emit('play_url', { url: r.url, title: r.title, thumbnail: r.thumbnail, channel: r.channel });
    switchTab('player');
}

function playLibraryTrack(path, title, artist, thumbnail) {
    socket.emit('play_url', { url: path, title: title, artist: artist, thumbnail: thumbnail });
    switchTab('player');
}

function quickDownload() {
    var url = document.getElementById('url-input').value;
    if (!url) return;
    var btn = document.getElementById('btn-quick-dl');
    var originalText = btn.innerText;
    btn.innerText = 'Starting...';
    btn.disabled = true;
    socket.emit('download', { url: url, title: 'URL download' });
    setTimeout(function() {
        btn.innerText = originalText;
        btn.disabled = false;
        document.getElementById('url-input').value = '';
    }, 2000);
}
