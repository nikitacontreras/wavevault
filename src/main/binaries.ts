import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export function getResourceBinaryPath(binName: string): string {
    const isWin = process.platform === 'win32';
    const finalBinName = isWin && !binName.endsWith('.exe') ? `${binName}.exe` : binName;

    let root = '';
    if (app.isPackaged) {
        root = path.join(process.resourcesPath, 'bin', binName);
    } else {
        let appPath = app.getAppPath();
        if (appPath.endsWith(path.join('src', 'main'))) {
            appPath = path.join(appPath, '..', '..');
        } else if (appPath.endsWith('main') || appPath.endsWith('src')) {
            appPath = path.join(appPath, '..');
        }
        root = path.join(appPath, 'resources', 'bin', binName);
    }

    // Since we use --onedir, the actual executable is inside the folder
    return path.join(root, finalBinName);
}

export function getSeparateStemsPath(): string {
    return getResourceBinaryPath('separate_stems');
}

export function getClassifyAudioPath(): string {
    return getResourceBinaryPath('classify_audio');
}

export function getBinaryPath(packageName: string, binName: string): string {
    const isWin = process.platform === 'win32';
    const finalBinName = isWin && !binName.endsWith('.exe') ? `${binName}.exe` : binName;
    const prodPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', packageName, 'bin', finalBinName);

    let rootPath = app.getAppPath();
    if (rootPath.endsWith(path.join('src', 'main'))) rootPath = path.join(rootPath, '..', '..');
    const devPath = path.join(rootPath, 'node_modules', packageName, 'bin', finalBinName);

    return app.isPackaged ? prodPath : devPath;
}

export function getYtDlpPath(): string {
    return getBinaryPath('yt-dlp-exec', 'yt-dlp');
}

export function fixAsarPath(p: string): string {
    if (!p) return p;
    return p.replace('app.asar', 'app.asar.unpacked');
}
