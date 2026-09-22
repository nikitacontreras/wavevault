import React from "react";
import { useTranslation } from "react-i18next";

interface DownloadsSettingsSectionProps {
    isDark: boolean;
    outDir: string | null;
    onPickDir: () => void;
    smartOrganize: boolean;
    setSmartOrganize: (v: boolean) => void;
    autoDetectPlaylists: boolean;
    setAutoDetectPlaylists: (v: boolean) => void;
    stemsQuality: 'standard' | 'best' | 'pro';
    setStemsQuality: (q: 'standard' | 'best' | 'pro') => void;
}

export const DownloadsSettingsSection: React.FC<DownloadsSettingsSectionProps> = ({
    isDark,
    outDir,
    onPickDir,
    smartOrganize,
    setSmartOrganize,
    autoDetectPlaylists,
    setAutoDetectPlaylists,
    stemsQuality,
    setStemsQuality
}) => {
    const { t } = useTranslation();

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;
    const toggleClass = (checked: boolean) => `w-11 h-6 transition-all relative cursor-pointer rounded-full ${checked ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`;
    const toggleHandle = (checked: boolean) => `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-5" : ""}`;

    return (
        <div className="space-y-8">
            <section>
                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.downloadsTitle')}</h3>
                <div className="space-y-4">
                    <div className={cardClass}>
                        <label className="text-sm font-semibold mb-4 block">{t('settings.output')}</label>
                        <div className="flex gap-3">
                            <div className={`flex-1 border px-4 py-2.5 text-xs font-mono break-all line-clamp-1 rounded-xl flex items-center ${isDark ? "bg-black/20 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/40"}`}>
                                {outDir || "~/Music"}
                            </div>
                            <button className={btnClass} onClick={onPickDir}>
                                {t('settings.change')}
                            </button>
                        </div>
                    </div>

                    <label className={`${cardClass} cursor-pointer flex items-center justify-between group`}>
                        <div className="flex flex-col gap-1 pr-6">
                            <span className="text-sm font-semibold flex items-center gap-2">
                                {t('settings.smartOrganize')}
                                <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-500 rounded-md">Smart</span>
                            </span>
                            <span className="text-[11px] text-wv-text-muted leading-tight max-w-lg">{t('settings.smartOrganizeDesc')}</span>
                        </div>
                        <div className="shrink-0">
                            <input type="checkbox" className="sr-only" checked={smartOrganize} onChange={e => setSmartOrganize(e.target.checked)} />
                            <div className={toggleClass(smartOrganize)}>
                                <div className={toggleHandle(smartOrganize)} />
                            </div>
                        </div>
                    </label>

                    <label className={`${cardClass} cursor-pointer flex items-center justify-between group`}>
                        <div className="flex flex-col gap-1 pr-6">
                            <span className="text-sm font-semibold flex items-center gap-2">
                                {t('settings.autoDetectPlaylists') || "Detección de Playlists"}
                            </span>
                            <span className="text-[11px] text-wv-text-muted leading-tight max-w-lg">
                                {t('settings.autoDetectPlaylistsDesc') || "Abrir el selector de lotes al ingresar enlaces de playlists. Si se desactiva, se descargarán como videos individuales."}
                            </span>
                        </div>
                        <div className="shrink-0">
                            <input type="checkbox" className="sr-only" checked={autoDetectPlaylists} onChange={e => setAutoDetectPlaylists(e.target.checked)} />
                            <div className={toggleClass(autoDetectPlaylists)}>
                                <div className={toggleHandle(autoDetectPlaylists)} />
                            </div>
                        </div>
                    </label>

                    <div className={cardClass}>
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-sm font-semibold">{t('settings.stemsQuality')}</span>
                            <span className="text-xs text-wv-text-muted">
                                AI separation quality. Higher quality takes longer to process.
                            </span>
                        </div>
                        <div className={`flex p-1.5 gap-1.5 border rounded-2xl ${isDark ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5"}`}>
                            {(['standard', 'best', 'pro'] as const).map(q => (
                                <button
                                    key={q}
                                    onClick={() => setStemsQuality(q)}
                                    className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${stemsQuality === q
                                        ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm")
                                        : (isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black")
                                        }`}
                                >
                                    {q.charAt(0).toUpperCase() + q.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
