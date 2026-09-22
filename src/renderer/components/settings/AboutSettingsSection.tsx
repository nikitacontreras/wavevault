import React, { useState, useEffect } from "react";
import { Command, Globe, Activity, Cpu, HardDrive, Check, Copy, RefreshCw, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AboutSettingsSectionProps {
    isDark: boolean;
    appVersion: string;
    platformInfo: string;
    debugMode: boolean;
    logs: string[];
    clearLogs: () => void;
}

export const AboutSettingsSection: React.FC<AboutSettingsSectionProps> = ({
    isDark,
    appVersion,
    platformInfo,
    debugMode,
    logs,
    clearLogs
}) => {
    const { t } = useTranslation();
    const [diagnostics, setDiagnostics] = useState<any>(null);
    const [isLoadingDiag, setIsLoadingDiag] = useState(false);
    const [copied, setCopied] = useState(false);
    const [logFilter, setLogFilter] = useState("");

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;

    const fetchDiagnostics = async () => {
        setIsLoadingDiag(true);
        try {
            const res = await window.api.getSystemDiagnostics();
            if (res && res.success) {
                setDiagnostics(res.data);
            }
        } catch (e) {
            console.error("Failed to load diagnostics:", e);
        } finally {
            setIsLoadingDiag(false);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    const handleCopyReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            appVersion,
            diagnostics,
            recentLogs: logs.slice(-50)
        };
        navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const filteredLogs = logs.filter(l => !logFilter || l.toLowerCase().includes(logFilter.toLowerCase()));

    return (
        <div className="space-y-8">
            {/* Tarjeta Principal de WaveVault */}
            <section>
                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.about')}</h3>
                <div className={`${cardClass} text-center py-12`}>
                    <div className={`w-24 h-24 mx-auto mb-8 flex items-center justify-center rounded-3xl transition-all hover:scale-105 duration-300 ${isDark ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-xl"}`}>
                        <span className="text-3xl font-black italic">WV</span>
                    </div>

                    <h4 className="text-3xl font-bold mb-2">WaveVault</h4>
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isDark ? "bg-white/10 text-white/60" : "bg-black/5 text-black/60"}`}>v{appVersion}</span>
                        <span className="text-[11px] font-medium opacity-40">{platformInfo}</span>
                    </div>

                    <p className="text-sm text-wv-text-muted max-w-sm mx-auto leading-relaxed mb-10">
                        Professional audio toolkit for high-fidelity stem separation, format conversion and sample library management.
                    </p>

                    <div className="flex justify-center gap-3">
                        <button onClick={() => window.api.checkForUpdates()} className={btnClass}>
                            Check for Updates
                        </button>
                        <button
                            onClick={handleCopyReport}
                            className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/10 text-black hover:bg-black/10"}`}
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            {copied ? "Copiado" : "Copiar Diagnóstico"}
                        </button>
                    </div>

                    <div className="mt-16 pt-10 border-t border-black/5 dark:border-white/5 flex justify-between items-center text-left w-full">
                        <div>
                            <span className="block text-[10px] text-wv-text-muted font-medium mb-1">Developer</span>
                            <button onClick={() => window.api.openExternal('https://strikemedia.xyz')} className="text-lg font-bold hover:text-blue-500 transition-colors">strikemedia.xyz</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => window.api.openExternal('https://github.com/nikitacontreras/wavevault')} className="p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all"><Command size={20} /></button>
                            <button onClick={() => window.api.openExternal('https://strikemedia.xyz/wavevault')} className="p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all"><Globe size={20} /></button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Diagnóstico del Sistema y Hardware */}
            {diagnostics && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-md font-bold ${isDark ? "text-white" : "text-black"}`}>Diagnóstico del Sistema</h3>
                        <button
                            onClick={fetchDiagnostics}
                            disabled={isLoadingDiag}
                            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/5 border-black/10 hover:bg-black/10"}`}
                            title="Actualizar diagnóstico"
                        >
                            <RefreshCw size={12} className={isLoadingDiag ? "animate-spin" : ""} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Refrescar</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Hardware & OS */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-2 mb-3 text-blue-500">
                                <Cpu size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Hardware</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-wv-text-muted text-[10px] block uppercase">CPU</span>
                                    <span className="font-semibold truncate block" title={diagnostics.system.cpuModel}>{diagnostics.system.cpuModel}</span>
                                    <span className="text-[10px] opacity-60 font-mono">{diagnostics.system.cpuCores} Cores • {diagnostics.system.arch}</span>
                                </div>
                                <div className="pt-1.5 border-t border-white/5">
                                    <span className="text-wv-text-muted text-[10px] block uppercase">Memoria RAM</span>
                                    <span className="font-semibold font-mono">{diagnostics.system.usedMemoryMB} MB / {diagnostics.system.totalMemoryMB} MB</span>
                                    <span className="text-[10px] text-green-500 block font-bold">{diagnostics.system.freeMemoryMB} MB Libres</span>
                                </div>
                                <div className="pt-1.5 border-t border-white/5">
                                    <span className="text-wv-text-muted text-[10px] block uppercase">Plataforma</span>
                                    <span className="font-mono text-[11px]">{diagnostics.system.platform} ({diagnostics.system.osRelease})</span>
                                </div>
                            </div>
                        </div>

                        {/* Runtimes & Engines */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-2 mb-3 text-purple-500">
                                <Terminal size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Runtimes</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-wv-text-muted text-[10px] block uppercase">Electron</span>
                                        <span className="font-mono font-bold">v{diagnostics.process.electronVersion}</span>
                                    </div>
                                    <div>
                                        <span className="text-wv-text-muted text-[10px] block uppercase">Node.js</span>
                                        <span className="font-mono font-bold">v{diagnostics.process.nodeVersion}</span>
                                    </div>
                                </div>
                                <div className="pt-1.5 border-t border-white/5 space-y-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-wv-text-muted">FFmpeg:</span>
                                        <span className={`font-mono font-bold ${diagnostics.dependencies.ffmpeg ? "text-green-500" : "text-red-500"}`}>
                                            {diagnostics.dependencies.ffmpeg ? (diagnostics.dependencies.ffmpegVersion || "OK") : "Falta"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-wv-text-muted">FFprobe:</span>
                                        <span className={`font-mono font-bold ${diagnostics.dependencies.ffprobe ? "text-green-500" : "text-red-500"}`}>
                                            {diagnostics.dependencies.ffprobe ? (diagnostics.dependencies.ffprobeVersion || "OK") : "Falta"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-wv-text-muted">Python 3:</span>
                                        <span className={`font-mono font-bold ${diagnostics.dependencies.python ? "text-green-500" : "text-amber-500"}`}>
                                            {diagnostics.dependencies.python ? `v${diagnostics.dependencies.pythonVersion}` : "Auto"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Database & Storage */}
                        <div className={cardClass}>
                            <div className="flex items-center gap-2 mb-3 text-emerald-500">
                                <HardDrive size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Base de Datos</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="text-wv-text-muted text-[10px] block uppercase">Archivo SQLite</span>
                                    <span className="font-mono font-bold">{diagnostics.storage.dbSizeMB} MB</span>
                                </div>
                                <div className="pt-1.5 border-t border-white/5">
                                    <span className="text-wv-text-muted text-[10px] block uppercase">Registros</span>
                                    <div className="flex justify-between text-xs font-mono font-bold">
                                        <span>{diagnostics.storage.indexedSamples} Samples</span>
                                        <span>{diagnostics.storage.trackedProjects} Proyectos</span>
                                    </div>
                                </div>
                                <div className="pt-1.5 border-t border-white/5">
                                    <span className="text-wv-text-muted text-[10px] block uppercase">YouTube Auth</span>
                                    <span className={`font-bold text-[11px] ${diagnostics.auth.youtubeConnected ? "text-green-500" : "text-wv-text-muted"}`}>
                                        {diagnostics.auth.youtubeConnected ? "Conectado" : "Desconectado"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Live Event Log */}
            <section className="space-y-4">
                <div className={cardClass}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Activity size={16} className="text-blue-500 shrink-0" />
                            <span className="text-sm font-bold truncate">Live Event Log</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <input
                                type="text"
                                placeholder="Filtrar..."
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                className={`w-32 px-3 py-1.5 text-xs rounded-xl border outline-none transition-all ${isDark ? "bg-black/30 border-white/10 text-white focus:border-white/30" : "bg-black/5 border-black/10 text-black focus:border-black/30"}`}
                            />
                            <button
                                onClick={clearLogs}
                                className="px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className={`p-4 font-mono text-[11px] h-72 overflow-y-auto custom-scrollbar rounded-xl border ${isDark ? "bg-black/40 border-white/5 text-white/60" : "bg-black/5 border-black/5 text-black/60"}`}>
                        {filteredLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center italic opacity-40">
                                {logs.length === 0 ? "No hay eventos registrados aún" : "No hay eventos que coincidan con el filtro"}
                            </div>
                        ) : (
                            filteredLogs.map((log, i) => (
                                <div key={i} className="mb-2 flex gap-3 pb-2 border-b border-white/5 last:border-0 leading-relaxed font-mono">
                                    <span className="opacity-40 shrink-0 text-[10px]">#{i + 1}</span>
                                    <span className="whitespace-pre-wrap select-all">{log}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};
