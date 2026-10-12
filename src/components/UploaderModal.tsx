import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  FileText,
  Lock,
  UserCheck,
  Edit2,
  Check,
} from 'lucide-react';
import { SheetFile } from '../types';
import { parseCsvFile } from '../utils/csvParser';

interface UploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: SheetFile[];
  isLocked: boolean;
  onUnlockRequest: () => void;
  onAddSheets: (newSheets: SheetFile[]) => void;
  onRemoveSheet: (sheetId: string) => void;
  onRemoveGroup: (groupName: string) => void;
  onUpdateSheetVendor?: (sheetId: string, newVendorName: string) => void;
  onLoadSamples: () => void;
  onClearAll: () => void;
  onOpenNotepad: () => void;
}

export const UploaderModal: React.FC<UploaderModalProps> = ({
  isOpen,
  onClose,
  sheets,
  isLocked,
  onUnlockRequest,
  onAddSheets,
  onRemoveSheet,
  onRemoveGroup,
  onUpdateSheetVendor,
  onLoadSamples,
  onClearAll,
  onOpenNotepad,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'individual' | 'groups'>('individual');
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editVendorVal, setEditVendorVal] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (fileList: FileList | null) => {
    if (isLocked) {
      onUnlockRequest();
      return;
    }

    if (!fileList || fileList.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const validFiles = Array.from(fileList).filter(
      f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv'
    );

    if (validFiles.length === 0) {
      setErrorMsg('Please upload valid CSV (.csv) files.');
      setIsProcessing(false);
      return;
    }

    try {
      const parsedSheets: SheetFile[] = [];
      for (const file of validFiles) {
        const sheet = await parseCsvFile(file);
        sheet.groupName = 'Individual CSV Uploads';
        parsedSheets.push(sheet);
      }
      onAddSheets(parsedSheets);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error parsing CSV files. Please check file formatting.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const startEditVendor = (sheet: SheetFile) => {
    if (isLocked) {
      onUnlockRequest();
      return;
    }
    setEditingSheetId(sheet.id);
    setEditVendorVal(sheet.vendorName || sheet.name.replace(/\.csv$/i, ''));
  };

  const saveEditVendor = (sheetId: string) => {
    if (editVendorVal.trim() && onUpdateSheetVendor) {
      onUpdateSheetVendor(sheetId, editVendorVal.trim());
    }
    setEditingSheetId(null);
  };

  const totalSites = sheets.reduce((acc, s) => acc + s.rowCount, 0);

  // Group sheets by groupName
  const groups: Record<string, SheetFile[]> = {};
  sheets.forEach(s => {
    const grp = s.groupName || 'Individual Sheets';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(s);
  });

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
        
        {/* Header with Back button and Close X */}
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

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-white truncate">Manage Sheets & Vendor Names</h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">
                  Organize individual sheets or edit vendor names.
                </p>
              </div>
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

        {/* Lock Warning if viewer mode */}
        {isLocked && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Owner Lock Active: Uploading, renaming, or deleting sheets requires Owner PIN.</span>
            </div>
            <button
              type="button"
              onClick={onUnlockRequest}
              className="text-xs font-semibold underline text-amber-200 hover:text-white cursor-pointer"
            >
              Unlock Now
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Action Row: Upload CSVs vs Paste Notepad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* CSV Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (isLocked) onUnlockRequest();
                else fileInputRef.current?.click();
              }}
              className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,text/csv"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <UploadCloud className="w-6 h-6 text-emerald-400 mb-1.5" />
              <div className="text-xs font-semibold text-slate-200">
                Upload 20+ CSV Sheets
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Drag & drop or browse files
              </div>
            </div>

            {/* Paste Notepad Button */}
            <div
              onClick={() => {
                if (isLocked) onUnlockRequest();
                else onOpenNotepad();
              }}
              className="p-4 border border-slate-800 hover:border-emerald-500/50 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <FileText className="w-6 h-6 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-semibold text-slate-200">
                Paste 20+ Sheets from Notepad
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Paste Google Sheet URLs or full text dumps
              </div>
            </div>

          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* View Mode Tabs: Individual Sheets vs Groups */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewTab('individual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewTab === 'individual'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                All Sheets ({sheets.length})
              </button>

              <button
                type="button"
                onClick={() => setViewTab('groups')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  viewTab === 'groups'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3 inline mr-1" />
                Sheet Groups ({Object.keys(groups).length})
              </button>
            </div>

            {sheets.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (isLocked) {
                    onUnlockRequest();
                  } else {
                    onClearAll();
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Sheets List Container */}
          {sheets.length === 0 ? (
            <div className="text-center py-8 border border-slate-800 rounded-lg bg-slate-950/20 text-xs text-slate-400 space-y-3">
              <p>No sheets currently loaded.</p>
              <button
                type="button"
                onClick={onLoadSamples}
                className="px-3.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                Load 4 Demo Sheets
              </button>
            </div>
          ) : viewTab === 'individual' ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingSheetId === sheet.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editVendorVal}
                            onChange={(e) => setEditVendorVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditVendor(sheet.id);
                              if (e.key === 'Escape') setEditingSheetId(null);
                            }}
                            className="bg-slate-900 border border-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded focus:outline-none w-full max-w-[220px]"
                            placeholder="Exact Vendor Name"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveEditVendor(sheet.id)}
                            className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400 transition-colors"
                            title="Save Vendor Name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSheetId(null)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-xs truncate max-w-[200px]" title={sheet.vendorName}>
                            Vendor: <strong className="text-emerald-300">{sheet.vendorName || sheet.name}</strong>
                          </span>
                          {sheet.tabName && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] shrink-0" title={`Sub-sheet: ${sheet.tabName}`}>
                              Tab: {sheet.tabName}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditVendor(sheet)}
                            className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Edit / Rename exact vendor name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="text-slate-400 flex items-center gap-1.5 text-[11px] mt-0.5 truncate">
                        <span className="font-mono text-emerald-400/90">{sheet.rowCount.toLocaleString()} sites</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 truncate max-w-[150px]">{sheet.name}</span>
                        {sheet.groupName && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300 bg-slate-800/80 px-1 rounded">{sheet.groupName}</span>
                          </>
                        )}
                        <span className="text-slate-600">·</span>
                        <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                          {sheet.detectedColumns.priceUsdCol && (
                            <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1 py-0.2 rounded font-sans">
                              USD
                            </span>
                          )}
                          {sheet.detectedColumns.pricePkrCol && (
                            <span className="text-amber-300 bg-amber-950/80 border border-amber-500/30 px-1 py-0.2 rounded font-sans">
                              PKR
                            </span>
                          )}
                          {sheet.detectedColumns.linkInsertionCol && (
                            <span className="text-blue-300 bg-blue-950/80 border border-blue-500/30 px-1 py-0.2 rounded font-sans">
                              Link Insert
                            </span>
                          )}
                          {sheet.detectedColumns.tatCol && (
                            <span className="text-purple-300 bg-purple-950/80 border border-purple-500/30 px-1 py-0.2 rounded font-sans">
                              TAT
                            </span>
                          )}
                          {!sheet.detectedColumns.priceUsdCol && !sheet.detectedColumns.pricePkrCol && sheet.detectedColumns.priceCol && (
                            <span className="text-slate-300">Rate: {sheet.detectedColumns.priceCol}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                      {(sheet.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          onUnlockRequest();
                        } else {
                          onRemoveSheet(sheet.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                      title="Remove sheet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Groups View */
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {Object.entries(groups).map(([groupTitle, grpSheets]) => {
                const grpRows = grpSheets.reduce((a, s) => a + s.rowCount, 0);
                return (
                  <div
                    key={groupTitle}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-slate-200 text-sm">{groupTitle}</span>
                        <span className="text-slate-400 text-[11px]">
                          ({grpSheets.length} {grpSheets.length === 1 ? 'sheet' : 'sheets'}, {grpRows.toLocaleString()} rows)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            onUnlockRequest();
                          } else {
                            onRemoveGroup(groupTitle);
                          }
                        }}
                        className="text-[11px] text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                      >
                        Remove Group
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {grpSheets.map(s => (
                        <span key={s.id} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 font-mono">
                          {s.vendorName || s.name} ({s.rowCount})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="text-slate-400 font-mono">
            Total Inventory: <strong className="text-emerald-400">{totalSites.toLocaleString()}</strong> sites
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
