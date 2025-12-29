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
}



export const HistoryView: React.FC<HistoryViewProps> = ({
    history,
    onClearHistory,
    onOpenItem,
    onTogglePreview,
    onUpdateItem,
    onRemoveItem,
    playingUrl,
    isPreviewLoading
}) => {


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
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
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

            <div className="bg-wv-sidebar border border-white/5 rounded-2xl p-6 mb-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Search size={10} /> Buscar
                            </label>
                            <input
                                type="text"
                                className="bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10"
                                placeholder="Título o artista..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Tag size={10} /> Etiquetas
                            </label>
                            <input
                                type="text"
                                className="bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10"
                                placeholder="Filtrar por tag..."
                                value={tagSearch}
                                onChange={e => setTagSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                            <Filter size={10} /> Formato
                        </label>
                        <select className="bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10 h-[34px]" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                            <option value="all">Todos</option>
                            <option value="mp3">MP3</option>
                            <option value="wav">WAV</option>
                            <option value="flac">FLAC</option>
                            <option value="m4a">M4A</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                            <Music size={10} /> BPM
                        </label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Min" className="w-1/2 bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10" value={bpmMin} onChange={e => setBpmMin(e.target.value)} />
                            <input type="number" placeholder="Max" className="w-1/2 bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10" value={bpmMax} onChange={e => setBpmMax(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                <Music size={10} /> Tonalidad
                            </label>
                            <select className="bg-wv-bg border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/10 h-[34px]" value={keyFilter} onChange={e => setKeyFilter(e.target.value)}>
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
                    <Music size={50} strokeWidth={1.5} />
                    <p className="mt-4 text-xs font-medium">No hay coincidencias en tu librería</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                    {filteredHistory.map((item, i) => {
                        const isPlaying = playingUrl && (playingUrl === item.path || playingUrl === `file://${item.path}`);
                        return (
                            <div
                                key={item.id + i}
                                className="bg-wv-sidebar border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group cursor-pointer"
                                onClick={() => setSelectedId(item.id)}

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
                                    <h4 className="font-bold text-sm mb-0.5 truncate leading-tight transition-colors group-hover:text-white">{item.title}</h4>
                                    <p className="text-wv-gray text-[10px] font-medium mb-3 uppercase tracking-wider">{item.channel}</p>

                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {item.bpm && <span className="text-[9px] font-bold bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/60">{item.bpm} BPM</span>}
                                        {item.key && <span className="text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded shadow-sm">{item.key}</span>}
                                        <span className="text-[9px] font-bold bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-white/40">{item.format.toUpperCase()}</span>
                                    </div>

                                    {isPlaying && (
                                        <div className="mt-2 mb-4 px-2">
                                            <Waveform
                                                url={item.path}
                                                height={24}
                                                waveColor="rgba(255,255,255,0.2)"
                                                progressColor="#ffffff"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-white/5 flex justify-between items-center mt-auto">
                                        <div className="flex items-center gap-1.5 text-wv-gray text-[9px] font-bold uppercase tracking-widest">
                                            <Clock size={10} />
                                            {item.duration || "N/A"}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="p-1 px-1.5 hover:bg-white/10 rounded-md text-white/20 hover:text-white transition-colors"
                                                onClick={(e) => { e.stopPropagation(); onOpenItem(item.path); }}
                                                title="Abrir Carpeta"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                            <button
                                                className="p-1 px-1.5 hover:bg-red-500/10 rounded-md text-white/20 hover:text-red-400 transition-colors"
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
                />

            )}
        </div>
    );
};
