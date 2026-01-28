import React from "react";
import { ItemState } from "../types";
import { Download, X, CheckCircle, AlertCircle, Loader2, Waves } from "lucide-react";

interface ActiveDownload {
    id: string;
    title: string;
    state: ItemState;
    url: string;
}

interface ActiveStemTask {
    filePath: string;
    title: string;
    status: 'loading' | 'success' | 'error' | 'idle';
    progress: number;
    msg: string;
}

import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";

export const ActivityPanel: React.FC = () => {
    const { activeDownloads, activeStems, removeActiveDownload, removeStemsTask } = useLibrary();
    const { config } = useSettings();
    const onClearDownload = removeActiveDownload;
    const onClearStem = removeStemsTask;
    const theme = config.theme;
    const isDark = theme === 'dark';
    const total = activeDownloads.length + activeStems.length;
    if (total === 0) return null;

    return (
        <div className={`fixed bottom-24 right-8 w-80 border rounded-2xl shadow-2xl overflow-hidden z-[90] animate-in slide-in-from-bottom-2 transition-all ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-white/[0.08]" : "border-black/[0.08]"}`}>
                <div className="flex items-center gap-2">
                    <ActivityIcon size={16} className="text-wv-gray" />
                    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-black"}`}>
                        Actividad ({total})
                    </h3>
                </div>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {/* STEMS SECTION */}
                {activeStems.length > 0 && (
                    <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest text-wv-gray border-b ${isDark ? "bg-white/5 border-white/[0.03]" : "bg-black/5 border-black/[0.03]"}`}>
                        Separación AI
                    </div>
                )}
                {activeStems.map((stem) => (
                    <div key={stem.filePath} className={`flex flex-col gap-1 p-4 border-b last:border-0 ${isDark ? "border-white/[0.03]" : "border-black/[0.03]"}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-black"}`}>
                                    {stem.title}
                                </h4>
                            </div>
                            {stem.status !== 'loading' && (
                                <button
                                    type="button"
                                    onClick={() => onClearStem(stem.filePath)}
                                    className={`p-1 rounded-md text-wv-gray hover:text-white transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex items-center justify-between text-[10px] font-medium">
                                <span className={stem.status === 'error' ? 'text-red-500' : 'text-wv-gray'}>
                                    {stem.msg}
                                </span>
                                {stem.status === 'loading' && (
                                    <span className="text-blue-500 font-bold">{stem.progress}%</span>
                                )}
                            </div>
                            {stem.status === 'loading' && (
                                <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${stem.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* DOWNLOADS SECTION */}
                {activeDownloads.length > 0 && (
                    <div className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest text-wv-gray border-b ${isDark ? "bg-white/5 border-white/[0.03]" : "bg-black/5 border-black/[0.03]"}`}>
                        Descargas
                    </div>
                )}
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
                                            Completado
                                        </span>
                                    </>
                                )}
                                {download.state.status === 'error' && (
                                    <>
                                        <AlertCircle size={12} className="text-red-500" />
                                        <span className="text-[10px] text-red-500 font-medium truncate">
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

const ActivityIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);