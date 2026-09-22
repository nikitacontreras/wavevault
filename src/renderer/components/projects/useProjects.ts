import { useState, useEffect, useCallback } from "react";
import { ProjectDB, ProjectAlbum, ProjectTrack, ProjectVersion, ModalDataState, ModalType } from "./types";
import { useTranslation } from "react-i18next";

export function useProjects() {
    const { t } = useTranslation();
    const [db, setDb] = useState<ProjectDB>({ albums: [], allVersions: [] });
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
    const [modalData, setModalData] = useState<ModalDataState>({
        show: false,
        type: 'create-album',
        title: '',
        inputs: []
    });

    const loadDB = useCallback(async () => {
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
    }, [selectedAlbumId]);

    useEffect(() => {
        loadDB();
    }, [loadDB]);

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
                { label: t('projects.artist'), key: 'artist', placeholder: '', value: album.artist || '' }
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

    const handleOpenDetails = (version: ProjectVersion, meta: any) => {
        setModalData({
            show: true,
            type: 'project-details',
            title: version.name,
            inputs: [],
            data: meta
        });
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
                            await (window as any).api.scanProjects();
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

    const currentAlbum = db.albums.find((a: any) => a.id === selectedAlbumId);
    const filteredVersions = db.allVersions.filter((v: any) => {
        const name = v.name || "";
        const matchesSearch = name.toLowerCase().includes(projectSearch.toLowerCase());
        if (!matchesSearch) return false;

        if (selectedWorkspaceId && v.workspaceId !== selectedWorkspaceId) return false;

        if (filterMode === 'raw') return v.isUnorganized === 1;
        if (filterMode === 'nested') return v.trackId != null;
        return true;
    });

    return {
        db,
        viewMode,
        setViewMode,
        filterMode,
        setFilterMode,
        selectedAlbumId,
        setSelectedAlbumId,
        currentAlbum,
        isLoading,
        projectSearch,
        setProjectSearch,
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        detectedDaws,
        savedDaws,
        movingVersion,
        setMovingVersion,
        movingToAlbumId,
        setMovingToAlbumId,
        pickingVersionForTrackId,
        setPickingVersionForTrackId,
        activeTrackMenu,
        setActiveTrackMenu,
        activeAlbumMenu,
        setActiveAlbumMenu,
        linkSearch,
        setLinkSearch,
        isCreatingTrackInline,
        setIsCreatingTrackInline,
        inlineTrackName,
        setInlineTrackName,
        modalData,
        setModalData,
        filteredVersions,
        // Handlers
        handleAddWorkspace,
        handleRemoveWorkspace,
        handleScanWorkspaces,
        handleOpenDAWSettings,
        handleSaveDAW,
        handleManualDAWPick,
        handleCreateAlbum,
        handleEditAlbum,
        handleDeleteAlbum,
        handleCreateTrack,
        handleEditTrack,
        handleDeleteTrack,
        handleQuickStatusChange,
        handleMoveToTrack,
        handleConfirmCreateTrackInline,
        handleDeleteVersion,
        handleOpenVersion,
        handleOpenDetails,
        handleModalSubmit
    };
}
