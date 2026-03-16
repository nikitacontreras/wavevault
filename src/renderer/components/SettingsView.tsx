import React from "react";
import { TargetFormat, Bitrate, SampleRate } from "../types";
import { Settings, FileAudio, BarChart3, Waves, FolderSync, Trash2, Cpu, Activity, Info, Command, Globe, Smartphone, Check, X } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { KeybindManager } from "./KeybindManager";
import { useTranslation } from "react-i18next";


import { useSettings } from "../context/SettingsContext";
import { useApp } from "../context/AppContext";

const AdvancedPathInput = ({ label, value, onChange, placeholder, isDark }: { label: string, value: string | null, onChange: (v: string) => void, placeholder: string, isDark: boolean }) => {
    const { t } = useTranslation();
    const handlePick = async () => {
        const path = await window.api.pickFile();
        if (path) onChange(path);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    className={`flex-1 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <button
                    className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                    onClick={handlePick}
                >
                    {t('settings.browse')}
                </button>
            </div>
        </div>
    );
};

const RemoteSettingsSection = ({ isDark }: { isDark: boolean }) => {
    const [enabled, setEnabled] = React.useState(false);
    const [serverInfo, setServerInfo] = React.useState<{ ip: string; port: number } | null>(null);
    const [pendingReq, setPendingReq] = React.useState<{ id: string; name: string; code: string } | null>(null);
    const [status, setStatus] = React.useState<{ trustedDevices: any[], activePeers: any[] }>({ trustedDevices: [], activePeers: [] });

    React.useEffect(() => {
        // Listen for pairing requests
        const unsubPairing = window.api.onRemotePairingRequest((req: any) => {
            setPendingReq(req);
        });

        const unsubStatus = window.api.onRemoteStatusUpdate((data: any) => {
            setStatus(data);
        });

        // Initialize status if already enabled
        const checkStatus = async () => {
            const res = await window.api.getRemoteStatus();
            if (res) setStatus(res);
        };
        checkStatus();

        return () => {
            unsubPairing();
            unsubStatus();
        };
    }, []);

    const toggleRemote = async () => {
        if (enabled) {
            await window.api.stopRemote();
            setEnabled(false);
            setServerInfo(null);
        } else {
            const info = await window.api.startRemote();
            if (info) {
                setServerInfo(info);
                setEnabled(true);
                const res = await window.api.getRemoteStatus();
                if (res) setStatus(res);
            }
        }
    };

    const handleApprove = async () => {
        if (!pendingReq) return;
        await window.api.approvePairing(pendingReq.id);
        setPendingReq(null);
    };

    const handleReject = async () => {
        if (!pendingReq) return;
        await window.api.rejectPairing(pendingReq.id);
        setPendingReq(null);
    };

    const handleForget = async (id: string) => {
        await window.api.forgetDevice(id);
    };

    const remoteUrl = serverInfo ? `http://${serverInfo.ip}:${serverInfo.port}` : '';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>Enable Remote Control</span>
                    <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">Control playback from your phone</span>
                </div>
                <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={enabled}
                        onChange={toggleRemote}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${enabled ? "bg-green-500" : (isDark ? "bg-white/10" : "bg-black/10")}`} onClick={toggleRemote} />
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform pointer-events-none ${enabled ? "translate-x-4" : ""}`} />
                </div>
            </div>

            {enabled && serverInfo && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-6">
                        <div className={`p-4 rounded-xl border flex flex-col items-center gap-4 ${isDark ? "bg-white border-none text-black" : "bg-white border-black/[0.08]"}`}>
                            <QRCodeSVG value={remoteUrl} size={120} />
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] font-bold uppercase tracking-widest text-black/50">Scan to Connect</span>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">Local URL</span>
                                <div className={`p-2 rounded font-mono text-xs select-all ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                    {remoteUrl}
                                </div>
                            </div>

                            {pendingReq ? (
                                <div className={`mt-4 p-3 rounded-xl border border-dashed flex flex-col gap-3 ${isDark ? "bg-yellow-500/10 border-yellow-500/50" : "bg-yellow-500/10 border-yellow-500/50"}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Pairing Request</span>
                                        <span className="text-xs font-mono font-bold">{pendingReq.code}</span>
                                    </div>
                                    <div className="text-xs text-[11px] opacity-80">{pendingReq.name} wants to connect. Match the code code above.</div>
                                    <div className="flex gap-2">
                                        <button onClick={handleApprove} className="flex-1 bg-green-500 text-white text-[10px] font-bold uppercase py-1.5 rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-1"><Check size={12} /> Allow</button>
                                        <button onClick={handleReject} className="flex-1 bg-red-500 text-white text-[10px] font-bold uppercase py-1.5 rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-1"><X size={12} /> Block</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 text-[10px] text-wv-gray italic flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Listening for devices...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Devices Management */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Whitelist */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-wv-gray">Trusted Devices</span>
                                <div className={`h-[1px] w-full ${isDark ? "bg-white/5" : "bg-black/5"}`} />
                            </div>
                            <div className="space-y-2">
                                {status.trustedDevices.length === 0 ? (
                                    <div className="text-[10px] text-wv-gray italic opacity-40 py-4">No trusted devices yet</div>
                                ) : (
                                    status.trustedDevices.map(device => (
                                        <div key={device.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{device.name}</span>
                                                <span className="text-[8px] font-mono text-wv-gray uppercase">{device.id}</span>
                                            </div>
                                            <button
                                                onClick={() => handleForget(device.id)}
                                                className="p-1.5 text-wv-gray hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Active Peers */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-wv-gray">Active Peers</span>
                                <div className={`h-[1px] w-full ${isDark ? "bg-white/5" : "bg-black/5"}`} />
                            </div>
                            <div className="space-y-2">
                                {status.activePeers.length === 0 ? (
                                    <div className="text-[10px] text-wv-gray italic opacity-40 py-4">No connected devices</div>
                                ) : (
                                    status.activePeers.map(peer => (
                                        <div key={peer.socketId} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${peer.authorized ? "bg-green-500" : "bg-yellow-500"}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{peer.name}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${peer.authorized ? "text-green-500" : "text-yellow-500"}`}>
                                                        {peer.authorized ? "Authorized" : "Pending Pairing"}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-mono text-wv-gray select-all opacity-50">{peer.socketId}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SettingsView: React.FC = () => {
    const { config, updateConfig, updateKeybind, resetKeybinds } = useSettings();
    const { logs, clearLogs, debugMode } = useApp();
    const { t, i18n } = useTranslation();
    const isDark = config.theme === 'dark';
    const theme = config.theme;

    // Alias config values
    const {
        format, bitrate, sampleRate, normalize, outDir,
        pythonPath, ffmpegPath, ffprobePath,
        audioDeviceId, smartOrganize, minimizeToTray, autoCheckUpdates,
        discogsToken, lowPowerMode, stemsQuality, keybinds
    } = config;

    // Functions to wrap updateConfig
    const setFormat = (f: any) => updateConfig({ format: f });
    const setBitrate = (b: any) => updateConfig({ bitrate: b });
    const setSampleRate = (s: any) => updateConfig({ sampleRate: s });
    const setNormalize = (n: boolean) => updateConfig({ normalize: n });
    const setPythonPath = (p: string) => updateConfig({ pythonPath: p });
    const setFfmpegPath = (f: string) => updateConfig({ ffmpegPath: f });
    const setFfprobePath = (f: string) => updateConfig({ ffprobePath: f });
    const setAudioDeviceId = (d: string) => updateConfig({ audioDeviceId: d });
    const setSmartOrganize = (s: boolean) => updateConfig({ smartOrganize: s });
    const setMinimizeToTray = (m: boolean) => updateConfig({ minimizeToTray: m });
    const setDiscogsToken = (t: string) => updateConfig({ discogsToken: t });
    const setLowPowerMode = (l: boolean) => updateConfig({ lowPowerMode: l });
    const setAutoCheckUpdates = (a: boolean) => updateConfig({ autoCheckUpdates: a });
    const setStemsQuality = (q: any) => updateConfig({ stemsQuality: q });
    const onPickDir = async () => { const p = await window.api.pickDir(); if (p) updateConfig({ outDir: p }); };
    const onClearLogs = clearLogs;

    const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [appVersion, setAppVersion] = React.useState("...");
    const [platformInfo, setPlatformInfo] = React.useState("...");

    React.useEffect(() => {
        const fetchDevices = async () => {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            setDevices(allDevices.filter(d => d.kind === 'audiooutput'));
        };
        const fetchVersion = async () => {
            const version = await window.api.getAppVersion();
            setAppVersion(version);
        };
        const fetchPlatform = async () => {
            const info = await window.api.getPlatformInfo();
            setPlatformInfo(info);
        };
        fetchDevices();
        fetchVersion();
        fetchPlatform();
        navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    }, []);





    const isBitrateApplicable = !["wav", "flac", "aiff"].includes(format);

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
            <div className="mb-8">
                <div className="flex items-center gap-2 text-wv-gray mb-1">
                    <Settings size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('settings.system')}</span>
                </div>
                <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>{t('settings.title')}</h2>
            </div>

            <div className="max-w-3xl space-y-8 pb-10">

                <div className={`p-6 rounded-2xl border ${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/[0.08]"}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <Waves size={18} className="text-wv-gray" />
                        <h3 className="text-xs font-black uppercase tracking-widest leading-none">{t('settings.orgAndSystem')}</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Globe size={12} /> {t('settings.language')}
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={i18n.language}
                                onChange={e => i18n.changeLanguage(e.target.value)}
                            >
                                <option value="en">{t('settings.english')}</option>
                                <option value="es">{t('settings.spanish')}</option>
                                <option value="ko">{t('settings.korean')}</option>
                                <option value="ru">{t('settings.russian')}</option>
                            </select>
                        </div>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.smartOrganize')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.smartOrganizeDesc2')}</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={smartOrganize}
                                    onChange={(e) => setSmartOrganize(e.target.checked)}
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${smartOrganize ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`} />
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${smartOrganize ? "translate-x-4" : ""}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.minimizeTray')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.minimizeTrayDesc')}</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={minimizeToTray}
                                    onChange={(e) => setMinimizeToTray(e.target.checked)}
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${minimizeToTray ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`} />
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${minimizeToTray ? "translate-x-4" : ""}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex flex-col gap-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.autoCheckUpdates')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.autoCheckUpdatesDesc')}</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={autoCheckUpdates}
                                    onChange={(e) => setAutoCheckUpdates(e.target.checked)}
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${autoCheckUpdates ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`} />
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoCheckUpdates ? "translate-x-4" : ""}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.lowPowerMode')}</span>
                                    <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Performance</span>
                                </div>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.lowPowerModeDesc')}</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={lowPowerMode}
                                    onChange={(e) => setLowPowerMode(e.target.checked)}
                                />
                                <div className={`w-10 h-6 rounded-full transition-colors ${lowPowerMode ? "bg-amber-500" : (isDark ? "bg-white/10" : "bg-black/10")}`} />
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${lowPowerMode ? "translate-x-4" : ""}`} />
                            </div>
                        </label>

                        <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/5" : "border-black/5"}`}>
                            <div className="flex flex-col gap-1 mb-4">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.backup')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.backupDesc')}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => (window as any).api.backupDB()}
                                    className={`flex-1 px-4 py-2.5 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                                >
                                    {t('settings.backupBtn')}
                                </button>
                                <button
                                    onClick={() => (window as any).api.restoreDB()}
                                    className={`flex-1 px-4 py-2.5 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                                >
                                    {t('settings.restoreBtn')}
                                </button>
                            </div>
                        </div>

                        <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/5" : "border-black/5"}`}>
                            <div className="flex flex-col gap-1 mb-4">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.discogs')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">{t('settings.discogsTokenDesc')}</span>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="password"
                                    value={discogsToken}
                                    onChange={(e) => setDiscogsToken(e.target.value)}
                                    placeholder={t('settings.discogsTokenPlaceholder')}
                                    className={`flex-1 border rounded-lg px-3 py-2.5 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                />
                                <button
                                    onClick={() => (window as any).api.openExternal('https://www.discogs.com/settings/developers')}
                                    className={`px-4 py-2.5 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                                >
                                    Get Token
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <Cpu className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.audio')}</h3>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <FileAudio size={12} /> {t('settings.format')}
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={format}
                                onChange={e => setFormat(e.target.value as TargetFormat)}
                            >

                                <optgroup label={t('settings.compressed')}>
                                    <option value="mp3">MP3</option>
                                    <option value="m4a">M4A</option>
                                    <option value="ogg">OGG</option>
                                </optgroup>
                                <optgroup label={t('settings.lossless')}>
                                    <option value="wav">WAV</option>
                                    <option value="flac">FLAC</option>
                                    <option value="aiff">AIFF</option>
                                </optgroup>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={12} /> {isBitrateApplicable ? t('settings.bitrate') : t('settings.resolution')}
                            </label>
                            {isBitrateApplicable ? (
                                <select
                                    className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                    value={bitrate}
                                    onChange={e => setBitrate(e.target.value as Bitrate)}
                                >

                                    <option value="128k">128 kbps</option>
                                    <option value="192k">192 kbps</option>
                                    <option value="256k">256 kbps</option>
                                    <option value="320k">320 kbps</option>
                                </select>
                            ) : (
                                <div className={`border rounded-lg px-3 py-2 text-xs border-dashed font-medium ${isDark ? "bg-white/5 border-white/10 text-wv-gray" : "bg-black/5 border-black/[0.08] text-wv-gray"}`}>
                                    Fixed 24-bit Lossless
                                </div>

                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Waves size={12} /> {t('settings.sampleRate')}
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={sampleRate}
                                onChange={e => setSampleRate(e.target.value as SampleRate)}
                            >

                                <option value="44100">44.1 kHz</option>
                                <option value="48000">48.0 kHz</option>
                                <option value="96000">96.0 kHz</option>
                            </select>
                        </div>

                        <div className="flex flex-col justify-end">
                            <label className={`flex items-center gap-3 border p-2.5 rounded-lg cursor-pointer transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-black/[0.08] hover:bg-black/[0.02]"}`}>
                                <input
                                    type="checkbox"
                                    className={`w-4 h-4 rounded border transition-all ${isDark ? "border-white/20 bg-wv-sidebar checked:bg-white" : "border-black/20 bg-white checked:bg-black"}`}
                                    checked={normalize}
                                    onChange={e => setNormalize(e.target.checked)}
                                />

                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isDark ? "text-white" : "text-black"}`}>{t('settings.normalize')}</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={`mt-6 pt-6 border-t ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>


                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                {t('settings.deviceId')}
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={audioDeviceId}
                                onChange={e => setAudioDeviceId(e.target.value)}
                            >

                                <option value="default">{t('settings.defaultDevice')}</option>
                                {devices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `${t('settings.outputPrefix')} ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>


                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <FolderSync className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.downloadsTitle')}</h3>
                    </div>


                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                            {t('settings.output')}
                        </label>
                        <div className="flex gap-3 mb-4">
                            <div className={`flex-1 border rounded-lg px-3 py-2 text-xs truncate ${isDark ? "bg-wv-bg border-white/5 text-white" : "bg-white border-black/[0.08] text-black"}`}>
                                {outDir || t('settings.systemMusic')}
                            </div>
                            <button
                                className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                                onClick={onPickDir}
                            >
                                {t('settings.change')}
                            </button>
                        </div>

                        <label className={`flex items-center gap-3 border p-2.5 rounded-lg cursor-pointer transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-black/[0.08] hover:bg-black/[0.02]"}`}>
                            <input
                                type="checkbox"
                                className={`w-4 h-4 rounded border transition-all ${isDark ? "border-white/20 bg-wv-sidebar checked:bg-white" : "border-black/20 bg-white checked:bg-black"}`}
                                checked={smartOrganize}
                                onChange={e => setSmartOrganize(e.target.checked)}
                            />

                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-2 ${isDark ? "text-white" : "text-black"}`}>
                                    {t('settings.smartOrganize')}
                                    <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                                </span>
                                <span className="text-[9px] text-wv-gray">{t('settings.smartOrganizeDesc')}</span>
                            </div>
                        </label>

                        <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/5" : "border-black/5"}`}>
                            <div className="flex flex-col gap-1 mb-4">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.stemsQuality')}</span>
                                <span className="text-[9px] text-wv-gray uppercase font-medium tracking-widest opacity-60">
                                    {stemsQuality === 'pro' ? t('settings.stemsQualityPro') : (stemsQuality === 'best' ? t('settings.stemsQualityBest') : t('settings.stemsQualityStandard'))}
                                </span>
                            </div>
                            <div className={`flex p-1 rounded-xl gap-1 ${isDark ? "bg-black/20" : "bg-black/5"}`}>
                                <button
                                    onClick={() => setStemsQuality('standard')}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${stemsQuality === 'standard'
                                        ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-black shadow-sm")
                                        : "text-wv-gray hover:text-wv-text"
                                        }`}
                                >
                                    {t('common.standard') || 'Standard'}
                                </button>
                                <button
                                    onClick={() => setStemsQuality('best')}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${stemsQuality === 'best'
                                        ? (isDark ? "bg-amber-500 text-white shadow-sm" : "bg-amber-500 text-white shadow-sm")
                                        : "text-wv-gray hover:text-wv-text"
                                        }`}
                                >
                                    {t('common.best') || 'Best'}
                                </button>
                                <button
                                    onClick={() => setStemsQuality('pro')}
                                    className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${stemsQuality === 'pro'
                                        ? (isDark ? "bg-blue-600 text-white shadow-sm" : "bg-blue-600 text-white shadow-sm")
                                        : "text-wv-gray hover:text-wv-text"
                                        }`}
                                >
                                    {t('common.pro') || 'Pro (6S)'}
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/5 shadow-sm"}`}>
                    <KeybindManager
                        keybinds={keybinds}
                        onUpdateKeybind={updateKeybind}
                        onRefresh={resetKeybinds}
                        theme={theme}
                    />

                </section>

                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <Smartphone className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>
                            WaveVault Link (Remote)
                        </h3>
                    </div>

                    <RemoteSettingsSection isDark={isDark} />
                </section>

                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <Settings className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>{t('settings.advanced')}</h3>
                    </div>


                    <div className="space-y-6">
                        <AdvancedPathInput
                            label={t('settings.pythonPath')}
                            value={pythonPath}
                            onChange={setPythonPath}
                            placeholder={t('settings.autoDetect')}
                            isDark={isDark}
                        />
                        <AdvancedPathInput
                            label={t('settings.ffmpegPath')}
                            value={ffmpegPath}
                            onChange={setFfmpegPath}
                            placeholder={t('settings.integratedBinary')}
                            isDark={isDark}
                        />
                        <AdvancedPathInput
                            label={t('settings.ffprobePath')}
                            value={ffprobePath}
                            onChange={setFfprobePath}
                            placeholder={t('settings.integratedBinary')}
                            isDark={isDark}
                        />
                    </div>
                </section>


                {debugMode && (
                    <section className={`border rounded-2xl p-6 shadow-sm ${isDark ? "bg-black/20 border-white/[0.05]" : "bg-black/[0.02] border-black/[0.08]"}`}>
                        <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                            <div className="flex items-center gap-2 text-wv-gray">
                                <Activity size={16} />
                                <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white/40" : "text-black/40"}`}>{t('settings.activity')}</h3>
                            </div>

                            <button
                                className="text-[9px] font-bold uppercase tracking-widest text-wv-gray hover:text-red-400 transition-colors"
                                onClick={onClearLogs}
                            >
                                <Trash2 size={12} /> {t('settings.clearLogs')}
                            </button>
                        </div>

                        <div className={`rounded-xl p-4 font-mono text-[10px] leading-relaxed border max-h-40 overflow-y-auto custom-scrollbar ${isDark ? "bg-black/20 border-white/[0.05]" : "bg-white border-black/[0.08]"}`}>
                            {logs.length === 0 ? (
                                <div className="text-center py-4 text-wv-gray italic opacity-30">
                                    {t('settings.noEvents')}
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`mb-2 flex gap-3 ${isDark ? "text-wv-gray" : "text-black/60"}`}>
                                        <span className={`select-none ${isDark ? "text-white/20" : "text-black/20"}`}>[{new Date().toLocaleTimeString()}]</span>
                                        <span>{log}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}


                <section className={`border rounded-2xl p-6 overflow-hidden relative ${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/5 shadow-sm"}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                                <Info size={24} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>
                                    {t('settings.about')}
                                </h3>
                                <p className="text-[10px] font-medium text-wv-gray uppercase tracking-widest">
                                    {t('settings.version')} {appVersion}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.api.checkForUpdates()}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all hover:scale-[1.02] active:scale-[0.98] ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90 shadow-md"
                                }`}
                        >
                            {t('settings.checkUpdates')}
                        </button>
                    </div>

                    <div className="mt-6 flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-wv-gray uppercase tracking-widest mb-1 opacity-50">{t('settings.developedBy')}</span>
                            <button
                                onClick={() => window.api.openExternal('https://strikemedia.xyz/wavevault')}
                                className={`text-[10px] font-bold text-left hover:underline transition-all ${isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
                            >
                                STRIKEMEDIA
                            </button>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-wv-gray uppercase tracking-widest mb-1 opacity-50">{t('settings.platform')}</span>
                            <span className={`text-[10px] font-bold ${isDark ? "text-white/60" : "text-black/60"}`}>
                                {platformInfo}
                            </span>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

