import Papa from 'papaparse';
import { SheetFile } from '../types';
import { detectColumns } from './csvParser';
import { extractDomainFromString } from './urlMatcher';

/**
 * Detects whether the text is tab-separated, comma-separated, semicolon-separated, or pipe-separated.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  let tabCount = 0;
  let commaCount = 0;
  let semiCount = 0;
  let pipeCount = 0;

  for (const line of lines) {
    tabCount += (line.match(/\t/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
    semiCount += (line.match(/;/g) || []).length;
    pipeCount += (line.match(/\|/g) || []).length;
  }

  if (tabCount >= commaCount && tabCount >= semiCount && tabCount > 0) return '\t';
  if (pipeCount >= commaCount && pipeCount > tabCount && pipeCount > 0) return '|';
  if (semiCount > commaCount && semiCount > 0) return ';';
  return ',';
}

/**
 * Parses raw text into clean rows and headers, even if the text has no headers or has a title on top.
 */
export function parseTableText(rawText: string, fallbackSheetName: string = 'Sheet'): {
  sheetName: string;
  vendorName: string;
  columns: string[];
  rows: Record<string, string>[];
} {
  const trimmed = rawText.trim();
  const cleanFallback = cleanExtractedVendorTitle(fallbackSheetName);
  if (!trimmed) {
    return { sheetName: cleanFallback, vendorName: cleanFallback, columns: [], rows: [] };
  }

  const delimiter = detectDelimiter(trimmed);
  let effectiveText = trimmed;
  let detectedTitle = cleanFallback;

  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { sheetName: cleanFallback, vendorName: cleanFallback, columns: [], rows: [] };
  }

  // Check if first line is a title (e.g. "Vendor 1" or "Mahnoor" with 0 or 1 delimiter, while line 2 has multiple delimiters)
  const firstLineDelims = (lines[0].match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
  const secondLineDelims = lines.length > 1 ? (lines[1].match(new RegExp(`\\${delimiter}`, 'g')) || []).length : 0;

  if (lines.length > 1 && firstLineDelims === 0 && secondLineDelims >= 1) {
    // First line is a vendor title!
    detectedTitle = cleanExtractedVendorTitle(lines[0]) || cleanFallback;
    effectiveText = lines.slice(1).join('\n');
  }

  // Parse with PapaParse
  const parsed = Papa.parse<string[]>(effectiveText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });

  const rawRows: string[][] = (parsed.data || []).filter(r => r && r.some(cell => cell && String(cell).trim().length > 0));
  if (rawRows.length === 0) {
    return { sheetName: detectedTitle, vendorName: detectedTitle, columns: [], rows: [] };
  }

  // Check if any of the first 4 rows is a true header row
  let headerRowIdx = -1;
  const domainRegex = /([a-z0-9-]+\.(?:com|org|net|io|co|ai|info|biz|me|de|fr|tech|media|app|it|es|us))/i;
  const commonHeaderKeywords = [
    'site', 'url', 'web', 'domain', 'price', 'rate', 'pkr', 'usd', '$',
    'tat', 'turnaround', 'delivery', 'link', 'insert', 'niche', 'category', 'cat', 'dr', 'da', 'traffic', 'sr', 'sno', 'vender', 'vendor'
  ];

  for (let r = 0; r < Math.min(4, rawRows.length); r++) {
    const rowCells = rawRows[r].map(c => String(c || '').trim());
    const matchesKeyword = rowCells.filter(c => commonHeaderKeywords.some(kw => c.toLowerCase().includes(kw))).length;
    const hasDomain = rowCells.some(c => domainRegex.test(c));

    if (matchesKeyword >= 2 && !hasDomain) {
      headerRowIdx = r;
      break;
    }
    if (matchesKeyword >= 1 && !hasDomain && r === 0) {
      headerRowIdx = 0;
      break;
    }
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (headerRowIdx !== -1) {
    const rawHeaders = rawRows[headerRowIdx].map(h => String(h || '').trim());
    const seenNames = new Map<string, number>();
    headers = rawHeaders.map((h, i) => {
      let base = h || `Column_${i + 1}`;
      const count = seenNames.get(base.toLowerCase()) || 0;
      seenNames.set(base.toLowerCase(), count + 1);
      return count > 0 ? `${base}_${count + 1}` : base;
    });
    dataRows = rawRows.slice(headerRowIdx + 1);
  } else {
    // Headerless data: synthesize unique headers intelligently
    let foundUsd = false;
    let foundPkr = false;
    let foundTat = false;
    let foundUrl = false;
    let foundLinkInsert = false;

    const row0 = rawRows[0].map(c => String(c || '').trim());
    headers = row0.map((val, i) => {
      const valLower = val.toLowerCase();

      // Website / Domain
      if (domainRegex.test(val) && !foundUrl) {
        foundUrl = true;
        return 'Website';
      }

      // Turnaround time (e.g. "24 Hours", "2 Days", "48h", "3-5 Days")
      if (/\b(\d+\s*(?:hours?|hrs?|days?)|24h|48h|instant|immediate)\b/i.test(val) && !foundTat) {
        foundTat = true;
        return 'TAT';
      }

      // Explicit PKR currency or 4-6 digit price (e.g. "PKR 14000", "Rs. 12000", "14000")
      if ((/pkr|rs\.?|rupee/i.test(val) || (/^\d{4,6}$/.test(val) && parseInt(val, 10) >= 1000)) && !foundPkr) {
        foundPkr = true;
        return 'Price_PKR';
      }

      // Explicit USD currency or typical USD amount (e.g. "$50", "USD 50", "80")
      if ((val.startsWith('$') || /usd/i.test(val) || (/^\d{1,3}$/.test(val) && parseInt(val, 10) >= 10 && parseInt(val, 10) < 1000 && !foundUsd)) && !foundUsd) {
        foundUsd = true;
        return 'Price_USD';
      }

      // Second price (e.g. Link Insertion)
      if ((val.startsWith('$') || /^\d{1,3}$/.test(val)) && foundUsd && !foundLinkInsert) {
        foundLinkInsert = true;
        return 'Link_Insert';
      }

      // If column 0 is a small serial number 1, 2, 3...
      if (i === 0 && /^\d{1,4}$/.test(val)) return 'Serial_No';

      // 1-3 digit metric (DR/DA)
      if (/^\d{1,3}$/.test(val) && i > 1) return 'DR';

      return `Column_${i + 1}`;
    });

    dataRows = rawRows;
  }

  // Convert array rows into Record<string, string>
  const structuredRows: Record<string, string>[] = dataRows.map(rowArr => {
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowArr[idx] !== undefined && rowArr[idx] !== null ? String(rowArr[idx]).trim() : '';
    });
    return rowObj;
  });

  return {
    sheetName: detectedTitle,
    vendorName: detectedTitle,
    columns: headers,
    rows: structuredRows,
  };
}

/**
 * Cleans extracted vendor/sheet titles
 */
export function cleanExtractedVendorTitle(raw: string): string {
  let title = raw
    .replace(/\.[^/.]+$/, '') // remove .csv
    .replace(/^[0-9]+[.\-:\)]\s*/, '') // remove numbering like "1. ", "2) ", "#3 "
    .replace(/^(?:vender\s*name|vendor\s*name|vender|vendor|supplier|sheet\s*name|sheet|seller|partner)\s*[:=\-]?\s*/i, '')
    .replace(/^[=\-#*\[\]:\s]+|[=\-#*\[\]:\s]+$/g, '')
    .trim();

  return title || 'Vendor Sheet';
}

/**
 * Splits raw multi-sheet text into individual sheet chunks.
 * Handles headings like:
 * - "Mahnoor" (standalone line before table)
 * - "1. Mahnoor" or "1) Mahnoor"
 * - "Vendor Name: Mahnoor" or "Vender: Mahnoor"
 * - "=== Mahnoor ==="
 * - Repeated header rows
 */
export function splitMultiSheetDump(rawText: string): { title: string; content: string }[] {
  const clean = rawText.trim();
  if (!clean) return [];

  const lines = clean.split(/\r?\n/);
  const sections: { title: string; content: string }[] = [];

  // Patterns that unambiguously denote a sheet/vendor divider
  const explicitDividerRegex = /^(?:={3,}|-{3,}|\*{3,}|#{1,4}|\[|(?:vender\s*name|vendor\s*name|vender|vendor|sheet\s*name|sheet|supplier|tab)\b|[0-9]+[.\-:\)])\s*[:=\-]?\s*(.+?)(?:\]|={3,}|-{3,}|\*{3,})?$/i;

  let currentTitle = 'Vendor 1';
  let currentLines: string[] = [];
  let foundExplicitHeaders = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check 1: Explicit divider regex
    const match = trimmedLine.match(explicitDividerRegex);
    const isExplicit = !!match && trimmedLine.length < 100 && !trimmedLine.includes('\t') && (trimmedLine.match(/,/g) || []).length < 2;

    // Check 2: Standalone vendor title (short line with 0 tabs/commas, followed by a table line with >= 1 tabs or commas)
    let isStandaloneTitle = false;
    let standaloneCandidate = '';
    if (!isExplicit && trimmedLine.length > 0 && trimmedLine.length < 60 && !trimmedLine.includes('\t') && !trimmedLine.includes(',') && !trimmedLine.includes('http')) {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const nextHasTabs = (nextLine.match(/\t/g) || []).length >= 1;
      const nextHasCommas = (nextLine.match(/,/g) || []).length >= 2;
      if (nextHasTabs || nextHasCommas) {
        isStandaloneTitle = true;
        standaloneCandidate = trimmedLine;
      }
    }

    if (isExplicit || isStandaloneTitle) {
      foundExplicitHeaders = true;
      if (currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
        currentLines = [];
      }

      const rawMatched = isExplicit && match ? match[1] : standaloneCandidate;
      currentTitle = cleanExtractedVendorTitle(rawMatched) || `Vendor ${sections.length + 1}`;
      continue;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  // If no explicit divider syntax was found, check if there are repeated header lines
  if (!foundExplicitHeaders && sections.length === 1 && lines.length > 5) {
    const firstNonEmptyLine = lines.find(l => l.trim().length > 0) || '';
    const normFirstHeader = firstNonEmptyLine.toLowerCase().replace(/[\s\t,;]+/g, '');

    const headerIndices: number[] = [];
    lines.forEach((l, idx) => {
      const norm = l.toLowerCase().replace(/[\s\t,;]+/g, '');
      if (norm.length > 4 && norm === normFirstHeader) {
        headerIndices.push(idx);
      }
    });

    if (headerIndices.length > 1) {
      const splitSections: { title: string; content: string }[] = [];
      for (let k = 0; k < headerIndices.length; k++) {
        const start = headerIndices[k];
        const end = k + 1 < headerIndices.length ? headerIndices[k + 1] : lines.length;
        const block = lines.slice(start, end).join('\n').trim();
        if (block) {
          splitSections.push({
            title: `Reseller Vendor ${k + 1}`,
            content: block,
          });
        }
      }
      return splitSections;
    }
  }

  return sections.filter(s => s.content.length > 0);
}

/**
 * Main importer for:
 * 1. "Paste 20+ Sheets Together" (multi)
 * 2. "Paste Single Sheet" (single)
 */
export function parsePastedSheets(
  rawText: string,
  mode: 'multi' | 'single',
  customTitle?: string
): SheetFile[] {
  const clean = rawText.trim();
  if (!clean) return [];

  if (mode === 'single') {
    const cleanTitle = cleanExtractedVendorTitle(customTitle || 'Pasted Sheet');
    const table = parseTableText(clean, cleanTitle);
    if (table.rows.length === 0) return [];

    const detectedColumns = detectColumns(table.columns, table.rows.slice(0, 10));
    const vendorName = table.vendorName || cleanTitle;

    return [
      {
        id: `sheet_single_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `${vendorName}.csv`,
        vendorName,
        groupName: 'Single Pasted Sheets',
        size: new Blob([clean]).size,
        rowCount: table.rows.length,
        columns: table.columns,
        detectedColumns,
        rows: table.rows,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotepadImport: true,
      },
    ];
  }

  // Multi mode: split 20+ sheets
  const sections = splitMultiSheetDump(clean);
  const resultSheets: SheetFile[] = [];

  sections.forEach((sec, idx) => {
    const table = parseTableText(sec.content, sec.title || `Vendor ${idx + 1}`);
    if (table.rows.length > 0) {
      const detectedColumns = detectColumns(table.columns, table.rows.slice(0, 10));
      const vendorName = cleanExtractedVendorTitle(sec.title || table.vendorName || `Vendor ${idx + 1}`);

      resultSheets.push({
        id: `sheet_multi_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: `${vendorName}.csv`,
        vendorName,
        groupName: 'Batch 20+ Sheets Dump',
        size: new Blob([sec.content]).size,
        rowCount: table.rows.length,
        columns: table.columns,
        detectedColumns,
        rows: table.rows,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotepadImport: true,
      });
    }
  });

  // Fallback: If sections couldn't split, parse as 1 master sheet
  if (resultSheets.length === 0) {
    const fallbackTitle = cleanExtractedVendorTitle(customTitle || 'Master Reseller Sheet');
    const table = parseTableText(clean, fallbackTitle);
    if (table.rows.length > 0) {
      const detectedColumns = detectColumns(table.columns, table.rows.slice(0, 10));
      const vendorName = cleanExtractedVendorTitle(table.vendorName || fallbackTitle);

      resultSheets.push({
        id: `sheet_multi_fallback_${Date.now()}`,
        name: `${vendorName}.csv`,
        vendorName,
        groupName: 'Batch 20+ Sheets Dump',
        size: new Blob([clean]).size,
        rowCount: table.rows.length,
        columns: table.columns,
        detectedColumns,
        rows: table.rows,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isNotepadImport: true,
      });
    }
  }

  return resultSheets;
}
