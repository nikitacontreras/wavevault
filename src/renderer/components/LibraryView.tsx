import React, { useState, useMemo } from "react";
import { HistoryItem } from "../types";
import { LibraryItemModal } from "./LibraryItemModal";
import { Search, Filter, Folder, Music, Play, Pause, ExternalLink, Tag, Clock, Loader2, Trash2, HardDrive, Plus, RefreshCw, CircleArrowLeft, Edit2, ArrowRight } from "lucide-react";

import { Waveform } from "./Waveform";
import { VirtualizedItem } from "./VirtualizedItem";
import { useTranslation } from "react-i18next";

interface LibraryViewProps {
    history: HistoryItem[];
    onClearHistory: () => void;
    onOpenItem: (path: string) => void;
    onTogglePreview: (url: string, metadata?: any) => void;
    onUpdateItem: (id: string, updates: Partial<HistoryItem>) => void;
    onRemoveItem: (id: string) => void;
    playingUrl: string | null;
    isPreviewLoading: boolean;
    theme: 'light' | 'dark';
    onStartDrag: () => void;
    audioMediaElement: HTMLAudioElement | null;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
    history,
    onClearHistory,
    onOpenItem,
    onTogglePreview,
    onUpdateItem,
    onRemoveItem,
    playingUrl,
    isPreviewLoading,
    theme,
    onStartDrag,
    audioMediaElement
}) => {
    const isDark = theme === 'dark';
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'downloads' | 'local'>('downloads');

    // -- HISTORY / WEB STATE --
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [formatFilter, setFormatFilter] = useState("all");
    const [bpmMin, setBpmMin] = useState("");
    const [bpmMax, setBpmMax] = useState("");
    const [keyFilter, setKeyFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [tagSearch, setTagSearch] = useState("");
    const [debouncedTagSearch, setDebouncedTagSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Debounce effects
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedTagSearch(tagSearch), 300);
        return () => clearTimeout(timer);
    }, [tagSearch]);

    // -- LOCAL STATE --
    const [localFolders, setLocalFolders] = useState<any[]>([]);
    const [folderFiles, setFolderFiles] = useState<any[]>([]);
    const [isLoadingLocal, setIsLoadingLocal] = useState(false);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [scanningFolders, setScanningFolders] = useState<Map<string, any>>(new Map());

    // New Categories State
    const [activeLocalView, setActiveLocalView] = useState<'folders' | 'categories'>('folders');
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    React.useEffect(() => {
        if (activeFolderId) {
            loadFolderFiles(activeFolderId);
        } else if (activeCategory) {
            loadCategoryFiles(activeCategory);
        } else {
            setFolderFiles([]);
        }
    }, [activeFolderId, activeCategory]);

    React.useEffect(() => {
        const removeListener = (window as any).api.on('local-library-progress', (data: any) => {
            setScanningFolders(prev => {
                const next = new Map(prev);
                if (data.status === 'completed') {
                    next.delete(data.folderId);
                    // Refresh if this folder was active or just finished
                    loadLocalFolders();
                    loadCategories(); // Refresh categories too
                    if (activeFolderId === data.folderId) loadFolderFiles(activeFolderId);
                } else {
                    next.set(data.folderId, data);
                }
                return next;
            });
        });
        return () => removeListener();
    }, [activeFolderId]);

    const loadLocalFolders = async () => {
        if (activeTab === 'local') {
            setIsLoadingLocal(true);
            try {
                const folders = await (window as any).api.getLocalFolders();
                setLocalFolders(folders);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingLocal(false);
            }
        }
    };

    const loadCategories = async () => {
        try {
            const cats = await (window as any).api.getLocalFilesGrouped();
            setCategories(cats);
        } catch (e) {
            console.error(e);
        }
    };

    const loadFolderFiles = async (id: string) => {
        setIsLoadingLocal(true);
        try {
            const files = await (window as any).api.getLocalFiles(id);
            setFolderFiles(files);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingLocal(false);
        }
    };

    const loadCategoryFiles = async (category: string) => {
        setIsLoadingLocal(true);
        try {
            const files = await (window as any).api.getLocalFilesByCategory(category);
            setFolderFiles(files);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingLocal(false);
        }
    };

    React.useEffect(() => {
        if (activeTab === 'local') {
            loadLocalFolders();
            loadCategories();
        }
    }, [activeTab]);

    const handleAddFolder = async () => {
        const path = await (window as any).api.pickDir();
        if (path) {
            setIsLoadingLocal(true);
            try {
                await (window as any).api.addLocalFolder(path);
                await loadLocalFolders();
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingLocal(false);
            }
        }
    };

    const handleRemoveFolder = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Remove this folder from library?")) {
            await (window as any).api.removeLocalFolder(id);
            loadLocalFolders();
        }
    };

    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        if (selectedId.startsWith('LOCAL:')) {
            const realId = selectedId.replace('LOCAL:', '');
            const localFile = folderFiles.find(f => f.id === realId);
            if (!localFile) return null;
            return {
                id: localFile.id,
                title: localFile.filename,
                channel: "Local Library",
                thumbnail: "", // TODO: generate or use icon
                path: localFile.path,
                date: "",
                format: localFile.filename.split('.').pop() || "wav",
                sampleRate: "44100",
                bpm: localFile.bpm,
                key: localFile.key,
                source: "Local",
                description: "",
                tags: localFile.tags ? JSON.parse(localFile.tags) : [],
                duration: new Date(localFile.duration * 1000).toISOString().substr(14, 5),
                category: localFile.type,
                instrument: localFile.instrument
            } as HistoryItem;
        }
        return history.find(item => item.id === selectedId) || null;
    }, [history, selectedId, folderFiles]);


    const filteredHistory = useMemo(() => {
        return [...history].reverse().filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                item.channel.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesFormat = formatFilter === "all" || item.format === formatFilter;
            const matchesBpmMin = bpmMin === "" || (item.bpm && item.bpm >= parseInt(bpmMin));
            const matchesBpmMax = bpmMax === "" || (item.bpm && item.bpm <= parseInt(bpmMax));
            const matchesKey = keyFilter === "all" || item.key === keyFilter;
            const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
            const matchesTags = debouncedTagSearch === "" || (item.tags && item.tags.some(t => t.toLowerCase().includes(debouncedTagSearch.toLowerCase())));

            return matchesSearch && matchesFormat && matchesBpmMin && matchesBpmMax && matchesKey && matchesCategory && matchesTags;
        });
    }, [history, debouncedSearch, formatFilter, bpmMin, bpmMax, keyFilter, categoryFilter, debouncedTagSearch]);

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-wv-bg">
            <div className="flex justify-between items-end mb-8">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab('downloads')}
                        className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'downloads' ? (isDark ? "text-white border-white" : "text-black border-black") : "text-wv-gray border-transparent hover:text-wv-text"}`}
                    >
                        {t('library.tabs.downloads')}
                    </button>
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'local' ? (isDark ? "text-white border-white" : "text-black border-black") : "text-wv-gray border-transparent hover:text-wv-text"}`}
                    >
                        {t('library.tabs.local')}
                    </button>
                </div>

                {activeTab === 'downloads' && history.length > 0 && (
                    <button
                        className="text-[10px] font-bold uppercase tracking-widest text-wv-gray hover:text-red-400 transition-colors"
                        onClick={onClearHistory}
                    >
                        {t('history.clearHistory')}
                    </button>
                )}
            </div>

            {activeTab === 'downloads' && (
                <>
                    <div className={`border rounded-2xl p-6 mb-10 transition-all ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                        <Search size={10} /> {t('filters.search')}
                                    </label>
                                    <input
                                        type="text"
                                        className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                                        placeholder={t('search.placeholder')}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />

                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                        <Filter size={10} /> {t('common.format')}
                                    </label>
                                    <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                                        <option value="all">{t('common.any')}</option>
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
                                        <Tag size={10} /> {t('filters.tags')}
                                    </label>
                                    <input type="text" placeholder="Género, modo..." className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={tagSearch} onChange={e => setTagSearch(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                        <Folder size={10} /> {t('filters.category')}
                                    </label>
                                    <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                                        <option value="all">{t('common.any')}</option>
                                        <option value="Loops">Loops</option>
                                        <option value="One-shote">One-shots</option>
                                        <option value="Vocals">Vocals</option>
                                        <option value="Presets">Presets</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Music size={10} /> {t('filters.bpm')}
                                </label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Min" className={`w-1/2 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={bpmMin} onChange={e => setBpmMin(e.target.value)} />
                                    <input type="number" placeholder="Max" className={`w-1/2 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={bpmMax} onChange={e => setBpmMax(e.target.value)} />
                                </div>

                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                        <Music size={10} /> {t('filters.key')}
                                    </label>
                                    <select className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all h-[34px] ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`} value={keyFilter} onChange={e => setKeyFilter(e.target.value)}>
                                        <option value="all">{t('common.any')}</option>
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
                            <p className="mt-4 text-xs font-medium text-wv-text">{t('filters.noMatches')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                            {filteredHistory.map((item, i) => {
                                const isPlaying = playingUrl && (playingUrl === item.path || playingUrl === `file://${item.path}`);
                                return (
                                    <VirtualizedItem key={item.id + i} id={item.id} minHeight={350}>
                                        <div
                                            className={`rounded-2xl overflow-hidden transition-all group cursor-pointer border h-full flex flex-col ${isDark
                                                ? "bg-[#0d0d0d] border-white/[0.05] hover:border-white/10 hover:shadow-2xl hover:shadow-black"
                                                : "bg-white border-black/[0.08] hover:border-black/20 shadow-sm hover:shadow-md"}`}
                                            onClick={() => setSelectedId(item.id)}
                                            draggable
                                            onDragStart={(e) => {
                                                e.preventDefault();
                                                onStartDrag();
                                                window.api.startDrag(item.path, item.thumbnail);
                                            }}
                                        >
                                            <div className="relative aspect-video overflow-hidden" onClick={(e) => { e.stopPropagation(); onTogglePreview(item.path, item); }}>
                                                <img src={item.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${isPlaying ? 'opacity-100' : ''}`}>
                                                    <div className="bg-white text-black p-3 rounded-full shadow-2xl transform transition-transform group-hover:scale-110">
                                                        {isPlaying && isPreviewLoading ? (
                                                            <Loader2 size={20} className="animate-spin" />
                                                        ) : isPlaying ? (
                                                            <Pause size={20} fill="currentColor" />
                                                        ) : (
                                                            <Play size={20} className="ml-0.5" fill="currentColor" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="mb-3">
                                                    <h4 className={`font-bold text-sm mb-1 truncate leading-tight tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                                                        {item.title}
                                                    </h4>
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${isDark ? "text-wv-gray" : "text-black/40"}`}>
                                                        {item.channel}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-4 mt-1">
                                                    {item.bpm && (
                                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${isDark ? "bg-white/5 border border-white/5 text-wv-gray" : "bg-black/[0.03] border border-black/[0.05] text-black/60"}`}>
                                                            {item.bpm} BPM
                                                        </span>
                                                    )}
                                                    {item.key && (
                                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-md shadow-sm ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                                                            {item.key}
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${isDark ? "bg-white/5 border border-white/5 text-wv-gray/60" : "bg-black/[0.03] border border-black/[0.05] text-black/40"}`}>
                                                        {item.format.toUpperCase()}
                                                    </span>
                                                </div>

                                                {isPlaying && (
                                                    <div className="mb-4 animate-in fade-in duration-500">
                                                        <Waveform
                                                            url={item.path}
                                                            height={24}
                                                            theme={theme}
                                                            peaks={item.waveform ? JSON.parse(item.waveform) : undefined}
                                                            onPeaksGenerated={(peaks) => {
                                                                (window as any).api.savePeaks('sample', item.id, peaks);
                                                                onUpdateItem(item.id, { waveform: JSON.stringify(peaks) });
                                                            }}
                                                            audioMediaElement={audioMediaElement}
                                                        />
                                                    </div>
                                                )}

                                                <div className={`mt-auto pt-4 border-t flex items-center justify-between ${isDark ? "border-white/[0.06]" : "border-black/[0.06]"}`}>
                                                    <div className="flex items-center gap-2 text-wv-gray text-[10px] font-bold uppercase tracking-widest">
                                                        <Clock size={12} className="opacity-50" />
                                                        {item.duration || "N/A"}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className={`p-2 rounded-lg transition-all ${isDark ? "hover:bg-white/5 text-wv-gray hover:text-white" : "hover:bg-black/5 text-black/20 hover:text-black"}`}
                                                            onClick={(e) => { e.stopPropagation(); onOpenItem(item.path); }}
                                                            title={t('common.openFolder')}
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                        <button
                                                            className={`p-2 rounded-lg transition-all ${isDark ? "hover:bg-red-500/10 text-wv-gray hover:text-red-400" : "hover:bg-red-500/10 text-black/20 hover:text-red-500"}`}
                                                            onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                                            title={t('common.remove')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </VirtualizedItem>
                                );
                            })}
                        </div>
                    )}
                </>
            )}


            {activeTab === 'local' && (
                <div className="min-h-[50vh]">
                    {(activeFolderId || activeCategory) ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => { setActiveFolderId(null); setActiveCategory(null); }}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                        <CircleArrowLeft size={16} /> Back
                                    </div>
                                </button>
                                <span className="text-xl font-bold">
                                    {activeCategory || localFolders.find(f => f.id === activeFolderId)?.name}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {folderFiles.map((file, i) => {
                                    const isPlaying = playingUrl === `file://${file.path}` || playingUrl === file.path;
                                    return (
                                        <div
                                            key={file.id}
                                            className={`group flex items-center justify-between p-3 rounded-lg border transition-all ${isDark ? "bg-wv-surface border-white/5 hover:bg-white/10" : "bg-white border-black/5 hover:bg-black/5"}`}
                                            onClick={() => onTogglePreview(file.path, {
                                                title: file.filename,
                                                artist: "Local Library",
                                                thumbnail: null // Local files don't have thumbnails yet
                                            })}
                                        >
                                            <div className="flex items-center gap-4">
                                                <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? "bg-white/10 group-hover:bg-white text-black" : "bg-black/10 group-hover:bg-black text-white"}`}>
                                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                                </button>
                                                <div>
                                                    <h4 className={`font-bold text-sm ${isDark ? "text-white" : "text-black"}`}>{file.filename}</h4>
                                                    <div className="flex gap-2 text-[10px] text-wv-gray uppercase font-bold tracking-wider">
                                                        <span>{file.type || "Unknown"}</span>
                                                        {file.instrument && <span>• {file.instrument}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {isPlaying && (
                                                    <div className="w-32 md:w-48 mr-4 hidden sm:block">
                                                        <Waveform
                                                            url={file.path}
                                                            height={20}
                                                            theme={theme}
                                                            peaks={file.waveform ? JSON.parse(file.waveform) : undefined}
                                                            onPeaksGenerated={(peaks) => {
                                                                (window as any).api.savePeaks('local', file.id, peaks);
                                                                setFolderFiles(prev => prev.map(f => f.id === file.id ? { ...f, waveform: JSON.stringify(peaks) } : f));
                                                            }}
                                                            audioMediaElement={audioMediaElement}
                                                        />
                                                    </div>
                                                )}
                                                {file.bpm > 0 && <span className={`text-[10px] px-2 py-1 rounded ${isDark ? "bg-white/5" : "bg-black/5"}`}>{file.bpm} BPM</span>}
                                                {file.key && <span className={`text-[10px] px-2 py-1 rounded ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>{file.key}</span>}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Hacky: construct a HistoryItem-like object for the modal
                                                        // We need a way to distinguish, maybe use ID prefix
                                                        setSelectedId(`LOCAL:${file.id}`);
                                                    }}
                                                    className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all ${isDark ? "hover:bg-white/20 text-white" : "hover:bg-black/10 text-black"}`}
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : localFolders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-20 h-20 bg-gray-500/10 rounded-3xl flex items-center justify-center mb-6 text-wv-gray">
                                <HardDrive size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('library.local.empty')}</h3>
                            <p className="text-sm text-wv-gray max-w-sm text-center mb-8">{t('library.local.subtitle')}</p>

                            <button
                                onClick={handleAddFolder}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition-transform hover:scale-105 active:scale-95 ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
                            >
                                {isLoadingLocal ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                {t('library.local.addFolder')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-wv-gray">
                                    {activeLocalView === 'folders'
                                        ? t('library.local.stats', { count: localFolders.reduce((acc, f) => acc + (f.fileCount || 0), 0) })
                                        : `${categories.length} CATEGORIES`
                                    }
                                </h3>

                                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveLocalView('folders')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeLocalView === 'folders' ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : 'text-wv-gray'}`}
                                    >
                                        FOLDERS
                                    </button>
                                    <button
                                        onClick={() => setActiveLocalView('categories')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeLocalView === 'categories' ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : 'text-wv-gray'}`}
                                    >
                                        CATEGORIES
                                    </button>
                                </div>

                                <button
                                    onClick={handleAddFolder}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {activeLocalView === 'folders' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {localFolders.map(folder => {
                                        const scanData = scanningFolders.get(folder.id);
                                        const isScanning = !!scanData;
                                        const progress = isScanning && scanData.stats && scanData.stats.total > 0
                                            ? (scanData.stats.processed / scanData.stats.total) * 100
                                            : 0;

                                        return (
                                            <div
                                                key={folder.id}
                                                onClick={() => !isScanning && setActiveFolderId(folder.id)}
                                                className={`p-4 rounded-xl border transition-all group relative ${isScanning ? "opacity-80 cursor-wait" : "cursor-pointer"} ${isDark ? "bg-wv-sidebar border-white/5 hover:border-white/20" : "bg-white border-black/5 hover:border-black/20"}`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className={`p-2.5 rounded-lg ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                                        {isScanning ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Folder size={20} className={isDark ? "text-white" : "text-black"} />}
                                                    </div>
                                                    <button
                                                        onClick={(e) => handleRemoveFolder(folder.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded transition-all text-wv-gray"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <h4 className={`font-bold text-sm mb-1 truncate ${isDark ? "text-white" : "text-black"}`}>{folder.name}</h4>

                                                {isScanning ? (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="w-full h-1 bg-gray-700/20 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] font-bold uppercase text-wv-gray">
                                                            <span>{scanData.stats?.currentFile || 'Scanning...'}</span>
                                                            <span>{Math.round(progress)}%</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <p className="text-[10px] text-wv-gray font-mono truncate opacity-60">{folder.path}</p>
                                                        <span className="text-[10px] font-bold text-wv-accent mt-1">{folder.fileCount || 0} files</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5">
                                    {categories.map(cat => (
                                        <div
                                            key={cat.category}
                                            onClick={() => setActiveCategory(cat.category)}
                                            className={`p-3 rounded-2xl border transition-all cursor-pointer group ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-black/5 shadow-sm hover:border-black/10"}`}
                                        >
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/10 text-blue-600"}`}>
                                                    <Music size={14} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className={`text-[10px] font-black truncate uppercase tracking-tight leading-none mb-1 ${isDark ? "text-white" : "text-black"}`}>{cat.category}</h3>
                                                    <p className="text-[7px] text-wv-gray font-black uppercase opacity-60">{cat.count} SAMPLES</p>
                                                </div>
                                            </div>

                                            <button
                                                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isDark ? "bg-white/5 text-wv-gray group-hover:bg-blue-500 group-hover:text-white" : "bg-black/5 text-black group-hover:bg-blue-600 group-hover:text-white"}`}
                                            >
                                                OPEN <ArrowRight size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
