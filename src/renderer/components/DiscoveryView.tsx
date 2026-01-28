import React, { useState, useEffect } from "react";
import { ItemState } from "../types";
import { VirtualizedItem } from "./VirtualizedItem";
import { Shuffle, Loader2, Disc, Filter, ChevronDown, AlertCircle, Play, Pause, Download, Info, X, ExternalLink, Tag, Clock } from "lucide-react";
import { Waveform } from "./Waveform";
import { useTranslation } from "react-i18next";
import {
    searchDiscogs,
    getRandomDiscogs,
    getDiscogsRelease,
    DISCOGS_GENRES,
    DISCOGS_STYLES,
    DISCOGS_COUNTRIES,
    DiscogsRelease
} from "../services/discogs";

import { usePlayback } from "../context/PlaybackContext";
import { useSettings } from "../context/SettingsContext";
import { useLibrary } from "../context/LibraryContext";
import { useDownloadHandlers } from "../hooks/useDownloadHandlers";

interface EnrichedRelease extends DiscogsRelease {
    youtubeUrl?: string;
    streamUrl?: string;
    isLoadingStream?: boolean;
    youtubeTitle?: string;
    youtubeThumbnail?: string;
    peaks?: any;
    trackTitle?: string;
}

interface DiscoveryViewProps {
    onStartDrag: () => void;
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({ onStartDrag }) => {
    const { itemStates, history } = useLibrary();
    const { config } = useSettings();
    const { playingUrl, isPreviewLoading, handleTogglePreview: onTogglePreview } = usePlayback();
    const { handleDownload: onDownload, handleDownloadFromUrl: onDownloadFromUrl } = useDownloadHandlers();
    const { t } = useTranslation();
    const onOpenItem = (path?: string) => path && window.api.openItem(path);
    const discogsToken = config.discogsToken;

    // Enriched Discogs results with YouTube data
    const [loading, setLoading] = useState(false);
    const [releases, setReleases] = useState<EnrichedRelease[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const theme = config.theme;
    const isDark = theme === 'dark';
    // Detail modal
    const [selectedRelease, setSelectedRelease] = useState<EnrichedRelease | null>(null);

    // Discogs Filters
    const [showFilters, setShowFilters] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [selectedStyle, setSelectedStyle] = useState<string>('');
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [yearMin, setYearMin] = useState<string>('');
    const [yearMax, setYearMax] = useState<string>('');


    // Main dig function
    const handleDig = async () => {
        if (!discogsToken) {
            setError('No Discogs token set. Please add your token in Settings.');
            return;
        }

        setLoading(true);
        setError(null);
        setReleases([]);

        try {
            const yearRange = (yearMin || yearMax) ? {
                min: parseInt(yearMin) || 1950,
                max: parseInt(yearMax) || new Date().getFullYear()
            } : undefined;

            const result = await getRandomDiscogs(
                discogsToken,
                selectedGenre || undefined,
                selectedStyle || undefined,
                yearRange
            );

            // 1. Shuffle and take random 8 releases
            const shuffled = result.results.sort(() => Math.random() - 0.5).slice(0, 8);

            // 2. FETCH TRACKLISTS for each release to pick a random track
            // This makes the discovery based on tracks rather than just albums
            const detailedReleases = await Promise.all(shuffled.map(async (release) => {
                try {
                    const details = await getDiscogsRelease(discogsToken, release.id);
                    const tracklist = details.tracklist || [];
                    // Filter out tracks that are just headers or too short
                    const validTracks = tracklist.filter((t: any) => t.type_ === 'track' && t.title);

                    if (validTracks.length > 0) {
                        const randomTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
                        // Discogs release title is usually "Artist - Album"
                        const artistPart = release.title.split(' - ')[0];
                        return {
                            ...release,
                            trackTitle: randomTrack.title,
                            youtubeSearchQuery: `${artistPart} - ${randomTrack.title}`
                        };
                    }
                } catch (e) {
                    console.warn(`Failed to fetch details for release ${release.id}`, e);
                }
                return {
                    ...release,
                    youtubeSearchQuery: `${release.title} ${release.year || ''}`
                };
            }));

            // Set initial results with loading state
            setReleases(detailedReleases.map(r => ({ ...r, isLoadingStream: true })));
            setLoading(false);

            // BATCH ENRICHMENT: One single yt-dlp process for ALL queries
            const queries = detailedReleases.map((r: any) => r.youtubeSearchQuery);
            const ytResults = await (window as any).api.batchSearchAndStream(queries);

            // Update releases with the batch results
            const updatedReleases = await Promise.all(detailedReleases.map(async (release, i) => {
                const ytData = ytResults[i];
                if (ytData) {
                    // Check for cached peaks
                    const cachedPeaks = await (window as any).api.getCachedPeaks(ytData.youtubeUrl);
                    return {
                        ...release,
                        isLoadingStream: false,
                        youtubeUrl: ytData.youtubeUrl,
                        streamUrl: ytData.streamUrl,
                        youtubeTitle: ytData.title,
                        youtubeThumbnail: ytData.thumbnail,
                        peaks: cachedPeaks
                    };
                }
                return { ...release, isLoadingStream: false };
            }));

            setReleases(updatedReleases);

        } catch (e: any) {
            setError(e.message || 'Failed to fetch from Discogs');
            setLoading(false);
        }
    };

    // Handle play/pause
    const handlePlayPause = (release: EnrichedRelease) => {
        if (release.youtubeUrl) {
            onTogglePreview(release.youtubeUrl, {
                title: release.title,
                artist: release.label?.[0] || 'Discogs Release',
                thumbnail: release.cover_image || release.thumb
            } as any);
        }
    };

    // Check if a release is currently playing
    const isPlaying = (release: EnrichedRelease) => {
        return release.youtubeUrl && playingUrl === release.youtubeUrl;
    };

    // Handle download
    const handleDownload = async (release: EnrichedRelease) => {
        if (release.youtubeUrl && onDownloadFromUrl) {
            onDownloadFromUrl(release.youtubeUrl, release.title);
        }
    };

    const availableStyles = selectedGenre
        ? (DISCOGS_STYLES as any)[selectedGenre] || []
        : [];

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-wv-bg">
            {/* Header / Intro */}
            <div className={`border rounded-2xl p-8 mb-8 transition-all flex flex-col items-center text-center ${isDark ? "bg-wv-surface border-white/[0.05]" : "bg-wv-surface border-black/[0.08]"}`}>
                <div className={`p-4 rounded-3xl mb-4 ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                    <Disc size={40} className={`text-wv-text ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{t('discovery.title')}</h2>
                <p className="text-wv-gray text-xs font-medium mb-8 max-w-sm uppercase tracking-wide opacity-80">
                    {t('discovery.subtitle')}
                </p>

                {/* Filters Toggle and Main Button */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-black/5 hover:bg-black/10 text-black"}`}
                    >
                        <Filter size={14} />
                        {showFilters ? t('discovery.hideFilters') : t('discovery.showFilters')}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${showFilters ? "rotate-180" : ""}`} />
                    </button>

                    <button
                        onClick={handleDig}
                        disabled={loading || !discogsToken}
                        className={`
                            group relative overflow-hidden px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all
                            ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90 shadow-xl"}
                            disabled:opacity-50
                        `}
                    >
                        <span className="flex items-center gap-3">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Shuffle size={16} />}
                            {loading ? t('discovery.digging') : t('discovery.digDeeper')}
                        </span>
                    </button>
                </div>

                {/* Filters Panel - Collapsible */}
                {showFilters && (
                    <div className="w-full max-w-2xl mt-8 pt-8 border-t border-white/5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={10} /> {t('discovery.genre')}
                                </label>
                                <select
                                    value={selectedGenre}
                                    onChange={(e) => { setSelectedGenre(e.target.value); setSelectedStyle(''); }}
                                    className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[34px]"}`}
                                >
                                    <option value="">{t('common.any')} {t('discovery.genre')}</option>
                                    {DISCOGS_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Filter size={10} /> {t('discovery.style')}
                                </label>
                                <select
                                    value={selectedStyle}
                                    onChange={(e) => setSelectedStyle(e.target.value)}
                                    disabled={!selectedGenre}
                                    className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[34px]"} disabled:opacity-50`}
                                >
                                    <option value="">{t('common.any')} {t('discovery.style')}</option>
                                    {availableStyles.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Disc size={10} /> {t('discovery.country')}
                                </label>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className={`border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[34px]"}`}
                                >
                                    <option value="">{t('common.any')} {t('discovery.country')}</option>
                                    {DISCOGS_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={10} /> {t('discovery.years')}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={yearMin}
                                        onChange={(e) => setYearMin(e.target.value)}
                                        className={`w-1/2 border rounded-lg px-2 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[34px]"}`}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={yearMax}
                                        onChange={(e) => setYearMax(e.target.value)}
                                        className={`w-1/2 border rounded-lg px-2 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black h-[34px]"}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error/Warning */}
            {error && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
                    <AlertCircle size={16} />
                    <span className="text-xs">{error}</span>
                </div>
            )}

            {!discogsToken && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${isDark ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}>
                    <AlertCircle size={16} />
                    <span className="text-xs">{t('discovery.noToken')}</span>
                </div>
            )}

            <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-wv-gray mb-4">
                    {t('discovery.ready', { ready: releases.filter(r => !r.isLoadingStream).length, total: releases.length })}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {releases.map((release) => (
                        <VirtualizedItem key={release.id} id={release.id.toString()} minHeight={350}>
                            <div
                                className={`group rounded-xl overflow-hidden transition-all flex flex-col h-full ${isDark ? "bg-wv-surface border border-white/5 hover:border-white/20" : "bg-white border border-black/5 hover:border-black/20"}`}
                            >
                                {/* Cover Image */}
                                <div
                                    className="aspect-square relative overflow-hidden cursor-pointer"
                                    onClick={() => !release.isLoadingStream && handlePlayPause(release)}
                                >
                                    <img
                                        src={release.cover_image || release.thumb || 'https://via.placeholder.com/300?text=No+Cover'}
                                        alt={release.title}
                                        className={`w-full h-full object-cover transition-transform duration-300 ${release.isLoadingStream ? "opacity-50" : "group-hover:scale-105"}`}
                                    />

                                    {/* Loading Overlay */}
                                    {release.isLoadingStream && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <Loader2 className="animate-spin text-white" size={24} />
                                        </div>
                                    )}

                                    {/* Play/Pause Overlay */}
                                    {!release.isLoadingStream && release.streamUrl && (
                                        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isPlaying(release) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                                                {isPlaying(release) ? (
                                                    <Pause size={24} fill="currentColor" />
                                                ) : (
                                                    <Play size={24} fill="currentColor" className="ml-1" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* No stream available */}
                                    {!release.isLoadingStream && !release.streamUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                            <span className="text-white text-xs font-bold uppercase">{t('discovery.notFound')}</span>
                                        </div>
                                    )}

                                    {/* Playing indicator */}
                                    {isPlaying(release) && (
                                        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3 flex flex-col flex-1">
                                    <h4 className={`font-bold text-xs mb-0.5 truncate ${isDark ? "text-white" : "text-black"}`}>
                                        {release.trackTitle || release.title}
                                    </h4>
                                    {release.trackTitle && (
                                        <p className="text-[10px] text-wv-gray truncate mb-2 opacity-60">
                                            {release.title}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {release.year && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/5" : "bg-black/5"} text-wv-gray`}>
                                                {release.year}
                                            </span>
                                        )}
                                        {release.genre?.[0] && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/5" : "bg-black/5"} text-wv-gray`}>
                                                {release.genre[0]}
                                            </span>
                                        )}
                                    </div>

                                    {/* Waveform Preview when playing */}
                                    {isPlaying(release) && release.youtubeUrl && (
                                        <div className="px-1 mt-2 mb-3">
                                            <Waveform
                                                url={release.youtubeUrl}
                                                height={24}
                                                theme={theme}
                                                peaks={release.peaks}
                                                onPeaksGenerated={(peaks) => {
                                                    (window as any).api.savePeaks('cache', release.youtubeUrl, peaks);
                                                    setReleases(prev => prev.map(r => r.id === release.id ? { ...r, peaks } : r));
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-auto">
                                        <button
                                            onClick={() => setSelectedRelease(release)}
                                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 text-wv-gray" : "bg-black/5 hover:bg-black/10 text-black/60"}`}
                                        >
                                            <Info size={12} />
                                            {t('discovery.info')}
                                        </button>
                                        {release.youtubeUrl && (
                                            <button
                                                onClick={() => handleDownload(release)}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
                                            >
                                                <Download size={12} />
                                                {t('discovery.dl')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </VirtualizedItem>
                    ))}
                </div>
            </div>

            {/* Detail Modal */}
            {
                selectedRelease && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setSelectedRelease(null)}
                    >
                        <div
                            className={`relative w-full max-w-lg rounded-2xl overflow-hidden ${isDark ? "bg-wv-sidebar" : "bg-white"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header Image */}
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={selectedRelease.cover_image || selectedRelease.thumb}
                                    alt={selectedRelease.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <button
                                    onClick={() => setSelectedRelease(null)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="text-white font-black text-xl mb-1">{selectedRelease.title}</h3>
                                    <p className="text-white/60 text-sm">{selectedRelease.year}</p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {/* Genres & Styles */}
                                <div>
                                    <h4 className="text-[10px] font-bold text-wv-gray uppercase tracking-widest mb-2">{t('discovery.genresStyles')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRelease.genre?.map((g, i) => (
                                            <span key={i} className={`px-2 py-1 rounded-full text-xs font-bold ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                                                {g}
                                            </span>
                                        ))}
                                        {selectedRelease.style?.map((s, i) => (
                                            <span key={i} className={`px-2 py-1 rounded-full text-xs ${isDark ? "bg-white/10 text-white" : "bg-black/10 text-black"}`}>
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Labels & Formats */}
                                {(selectedRelease.label?.length > 0 || selectedRelease.format?.length > 0) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedRelease.label?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-bold text-wv-gray uppercase tracking-widest mb-1">{t('discovery.label')}</h4>
                                                <p className={`text-sm ${isDark ? "text-white" : "text-black"}`}>
                                                    {selectedRelease.label.join(', ')}
                                                </p>
                                            </div>
                                        )}
                                        {selectedRelease.format?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-bold text-wv-gray uppercase tracking-widest mb-1">{t('common.format')}</h4>
                                                <p className={`text-sm ${isDark ? "text-white" : "text-black"}`}>
                                                    {selectedRelease.format.join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Country */}
                                {selectedRelease.country && (
                                    <div>
                                        <h4 className="text-[10px] font-bold text-wv-gray uppercase tracking-widest mb-1">{t('discovery.country')}</h4>
                                        <p className={`text-sm ${isDark ? "text-white" : "text-black"}`}>{selectedRelease.country}</p>
                                    </div>
                                )}

                                {/* YouTube Match */}
                                {selectedRelease.youtubeTitle && (
                                    <div className={`p-3 rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                                        <h4 className="text-[10px] font-bold text-wv-gray uppercase tracking-widest mb-2">{t('discovery.youtubeMatch')}</h4>
                                        <p className={`text-xs ${isDark ? "text-white" : "text-black"}`}>{selectedRelease.youtubeTitle}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    {selectedRelease.streamUrl && (
                                        <button
                                            onClick={() => handlePlayPause(selectedRelease)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
                                        >
                                            {isPlaying(selectedRelease) ? <Pause size={18} /> : <Play size={18} />}
                                            {isPlaying(selectedRelease) ? t('common.cancel') : t('history.source')}
                                        </button>
                                    )}
                                    {selectedRelease.youtubeUrl && (
                                        <button
                                            onClick={() => handleDownload(selectedRelease)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/10 text-black hover:bg-black/20"}`}
                                        >
                                            <Download size={18} />
                                            {t('search.download')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            const uri = selectedRelease.uri;
                                            const fullUrl = uri?.startsWith('/')
                                                ? `https://www.discogs.com${uri}`
                                                : (uri || `https://www.discogs.com/release/${selectedRelease.id}`);
                                            (window as any).api.openExternal(fullUrl);
                                        }}
                                        className={`px-4 py-3 rounded-xl transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/10 text-black hover:bg-black/20"}`}
                                        title="View on Discogs"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
