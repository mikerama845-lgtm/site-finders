import { SheetFile } from '../types';

function getSafeUserKey(email?: string): string {
  const e = (email || '').trim().toLowerCase();
  if (!e) return 'default';
  return e.replace(/[^a-z0-9]/g, '_');
}

const STORE_NAME = 'sheets_store';
const KEY_NAME = 'saved_sheets';

/**
 * Opens the IndexedDB database scoped to the specific user email
 */
function openIndexedDB(userEmail?: string): Promise<IDBDatabase> {
  const dbName = `SEOResellerDB_${getSafeUserKey(userEmail)}`;
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const req = window.indexedDB.open(dbName, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open IndexedDB'));
  });
}

/**
 * Loads sheets from user-scoped IndexedDB
 */
async function loadFromIndexedDB(userEmail?: string): Promise<SheetFile[] | null> {
  try {
    const db = await openIndexedDB(userEmail);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);

      req.onsuccess = () => {
        const val = req.result;
        if (Array.isArray(val) && val.length > 0) {
          resolve(val);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Saves sheets into user-scoped IndexedDB
 */
async function saveToIndexedDB(sheets: SheetFile[], userEmail?: string): Promise<void> {
  try {
    const db = await openIndexedDB(userEmail);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sheets, KEY_NAME);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

/**
 * Clears sheets from user-scoped IndexedDB
 */
async function clearIndexedDB(userEmail?: string): Promise<void> {
  try {
    const db = await openIndexedDB(userEmail);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

function filterOutMockSheets(list: SheetFile[]): SheetFile[] {
  if (!Array.isArray(list)) return [];
  return list.filter(s => {
    if (!s) return false;
    const isMock =
      s.id?.startsWith('sample-') ||
      s.name?.includes('Vendor_Alpha_Tech') ||
      s.name?.includes('Outreach_VIP');
    return !isMock;
  });
}

/**
 * Loads saved sheets with strict per-user isolation:
 * 1. User-scoped localStorage cache
 * 2. User-scoped IndexedDB
 * 3. Server persistent file /api/sheets with X-User-Email header
 */
export async function loadSavedSheets(userEmail?: string): Promise<SheetFile[]> {
  const email = (userEmail || '').trim().toLowerCase();
  const safeKey = getSafeUserKey(email);
  const userFullKey = `seo_reseller_sheets_full_${safeKey}`;
  const userMetaKey = `seo_reseller_sheets_meta_${safeKey}`;

  // 1. Check user-scoped localStorage first
  try {
    let raw = localStorage.getItem(userFullKey) || localStorage.getItem(userMetaKey);
    // Backward compatibility for primary admin
    if (!raw && (email === 'mikerama845@gmail.com' || !email)) {
      raw = localStorage.getItem('seo_reseller_sheets_full_v1') || localStorage.getItem('seo_reseller_sheets_meta');
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = filterOutMockSheets(parsed);
        if (cleaned.length > 0) {
          // Trigger background sync to user's server folder and IDB
          saveToIndexedDB(cleaned, email);
          if (email) {
            fetch('/api/sheets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Email': email,
              },
              body: JSON.stringify({ sheets: cleaned }),
            }).catch(() => {});
          }
          return cleaned;
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Try user-scoped IndexedDB
  try {
    const idbSheets = await loadFromIndexedDB(email);
    if (idbSheets && idbSheets.length > 0) {
      const cleaned = filterOutMockSheets(idbSheets);
      if (cleaned.length > 0) {
        try {
          localStorage.setItem(userFullKey, JSON.stringify(cleaned));
        } catch {}
        if (email) {
          fetch('/api/sheets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': email,
            },
            body: JSON.stringify({ sheets: cleaned }),
          }).catch(() => {});
        }
        return cleaned;
      }
    }
  } catch {
    // continue to server
  }

  // 3. Try Isolated Server Storage (/api/sheets for this user)
  if (email) {
    try {
      const res = await fetch('/api/sheets', {
        headers: { 'X-User-Email': email },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sheets) && data.sheets.length > 0) {
          const cleaned = filterOutMockSheets(data.sheets);
          if (cleaned.length > 0) {
            saveToIndexedDB(cleaned, email);
            try {
              localStorage.setItem(userFullKey, JSON.stringify(cleaned));
            } catch {}
            return cleaned;
          }
        }
      }
    } catch {
      // ignore server error
    }
  }

  return [];
}

/**
 * Persists sheets strictly to the active user's isolated storage
 */
export async function persistSheets(sheets: SheetFile[], userEmail?: string): Promise<void> {
  const email = (userEmail || '').trim().toLowerCase();
  const safeKey = getSafeUserKey(email);
  const userFullKey = `seo_reseller_sheets_full_${safeKey}`;
  const userMetaKey = `seo_reseller_sheets_meta_${safeKey}`;
  const userSummaryKey = `seo_reseller_sheets_summary_${safeKey}`;

  const cleanSheets = filterOutMockSheets(sheets);

  // 1. Save to user-scoped localStorage
  try {
    localStorage.setItem(userFullKey, JSON.stringify(cleanSheets));
    localStorage.setItem(userMetaKey, JSON.stringify(cleanSheets));
  } catch {
    try {
      const lightMeta = cleanSheets.map(s => ({
        id: s.id,
        name: s.name,
        vendorName: s.vendorName,
        tabName: s.tabName,
        rowCount: s.rowCount,
        sourceUrl: s.sourceUrl,
        spreadsheetId: s.spreadsheetId,
        gid: s.gid,
      }));
      localStorage.setItem(userSummaryKey, JSON.stringify(lightMeta));
    } catch {}
  }

  // 2. Save to user-scoped IndexedDB
  await saveToIndexedDB(cleanSheets, email);

  // 3. Sync to user's private folder on server
  if (email) {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': email,
        },
        body: JSON.stringify({ sheets: cleanSheets }),
      });
    } catch {
      // server sync fallback
    }
  }
}

/**
 * Clears saved sheets from user's isolated storage
 */
export async function clearAllSavedSheets(userEmail?: string): Promise<void> {
  const email = (userEmail || '').trim().toLowerCase();
  const safeKey = getSafeUserKey(email);
  const userFullKey = `seo_reseller_sheets_full_${safeKey}`;
  const userMetaKey = `seo_reseller_sheets_meta_${safeKey}`;
  const userSummaryKey = `seo_reseller_sheets_summary_${safeKey}`;

  await clearIndexedDB(email);
  try {
    localStorage.removeItem(userFullKey);
    localStorage.removeItem(userMetaKey);
    localStorage.removeItem(userSummaryKey);
    if (email === 'mikerama845@gmail.com') {
      localStorage.removeItem('seo_reseller_sheets_full_v1');
      localStorage.removeItem('seo_reseller_sheets_meta');
      localStorage.removeItem('seo_reseller_sheets_summary');
    }
  } catch {
    // ignore
  }

  if (email) {
    try {
      await fetch('/api/sheets', {
        method: 'DELETE',
        headers: { 'X-User-Email': email },
      });
    } catch {
      // ignore
    }
  }
}
