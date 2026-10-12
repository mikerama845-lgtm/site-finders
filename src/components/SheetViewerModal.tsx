import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FileSpreadsheet,
  Link as LinkIcon,
  Search,
  Crosshair,
  UserCheck,
  Edit2,
} from 'lucide-react';
import { MatchedResult, SheetFile } from '../types';

interface SheetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MatchedResult | null;
  sheet: SheetFile | null;
  onUpdateSourceUrl?: (sheetId: string, newUrl: string) => void;
}

export const SheetViewerModal: React.FC<SheetViewerModalProps> = ({
  isOpen,
  onClose,
  result,
  sheet,
  onUpdateSourceUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const targetRowRef = useRef<HTMLTableRowElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the matched row when opened
  useEffect(() => {
    if (isOpen && targetRowRef.current) {
      setTimeout(() => {
        targetRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 200);
    }
    if (sheet?.sourceUrl) {
      setUrlInput(sheet.sourceUrl);
    }
  }, [isOpen, result, sheet]);

  if (!isOpen || !result || !sheet) return null;

  const targetRowIndex = result.rowIndex - 1; // 0-based index in sheet.rows
  const targetRowNumber = result.sheetRowNumber; // 1-based row in Google Sheets (Row 1 = header, Row 2 = first data)

  // Direct link to Google Sheets
  const directUrl = result.directSheetUrl || (
    sheet.sourceUrl
      ? `${sheet.sourceUrl.split('#')[0].split('?')[0]}#gid=${sheet.gid || '0'}&range=A${targetRowNumber}`
      : null
  );

  const handleCopyDirectLink = () => {
    if (!directUrl) return;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveUrl = () => {
    if (urlInput.trim() && onUpdateSourceUrl) {
      onUpdateSourceUrl(sheet.id, urlInput.trim());
    }
    setIsEditingUrl(false);
  };

  // Filter rows if user types in search inside the sheet viewer
  const displayedRows = sheet.rows.map((r, idx) => ({ row: r, originalIdx: idx })).filter(({ row }) => {
    if (!sheetSearch.trim()) return true;
    const q = sheetSearch.toLowerCase();
    return Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">
                  Sheet Location: <span className="text-emerald-400">{sheet.name}</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Target Row #{targetRowNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                <span>Vendor: <strong className="text-slate-200">{result.vendorName}</strong></span>
                <span className="text-slate-600">·</span>
                <span>Target Site: <strong className="text-emerald-300 font-mono">{result.cleanDomain}</strong></span>
                <span className="text-slate-600">·</span>
                <span>Total: {sheet.rowCount.toLocaleString()} rows</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Google Sheets Jump Button */}
            {directUrl ? (
              <a
                href={directUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                title="Opens Google Sheets and highlights this exact row"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Google Sheets (Row {targetRowNumber})</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingUrl(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
                title="Link this sheet to an online Google Sheet URL"
              >
                <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Google Sheet URL</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action / Context Sub-bar */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Filter inside this sheet..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                targetRowRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Jump viewport directly to the matched row"
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>Jump to Target Row #{targetRowNumber}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px]">
            {result.tabName && (
              <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                Tab: {result.tabName}
              </span>
            )}
            {result.rawPriceUsd && (
              <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                USD: {result.rawPriceUsd}
              </span>
            )}
            {result.rawPricePkr && (
              <span className="font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                PKR: {result.rawPricePkr}
              </span>
            )}
            {result.linkInsertion && (
              <span className="font-mono text-blue-300 font-semibold bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded">
                Link Insert: {result.linkInsertion}
              </span>
            )}
            {result.tat && (
              <span className="font-mono text-purple-300 font-semibold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                TAT: {result.tat}
              </span>
            )}
            {directUrl && (
              <button
                type="button"
                onClick={handleCopyDirectLink}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer ml-1"
                title="Copy link that opens Google Sheets directly at this row"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Row Link Copied!' : 'Copy Direct Row Link'}</span>
              </button>
            )}
          </div>

        </div>

        {/* URL Link Input Drawer if user wants to set/change Google Sheet link */}
        {isEditingUrl && (
          <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-400 shrink-0 font-medium">Google Sheet URL:</span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={handleSaveUrl}
              className="px-3 py-1 bg-emerald-500 text-slate-950 font-semibold rounded hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Save Link
            </button>
            <button
              type="button"
              onClick={() => setIsEditingUrl(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Spreadsheet Table Viewport with Auto-Scroll to Target Row */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-4">
          <div className="border border-slate-800 rounded-lg overflow-hidden shadow-inner">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              
              {/* Sticky Column Headers */}
              <thead className="bg-slate-900 text-slate-400 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center bg-slate-900/95 border-r border-slate-800 font-mono">
                    # Row
                  </th>
                  {sheet.columns.map((col, idx) => (
                    <th key={idx} className="py-2.5 px-3 bg-slate-900/95 border-r border-slate-800 last:border-r-0 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Rows with High-Visibility Matched Target Row */}
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {displayedRows.map(({ row, originalIdx }) => {
                  const isTarget = originalIdx === targetRowIndex;
                  const rowNumber = originalIdx + 2;

                  return (
                    <tr
                      key={originalIdx}
                      ref={isTarget ? targetRowRef : undefined}
                      className={`transition-colors ${
                        isTarget
                          ? 'bg-emerald-950/60 ring-2 ring-emerald-500 ring-inset shadow-lg'
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Row Number Column */}
                      <td
                        className={`py-2 px-3 text-center border-r border-slate-800 text-[11px] font-bold ${
                          isTarget
                            ? 'bg-emerald-500 text-slate-950 font-sans'
                            : 'text-slate-500 bg-slate-950/80'
                        }`}
                      >
                        {isTarget ? (
                          <div className="flex items-center justify-center gap-1" title="Matched Row!">
                            <span>★</span>
                            <span>{rowNumber}</span>
                          </div>
                        ) : (
                          rowNumber
                        )}
                      </td>

                      {/* Data Columns */}
                      {sheet.columns.map((col, cIdx) => {
                        const cellVal = row[col] || '';
                        const isDomainCell = cellVal.toLowerCase().includes(result.cleanDomain.toLowerCase());

                        return (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 border-r border-slate-800/60 last:border-r-0 max-w-xs truncate text-[11px] ${
                              isTarget
                                ? isDomainCell
                                  ? 'text-emerald-300 font-bold bg-emerald-500/20'
                                  : 'text-slate-100 font-semibold'
                                : 'text-slate-300'
                            }`}
                            title={cellVal}
                          >
                            {cellVal || <span className="text-slate-700 italic">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span>Target row <strong className="text-white font-mono">#{targetRowNumber}</strong> is automatically centered and highlighted above.</span>
          </div>

          <div className="flex items-center gap-2">
            {directUrl && (
              <a
                href={directUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Google Sheets</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
            >
              Close Viewer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
