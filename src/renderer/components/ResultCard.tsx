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
}


export const ResultCard: React.FC<ResultCardProps> = ({
    result,
    state,
    inHistory,
    onDownload,
    onOpenItem,
    onTogglePreview,
    isPlaying,
    isPreviewLoading
}) => {

    const isDownloading = state.status === 'loading';
    const isSuccess = state.status === 'success' || inHistory;

    return (
        <div className="bg-wv-sidebar border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10 group">
            <div className="relative aspect-video overflow-hidden cursor-pointer" onClick={() => onTogglePreview(result.url)}>
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

            </div>

            <div className="p-4">
                <div className="text-[9px] font-bold text-wv-gray mb-2 uppercase tracking-widest border border-white/5 w-fit px-1.5 py-0.5 rounded">
                    {result.duration || "Video"}
                </div>
                <h4 className="font-bold text-sm mb-0.5 truncate leading-tight group-hover:text-white transition-colors">{result.title}</h4>
                <p className="text-wv-gray text-[10px] font-medium mb-4 uppercase tracking-wider">{result.channel}</p>

                <div className="pt-4 border-t border-white/5">
                    {isSuccess ? (
                        <button
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-colors"
                            onClick={() => onOpenItem(state.path)}
                        >
                            <FolderOpen size={14} /> Ver archivo
                        </button>
                    ) : (
                        <button
                            className="w-full py-2 bg-white text-black hover:bg-gray-200 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
