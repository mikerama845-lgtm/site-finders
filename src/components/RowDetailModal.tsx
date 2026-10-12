import React, { useState } from 'react';
import { X, Copy, Check, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { MatchedResult } from '../types';

interface RowDetailModalProps {
  result: MatchedResult | null;
  onClose: () => void;
  onOpenSheetViewer?: (result: MatchedResult) => void;
}

export const RowDetailModal: React.FC<RowDetailModalProps> = ({ result, onClose, onOpenSheetViewer }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!result) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const entries = Object.entries(result.allFields);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Full Row Data Record</h3>
              <p className="text-xs text-slate-400">
                Vendor: <strong className="text-emerald-400">{result.vendorName}</strong> · Sheet: <strong className="text-slate-200">{result.sheetName}</strong> · Row: <strong className="text-slate-200">#{result.sheetRowNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result.directSheetUrl && (
              <a
                href={result.directSheetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                title={`Open directly in Google Sheets at Row ${result.sheetRowNumber}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Google Sheet (Row #{result.sheetRowNumber})</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Site Highlights */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Website / Target Domain</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-mono font-semibold text-emerald-300">
                {result.cleanDomain}
              </span>
              <a
                href={result.rawUrl.startsWith('http') ? result.rawUrl : `https://${result.rawUrl}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-400 hover:text-emerald-400 transition-colors"
                title="Open website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">
              {result.rawUrl}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {result.tabName && (
              <div className="bg-slate-900 border border-emerald-500/30 px-3 py-2 rounded-lg text-right">
                <span className="text-emerald-400 block text-[10px] font-sans font-semibold">SUB-SHEET / TAB</span>
                <span className="text-emerald-300 font-bold text-xs">{result.tabName}</span>
              </div>
            )}
            {result.rawPriceUsd && (
              <div className="bg-slate-900 border border-emerald-500/40 px-3 py-2 rounded-lg text-right">
                <span className="text-emerald-400 block text-[10px] font-sans font-semibold">USD PRICE</span>
                <span className="text-white font-bold text-sm">{result.rawPriceUsd}</span>
              </div>
            )}
            {result.rawPricePkr && (
              <div className="bg-slate-900 border border-amber-500/40 px-3 py-2 rounded-lg text-right">
                <span className="text-amber-400 block text-[10px] font-sans font-semibold">PKR PRICE</span>
                <span className="text-amber-300 font-bold text-sm">{result.rawPricePkr}</span>
              </div>
            )}
            {!result.rawPriceUsd && !result.rawPricePkr && result.rawPrice && (
              <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg text-right">
                <span className="text-slate-500 block text-[10px]">PRICE / RATE</span>
                <span className="text-emerald-400 font-semibold text-sm">{result.rawPrice}</span>
              </div>
            )}
            {result.linkInsertion && (
              <div className="bg-slate-900 border border-blue-500/40 px-3 py-2 rounded-lg text-right">
                <span className="text-blue-400 block text-[10px] font-sans font-semibold">LINK INSERTION</span>
                <span className="text-blue-300 font-bold text-sm">{result.linkInsertion}</span>
              </div>
            )}
            {result.tat && (
              <div className="bg-slate-900 border border-purple-500/40 px-3 py-2 rounded-lg text-right">
                <span className="text-purple-400 block text-[10px] font-sans font-semibold">TAT (TIME)</span>
                <span className="text-purple-300 font-bold text-sm">{result.tat}</span>
              </div>
            )}
            {result.niche && (
              <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg text-right">
                <span className="text-slate-500 block text-[10px]">NICHE</span>
                <span className="text-slate-200 font-medium text-xs">{result.niche}</span>
              </div>
            )}
            {result.dr && (
              <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg text-right">
                <span className="text-slate-500 block text-[10px]">DOMAIN RATING</span>
                <span className="text-slate-200 font-semibold text-sm">{result.dr}</span>
              </div>
            )}
            {result.traffic && (
              <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg text-right">
                <span className="text-slate-500 block text-[10px]">TRAFFIC</span>
                <span className="text-slate-200 font-semibold text-sm">{result.traffic}</span>
              </div>
            )}
          </div>
        </div>

        {/* Complete Key-Value Grid */}
        <div className="p-6 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            All CSV Columns & Values ({entries.length} fields)
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 bg-slate-950/40">
            {entries.map(([key, val]) => (
              <div key={key} className="p-3 flex items-start justify-between gap-4 text-xs hover:bg-slate-900/60 transition-colors">
                <div className="w-1/3 shrink-0 font-medium text-slate-400 font-mono truncate">
                  {key}
                </div>
                <div className="w-2/3 min-w-0 text-slate-200 break-words font-mono">
                  {val || <span className="text-slate-600 italic">Empty</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(val, key)}
                  className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0 cursor-pointer"
                  title="Copy field value"
                >
                  {copiedKey === key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const fullText = entries.map(([k, v]) => `${k}: ${v}`).join('\n');
              handleCopy(fullText, 'full');
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {copiedKey === 'full' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied All Fields</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Entire Row</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onOpenSheetViewer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSheetViewer(result);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Open in Sheet Viewer (Row #{result.sheetRowNumber})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
