import { execa } from "execa";
import { spawn, ChildProcess } from "child_process";
import path from "node:path";
import fs from "node:fs";
import { getPythonPath, getFFmpegPath, getFFprobePath } from "./config";

export interface PythonOptions {
    args?: string[];
    verbose?: boolean | 'none' | 'short' | 'full';
    signal?: AbortSignal;
    pipeOutput?: boolean;
    onProgress?: (progress: number) => void;
}

/**
 * Centralized Service for Python and Binary executions
 */
export class PythonShell {
    private static persistentProcesses = new Map<string, ChildProcess>();

    /**
     * Resolves the environment for running Python/Binaries
     */
    static getEnv() {
        const env = { ...process.env };
        const ffmpegPath = getFFmpegPath();
        const ffprobePath = getFFprobePath();
        const binDirs = new Set<string>();

        if (ffmpegPath) binDirs.add(path.dirname(ffmpegPath));
        if (ffprobePath) binDirs.add(path.dirname(ffprobePath));

        const pathKey = process.platform === "win32" ? "Path" : "PATH";
        if (binDirs.size > 0) {
            env[pathKey] = Array.from(binDirs).join(path.delimiter) + path.delimiter + (env[pathKey] || "");
        }

        return env;
    }

    /**
     * Executes a one-off command
     */
    static async run(bin: string, runArgs: string[], options: any = {}) {
        const isWin = process.platform === "win32";
        const configPython = getPythonPath();
        const env = this.getEnv();

        const execute = async (executable: string, args: string[]) => {
            try {
                const execaVerbose = options.verbose === false ? 'none' : (options.verbose === true ? 'short' : options.verbose);
                const subprocess = execa(executable, args, {
                    ...options,
                    verbose: execaVerbose,
                    env: { ...env, ...options.env }
                });

                const isVerbose = options.verbose === true || options.verbose === 'full';
                if (isVerbose) {
                    subprocess.stdout?.pipe(process.stdout);
                    subprocess.stderr?.pipe(process.stderr);
                }

                if (options.onProgress) {
                    subprocess.stdout?.on('data', (data: Buffer | string) => {
                        const line: string = data.toString();
                        // Typical yt-dlp progress line: [download]  10.0% of 10.00MiB at  1.00MiB/s ETA 00:00
                        const match = line.match(/\[download\]\s+([\d.]+)%/);
                        if (match && match[1]) {
                            options.onProgress!(parseFloat(match[1]));
                        }
                    });
                }

                return await subprocess;
            } catch (e: any) {
                // Specific retry logic for well-known python issues
                if (e.stderr?.includes("unsupported version of Python")) {
                    const fallback = configPython === "python" ? "python3" : configPython;
                    if (executable !== fallback) {
                        console.warn(`[PythonShell] Retrying with fallback "${fallback}" due to version mismatch`);
                        const retryArgs = [executable, ...args];
                        return await execa(fallback, retryArgs, { ...options, env });
                    }
                }
                throw e;
            }
        };

        const scriptExtensions = [".py", ".pyc"];
        const isPyScript = scriptExtensions.some(ext => bin.endsWith(ext));
        const isYtDlp = bin.endsWith("yt-dlp");

        if (isWin) {
            return await execute(bin, runArgs);
        }

        // 1. If it's an absolute path that exists, we try to run it directly
        // UNLESS it's explicitly a .py script
        if (path.isAbsolute(bin) && fs.existsSync(bin)) {
            if (isPyScript) {
                return await execute(configPython, [bin, ...runArgs]);
            }
            return await execute(bin, runArgs);
        }

        // 2. Fallback for relative names or missing absolute paths
        // If it looks like a script or yt-dlp, try with python as last resort
        if (isPyScript || isYtDlp) {
            return await execute(configPython, [bin, ...runArgs]);
        }

        // 3. Last fallback: try executing directly as a command in PATH
        return await execute(bin, runArgs);
    }

    /**
     * Manages persistent processes with stdin/stdout communication
     */
    static getPersistent(id: string, binPath: string, args: string[] = []): ChildProcess {
        let proc = this.persistentProcesses.get(id);
        if (proc && !proc.killed && proc.stdin && !proc.stdin.destroyed) {
            return proc;
        }

        proc = spawn(binPath, args, {
            env: this.getEnv(),
            stdio: ["pipe", "pipe", "pipe"]
        });

        proc.on("exit", () => this.persistentProcesses.delete(id));
        this.persistentProcesses.set(id, proc);

        return proc;
    }

    static killPersistent(id: string) {
        const proc = this.persistentProcesses.get(id);
        if (proc) {
            try { proc.kill(); } catch (e) { }
            this.persistentProcesses.delete(id);
        }
    }
}
