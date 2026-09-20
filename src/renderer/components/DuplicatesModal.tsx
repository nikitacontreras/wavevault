import React, { useState, useEffect } from "react";
import { X, Trash2, Play, Pause, AlertTriangle, Check, RefreshCw, Layers, HardDrive, FileAudio, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../context/PlaybackContext";

interface DuplicateFile {
    id: string;
    folderId: string;
    folderName?: string;
    path: string;
    filename: string;
    type?: string;
    instrument?: string;
    key?: string;
    bpm?: number;
    duration?: number;
    size?: number;
    hash?: string;
}

interface DuplicateGroup {
    hash: string;
    count: number;
    totalSize: number;
    files: DuplicateFile[];
}

interface DuplicatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ isOpen, onClose, isDark }) => {
    const { t } = useTranslation();
    const { playingUrl, isPlaying, handleTogglePreview } = usePlayback();
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
    const [deleteFromDisk, setDeleteFromDisk] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadDuplicates = async () => {
        setIsLoading(true);
        try {
            const res = await window.api.getDuplicates();
            if (res && res.success && res.data) {
                setGroups(res.data);
                // Preselect duplicates (keep first of each group, select the rest)
                const preselected = new Set<string>();
                res.data.forEach((grp: DuplicateGroup) => {
                    grp.files.slice(1).forEach((file: DuplicateFile) => {
                        preselected.add(file.id);
                    });
                });
                setSelectedToDelete(preselected);
            }
        } catch (err) {
            console.error("Failed to load duplicates:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadDuplicates();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleSelection = (id: string) => {
        const next = new Set(selectedToDelete);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedToDelete(next);
    };

    const handleDeleteSelected = async () => {
        if (selectedToDelete.size === 0) return;
        const confirmMsg = deleteFromDisk
            ? `¿Eliminar ${selectedToDelete.size} archivo(s) permanentemente del disco y de la base de datos?`
            : `¿Eliminar ${selectedToDelete.size} archivo(s) de la biblioteca?`;
        if (!confirm(confirmMsg)) return;

        setIsDeleting(true);
        try {
            // Find files to delete
            for (const grp of groups) {
                for (const file of grp.files) {
                    if (selectedToDelete.has(file.id)) {
                        await window.api.deleteDuplicateFile(file.id, file.path, deleteFromDisk);
                    }
                }
            }
            await loadDuplicates();
        } catch (err) {
            console.error("Error deleting duplicates:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const totalDuplicatesCount = groups.reduce((acc, g) => acc + (g.count - 1), 0);
    const totalWastedBytes = groups.reduce((acc, g) => {
        const singleSize = g.files[0]?.size || 0;
        return acc + singleSize * (g.count - 1);
    }, 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
            <div className={`max-w-4xl w-full max-h-[88vh] p-8 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}`}>
                
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{t('settings.duplicateScanner') || "Buscador de Duplicados"}</h2>
                            <p className="text-xs text-wv-text-muted">
                                {groups.length === 0
                                    ? "Escaneo de archivos idénticos en la biblioteca"
                                    : `${groups.length} grupos de duplicados encontrados (${totalDuplicatesCount} repetidos • ${formatBytes(totalWastedBytes)} liberables)`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadDuplicates}
                            disabled={isLoading}
                            className={`p-2.5 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-black/5 border-black/5 hover:bg-black/10"}`}
                            title="Volver a escanear"
                        >
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2.5 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-black/5 border-black/5 hover:bg-black/10"}`}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 custom-scrollbar min-h-0">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3 opacity-60">
                            <RefreshCw size={32} className="animate-spin text-blue-500" />
                            <p className="text-xs font-bold uppercase tracking-widest">Escaneando hashes de biblioteca...</p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                            <Check size={40} className="text-emerald-500 p-2 bg-emerald-500/10 rounded-2xl" />
                            <h3 className="text-base font-bold">¡Biblioteca impecable!</h3>
                            <p className="text-xs text-wv-text-muted max-w-sm">No se detectaron archivos duplicados en las carpetas indexadas actualmente.</p>
                        </div>
                    ) : (
                        groups.map((group, groupIdx) => (
                            <div
                                key={group.hash}
                                className={`p-5 rounded-2xl border transition-all ${isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"}`}
                            >
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-500">
                                            Grupo #{groupIdx + 1}
                                        </span>
                                        <span className="text-xs font-bold truncate">
                                            {group.files[0]?.filename}
                                        </span>
                                        <span className="text-[10px] text-wv-text-muted font-mono">
                                            ({formatBytes(group.files[0]?.size)})
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                        {group.count} copias idénticas
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {group.files.map((file, idx) => {
                                        const isSelected = selectedToDelete.has(file.id);
                                        const isOriginal = idx === 0;
                                        const isFilePlaying = playingUrl === file.path && isPlaying;

                                        return (
                                            <div
                                                key={file.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected
                                                    ? (isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200")
                                                    : (isDark ? "bg-black/20 border-white/5" : "bg-white border-black/5")
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    {/* Checkbox */}
                                                    <button
                                                        onClick={() => toggleSelection(file.id)}
                                                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${isSelected
                                                            ? "bg-red-500 border-red-500 text-white"
                                                            : (isDark ? "border-white/20 hover:border-white/40" : "border-black/20 hover:border-black/40")
                                                            }`}
                                                    >
                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                    </button>

                                                    {/* Play Preview */}
                                                    <button
                                                        onClick={() => handleTogglePreview(file.path)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isFilePlaying ? "bg-blue-600 text-white" : (isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10")}`}
                                                    >
                                                        {isFilePlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                                                    </button>

                                                    {/* Info */}
                                                    <div className="min-w-0 flex-1 pr-2">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-bold truncate">{file.filename}</span>
                                                            {isOriginal && (
                                                                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 rounded">
                                                                    Original
                                                                </span>
                                                            )}
                                                            {file.bpm && (
                                                                <span className="text-[9px] text-wv-text-muted font-bold">{file.bpm} BPM</span>
                                                            )}
                                                            {file.key && (
                                                                <span className="text-[9px] text-wv-text-muted font-bold">{file.key}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-wv-text-muted truncate font-mono opacity-60" title={file.path}>
                                                            {file.path}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => (window as any).api.showInFolder(file.path)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-wv-text-muted hover:text-white" : "bg-black/5 hover:bg-black/10 text-black/60"}`}
                                                >
                                                    Ver en Carpeta
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Controls */}
                {groups.length > 0 && (
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-wv-text-muted select-none">
                            <input
                                type="checkbox"
                                checked={deleteFromDisk}
                                onChange={(e) => setDeleteFromDisk(e.target.checked)}
                                className="rounded"
                            />
                            <span>Eliminar también del disco físico</span>
                        </label>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"}`}
                            >
                                {t('common.cancel') || "Cancelar"}
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedToDelete.size === 0 || isDeleting}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${selectedToDelete.size > 0
                                    ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20"
                                    : "bg-red-600/30 text-white/40 cursor-not-allowed"
                                    }`}
                            >
                                <Trash2 size={14} />
                                {isDeleting ? "Eliminando..." : `Eliminar ${selectedToDelete.size} Duplicado(s)`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
