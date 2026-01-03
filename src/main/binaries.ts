import { app } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Centralized utility to handle paths for external binaries (yt-dlp, FFmpeg, etc.)
 * across development and production environments on all platforms.
 */

export function getBinaryPath(packageName: string, binName: string): string {
    const isWin = process.platform === 'win32';
    const finalBinName = isWin && !binName.endsWith('.exe') ? `${binName}.exe` : binName;

    // 1. Standard Production Path (asarUnpacked)
    const prodPath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        packageName,
        'bin',
        finalBinName
    );

    // 2. Alternative Production Path (Resources folder relative to app root)
    const altProdPath = path.join(
        path.dirname(process.resourcesPath),
        'Resources',
        'app.asar.unpacked',
        'node_modules',
        packageName,
        'bin',
        finalBinName
    );

    // 3. Development Path
    let rootPath = app.getAppPath();
    // In dev, if appPath points to src/main, we need to go up two levels to find node_modules
    if (rootPath.endsWith(path.join('src', 'main'))) {
        rootPath = path.join(rootPath, '..', '..');
    } else if (rootPath.endsWith('main') || rootPath.endsWith('src')) {
        rootPath = path.join(rootPath, '..');
    }

    const devPath = path.join(rootPath, 'node_modules', packageName, 'bin', finalBinName);

    if (app.isPackaged) {
        if (fs.existsSync(prodPath)) return prodPath;
        if (fs.existsSync(altProdPath)) return altProdPath;

        console.error(`[Binaries] Critical: Binary not found in production paths:
            - ${prodPath}
            - ${altProdPath}`);
    } else {
        if (fs.existsSync(devPath)) return devPath;
    }

    // Return the most likely path if none exist, but prefer prod in packaged app
    return app.isPackaged ? prodPath : devPath;
}

export function getYtDlpPath(): string {
    return getBinaryPath('yt-dlp-exec', 'yt-dlp');
}

/**
 * For ffmpeg-static and ffprobe-static, the structure might be different
 * but we can apply similar logic.
 */
export function fixAsarPath(p: string): string {
    if (!p) return p;
    if (p.includes('app.asar') && !p.includes('app.asar.unpacked')) {
        return p.replace('app.asar', 'app.asar.unpacked');
    }
    return p;
}
