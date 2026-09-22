import React from "react";
import { Disc, User, Music, Settings2, Plus, Activity, MoreVertical, Layout, ExternalLink, X, Edit2, Trash2 } from "lucide-react";
import { ProjectAlbum, ProjectTrack, ProjectVersion } from "./types";
import { useTranslation } from "react-i18next";

interface ProjectAlbumViewProps {
    isDark: boolean;
    currentAlbum: ProjectAlbum | undefined;
    onEditAlbum: (album: ProjectAlbum) => void;
    onCreateTrack: (albumId: string) => void;
    onEditTrack: (track: ProjectTrack) => void;
    onDeleteTrack: (trackId: string) => void;
    onQuickStatusChange: (trackId: string, currentStatus: string) => void;
    activeTrackMenu: string | null;
    setActiveTrackMenu: (id: string | null) => void;
    onOpenVersion: (path: string) => void;
    onDeleteVersion: (vId: string, name: string) => void;
    onPickVersionForTrack: (trackId: string) => void;
}

export const ProjectAlbumView: React.FC<ProjectAlbumViewProps> = ({
    isDark,
    currentAlbum,
    onEditAlbum,
    onCreateTrack,
    onEditTrack,
    onDeleteTrack,
    onQuickStatusChange,
    activeTrackMenu,
    setActiveTrackMenu,
    onOpenVersion,
    onDeleteVersion,
    onPickVersionForTrack
}) => {
    const { t } = useTranslation();

    if (!currentAlbum) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Disc size={32} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-wv-gray">{t('projects.selectProject')}</p>
            </div>
        );
    }

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
                        <button onClick={() => onEditAlbum(currentAlbum)} className={`p-2.5 rounded-xl transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>
                            <Settings2 size={16} />
                        </button>
                        <button onClick={() => onCreateTrack(currentAlbum.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDark ? "bg-white text-black" : "bg-black text-white hover:opacity-90"}`}>
                            <Plus size={14} /> {t('projects.newTrack')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Tracks Compacta */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 pr-1 projects-scroll">
                {currentAlbum.tracks.map((track) => (
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
                                            onClick={() => onQuickStatusChange(track.id, track.status)}
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
                                            <button onClick={() => onEditTrack(track)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-wv-gray hover:text-white flex items-center gap-2">
                                                <Edit2 size={10} /> {t('common.edit')}
                                            </button>
                                            <button onClick={() => onDeleteTrack(track.id)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                                                <Trash2 size={10} /> {t('common.delete')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {track.versions.map((version) => (
                                <div key={version.id} className={`group/ver px-3 py-2 rounded-xl border flex items-center justify-between transition-all ${isDark ? "bg-black/20 border-white/5 hover:bg-black/40" : "bg-black/[0.01]"}`}>
                                    <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => onOpenVersion(version.path)}>
                                        <div className={`p-1.5 rounded-lg ${version.type === 'flp' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <Layout size={12} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black truncate uppercase tracking-tight">{version.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover/ver:opacity-100 transition-all">
                                        <button onClick={() => onOpenVersion(version.path)} className="p-1 text-wv-gray hover:text-white"><ExternalLink size={12} /></button>
                                        <button onClick={() => onDeleteVersion(version.id, version.name)} className="p-1 text-wv-gray hover:text-red-500"><X size={12} /></button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => onPickVersionForTrack(track.id)}
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
    );
};
