import React from "react";
import { SearchResult, ItemState } from "../types";
import { ResultCard } from "./ResultCard";
import { Search, Music, Loader2, Sparkles } from "lucide-react";

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
    onTogglePreview: (url: string) => void;
    playingUrl: string | null;
}

export const SearchView: React.FC<SearchViewProps> = ({
    query,
    setQuery,
    isSearching,
    results,
    itemStates,
    history,
    onSearch,
    onDownload,
    onOpenItem,
    onTogglePreview,
    playingUrl
}) => {
    return (
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
            <form onSubmit={onSearch} className="relative mb-10">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-wv-gray">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    className="w-full bg-wv-sidebar border border-white/5 rounded-2xl py-4 pl-12 pr-32 text-base outline-none transition-all focus:border-white/10 focus:bg-white/[0.02]"
                    placeholder="Busca por género, artista o link..."
                    value={query}
                    autoFocus
                    onChange={e => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-1.5 right-1.5">
                    <button
                        type="submit"
                        className="wv-btn wv-btn-primary h-full px-8 rounded-xl text-sm disabled:opacity-50"
                        disabled={isSearching}
                    >
                        {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Buscar"}
                    </button>
                </div>
            </form>

            <div className="min-h-[300px]">
                {results.length === 0 && !isSearching ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <Music size={60} strokeWidth={1.5} />
                        <p className="mt-4 text-sm font-medium max-w-xs text-center">
                            Encuentra nuevos sonidos para tu producción musical
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                        {results.map((r, i) => {
                            const state = itemStates[r.id] || { status: 'idle' as const };
                            const inHistory = history.some(h => h.id === r.id);

                            return (
                                <ResultCard
                                    key={r.id + i}
                                    result={r}
                                    state={state}
                                    inHistory={inHistory}
                                    onDownload={onDownload}
                                    onOpenItem={onOpenItem}
                                    onTogglePreview={onTogglePreview}
                                    isPlaying={playingUrl === r.url}
                                />
                            );
                        })}
                    </div>
                )}

                {isSearching && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-white/10" size={40} />
                        <p className="mt-4 text-wv-gray font-bold uppercase tracking-widest text-[10px]">Escaneando archivos...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
