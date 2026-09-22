import React from "react";
import { FileAudio, BarChart3, Waves } from "lucide-react";
import { TargetFormat, Bitrate, SampleRate } from "../../types";
import { useTranslation } from "react-i18next";

interface AudioSettingsSectionProps {
    isDark: boolean;
    format: TargetFormat;
    setFormat: (f: TargetFormat) => void;
    bitrate: Bitrate | string;
    setBitrate: (b: Bitrate) => void;
    sampleRate: SampleRate | string;
    setSampleRate: (s: SampleRate) => void;
    normalize: boolean;
    setNormalize: (n: boolean) => void;
    audioDeviceId: string;
    setAudioDeviceId: (id: string) => void;
    devices: MediaDeviceInfo[];
}

export const AudioSettingsSection: React.FC<AudioSettingsSectionProps> = ({
    isDark,
    format,
    setFormat,
    bitrate,
    setBitrate,
    sampleRate,
    setSampleRate,
    normalize,
    setNormalize,
    audioDeviceId,
    setAudioDeviceId,
    devices
}) => {
    const { t } = useTranslation();

    const isBitrateApplicable = !["wav", "flac", "aiff"].includes(format);
    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const inputClass = `w-full border px-4 py-2.5 text-sm outline-none transition-all ${isDark ? "bg-black border-white/10 text-white focus:border-white/30 rounded-xl" : "bg-white border-black/10 text-black focus:border-black/30 rounded-xl"}`;
    const toggleClass = (checked: boolean) => `w-11 h-6 transition-all relative cursor-pointer rounded-full ${checked ? "bg-blue-600" : (isDark ? "bg-white/10" : "bg-black/10")}`;
    const toggleHandle = (checked: boolean) => `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-5" : ""}`;

    return (
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
    );
};
