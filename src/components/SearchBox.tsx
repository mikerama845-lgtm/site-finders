import React, { useId } from 'react';
import { Search, X, Globe, SlidersHorizontal, ArrowRight, CornerDownLeft } from 'lucide-react';
import { SearchMode } from '../types';
import { normalizeUrl } from '../utils/urlMatcher';

interface SearchBoxProps {
  query: string;
  setQuery: (val: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  onSearch: (customQuery?: string) => void;
  onClear: () => void;
  onOpenBatch: () => void;
  recentSearches: string[];
  totalSites: number;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  setQuery,
  searchMode,
  setSearchMode,
  onSearch,
  onClear,
  onOpenBatch,
  recentSearches,
  totalSites,
}) => {
  const searchInputId = useId();
  const normalized = query.trim() ? normalizeUrl(query) : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const samplePresets = [
    'techcrunch',
    'venture beat',
    'https://theverge.com/',
    'www.forbes.com/advisor/',
    'wired.com',
  ];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mode selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setSearchMode('smart')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchMode === 'smart'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Smart Match
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('exact')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchMode === 'exact'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Exact Domain
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('contains')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              searchMode === 'contains'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Keyword / Substring
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <button
            type="button"
            onClick={onOpenBatch}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer underline decoration-dotted"
          >
            Multiple URLs to check? Try Batch Search
          </button>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="relative">
        <label htmlFor={searchInputId} className="sr-only">Search reseller database</label>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5 text-emerald-400" />
        </div>

        <input
          id={searchInputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by site name or URL (e.g. techcrunch, venture beat, forbes.com, wired)..."
          className="w-full pl-12 pr-28 py-3.5 bg-slate-950/90 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
          autoFocus
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSearch()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer"
          >
            <span>Search</span>
            <CornerDownLeft className="w-3.5 h-3.5 text-slate-950/70" />
          </button>
        </div>
      </div>

      {/* Normalization Visual Feedback - Emphasizing Site Name */}
      {normalized && (
        <div className="mt-3 px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Name:</span>
          </span>
          <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {normalized.coreName || normalized.hostname || 'None'}
          </span>

          {normalized.hostname && normalized.hostname !== normalized.coreName && (
            <>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">Domain:</span>
              <span className="font-mono text-slate-300">{normalized.hostname}</span>
            </>
          )}

          {normalized.path && (
            <>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">Path:</span>
              <span className="font-mono text-slate-400">{normalized.path}</span>
            </>
          )}

          <span className="text-slate-600 ml-auto hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Matches site name directly (ignores www, https://, .com/, and trailing slashes)
          </span>
        </div>
      )}

      {/* Presets and Recent Searches */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Quick Test:</span>
          {samplePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuery(preset);
                onSearch(preset);
              }}
              className="text-slate-300 hover:text-emerald-400 font-mono text-[11px] underline decoration-slate-700 hover:decoration-emerald-400 transition-colors cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {recentSearches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Recent:</span>
            {recentSearches.slice(0, 3).map((hist) => (
              <button
                key={hist}
                type="button"
                onClick={() => {
                  setQuery(hist);
                  onSearch(hist);
                }}
                className="text-slate-400 hover:text-slate-200 font-mono text-[11px] transition-colors cursor-pointer"
              >
                {hist}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
