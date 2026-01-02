import React, { useState, useEffect } from "react";
import { X, Loader2, Download, List, CheckCircle, Circle, AlertCircle } from "lucide-react";

interface PlaylistEntry {
    id: string;
    title: string;
    url: string;
    duration?: number;
    uploader?: string;
}

interface PlaylistModalProps {
    url: string;
    onClose: () => void;
    onDownloadBatch: (entries: PlaylistEntry[]) => void;
    theme: 'light' | 'dark';
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
    url,
    onClose,
    onDownloadBatch,
    theme
}) => {
    const isDark = theme === 'dark';
    const [isLoading, setIsLoading] = useState(true);
    const [playlistInfo, setPlaylistInfo] = useState<{ title: string, entries: PlaylistEntry[] } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const data = await (window as any).api.getPlaylistMeta(url);
                setPlaylistInfo(data);
                setSelectedIds(new Set(data.entries.map((e: any) => e.id)));
                setIsLoading(false);
            } catch (e: any) {
                setError(e.message || "Failed to load playlist");
                setIsLoading(false);
            }
        };
        fetchMeta();
    }, [url]);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === playlistInfo?.entries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(playlistInfo?.entries.map(e => e.id)));
        }
    };

    const handleDownload = () => {
        if (!playlistInfo) return;
        const toDownload = playlistInfo.entries.filter(e => selectedIds.has(e.id));
        onDownloadBatch(toDownload);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <div className={`
                relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl
                ${isDark ? "bg-wv-sidebar border border-white/5" : "bg-white"}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                            <List size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">
                                {isLoading ? "Loading Playlist..." : playlistInfo?.title}
                            </h3>
                            {!isLoading && (
                                <p className="text-[10px] text-wv-gray font-bold uppercase tracking-widest">
                                    {playlistInfo?.entries.length} Tracks Detected
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-wv-gray" size={40} />
                            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-wv-gray">Parsing Playlist...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-500">
                            <AlertCircle size={40} />
                            <p className="mt-4 text-sm font-bold">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {playlistInfo?.entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => toggleSelect(entry.id)}
                                    className={`
                                        flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all
                                        ${selectedIds.has(entry.id)
                                            ? (isDark ? "bg-white/10" : "bg-black/5")
                                            : "hover:bg-white/5"}
                                    `}
                                >
                                    <div className={selectedIds.has(entry.id) ? "text-blue-500" : "text-wv-gray"}>
                                        {selectedIds.has(entry.id) ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs truncate">{entry.title}</p>
                                        <p className="text-[10px] text-wv-gray uppercase tracking-wider">{entry.uploader}</p>
                                    </div>
                                    <div className="text-[10px] font-mono text-wv-gray">
                                        {entry.duration ? new Date(entry.duration * 1000).toISOString().substr(14, 5) : "--:--"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isLoading && !error && (
                    <div className="p-6 border-t border-white/5 flex items-center justify-between">
                        <button
                            onClick={toggleAll}
                            className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
                        >
                            {selectedIds.size === playlistInfo?.entries.length ? "Deselect All" : "Select All"}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={selectedIds.size === 0}
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all
                                ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90"}
                                disabled:opacity-50
                            `}
                        >
                            <Download size={16} />
                            Download {selectedIds.size} Tracks
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
