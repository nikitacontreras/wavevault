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

type ModalType = 'create-album' | 'edit-album' | 'create-track' | 'edit-track' | 'daw-settings';

export const ProjectsView: React.FC<ProjectsViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';
    const [db, setDb] = useState<ProjectsDB>({ albums: [], allVersions: [] });
    const [viewMode, setViewMode] = useState<'projects' | 'todos'>('projects');
    const [filterMode, setFilterMode] = useState<'all' | 'raw' | 'nested'>('all');
    const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectSearch, setProjectSearch] = useState("");

    // DAW state
    const [detectedDaws, setDetectedDaws] = useState<any[]>([]);
    const [savedDaws, setSavedDaws] = useState<any[]>([]);

    // UI states
    const [movingVersion, setMovingVersion] = useState<ProjectVersion | null>(null);
    const [activeTrackMenu, setActiveTrackMenu] = useState<string | null>(null);
    const [activeAlbumMenu, setActiveAlbumMenu] = useState<string | null>(null);

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
        } catch (e) {
            console.error("Failed to load projects DB:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDB();
    }, []);

    const handleScanFolder = async () => {
        const dir = await (window as any).api.pickDir();
        if (dir) {
            setIsLoading(true);
            await (window as any).api.addProjectPath(dir);
            await (window as any).api.getProjects();
            loadDB();
        }
    };

    const handleOpenDAWSettings = async () => {
        setIsLoading(true);
        const daws = await (window as any).api.detectDAWs();
        setDetectedDaws(daws);
        setIsLoading(false);
        setModalData({
            show: true,
            type: 'daw-settings',
            title: 'Configuración de DAWs',
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
            title: 'Nuevo Proyecto',
            inputs: [
                { label: 'Nombre', key: 'name', placeholder: 'Ej: Mi Nuevo EP', value: '' },
                { label: 'Artista', key: 'artist', placeholder: 'Ej: Strikemedia', value: 'Yo' }
            ]
        });
    };

    const handleEditAlbum = (album: ProjectAlbum) => {
        setModalData({
            show: true,
            type: 'edit-album',
            id: album.id,
            title: 'Editar Proyecto',
            inputs: [
                { label: 'Nombre', key: 'name', placeholder: '', value: album.name },
                { label: 'Artista', key: 'artist', placeholder: '', value: album.artist }
            ]
        });
        setActiveAlbumMenu(null);
    };

    const handleDeleteAlbum = async (id: string, name: string) => {
        if (!confirm(`¿Borrar el proyecto "${name}"?`)) return;
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
            title: 'Nueva Track',
            inputs: [
                { label: 'Nombre', key: 'name', placeholder: 'Ej: Midnight Rain', value: '' }
            ]
        });
    };

    const handleEditTrack = (track: ProjectTrack) => {
        setModalData({
            show: true,
            type: 'edit-track',
            id: track.id,
            title: 'Editar Track',
            inputs: [
                { label: 'Nombre', key: 'name', placeholder: '', value: track.name },
                { label: 'BPM', key: 'bpm', placeholder: 'Ej: 140', value: track.bpm?.toString() || '' },
                { label: 'Key', key: 'key', placeholder: 'Ej: Am', value: track.key || '' },
                {
                    label: 'Estado',
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
        if (!confirm("¿Borrar track?")) return;
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

    const handleMoveToTrack = async (trackId: string) => {
        if (!movingVersion) return;
        await (window as any).api.moveProjectVersion(movingVersion.id, trackId);
        setMovingVersion(null);
        loadDB();
    };

    const handleDeleteVersion = async (vId: string, name: string) => {
        if (!confirm(`¿Borrar "${name}"?`)) return;
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
                            Mis Proyectos
                        </button>
                        <button
                            onClick={() => setViewMode('todos')}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'todos' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <ListMusic size={14} strokeWidth={2.5} />
                                Archivos Raw
                            </div>
                            {db.allVersions.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${viewMode === 'todos' ? (isDark ? "bg-black text-white" : "bg-white text-black") : "bg-blue-600 text-white"}`}>
                                    {db.allVersions.filter(v => v.isUnorganized === 1).length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between mb-3 px-2">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-wv-gray/40">Workspace</h2>
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
                                        <div className={`absolute left-full ml-1 top-0 w-32 rounded-xl shadow-2xl border z-20 py-1.5 ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                                            <button onClick={() => handleEditAlbum(album)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white flex items-center gap-2">
                                                <Edit2 size={10} /> Editar
                                            </button>
                                            <button onClick={() => handleDeleteAlbum(album.id, album.name)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                                <Trash2 size={10} /> Borrar
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
                            Configurar DAWs
                        </button>
                        <button
                            onClick={handleScanFolder}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-dashed transition-all ${isDark ? "border-white/10 text-wv-gray hover:border-white/25 hover:text-white" : "border-black/10 text-black/40 hover:text-black"}`}
                        >
                            <FolderSearch size={12} />
                            Importar Carpeta
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col min-h-0">
                {viewMode === 'todos' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pt-8 pb-4">
                        {/* Header refinado */}
                        <div className="mb-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tight leading-none">Bandeja Global</h2>
                                    <p className="text-[10px] font-bold text-wv-gray uppercase tracking-widest opacity-40">Gestiona tus archivos detectados</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex bg-black/10 p-1 rounded-xl gap-0.5">
                                        <button
                                            onClick={() => setFilterMode('all')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('raw')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'raw' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            Sin Anidar
                                        </button>
                                        <button
                                            onClick={() => setFilterMode('nested')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterMode === 'nested' ? (isDark ? "bg-white text-black shadow-lg" : "bg-black text-white") : "text-wv-gray hover:text-white"}`}
                                        >
                                            Anidados
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group max-w-md">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? "text-white/20 group-focus-within:text-blue-500" : "text-black/20 group-focus-within:text-black"}`} size={14} />
                                <input
                                    type="text"
                                    placeholder="BUSCAR PROYECTO POR NOMBRE..."
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
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[7px] text-wv-gray font-black uppercase opacity-30">{version.type}</p>
                                                    {version.trackId && (
                                                        <span className="px-1 py-0.5 bg-blue-500/10 text-blue-500 text-[6px] font-black uppercase rounded">Anidado</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => setMovingVersion(version)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${version.trackId ? (isDark ? "bg-white/5 text-wv-gray hover:text-white" : "bg-black/5") : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                            >
                                                {version.trackId ? 'Volver a Anidar' : 'Anidar'} <ArrowRight size={10} />
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

                {viewMode === 'projects' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {!currentAlbum ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                                <Disc size={32} className="mb-4 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-wv-gray">Selecciona un proyecto</p>
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
                                                <Plus size={14} /> Nueva Track
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
                                                                    <Edit2 size={10} /> Editar
                                                                </button>
                                                                <button onClick={() => handleDeleteTrack(track.id)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                                                    <Trash2 size={10} /> Borrar
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
                                                {track.versions.length === 0 && (
                                                    <p className="col-span-full py-2 text-[8px] font-black uppercase tracking-widest text-wv-gray/20 text-center">Sin versiones</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODALS */}
            {movingVersion && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                    <div className={`max-w-md w-full p-8 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                        <div className="text-center mb-6">
                            <ArrowRight size={24} className="text-blue-500 mx-auto mb-3" />
                            <h2 className="text-lg font-black tracking-tight">Anidar Archivo</h2>
                            <p className="text-[10px] text-wv-gray font-bold uppercase tracking-widest mt-1">Destino para: {movingVersion.name}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 mb-6 projects-scroll">
                            {db.albums.map(album => (
                                <div key={album.id} className="space-y-1.5">
                                    <h4 className="text-[8px] uppercase font-black tracking-[0.2em] text-wv-gray/40 px-2">{album.name}</h4>
                                    <div className="grid grid-cols-1 gap-1">
                                        {album.tracks.map(track => (
                                            <button key={track.id} onClick={() => handleMoveToTrack(track.id)} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-blue-600 text-white" : "bg-black/5 hover:bg-black/10"}`}>
                                                <span className="text-[10px] font-black uppercase tracking-tight">{track.name}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${getStatusColor(track.status)}`}>{track.status}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setMovingVersion(null)} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>Cancelar</button>
                    </div>
                </div>
            )}

            {modalData.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                    <div className={`${modalData.type === 'daw-settings' ? 'max-w-xl' : 'max-w-sm'} w-full p-8 rounded-[2.5rem] border shadow-2xl ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black tracking-tight mb-1">{modalData.title}</h2>
                                <p className="text-[9px] uppercase font-black tracking-widest text-wv-gray opacity-50">Gestionar recursos de producción</p>
                            </div>
                            <button onClick={() => setModalData({ ...modalData, show: false })} className="p-2 opacity-50 hover:opacity-100"><X size={16} /></button>
                        </div>

                        {modalData.type === 'daw-settings' ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-500">DAWs Detectados</h3>
                                        <button
                                            onClick={handleManualDAWPick}
                                            className="text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white transition-all underline decoration-wv-gray/20 underline-offset-4"
                                        >
                                            Seleccionar manualmente
                                        </button>
                                    </div>
                                    {detectedDaws.length === 0 ? (
                                        <div className="py-8 bg-black/5 rounded-2xl text-center">
                                            <p className="text-[10px] font-bold text-wv-gray">No se encontraron versiones de FL Studio automáticamente.</p>
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
                                                            {isSaved ? "Guardado" : "Usar este"}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-widest text-wv-gray">Configuración Guardada</h3>
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
                                    <button onClick={() => setModalData({ ...modalData, show: false })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5" : "bg-black/5"}`}>Cancelar</button>
                                    <button onClick={handleModalSubmit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10">Guardar</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
