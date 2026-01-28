import fs from 'fs';
import path from 'path';

export interface DAWInfo {
    name: string;
    path: string;
    version?: string;
}

export async function detectDAWs(): Promise<DAWInfo[]> {
    const daws: DAWInfo[] = [];
    const isMac = process.platform === 'darwin';

    if (isMac) {
        const macPaths = [
            { name: 'FL Studio', path: '/Applications/FL Studio 21.app' },
            { name: 'FL Studio 20', path: '/Applications/FL Studio 20.app' },
            { name: 'Ableton Live 11 Suite', path: '/Applications/Ableton Live 11 Suite.app' },
            { name: 'Ableton Live 11 Standard', path: '/Applications/Ableton Live 11 Standard.app' },
            { name: 'Ableton Live 10 Suite', path: '/Applications/Ableton Live 10 Suite.app' },
            { name: 'Logic Pro', path: '/Applications/Logic Pro X.app' },
            { name: 'Studio One', path: '/Applications/Studio One 6.app' },
            { name: 'Reaper', path: '/Applications/REAPER.app' }
        ];

        for (const p of macPaths) {
            if (fs.existsSync(p.path)) {
                daws.push(p);
            }
        }
    } else {
        // Windows common paths
        const winPaths = [
            { name: 'FL Studio 21', path: 'C:\\Program Files\\Image-Line\\FL Studio 21\\FL64.exe' },
            { name: 'Ableton Live 11 Suite', path: 'C:\\Program Files\\Ableton\\Live 11 Suite\\Program\\Ableton Live 11 Suite.exe' },
            { name: 'Studio One 6', path: 'C:\\Program Files\\PreSonus\\Studio One 6\\Studio One.exe' },
            { name: 'Reaper', path: 'C:\\Program Files\\REAPER (x64)\\reaper.exe' }
        ];

        for (const p of winPaths) {
            if (fs.existsSync(p.path)) {
                daws.push(p);
            }
        }
    }

    return daws;
}
