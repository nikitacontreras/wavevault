import React from "react";
import { Search, X, Layout, Activity, Cpu, ArrowRight, FolderSearch, ExternalLink } from "lucide-react";
import { ProjectVersion } from "./types";
import { useTranslation } from "react-i18next";

interface RawProjectsViewProps {
    isDark: boolean;
    selectedWorkspaceId: string | null;
    workspaces: any[];
    filterMode: 'all' | 'raw' | 'nested';
    setFilterMode: (mode: 'all' | 'raw' | 'nested') => void;
    projectSearch: string;
    setProjectSearch: (s: string) => void;
    filteredVersions: ProjectVersion[];
    onMoveVersion: (version: ProjectVersion) => void;
    onOpenDetails: (version: ProjectVersion, meta: any) => void;
    onOpenVersion: (path: string) => void;
}

export const RawProjectsView: React.FC<RawProjectsViewProps> = ({
    isDark,
    selectedWorkspaceId,
    workspaces,
    filterMode,
    setFilterMode,
    projectSearch,
    setProjectSearch,
    filteredVersions,
    onMoveVersion,
    onOpenDetails,
    onOpenVersion
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-8 pt-8 pb-4">
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
                    {filteredVersions.map((version) => (
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
                            {(() => {
                                if (!version.metadata) return null;
                                try {
                                    const meta = JSON.parse(version.metadata);
                                    return (
                                        <div className="mb-3 flex flex-wrap gap-1.5 text-[8px] font-bold text-wv-gray">
                                            {meta.bpm && (
                                                <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-white/70" : "bg-black/5 text-black/70"} flex items-center gap-1`}>
                                                    <Activity size={8} /> {meta.bpm} BPM
                                                </span>
                                            )}
                                            {meta.flVersion && (
                                                <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-white/70" : "bg-black/5 text-black/70"} flex items-center gap-1`}>
                                                    FL {meta.flVersion.split(' ')[0] || meta.flVersion}
                                                </span>
                                            )}
                                            {meta.plugins && meta.plugins.length > 0 && (
                                                <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-white/70" : "bg-black/5 text-black/70"} flex items-center gap-1`}>
                                                    <Cpu size={8} /> {meta.plugins.length} Plugins
                                                </span>
                                            )}
                                        </div>
                                    );
                                } catch (e) {
                                    return null;
                                }
                            })()}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => onMoveVersion(version)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${version.trackId ? (isDark ? "bg-white/5 text-wv-gray hover:text-white" : "bg-black/5") : "bg-blue-600 text-white hover:bg-blue-700"}`}
                                >
                                    {version.trackId ? t('projects.reNest') : t('projects.nest')} <ArrowRight size={10} />
                                </button>
                                {version.metadata && (
                                    <button
                                        onClick={() => {
                                            try {
                                                const meta = JSON.parse(version.metadata!);
                                                onOpenDetails(version, meta);
                                            } catch (e) {}
                                        }}
                                        className={`p-1.5 rounded-lg transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}
                                        title={t('common.info') || "Detalles"}
                                    >
                                        <FolderSearch size={10} />
                                    </button>
                                )}
                                <button onClick={() => onOpenVersion(version.path)} className={`p-1.5 rounded-lg transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5"}`}>
                                    <ExternalLink size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
