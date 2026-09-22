import React, { useState, useEffect, useCallback } from "react";
import { Trash2, Copy, RefreshCw, Check, HardDrive, Music, FolderOpen, Database } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StorageStats {
    audioLibrary: {
        path: string;
        size: number;
        count: number;
    };
    waveformCache: {
        size: number;
    };
    database: {
        size: number;
    };
    total: number;
}

interface StorageSettingsSectionProps {
    isDark: boolean;
    onOpenDuplicates?: () => void;
}

export const StorageSettingsSection: React.FC<StorageSettingsSectionProps> = ({
    isDark,
    onOpenDuplicates
}) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheCleaned, setCacheCleaned] = useState(false);

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-5 py-2.5 border text-xs font-semibold transition-all active:scale-95 flex items-center gap-2 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;
    const secondaryBtnClass = `px-5 py-2.5 border text-xs font-semibold transition-all active:scale-95 flex items-center gap-2 ${isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-xl" : "bg-black/5 hover:bg-black/10 text-black border-black/10 rounded-xl"}`;

    const formatBytes = (bytes?: number | null) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const loadStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            if ((window as any).api.getStorageStats) {
                const res = await (window as any).api.getStorageStats();
                const data = (res && res.data) ? res.data : res;
                if (data && data.audioLibrary) {
                    setStats(data);
                }
            }
        } catch (e) {
            console.error("[StorageSettingsSection] Error loading stats:", e);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleClearWaveformCache = async () => {
        setClearingCache(true);
        try {
            if ((window as any).api.clearWaveformCache) {
                await (window as any).api.clearWaveformCache();
            }
            setCacheCleaned(true);
            await loadStats();
            setTimeout(() => setCacheCleaned(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setClearingCache(false);
        }
    };

    const handleOpenFolder = async (folderPath?: string) => {
        if (!folderPath) return;
        try {
            if ((window as any).api.openPath) {
                await (window as any).api.openPath(folderPath);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className={`text-md font-bold ${isDark ? "text-white" : "text-black"}`}>
                            {t('settings.storageAndMaintenance')}
                        </h3>
                        <p className="text-xs text-wv-text-muted mt-0.5">
                            {stats ? t('settings.storageTotalUsed', { size: formatBytes(stats.total) }) : t('settings.storageDesc')}
                        </p>
                    </div>
                    <button
                        onClick={loadStats}
                        disabled={isLoadingStats}
                        className={`p-2 rounded-xl border transition-all ${isDark ? "border-white/10 hover:bg-white/5 text-white/70" : "border-black/10 hover:bg-black/5 text-black/70"}`}
                        title={t('settings.clearLogs')}
                    >
                        <RefreshCw size={14} className={isLoadingStats ? "animate-spin" : ""} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {/* Librería de Audio (Descargas) */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Music size={16} className={`${isDark ? "text-white/60" : "text-black/60"} shrink-0`} />
                                    <span className="text-sm font-semibold">
                                        {t('settings.audioLibrary')}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[11px] font-mono rounded-md shrink-0 ${isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"}`}>
                                        {formatBytes(stats?.audioLibrary.size)}
                                    </span>
                                </div>
                                <span className="text-xs text-wv-text-muted truncate">
                                    {t('settings.audioLibraryFiles', {
                                        count: stats?.audioLibrary.count ?? 0,
                                        path: stats?.audioLibrary.path || "~/Music"
                                    })}
                                </span>
                            </div>
                            <button
                                onClick={() => handleOpenFolder(stats?.audioLibrary.path)}
                                className={secondaryBtnClass}
                            >
                                <FolderOpen size={14} />
                                {t('settings.openFolder')}
                            </button>
                        </div>
                    </div>

                    {/* Caché de Waveforms */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Trash2 size={16} className={`${isDark ? "text-white/60" : "text-black/60"} shrink-0`} />
                                    <span className="text-sm font-semibold">
                                        {t('settings.waveformCache')}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[11px] font-mono rounded-md shrink-0 ${isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"}`}>
                                        {formatBytes(stats?.waveformCache.size)}
                                    </span>
                                </div>
                                <span className="text-xs text-wv-text-muted">
                                    {t('settings.waveformCacheDesc')}
                                </span>
                            </div>
                            <button
                                onClick={handleClearWaveformCache}
                                disabled={clearingCache}
                                className={`px-5 py-2.5 border text-xs font-semibold transition-all active:scale-95 flex items-center gap-2 ${cacheCleaned ? "bg-green-500 text-white border-green-500 rounded-xl" : (isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl" : "bg-black/5 hover:bg-black/10 text-black border-black/10 rounded-xl")}`}
                            >
                                {cacheCleaned ? (
                                    <>
                                        <Check size={14} />
                                        {t('common.cleaned')}
                                    </>
                                ) : clearingCache ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        {t('common.cleaning')}
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        {t('settings.clearCache')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Buscador de Duplicados */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Copy size={16} className={`${isDark ? "text-white/60" : "text-black/60"} shrink-0`} />
                                    <span className="text-sm font-semibold">
                                        {t('settings.duplicateScanner')}
                                    </span>
                                </div>
                                <span className="text-xs text-wv-text-muted">
                                    {t('settings.duplicateScannerDesc')}
                                </span>
                            </div>
                            <button
                                onClick={onOpenDuplicates}
                                className={btnClass}
                            >
                                <Copy size={14} />
                                {t('settings.scanDuplicates')}
                            </button>
                        </div>
                    </div>

                    {/* Base de Datos SQLite */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Database size={16} className={`${isDark ? "text-white/60" : "text-black/60"} shrink-0`} />
                                    <span className="text-sm font-semibold">
                                        {t('settings.databaseAndMeta')}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[11px] font-mono rounded-md shrink-0 ${isDark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"}`}>
                                        {formatBytes(stats?.database.size)}
                                    </span>
                                </div>
                                <span className="text-xs text-wv-text-muted">
                                    {t('settings.databaseAndMetaDesc')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
