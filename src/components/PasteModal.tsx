import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FileText,
  Plus,
  Link as LinkIcon,
  Download,
  Loader2,
  Check,
  AlertTriangle,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { SheetFile } from '../types';
import { parsePastedSheets, parseTableText, splitMultiSheetDump } from '../utils/notepadParser';
import {
  extractGoogleSheetLinks,
  fetchGoogleSheetCsv,
  expandAllLinksWithSubsheets,
  discoverGoogleSheetTabs,
  ExtractedGoogleSheetLink,
  FetchSheetProgressItem,
} from '../utils/googleSheetsImporter';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'urls' | 'multi' | 'single';
  onAddSheets: (newSheets: SheetFile[]) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'urls',
  onAddSheets,
}) => {
  const [tab, setTab] = useState<'urls' | 'multi' | 'single'>(defaultMode);

  // Tab 1: Batch Google Sheet URLs (from notepad)
  const [urlsText, setUrlsText] = useState('');
  const [editableLinks, setEditableLinks] = useState<ExtractedGoogleSheetLink[]>([]);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<FetchSheetProgressItem[] | null>(null);

  // Tab 2: Multi-sheet raw text state
  const [multiText, setMultiText] = useState('');
  const [multiGroupName, setMultiGroupName] = useState('20+ Reseller Sheets');

  // Tab 3: Single sheet state
  const [singleText, setSingleText] = useState('');
  const [singleTitle, setSingleTitle] = useState('Mahnoor Sheet');
  const [recentlyAddedCount, setRecentlyAddedCount] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-discover and fetch all sub-sheets/tabs (e.g. Fashion, Health, Sheet 1, Sheet 2...)
  const [autoExpandTabs, setAutoExpandTabs] = useState(true);
  const [isScanningTabs, setIsScanningTabs] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);
  const [addingTabIdx, setAddingTabIdx] = useState<number | null>(null);
  const [newTabName, setNewTabName] = useState('');
  const [newTabGid, setNewTabGid] = useState('');

  // When urlsText changes, re-extract links if not currently in progress
  const handleUrlsTextChange = (val: string) => {
    setUrlsText(val);
    setErrorMsg(null);
    setBatchProgress(null);
    setScanStatusMsg(null);
    const extracted = extractGoogleSheetLinks(val);
    setEditableLinks(extracted);
  };

  // Automatic sub-sheet scanner: whenever URLs are pasted, auto-detect all sub-sheets in background
  useEffect(() => {
    if (!urlsText.trim() || !autoExpandTabs) return;
    const extracted = extractGoogleSheetLinks(urlsText);
    if (extracted.length === 0) return;

    const timer = setTimeout(async () => {
      setIsScanningTabs(true);
      try {
        const expanded = await expandAllLinksWithSubsheets(extracted, msg => {
          setScanStatusMsg(msg);
        });
        setEditableLinks(expanded);
        if (expanded.length > extracted.length) {
          setScanStatusMsg(`✅ Zabardast! ${expanded.length} sub-sheets/sections auto-detect ho gayi hain (e.g. ${expanded.slice(0, 3).map(e => e.tabName).filter(Boolean).join(', ')}...)!`);
        } else if (expanded.length > 0) {
          setScanStatusMsg(`✅ ${expanded.length} sheet ready to fetch!`);
        }
      } catch {
        // keep extracted links
      } finally {
        setIsScanningTabs(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [urlsText, autoExpandTabs]);

  const handleUpdateVendorName = (idx: number, newName: string) => {
    setEditableLinks(prev => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = {
          ...copy[idx],
          vendorName: newName,
          title: newName,
        };
      }
      return copy;
    });
  };

  const handleRemoveLink = (idx: number) => {
    setEditableLinks(prev => prev.filter((_, i) => i !== idx));
  };

  // Scan all links to discover and expand their sub-sheets/tabs beforehand
  const handleScanSubsheets = async () => {
    if (editableLinks.length === 0) return;
    setIsScanningTabs(true);
    setErrorMsg(null);
    setScanStatusMsg('Discovering sub-sheets / worksheets for all links...');

    try {
      const expanded = await expandAllLinksWithSubsheets(editableLinks, msg => {
        setScanStatusMsg(msg);
      });
      setEditableLinks(expanded);
      setScanStatusMsg(`✅ Discovered ${expanded.length} sub-sheets/tabs across all spreadsheets!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error discovering sub-sheets.');
    } finally {
      setIsScanningTabs(false);
    }
  };

  // Add a manual sub-sheet tab to a spreadsheet link
  const handleAddManualTab = (parentIdx: number) => {
    const parent = editableLinks[parentIdx];
    if (!parent || !newTabName.trim()) return;

    const cleanTab = newTabName.trim();
    const cleanGid = newTabGid.trim() || '0';
    const cleanBaseUrl = parent.originalUrl.split('#')[0].split('?')[0];

    const newLink: ExtractedGoogleSheetLink = {
      title: `${parent.vendorName} - ${cleanTab}`,
      vendorName: parent.vendorName,
      tabName: cleanTab,
      originalUrl: `${cleanBaseUrl}#gid=${cleanGid}`,
      spreadsheetId: parent.spreadsheetId,
      gid: cleanGid,
      csvUrl: `/api/google-sheets/csv?id=${parent.spreadsheetId}&gid=${cleanGid}&sheet=${encodeURIComponent(cleanTab)}`,
    };

    setEditableLinks(prev => {
      const next = [...prev];
      next.splice(parentIdx + 1, 0, newLink);
      return next;
    });

    setAddingTabIdx(null);
    setNewTabName('');
    setNewTabGid('');
  };

  // Live preview for Multi-sheet tab
  const multiAnalysis = useMemo(() => {
    if (!multiText.trim()) return null;
    const sections = splitMultiSheetDump(multiText);
    const lineCount = multiText.split('\n').filter(l => l.trim()).length;
    const firstContent = sections.length > 0 ? sections[0].content : multiText;
    const sampleTable = parseTableText(firstContent);

    return {
      sheetCount: Math.max(sections.length, 1),
      sampleTitles: sections.slice(0, 6).map(s => s.title),
      totalLines: lineCount,
      sampleRows: sampleTable.rows.slice(0, 3),
      detectedColumns: sampleTable.columns,
    };
  }, [multiText]);

  // Live preview for Single sheet tab
  const singleAnalysis = useMemo(() => {
    if (!singleText.trim()) return null;
    const sampleTable = parseTableText(singleText, singleTitle);
    return {
      rowCount: sampleTable.rows.length,
      columns: sampleTable.columns,
      sampleRows: sampleTable.rows.slice(0, 3),
    };
  }, [singleText, singleTitle]);

  // RUN BATCH GOOGLE SHEETS IMPORT (INCLUDING ALL SUB-SHEETS / TABS)
  const handleFetchAllGoogleSheets = async () => {
    if (editableLinks.length === 0) {
      setErrorMsg('No valid Google Sheet URLs found. Please paste your Google Sheet links from your Notepad.');
      return;
    }

    setIsFetchingBatch(true);
    setErrorMsg(null);

    let linksToFetch = [...editableLinks];

    // If auto-expand is enabled and hasn't been expanded yet
    if (autoExpandTabs) {
      setScanStatusMsg('Checking all spreadsheets for sub-sheets (Fashion, Health, Sheet 1, Sheet 2...)...');
      try {
        linksToFetch = await expandAllLinksWithSubsheets(editableLinks, msg => {
          setScanStatusMsg(msg);
        });
        setEditableLinks(linksToFetch);
      } catch {
        // continue with existing links if auto-discovery fails
      }
    }

    const items: FetchSheetProgressItem[] = linksToFetch.map(l => ({
      link: l,
      status: 'pending',
    }));
    setBatchProgress(items);

    const successSheets: SheetFile[] = [];

    for (let i = 0; i < items.length; i++) {
      items[i].status = 'loading';
      setBatchProgress([...items]);

      try {
        const sheet = await fetchGoogleSheetCsv(items[i].link);
        items[i].status = 'success';
        items[i].rowCount = sheet.rowCount;
        items[i].sheetFile = sheet;
        successSheets.push(sheet);
      } catch (err: any) {
        items[i].status = 'error';
        items[i].error = err?.message || 'Access denied or CORS issue';
      }
      setBatchProgress([...items]);
    }

    setIsFetchingBatch(false);
    setScanStatusMsg(null);

    if (successSheets.length > 0) {
      onAddSheets(successSheets);
    } else {
      setErrorMsg(
        'Could not fetch sheets automatically. Google Sheets require sharing set to "Anyone with the link can view". Alternatively, open the sheet, copy all cells (Ctrl+A -> Ctrl+C), and paste in the "Paste Sheet Data" tab.'
      );
    }
  };

  const handleImportMulti = () => {
    if (!multiText.trim()) {
      setErrorMsg('Please paste your sheets data first.');
      return;
    }

    try {
      const sheets = parsePastedSheets(multiText, 'multi', multiGroupName);
      if (sheets.length === 0) {
        setErrorMsg('Could not detect valid data. Please ensure your text contains rows with websites/domains.');
        return;
      }
      onAddSheets(sheets);
      setMultiText('');
      setErrorMsg(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error parsing sheets.');
    }
  };

  const handleImportSingle = () => {
    if (!singleText.trim()) {
      setErrorMsg('Please paste your sheet text first.');
      return;
    }

    try {
      const sheets = parsePastedSheets(singleText, 'single', singleTitle);
      if (sheets.length === 0) {
        setErrorMsg('Could not detect valid rows. Please check that you copied tabular data.');
        return;
      }
      onAddSheets(sheets);
      setRecentlyAddedCount(prev => prev + 1);
      setSingleText('');
      setSingleTitle(`Vendor Sheet ${recentlyAddedCount + 2}`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error parsing single sheet.');
    }
  };

  const loadSampleUrls = () => {
    const sample = `Mahnoor Master: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
Vendor Alpha Tech: https://docs.google.com/spreadsheets/d/1234567890abcdefghijklmnopqrstuvwxyz/edit
VIP Outreach Links: https://docs.google.com/spreadsheets/d/9876543210zyxwvutsrqponmlkjihgfedcba/edit#gid=0
`;
    handleUrlsTextChange(sample);
  };

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden cursor-default"
      >
        
        {/* Header with Prominent Back Button & Close X */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-700 shadow-sm shrink-0"
              title="Go Back / Wapas Jayein (Esc)"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                Import Your Reseller Sheets & Vendors
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">
                Paste Google Sheet URLs or data. Click Back or (X) anytime to cancel.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-900 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-slate-700"
            title="Close / Cancel (Esc)"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Tabs: 1. 20+ Google Sheet URLs | 2. 20+ Sheets Content | 3. Single Sheet */}
        <div className="px-5 pt-3 bg-slate-950/60 border-b border-slate-800">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            
            <button
              type="button"
              onClick={() => {
                setTab('urls');
                setErrorMsg(null);
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'urls'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">Paste 20+ Sheet URLs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('multi');
                setErrorMsg(null);
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'multi'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">Paste Sheet Data</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('single');
                setErrorMsg(null);
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'single'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">Paste 1 Sheet</span>
            </button>

          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PASTE 20+ GOOGLE SHEET URLS (FROM NOTEPAD) */}
          {tab === 'urls' && (
            <div className="space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Paste Notepad URLs List (with or without Vendor Names):
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleUrls}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>See Example Format</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={urlsText}
                  onChange={(e) => handleUrlsTextChange(e.target.value)}
                  placeholder="Paste your notepad with all Google Sheet links here...&#10;&#10;Examples:&#10;Mahnoor: https://docs.google.com/spreadsheets/d/.../edit&#10;Vendor Alpha - https://docs.google.com/spreadsheets/d/.../edit&#10;https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Auto-Expand Sub-sheets Toggle & Scan Button */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoExpandTabs}
                    onChange={(e) => setAutoExpandTabs(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-white">Auto-Fetch ALL Sub-Sheets / Tabs</span>
                    <span className="text-[11px] text-slate-400 block">
                      Ek spreadsheet me jitni bhi sub-sheets hain (Fashion, Health, Sheet 1, Sheet 2...), sab auto-fetch hongi.
                    </span>
                  </div>
                </label>

                {editableLinks.length > 0 && !batchProgress && (
                  <button
                    type="button"
                    disabled={isScanningTabs || isFetchingBatch}
                    onClick={handleScanSubsheets}
                    className="self-start sm:self-auto px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 font-medium text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isScanningTabs ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning Tabs...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Preview All Sub-Sheets</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {scanStatusMsg && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{scanStatusMsg}</span>
                </div>
              )}

              {/* Detected Links with EDITABLE VENDOR NAMES & SUB-SHEET TABS */}
              {editableLinks.length > 0 && !batchProgress && (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editableLinks.length} Sheets / Sub-sheets Ready to Import</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Edit vendor or click + to add sub-sheet tab</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {editableLinks.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[11px] text-slate-500 shrink-0 font-mono">#{idx + 1}</span>
                            <input
                              type="text"
                              value={item.vendorName}
                              onChange={(e) => handleUpdateVendorName(idx, e.target.value)}
                              placeholder="Vendor Name"
                              className="text-xs font-semibold text-white bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full max-w-[180px] focus:outline-none focus:border-emerald-500"
                            />
                            {item.tabName && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] shrink-0" title={`Sub-sheet: ${item.tabName}`}>
                                Tab: {item.tabName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate max-w-xs">
                            <span className="truncate">{item.originalUrl}</span>
                            <button
                              type="button"
                              onClick={() => setAddingTabIdx(addingTabIdx === idx ? null : idx)}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 rounded border border-slate-700 text-[10px] shrink-0"
                              title="Add sub-sheet tab manually"
                            >
                              + Tab
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(idx)}
                              className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                              title="Remove this link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Add Sub-Sheet Box */}
                        {addingTabIdx === idx && (
                          <div className="p-2 bg-slate-950 border border-slate-700 rounded-lg flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400 text-[11px]">Sub-sheet / Tab Name:</span>
                            <input
                              type="text"
                              value={newTabName}
                              onChange={(e) => setNewTabName(e.target.value)}
                              placeholder="e.g. Fashion, Health, Tech"
                              className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36"
                            />
                            <input
                              type="text"
                              value={newTabGid}
                              onChange={(e) => setNewTabGid(e.target.value)}
                              placeholder="GID (optional)"
                              className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-24 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddManualTab(idx)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded text-xs cursor-pointer"
                            >
                              Add Sub-sheet
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddingTabIdx(null)}
                              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Table during/after batch fetch */}
              {batchProgress && (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80 space-y-2 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-200 text-xs pb-1 border-b border-slate-800">
                    <span>Import Status ({batchProgress.filter(b => b.status === 'success').length}/{batchProgress.length} Loaded):</span>
                    {isFetchingBatch && (
                      <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Fetching sheets...
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {batchProgress.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {item.status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />}
                          {item.status === 'pending' && <span className="w-3.5 h-3.5 rounded-full bg-slate-700 shrink-0 inline-block" />}
                          {item.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          
                          <div className="flex items-center gap-1.5 truncate max-w-[260px]">
                            <span className="font-semibold text-white truncate">
                              {item.link.vendorName}
                            </span>
                            {item.link.tabName && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] shrink-0">
                                {item.link.tabName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'success' && (
                            <span className="text-emerald-400 font-mono">
                              ✅ {item.rowCount?.toLocaleString()} rows
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-amber-400 text-[10px] max-w-[180px] truncate" title={item.error}>
                              ⚠️ Private / Check Sharing
                            </span>
                          )}
                          {item.status === 'loading' && (
                            <span className="text-slate-400">Downloading...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {batchProgress.some(b => b.status === 'error') && (
                    <div className="pt-2 text-[11px] text-amber-300/90 border-t border-slate-800/80 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Agar kisi sheet par "Private" error aaye, to bas us sheet ko browser me khol kar <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+A</kbd> aur <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+C</kbd> dabayein aur <strong>"Paste 1 Sheet"</strong> tab me daal dein!
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: PASTE 20+ SHEETS RAW CONTENT */}
          {tab === 'multi' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Paste entire multi-sheet text dump:
                </label>
                <textarea
                  rows={9}
                  value={multiText}
                  onChange={(e) => {
                    setMultiText(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Paste here...&#10;&#10;Works with:&#10;1. Cells copied from Google Sheets / Excel (Tab-separated)&#10;2. Headings like === Sheet 1 === or Sheet 2: XYZ&#10;3. Or repeated header rows (Website, Price, DR...)"
                  className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {multiAnalysis && multiAnalysis.totalLines > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  <span>Detected {multiAnalysis.sheetCount} sheets ({multiAnalysis.totalLines} lines ready)</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE SINGLE SHEET (DIRECT CELL COPY) */}
          {tab === 'single' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-xs">
                <span className="text-emerald-300">
                  💡 <strong>Google Sheets se seedha copy:</strong> Sheet me <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[11px]">Ctrl+A</kbd> aur <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[11px]">Ctrl+C</kbd> dabayein aur niche paste kar dein!
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Vendor Name (e.g. Mahnoor, Ali):
                </label>
                <input
                  type="text"
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  placeholder="e.g. Mahnoor, Ali SEO, Vendor 1"
                  className="w-full text-xs py-2 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Paste Sheet Content:
                </label>
                <textarea
                  rows={8}
                  value={singleText}
                  onChange={(e) => {
                    setSingleText(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Paste Google Sheet cells here...&#10;&#10;Website [Tab] Price [Tab] Category [Tab] DR"
                  className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {singleAnalysis && singleAnalysis.rowCount > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs flex items-center justify-between text-emerald-400">
                  <span>✅ {singleAnalysis.rowCount} rows detected!</span>
                  <span className="text-slate-400 text-[11px]">Columns: {singleAnalysis.columns.join(', ')}</span>
                </div>
              )}

              {recentlyAddedCount > 0 && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg flex items-center justify-between">
                  <span>✅ Added {recentlyAddedCount} {recentlyAddedCount === 1 ? 'sheet' : 'sheets'}! You can paste another sheet right away.</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {batchProgress?.some(b => b.status === 'success') || recentlyAddedCount > 0 ? 'Done & Search' : 'Cancel'}
          </button>

          {tab === 'urls' && (
            <button
              type="button"
              disabled={isFetchingBatch || editableLinks.length === 0}
              onClick={handleFetchAllGoogleSheets}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/20"
            >
              {isFetchingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching All Google Sheets...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Fetch & Import {editableLinks.length > 0 ? `${editableLinks.length} Sheets` : 'All Sheets'}</span>
                </>
              )}
            </button>
          )}

          {tab === 'multi' && (
            <button
              type="button"
              onClick={handleImportMulti}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Import All 20+ Sheets</span>
            </button>
          )}

          {tab === 'single' && (
            <button
              type="button"
              onClick={handleImportSingle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add This Sheet & Next</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
