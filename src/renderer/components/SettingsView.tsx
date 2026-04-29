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

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;
    const inputClass = `w-full border px-4 py-2.5 text-sm outline-none transition-all ${isDark ? "bg-black border-white/10 text-white focus:border-white/30 rounded-xl" : "bg-white border-black/10 text-black focus:border-black/30 rounded-xl"}`;

    React.useEffect(() => {
        const unsubPairing = window.api.onRemotePairingRequest((req: any) => setPendingReq(req));
        const unsubStatus = window.api.onRemoteStatusUpdate((data: any) => setStatus(data));
        const checkStatus = async () => {
            const res = await window.api.getRemoteStatus();
            if (res) setStatus(res);
        };
        checkStatus();
        return () => { unsubPairing(); unsubStatus(); };
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

    const handleApprove = async () => { if (!pendingReq) return; await window.api.approvePairing(pendingReq.id); setPendingReq(null); };
    const handleReject = async () => { if (!pendingReq) return; await window.api.rejectPairing(pendingReq.id); setPendingReq(null); };
    const handleForget = async (id: string) => { await window.api.forgetDevice(id); };

    const remoteUrl = serverInfo ? `http://${serverInfo.ip}:${serverInfo.port}` : '';

    return (
        <div className="flex flex-col gap-6">
            <div className={`flex items-center justify-between p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 rounded-2xl" : "bg-white border-black/[0.04] rounded-2xl"}`}>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">WaveVault Link</span>
                    <span className="text-xs text-wv-text-muted">Control & Sync across devices</span>
                </div>
                <button
                    onClick={toggleRemote}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${enabled ? "bg-green-500 text-white" : (isDark ? "bg-white text-black" : "bg-black text-white")}`}
                >
                    {enabled ? "LINK ACTIVE" : "START ENGINE"}
                </button>
            </div>

            {enabled && serverInfo && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col gap-6">
                        <div className={`p-8 border flex flex-col items-center gap-6 ${isDark ? "bg-white text-black border-white rounded-2xl" : "bg-white border-black/10 rounded-2xl shadow-sm"}`}>
                            <QRCodeSVG value={remoteUrl} size={160} />
                            <div className="text-[10px] font-bold uppercase tracking-widest border-t border-black/5 pt-4 w-full text-center opacity-40">Scan Access Key</div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                             <span className="text-[10px] font-bold text-wv-text-muted uppercase tracking-widest px-1">Access Point URL</span>
                             <div className={`p-4 border font-mono text-xs select-all rounded-xl ${isDark ? "bg-black/40 border-white/10 text-white/60" : "bg-black/5 border-black/5 text-black/60"}`}>
                                {remoteUrl}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {pendingReq ? (
                            <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl flex flex-col gap-4 animate-pulse">
                                <div className="flex justify-between items-center text-amber-500">
                                    <span className="text-xs font-bold uppercase tracking-wider">Pairing Detected</span>
                                    <span className="text-xl font-mono font-black">{pendingReq.code}</span>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{pendingReq.name} is requesting access</div>
                                <div className="flex gap-4">
                                    <button onClick={handleApprove} className="flex-1 bg-green-500 text-white text-[10px] font-bold uppercase py-2.5 rounded-xl">Grant</button>
                                    <button onClick={handleReject} className="flex-1 bg-red-500 text-white text-[10px] font-bold uppercase py-2.5 rounded-xl">Deny</button>
                                </div>
                            </div>
                        ) : (
                            <div className={`p-6 border border-dashed flex flex-col items-center justify-center py-12 rounded-2xl ${isDark ? "border-white/10 text-white/20" : "border-black/10 text-black/20"}`}>
                                <Activity size={32} className="animate-pulse mb-4 opacity-20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for Handshake</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <span className="text-[10px] font-bold text-wv-text-muted uppercase tracking-widest px-1">Connected Terminals</span>
                            <div className="space-y-2">
                                {status.activePeers.length === 0 ? (
                                    <div className={`p-4 border border-dashed rounded-xl text-[10px] text-center italic ${isDark ? "border-white/5 text-white/20" : "border-black/5 text-black/20"}`}>
                                        No active connections
                                    </div>
                                ) : (
                                    status.activePeers.map(peer => (
                                        <div key={peer.socketId} className={`flex items-center justify-between p-4 border rounded-xl ${isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${peer.authorized ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500 animate-pulse"}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{peer.name}</span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${peer.authorized ? "text-green-500/60" : "text-amber-500/60"}`}>
                                                        {peer.authorized ? "Verified" : "Pending"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleForget(peer.socketId)} className="p-2 text-wv-text-muted hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
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

    const [activeTab, setActiveTab] = React.useState<'general' | 'audio' | 'downloads' | 'keys' | 'remote' | 'advanced' | 'about'>('general');

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

    const tabs = [
        { id: 'general', label: t('settings.general') || 'General', icon: Settings },
        { id: 'audio', label: t('settings.audio') || 'Audio', icon: Waves },
        { id: 'downloads', label: t('settings.downloadsTitle') || 'Downloads', icon: FolderSync },
        { id: 'keys', label: t('settings.keys') || 'Hotkeys', icon: Command },
        { id: 'remote', label: 'WaveVault Link', icon: Smartphone },
        { id: 'advanced', label: t('settings.advanced') || 'Advanced', icon: Cpu },
        { id: 'about', label: t('settings.about') || 'About', icon: Info },
    ];

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const inputClass = `w-full border px-4 py-2.5 text-sm outline-none transition-all ${isDark ? "bg-black border-white/10 text-white focus:border-white/30 rounded-xl" : "bg-white border-black/10 text-black focus:border-black/30 rounded-xl"}`;
    const btnClass = `px-6 py-2.5 border text-xs font-semibold transition-all active:scale-95 ${isDark ? "bg-white text-black border-white hover:bg-white/90 rounded-xl" : "bg-black text-white border-black hover:bg-black/90 rounded-xl"}`;
    const toggleClass = (checked: boolean) => `w-11 h-6 transition-all relative cursor-pointer rounded-full ${checked ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`;
    const toggleHandle = (checked: boolean) => `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-5" : ""}`;

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Local Settings Sidebar */}
            <div className={`w-64 border-r flex flex-col p-6 gap-2 ${isDark ? "bg-wv-sidebar border-white/5" : "bg-wv-sidebar border-black/5"}`}>
                <div className="mb-6 px-2">
                    <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                        {t('settings.title')}
                    </h2>
                </div>

                <div className="flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${activeTab === tab.id
                                ? (isDark ? "bg-white text-black font-bold shadow-lg" : "bg-black text-white font-bold shadow-lg")
                                : (isDark ? "text-wv-text-muted hover:bg-white/5 hover:text-white" : "text-wv-text-muted hover:bg-black/5 hover:text-black")
                                }`}
                        >
                            <tab.icon size={16} className={`transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : "group-hover:scale-110"}`} />
                            <span className="text-xs font-semibold tracking-tight">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5">
                    <span className="text-[10px] text-wv-text-muted font-medium opacity-60">Version</span>
                    <span className={`block text-xs font-mono mt-0.5 ${isDark ? "text-white/60" : "text-black/60"}`}>{appVersion}</span>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-10 ${isDark ? "bg-wv-bg" : "bg-gray-50/50"}`}>
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                    
                    {activeTab === 'general' && (
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { id: 'minimizeToTray', label: t('settings.minimizeTray'), desc: t('settings.minimizeTrayDesc'), checked: minimizeToTray, onChange: (v: boolean) => setMinimizeToTray(v) },
                                            { id: 'autoCheckUpdates', label: t('settings.autoCheckUpdates'), desc: t('settings.autoCheckUpdatesDesc'), checked: autoCheckUpdates, onChange: (v: boolean) => setAutoCheckUpdates(v) },
                                            { id: 'lowPowerMode', label: t('settings.lowPowerMode'), desc: t('settings.lowPowerModeDesc'), checked: lowPowerMode, onChange: (v: boolean) => setLowPowerMode(v) }
                                        ].map(item => (
                                            <label key={item.id} className={`${cardClass} cursor-pointer flex items-center justify-between group`}>
                                                <div className="flex flex-col gap-1 pr-4">
                                                    <span className="text-sm font-semibold">{item.label}</span>
                                                    <span className="text-[11px] text-wv-text-muted leading-tight">{item.desc}</span>
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
                    )}

                    {activeTab === 'audio' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.audio')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={cardClass}>
                                        <label className="text-xs font-semibold text-wv-text-muted flex items-center gap-2 mb-3">
                                            <FileAudio size={14} /> {t('settings.format')}
                                        </label>
                                        <select className={inputClass} value={format} onChange={e => setFormat(e.target.value as TargetFormat)}>
                                            <optgroup label="Compressed">
                                                <option value="mp3">MP3</option>
                                                <option value="m4a">M4A</option>
                                                <option value="ogg">Ogg</option>
                                            </optgroup>
                                            <optgroup label="Lossless">
                                                <option value="wav">WAV</option>
                                                <option value="flac">FLAC</option>
                                                <option value="aiff">AIFF</option>
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div className={cardClass}>
                                        <label className="text-xs font-semibold text-wv-text-muted flex items-center gap-2 mb-3">
                                            <BarChart3 size={14} /> {isBitrateApplicable ? t('settings.bitrate') : t('settings.resolution')}
                                        </label>
                                        {isBitrateApplicable ? (
                                            <select className={inputClass} value={bitrate} onChange={e => setBitrate(e.target.value as Bitrate)}>
                                                <option value="128k">128 kbps</option>
                                                <option value="192k">192 kbps</option>
                                                <option value="256k">256 kbps</option>
                                                <option value="320k">320 kbps</option>
                                            </select>
                                        ) : (
                                            <div className="w-full border border-dashed border-white/10 px-4 py-2.5 text-sm text-wv-text-muted rounded-xl">
                                                24-bit Mastering
                                            </div>
                                        )}
                                    </div>

                                    <div className={cardClass}>
                                        <label className="text-xs font-semibold text-wv-text-muted flex items-center gap-2 mb-3">
                                            <Waves size={14} /> {t('settings.sampleRate')}
                                        </label>
                                        <select className={inputClass} value={sampleRate} onChange={e => setSampleRate(e.target.value as SampleRate)}>
                                            <option value="44100">44.1 kHz</option>
                                            <option value="48000">48.0 kHz</option>
                                            <option value="96000">96.0 kHz</option>
                                        </select>
                                    </div>

                                    <div className={cardClass}>
                                        <label className="flex items-center justify-between cursor-pointer h-full">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold">{t('settings.normalize')}</span>
                                                <span className="text-[11px] text-wv-text-muted">EBU R128</span>
                                            </div>
                                            <div className="shrink-0 ml-4">
                                                <input type="checkbox" className="sr-only" checked={normalize} onChange={e => setNormalize(e.target.checked)} />
                                                <div className={toggleClass(normalize)}>
                                                    <div className={toggleHandle(normalize)} />
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className={`mt-4 ${cardClass}`}>
                                    <label className="text-xs font-semibold text-wv-text-muted flex items-center gap-2 mb-3">
                                        Output Device
                                    </label>
                                    <select className={inputClass} value={audioDeviceId} onChange={e => setAudioDeviceId(e.target.value)}>
                                        <option value="default">{t('settings.defaultDevice')}</option>
                                        {devices.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `${t('settings.outputPrefix')} ${device.deviceId.slice(0, 5)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'downloads' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.downloadsTitle')}</h3>
                                <div className="space-y-4">
                                    <div className={cardClass}>
                                        <label className="text-sm font-semibold mb-4 block">{t('settings.output')}</label>
                                        <div className="flex gap-3">
                                            <div className={`flex-1 border px-4 py-2.5 text-xs font-mono break-all line-clamp-1 rounded-xl flex items-center ${isDark ? "bg-black/20 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/40"}`}>
                                                {outDir || "~/Music/WaveVault"}
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

                                    <div className={cardClass}>
                                        <div className="flex flex-col gap-1 mb-6">
                                            <span className="text-sm font-semibold">{t('settings.stemsQuality')}</span>
                                            <span className="text-xs text-wv-text-muted">
                                                AI separation quality. Higher quality takes longer to process.
                                            </span>
                                        </div>
                                        <div className={`flex p-1.5 gap-1.5 border rounded-2xl ${isDark ? "bg-black/20 border-white/5" : "bg-black/5 border-black/5"}`}>
                                            {['standard', 'best', 'pro'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => setStemsQuality(q as any)}
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
                    )}

                    {activeTab === 'keys' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.keys')}</h3>
                                <div className={cardClass}>
                                    <KeybindManager keybinds={keybinds} onUpdateKeybind={updateKeybind} onRefresh={resetKeybinds} theme={theme} />
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'remote' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>WaveVault Link</h3>
                                <RemoteSettingsSection isDark={isDark} />
                                <div className="mt-6 grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Socket', value: 'Ready', color: 'text-green-500' },
                                        { label: 'Port', value: '4949', color: 'text-wv-text-muted' },
                                        { label: 'Security', value: 'AES-256', color: 'text-wv-text-muted' }
                                    ].map(stat => (
                                        <div key={stat.label} className={cardClass}>
                                            <span className="block text-[10px] font-medium text-wv-text-muted mb-0.5">{stat.label}</span>
                                            <span className={`block text-xs font-semibold ${stat.color}`}>{stat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.advanced')}</h3>
                                <div className="space-y-4">
                                    <div className={cardClass}>
                                        <div className="space-y-6">
                                            <AdvancedPathInput label={t('settings.pythonPath')} value={pythonPath} onChange={setPythonPath} placeholder={t('settings.autoDetect')} isDark={isDark} />
                                            <div className="h-px w-full bg-white/5" />
                                            <AdvancedPathInput label={t('settings.ffmpegPath')} value={ffmpegPath} onChange={setFfmpegPath} placeholder={t('settings.integratedBinary')} isDark={isDark} />
                                            <div className="h-px w-full bg-white/5" />
                                            <AdvancedPathInput label={t('settings.ffprobePath')} value={ffprobePath} onChange={setFfprobePath} placeholder={t('settings.integratedBinary')} isDark={isDark} />
                                        </div>
                                    </div>

                                    {debugMode && (
                                        <div className={cardClass}>
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <Activity size={18} className="text-wv-text-muted" />
                                                    <span className="text-sm font-semibold">Event Log</span>
                                                </div>
                                                <button onClick={clearLogs} className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors">
                                                    Clear logs
                                                </button>
                                            </div>
                                            <div className={`p-4 font-mono text-[11px] h-80 overflow-y-auto custom-scrollbar rounded-xl border ${isDark ? "bg-black/40 border-white/5 text-white/40" : "bg-black/5 border-black/5 text-black/40"}`}>
                                                {logs.length === 0 ? (
                                                    <div className="h-full flex items-center justify-center italic opacity-40">No events recorded</div>
                                                ) : (
                                                    logs.map((log, i) => (
                                                        <div key={i} className="mb-2 flex gap-4 pb-2 border-b border-white/5 last:border-0 leading-relaxed">
                                                            <span className="opacity-40 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                                                            <span className="whitespace-pre-wrap">{log}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="space-y-8">
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
                                        Professional audio toolkit for high-fidelity stem separation and format conversion.
                                    </p>

                                    <button onClick={() => window.api.checkForUpdates()} className={btnClass}>
                                        Check for Updates
                                    </button>

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
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};


