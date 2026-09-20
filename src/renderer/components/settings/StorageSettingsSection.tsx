import React, { useState } from "react";
import { Trash2, Copy, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StorageSettingsSectionProps {
    isDark: boolean;
    onOpenDuplicates?: () => void;
}

export const StorageSettingsSection: React.FC<StorageSettingsSectionProps> = ({
    isDark,
    onOpenDuplicates
}) => {
    const { t } = useTranslation();
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheCleaned, setCacheCleaned] = useState(false);

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;

    const handleClearWaveformCache = async () => {
        setClearingCache(true);
        try {
            if ((window as any).api.clearWaveformCache) {
                await (window as any).api.clearWaveformCache();
            }
            setCacheCleaned(true);
            setTimeout(() => setCacheCleaned(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setClearingCache(false);
        }
    };

    return (
        <div className="space-y-8">
            <section>
                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>
                    {t('settings.storageAndMaintenance') || "Almacenamiento y Mantenimiento"}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {/* Buscador de Duplicados */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <Copy size={16} className="text-blue-500" />
                                    {t('settings.duplicateScanner') || "Buscador de Duplicados"}
                                </span>
                                <span className="text-xs text-wv-text-muted">
                                    {t('settings.duplicateScannerDesc') || "Analiza tu librería de samples para detectar y eliminar archivos idénticos o repetidos."}
                                </span>
                            </div>
                            <button
                                onClick={onOpenDuplicates}
                                className={btnClass}
                            >
                                {t('settings.scanDuplicates') || "Escanear Duplicados"}
                            </button>
                        </div>
                    </div>

                    {/* Limpieza de Caché de Waveforms */}
                    <div className={cardClass}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold flex items-center gap-2">
                                    <Trash2 size={16} className="text-amber-500" />
                                    {t('settings.waveformCache') || "Caché de Waveforms"}
                                </span>
                                <span className="text-xs text-wv-text-muted">
                                    {t('settings.waveformCacheDesc') || "Libera espacio eliminando las formas de onda cacheadas de pistas procesadas."}
                                </span>
                            </div>
                            <button
                                onClick={handleClearWaveformCache}
                                disabled={clearingCache}
                                className={`px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${cacheCleaned ? "bg-green-500 text-white border-green-500 rounded-xl" : (isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl" : "bg-black/5 hover:bg-black/10 text-black border-black/10 rounded-xl")}`}
                            >
                                {cacheCleaned ? (
                                    <span className="flex items-center gap-1.5"><Check size={12} /> {t('common.cleaned') || "Limpio"}</span>
                                ) : clearingCache ? (
                                    <span className="flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" /> {t('common.cleaning') || "Limpiando..."}</span>
                                ) : (
                                    t('settings.clearCache') || "Limpiar Caché"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
