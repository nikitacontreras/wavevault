import React from "react";
import { ArrowRight, Disc, ChevronRight, X, Search, Plus, Layout, Zap } from "lucide-react";
import { ProjectAlbum, ProjectVersion, ModalDataState } from "./types";
import { useTranslation } from "react-i18next";

interface ProjectsModalsProps {
    isDark: boolean;
    movingVersion: ProjectVersion | null;
    movingToAlbumId: string | null;
    setMovingVersion: (v: ProjectVersion | null) => void;
    setMovingToAlbumId: (id: string | null) => void;
    albums: ProjectAlbum[];
    allVersions: ProjectVersion[];
    onMoveToTrack: (trackId: string, customVId?: string) => void;
    isCreatingTrackInline: boolean;
    setIsCreatingTrackInline: (v: boolean) => void;
    inlineTrackName: string;
    setInlineTrackName: (name: string) => void;
    onConfirmCreateTrackInline: () => void;
    pickingVersionForTrackId: string | null;
    setPickingVersionForTrackId: (id: string | null) => void;
    linkSearch: string;
    setLinkSearch: (s: string) => void;
    modalData: ModalDataState;
    setModalData: (data: ModalDataState) => void;
    onModalSubmit: () => void;
    detectedDaws: any[];
    savedDaws: any[];
    onManualDAWPick: () => void;
    onSaveDAW: (daw: any) => void;
}

export const ProjectsModals: React.FC<ProjectsModalsProps> = ({
    isDark,
    movingVersion,
    movingToAlbumId,
    setMovingVersion,
    setMovingToAlbumId,
    albums,
    allVersions,
    onMoveToTrack,
    isCreatingTrackInline,
    setIsCreatingTrackInline,
    inlineTrackName,
    setInlineTrackName,
    onConfirmCreateTrackInline,
    pickingVersionForTrackId,
    setPickingVersionForTrackId,
    linkSearch,
    setLinkSearch,
    modalData,
    setModalData,
    onModalSubmit,
    detectedDaws,
    savedDaws,
    onManualDAWPick,
    onSaveDAW
}) => {
    const { t } = useTranslation();

    return (
        <>
            {/* Modal de Mover / Anidar Versión */}
            {movingVersion && (
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
                                    {albums.map((album) => (
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
                                    {albums.length === 0 && (
                                        <div className="text-center py-10 opacity-30">
                                            <p className="text-[10px] font-black uppercase tracking-widest">{t('projects.noCollections')}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <button onClick={() => setMovingToAlbumId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-wv-gray"><X size={14} /></button>
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-wv-gray/40">{t('projects.collectionLabel')} {albums.find(a => a.id === movingToAlbumId)?.name}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1.5">
                                        {albums.find(a => a.id === movingToAlbumId)?.tracks.map((track) => (
                                            <button key={track.id} onClick={() => onMoveToTrack(track.id)} className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all ${isDark ? "bg-white/5 border-white/5 hover:bg-blue-600 text-white" : "bg-black/5 hover:bg-black/10"}`}>
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
                                                        onKeyDown={(e) => e.key === 'Enter' && onConfirmCreateTrackInline()}
                                                        className={`flex-1 px-4 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${isDark ? "bg-black/20 border-white/5 focus:border-blue-500/50" : "bg-white border-black/5 focus:border-black/20"}`}
                                                    />
                                                    <button
                                                        onClick={onConfirmCreateTrackInline}
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
            )}

            {/* Modal de Vincular Raw Project a Track */}
            {pickingVersionForTrackId && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                    <div className={`max-w-md w-full max-h-[85vh] p-8 rounded-[2.5rem] border shadow-2xl flex flex-col ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
                        <div className="text-center mb-6">
                            <Plus size={24} className="text-blue-500 mx-auto mb-3" />
                            <h2 className="text-lg font-black tracking-tight">{t('projects.linkProject')}</h2>
                            <p className="text-[10px] text-wv-gray font-bold uppercase tracking-widest mt-1">{t('projects.selectRawFor', { name: albums.flatMap(a => a.tracks).find(t => t.id === pickingVersionForTrackId)?.name || "" })}</p>
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
                            {allVersions
                                .filter(v => v.isUnorganized === 1)
                                .filter(v => !linkSearch || (v.name && v.name.toLowerCase().includes(linkSearch.toLowerCase())))
                                .map((version) => (
                                    <button
                                        key={version.id}
                                        onClick={() => {
                                            onMoveToTrack(pickingVersionForTrackId, version.id);
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
                            {allVersions.filter(v => v.isUnorganized === 1).filter(v => !linkSearch || (v.name && v.name.toLowerCase().includes(linkSearch.toLowerCase()))).length === 0 && (
                                <div className="text-center py-10 opacity-30 border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest">{t('projects.noResults')}</p>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { setPickingVersionForTrackId(null); setLinkSearch(""); }} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            {/* Modal Dinámico (Crear/Editar Álbum, Track, Ajustes DAW, Detalles Proyecto) */}
            {modalData.show && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-6">
                    <div className={`${modalData.type === 'daw-settings' || modalData.type === 'project-details' ? 'max-w-xl' : 'max-w-sm'} w-full p-8 rounded-[2.5rem] border shadow-2xl ${isDark ? "bg-wv-sidebar border-white/10" : "bg-white border-black/10"}`}>
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
                                            onClick={onManualDAWPick}
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
                                                            onClick={() => isSaved ? null : onSaveDAW(daw)}
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
                        ) : modalData.type === 'project-details' ? (
                            <div className="space-y-4 text-wv-gray max-h-[60vh] overflow-y-auto pr-1 projects-scroll text-xs">
                                <div className={`grid grid-cols-2 gap-3 p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-0.5">BPM / Tempo</span>
                                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-black'}`}>{modalData.data?.bpm ? `${modalData.data.bpm} BPM` : '--'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-0.5">FL Studio Version</span>
                                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-black'}`}>{modalData.data?.flVersion || '--'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-0.5">Time Signature</span>
                                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-black'}`}>{modalData.data?.timeSignature || '--'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-0.5">Genre</span>
                                        <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-black'}`}>{modalData.data?.genre || '--'}</span>
                                    </div>
                                    {modalData.data?.artists && (
                                        <div className="col-span-2">
                                            <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-0.5">Artists</span>
                                            <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-black'}`}>{modalData.data.artists}</span>
                                        </div>
                                    )}
                                </div>

                                {modalData.data?.comments && (
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-1.5">Comments</span>
                                        <p className={`font-bold whitespace-pre-wrap leading-relaxed ${isDark ? 'text-white/80' : 'text-black/80'}`}>{modalData.data.comments}</p>
                                    </div>
                                )}

                                {modalData.data?.plugins && modalData.data.plugins.length > 0 && (
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-2">Plugins Used ({modalData.data.plugins.length})</span>
                                        <div className="flex flex-wrap gap-1">
                                            {modalData.data.plugins.map((plugin: string, idx: number) => (
                                                <span key={idx} className={`px-2 py-1 rounded-lg text-[9px] font-bold border ${isDark ? 'bg-white/5 text-white/90 border-white/5' : 'bg-black/5 text-black/90 border-black/5'}`}>
                                                    {plugin}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {modalData.data?.samples && modalData.data.samples.length > 0 && (
                                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                                        <span className="text-[8px] font-black uppercase tracking-wider block opacity-50 mb-2">Audio Samples Used ({modalData.data.samples.length})</span>
                                        <div className="space-y-1 max-h-40 overflow-y-auto projects-scroll pr-1">
                                            {modalData.data.samples.map((sample: string, idx: number) => (
                                                <p key={idx} className={`text-[9px] truncate font-mono p-1.5 rounded ${isDark ? 'bg-white/5 text-white/70' : 'bg-black/5 text-black/70'}`} title={sample}>
                                                    {sample}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 flex">
                                    <button onClick={() => setModalData({ ...modalData, show: false })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"}`}>{t('common.close') || 'Cerrar'}</button>
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
                                                    onKeyDown={(e) => e.key === 'Enter' && onModalSubmit()}
                                                    className={`w-full px-4 py-3 rounded-xl border transition-all text-xs font-bold outline-none ${isDark ? "bg-white/5 border-white/5 focus:border-blue-500/50" : "bg-black/5 border-black/5 focus:border-black/20"}`}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2.5">
                                    <button onClick={() => setModalData({ ...modalData, show: false })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDark ? "bg-white/5" : "bg-black/5"}`}>{t('common.cancel')}</button>
                                    <button onClick={onModalSubmit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10">{t('common.save')}</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
