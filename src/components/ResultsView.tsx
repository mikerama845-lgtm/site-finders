import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  Download,
  Eye,
  TrendingDown,
  SearchX,
  Sparkles,
  Link as LinkIcon,
  FileText,
  UserCheck,
  Clock,
  Layers,
  Loader2,
} from 'lucide-react';
import { MatchedResult, SheetFile } from '../types';

interface ResultsViewProps {
  results: MatchedResult[];
  hasSearched: boolean;
  searchedQuery: string;
  sheets: SheetFile[];
  isLoading?: boolean;
  onSelectRow: (result: MatchedResult) => void;
  onOpenSheetViewer: (result: MatchedResult) => void;
  onOpenPasteUrls: () => void;
  onOpenPasteSingle: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  hasSearched,
  searchedQuery,
  sheets,
  isLoading = false,
  onSelectRow,
  onOpenSheetViewer,
  onOpenPasteUrls,
  onOpenPasteSingle,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);

  // If restoring saved sheets on page reload
  if (isLoading && sheets.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 sm:p-12 text-center">
        <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 animate-spin">
          <Loader2 className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">
          Restoring your saved sheets and vendors...
        </h3>
        <p className="text-xs text-slate-400">
          Loading from database and local storage. No re-uploading needed.
        </p>
      </div>
    );
  }

  // If no sheets loaded at all
  if (sheets.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-10 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          No Reseller Sheets Loaded Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
          Paste your 20+ Google Sheet URLs from Notepad or copy-paste sheet data directly to start searching instantly.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenPasteUrls}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Paste Google Sheet Links</span>
          </button>
          <button
            type="button"
            onClick={onOpenPasteSingle}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Paste Sheet Data</span>
          </button>
        </div>
      </div>
    );
  }

  // If user searched but 0 results found
  if (hasSearched && results.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 sm:p-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">
          No sites found for "{searchedQuery}"
        </h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6 leading-relaxed">
          We scanned all <strong className="text-slate-200">{sheets.length} loaded sheets</strong> ({sheets.reduce((acc, s) => acc + s.rowCount, 0).toLocaleString()} rows). The site is not currently listed in any of your vendor sheets.
        </p>

        <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenPasteUrls}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Add More Google Sheet Links</span>
          </button>
          <button
            type="button"
            onClick={onOpenPasteSingle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Paste Another Sheet</span>
          </button>
        </div>
      </div>
    );
  }

  // If haven't searched yet, show initial welcoming guidance
  if (!hasSearched) {
    const totalRows = sheets.reduce((acc, s) => acc + s.rowCount, 0);
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">
          {sheets.length} {sheets.length === 1 ? 'Sheet' : 'Sheets'} Ready ({totalRows.toLocaleString()} rows)
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
          Enter any website name (e.g. <span className="font-mono text-emerald-400">techcrunch.com</span> or <span className="font-mono text-emerald-400">forbes.com</span>) in the search bar above to compare exact vendor prices, link insertions, and turnaround times.
        </p>
      </div>
    );
  }

  // Lowest price calculation (comparison)
  const pricedResults = results.filter(r => r.price !== undefined && r.price > 0);
  const minPrice = pricedResults.length > 0 ? Math.min(...pricedResults.map(r => r.price!)) : null;
  const maxPrice = pricedResults.length > 0 ? Math.max(...pricedResults.map(r => r.price!)) : null;
  const bestResult = pricedResults.find(r => r.price === minPrice);
  const otherHighVendor = pricedResults.find(r => r.price === maxPrice && r.vendorName !== bestResult?.vendorName);
  const priceDifference = minPrice !== null && maxPrice !== null && minPrice < maxPrice ? maxPrice - minPrice : 0;

  const handleCopyQuickQuote = () => {
    if (results.length === 0) return;
    const top = results[0];
    const text = [
      `Vendor: ${top.vendorName}`,
      top.tabName ? `Sub-sheet/Tab: ${top.tabName}` : null,
      `Website: ${top.cleanDomain}`,
      top.rawPriceUsd && top.rawPricePkr
        ? `Price: ${top.rawPriceUsd} (USD) / ${top.rawPricePkr}`
        : top.rawPrice ? `Price: ${top.rawPrice}` : `Price: Not Listed`,
      top.linkInsertion ? `Link Insert: ${top.linkInsertion}` : null,
      top.tat ? `TAT: ${top.tat}` : null,
      top.niche ? `Niche: ${top.niche}` : null,
      top.dr ? `DR: ${top.dr}` : null,
      top.traffic ? `Traffic: ${top.traffic}` : null,
      `Sheet: ${top.sheetName} (Row ${top.sheetRowNumber})`,
    ].filter(Boolean).join(' | ');

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const handleExportCsv = () => {
    const headers = [
      'Vendor Name',
      'Sub-sheet / Tab',
      'Target Website',
      'Price USD',
      'Price PKR',
      'Combined Price',
      'Link Insertion Service',
      'Turnaround Time (TAT)',
      'Niche / Category',
      'DR',
      'Traffic',
      'Link Type',
      'Sheet Name',
      'Row Number',
      'Google Sheet Direct Link',
      'Full URL'
    ];
    const rows = results.map(r => [
      `"${r.vendorName}"`,
      `"${r.tabName || ''}"`,
      `"${r.cleanDomain}"`,
      `"${r.rawPriceUsd || ''}"`,
      `"${r.rawPricePkr || ''}"`,
      `"${r.rawPrice || ''}"`,
      `"${r.linkInsertion || ''}"`,
      `"${r.tat || ''}"`,
      `"${r.niche || ''}"`,
      `"${r.dr || ''}"`,
      `"${r.traffic || ''}"`,
      `"${r.linkType || ''}"`,
      `"${r.sheetName}"`,
      r.sheetRowNumber,
      `"${r.directSheetUrl || ''}"`,
      `"${r.rawUrl}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEO_Site_Results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      
      {/* Search Result Summary Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Search Results</h3>
            <span className="px-2 py-0.5 text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
              {results.length} {results.length === 1 ? 'match' : 'matches'} found
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Query: <span className="font-mono text-slate-200 font-medium">{searchedQuery}</span> · Found in {new Set(results.map(r => r.vendorName)).size} vendor(s)
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleCopyQuickQuote}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Copies a complete client quote with vendor, rates, link insert, and TAT"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedQuote ? 'Quote Copied' : 'Copy Client Quote'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Real Price Arbitrage Banner (Only if genuine prices exist and differ) */}
      {priceDifference > 0 && bestResult && otherHighVendor && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <span className="text-emerald-300 font-semibold">Reseller Price Difference: </span>
              <span className="text-slate-200">
                Lowest rate is <strong className="text-emerald-400 font-mono text-sm">{bestResult.rawPrice}</strong> from <strong className="text-white font-semibold">Vendor: {bestResult.vendorName}</strong>
              </span>
              <span className="text-emerald-400 font-medium block sm:inline sm:ml-2">
                (Save {bestResult.currency === 'PKR' ? `PKR ${priceDifference.toLocaleString()}` : `$${priceDifference}`} vs Vendor {otherHighVendor.vendorName} charging {otherHighVendor.rawPrice})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectRow(bestResult)}
            className="self-end sm:self-auto px-2.5 py-1 text-[11px] font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            View Vendor Details
          </button>
        </div>
      )}

      {/* Results Table with PROMINENT VENDOR NAME, DUAL PRICE, LINK INSERT, & TAT */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Exact Vendor Name</th>
                <th className="py-3 px-4">Target Website / Domain</th>
                <th className="py-3 px-4 text-right">Price / Rate (USD & PKR)</th>
                <th className="py-3 px-4 text-center">Link Insert</th>
                <th className="py-3 px-4 text-center">TAT</th>
                <th className="py-3 px-4 text-center">DR</th>
                <th className="py-3 px-4 text-right">Traffic</th>
                <th className="py-3 px-4">Niche / Category</th>
                <th className="py-3 px-4">Sheet & Row</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {results.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    item.isLowestPrice ? 'bg-emerald-950/15' : ''
                  }`}
                >
                  {/* EXACT VENDOR NAME COLUMN */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white text-xs block truncate max-w-[170px]" title={item.vendorName}>
                          {item.vendorName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.tabName && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] shrink-0" title={`Sub-sheet / Section: ${item.tabName}`}>
                              {item.tabName}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 truncate block max-w-[130px]" title={item.sheetName}>
                            {item.sheetName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Clean Domain & Raw URL */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-300">
                        {item.cleanDomain}
                      </span>
                      <a
                        href={item.rawUrl.startsWith('http') ? item.rawUrl : `https://${item.rawUrl}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-slate-500 hover:text-emerald-400 transition-colors"
                        title="Open external website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={item.rawUrl}>
                      {item.rawUrl}
                    </div>
                  </td>

                  {/* Price: PROMINENT USD & PKR DUAL DISPLAY */}
                  <td className="py-3.5 px-4 text-right font-mono">
                    {item.rawPrice ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {/* Both USD and PKR present */}
                        {item.rawPriceUsd && item.rawPricePkr ? (
                          <>
                            <div className="inline-flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                              <span>{item.rawPriceUsd}</span>
                              <span className="text-[9px] font-sans font-semibold px-1 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded">
                                USD
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 font-semibold text-amber-300 text-xs">
                              <span>{item.rawPricePkr}</span>
                              <span className="text-[9px] font-sans font-semibold px-1 py-0.2 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded">
                                PKR
                              </span>
                            </div>
                          </>
                        ) : item.rawPriceUsd ? (
                          <div className="inline-flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                            <span>{item.rawPriceUsd}</span>
                            <span className="text-[9px] font-sans font-semibold px-1 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded">
                              USD
                            </span>
                          </div>
                        ) : item.rawPricePkr ? (
                          <div className="inline-flex items-center gap-1.5 font-bold text-amber-300 text-sm">
                            <span>{item.rawPricePkr}</span>
                            <span className="text-[9px] font-sans font-semibold px-1 py-0.2 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded">
                              PKR
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-emerald-400">
                            {item.rawPrice}
                          </div>
                        )}

                        {item.isLowestPrice && (
                          <div className="text-[10px] font-sans font-semibold text-emerald-300 uppercase tracking-tight mt-0.5">
                            ★ Lowest Price
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px] font-sans italic" title="No price column or price value in this sheet row">
                        Not Listed
                      </span>
                    )}
                  </td>

                  {/* DEDICATED LINK INSERTION COLUMN */}
                  <td className="py-3.5 px-4 text-center">
                    {item.linkInsertion ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-[11px] text-blue-300 font-mono font-semibold"
                        title={`Link Insertion Service: ${item.linkInsertion}`}
                      >
                        <LinkIcon className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>{item.linkInsertion}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* DEDICATED TAT (Turnaround Time) COLUMN */}
                  <td className="py-3.5 px-4 text-center">
                    {item.tat ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-[11px] text-purple-300 font-mono font-medium"
                        title={`Turnaround Time: ${item.tat}`}
                      >
                        <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                        <span>{item.tat}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* DR */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    {item.dr ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700/60">
                        {item.dr}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Traffic */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {item.traffic || <span className="text-slate-600">—</span>}
                  </td>

                  {/* Niche / Category */}
                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="max-w-[130px] truncate" title={item.niche || ''}>
                      {item.niche ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px]">
                          {item.niche}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </td>

                  {/* Sheet & Serial/Row with Direct Jump */}
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="font-mono text-slate-200 flex items-center gap-1.5 font-semibold">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Row #{item.sheetRowNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={item.sheetName}>
                      {item.sheetName}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.directSheetUrl ? (
                        <a
                          href={item.directSheetUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                          title={`Open Google Sheets directly at Row ${item.sheetRowNumber}`}
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Open in Google Sheet</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenSheetViewer(item)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 transition-colors cursor-pointer"
                          title="Open full sheet view centered and highlighted on this row"
                        >
                          <span>Open in Sheet</span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Jump to sheet row locator button */}
                      <button
                        type="button"
                        onClick={() => onOpenSheetViewer(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Locate exact row inside sheet viewer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const quoteStr = [
                            `Vendor: ${item.vendorName}`,
                            `Site: ${item.cleanDomain}`,
                            item.rawPriceUsd && item.rawPricePkr
                              ? `USD: ${item.rawPriceUsd} | PKR: ${item.rawPricePkr}`
                              : item.rawPrice ? `Price: ${item.rawPrice}` : 'Price: Ask',
                            item.linkInsertion ? `Link Insert: ${item.linkInsertion}` : null,
                            item.tat ? `TAT: ${item.tat}` : null,
                            item.niche ? `Niche: ${item.niche}` : null,
                            `Row: ${item.sheetRowNumber}`,
                          ].filter(Boolean).join(' | ');
                          handleCopySingle(item.id, quoteStr);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Copy row quote"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectRow(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="View all columns & vendor details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
