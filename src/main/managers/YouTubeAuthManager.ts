import { BrowserWindow, session } from 'electron';
import { setConfigDB, getConfigDB } from '../db';
import { WindowManager } from './WindowManager';

export class YouTubeAuthManager {
    private static loginWindow: BrowserWindow | null = null;

    static async openLoginWindow() {
        if (this.loginWindow) {
            this.loginWindow.focus();
            return;
        }

        const standardUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
        console.log("[YouTubeAuth] Starting login session with UA:", standardUA);
        
        const ses = session.fromPartition('persist:youtube');
        await ses.clearStorageData(); // Complete fresh start
        ses.setUserAgent(standardUA);

        // Set realistic headers
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
            const { requestHeaders } = details;
            delete requestHeaders['X-Electron-Process-Type'];
            requestHeaders['sec-ch-ua'] = '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"';
            requestHeaders['sec-ch-ua-mobile'] = '?0';
            requestHeaders['sec-ch-ua-platform'] = '"Windows"';
            requestHeaders['Upgrade-Insecure-Requests'] = '1';
            callback({ cancel: false, requestHeaders });
        });

        this.loginWindow = new BrowserWindow({
            width: 700,
            height: 900,
            title: 'YouTube Login - WaveVault',
            show: false,
            backgroundColor: '#000000',
            userAgent: standardUA,
            webPreferences: {
                partition: 'persist:youtube',
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                spellcheck: true
            }
        });

        this.loginWindow.setMenu(null);

        // Ultimate bypass: Spoof core navigator properties
        this.loginWindow.webContents.on('dom-ready', () => {
            this.loginWindow?.webContents.executeJavaScript(`
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es'] });
                Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            `).catch(() => {});
        });

        // Use the signin URL directly
        this.loginWindow.loadURL('https://www.youtube.com/signin?next=https%3A%2F%2Fwww.youtube.com%2F&feature=sign_in_button&action_handle_signin=true&hl=es');

        this.loginWindow.once('ready-to-show', () => {
            this.loginWindow?.show();
        });

        this.loginWindow.on('closed', () => {
            this.loginWindow = null;
        });

        // Listen for navigation to confirm login
        this.loginWindow.webContents.on('did-navigate', async (_event, url) => {
            console.log("[YouTubeAuth] Navigated to:", url);
            // If we are back on youtube and not on a login page, we likely finished
            if (url.includes('youtube.com') && !url.includes('accounts.google.com') && !url.includes('ServiceLogin')) {
                console.log("[YouTubeAuth] Login detected, waiting for cookies to settle...");
                setTimeout(async () => {
                    await YouTubeAuthManager.extractAndSaveCookies();
                }, 2000);
            }
        });
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
                
                // Notify renderer that status changed
                const win = WindowManager.getInstance().mainWindow;
                if (win) {
                    win.webContents.send('youtube:status-changed', { connected: true });
                }

                if (this.loginWindow) {
                    this.loginWindow.close();
                }
            }
        } catch (error) {
            console.error("[YouTubeAuth] Error extracting cookies:", error);
        }
    }

    static logout() {
        setConfigDB('youtube_cookies', null);
        const ses = session.fromPartition('persist:youtube');
        ses.clearStorageData();
        
        const win = WindowManager.getInstance().mainWindow;
        if (win) {
            win.webContents.send('youtube:status-changed', { connected: false });
        }
    }

    static hasCookies() {
        const cookies = getConfigDB('youtube_cookies');
        return !!(cookies && Array.isArray(cookies) && cookies.length > 0);
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
