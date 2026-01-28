import React, { useEffect, useRef, useState, useCallback } from "react";
import { SearchResult, ItemState } from "../types";
import { ResultCard } from "./ResultCard";
import { VirtualizedItem } from "./VirtualizedItem";
import { Search, Music, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../context/PlaybackContext";
import { useSettings } from "../context/SettingsContext";

interface SearchViewProps {
    query: string;
    setQuery: (query: string) => void;
    isSearching: boolean;
    results: SearchResult[];
    itemStates: Record<string, ItemState>;
    history: any[];
    onSearch: (e?: React.FormEvent) => void;
    onDownload: (result: SearchResult) => void;
    onOpenItem: (path?: string) => void;
    onStartDrag: () => void;
    onLoadMore: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
    query, setQuery, isSearching, results, itemStates, history,
    onSearch, onDownload, onOpenItem, onStartDrag, onLoadMore
}) => {
    const { config } = useSettings();
    const { playingUrl, isPreviewLoading, handleTogglePreview: onTogglePreview } = usePlayback();
    const isDark = config.theme === 'dark';
    const theme = config.theme;
    const { t } = useTranslation();
    const loaderRef = useRef<HTMLDivElement>(null);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const first = entries[0];
            if (first.isIntersecting && results.length > 0 && !isSearching) {
                onLoadMore();
            }
        }, { threshold: 0.1 });

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [results.length, isSearching, onLoadMore]);

    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-wv-bg">
            <form onSubmit={onSearch} className="relative mb-10">
                <div className={`absolute inset-y-0 left-5 flex items-center pointer-events-none ${isDark ? "text-wv-gray" : "text-black/30"}`}>
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    className={`
                        w-full rounded-2xl py-4 pl-12 pr-32 text-base outline-none transition-all
                        ${isDark
                            ? "bg-wv-surface border-white/5 text-white focus:border-white/10"
                            : "bg-white border-black/5 text-black placeholder:text-black/20 focus:border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"}
                    `}
                    placeholder={t('search.placeholder')}
                    value={query}
                    autoFocus
                    onChange={e => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-1.5 right-1.5">
                    <button
                        type="submit"
                        className={`
                            h-full px-8 rounded-xl text-sm disabled:opacity-50 transition-all font-bold tracking-widest uppercase
                            ${isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90 shadow-lg"}
                        `}
                        disabled={isSearching}
                    >
                        {isSearching ? <Loader2 className="animate-spin" size={18} /> : t('search.btnSearch')}
                    </button>
                </div>
            </form>

            <div className="min-h-[300px]">
                {results.length === 0 && !isSearching ? (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDark ? "opacity-20" : "opacity-10"}`}>
                        <Music size={60} strokeWidth={1.5} className="text-wv-text" />
                        <p className="mt-4 text-sm font-medium max-w-xs text-center text-wv-text">
                            {t('search.emptyState')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                            {results.map((r, i) => {
                                const state = itemStates[r.id] || { status: 'idle' as const };
                                const inHistory = history.some(h => h.id === r.id);

                                return (
                                    <VirtualizedItem key={r.id} id={r.id} minHeight={320}>
                                        <ResultCard
                                            result={r}
                                            state={state}
                                            inHistory={inHistory}
                                            onDownload={onDownload}
                                            onOpenItem={onOpenItem}
                                            onTogglePreview={onTogglePreview}
                                            isPlaying={playingUrl === r.url}
                                            isPreviewLoading={isPreviewLoading}
                                            theme={theme}
                                            onStartDrag={onStartDrag}
                                        />
                                    </VirtualizedItem>
                                );
                            })}
                        </div>

                        {/* Sentry for infinite scroll */}
                        <div ref={loaderRef} className="h-20 flex items-center justify-center">
                            {isSearching && results.length > 0 && (
                                <Loader2 className="animate-spin text-wv-gray opacity-30" size={32} />
                            )}
                        </div>
                    </>
                )}

                {isSearching && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-wv-gray opacity-30" size={40} />
                        <p className="mt-4 font-bold uppercase tracking-widest text-[10px] text-wv-gray">{t('search.searching')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
