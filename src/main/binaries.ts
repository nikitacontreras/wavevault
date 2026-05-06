import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export function getResourceBinaryPath(binName: string): string {
    const isWin = process.platform === 'win32';
    const finalBinName = isWin && !binName.endsWith('.exe') ? `${binName}.exe` : binName;

    let root = '';

    // Electron app is not available in worker threads
    let isPackaged = false;
    let appPath = '';

    try {
        isPackaged = app.isPackaged;
        appPath = app.getAppPath();
    } catch (e) {
        // We are in a worker or something without Electron app
        // Fallback to relative paths
        const base = path.join(__dirname, '..', '..');
        root = path.join(base, 'resources', 'bin', binName);
        if (fs.existsSync(root)) return fs.statSync(root).isDirectory() ? path.join(root, finalBinName) : root;
        return root;
    }

    if (isPackaged) {
        root = path.join(process.resourcesPath, 'bin', binName);
    } else {
        if (appPath.endsWith(path.join('src', 'main'))) {
            appPath = path.join(appPath, '..', '..');
        } else if (appPath.endsWith('main') || appPath.endsWith('src')) {
            appPath = path.join(appPath, '..');
        }
        root = path.join(appPath, 'resources', 'bin', binName);
    }

    const resolvedPath = (fs.existsSync(root) && fs.statSync(root).isDirectory()) 
        ? path.join(root, finalBinName) 
        : root;

    if (!fs.existsSync(resolvedPath)) {
        console.warn(`[binaries] Resource not found at: ${resolvedPath}`);
    }

    return resolvedPath;
}

export function getAIEnginePath(): string {
    const unified = getResourceBinaryPath('ai_engine');
    if (fs.existsSync(unified)) return unified;
    return getResourceBinaryPath('separate_stems');
}

export function getSeparateStemsPath(): string {
    const unified = getResourceBinaryPath('ai_engine');
    if (fs.existsSync(unified)) return unified;
    return getResourceBinaryPath('separate_stems');
}

export function getClassifyAudioPath(): string {
    const unified = getResourceBinaryPath('ai_engine');
    if (fs.existsSync(unified)) return unified;
    return getResourceBinaryPath('classify_audio');
}

export function getBinaryPath(packageName: string, binName: string): string {
    const isWin = process.platform === 'win32';
    const finalBinName = isWin && !binName.endsWith('.exe') ? `${binName}.exe` : binName;
    const prodPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', packageName, 'bin', finalBinName);

    let isPackaged = false;
    let rootPath = '';
    try {
        isPackaged = app.isPackaged;
        rootPath = app.getAppPath();
    } catch (e) {
        // Worker fallback
        return path.join(__dirname, '..', '..', 'node_modules', packageName, 'bin', finalBinName);
    }

    if (rootPath.endsWith(path.join('src', 'main'))) rootPath = path.join(rootPath, '..', '..');
    const devPath = path.join(rootPath, 'node_modules', packageName, 'bin', finalBinName);

    return isPackaged ? prodPath : devPath;
}

export function getYtDlpPath(): string {
    const p = getBinaryPath('yt-dlp-exec', 'yt-dlp');
    if (fs.existsSync(p)) return p;
    
    console.warn(`[binaries] yt-dlp not found at default path: ${p}`);

    // Fallback: search in common locations
    const isPackaged = app.isPackaged;
    const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp'),
        path.join(process.resourcesPath, 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp'),
        path.join(process.cwd(), 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp'),
        path.join(process.cwd(), 'bin', 'yt-dlp'),
    ];
    
    if (!isPackaged) {
        possiblePaths.push(path.join(app.getAppPath(), 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp'));
    }
    
    for (const pp of possiblePaths) {
        if (fs.existsSync(pp)) {
            console.log(`[binaries] yt-dlp found at fallback: ${pp}`);
            return pp;
        }
    }
    
    console.error("[binaries] CRITICAL: yt-dlp not found anywhere. Falling back to shell command.");
    return 'yt-dlp';
}

export function fixAsarPath(p: string): string {
    if (!p) return p;
    return p.replace('app.asar', 'app.asar.unpacked');
}
