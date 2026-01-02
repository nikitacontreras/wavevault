import React, { useState } from "react";
import { FileAudio, RefreshCw, Loader2, CheckCircle, AlertCircle, Trash2, Settings, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TargetFormat, Bitrate, SampleRate } from "../types";

export const ConverterView: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
    const isDark = theme === 'dark';
    const { t } = useTranslation();

    const [files, setFiles] = useState<File[]>([]);
    const [isConverting, setIsConverting] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [outDir, setOutDir] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Settings
    const [format, setFormat] = useState<TargetFormat>("mp3");
    const [bitrate, setBitrate] = useState<Bitrate>("192k");
    const [sampleRate, setSampleRate] = useState<SampleRate>("44100");
    const [normalize, setNormalize] = useState(false);

    const handleFilePickNative = async () => {
        const paths = await (window as any).api.pickFile([
            { name: "Audio Files", extensions: ["mp3", "wav", "flac", "m4a", "ogg", "aiff"] }
        ]);
        if (paths) {
            if (typeof paths === 'string') {
                setFiles(prev => [...prev, { name: paths, path: paths } as any]);
            } else if (Array.isArray(paths)) {
                setFiles(prev => [...prev, ...paths.map(p => ({ name: p, path: p } as any))]);
            }
        }
    };

    const handlePickOutDir = async () => {
        const path = await (window as any).api.pickDir();
        if (path) setOutDir(path);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const startConversion = async () => {
        if (files.length === 0 || !outDir) return;
        setIsConverting(true);

        const newResults = [];
        for (const file of files) {
            try {
                const job = {
                    src: (file as any).path,
                    outDir,
                    format,
                    bitrate,
                    sampleRate,
                    normalize
                };
                const result = await (window as any).api.convertFile(job);
                newResults.push({ ...result, status: 'success' });
            } catch (e: any) {
                newResults.push({ originalName: file.name, status: 'error', error: e.message });
            }
        }
        setResults(newResults);
        setIsConverting(false);
        setFiles([]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        // In Electron, File objects from dataTransfer already have a .path property
        const audioFiles = droppedFiles.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|flac|m4a|ogg|aiff)$/i));

        if (audioFiles.length > 0) {
            setFiles(prev => [...prev, ...audioFiles.map(f => ({
                name: f.name,
                path: (f as any).path || (f as any).name // Fallback
            } as any))]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-wv-bg">
            {/* Header / Intro */}
            <div className={`border rounded-2xl p-8 mb-8 transition-all flex flex-col items-center text-center ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                <div className={`p-4 rounded-3xl mb-4 ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                    <RefreshCw size={40} className={`text-wv-text ${isConverting ? "animate-spin" : ""}`} strokeWidth={1.5} />
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{t('converter.title')}</h2>
                <p className="text-wv-gray text-[10px] font-black mb-0 max-w-sm uppercase tracking-[0.2em] opacity-60">
                    {t('converter.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className={`border rounded-2xl p-6 transition-all ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-white border-black/[0.08] shadow-sm"}`}>
                        <div className="flex items-center gap-2 mb-6">
                            <Settings size={14} className="text-wv-gray" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-wv-gray">{t('converter.settingsTitle')}</h3>
                        </div>

                        <div className="space-y-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <FileAudio size={10} /> {t('converter.format')}
                                </label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as any)}
                                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[36px]"}`}
                                >
                                    <option value="mp3">MP3 (High Quality)</option>
                                    <option value="wav">WAV (Lossless)</option>
                                    <option value="flac">FLAC (Compressed Lossless)</option>
                                    <option value="m4a">M4A (AAC)</option>
                                    <option value="ogg">OGG (Vorbis)</option>
                                    <option value="aiff">AIFF (Apple Lossless)</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <RefreshCw size={10} /> {t('converter.bitrate')}
                                </label>
                                <select
                                    value={bitrate}
                                    onChange={(e) => setBitrate(e.target.value as any)}
                                    disabled={format === "wav" || format === "flac" || format === "aiff"}
                                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[36px]"} disabled:opacity-30`}
                                >
                                    <option value="128k">128 kbps (Mobile)</option>
                                    <option value="192k">192 kbps (Standard)</option>
                                    <option value="256k">256 kbps (High)</option>
                                    <option value="320k">320 kbps (Extreme)</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Settings size={10} /> {t('converter.sampleRate')}
                                </label>
                                <select
                                    value={sampleRate}
                                    onChange={(e) => setSampleRate(e.target.value as any)}
                                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[36px]"}`}
                                >
                                    <option value="44100">44.1 kHz (CD)</option>
                                    <option value="48000">48.0 kHz (Video)</option>
                                    <option value="88200">88.2 kHz (High-Res)</option>
                                    <option value="96000">96.0 kHz (Studio)</option>
                                </select>
                            </div>

                            <button
                                onClick={() => setNormalize(!normalize)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${normalize ? (isDark ? "bg-white/10 border-white/20" : "bg-black/5 border-black/10") : (isDark ? "bg-transparent border-white/5" : "bg-transparent border-black/5")}`}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('converter.normalize')}</span>
                                    <span className="text-[9px] text-wv-gray">{t('converter.normalizeDesc')}</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-all ${normalize ? "bg-blue-600" : "bg-wv-gray/20"}`}>
                                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all ${normalize ? "translate-x-5" : ""}`} />
                                </div>
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2 mb-1">
                                <Download size={10} /> {t('converter.destination')}
                            </label>
                            <button
                                onClick={handlePickOutDir}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${outDir ? (isDark ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-100 text-green-600") : (isDark ? "bg-white text-black" : "bg-black text-white")}`}
                            >
                                {outDir ? t('converter.folderSelected') : t('converter.setFolder')}
                            </button>
                            {outDir && (
                                <div className={`p-2 rounded-lg text-[9px] font-mono truncate uppercase opacity-60 ${isDark ? "bg-black/20" : "bg-black/5"}`}>
                                    {outDir}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Queue Panel */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-wv-gray">{t('converter.queueTitle')}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isDark ? "bg-white/10 text-white" : "bg-black text-white"}`}>
                                {t('projects.found', { count: files.length })}
                            </span>
                        </div>
                        <button
                            onClick={handleFilePickNative}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"}`}
                        >
                            {t('converter.addFiles')}
                        </button>
                    </div>

                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`flex-1 min-h-[500px] border rounded-3xl p-6 overflow-y-auto custom-scrollbar transition-all ${isDragging ? "border-blue-500 bg-blue-500/5 scale-[0.99]" : (isDark ? "bg-wv-surface border-white/[0.05]" : "bg-white border-black/[0.08] shadow-sm")}`}
                    >
                        {files.length === 0 && results.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-10">
                                <FileAudio size={80} strokeWidth={1} />
                                <p className="mt-6 text-sm font-black uppercase tracking-[0.3em]">{t('converter.dropFiles')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {files.map((file, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDark ? "bg-white/5 hover:bg-white/10 border border-white/5" : "bg-black/5 border border-transparent shadow-sm"}`}>
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                                <FileAudio size={18} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold truncate">{(file as any).name || file.name}</span>
                                                <span className="text-[9px] uppercase font-bold text-wv-gray">{t('converter.waiting')}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(i)}
                                            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/10 text-wv-gray hover:text-red-400" : "hover:bg-red-500/10 text-black/10 hover:text-red-500"}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                {results.map((res, i) => (
                                    <div key={`res-${i}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${res.status === 'success' ? (isDark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-100") : (isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100")}`}>
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={res.status === 'success' ? "text-green-500" : "text-red-500"}>
                                                {res.status === 'success' ? <CheckCircle size={24} strokeWidth={2.5} /> : <AlertCircle size={24} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-black truncate">{res.originalName}</span>
                                                <span className={`text-[9px] uppercase font-bold ${res.status === 'success' ? "text-green-600/60" : "text-red-600/60"}`}>
                                                    {res.status === 'success' ? t('converter.convertedTo', { format: res.format.toUpperCase() }) : `${t('spotlight.error')}: ${res.error}`}
                                                </span>
                                            </div>
                                        </div>
                                        {res.status === 'success' && (
                                            <button
                                                onClick={() => (window as any).api.openItem(res.path)}
                                                className={`p-2.5 rounded-xl transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-black hover:bg-black/10"}`}
                                            >
                                                <Download size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={startConversion}
                        disabled={isConverting || files.length === 0 || !outDir}
                        className={`
                            w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all
                            ${isDark ? "bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:hover:shadow-none" : "bg-black text-white shadow-xl hover:bg-black/90"}
                            disabled:opacity-30
                        `}
                    >
                        {isConverting ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                        {isConverting ? t('converter.processing') : t('converter.startConversion', { count: files.length })}
                    </button>
                </div>
            </div>
        </div>
    );
};
