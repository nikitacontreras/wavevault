import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Cpu, Download, Info, Settings, X } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

export const DependencyChecker: React.FC<{ dependencies: any, onRetry: () => void, onDismiss?: () => void }> = ({
    dependencies, onRetry, onDismiss
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
        <div className={`fixed inset-0 z-[3000] backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 transition-all ${isDark ? "bg-wv-bg/80" : "bg-black/20"}`}>
            <div className={`relative max-w-md w-full max-h-[90vh] flex flex-col border rounded-3xl p-6 sm:p-7 shadow-2xl transition-all ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}`}>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className={`absolute top-5 right-5 p-2 rounded-xl border transition-all z-10 ${
                            isDark
                                ? "bg-white/5 hover:bg-white/10 border-white/10 text-wv-gray hover:text-white"
                                : "bg-black/5 hover:bg-black/10 border-black/10 text-black/40 hover:text-black"
                        }`}
                        title={t('deps.continueAnyway')}
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 -mr-1">
                    <div className="flex flex-col items-center text-center space-y-2 pt-1">
                        <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                            <AlertCircle size={24} />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{t('deps.missingTitle')}</h2>
                        <p className="text-wv-gray text-xs leading-relaxed max-w-sm">
                            {t('deps.missingDesc')}
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        <DependencyRow
                            icon={<Cpu size={14} />}
                            name="Python 3.10+"
                            status={dependencies.python}
                            version={dependencies.pythonVersion}
                            desc={
                                dependencies.python
                                    ? t('deps.pythonOk', { version: dependencies.pythonVersion ? `v${dependencies.pythonVersion}` : '' })
                                    : (dependencies.pythonVersion
                                        ? t('deps.pythonIncompatible', { version: `v${dependencies.pythonVersion}` })
                                        : t('deps.pythonMissing'))
                            }
                            theme={theme}
                        />
                        <DependencyRow
                            icon={<Download size={14} />}
                            name="FFmpeg"
                            status={dependencies.ffmpeg}
                            version={dependencies.ffmpegVersion}
                            desc={
                                dependencies.ffmpeg
                                    ? t('deps.ffmpegOk', { version: dependencies.ffmpegVersion ? `(${dependencies.ffmpegVersion})` : '' })
                                    : t('deps.ffmpegDesc')
                            }
                            theme={theme}
                        />
                        <DependencyRow
                            icon={<Info size={14} />}
                            name="FFprobe"
                            status={dependencies.ffprobe}
                            version={dependencies.ffprobeVersion}
                            desc={
                                dependencies.ffprobe
                                    ? t('deps.ffprobeOk', { version: dependencies.ffprobeVersion ? `(${dependencies.ffprobeVersion})` : '' })
                                    : t('deps.ffprobeDesc')
                            }
                            theme={theme}
                        />
                    </div>

                    <div className="space-y-2 pt-1">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className={`text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isDark ? "text-wv-gray hover:text-white" : "text-black/40 hover:text-black"}`}
                        >
                            <Settings size={12} />
                            {showConfig ? t('deps.hideConfig') : t('deps.manualConfig')}
                        </button>

                        {showConfig && (
                            <div className={`space-y-3 p-3.5 rounded-2xl border animate-in slide-in-from-top-2 duration-200 ${isDark ? "bg-black/20 border-white/5" : "bg-black/[0.02] border-black/5"}`}>
                                <MiniPathInput
                                    label={t('deps.pythonPath')}
                                    value={pythonPath}
                                    onChange={setPythonPath}
                                    theme={theme}
                                    status={dependencies.python}
                                    version={dependencies.pythonVersion}
                                />
                                <MiniPathInput
                                    label={t('deps.ffmpegPath')}
                                    value={ffmpegPath}
                                    onChange={setFfmpegPath}
                                    theme={theme}
                                    status={dependencies.ffmpeg}
                                    version={dependencies.ffmpegVersion}
                                />
                                <MiniPathInput
                                    label={t('deps.ffprobePath')}
                                    value={ffprobePath}
                                    onChange={setFfprobePath}
                                    theme={theme}
                                    status={dependencies.ffprobe}
                                    version={dependencies.ffprobeVersion}
                                />

                                <p className={`text-[9.5px] leading-relaxed pt-1 font-medium ${isDark ? "text-wv-gray" : "text-black/50"}`}>
                                    {t('deps.autoHint')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Bottom Actions Area */}
                <div className={`pt-4 mt-3 border-t flex flex-col gap-2 shrink-0 ${isDark ? "border-white/5" : "border-black/5"}`}>
                    <button
                        onClick={onRetry}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-black/90"}`}
                    >
                        <RefreshCw size={14} />
                        {t('deps.retryVerification')}
                    </button>

                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors border ${
                                isDark
                                    ? "border-white/10 text-wv-gray hover:text-white hover:bg-white/5"
                                    : "border-black/10 text-black/60 hover:text-black hover:bg-black/5"
                            }`}
                        >
                            {t('deps.continueAnyway')}
                        </button>
                    )}

                    <p className="text-[9px] text-center text-wv-gray uppercase tracking-widest font-medium opacity-50">
                        {t('deps.pathHint')}
                    </p>
                </div>
            </div>
        </div>
    );
};

const DependencyRow = ({
    icon,
    name,
    status,
    version,
    desc,
    theme
}: {
    icon: React.ReactNode;
    name: string;
    status: boolean;
    version?: string;
    desc: string;
    theme: 'light' | 'dark';
}) => {
    const isDark = theme === 'dark';
    return (
        <div className={`p-3.5 rounded-2xl border transition-all ${
            status
                ? 'bg-green-500/5 border-green-500/10'
                : (version ? 'bg-amber-500/5 border-amber-500/15' : 'bg-red-500/5 border-red-500/10')
        }`}>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <div className={status ? 'text-green-500' : (version ? 'text-amber-500' : 'text-red-500')}>
                        {icon}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{name}</span>
                </div>

                <div className="flex items-center gap-2">
                    {version && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider border ${
                            status
                                ? (isDark ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700")
                                : (isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")
                        }`}>
                            {version.startsWith('v') || version === 'Integrado' || version === 'OK' ? version : `v${version}`}
                        </span>
                    )}
                    {status ? (
                        <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                    ) : (
                        <XCircle size={16} className={version ? "text-amber-500 shrink-0" : "text-red-500 shrink-0"} />
                    )}
                </div>
            </div>
            <p className={`text-[10px] font-medium leading-relaxed mt-1 ${
                status
                    ? "text-wv-gray opacity-80"
                    : (version ? (isDark ? "text-amber-300/90" : "text-amber-900/90") : "text-wv-gray opacity-80")
            }`}>
                {desc}
            </p>
        </div>
    );
};

const MiniPathInput = ({
    label,
    value,
    onChange,
    theme,
    status,
    version
}: {
    label: string;
    value: string | null;
    onChange: (v: string) => void;
    theme: 'light' | 'dark';
    status?: boolean;
    version?: string;
}) => {
    const isDark = theme === 'dark';
    const [localVal, setLocalVal] = React.useState(value || '');

    React.useEffect(() => {
        setLocalVal(value || '');
    }, [value]);

    const handleCommit = () => {
        const trimmed = localVal.trim();
        if (trimmed !== (value || '')) {
            onChange(trimmed);
        }
    };

    const handlePick = async () => {
        const path = await window.api.pickFile();
        if (path) {
            setLocalVal(path);
            onChange(path);
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[8px] font-bold text-wv-gray uppercase tracking-widest">{label}</label>
                {version && (
                    <span className={`text-[8.5px] font-bold ${status ? "text-green-500" : "text-amber-500"}`}>
                        {status ? `✓ v${version}` : `✗ v${version} (< 3.10)`}
                    </span>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    className={`flex-1 border rounded-lg px-2.5 py-1.5 text-[10px] outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/10 text-black focus:border-black/20"}`}
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


