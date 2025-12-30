import React from "react";
import { TargetFormat, Bitrate, SampleRate } from "../types";
import { Settings, FileAudio, BarChart3, Waves, FolderSync, Trash2, Cpu, Activity, Info, Command } from "lucide-react";
import { KeybindManager } from "./KeybindManager";


interface SettingsViewProps {
    format: TargetFormat;
    setFormat: (format: TargetFormat) => void;
    bitrate: Bitrate;
    setBitrate: (bitrate: Bitrate) => void;
    sampleRate: SampleRate;
    setSampleRate: (sampleRate: SampleRate) => void;
    normalize: boolean;
    setNormalize: (val: boolean) => void;
    outDir?: string;
    onPickDir: () => void;
    logs: string[];
    onClearLogs: () => void;
    debugMode: boolean;
    pythonPath: string;
    setPythonPath: (path: string) => void;
    ffmpegPath: string;
    setFfmpegPath: (path: string) => void;
    ffprobePath: string;
    setFfprobePath: (path: string) => void;
    spotlightShortcut: string;
    setSpotlightShortcut: (s: string) => void;
    clipboardShortcut: string;
    setClipboardShortcut: (s: string) => void;
    keybinds: any[];
    updateKeybind: (id: string, accelerator: string) => Promise<void>;
    resetKeybinds: () => Promise<void>;
    audioDeviceId: string;
    setAudioDeviceId: (id: string) => void;
    theme: 'light' | 'dark';
    smartOrganize: boolean;
    setSmartOrganize: (val: boolean) => void;
}




const AdvancedPathInput = ({ label, value, onChange, placeholder, theme }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, theme: 'light' | 'dark' }) => {
    const isDark = theme === 'dark';
    const handlePick = async () => {
        const path = await window.api.pickFile();
        if (path) onChange(path);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">
                {label}
            </label>
            <div className="flex gap-3">
                <input
                    type="text"
                    className={`flex-1 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <button
                    className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                    onClick={handlePick}
                >
                    Buscar
                </button>

            </div>
        </div>
    );
};



export const SettingsView: React.FC<SettingsViewProps> = ({
    format, setFormat, bitrate, setBitrate, sampleRate, setSampleRate,
    normalize, setNormalize, outDir, onPickDir,
    logs, onClearLogs, debugMode,
    pythonPath, setPythonPath, ffmpegPath, setFfmpegPath, ffprobePath, setFfprobePath,
    spotlightShortcut, setSpotlightShortcut, clipboardShortcut, setClipboardShortcut,
    keybinds, updateKeybind, resetKeybinds,
    audioDeviceId, setAudioDeviceId,
    theme,
    smartOrganize, setSmartOrganize
}) => {
    const isDark = theme === 'dark';
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
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sistema</span>
                </div>
                <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>Preferencias</h2>
            </div>

            <div className="max-w-3xl space-y-8 pb-10">
                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <Cpu className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>Motor de Audio</h3>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <FileAudio size={12} /> Formato de Salida
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={format}
                                onChange={e => setFormat(e.target.value as TargetFormat)}
                            >

                                <optgroup label="Comprimidos">
                                    <option value="mp3">MP3</option>
                                    <option value="m4a">M4A</option>
                                    <option value="ogg">OGG</option>
                                </optgroup>
                                <optgroup label="Lossless">
                                    <option value="wav">WAV</option>
                                    <option value="flac">FLAC</option>
                                    <option value="aiff">AIFF</option>
                                </optgroup>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={12} /> {isBitrateApplicable ? "Bitrate" : "Resolución"}
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
                                <Waves size={12} /> Sample Rate
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
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isDark ? "text-white" : "text-black"}`}>Normalizar Audio</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={`mt-6 pt-6 border-t ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>


                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                Dispositivo de Salida
                            </label>
                            <select
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                value={audioDeviceId}
                                onChange={e => setAudioDeviceId(e.target.value)}
                            >

                                <option value="default">Dispositivo por Defecto</option>
                                {devices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Salida ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>


                <section className={`border rounded-2xl p-6 ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                    <div className={`flex items-center gap-2.5 mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                        <FolderSync className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>Descargas</h3>
                    </div>


                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                            Directorio Destino
                        </label>
                        <div className="flex gap-3 mb-4">
                            <div className={`flex-1 border rounded-lg px-3 py-2 text-xs truncate ${isDark ? "bg-wv-bg border-white/5 text-white" : "bg-white border-black/[0.08] text-black"}`}>
                                {outDir || "Música del Sistema"}
                            </div>
                            <button
                                className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                                onClick={onPickDir}
                            >
                                Cambiar
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
                                    Organización Inteligente
                                    <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                                </span>
                                <span className="text-[9px] text-wv-gray">Crear subcarpetas por Tonalidad (Camelot)</span>
                            </div>
                        </label>

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
                        <Settings className="text-wv-gray" size={16} />
                        <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>Avanzado</h3>
                    </div>


                    <div className="space-y-6">
                        <AdvancedPathInput
                            label="Ruta de Python 3"
                            value={pythonPath}
                            onChange={setPythonPath}
                            placeholder="Autodetectar (python3)"
                            theme={theme}
                        />
                        <AdvancedPathInput
                            label="Ruta de FFmpeg"
                            value={ffmpegPath}
                            onChange={setFfmpegPath}
                            placeholder="Binario Integrado"
                            theme={theme}
                        />
                        <AdvancedPathInput
                            label="Ruta de FFprobe"
                            value={ffprobePath}
                            onChange={setFfprobePath}
                            placeholder="Binario Integrado"
                            theme={theme}
                        />
                    </div>
                </section>


                {debugMode && (
                    <section className={`border rounded-2xl p-6 shadow-sm ${isDark ? "bg-black/20 border-white/[0.05]" : "bg-black/[0.02] border-black/[0.08]"}`}>
                        <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDark ? "border-white/[0.05]" : "border-black/[0.08]"}`}>
                            <div className="flex items-center gap-2 text-wv-gray">
                                <Activity size={16} />
                                <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white/40" : "text-black/40"}`}>Actividad</h3>
                            </div>

                            <button
                                className="text-[9px] font-bold uppercase tracking-widest text-wv-gray hover:text-red-400 transition-colors"
                                onClick={onClearLogs}
                            >
                                <Trash2 size={12} /> Limpiar
                            </button>
                        </div>

                        <div className={`rounded-xl p-4 font-mono text-[10px] leading-relaxed border max-h-40 overflow-y-auto custom-scrollbar ${isDark ? "bg-black/20 border-white/[0.05]" : "bg-white border-black/[0.08]"}`}>
                            {logs.length === 0 ? (
                                <div className="text-center py-4 text-wv-gray italic opacity-30">
                                    Sin eventos
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
                                    Acerca de WaveVault
                                </h3>
                                <p className="text-[10px] font-medium text-wv-gray uppercase tracking-widest">
                                    Versión {appVersion}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.api.checkForUpdates()}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all hover:scale-[1.02] active:scale-[0.98] ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90 shadow-md"
                                }`}
                        >
                            Buscar Actualizaciones
                        </button>
                    </div>

                    <div className="mt-6 flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-wv-gray uppercase tracking-widest mb-1 opacity-50">Desarrollado por</span>
                            <button
                                onClick={() => window.api.openExternal('https://strikemedia.xyz/wavevault')}
                                className={`text-[10px] font-bold text-left hover:underline transition-all ${isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
                            >
                                STRIKEMEDIA
                            </button>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-wv-gray uppercase tracking-widest mb-1 opacity-50">Plataforma</span>
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

