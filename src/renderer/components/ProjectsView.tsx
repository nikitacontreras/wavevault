import React, { useState, useEffect } from "react";
import { FolderOpen, Music, Search, Plus, ExternalLink, Calendar, User, Disc, Tag, Folder, ChevronRight, Layers, Layout, Inbox, Archive, Trash2, ArrowRight, MoreVertical, FolderSearch, ListMusic, Edit2, CheckCircle2, Circle, Clock, Activity, Settings2, X, Filter, Zap, Cpu } from "lucide-react";

interface ProjectsViewProps {
    theme: 'light' | 'dark';
}

interface ProjectVersion {
    id: string;
    name: string;
    path: string;
    type: 'flp' | 'zip';
    lastModified: number;
    trackId?: string;
    workspaceId?: string;
    workspaceName?: string;
    isUnorganized: number;
}

interface ProjectTrack {
    id: string;
    name: string;
    status: 'Idea' | 'Arreglo' | 'Mezcla' | 'Master' | 'Terminado';
    bpm?: number;
    key?: string;
    tags: string[];
    versions: ProjectVersion[];
}

interface ProjectAlbum {
    id: string;
    name: string;
    artist: string;
    tracks: ProjectTrack[];
}

interface ProjectsDB {
    albums: ProjectAlbum[];
    allVersions: ProjectVersion[];
}

type ModalType = 'create-album' | 'edit-album' | 'create-track' | 'edit-track' | 'daw-settings' | 'add-workspace';

import { useTranslation } from "react-i18next";

export const ProjectsView: React.FC<ProjectsViewProps> = ({ theme }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';
    const [db, setDb] = useState<ProjectsDB>({ albums: [], allVersions: [] });
    const [viewMode, setViewMode] = useState<'projects' | 'todos'>('projects');
    const [filterMode, setFilterMode] = useState<'all' | 'raw' | 'nested'>('all');
    const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectSearch, setProjectSearch] = useState("");
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [pendingWorkspacePath, setPendingWorkspacePath] = useState<string | null>(null);

    // DAW state
    const [detectedDaws, setDetectedDaws] = useState<any[]>([]);
    const [savedDaws, setSavedDaws] = useState<any[]>([]);

    // UI states
    const [movingVersion, setMovingVersion] = useState<ProjectVersion | null>(null);
    const [movingToAlbumId, setMovingToAlbumId] = useState<string | null>(null);
    const [pickingVersionForTrackId, setPickingVersionForTrackId] = useState<string | null>(null);
    const [activeTrackMenu, setActiveTrackMenu] = useState<string | null>(null);
    const [activeAlbumMenu, setActiveAlbumMenu] = useState<string | null>(null);
    const [linkSearch, setLinkSearch] = useState("");
    const [isCreatingTrackInline, setIsCreatingTrackInline] = useState(false);
    const [inlineTrackName, setInlineTrackName] = useState("");

    // Modals state
    const [modalData, setModalData] = useState<{
        show: boolean;
        type: ModalType;
        title: string;
        id?: string;
        inputs: { label: string, key: string, placeholder: string, value: string, type?: 'text' | 'select', options?: string[] }[];
    }>({
        show: false,
        type: 'create-album',
        title: '',
        inputs: []
    });

    const loadDB = async () => {
        setIsLoading(true);
        try {
            const data = await (window as any).api.getProjectDB();
            setDb(data);
            if (data.albums.length > 0 && !selectedAlbumId) {
                setSelectedAlbumId(data.albums[0].id);
            }
            const saved = await (window as any).api.getDAWPaths();
            setSavedDaws(saved);
            const ws = await (window as any).api.getWorkspaces();
            setWorkspaces(ws);
        } catch (e) {
            console.error("Failed to load projects DB:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDB();
    }, []);

    const handleAddWorkspace = async () => {
        const dir = await (window as any).api.pickDir();
        if (dir) {
            setPendingWorkspacePath(dir);
            setModalData({
                show: true,
                type: 'add-workspace',
                title: t('projects.newWorkspace'),
                inputs: [
                    { label: t('projects.friendlyName'), key: 'name', placeholder: 'Ej: Mis Proyectos, Samples Cloud...', value: 'Mi Música' }
                ]
            });
        }
    };

    const handleRemoveWorkspace = async (id: string) => {
        if (confirm(t('projects.confirmRemoveWorkspace'))) {
            setIsLoading(true);
            await (window as any).api.removeWorkspace(id);
            loadDB();
        }
    };

    const handleScanWorkspaces = async () => {
        setIsLoading(true);
        await (window as any).api.scanProjects();
        loadDB();
    };

    const handleOpenDAWSettings = async () => {
        setIsLoading(true);
        const daws = await (window as any).api.detectDAWs();
        setDetectedDaws(daws);
        setIsLoading(false);
        setModalData({
            show: true,
            type: 'daw-settings',
            title: t('projects.configDaws'),
            inputs: []
        });
    };

    const handleSaveDAW = async (daw: any) => {
        await (window as any).api.saveDAWPath(daw);
        const saved = await (window as any).api.getDAWPaths();
        setSavedDaws(saved);
    };

    const handleManualDAWPick = async () => {
        const isMac = (window as any).api.platform === 'darwin';
        const filters = isMac ? [] : [{ name: 'Executable', extensions: ['exe'] }];
        const path = await (window as any).api.pickFile(filters);

        if (path) {
            const name = path.split(isMac ? '/' : '\\').pop() || 'DAW Manual';
            const daw = {
                name: name.replace('.exe', ''),
                path: path,
                version: 'Manual'
            };
            handleSaveDAW(daw);
        }
    };

    // --- ACTIONS ---
    const handleCreateAlbum = () => {
        setModalData({
            show: true,
            type: 'create-album',
            title: t('projects.newProject'),
            inputs: [
                { label: t('projects.name'), key: 'name', placeholder: 'Ej: Mi Nuevo EP', value: '' },
                { label: t('projects.artist'), key: 'artist', placeholder: 'Ej: Strikemedia', value: 'Yo' }
            ]
        });
    };

    const handleEditAlbum = (album: ProjectAlbum) => {
        setModalData({
            show: true,
            type: 'edit-album',
            id: album.id,
            title: t('projects.editProject'),
            inputs: [
                { label: t('projects.name'), key: 'name', placeholder: '', value: album.name },
                { label: t('projects.artist'), key: 'artist', placeholder: '', value: album.artist }
            ]
        });
        setActiveAlbumMenu(null);
    };

    const handleDeleteAlbum = async (id: string, name: string) => {
        if (!confirm(t('projects.confirmDeleteProject', { name }))) return;
        await (window as any).api.deleteAlbum(id);
        if (selectedAlbumId === id) setSelectedAlbumId(null);
        setActiveAlbumMenu(null);
        loadDB();
    };

    const handleCreateTrack = (albumId: string) => {
        setModalData({
            show: true,
            type: 'create-track',
            id: albumId,
            title: t('projects.newTrack'),
            inputs: [
                { label: t('projects.trackName'), key: 'name', placeholder: 'Ej: Midnight Rain', value: '' }
            ]
        });
    };

    const handleEditTrack = (track: ProjectTrack) => {
        setModalData({
            show: true,
            type: 'edit-track',
            id: track.id,
            title: t('projects.editTrack'),
            inputs: [
                { label: t('projects.trackName'), key: 'name', placeholder: '', value: track.name },
                { label: t('projects.bpm'), key: 'bpm', placeholder: 'Ej: 140', value: track.bpm?.toString() || '' },
                { label: t('projects.key'), key: 'key', placeholder: 'Ej: Am', value: track.key || '' },
                {
                    label: t('projects.status'),
                    key: 'status',
                    placeholder: '',
                    value: track.status,
                    type: 'select',
                    options: ['Idea', 'Arreglo', 'Mezcla', 'Master', 'Terminado']
                }
            ]
        });
        setActiveTrackMenu(null);
    };

    const handleDeleteTrack = async (trackId: string) => {
        if (!confirm(t('projects.confirmDeleteTrack'))) return;
        await (window as any).api.deleteTrack(trackId);
        setActiveTrackMenu(null);
        loadDB();
    };

    const handleQuickStatusChange = async (trackId: string, currentStatus: string) => {
        const statuses: any[] = ['Idea', 'Arreglo', 'Mezcla', 'Master', 'Terminado'];
        const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
        await (window as any).api.updateTrackMeta(trackId, { status: statuses[nextIdx] });
        loadDB();
    };

    const handleMoveToTrack = async (trackId: string, customVId?: string) => {
        const vId = customVId || movingVersion?.id;
        if (!vId) return;

        await (window as any).api.moveProjectVersion(vId, trackId);
        setMovingVersion(null);
        setMovingToAlbumId(null);
        setPickingVersionForTrackId(null);
        loadDB();
    };

    const handleConfirmCreateTrackInline = async () => {
        if (!inlineTrackName || !movingToAlbumId || !movingVersion) return;

        const newTrack = await (window as any).api.createTrack(inlineTrackName, movingToAlbumId);
        if (newTrack && newTrack.id) {
            await (window as any).api.moveProjectVersion(movingVersion.id, newTrack.id);
            setMovingVersion(null);
            setMovingToAlbumId(null);
            setIsCreatingTrackInline(false);
            setInlineTrackName("");
            loadDB();
        }
    };

    const handleDeleteVersion = async (vId: string, name: string) => {
        if (!confirm(t('projects.confirmDeleteVersion', { name }))) return;
        await (window as any).api.deleteVersion(vId);
        loadDB();
    };

    const handleOpenVersion = (path: string) => {
        (window as any).api.openItem(path);
    };

    const handleModalSubmit = async () => {
        const values: any = {};
        modalData.inputs.forEach(i => values[i.key] = i.value);
        if (!values.name && modalData.type !== 'edit-track' && modalData.type !== 'daw-settings') return;

        try {
            switch (modalData.type) {
                case 'create-album':
                    await (window as any).api.createAlbum(values.name, values.artist || 'Yo');
                    break;
                case 'edit-album':
                    await (window as any).api.updateAlbum(modalData.id!, { name: values.name, artist: values.artist });
                    break;
                case 'create-track':
                    await (window as any).api.createTrack(values.name, modalData.id!);
                    break;
                case 'edit-track':
                    await (window as any).api.updateTrackMeta(modalData.id!, {
                        name: values.name,
                        bpm: values.bpm ? parseInt(values.bpm) : null,
                        key: values.key,
                        status: values.status
                    });
                    break;
                case 'add-workspace':
                    if (pendingWorkspacePath) {
                        try {
                            setIsLoading(true);
                            await (window as any).api.addWorkspace(values.name, pendingWorkspacePath);
                        } catch (err: any) {
                            if (err.message.includes('UNIQUE constraint failed')) {
                                alert(t('projects.workspaceExists'));
                            } else {
                                alert(t('projects.errorAddWorkspace') + err.message);
                            }
                        } finally {
                            setPendingWorkspacePath(null);
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error(e);
        }
        setModalData({ ...modalData, show: false });
        loadDB();
    };

    const currentAlbum = db.albums.find(a => a.id === selectedAlbumId);
    const filteredVersions = db.allVersions.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(projectSearch.toLowerCase());
        if (!matchesSearch) return false;

        if (selectedWorkspaceId && v.workspaceId !== selectedWorkspaceId) return false;

        if (filterMode === 'raw') return v.isUnorganized === 1;
        if (filterMode === 'nested') return v.trackId != null;
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Idea': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
            case 'Mezcla': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
            case 'Master': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
            case 'Terminado': return 'bg-green-500/10 text-green-500 border border-green-500/20';
            default: return 'bg-wv-gray/10 text-wv-gray border border-wv-gray/20';
        }
    };

    return (
        <div className="flex-1 flex min-h-0 overflow-hidden text-[13px] relative">
            <style>{`
                .projects-scroll::-webkit-scrollbar { width: 4px; }
                .projects-scroll::-webkit-scrollbar-track { background: transparent; }
                .projects-scroll::-webkit-scrollbar-thumb { 
                    background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; 
                    border-radius: 10px; 
                }
                .projects-scroll:hover::-webkit-scrollbar-thumb { 
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; 
                }
            `}</style>

            {/* Sidebar Compacto */}
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
                            {db.allVersions.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${viewMode === 'todos' ? (isDark ? "bg-black text-white" : "bg-white text-black") : "bg-blue-600 text-white"}`}>
                                    {db.allVersions.filter(v => v.isUnorganized === 1).length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-2 px-2">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-wv-gray/40">{t('projects.workspaces')}</h2>
                        <button onClick={handleScanWorkspaces} title={t('projects.sync')} className={`p-1 rounded-md transition-all ${isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"}`}>
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
                                    onClick={(e) => { e.stopPropagation(); handleRemoveWorkspace(ws.id); }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/ws:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-wv-gray/40">{t('projects.collections')}</h2>
                        <button onClick={handleCreateAlbum} className={`p-1 rounded-md transition-all ${isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-black/40 hover:text-black hover:bg-black/10"}`}>
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-0.5 overflow-y-auto pr-1 projects-scroll">
                        {db.albums.map(album => (
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
                                            <button onClick={() => handleEditAlbum(album)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white flex items-center gap-2">
                                                <Edit2 size={10} /> {t('common.edit')}
                                            </button>
                                            <button onClick={() => handleDeleteAlbum(album.id, album.name)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
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
                            onClick={handleOpenDAWSettings}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isDark ? "bg-white/5 text-wv-gray hover:text-white" : "bg-black/5 text-black"}`}
                        >
                            <Cpu size={12} />
                            {t('projects.configDaws')}
                        </button>
                        <button
                            onClick={handleAddWorkspace}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-dashed transition-all ${isDark ? "border-white/10 text-wv-gray hover:border-white/25 hover:text-white" : "border-black/10 text-black/40 hover:text-black"}`}
                        >
                            <Plus size={12} />
                            {t('projects.addWorkspace')}
                        </button>
                    </div>
                </div >
            </div >

            {/* Contenido Principal */}
            < div className="flex-1 flex flex-col min-h-0" >
                {viewMode === 'todos' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pt-8 pb-4">
                        {/* Header refinado */}
                        <div className="mb-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tight leading-none">
                                        {selectedWorkspaceId
                                            ? `${t('projects.globalTray')}: ${workspaces.find(w => w.id === selectedWorkspaceId)?.name}`
                                            : t('projects.globalTray')}
                                    </h2>
                                    <p className="text-[10px] font-bold text-wv-gray uppercase tracking-widest opacity-40">
                                        {selectedWorkspaceId
                                            ? t('projects.viewingDetected')
                                            : t('projects.manageDetected')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-black/10 p-1 rounded-xl gap-0.5">
                                        <button
                                            onClick={() => setFilterMode('all')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            {t('projects.filterAll')}
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('raw')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'raw' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            {t('projects.filterRaw')}
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('nested')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'nested' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            {t('projects.filterNested')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group max-w-md">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-white/20 group-focus-within:text-blue-500" : "text-black/20 group-focus-within:text-black"}`} size={14} />
                                <input
                                    type="text"
                                    placeholder={t('projects.searchPlaceholder')}
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    className={`pl-10 pr-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none transition-all w-full ${isDark ? "bg-white/5 text-white focus:bg-white/10" : "bg-black/5 text-black focus:bg-black/10"}`}
                                />
                                {projectSearch && (
                                    <button
                                        onClick={() => setProjectSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-wv-gray hover:text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto projects-scroll pr-2 -mr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 pb-20">
                                {filteredVersions.map(version => (
                                    <div key={version.id} className={`p-3 rounded-2xl border transition-all ${isDark ? "bg-wv-sidebar/30 border-white/5 hover:bg-wv-sidebar/50" : "bg-white border-black/5 shadow-sm"}`}>
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className={`p-1.5 rounded-lg shrink-0 ${version.type === 'flp' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <Layout size={14} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-[10px] font-black truncate uppercase tracking-tight leading-none mb-1">{version.name}</h3>
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <p className="text-[7px] text-wv-gray font-black uppercase opacity-30 shrink-0">{version.type}</p>
                                                    {version.workspaceName && (
                                                        <>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-wv-gray/20" />
                                                            <p className="text-[7px] text-blue-500 font-bold uppercase truncate opacity-80" title={version.workspaceName}>
                                                                {version.workspaceName}
                                                            </p>
                                                        </>
                                                    )}
                                                    {version.trackId && (
                                                        <span className="px-1 py-0.5 bg-blue-500/10 text-blue-500 text-[6px] font-black uppercase rounded shrink-0">{t('projects.nested')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setMovingVersion(version)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${version.trackId ? (isDark ? "bg-white/5 text-wv-gray hover:text-white" : "bg-black/5") : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                            >
                                                {version.trackId ? t('projects.reNest') : t('projects.nest')} <ArrowRight size={10} />
                                            </button>
                                            <button onClick={() => handleOpenVersion(version.path)} className={`p-1.5 rounded-lg transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>
                                                <ExternalLink size={10} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {
                    viewMode === 'projects' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {!currentAlbum ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                    <Disc size={32} className="mb-4 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-wv-gray">{t('projects.selectProject')}</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col min-h-0 h-full">
                                    {/* Header del Proyecto Compacto */}
                                    <div className="px-8 py-6 border-b border-white/5 shrink-0">
                                        <div className="flex justify-between items-center">
                                            <div className="min-w-0">
                                                <h2 className="text-3xl font-black tracking-tighter mb-1 truncate">{currentAlbum.name}</h2>
                                                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-wv-gray/60">
                                                    <span className="flex items-center gap-1.5"><User size={10} /> {currentAlbum.artist}</span>
                                                    <span className="w-1 h-1 rounded-full bg-wv-gray/20" />
                                                    <span className="flex items-center gap-1.5"><Music size={10} /> {currentAlbum.tracks.length} Tracks</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditAlbum(currentAlbum)} className={`p-2.5 rounded-xl transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>
                                                    <Settings2 size={16} />
                                                </button>
                                                <button onClick={() => handleCreateTrack(currentAlbum.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-white text-black" : "bg-black text-white hover:opacity-90"}`}>
                                                    <Plus size={14} /> {t('projects.newTrack')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de Tracks Compacta */}
                                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 pr-1 projects-scroll">
                                        {currentAlbum.tracks.map(track => (
                                            <div key={track.id} className={`p-5 rounded-[1.5rem] border transition-all ${isDark ? "bg-wv-sidebar/20 border-white/5 hover:bg-wv-sidebar/30" : "bg-white border-black/5"}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wv-gray/10 to-transparent flex items-center justify-center shrink-0">
                                                            <Activity size={18} className="text-wv-gray/40" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-black tracking-tight mb-1 truncate">{track.name}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleQuickStatusChange(track.id, track.status)}
                                                                    className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight transition-all ${getStatusColor(track.status)}`}
                                                                >
                                                                    {track.status}
                                                                </button>
                                                                {track.bpm && <span className="text-[9px] font-black text-wv-gray/40">{track.bpm} BPM</span>}
                                                                {track.key && <span className="text-[9px] font-black text-wv-gray/40">{track.key}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <button onClick={() => setActiveTrackMenu(activeTrackMenu === track.id ? null : track.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}>
                                                            <MoreVertical size={16} className="text-wv-gray" />
                                                        </button>
                                                        {activeTrackMenu === track.id && (
                                                            <>
                                                                <div className="fixed inset-0 z-10" onClick={() => setActiveTrackMenu(null)} />
                                                                <div className={`absolute right-0 mt-1 w-32 rounded-xl shadow-2xl border z-20 py-1.5 ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                                                                    <button onClick={() => handleEditTrack(track)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white flex items-center gap-2">
                                                                        <Edit2 size={10} /> {t('common.edit')}
                                                                    </button>
                                                                    <button onClick={() => handleDeleteTrack(track.id)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                                                        <Trash2 size={10} /> {t('common.delete')}
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {track.versions.map(version => (
                                                        <div key={version.id} className={`group/ver px-3 py-2 rounded-xl border flex items-center justify-between transition-all ${isDark ? "bg-black/20 border-white/5 hover:bg-black/40" : "bg-black/[0.01]"}`}>
                                                            <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => handleOpenVersion(version.path)}>
                                                                <div className={`p-1.5 rounded-lg ${version.type === 'flp' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    <Layout size={12} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black truncate uppercase tracking-tight">{version.name}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center opacity-0 group-hover/ver:opacity-100 transition-all">
                                                                <button onClick={() => handleOpenVersion(version.path)} className="p-1 text-wv-gray hover:text-white"><ExternalLink size={12} /></button>
                                                                <button onClick={() => handleDeleteVersion(version.id, version.name)} className="p-1 text-wv-gray hover:text-red-500"><X size={12} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setPickingVersionForTrackId(track.id)}
                                                        className={`px-3 py-2 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-all ${isDark ? "bg-white/[0.02] border-white/10 hover:bg-white/5 text-wv-gray hover:text-white" : "bg-black/[0.02] border-black/10 hover:bg-black/5"}`}
                                                    >
                                                        <Plus size={14} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{t('projects.linkRaw')}</span>
                                                    </button>
                                                    {track.versions.length === 0 && (
                                                        <p className="col-span-full py-2 text-[8px] font-black uppercase tracking-widest text-wv-gray/20 text-center">{t('projects.noVersions')}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            </div >

            {/* MODALS */}
            {
                movingVersion && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                        <div className={`max-w-md w-full p-8 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                            <div className="text-center mb-6">
                                <ArrowRight size={24} className="text-blue-500 mx-auto mb-3" />
                                <h2 className="text-lg font-black tracking-tight">{t('projects.nestFile')}</h2>
                                <p className="text-[10px] text-wv-gray font-bold uppercase tracking-widest mt-1 truncate px-4">{t('projects.projectLabel')} {movingVersion.name}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 mb-6 projects-scroll">
                                {!movingToAlbumId ? (
                                    <>
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-wv-gray/40 px-2 mb-2">{t('projects.selectCollection')}</h3>
                                        {db.albums.map(album => (
                                            <button
                                                key={album.id}
                                                onClick={() => setMovingToAlbumId(album.id)}
                                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10"}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Disc size={16} className="text-blue-500" />
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{album.name}</span>
                                                </div>
                                                <ChevronRight size={14} className="opacity-40" />
                                            </button>
                                        ))}
                                        {db.albums.length === 0 && (
                                            <div className="text-center py-10 opacity-30">
                                                <p className="text-[10px] font-black uppercase tracking-widest">{t('projects.noCollections')}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-4">
                                            <button onClick={() => setMovingToAlbumId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-wv-gray"><X size={14} /></button>
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-wv-gray/40">{t('projects.collectionLabel')} {db.albums.find(a => a.id === movingToAlbumId)?.name}</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                            {db.albums.find(a => a.id === movingToAlbumId)?.tracks.map(track => (
                                                <button key={track.id} onClick={() => handleMoveToTrack(track.id)} className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-blue-600 text-white" : "bg-black/5 hover:bg-black/10"}`}>
                                                    <span className="text-[10px] font-black uppercase tracking-tight">{track.name}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase opacity-60 border border-current`}>{track.status}</span>
                                                </button>
                                            ))}

                                            {isCreatingTrackInline ? (
                                                <div className={`p-4 rounded-2xl border ${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}>
                                                    <label className="text-[8px] uppercase font-black tracking-widest text-wv-gray ml-1 mb-2 block">{t('projects.newTrackName')}</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={inlineTrackName}
                                                            onChange={(e) => setInlineTrackName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreateTrackInline()}
                                                            className={`flex-1 px-4 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${isDark ? "bg-black/20 border-white/5 focus:border-blue-500/50" : "bg-white border-black/5 focus:border-black/20"}`}
                                                        />
                                                        <button
                                                            onClick={handleConfirmCreateTrackInline}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                            {t('common.create')}
                                                        </button>
                                                        <button
                                                            onClick={() => setIsCreatingTrackInline(false)}
                                                            className={`p-2 rounded-xl ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setIsCreatingTrackInline(true);
                                                        setInlineTrackName(movingVersion.name.replace(/\.(flp|zip)$/i, ""));
                                                    }}
                                                    className={`flex items-center gap-3 px-5 py-3 rounded-xl border border-dashed transition-all ${isDark ? "bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20" : "bg-blue-50 border-blue-200 text-blue-600"}`}
                                                >
                                                    <Plus size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('projects.newTrackInCollection')}</span>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <button onClick={() => { setMovingVersion(null); setMovingToAlbumId(null); setIsCreatingTrackInline(false); setInlineTrackName(""); }} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>{t('common.cancel')}</button>
                        </div>
                    </div>
                )
            }

            {
                pickingVersionForTrackId && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                        <div className={`max-w-md w-full max-h-[85vh] p-8 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                            <div className="text-center mb-6">
                                <Plus size={24} className="text-blue-500 mx-auto mb-3" />
                                <h2 className="text-lg font-black tracking-tight">{t('projects.linkProject')}</h2>
                                <p className="text-[10px] text-wv-gray font-bold uppercase tracking-widest mt-1">{t('projects.selectRawFor', { name: db.albums.flatMap(a => a.tracks).find(t => t.id === pickingVersionForTrackId)?.name })}</p>
                            </div>

                            <div className="mb-4 relative group">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-wv-gray opacity-30 group-focus-within:opacity-100 transition-opacity" />
                                <input
                                    type="text"
                                    placeholder={t('projects.searchByName')}
                                    value={linkSearch}
                                    onChange={(e) => setLinkSearch(e.target.value)}
                                    autoFocus
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-bold outline-none transition-all ${isDark ? "bg-white/5 border-white/5 focus:border-blue-500/50" : "bg-black/5 border-black/5 focus:border-black/20"}`}
                                />
                                {linkSearch && (
                                    <button onClick={() => setLinkSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-wv-gray hover:text-white transition-colors">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 mb-6 projects-scroll">
                                {db.allVersions
                                    .filter(v => v.isUnorganized === 1)
                                    .filter(v => !linkSearch || v.name.toLowerCase().includes(linkSearch.toLowerCase()))
                                    .map(version => (
                                        <button
                                            key={version.id}
                                            onClick={() => {
                                                handleMoveToTrack(pickingVersionForTrackId, version.id);
                                                setLinkSearch("");
                                            }}
                                            className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-blue-600 text-white" : "bg-black/5 hover:bg-black/10"}`}
                                        >
                                            <div className={`p-1.5 rounded-lg ${version.type === 'flp' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <Layout size={14} />
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-[10px] font-black uppercase truncate">{version.name}</p>
                                                <p className="text-[8px] text-wv-gray font-bold uppercase tracking-widest">{version.workspaceName || 'Raw'}</p>
                                            </div>
                                        </button>
                                    ))
                                }
                                {db.allVersions.filter(v => v.isUnorganized === 1).filter(v => !linkSearch || v.name.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 && (
                                    <div className="text-center py-10 opacity-30 border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest">{t('projects.noResults')}</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { setPickingVersionForTrackId(null); setLinkSearch(""); }} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>{t('common.cancel')}</button>
                        </div>
                    </div>
                )
            }

            {
                modalData.show && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                        <div className={`${modalData.type === 'daw-settings' ? 'max-w-xl' : 'max-w-sm'} w-full p-8 rounded-[2.5rem] border shadow-2xl ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                            <div className="mb-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black tracking-tight mb-1">{modalData.title}</h2>
                                    <p className="text-[9px] uppercase font-black tracking-widest text-wv-gray opacity-50">{t('projects.manageResources')}</p>
                                </div>
                                <button onClick={() => setModalData({ ...modalData, show: false })} className="p-2 opacity-50 hover:opacity-100"><X size={16} /></button>
                            </div>

                            {modalData.type === 'daw-settings' ? (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-500">{t('projects.detectedDaws')}</h3>
                                            <button
                                                onClick={handleManualDAWPick}
                                                className="text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white transition-all underline decoration-wv-gray/20 underline-offset-4"
                                            >
                                                {t('projects.manualSelect')}
                                            </button>
                                        </div>
                                        {detectedDaws.length === 0 ? (
                                            <div className="py-8 bg-black/5 rounded-2xl text-center">
                                                <p className="text-[10px] font-bold text-wv-gray">{t('projects.noDawsFound')}</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {detectedDaws.map(daw => {
                                                    const isSaved = savedDaws.some(s => s.path === daw.path);
                                                    return (
                                                        <div key={daw.path} className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}>
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-black uppercase truncate">{daw.name}</p>
                                                                <p className="text-[8px] text-wv-gray truncate font-bold">{daw.path}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => isSaved ? null : handleSaveDAW(daw)}
                                                                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${isSaved ? "bg-green-500/10 text-green-500" : "bg-blue-600 text-white hover:scale-105"}`}
                                                            >
                                                                {isSaved ? t('common.saved') : t('projects.useThis')}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-wv-gray">{t('projects.savedConfig')}</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {savedDaws.map(daw => (
                                                <div key={daw.path} className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                                    <Zap size={14} className="text-wv-gray/40" />
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black uppercase">{daw.name}</p>
                                                        <p className="text-[8px] text-wv-gray font-bold">Ver. {daw.version}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-8">
                                        {modalData.inputs.map((input, idx) => (
                                            <div key={input.key} className="space-y-1.5">
                                                <label className="text-[8px] uppercase font-black tracking-widest text-wv-gray ml-1">{input.label}</label>
                                                {input.type === 'select' ? (
                                                    <select
                                                        value={input.value}
                                                        onChange={(e) => {
                                                            const newInputs = [...modalData.inputs];
                                                            newInputs[idx].value = e.target.value;
                                                            setModalData({ ...modalData, inputs: newInputs });
                                                        }}
                                                        className={`w-full px-4 py-3 rounded-xl border transition-all text-xs font-bold outline-none ${isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"}`}
                                                    >
                                                        {input.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text" autoFocus={idx === 0} value={input.value} placeholder={input.placeholder}
                                                        onChange={(e) => {
                                                            const newInputs = [...modalData.inputs];
                                                            newInputs[idx].value = e.target.value;
                                                            setModalData({ ...modalData, inputs: newInputs });
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
                                                        className={`w-full px-4 py-3 rounded-xl border transition-all text-xs font-bold outline-none ${isDark ? "bg-white/5 border-white/5 focus:border-blue-500/50" : "bg-black/5 border-black/5 focus:border-black/20"}`}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2.5">
                                        <button onClick={() => setModalData({ ...modalData, show: false })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5" : "bg-black/5"}`}>{t('common.cancel')}</button>
                                        <button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10">{t('common.save')}</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};
