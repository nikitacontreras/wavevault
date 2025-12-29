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
    theme: 'light' | 'dark';
}

export const ActiveDownloads: React.FC<ActiveDownloadsProps> = ({
    activeDownloads,
    onClearDownload,
    theme
}) => {
    const isDark = theme === 'dark';
    if (activeDownloads.length === 0) return null;

    return (
        <div className={`fixed bottom-24 right-8 w-80 border rounded-2xl shadow-2xl overflow-hidden z-[90] animate-in slide-in-from-bottom-2 transition-all ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-white/[0.08]" : "border-black/[0.08]"}`}>
                <div className="flex items-center gap-2">
                    <Download size={16} className="text-wv-gray" />
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-black"}`}>
                        Descargas Activas ({activeDownloads.length})
                    </h3>
                </div>
                <div className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">
                    Recientes
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {activeDownloads.map((download) => (
                    <div key={download.id} className={`flex items-center gap-3 p-4 border-b last:border-0 ${isDark ? "border-white/[0.03]" : "border-black/[0.03]"}`}>
                        <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-medium truncate mb-1 ${isDark ? "text-white" : "text-black"}`}>
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
                                        <CheckCircle size={12} className="text-green-500" />
                                        <span className="text-[10px] text-green-500 font-medium">
                                            {download.state.msg || "Completado"}
                                        </span>
                                    </>
                                )}
                                {download.state.status === 'error' && (
                                    <>
                                        <AlertCircle size={12} className="text-red-500" />
                                        <span className="text-[10px] text-red-500 font-medium">
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
                                className={`p-1.5 rounded-lg text-wv-gray transition-colors ${isDark ? "hover:bg-white/5 hover:text-white" : "hover:bg-black/5 hover:text-black"}`}
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