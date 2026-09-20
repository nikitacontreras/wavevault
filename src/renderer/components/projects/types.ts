export interface ProjectVersion {
    id: string;
    name: string;
    path: string;
    type: 'flp' | 'zip';
    lastModified: number;
    trackId?: string;
    workspaceId?: string;
    workspaceName?: string;
    isUnorganized: number;
    metadata?: string;
}

export interface ProjectTrack {
    id: string;
    name: string;
    status: 'Idea' | 'Arreglo' | 'Mezcla' | 'Master' | 'Terminado';
    bpm?: number;
    key?: string;
    tags?: string[];
    createdAt: number;
    versions: ProjectVersion[];
}

export interface ProjectAlbum {
    id: string;
    name: string;
    artist?: string;
    artwork?: string;
    createdAt: number;
    tracks: ProjectTrack[];
}

export interface ProjectDB {
    albums: ProjectAlbum[];
    allVersions: ProjectVersion[];
}

export type ModalType = 'create-album' | 'edit-album' | 'create-track' | 'edit-track' | 'daw-settings' | 'add-workspace' | 'project-details';

export interface ModalDataState {
    show: boolean;
    type: ModalType;
    title: string;
    id?: string;
    inputs: { label: string; key: string; placeholder: string; value: string; type?: 'text' | 'select'; options?: string[] }[];
    data?: any;
}
