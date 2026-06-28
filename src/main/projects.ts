import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { addToUnorganizedDB } from "./db";
import { parseDAWProject } from "./dawParser";

export interface ProjectFile {
    id: string;
    name: string;
    path: string;
    type: 'flp' | 'zip';
    album?: string;
    lastModified: number;
    metadata?: string;
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
                    const id = "VER-" + crypto.createHash("md5").update(fullPath).digest("hex").slice(0, 16);

                    const meta = parseDAWProject(fullPath);

                    const version = {
                        id,
                        name: path.basename(entry.name, ext),
                        path: fullPath,
                        type: (ext === '.flp' ? 'flp' : 'zip') as 'flp' | 'zip',
                        lastModified: stats.mtimeMs,
                        metadata: meta ? JSON.stringify(meta) : undefined
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
