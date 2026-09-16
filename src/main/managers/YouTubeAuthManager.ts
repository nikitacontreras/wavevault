import { BrowserWindow, session, app } from 'electron';
import path from 'path';
import { setConfigDB, getConfigDB } from '../db';
import { WindowManager } from './WindowManager';

export class YouTubeAuthManager {
    private static loginWindow: BrowserWindow | null = null;

    static async openLoginWindow() {
        if (this.loginWindow) {
            this.loginWindow.focus();
            return;
        }

        const isMac = process.platform === 'darwin';
        const standardUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15";
        console.log("[YouTubeAuth] Starting login session with Safari UA:", standardUA);

        const ses = session.fromPartition('persist:youtube');
        await ses.clearStorageData(); // Complete fresh start
        ses.setUserAgent(standardUA);

        // Set realistic headers matching Safari (delete Chromium Client Hints)
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
            const { requestHeaders } = details;
            delete requestHeaders['X-Electron-Process-Type'];
            delete requestHeaders['sec-ch-ua'];
            delete requestHeaders['sec-ch-ua-mobile'];
            delete requestHeaders['sec-ch-ua-platform'];
            requestHeaders['Upgrade-Insecure-Requests'] = '1';
            callback({ cancel: false, requestHeaders });
        });

        const isDev = !app.isPackaged;
        const preloadPath = isDev
            ? path.resolve(__dirname, "../../dist/preload.js")
            : path.resolve(__dirname, "../preload.js");

        this.loginWindow = new BrowserWindow({
            width: 700,
            height: 900,
            title: 'YouTube Login - WaveVault',
            show: false,
            backgroundColor: '#000000',
            webPreferences: {
                partition: 'persist:youtube',
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                spellcheck: true,
                preload: preloadPath
            }
        });

        this.loginWindow.webContents.setUserAgent(standardUA);

        this.loginWindow.setMenu(null);

        // Ultimate bypass: Spoof core navigator properties to match Safari
        this.loginWindow.webContents.on('dom-ready', () => {
            this.loginWindow?.webContents.executeJavaScript(`
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en-US', 'en'] });
                Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
                Object.defineProperty(navigator, 'vendor', { get: () => 'Apple Computer, Inc.' });
            `).catch(() => { });
        });

        // Use the signin URL directly
        this.loginWindow.loadURL('https://www.youtube.com/signin');

        this.loginWindow.once('ready-to-show', () => {
            this.loginWindow?.show();
        });

        this.loginWindow.on('closed', () => {
            this.loginWindow = null;
        });

        // Listen for navigation to confirm login
        this.loginWindow.webContents.on('did-navigate', async (_event, url) => {
            console.log("[YouTubeAuth] Navigated to:", url);
            // If we are back on youtube and not on a login page or error page, we likely finished
            if (url.includes('youtube.com') && !url.includes('accounts.google.com') && !url.includes('ServiceLogin') && !url.includes('/oops')) {
                console.log("[YouTubeAuth] Login detected, waiting for cookies to settle...");
                setTimeout(async () => {
                    await YouTubeAuthManager.extractAndSaveCookies();
                }, 2000);
            }
        });
    }

    static async fetchProfile(): Promise<any> {
        try {
            const ses = session.fromPartition('persist:youtube');
            const res = await ses.fetch('https://www.youtube.com', {
                headers: {
                    'User-Agent': YouTubeAuthManager.getSanitizedUA()
                }
            });
            const html = await res.text();

            let name = '';
            let handle = '';
            let id = '';
            let avatar = '';

            // Extract avatar URL
            const avatarMatch = html.match(/"avatar":{"thumbnails":\[{"url":"([^"]+)"/);
            if (avatarMatch) {
                avatar = avatarMatch[1];
            }

            // Extract ytInitialData configuration
            const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
            if (ytDataMatch) {
                try {
                    const ytData = JSON.parse(ytDataMatch[1]);
                    if (ytData.topbar && ytData.topbar.desktopTopbarRenderer) {
                        const userMenu = ytData.topbar.desktopTopbarRenderer.userMenu;
                        if (userMenu && userMenu.multiPageMenuRenderer && userMenu.multiPageMenuRenderer.header) {
                            const headerRenderer = userMenu.multiPageMenuRenderer.header.activeAccountHeaderRenderer;
                            if (headerRenderer) {
                                name = headerRenderer.accountName?.simpleText || 
                                       (headerRenderer.accountName?.runs && headerRenderer.accountName.runs[0]?.text) || '';
                                handle = headerRenderer.channelHandle?.simpleText || 
                                         (headerRenderer.channelHandle?.runs && headerRenderer.channelHandle.runs[0]?.text) || '';
                                if (headerRenderer.serviceEndpoint?.browseEndpoint?.browseId) {
                                    id = headerRenderer.serviceEndpoint.browseEndpoint.browseId;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("[YouTubeAuth] Failed to parse ytInitialData from HTML:", e);
                }
            }

            // Fallback avatar search in HTML
            if (!avatar) {
                const imgMatch = html.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/);
                if (imgMatch) avatar = imgMatch[1];
            }

            return { name, handle, avatar, id };
        } catch (err: any) {
            console.error("[YouTubeAuth] Error fetching profile in background:", err.message);
            return null;
        }
    }

    static async extractAndSaveCookies() {
        try {
            const ses = session.fromPartition('persist:youtube');
            const ytCookies = await ses.cookies.get({ domain: '.youtube.com' });
            const googleCookies = await ses.cookies.get({ domain: '.google.com' });
            const cookies = [...ytCookies, ...googleCookies];

            if (cookies.length > 0) {
                // Save as JSON string for DB
                setConfigDB('youtube_cookies', cookies);
                console.log(`[YouTubeAuth] Saved ${cookies.length} cookies to DB`);

                // Close the login window immediately for good UX
                if (this.loginWindow) {
                    this.loginWindow.close();
                }

                // Fetch profile in the background
                this.fetchProfile().then((profile) => {
                    if (profile && (profile.name || profile.id)) {
                        console.log("[YouTubeAuth] Extracted profile in background:", profile);
                        setConfigDB('youtube_profile', profile);
                        
                        // Notify renderer that profile details have arrived
                        const win = WindowManager.getInstance().mainWindow;
                        if (win) {
                            win.webContents.send('youtube:status-changed', { connected: true, profile });
                        }
                    }
                }).catch((err) => {
                    console.error("[YouTubeAuth] Background profile fetch failed:", err);
                });

                // Notify renderer immediately that we are connected
                const win = WindowManager.getInstance().mainWindow;
                if (win) {
                    win.webContents.send('youtube:status-changed', { connected: true, profile: null });
                }
            }
        } catch (error) {
            console.error("[YouTubeAuth] Error extracting cookies:", error);
        }
    }

    static logout() {
        setConfigDB('youtube_cookies', null);
        setConfigDB('youtube_profile', null);
        const ses = session.fromPartition('persist:youtube');
        ses.clearStorageData();

        const win = WindowManager.getInstance().mainWindow;
        if (win) {
            win.webContents.send('youtube:status-changed', { connected: false, profile: null });
        }
    }

    static hasCookies() {
        const cookies = getConfigDB('youtube_cookies');
        return !!(cookies && Array.isArray(cookies) && cookies.length > 0);
    }

    static getProfile() {
        return getConfigDB('youtube_profile');
    }

    static getCookies() {
        return getConfigDB('youtube_cookies');
    }

    /**
     * Converts cookies from Electron format to Netscape format
     * @param cookies Array of Electron cookies
     */
    static formatCookiesToNetscape(cookies: any[]): string {
        let output = '# Netscape HTTP Cookie File\n';
        output += '# http://curl.haxx.se/rfc/cookie_spec.html\n';
        output += '# This is a generated file!  Do not edit.\n\n';

        for (const cookie of cookies) {
            // Netscape format: domain, include_subdomains, path, secure, expiry, name, value
            // domain: must start with . if it includes subdomains
            const domain = cookie.domain;
            const includeSubdomains = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const path = cookie.path;
            const secure = cookie.secure ? 'TRUE' : 'FALSE';
            const expiry = cookie.expirationDate ? Math.floor(cookie.expirationDate) : 0;
            const name = cookie.name;
            const value = cookie.value;

            output += `${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expiry}\t${name}\t${value}\n`;
        }

        return output;
    }

    static getSanitizedUA(): string {
        const defaultUA = session.defaultSession.getUserAgent();
        return defaultUA.replace(/Electron\/[0-9.]+\s?/, '').replace(/WaveVault\/[0-9.]+\s?/, '');
    }
}
