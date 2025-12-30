import fs from "node:fs/promises";
import path from "node:path";

import { addToUnorganizedDB } from "./db";

export interface ProjectFile {
    id: string;
    name: string;
    path: string;
    type: 'flp' | 'zip';
    album?: string;
    lastModified: number;
}

export async function scanProjects(rootPath: string, workspaceId?: string): Promise<ProjectFile[]> {
    const results: ProjectFile[] = [];

    async function walk(dir: string, relativeRoot: string = "") {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(relativeRoot, entry.name);

            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'Backup') continue;
                await walk(fullPath, relativePath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (ext === '.flp' || ext === '.zip') {
                    const stats = await fs.stat(fullPath);

                    const version = {
                        id: "VER-" + stats.ino || Date.now().toString(),
                        name: path.basename(entry.name, ext),
                        path: fullPath,
                        type: (ext === '.flp' ? 'flp' : 'zip') as 'flp' | 'zip',
                        lastModified: stats.mtimeMs
                    };

                    addToUnorganizedDB(version, workspaceId);
                    results.push({ ...version, id: version.id });
                }
            }
        }
    }

    try {
        await walk(rootPath);
    } catch (e) {
        console.error(`Error scanning path ${rootPath}: `, e);
    }

    return results;
}
