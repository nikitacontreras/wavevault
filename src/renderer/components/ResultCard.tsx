import React from "react";
import { SearchResult, ItemState } from "../types";
import { Play, Pause, Download, FolderOpen, Loader2 } from "lucide-react";

interface ResultCardProps {
    result: SearchResult;
    state: ItemState;
    inHistory: boolean;
    onDownload: (result: SearchResult) => void;
    onOpenItem: (path?: string) => void;
    onTogglePreview: (url: string) => void;
    isPlaying: boolean;
    isPreviewLoading: boolean;
    theme: 'light' | 'dark';
}


export const ResultCard: React.FC<ResultCardProps> = ({
    result,
    state,
    inHistory,
    onDownload,
    onOpenItem,
    onTogglePreview,
    isPlaying,
    isPreviewLoading,
    theme
}) => {
    const isDark = theme === 'dark';
    const isDownloading = state.status === 'loading';
    const isSuccess = state.status === 'success' || inHistory;

    return (
        <div className={`rounded-2xl overflow-hidden transition-all group border ${isDark
            ? "bg-wv-surface border-white/[0.05] hover:border-white/10"
            : "bg-white border-black/[0.08] hover:border-black/20 shadow-sm hover:shadow-md"}`}>
            <button
                type="button"
                className="relative aspect-video overflow-hidden w-full p-0 border-0 bg-transparent cursor-pointer"
                onClick={() => onTogglePreview(result.url)}
            >
                <img src={result.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
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
            </button>

            <div className="p-4">
                <div className={`text-[9px] font-bold text-wv-gray mb-2 uppercase tracking-widest border w-fit px-1.5 py-0.5 rounded ${isDark ? "border-white/[0.08]" : "border-black/[0.08]"}`}>
                    {result.duration || "Video"}
                </div>
                <h4 className={`font-bold text-sm mb-0.5 truncate leading-tight transition-colors ${isDark ? "text-white" : "text-black"}`}>{result.title}</h4>
                <p className="text-wv-gray text-[10px] font-medium mb-4 uppercase tracking-wider">{result.channel}</p>

                <div className={`pt-4 border-t ${isDark ? "border-white/[0.08]" : "border-black/[0.08]"}`}>
                    {isSuccess ? (
                        <button
                            type="button"
                            className={`w-full py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-colors ${isDark
                                ? "bg-white/5 hover:bg-white/10 text-white"
                                : "bg-black/5 hover:bg-black/10 text-black"}`}
                            onClick={() => state.path && onOpenItem(state.path)}
                        >
                            <FolderOpen size={14} /> Ver archivo
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={`w-full py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm ${isDark
                                ? "bg-white text-black hover:bg-white/90"
                                : "bg-black text-white hover:bg-black/90"}`}
                            onClick={() => onDownload(result)}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <><Loader2 className="animate-spin" size={14} /> Descargando</>
                            ) : (
                                <><Download size={14} /> Descargar</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};