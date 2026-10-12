import { parseCsvString } from './csvParser';
import { SheetFile } from '../types';

export interface ExtractedGoogleSheetLink {
  title: string;
  vendorName: string; // The recognized Vendor / Supplier name
  tabName?: string; // Sub-sheet / Worksheet tab name (e.g. "ALL Sites", "Premium Sites")
  originalUrl: string;
  spreadsheetId: string;
  gid: string;
  csvUrl: string;
  discoveredTabs?: DiscoveredTab[];
}

export interface DiscoveredTab {
  name: string;
  gid: string;
}

/**
 * Discovers all worksheets / sub-sheets / tabs in a Google Spreadsheet.
 */
export async function discoverGoogleSheetTabs(spreadsheetId: string): Promise<DiscoveredTab[]> {
  try {
    const res = await fetch(`/api/google-sheets/tabs?id=${spreadsheetId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tabs || [];
  } catch {
    return [];
  }
}

/**
 * Extracts Google Sheet links AND Vendor / Tab Names from notepad text.
 * Handles formats like:
 * - "Mahnoor - ALL Sites: https://docs.google.com/spreadsheets/d/.../edit?gid=123"
 * - "Mahnoor (Premium Sites) - https://docs.google.com/spreadsheets/d/.../edit?gid=456"
 * - "Mahnoor: https://docs.google.com/spreadsheets/d/..."
 * - "https://docs.google.com/spreadsheets/d/... - Mahnoor"
 */
export function extractGoogleSheetLinks(text: string): ExtractedGoogleSheetLink[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const links: ExtractedGoogleSheetLink[] = [];

  const urlRegex = /https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)[^\s]*/i;

  let counter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(urlRegex);

    if (match) {
      const originalUrl = match[0];
      const spreadsheetId = match[1];

      // Extract GID
      const gidMatch = originalUrl.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      // Look for vendor or tab name before/after URL
      const beforeUrl = line.substring(0, line.indexOf(originalUrl)).trim();
      const afterUrl = line.substring(line.indexOf(originalUrl) + originalUrl.length).trim();

      let detectedVendor = '';

      if (beforeUrl) {
        detectedVendor = cleanRawVendorText(beforeUrl);
      }

      if (!detectedVendor && afterUrl) {
        detectedVendor = cleanRawVendorText(afterUrl);
      }

      if (!detectedVendor && i > 0) {
        const prevLine = lines[i - 1].trim();
        if (!urlRegex.test(prevLine) && prevLine.length < 80) {
          detectedVendor = cleanRawVendorText(prevLine);
        }
      }

      if (!detectedVendor) {
        detectedVendor = `Vendor ${counter}`;
      }

      // Check if text specified a tab name: e.g. "Mahnoor - ALL Sites" or "Mahnoor (Premium)"
      let tabName: string | undefined = undefined;
      const tabMatch = detectedVendor.match(/[-–—:]\s*(.+)$/) || detectedVendor.match(/\(([^)]+)\)$/);
      if (tabMatch && tabMatch[1] && tabMatch[1].length < 40) {
        tabName = tabMatch[1].trim();
      }

      const csvUrl = `/api/google-sheets/csv?id=${spreadsheetId}&gid=${gid}`;

      links.push({
        title: detectedVendor,
        vendorName: detectedVendor,
        tabName,
        originalUrl,
        spreadsheetId,
        gid,
        csvUrl,
      });
      counter++;
    }
  }

  // If multiple links have the same spreadsheet ID with different GIDs,
  // distinguish their titles cleanly: e.g. "Mahnoor (Tab gid=12345)"
  const sheetCounts = new Map<string, number>();
  links.forEach(l => {
    sheetCounts.set(l.spreadsheetId, (sheetCounts.get(l.spreadsheetId) || 0) + 1);
  });

  links.forEach(l => {
    if ((sheetCounts.get(l.spreadsheetId) || 0) > 1 && !l.title.includes(l.gid) && !l.tabName) {
      l.title = `${l.vendorName} (Tab gid=${l.gid})`;
    }
  });

  return links;
}

function cleanRawVendorText(raw: string): string {
  let cleaned = raw
    .replace(/^[0-9]+[.\-:\)]\s*/, '') // Remove "1. ", "2) ", "#3 "
    .replace(/^(?:vender\s*name|vendor\s*name|vender|vendor|supplier|seller|reseller|sheet\s*name|sheet|partner|source|admin|owner)\s*[:=\-]?\s*/i, '')
    .replace(/[:=\-|,\t]+$/, '')
    .replace(/^[:=\-|,\t]+/, '')
    .replace(/^[\[\(\{<]+|[\]\)\}>]+$/g, '')
    .replace(/^[=\-#*\[\]:\s]+|[=\-#*\[\]:\s]+$/g, '')
    .trim();

  // Strip trailing .csv if present
  cleaned = cleaned.replace(/\.csv$/i, '').trim();

  return cleaned.length > 0 && cleaned.length < 80 ? cleaned : '';
}

export interface FetchSheetProgressItem {
  link: ExtractedGoogleSheetLink;
  status: 'pending' | 'loading' | 'success' | 'error';
  rowCount?: number;
  error?: string;
  sheetFile?: SheetFile;
}

/**
 * Fetches a single Google Sheet CSV for a specific tab or GID.
 */
export async function fetchGoogleSheetCsv(item: ExtractedGoogleSheetLink): Promise<SheetFile> {
  let csvText = '';
  let fetchError = '';

  // 1. Try our proxy endpoint first (fast, handles CORS, headers, and tabs)
  try {
    const proxyUrl = `/api/google-sheets/csv?id=${item.spreadsheetId}&gid=${item.gid}${item.tabName ? `&sheet=${encodeURIComponent(item.tabName)}` : ''}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      csvText = await res.text();
    } else {
      fetchError = `Proxy returned ${res.status}`;
    }
  } catch (err: any) {
    fetchError = err?.message || 'Proxy fetch failed';
  }

  // 2. Direct fallback to gviz/tq if proxy failed
  if (!csvText || csvText.trim().length === 0) {
    try {
      const directUrl = `https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/gviz/tq?tqx=out:csv&gid=${item.gid}`;
      const res = await fetch(directUrl);
      if (res.ok) {
        csvText = await res.text();
      }
    } catch {
      // ignore
    }
  }

  if (!csvText || csvText.trim().length === 0) {
    throw new Error(
      `Could not fetch data for this tab (gid=${item.gid}). ${fetchError || 'Ensure sheet is shared with "Anyone with the link can view"'}.`
    );
  }

  if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.includes('<html')) {
    throw new Error(
      `Tab (gid=${item.gid}) is Private or Login Required. Please change sheet sharing to "Anyone with the link can view", or copy the cells (Ctrl+A -> Ctrl+C) and paste into "Paste Sheet Data".`
    );
  }

  const cleanTitle = item.tabName ? `${item.vendorName} - ${item.tabName}` : item.title;
  const sheetFile = parseCsvString(csvText, `${cleanTitle}.csv`, item.vendorName);
  sheetFile.name = `${cleanTitle}.csv`;
  sheetFile.vendorName = item.vendorName;
  sheetFile.tabName = item.tabName;
  sheetFile.groupName = `${item.vendorName} Master Sheets`;
  sheetFile.sourceUrl = item.originalUrl;
  sheetFile.spreadsheetId = item.spreadsheetId;
  sheetFile.gid = item.gid;
  return sheetFile;
}

/**
 * Expands all Google Sheet links into their respective sub-sheets / worksheets (tabs)
 * e.g., if a spreadsheet has "Fashion", "Health", "Tech" tabs, it returns 3 separate links.
 */
export async function expandAllLinksWithSubsheets(
  links: ExtractedGoogleSheetLink[],
  onProgress?: (msg: string) => void
): Promise<ExtractedGoogleSheetLink[]> {
  const result: ExtractedGoogleSheetLink[] = [];
  const processedSpreadsheets = new Set<string>();

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    // If already processed as part of a multi-tab expansion
    if (processedSpreadsheets.has(link.spreadsheetId)) {
      continue;
    }

    try {
      onProgress?.(`Detecting sub-sheets for ${link.vendorName} (${i + 1}/${links.length})...`);
      const tabs = await discoverGoogleSheetTabs(link.spreadsheetId);

      if (tabs && tabs.length > 1) {
        processedSpreadsheets.add(link.spreadsheetId);
        const cleanBaseUrl = link.originalUrl.split('#')[0].split('?')[0];

        for (const tab of tabs) {
          result.push({
            title: `${link.vendorName} - ${tab.name}`,
            vendorName: link.vendorName,
            tabName: tab.name,
            originalUrl: `${cleanBaseUrl}#gid=${tab.gid}`,
            spreadsheetId: link.spreadsheetId,
            gid: tab.gid,
            csvUrl: `/api/google-sheets/csv?id=${link.spreadsheetId}&gid=${tab.gid}&sheet=${encodeURIComponent(tab.name)}`,
            discoveredTabs: tabs,
          });
        }
      } else if (tabs && tabs.length === 1) {
        processedSpreadsheets.add(link.spreadsheetId);
        result.push({
          ...link,
          tabName: tabs[0].name,
          title: `${link.vendorName} - ${tabs[0].name}`,
          gid: tabs[0].gid,
          discoveredTabs: tabs,
        });
      } else {
        result.push(link);
      }
    } catch {
      result.push(link);
    }
  }

  return result.length > 0 ? result : links;
}

