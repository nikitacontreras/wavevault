import React from "react";
import { ItemState } from "../types";
import { Download, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ActiveDownload {
    id: string;
    title: string;
    state: ItemState;
    url: string;
}

interface ActiveDownloadsProps {
    activeDownloads: ActiveDownload[];
    onClearDownload: (id: string) => void;
}

export const ActiveDownloads: React.FC<ActiveDownloadsProps> = ({ 
    activeDownloads, 
    onClearDownload 
}) => {
    if (activeDownloads.length === 0) return null;

    return (
        <div className="fixed bottom-24 right-8 w-80 bg-wv-sidebar border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[90] animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Download size={16} className="text-wv-gray" />
                    <h3 className="text-sm font-bold text-white">
                        Descargas Activas ({activeDownloads.length})
                    </h3>
                </div>
                <div className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">
                    Recientes
                </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {activeDownloads.map((download) => (
                    <div key={download.id} className="flex items-center gap-3 p-4 border-b border-white/[0.03] last:border-0">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-white truncate mb-1">
                                {download.title}
                            </h4>
                            <div className="flex items-center gap-2">
                                {download.state.status === 'loading' && (
                                    <>
                                        <Loader2 size={12} className="animate-spin text-wv-gray" />
                                        <span className="text-[10px] text-wv-gray font-medium">
                                            {download.state.msg || "Descargando..."}
                                        </span>
                                    </>
                                )}
                                {download.state.status === 'success' && (
                                    <>
                                        <CheckCircle size={12} className="text-green-400" />
                                        <span className="text-[10px] text-green-400 font-medium">
                                            {download.state.msg || "Completado"}
                                        </span>
                                    </>
                                )}
                                {download.state.status === 'error' && (
                                    <>
                                        <AlertCircle size={12} className="text-red-400" />
                                        <span className="text-[10px] text-red-400 font-medium">
                                            {download.state.msg || "Error"}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {download.state.status !== 'loading' && (
                            <button
                                type="button"
                                onClick={() => onClearDownload(download.id)}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-wv-gray hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};