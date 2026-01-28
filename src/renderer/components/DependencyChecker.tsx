import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Cpu, Download, Info, Settings } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export const DependencyChecker: React.FC<{ dependencies: any, onRetry: () => void }> = ({
    dependencies, onRetry
}) => {
    const { config, updateConfig } = useSettings();
    const { pythonPath, ffmpegPath, ffprobePath, theme } = config;

    const setPythonPath = (p: string) => updateConfig({ pythonPath: p });
    const setFfmpegPath = (f: string) => updateConfig({ ffmpegPath: f });
    const setFfprobePath = (f: string) => updateConfig({ ffprobePath: f });
    const isDark = theme === 'dark';
    const [showConfig, setShowConfig] = useState(false);
    const { t } = useTranslation();

    return (
        <div className={`fixed inset-0 z-[3000] backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500 transition-all ${isDark ? "bg-wv-bg/80" : "bg-black/10"}`}>
            <div className={`max-w-md w-full border rounded-3xl p-8 shadow-2xl space-y-8 transition-all ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}`}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-2">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('deps.missingTitle')}</h2>
                    <p className="text-wv-gray text-sm leading-relaxed">
                        {t('deps.missingDesc')}
                    </p>
                </div>

                <div className="space-y-3">
                    <DependencyRow
                        icon={<Cpu size={14} />}
                        name="Python 3"
                        status={dependencies.python}
                        desc={t('deps.pythonDesc')}
                        theme={theme}
                    />
                    <DependencyRow
                        icon={<Download size={14} />}
                        name="FFmpeg"
                        status={dependencies.ffmpeg}
                        desc={t('deps.ffmpegDesc')}
                        theme={theme}
                    />
                    <DependencyRow
                        icon={<Info size={14} />}
                        name="FFprobe"
                        status={dependencies.ffprobe}
                        desc={t('deps.ffprobeDesc')}
                        theme={theme}
                    />
                </div>



                <div className="space-y-4">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={`text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isDark ? "text-wv-gray hover:text-white" : "text-black/40 hover:text-black"}`}
                    >
                        <Settings size={12} />
                        {showConfig ? t('deps.hideConfig') : t('deps.manualConfig')}
                    </button>

                    {showConfig && (
                        <div className={`space-y-4 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300 ${isDark ? "bg-black/20 border-white/5" : "bg-black/[0.02] border-black/5"}`}>
                            <MiniPathInput label={t('deps.pythonPath')} value={pythonPath} onChange={setPythonPath} theme={theme} />
                            <MiniPathInput label={t('deps.ffmpegPath')} value={ffmpegPath} onChange={setFfmpegPath} theme={theme} />
                            <MiniPathInput label={t('deps.ffprobePath')} value={ffprobePath} onChange={setFfprobePath} theme={theme} />
                        </div>
                    )}
                </div>


                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={onRetry}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-black/90"}`}
                    >
                        <RefreshCw size={16} />
                        {t('deps.retryVerification')}
                    </button>

                    <p className="text-[10px] text-center text-wv-gray uppercase tracking-widest font-medium opacity-50">
                        {t('deps.pathHint')}
                    </p>
                </div>
            </div>
        </div>
    );
};

const DependencyRow = ({ icon, name, status, desc, theme }: { icon: React.ReactNode, name: string, status: boolean, desc: string, theme: 'light' | 'dark' }) => (
    <div className={`p-4 rounded-2xl border transition-all ${status ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <div className={status ? 'text-green-500' : 'text-wv-gray'}>
                    {icon}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? "text-white" : "text-black"}`}>{name}</span>
            </div>
            {status ? (
                <CheckCircle2 size={16} className="text-green-500" />
            ) : (
                <XCircle size={16} className="text-red-500" />
            )}
        </div>
        <p className="text-[10px] text-wv-gray font-medium leading-relaxed mt-1 opacity-70">
            {desc}
        </p>
    </div>
);

const MiniPathInput = ({ label, value, onChange, theme }: { label: string, value: string, onChange: (v: string) => void, theme: 'light' | 'dark' }) => {
    const isDark = theme === 'dark';
    const handlePick = async () => {
        const path = await (window as any).api.pickFile();
        if (path) onChange(path);
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-bold text-wv-gray uppercase tracking-widest">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`flex-1 border rounded-lg px-2 py-1.5 text-[10px] outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/10" : "bg-white border-black/10 text-black focus:border-black/20"}`}
                    placeholder="Auto"
                />
                <button
                    onClick={handlePick}
                    className={`px-3 py-1 border rounded-lg text-[10px] font-bold uppercase transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/10 text-black"}`}
                >
                    ...
                </button>
            </div>
        </div>
    );
};


