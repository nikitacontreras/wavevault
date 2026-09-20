import React from "react";
import { Archive, ListMusic, Activity, Layout, FolderSearch, Trash2, Plus, Edit2, Cpu, MoreVertical } from "lucide-react";
import { ProjectAlbum } from "./types";
import { useTranslation } from "react-i18next";

interface ProjectsSidebarProps {
    isDark: boolean;
    viewMode: 'projects' | 'todos';
    setViewMode: (mode: 'projects' | 'todos') => void;
    unorganizedCount: number;
    selectedWorkspaceId: string | null;
    setSelectedWorkspaceId: (id: string | null) => void;
    workspaces: any[];
    onScanWorkspaces: () => void;
    onRemoveWorkspace: (id: string) => void;
    onAddWorkspace: () => void;
    albums: ProjectAlbum[];
    selectedAlbumId: string | null;
    setSelectedAlbumId: (id: string | null) => void;
    onCreateAlbum: () => void;
    onEditAlbum: (album: ProjectAlbum) => void;
    onDeleteAlbum: (id: string, name: string) => void;
    onOpenDAWSettings: () => void;
    activeAlbumMenu: string | null;
    setActiveAlbumMenu: (id: string | null) => void;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
    isDark,
    viewMode,
    setViewMode,
    unorganizedCount,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaces,
    onScanWorkspaces,
    onRemoveWorkspace,
    onAddWorkspace,
    albums,
    selectedAlbumId,
    setSelectedAlbumId,
    onCreateAlbum,
    onEditAlbum,
    onDeleteAlbum,
    onOpenDAWSettings,
    activeAlbumMenu,
    setActiveAlbumMenu
}) => {
    const { t } = useTranslation();

    return (
        <div className={`w-56 flex flex-col border-r shrink-0 ${isDark ? "bg-wv-sidebar/40 border-white/5" : "bg-black/[0.02] border-black/5"}`}>
            <div className="p-4 flex flex-col min-h-0 h-full">
                <div className="space-y-0.5 mb-6">
                    <button
                        onClick={() => setViewMode('projects')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'projects' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                    >
                        <Archive size={14} strokeWidth={2.5} />
                        {t('projects.myProjects')}
                    </button>
                    <button
                        onClick={() => setViewMode('todos')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'todos' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                    >
                        <div className="flex items-center gap-2.5">
                            <ListMusic size={14} strokeWidth={2.5} />
                            {t('projects.rawFiles')}
                        </div>
                        {unorganizedCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${viewMode === 'todos' ? (isDark ? "bg-black text-white" : "bg-white text-black") : "bg-blue-600 text-white"}`}>
                                {unorganizedCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center justify-between mb-2 px-2">
                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-wv-gray/40">{t('projects.workspaces')}</h2>
                    <button onClick={onScanWorkspaces} title={t('projects.sync')} className={`p-1 rounded-md transition-all ${isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"}`}>
                        <Activity size={12} />
                    </button>
                </div>

                <div className="space-y-0.5 mb-6 max-h-40 overflow-y-auto projects-scroll pr-1">
                    <button
                        onClick={() => { setSelectedWorkspaceId(null); setViewMode('todos'); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedWorkspaceId === null && viewMode === 'todos' ? (isDark ? "bg-white/5 text-white" : "bg-black/5 text-black") : "text-wv-gray hover:text-white"}`}
                    >
                        <Layout size={12} className="shrink-0 opacity-40" />
                        <span className="truncate flex-1 text-left">{t('projects.allFiles')}</span>
                    </button>
                    {workspaces.map(ws => (
                        <div key={ws.id} className="group/ws relative">
                            <button
                                onClick={() => { setSelectedWorkspaceId(ws.id); setViewMode('todos'); }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedWorkspaceId === ws.id && viewMode === 'todos' ? (isDark ? "bg-white/5 text-white" : "bg-black/5 text-black") : "text-wv-gray hover:text-white"}`}
                            >
                                <FolderSearch size={12} className="shrink-0 opacity-40" />
                                <span className="truncate flex-1 text-left" title={ws.path}>{ws.name}</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveWorkspace(ws.id); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/ws:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={10} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-3 px-2">
                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-wv-gray/40">{t('projects.collections')}</h2>
                    <button onClick={onCreateAlbum} className={`p-1 rounded-md transition-all ${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-black/40 hover:text-black hover:bg-black/10"}`}>
                        <Plus size={14} />
                    </button>
                </div>

                <div className="flex-1 space-y-0.5 overflow-y-auto pr-1 projects-scroll">
                    {albums.map((album) => (
                        <div key={album.id} className="relative group/item">
                            <button
                                onClick={() => { setSelectedAlbumId(album.id); setViewMode('projects'); }}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${selectedAlbumId === album.id && viewMode === 'projects'
                                        ? (isDark ? "bg-white/5 text-white" : "bg-black/5 text-black")
                                        : "text-wv-gray hover:text-wv-gray/80"
                                    }
                                `}
                            >
                                <div className={`w-1 h-1 rounded-full ${selectedAlbumId === album.id && viewMode === 'projects' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-wv-gray/20"}`} />
                                <span className="truncate flex-1 text-left">{album.name}</span>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); setActiveAlbumMenu(activeAlbumMenu === album.id ? null : album.id); }}
                                className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/item:opacity-100 transition-all ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"} ${activeAlbumMenu === album.id ? "opacity-100" : ""}`}
                            >
                                <MoreVertical size={12} />
                            </button>

                            {activeAlbumMenu === album.id && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveAlbumMenu(null)} />
                                    <div className={`absolute right-0 top-full mt-1 w-32 rounded-xl shadow-2xl border z-20 py-1.5 ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                                        <button onClick={() => onEditAlbum(album)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white flex items-center gap-2">
                                            <Edit2 size={10} /> {t('common.edit')}
                                        </button>
                                        <button onClick={() => onDeleteAlbum(album.id, album.name)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                            <Trash2 size={10} /> {t('common.delete')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <button
                        onClick={onOpenDAWSettings}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isDark ? "bg-white/5 text-wv-gray hover:text-white" : "bg-black/5 text-black"}`}
                    >
                        <Cpu size={12} />
                        {t('projects.configDaws')}
                    </button>
                    <button
                        onClick={onAddWorkspace}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-dashed transition-all ${isDark ? "border-white/10 text-wv-gray hover:border-white/25 hover:text-white" : "border-black/10 text-black/40 hover:text-black"}`}
                    >
                        <Plus size={12} />
                        {t('projects.addWorkspace')}
                    </button>
                </div>
            </div>
        </div>
    );
};
