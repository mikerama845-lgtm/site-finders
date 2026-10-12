import React, { useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  Upload,
  RotateCcw,
  ListCheck,
  FileText,
  Lock,
  Unlock,
  Menu,
  X,
  Layers,
  Link as LinkIcon,
  Users,
  LogOut,
  User,
  Bell,
} from 'lucide-react';

interface NavbarProps {
  sheetCount: number;
  totalRows: number;
  isLocked: boolean;
  currentUserEmail?: string;
  isAdmin?: boolean;
  pendingRequestsCount?: number;
  onOpenAccessManagement?: () => void;
  onLogout?: () => void;
  onToggleLock: () => void;
  onOpenUpload: () => void;
  onOpenPasteUrls: () => void;
  onOpenPasteMulti: () => void;
  onOpenPasteSingle: () => void;
  onOpenBatch: () => void;
  onLoadSamples: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sheetCount,
  totalRows,
  isLocked,
  currentUserEmail,
  isAdmin,
  pendingRequestsCount = 0,
  onOpenAccessManagement,
  onLogout,
  onToggleLock,
  onOpenUpload,
  onOpenPasteUrls,
  onOpenPasteMulti,
  onOpenPasteSingle,
  onOpenBatch,
  onLoadSamples,
  onReset,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
              SEO Reseller Site Finder
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block">
              20+ Google Sheets & CSV Domain Matcher
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Live Sheets Status (Desktop) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-200 font-semibold font-mono tabular-nums">{sheetCount}</span>
            <span>{sheetCount === 1 ? 'Sheet' : 'Sheets'}</span>
          </div>
          <span className="text-slate-700" aria-hidden="true">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold font-mono tabular-nums">
              {totalRows.toLocaleString()}
            </span>
            <span>Sites in Database</span>
          </div>
        </nav>

        {/* Zone 3: Primary Actions (Desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          
          {/* Owner Lock Toggle Badge (Only shown to Owner) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isLocked
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              }`}
              title={isLocked ? 'Database is locked. Click to unlock owner mode.' : 'Unlocked in Owner Mode. Click to lock.'}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Owner Mode</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBatch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Search multiple URLs at once"
          >
            <ListCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Batch URLs</span>
          </button>

          {/* Paste 20+ Google Sheet URLs (From Notepad) */}
          <button
            type="button"
            onClick={onOpenPasteUrls}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm shadow-emerald-500/10"
            title="Paste all Google Sheet links from your notepad"
          >
            <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paste Sheet URLs</span>
          </button>

          {/* Paste Sheet Data */}
          <button
            type="button"
            onClick={onOpenPasteMulti}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Paste copied sheet cells or raw text"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Paste Data</span>
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Upload CSV files"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">CSVs</span>
          </button>

          {/* Admin User Access Management Button */}
          {isAdmin && onOpenAccessManagement && (
            <button
              type="button"
              onClick={onOpenAccessManagement}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm shadow-emerald-500/20"
              title="Manage user access and approve new users"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Users</span>
              {pendingRequestsCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px] animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          {/* User Account / Logout */}
          {currentUserEmail && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
              <div
                className="hidden xl:flex items-center gap-1 px-2 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono max-w-[140px] truncate"
                title={`Logged in as ${currentUserEmail} (${isAdmin ? 'Admin' : 'User'})`}
              >
                <User className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{currentUserEmail.split('@')[0]}</span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Switch Account / Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-1.5 rounded-lg border text-xs ${
              isLocked
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            }`}
            title="Lock / Unlock Edit"
          >
            {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-xs text-slate-400 py-1 border-b border-slate-800/60">
            <span>Status:</span>
            <span className="font-mono text-emerald-400">{sheetCount} Sheets · {totalRows.toLocaleString()} Sites</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPasteUrls();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-lg cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Paste Sheet URLs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPasteSingle();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Paste 1 Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUpload();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSVs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBatch();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
            >
              <ListCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Batch URLs</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            {isAdmin && onOpenAccessManagement && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAccessManagement();
                }}
                className="w-full flex items-center justify-between py-2 px-3 text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Manage User Approvals</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded-full text-[10px] animate-pulse">
                    {pendingRequestsCount} Pending
                  </span>
                )}
              </button>
            )}

            {currentUserEmail && (
              <div className="flex items-center justify-between py-1.5 px-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{currentUserEmail}</span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-sans font-semibold cursor-pointer ml-2"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between">
              {sheetCount === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLoadSamples();
                  }}
                  className="w-full text-center py-1.5 text-xs text-emerald-400 underline cursor-pointer"
                >
                  Load Sample Sheets
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onReset();
                  }}
                  className="w-full text-center py-1.5 text-xs text-red-400 underline cursor-pointer"
                >
                  Reset & Clear Database
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
