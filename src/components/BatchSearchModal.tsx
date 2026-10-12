import React, { useState } from 'react';
import { X, Search, CheckCircle2, XCircle, Copy, Download, ArrowRight } from 'lucide-react';
import { SheetFile, BatchSearchItemResult } from '../types';
import { batchSearchSheets } from '../utils/searchEngine';

interface BatchSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: SheetFile[];
  onSelectSingleQuery: (url: string) => void;
}

export const BatchSearchModal: React.FC<BatchSearchModalProps> = ({
  isOpen,
  onClose,
  sheets,
  onSelectSingleQuery,
}) => {
  const [inputText, setInputText] = useState(
    'https://techcrunch.com\nforbes.com\nventurebeat.com\nhealthline.com\nnonexistentdomain99.org'
  );
  const [results, setResults] = useState<BatchSearchItemResult[] | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunBatch = () => {
    const urls = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const batchRes = batchSearchSheets(sheets, urls, 'smart');
    setResults(batchRes);
  };

  const handleCopySummary = () => {
    if (!results) return;
    const lines = results.map(r => {
      if (r.status === 'found') {
        return `✅ ${r.query} -> Available in "${r.bestSheetName}" | Best Price: $${r.lowestPrice ?? 'N/A'}`;
      } else {
        return `❌ ${r.query} -> Not found in current sheets`;
      }
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (!results) return;
    const csvRows = [
      ['Query URL', 'Status', 'Matches Count', 'Best Price ($)', 'Best Reseller Sheet'].join(','),
      ...results.map(r => [
        `"${r.query}"`,
        r.status,
        r.matches.length,
        r.lowestPrice ?? '',
        `"${r.bestSheetName || ''}"`,
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_SEO_Search_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const foundCount = results ? results.filter(r => r.status === 'found').length : 0;
  const notFoundCount = results ? results.filter(r => r.status === 'not_found').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Batch Multi-URL Lookup</h3>
            <p className="text-xs text-slate-400">
              Paste a list of URLs (one per line) from your client or email to check all sheets simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Enter Target Domains / URLs (1 per line):
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="https://example.com&#10;forbes.com&#10;techcrunch.com..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Checking across <strong className="text-emerald-400">{sheets.length}</strong> loaded sheets
            </span>
            <button
              type="button"
              onClick={handleRunBatch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Run Batch Match</span>
            </button>
          </div>

          {/* Batch Results Table */}
          {results && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-semibold">Results:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {foundCount} Found
                  </span>
                  <span className="text-slate-400 flex items-center gap-1 font-mono">
                    <XCircle className="w-3.5 h-3.5 text-slate-500" /> {notFoundCount} Not in sheets
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{isCopied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Queried URL</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Lowest Price</th>
                      <th className="py-2.5 px-3">Best Vendor</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-medium text-slate-200 truncate max-w-xs">
                          {res.query}
                        </td>
                        <td className="py-2.5 px-3">
                          {res.status === 'found' ? (
                            <span className="text-emerald-400 font-semibold">
                              Available ({res.matches.length} {res.matches.length === 1 ? 'match' : 'matches'})
                            </span>
                          ) : (
                            <span className="text-slate-500">Not Found</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                          {res.lowestPrice !== undefined ? `$${res.lowestPrice}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 truncate max-w-[180px]">
                          {res.bestVendorName ? (
                            <span className="font-semibold text-white">{res.bestVendorName}</span>
                          ) : res.bestSheetName ? (
                            <span>{res.bestSheetName}</span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {res.status === 'found' ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSingleQuery(res.query);
                                onClose();
                              }}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-sans inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
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
  );
};
