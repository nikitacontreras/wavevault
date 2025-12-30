import React, { useState, useMemo } from "react";
import { HistoryItem } from "../types";
import { LibraryItemModal } from "./LibraryItemModal";
import { Search, Filter, Folder, Music, Play, Pause, ExternalLink, Tag, Clock, Loader2, Trash2 } from "lucide-react";

import { Waveform } from "./Waveform";

interface HistoryViewProps {
    history: HistoryItem[];
    onClearHistory: () => void;
    onOpenItem: (path: string) => void;
    onTogglePreview: (url: string) => void;
    onUpdateItem: (id: string, updates: Partial<HistoryItem>) => void;
    onRemoveItem: (id: string) => void;
    playingUrl: string | null;
    isPreviewLoading: boolean;
    theme: 'light' | 'dark';
}



export const HistoryView: React.FC<HistoryViewProps> = ({
    history,
    onClearHistory,
    onOpenItem,
    onTogglePreview,
    onUpdateItem,
    onRemoveItem,
    playingUrl,
    isPreviewLoading,
    theme
}) => {
    const isDark = theme === 'dark';

    const [searchTerm, setSearchTerm] = useState("");
    const [formatFilter, setFormatFilter] = useState("all");
    const [bpmMin, setBpmMin] = useState("");
    const [bpmMax, setBpmMax] = useState("");
    const [keyFilter, setKeyFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [tagSearch, setTagSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedItem = useMemo(() => {
        return history.find(item => item.id === selectedId) || null;
    }, [history, selectedId]);


    const filteredHistory = useMemo(() => {
        return [...history].reverse().filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.channel.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFormat = formatFilter === "all" || item.format === formatFilter;
            const matchesBpmMin = bpmMin === "" || (item.bpm && item.bpm >= parseInt(bpmMin));
            const matchesBpmMax = bpmMax === "" || (item.bpm && item.bpm <= parseInt(bpmMax));
            const matchesKey = keyFilter === "all" || item.key === keyFilter;
            const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
            const matchesTags = tagSearch === "" || (item.tags && item.tags.some(t => t.toLowerCase().includes(tagSearch.toLowerCase())));

            return matchesSearch && matchesFormat && matchesBpmMin && matchesBpmMax && matchesKey && matchesCategory && matchesTags;
        });
    }, [history, searchTerm, formatFilter, bpmMin, bpmMax, keyFilter, categoryFilter, tagSearch]);

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-wv-bg">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <div className="flex items-center gap-2 text-wv-gray mb-1">
                        <Folder size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Tus samples</span>
                    </div>
                </div>
                {history.length > 0 && (
                    <button
                        className="text-[10px] font-bold uppercase tracking-widest text-wv-gray hover:text-red-400 transition-colors"
                        onClick={onClearHistory}
                    >
                        Limpiar Librería
                    </button>
                )}
            </div>

            <div className={`border rounded-2xl p-6 mb-10 transition-all ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Search size={10} /> Buscar
                            </label>
                            <input
                                type="text"
                                className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                placeholder="Título o artista..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />

                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Filter size={10} /> Formato
                            </label>
                            <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                                <option value="all">Cualquiera</option>
                                <option value="mp3">MP3</option>
                                <option value="wav">WAV</option>
                                <option value="flac">FLAC</option>
                                <option value="aiff">AIFF</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Tag size={10} /> Etiquetas
                            </label>
                            <input type="text" placeholder="Género, modo..." className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={tagSearch} onChange={e => setTagSearch(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Folder size={10} /> Categoría
                            </label>
                            <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                <option value="all">Todas</option>
                                <option value="Loops">Loops</option>
                                <option value="One-shote">One-shots</option>
                                <option value="Vocals">Vocals</option>
                                <option value="Presets">Presets</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                            <Music size={10} /> BPM
                        </label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Min" className={`w-1/2 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={bpmMin} onChange={e => setBpmMin(e.target.value)} />
                            <input type="number" placeholder="Max" className={`w-1/2 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={bpmMax} onChange={e => setBpmMax(e.target.value)} />
                        </div>

                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Music size={10} /> Tonalidad
                            </label>
                            <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={keyFilter} onChange={e => setKeyFilter(e.target.value)}>
                                <option value="all">Cualquiera</option>
                                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].flatMap(k => [
                                    <option key={`${k}maj`} value={`${k} Major`}>{k} Major</option>,
                                    <option key={`${k}min`} value={`${k} Minor`}>{k} Minor</option>
                                ])}
                            </select>

                        </div>
                    </div>
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-20">
                    <Music size={50} strokeWidth={1.5} className="text-wv-text" />
                    <p className="mt-4 text-xs font-medium text-wv-text">No hay coincidencias en tu librería</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                    {filteredHistory.map((item, i) => {
                        const isPlaying = playingUrl && (playingUrl === item.path || playingUrl === `file://${item.path}`);
                        return (
                            <div
                                key={item.id + i}
                                className={`border rounded-2xl overflow-hidden transition-all group cursor-pointer shadow-sm hover:shadow-md ${isDark ? "bg-wv-sidebar border-white/5 hover:border-white/10" : "bg-white border-black/5 hover:border-black/10"}`}
                                onClick={() => setSelectedId(item.id)}
                                draggable
                                onDragStart={(e) => {
                                    e.preventDefault();
                                    window.api.startDrag(item.path, item.thumbnail);
                                }}
                            >

                                <div className="relative aspect-video overflow-hidden" onClick={(e) => { e.stopPropagation(); onTogglePreview(item.path); }}>
                                    <img src={item.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                                    <div className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${isPlaying ? 'opacity-100' : ''}`}>
                                        <div className="bg-white text-black p-3 rounded-full shadow-lg">
                                            {isPlaying && isPreviewLoading ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : isPlaying ? (
                                                <Pause size={18} fill="currentColor" />
                                            ) : (
                                                <Play size={18} className="ml-0.5" fill="currentColor" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <h4 className={`font-bold text-sm mb-0.5 truncate leading-tight transition-colors ${isDark ? "text-white" : "text-black"}`}>{item.title}</h4>
                                    <p className="text-wv-text opacity-40 text-[10px] font-medium mb-3 uppercase tracking-wider">{item.channel}</p>


                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {item.bpm && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 border border-white/5 text-wv-gray" : "bg-black/[0.03] border border-black/[0.05] text-black/60"}`}>{item.bpm} BPM</span>}
                                        {item.key && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>{item.key}</span>}
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 border border-white/5 text-wv-gray/60" : "bg-black/[0.03] border border-black/[0.05] text-black/40"}`}>{item.format.toUpperCase()}</span>
                                    </div>


                                    {isPlaying && (
                                        <div className="mt-2 mb-4 px-2">
                                            <Waveform
                                                url={item.path}
                                                height={24}
                                                theme={theme}
                                            />


                                        </div>
                                    )}

                                    <div className={`pt-3 border-t flex justify-between items-center mt-auto ${isDark ? "border-white/5" : "border-black/5"}`}>
                                        <div className="flex items-center gap-1.5 text-wv-gray text-[9px] font-bold uppercase tracking-widest">
                                            <Clock size={10} />
                                            {item.duration || "N/A"}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className={`p-1 px-1.5 rounded-md transition-colors ${isDark ? "hover:bg-white/5 text-wv-gray hover:text-white" : "hover:bg-black/5 text-black/10 hover:text-black"}`}
                                                onClick={(e) => { e.stopPropagation(); onOpenItem(item.path); }}
                                                title="Abrir Carpeta"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                            <button
                                                className={`p-1 px-1.5 rounded-md transition-colors ${isDark ? "hover:bg-red-500/10 text-wv-gray hover:text-red-400" : "hover:bg-red-500/10 text-black/10 hover:text-red-500"}`}
                                                onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                                title="Eliminar de la Librería"
                                            >
                                                <Trash2 size={14} />
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedItem && (
                <LibraryItemModal
                    item={selectedItem}
                    onClose={() => setSelectedId(null)}
                    onOpenItem={onOpenItem}
                    onUpdateItem={onUpdateItem}
                    theme={theme}
                />


            )}
        </div>
    );
};
