import React, { useState, useEffect, useMemo } from 'react';
import { SheetFile, MatchedResult, SearchMode, AuthSession } from './types';
import { getSampleSheets } from './utils/sampleData';
import { searchSheets } from './utils/searchEngine';
import { getInitialLockState, saveLockState } from './utils/security';
import { loadSavedSheets, persistSheets, clearAllSavedSheets } from './utils/storage';
import { Navbar } from './components/Navbar';
import { SearchBox } from './components/SearchBox';
import { ResultsView } from './components/ResultsView';
import { UploaderModal } from './components/UploaderModal';
import { RowDetailModal } from './components/RowDetailModal';
import { BatchSearchModal } from './components/BatchSearchModal';
import { PasteModal } from './components/PasteModal';
import { AdminLockModal } from './components/AdminLockModal';
import { SheetViewerModal } from './components/SheetViewerModal';
import { EmailGateModal } from './components/EmailGateModal';
import { AccessManagementModal } from './components/AccessManagementModal';
import {
  ShieldCheck,
  Zap,
  Info,
  Lock,
  Unlock,
  Layers,
  FileText,
  Link as LinkIcon,
  UserCheck,
} from 'lucide-react';

export default function App() {
  const [isLocked, setIsLocked] = useState<boolean>(() => getInitialLockState());

  // User Authentication & Session
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('seo_current_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email && parsed?.approved) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [pendingEmail, setPendingEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('seo_pending_email_v1') || null;
    } catch {}
    return null;
  });

  const [isAccessManagementOpen, setIsAccessManagementOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Sheets state - loaded per user
  const [sheets, setSheets] = useState<SheetFile[]>([]);
  const [isLoadingSavedSheets, setIsLoadingSavedSheets] = useState(true);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('smart');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<MatchedResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState('');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteDefaultMode, setPasteDefaultMode] = useState<'urls' | 'multi' | 'single'>('urls');
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAdminLockOpen, setIsAdminLockOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<MatchedResult | null>(null);
  const [selectedSheetViewerResult, setSelectedSheetViewerResult] = useState<MatchedResult | null>(null);

  const matchedSheet = useMemo(() => {
    if (!selectedSheetViewerResult) return null;
    return sheets.find(s => s.id === selectedSheetViewerResult.sheetId) || null;
  }, [sheets, selectedSheetViewerResult]);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load saved sheets for the current active user
  useEffect(() => {
    if (!currentUser?.email || !currentUser?.approved) {
      setIsLoadingSavedSheets(false);
      setSheets([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSavedSheets(true);

    loadSavedSheets(currentUser.email)
      .then(loaded => {
        if (isMounted) {
          if (loaded && loaded.length > 0) {
            setSheets(loaded);
          } else {
            setSheets([]);
          }
          setIsLoadingSavedSheets(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingSavedSheets(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.email, currentUser?.approved]);

  // Admin poll for pending access requests
  useEffect(() => {
    if (currentUser?.role !== 'admin' || !currentUser?.email) return;

    const checkPendingUsers = async () => {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { 'X-User-Email': currentUser.email },
        });
        if (res.ok) {
          const data = await res.json();
          const pending = (data.users || []).filter((u: any) => u.status === 'pending');
          setPendingRequestsCount(pending.length);
        }
      } catch {}
    };

    checkPendingUsers();
    const interval = setInterval(checkPendingUsers, 12000);
    return () => clearInterval(interval);
  }, [currentUser?.role, currentUser?.email]);

  const totalRows = useMemo(() => {
    return sheets.reduce((acc, sheet) => acc + sheet.rowCount, 0);
  }, [sheets]);

  const saveSheets = (newSheets: SheetFile[]) => {
    setSheets(newSheets);
    if (currentUser?.email) {
      persistSheets(newSheets, currentUser.email).catch(() => {});
    }
  };

  const handleAddSheets = (newSheets: SheetFile[]) => {
    const currentIsSample = sheets.some(s => s.name?.includes('Vendor_Alpha_Tech') || s.name?.includes('Outreach_VIP'));
    const base = currentIsSample ? [] : [...sheets];

    const updated = [...base];
    for (const ns of newSheets) {
      const existingIdx = updated.findIndex(s =>
        s.id === ns.id ||
        (s.spreadsheetId && ns.spreadsheetId && s.spreadsheetId === ns.spreadsheetId && (s.gid || '0') === (ns.gid || '0')) ||
        (s.name.toLowerCase() === ns.name.toLowerCase() && (s.gid || '') === (ns.gid || ''))
      );
      if (existingIdx !== -1) {
        updated[existingIdx] = ns;
      } else {
        updated.push(ns);
      }
    }
    saveSheets(updated);

    if (query.trim()) {
      handleSearch(query, updated);
    }
  };

  const handleRemoveSheet = (sheetId: string) => {
    const updated = sheets.filter(s => s.id !== sheetId);
    saveSheets(updated);
    if (query.trim()) {
      handleSearch(query, updated);
    }
  };

  const handleRemoveGroup = (groupTitle: string) => {
    const updated = sheets.filter(s => (s.groupName || 'Individual Sheets') !== groupTitle);
    saveSheets(updated);
    if (query.trim()) {
      handleSearch(query, updated);
    }
  };

  const handleUpdateSheetVendorName = (sheetId: string, newVendorName: string) => {
    const clean = newVendorName.trim();
    if (!clean) return;
    const updated = sheets.map(s => {
      if (s.id === sheetId) {
        return {
          ...s,
          vendorName: clean,
          name: s.name.endsWith('.csv') ? `${clean}.csv` : clean,
        };
      }
      return s;
    });
    saveSheets(updated);
    if (searchedQuery) {
      const matches = searchSheets(updated, searchedQuery, searchMode);
      setResults(matches);
    }
  };

  const handleUpdateSheetSourceUrl = (sheetId: string, newUrl: string) => {
    const clean = newUrl.trim();
    if (!clean) return;
    const sMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = clean.match(/[#&?]gid=([0-9]+)/);
    const updated = sheets.map(s => {
      if (s.id === sheetId) {
        return {
          ...s,
          sourceUrl: clean,
          spreadsheetId: sMatch ? sMatch[1] : s.spreadsheetId,
          gid: gidMatch ? gidMatch[1] : s.gid || '0',
        };
      }
      return s;
    });
    saveSheets(updated);
    if (searchedQuery) {
      const matches = searchSheets(updated, searchedQuery, searchMode);
      setResults(matches);
    }
  };

  const handleLoadSamples = () => {
    const samples = getSampleSheets();
    saveSheets(samples);
    setQuery('techcrunch.com');
    handleSearch('techcrunch.com', samples);
  };

  const handleClearAll = () => {
    setSheets([]);
    setResults([]);
    setHasSearched(false);
    if (currentUser?.email) {
      clearAllSavedSheets(currentUser.email).catch(() => {});
    }
  };

  const handleSearch = (customQuery?: string, activeSheets: SheetFile[] = sheets) => {
    const targetQ = (customQuery !== undefined ? customQuery : query).trim();
    if (!targetQ) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const matches = searchSheets(activeSheets, targetQ, searchMode);
    setResults(matches);
    setHasSearched(true);
    setSearchedQuery(targetQ);

    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== targetQ.toLowerCase());
      return [targetQ, ...filtered].slice(0, 5);
    });
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const toggleLock = () => {
    if (isLocked) {
      setIsAdminLockOpen(true);
    } else {
      setIsLocked(true);
      saveLockState(true);
    }
  };

  const handleUnlockSuccess = () => {
    setIsLocked(false);
    saveLockState(false);
  };

  const openPasteModal = (mode: 'urls' | 'multi' | 'single') => {
    if (currentUser?.role === 'admin' && isLocked) {
      setIsAdminLockOpen(true);
      return;
    }
    setPasteDefaultMode(mode);
    setIsPasteOpen(true);
  };

  const handleOpenUpload = () => {
    if (currentUser?.role === 'admin' && isLocked) {
      setIsAdminLockOpen(true);
      return;
    }
    setIsUploadOpen(true);
  };

  const handleLoginSuccess = (session: AuthSession) => {
    setCurrentUser(session);
    try {
      localStorage.setItem('seo_current_user_v1', JSON.stringify(session));
      localStorage.removeItem('seo_pending_email_v1');
    } catch {}
    setPendingEmail(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSheets([]);
    setResults([]);
    setHasSearched(false);
    try {
      localStorage.removeItem('seo_current_user_v1');
    } catch {}
  };

  // -------------------------------------------------------------
  // Access Gate Guard: User must enter their email and be approved
  // -------------------------------------------------------------
  if (!currentUser || !currentUser.approved) {
    return (
      <EmailGateModal
        isOpen={true}
        onLoginSuccess={handleLoginSuccess}
        pendingEmail={pendingEmail}
        setPendingEmail={setPendingEmail}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top Navbar */}
      <Navbar
        sheetCount={sheets.length}
        totalRows={totalRows}
        isLocked={isLocked}
        currentUserEmail={currentUser?.email}
        isAdmin={currentUser?.role === 'admin'}
        pendingRequestsCount={pendingRequestsCount}
        onOpenAccessManagement={() => setIsAccessManagementOpen(true)}
        onLogout={handleLogout}
        onToggleLock={toggleLock}
        onOpenUpload={handleOpenUpload}
        onOpenPasteUrls={() => openPasteModal('urls')}
        onOpenPasteMulti={() => openPasteModal('multi')}
        onOpenPasteSingle={() => openPasteModal('single')}
        onOpenBatch={() => setIsBatchOpen(true)}
        onLoadSamples={handleLoadSamples}
        onReset={handleClearAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Admin Notification Banner for Pending User Access Requests */}
        {currentUser?.role === 'admin' && pendingRequestsCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>
                <strong>{pendingRequestsCount} Pending Access Request{pendingRequestsCount > 1 ? 's' : ''}:</strong> User(s) have entered their email to request access.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAccessManagementOpen(true)}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Review & Approve Access
            </button>
          </div>
        )}

        {/* Hero Banner / Quick Access Bar */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3" /> Real-time Price Comparison
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Private Workspace</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Instant SEO Reseller Site Finder
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Upload or paste your 20+ Google Sheet URLs. Find which vendor offers the site with lowest rates in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openPasteModal('urls')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Paste Sheet URLs</span>
            </button>

            <button
              type="button"
              onClick={() => openPasteModal('multi')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Paste Cells</span>
            </button>
          </div>
        </section>

        {/* Global Instant Search Bar */}
        <section aria-label="Search reseller database">
          <SearchBox
            query={query}
            setQuery={setQuery}
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            onOpenBatch={() => setIsBatchOpen(true)}
            recentSearches={recentSearches}
            totalSites={totalRows}
          />
        </section>

        {/* Results Dashboard Table / State */}
        <ResultsView
          results={results}
          searchedQuery={searchedQuery}
          hasSearched={hasSearched}
          sheets={sheets}
          isLoading={isLoadingSavedSheets}
          onSelectRow={(row) => setSelectedRowDetail(row)}
          onOpenSheetViewer={(row) => setSelectedSheetViewerResult(row)}
          onOpenPasteUrls={() => openPasteModal('urls')}
          onOpenPasteSingle={() => openPasteModal('single')}
        />

        {/* Footer Info */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Supports Google Sheets URLs, direct cell copy-paste, and CSV files
            </span>
          </div>
          <div className="text-right">
            {currentUser?.role === 'admin' ? (
              <span className="text-emerald-400 font-mono text-[11px]">Owner Mode: {isLocked ? 'Protected (Locked)' : 'Unlocked'}</span>
            ) : (
              <span className="text-slate-500 text-[11px]">Private Secure Session</span>
            )}
          </div>
        </div>

      </main>

      {/* Email Gate Modal (Required before entering the portal) */}
      <EmailGateModal
        isOpen={!currentUser || !currentUser.approved}
        onLoginSuccess={handleLoginSuccess}
        pendingEmail={pendingEmail}
        setPendingEmail={(em: string | null) => {
          setPendingEmail(em);
          if (em) {
            localStorage.setItem('seo_pending_email_v1', em);
          } else {
            localStorage.removeItem('seo_pending_email_v1');
          }
        }}
      />

      {/* Admin Access Management Modal */}
      {currentUser?.role === 'admin' && (
        <AccessManagementModal
          isOpen={isAccessManagementOpen}
          onClose={() => {
            setIsAccessManagementOpen(false);
            if (currentUser?.email) {
              fetch('/api/admin/users', { headers: { 'X-User-Email': currentUser.email } })
                .then(r => r.json())
                .then(d => {
                  const pending = (d.users || []).filter((u: any) => u.status === 'pending');
                  setPendingRequestsCount(pending.length);
                })
                .catch(() => {});
            }
          }}
          adminEmail={currentUser.email}
        />
      )}

      {/* Paste Modal (URLs / Multi / Single) */}
      <PasteModal
        isOpen={isPasteOpen}
        onClose={() => setIsPasteOpen(false)}
        defaultMode={pasteDefaultMode}
        onAddSheets={handleAddSheets}
      />

      {/* Multi-File CSV Manager Modal */}
      <UploaderModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        sheets={sheets}
        isLocked={currentUser?.role === 'admin' ? isLocked : false}
        onUnlockRequest={() => setIsAdminLockOpen(true)}
        onAddSheets={handleAddSheets}
        onRemoveSheet={handleRemoveSheet}
        onRemoveGroup={handleRemoveGroup}
        onUpdateSheetVendor={handleUpdateSheetVendorName}
        onLoadSamples={handleLoadSamples}
        onClearAll={handleClearAll}
        onOpenNotepad={() => {
          setIsUploadOpen(false);
          openPasteModal('urls');
        }}
      />

      {/* Owner Security PIN Lock Modal */}
      <AdminLockModal
        isOpen={isAdminLockOpen}
        onClose={() => setIsAdminLockOpen(false)}
        onUnlockSuccess={handleUnlockSuccess}
      />

      {/* Row Detail Record Modal */}
      <RowDetailModal
        result={selectedRowDetail}
        onClose={() => setSelectedRowDetail(null)}
        onOpenSheetViewer={(row) => setSelectedSheetViewerResult(row)}
      />

      {/* Full Sheet Viewer & Row Locator Modal */}
      <SheetViewerModal
        isOpen={!!selectedSheetViewerResult}
        onClose={() => setSelectedSheetViewerResult(null)}
        result={selectedSheetViewerResult}
        sheet={matchedSheet}
        onUpdateSourceUrl={handleUpdateSheetSourceUrl}
      />

      {/* Batch Multi-URL Search Modal */}
      <BatchSearchModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        sheets={sheets}
        onSelectSingleQuery={(targetUrl) => {
          setQuery(targetUrl);
          handleSearch(targetUrl);
        }}
      />

      {/* Admin User Access & Approval Management Modal */}
      {currentUser?.role === 'admin' && (
        <AccessManagementModal
          isOpen={isAccessManagementOpen}
          onClose={() => {
            setIsAccessManagementOpen(false);
            if (currentUser?.email) {
              fetch('/api/admin/users', {
                headers: { 'X-User-Email': currentUser.email },
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.users) {
                    const p = data.users.filter((u: any) => u.status === 'pending').length;
                    setPendingRequestsCount(p);
                  }
                })
                .catch(() => {});
            }
          }}
          adminEmail={currentUser.email}
        />
      )}

    </div>
  );
}
