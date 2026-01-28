import React, { useState, useRef } from "react";
import { HistoryItem } from "../types";
import { X, FolderOpen, Tag, Info, Calendar, Database, Activity, Scissors, Check, Loader2, ZoomIn, ZoomOut, Layers, Music2 } from "lucide-react";
import { Waveform } from "./Waveform";
import { useStems } from "../hooks/useStems";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";

interface LibraryItemModalProps {
    item: HistoryItem;
    onClose: () => void;
    onOpenItem: (path: string) => void;
    onUpdateItem: (id: string, updates: Partial<HistoryItem>) => void;
}

export const LibraryItemModal: React.FC<LibraryItemModalProps> = ({ item, onClose, onOpenItem, onUpdateItem }) => {
    const { config } = useSettings();
    const { addStemsTask } = useLibrary();
    const theme = config.theme;
    const isDark = theme === 'dark';
    const [tagInput, setTagInput] = useState("");
    const [isChopping, setIsChopping] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [zoom, setZoom] = useState(0);
    const [isLooping, setIsLooping] = useState(false);
    const wavesurferRef = useRef<any>(null);
    const { isSeparating, progress, stems: stemsResult, error: stemsError, separate } = useStems();

    const handleSeparateStems = async () => {
        try {
            addStemsTask(item.path, item.title);
            // Use same directory as the original file but in a 'Stems' subfolder
            const outDir = item.path.substring(0, item.path.lastIndexOf(window.api.platform === 'win32' ? '\\' : '/'));
            await separate(item.path, outDir);
        } catch (err) {
            console.error(err);
        }
    };


    const categories = ["Drums", "Bass", "Synth", "Keys", "Vocals", "Loop", "FX", "Other"];

    const addTag = () => {
        if (!tagInput.trim()) return;
        const inputTags = tagInput.split(',').map(t => t.trim()).filter(t => t !== "");
        const newTags = [...(item.tags || [])];
        let changed = false;
        inputTags.forEach(t => {
            if (!newTags.includes(t)) {
                newTags.push(t);
                changed = true;
            }
        });
        if (changed) {
            onUpdateItem(item.id, { tags: newTags });
        }
        setTagInput("");
    };


    const removeTag = (tag: string) => {
        const newTags = item.tags.filter(t => t !== tag);
        onUpdateItem(item.id, { tags: newTags });
    };

    const handleCategoryChange = (cat: string) => {
        onUpdateItem(item.id, { category: cat });
    };

    const handleTrim = async () => {
        if (startTime >= endTime) return;
        setIsProcessing(true);
        try {
            const newPath = await window.api.trimAudio(item.path, startTime, endTime);
            window.api.openItem(newPath);
            setIsChopping(false);
        } catch (e) {
            console.error("Trimming failed", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRegionChange = (start: number, end: number) => {
        setStartTime(start);
        setEndTime(end);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <div className={`border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl transition-all ${isDark ? "bg-wv-bg border-white/10 text-white" : "bg-white border-black/10 text-black"}`} onClick={e => e.stopPropagation()}>


                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-black/[0.02] border-black/[0.08]"}`}>
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-wv-gray" />
                        <h2 className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-white/80" : "text-black/80"}`}>Información del Sample</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isSeparating ? (isDark ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white') : (isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-black/5 hover:bg-black/10 text-black/60')}`}
                            onClick={handleSeparateStems}
                            disabled={isSeparating}
                        >
                            {isSeparating ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
                            {isSeparating ? 'Separando...' : 'Separar Stems (AI)'}
                        </button>
                        <button
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isChopping ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : (isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-black/5 hover:bg-black/10 text-black/60')}`}
                            onClick={() => setIsChopping(!isChopping)}
                        >
                            <Scissors size={12} /> {isChopping ? 'Cancelar Chop' : 'Chop Sample'}
                        </button>
                        <button className={`p-1 rounded-md transition-colors group ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`} onClick={onClose}>
                            <X size={18} className={`text-wv-gray ${isDark ? "group-hover:text-white" : "group-hover:text-black"}`} />
                        </button>
                    </div>
                </div>


                <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar space-y-8">
                    <div className={`rounded-xl p-4 border transition-all ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-bold text-wv-gray uppercase tracking-[0.2em] shrink-0">{isChopping ? 'Selección Visual (Drag & Resize)' : 'Señal de Audio'}</span>

                            <div className="flex items-center gap-6 flex-1 justify-end">
                                {isChopping && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${isDark ? "bg-white/5 border-white/[0.08]" : "bg-black/5 border-black/[0.08]"}`}>
                                        <ZoomOut size={12} className="text-wv-gray" />
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={zoom}
                                            onChange={(e) => setZoom(parseInt(e.target.value))}
                                            className={`w-24 h-1 rounded-lg appearance-none cursor-pointer transition-all ${isDark ? "bg-white/10 accent-white" : "bg-black/10 accent-black"}`}
                                        />
                                        <ZoomIn size={12} className="text-wv-gray" />
                                    </div>
                                )}
                                <div className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-widest whitespace-nowrap border ${isDark ? "bg-white/5 border-white/[0.05] text-white" : "bg-black/5 border-black/[0.05] text-black"}`}>
                                    {startTime.toFixed(2)}s - {endTime.toFixed(2)}s ({(endTime - startTime).toFixed(2)}s)
                                </div>
                            </div>
                        </div>
                        <div className={`relative border rounded-lg overflow-hidden transition-all ${isDark ? "bg-wv-bg border-white/[0.08]" : "bg-white border-black/[0.08]"}`}>
                            <div className="overflow-x-auto custom-scrollbar no-drag">
                                <Waveform
                                    url={item.path}
                                    height={120}
                                    theme={theme}
                                    showControls={true}
                                    useRegions={true}
                                    onRegionChange={handleRegionChange}
                                    zoom={zoom}
                                    onZoomChange={setZoom}
                                    isLooping={isLooping}
                                    onLoopToggle={() => setIsLooping(!isLooping)}
                                    onReady={(ws) => {
                                        wavesurferRef.current = ws;
                                        setDuration(ws.getDuration());
                                    }}
                                />

                            </div>
                        </div>

                        {isChopping && (
                            <div className="mt-8 animate-in slide-in-from-top-2">
                                <button
                                    className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xl ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-black/80"}`}
                                    onClick={handleTrim}
                                    disabled={isProcessing || startTime >= endTime}
                                >

                                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    Finalizar Chop y Guardar
                                </button>
                                <p className="text-center text-[9px] text-wv-gray mt-3 uppercase tracking-wider opacity-50">El audio se guardará como un nuevo archivo en tu carpeta de música</p>
                            </div>
                        )}

                        {isSeparating && (
                            <div className={`p-4 rounded-xl border animate-in slide-in-from-top-4 ${isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50/50 border-blue-200"}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Loader2 size={16} className={`animate-spin ${isDark ? "text-blue-400" : "text-blue-600"}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest">IA Procesando Audio...</span>
                                </div>
                                <div className={`font-mono text-[10px] p-3 rounded-lg overflow-hidden whitespace-pre-wrap ${isDark ? "bg-black/40 text-blue-300" : "bg-white text-blue-700 border border-blue-100"}`}>
                                    {progress}
                                </div>
                                <p className="text-[9px] text-wv-gray mt-2 uppercase tracking-widest opacity-60">Esto puede tardar un par de minutos según la duración del archivo</p>
                            </div>
                        )}

                        {stemsResult && (
                            <div className={`p-4 rounded-xl border animate-in zoom-in-95 ${isDark ? "bg-green-500/10 border-green-500/20" : "bg-green-50/50 border-green-200"}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-1.5 rounded-lg ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`}>
                                        <Check size={14} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">¡Separación Completada!</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(stemsResult).map(([name, path]) => (
                                        <button
                                            key={name}
                                            onClick={() => window.api.openItem(path as string)}
                                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isDark ? "bg-black/20 border-white/5 hover:bg-white/10" : "bg-white border-black/5 hover:bg-black/10"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Music2 size={12} className="text-wv-gray" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{name}</span>
                                            </div>
                                            <FolderOpen size={10} className="text-wv-gray opacity-50" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {!isChopping && (
                        <>
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                <div className={`w-full sm:w-32 aspect-square rounded-xl overflow-hidden border shrink-0 ${isDark ? "border-white/10" : "border-black/5"}`}>
                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className={`text-xl font-bold tracking-tight mb-0.5 ${isDark ? "text-white" : "text-black"}`}>{item.title}</h3>
                                        <p className="text-wv-gray text-sm font-medium">{item.channel}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>{item.format}</span>
                                        {item.bpm && <span className={`border text-[9px] font-bold px-2 py-0.5 rounded ${isDark ? "bg-white/5 border-white/[0.05] text-wv-gray" : "bg-black/5 border-black/[0.05] text-black/60"}`}>{item.bpm} BPM</span>}
                                        {item.key && <span className={`border text-[9px] font-bold px-2 py-0.5 rounded ${isDark ? "bg-white/5 border-white/[0.05] text-wv-text" : "bg-black/5 border-black/[0.05] text-black/80"}`}>{item.key}</span>}
                                    </div>

                                </div>
                            </div>

                            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t transition-colors ${isDark ? "border-white/[0.08]" : "border-black/[0.08]"}`}>

                                <MetaItem icon={<Calendar size={12} />} label="Agregado" value={new Date(item.date).toLocaleDateString()} theme={theme} />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-1.5">
                                        <Tag size={12} /> Categoría
                                    </label>
                                    <select
                                        className={`border rounded-lg py-1 px-2 text-[10px] outline-none transition-all ${isDark ? "bg-wv-surface border-white/[0.08] text-white focus:border-white/20" : "bg-wv-surface border-black/[0.08] text-black focus:border-black/20"}`}
                                        value={item.category || ""}
                                        onChange={e => handleCategoryChange(e.target.value)}
                                    >

                                        <option value="">Sin categoría</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <MetaItem icon={<Database size={12} />} label="Origen" value={item.source || "YouTube"} theme={theme} />
                                <MetaItem icon={<Activity size={12} />} label="Sample Rate" value={`${item.sampleRate || "44100"} Hz`} theme={theme} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-1.5">
                                    <Tag size={12} /> Etiquetas
                                </label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {(item.tags || []).map(t => (
                                        <span key={t} className={`border text-[10px] font-medium flex items-center gap-1.5 py-1 px-2.5 rounded-lg group transition-all ${isDark ? "bg-white/5 border-white/[0.08] text-white/70 hover:border-white/20" : "bg-black/5 border-black/[0.08] text-black/70 hover:border-black/20"}`}>
                                            {t}
                                            <X size={10} className="cursor-pointer text-wv-gray hover:text-red-500 mt-0.5" onClick={() => removeTag(t)} />
                                        </span>
                                    ))}
                                    <div className={`flex border rounded-lg overflow-hidden transition-all ${isDark ? "bg-wv-surface border-white/[0.08] focus-within:border-white/20" : "bg-wv-surface border-black/[0.08] focus-within:border-black/20"}`}>
                                        <input
                                            type="text"
                                            placeholder="Add tag..."
                                            className={`bg-transparent border-none py-1 px-3 text-[10px] outline-none w-24 ${isDark ? "text-white placeholder:text-white/30" : "text-black placeholder:text-black/30"}`}
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && addTag()}
                                        />
                                        <button onClick={addTag} className={`px-2 border-l text-[10px] font-bold transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/[0.08] text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}>+</button>
                                    </div>

                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={`px-6 py-5 border-t flex justify-end transition-colors ${isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-black/[0.08] bg-black/[0.02]"}`}>
                    <button
                        className={`py-2 px-6 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-black/80"}`}
                        onClick={() => onOpenItem(item.path)}
                    >
                        <FolderOpen size={14} /> Localizar archivo
                    </button>
                </div>
            </div>
        </div>
    );
};

const MetaItem = ({ icon, label, value, theme }: { icon: React.ReactNode, label: string, value: string, theme: 'light' | 'dark' }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-1.5">
            {icon} {label}
        </label>
        <span className={`text-xs font-bold uppercase tracking-tight ${theme === 'dark' ? "text-white" : "text-black"}`}>{value}</span>
    </div>

);
