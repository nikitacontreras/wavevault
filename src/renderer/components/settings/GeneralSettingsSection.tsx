import React from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { YouTubeAuthSection } from "./YouTubeAuthSection";

interface GeneralSettingsSectionProps {
    isDark: boolean;
    minimizeToTray: boolean;
    setMinimizeToTray: (v: boolean) => void;
    autoCheckUpdates: boolean;
    setAutoCheckUpdates: (v: boolean) => void;
    lowPowerMode: boolean;
    setLowPowerMode: (v: boolean) => void;
    discogsToken: string;
    setDiscogsToken: (v: string) => void;
}

export const GeneralSettingsSection: React.FC<GeneralSettingsSectionProps> = ({
    isDark,
    minimizeToTray,
    setMinimizeToTray,
    autoCheckUpdates,
    setAutoCheckUpdates,
    lowPowerMode,
    setLowPowerMode,
    discogsToken,
    setDiscogsToken
}) => {
    const { t, i18n } = useTranslation();

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const inputClass = `w-full border px-4 py-2.5 text-sm outline-none transition-all ${isDark ? "bg-black border-white/10 text-white focus:border-white/30 rounded-xl" : "bg-white border-black/10 text-black focus:border-black/30 rounded-xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;
    const toggleClass = (checked: boolean) => `w-11 h-6 transition-all relative cursor-pointer rounded-full ${checked ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`;
    const toggleHandle = (checked: boolean) => `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-5" : ""}`;

    return (
        <div className="space-y-8">
            <section>
                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.orgAndSystem')}</h3>

                <div className="grid grid-cols-1 gap-4">
                    <div className={cardClass}>
                        <label className="text-xs font-semibold text-wv-text-muted flex items-center gap-2 mb-3">
                            <Globe size={14} /> {t('settings.language')}
                        </label>
                        <select
                            className={inputClass}
                            value={i18n.language}
                            onChange={e => i18n.changeLanguage(e.target.value)}
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="ko">한국어</option>
                            <option value="ru">Русский</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { id: 'minimizeToTray', label: t('settings.minimizeTray'), desc: t('settings.minimizeTrayDesc'), checked: minimizeToTray, onChange: (v: boolean) => setMinimizeToTray(v) },
                            { id: 'autoCheckUpdates', label: t('settings.autoCheckUpdates'), desc: t('settings.autoCheckUpdatesDesc'), checked: autoCheckUpdates, onChange: (v: boolean) => setAutoCheckUpdates(v) },
                            { id: 'lowPowerMode', label: t('settings.lowPowerMode'), desc: t('settings.lowPowerModeDesc'), checked: lowPowerMode, onChange: (v: boolean) => setLowPowerMode(v) }
                        ].map(item => (
                            <label key={item.id} className={`${cardClass} cursor-pointer flex items-center justify-between gap-4 group`}>
                                <div className="flex flex-col gap-1 pr-4 min-w-0 flex-1">
                                    <span className="text-sm font-semibold">{item.label}</span>
                                    <span className="text-xs text-wv-text-muted leading-relaxed">{item.desc}</span>
                                </div>
                                <div className="shrink-0">
                                    <input type="checkbox" className="sr-only" checked={item.checked} onChange={e => item.onChange(e.target.checked)} />
                                    <div className={toggleClass(item.checked)}>
                                        <div className={toggleHandle(item.checked)} />
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <YouTubeAuthSection isDark={isDark} />

                    <div className={cardClass}>
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-sm font-semibold">{t('settings.backup')}</span>
                            <span className="text-xs text-wv-text-muted">{t('settings.backupDesc')}</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => window.api.backupDB()} className={btnClass}>
                                {t('settings.backupBtn')}
                            </button>
                            <button onClick={() => window.api.restoreDB()} className={btnClass}>
                                {t('settings.restoreBtn')}
                            </button>
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className="flex flex-col gap-1 mb-6">
                            <span className="text-sm font-semibold">{t('settings.discogs')}</span>
                            <span className="text-xs text-wv-text-muted">{t('settings.discogsTokenDesc')}</span>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="password"
                                value={discogsToken}
                                onChange={(e) => setDiscogsToken(e.target.value)}
                                placeholder={t('settings.discogsTokenPlaceholder')}
                                className={inputClass}
                            />
                            <button
                                onClick={() => window.api.openExternal('https://www.discogs.com/settings/developers')}
                                className={btnClass}
                            >
                                Get Token
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
