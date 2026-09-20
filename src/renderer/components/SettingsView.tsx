import React, { useState, useEffect } from "react";
import { TargetFormat, Bitrate, SampleRate } from "../types";
import { Settings, Waves, FolderSync, Command, Smartphone, Cpu, Info, HardDrive } from "lucide-react";
import { KeybindManager } from "./KeybindManager";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useApp } from "../context/AppContext";
import { useDependenciesManager } from "../hooks/useDependenciesManager";

import { GeneralSettingsSection } from "./settings/GeneralSettingsSection";
import { AudioSettingsSection } from "./settings/AudioSettingsSection";
import { DownloadsSettingsSection } from "./settings/DownloadsSettingsSection";
import { RemoteSettingsSection } from "./settings/RemoteSettingsSection";
import { AdvancedSettingsSection } from "./settings/AdvancedSettingsSection";
import { AboutSettingsSection } from "./settings/AboutSettingsSection";
import { StorageSettingsSection } from "./settings/StorageSettingsSection";

interface SettingsViewProps {
    onOpenDuplicates?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenDuplicates }) => {
    const { config, updateConfig, updateKeybind, resetKeybinds } = useSettings();
    const { logs, clearLogs, debugMode } = useApp();
    const { dependencies } = useDependenciesManager();
    const { t } = useTranslation();
    const isDark = config.theme === 'dark';
    const theme = config.theme;

    const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'downloads' | 'keys' | 'remote' | 'storage' | 'advanced' | 'about'>('general');

    // Config values
    const {
        format, bitrate, sampleRate, normalize, outDir,
        pythonPath, ffmpegPath, ffprobePath,
        audioDeviceId, smartOrganize, minimizeToTray, autoCheckUpdates,
        discogsToken, lowPowerMode, stemsQuality, keybinds
    } = config;

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [appVersion, setAppVersion] = useState("...");
    const [platformInfo, setPlatformInfo] = useState("...");

    useEffect(() => {
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

    const tabs = [
        { id: 'general', label: t('settings.general') || 'General', icon: Settings },
        { id: 'audio', label: t('settings.audio') || 'Audio', icon: Waves },
        { id: 'downloads', label: t('settings.downloadsTitle') || 'Downloads', icon: FolderSync },
        { id: 'storage', label: t('settings.storage') || 'Storage', icon: HardDrive },
        { id: 'keys', label: t('settings.keys') || 'Hotkeys', icon: Command },
        { id: 'remote', label: 'WaveVault Link', icon: Smartphone },
        { id: 'advanced', label: t('settings.advanced') || 'Advanced', icon: Cpu },
        { id: 'about', label: t('settings.about') || 'About', icon: Info },
    ];

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar de Ajustes */}
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

            {/* Área de Contenido */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-10 ${isDark ? "bg-wv-bg" : "bg-gray-50/50"}`}>
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {activeTab === 'general' && (
                        <GeneralSettingsSection
                            isDark={isDark}
                            minimizeToTray={minimizeToTray}
                            setMinimizeToTray={(v) => updateConfig({ minimizeToTray: v })}
                            autoCheckUpdates={autoCheckUpdates}
                            setAutoCheckUpdates={(v) => updateConfig({ autoCheckUpdates: v })}
                            lowPowerMode={lowPowerMode}
                            setLowPowerMode={(v) => updateConfig({ lowPowerMode: v })}
                            discogsToken={discogsToken}
                            setDiscogsToken={(t) => updateConfig({ discogsToken: t })}
                        />
                    )}

                    {activeTab === 'audio' && (
                        <AudioSettingsSection
                            isDark={isDark}
                            format={format}
                            setFormat={(f) => updateConfig({ format: f })}
                            bitrate={bitrate}
                            setBitrate={(b) => updateConfig({ bitrate: b })}
                            sampleRate={sampleRate}
                            setSampleRate={(s) => updateConfig({ sampleRate: s })}
                            normalize={normalize}
                            setNormalize={(n) => updateConfig({ normalize: n })}
                            audioDeviceId={audioDeviceId}
                            setAudioDeviceId={(d) => updateConfig({ audioDeviceId: d })}
                            devices={devices}
                        />
                    )}

                    {activeTab === 'downloads' && (
                        <DownloadsSettingsSection
                            isDark={isDark}
                            outDir={outDir}
                            onPickDir={async () => {
                                const p = await window.api.pickDir();
                                if (p) updateConfig({ outDir: p });
                            }}
                            smartOrganize={smartOrganize}
                            setSmartOrganize={(s) => updateConfig({ smartOrganize: s })}
                            stemsQuality={stemsQuality}
                            setStemsQuality={(q) => updateConfig({ stemsQuality: q })}
                        />
                    )}

                    {activeTab === 'storage' && (
                        <StorageSettingsSection
                            isDark={isDark}
                            onOpenDuplicates={onOpenDuplicates}
                        />
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
                        <AdvancedSettingsSection
                            isDark={isDark}
                            pythonPath={pythonPath}
                            setPythonPath={(p) => updateConfig({ pythonPath: p })}
                            ffmpegPath={ffmpegPath}
                            setFfmpegPath={(f) => updateConfig({ ffmpegPath: f })}
                            ffprobePath={ffprobePath}
                            setFfprobePath={(f) => updateConfig({ ffprobePath: f })}
                            dependencies={dependencies}
                        />
                    )}

                    {activeTab === 'about' && (
                        <AboutSettingsSection
                            isDark={isDark}
                            appVersion={appVersion}
                            platformInfo={platformInfo}
                            debugMode={debugMode}
                            logs={logs}
                            clearLogs={clearLogs}
                        />
                    )}

                </div>
            </div>
        </div>
    );
};
