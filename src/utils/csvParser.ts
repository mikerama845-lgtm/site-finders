import Papa from 'papaparse';
import { SheetFile } from '../types';

/**
 * Detects key columns from header names and sample values
 */
export function detectColumns(headers: string[], sampleRows: Record<string, string>[]) {
  const normHeaders = headers.map(h => ({
    original: h,
    rawLower: h.toLowerCase().trim(),
    clean: h.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
  }));

  const isExcludedForPrice = (clean: string, original: string): boolean => {
    const origLower = original.toLowerCase();
    return (
      origLower.includes('rating') || // domain rating, trust rating
      origLower.includes('authority') || // domain authority
      origLower.includes('traffic') || // organic traffic
      origLower.includes('visitor') ||
      origLower.includes('serial') ||
      origLower.includes('index') ||
      origLower.includes('turnaround') ||
      origLower.includes('delivery') ||
      origLower.includes('tat') ||
      /\b(dr|da|ur|as|rd|ss)\b/i.test(origLower)
    );
  };

  const findCol = (
    exactKeywords: string[],
    containsKeywords: string[] = [],
    boundaryRegex?: RegExp,
    excludePriceFilter: boolean = false
  ): string | undefined => {
    // 1. Exact clean match
    for (const kw of exactKeywords) {
      const cleanKw = kw.replace(/[^a-z0-9]/g, '');
      const match = normHeaders.find(h => {
        if (excludePriceFilter && isExcludedForPrice(h.clean, h.original)) return false;
        return h.clean === cleanKw;
      });
      if (match) return match.original;
    }

    // 2. Word boundary regex in original lower header
    if (boundaryRegex) {
      const match = normHeaders.find(h => {
        if (excludePriceFilter && isExcludedForPrice(h.clean, h.original)) return false;
        return boundaryRegex.test(h.rawLower);
      });
      if (match) return match.original;
    }

    // 3. Substring match for keywords with >= 2 characters
    for (const kw of containsKeywords) {
      const cleanKw = kw.replace(/[^a-z0-9]/g, '');
      if (cleanKw.length < 2) continue;
      const match = normHeaders.find(h => {
        if (excludePriceFilter && isExcludedForPrice(h.clean, h.original)) return false;
        return h.clean.includes(cleanKw);
      });
      if (match) return match.original;
    }

    return undefined;
  };

  // URL / Website column
  let urlCol = findCol(
    ['website', 'url', 'domain', 'site', 'web', 'targeturl', 'publisher', 'blogurl', 'link', 'portal', 'targetsite'],
    ['website', 'domain', 'targeturl', 'publisher', 'blogurl', 'targetsite'],
    /\b(url|site|domain|website|link|web|publisher)\b/i
  );

  // Fallback: If URL column header wasn't found by name, scan sample row values for domain patterns
  if (!urlCol && sampleRows.length > 0) {
    const domainRegex = /([a-z0-9-]+\.(?:com|org|net|io|co|ai|co\.uk|info|biz|me|de|fr|ca|tech|media|app|it|es|us))/i;
    for (const header of headers) {
      const matchCount = sampleRows.filter(row => {
        const val = row[header];
        return typeof val === 'string' && domainRegex.test(val);
      }).length;

      if (matchCount >= Math.min(2, sampleRows.length)) {
        urlCol = header;
        break;
      }
    }
  }

  // Serial Number / Row ID
  const serialCol = findCol(
    ['sr', 'sno', 'serial', 'slno', 'id', 'index', 'number', 'row', 'code', 'no'],
    ['serialno', 'serialnum', 'slno'],
    /\b(sr\.?\s*no\.?|s\.?\s*no\.?|serial|sl\.?\s*no\.?|row\s*#?|#)\b/i
  );

  // Specific PKR Price Column e.g. "Price (PKR)", "Rate PKR", "Price in PKR", "PKR", "Rs", "Rates (PKR)", "PKR Price"
  let pricePkrCol = findCol(
    [
      'pkr', 'pricepkr', 'ratepkr', 'pkrprice', 'pkrrate', 'priceinpkr', 'rateinpkr', 'ratesinpkr',
      'pricers', 'raters', 'rsprice', 'rsrate', 'rs', 'rupees', 'rupeeprice', 'pakrs', 'pakrupees',
      'pkrcost', 'costpkr', 'pkrreat', 'reatpkr'
    ],
    ['pkr', 'rs', 'rupee', 'pricepkr', 'ratepkr', 'pricers', 'raters'],
    /\b(price\s*\(?pkr\)?|rate\s*\(?pkr\)?|rates\s*\(?pkr\)?|pkr\s*price|pkr\s*rate|rates?\s*in\s*pkr|\(pkr\)|\(rs\.?\)|price\s*in\s*pkr|rate\s*in\s*pkr|\bpkr\b|\brs\.?\b|rupees?)\b/i,
    true
  );

  // Specific USD Price Column e.g. "Price ($)", "Price (USD)", "USD Price", "Rate ($)", "USD", "Rate (USD)"
  let priceUsdCol = findCol(
    [
      'priceusd', 'rateusd', 'usdprice', 'usdrate', 'usd', 'priceinusd', 'rateinusd', 'ratesinusd',
      'price$', 'rate$', 'rates$', 'costusd', 'usdcost', 'guestpostpriceusd', 'gppriceusd', 'gpusd',
      'dollar', 'dollars', 'dollarprice', 'dollarrate'
    ],
    ['priceusd', 'rateusd', 'usd', 'dollar'],
    /\b(price\s*\(?(?:usd|\$)\)?|rate\s*\(?(?:usd|\$)\)?|rates\s*\(?(?:usd|\$)\)?|usd\s*price|usd\s*rate|\(usd\)|\(\$\)|price\s*in\s*usd|rate\s*in\s*usd|\busd\b|dollars?)\b/i,
    true
  );

  // General Price / Rate / Reat Column (With EXCLUSION of DR / Rating / Traffic)
  let priceCol = findCol(
    [
      'price', 'prices', 'rate', 'rates', 'reat', 'reats', 'reet', 'cost', 'costs',
      'resellerprice', 'resellerrate', 'clientprice', 'clientrate', 'adminprice', 'adminrate',
      'vendorprice', 'vendorrate', 'gpprice', 'gprate', 'guestpostprice', 'guestpostrate',
      'postprice', 'postrate', 'linkprice', 'linkrate', 'fee', 'fees', 'charges', 'charge',
      'amount', 'normalprice', 'buyingprice', 'sellingprice', 'ourprice', 'finalprice'
    ],
    ['price', 'rate', 'reat', 'cost', 'charge'],
    /(\$|usd|pkr|inr|eur|gbp|\b(rate|price|reat|cost|charges?|fee)\b)/i,
    true // exclude DR / Rating / Traffic / Serials
  );

  // Cross-column deduction for Dual USD + PKR Sheets:
  // If pricePkrCol was found, and priceCol was found, but priceUsdCol wasn't explicitly found:
  // Then the general priceCol is the USD price!
  if (pricePkrCol && priceCol && priceCol !== pricePkrCol && !priceUsdCol) {
    priceUsdCol = priceCol;
  }
  // If priceUsdCol was found and priceCol was found and different, check if priceCol might be PKR
  if (priceUsdCol && priceCol && priceCol !== priceUsdCol && !pricePkrCol) {
    const pColLower = priceCol.toLowerCase();
    if (pColLower.includes('pkr') || pColLower.includes('rs') || pColLower.includes('rupee')) {
      pricePkrCol = priceCol;
    }
  }

  // Scan sample row values if still missing either PKR or USD
  if (sampleRows.length > 0 && (!pricePkrCol || !priceUsdCol)) {
    for (const h of headers) {
      if (h === urlCol || h === serialCol) continue;
      const hLower = h.toLowerCase();
      if (isExcludedForPrice(h.toLowerCase().replace(/[^a-z0-9]/g, ''), h)) continue;

      const pkrSampleCount = sampleRows.filter(row => {
        const val = String(row[h] || '').trim();
        return /pkr|rs\.?|rupee/i.test(val) || (/^\d{4,6}$/.test(val) && parseInt(val, 10) >= 1000);
      }).length;

      if (!pricePkrCol && (hLower.includes('pkr') || hLower.includes('rs') || pkrSampleCount >= Math.min(2, sampleRows.length))) {
        pricePkrCol = h;
      }

      const usdSampleCount = sampleRows.filter(row => {
        const val = String(row[h] || '').trim();
        return val.startsWith('$') || /usd/i.test(val) || (/^\d{1,3}$/.test(val) && parseInt(val, 10) > 0 && parseInt(val, 10) < 1000);
      }).length;

      if (!priceUsdCol && (hLower.includes('usd') || hLower.includes('$') || usdSampleCount >= Math.min(2, sampleRows.length))) {
        if (h !== pricePkrCol) {
          priceUsdCol = h;
        }
      }
    }
  }

  // Vendor / Supplier / Seller Column (Includes "Vender" with 'e' and 'o')
  const vendorCol = findCol(
    [
      'vender', 'vendername', 'venders', 'vendor', 'vendorname', 'vendors',
      'supplier', 'suppliername', 'reseller', 'provider', 'seller', 'owner',
      'admin', 'sheetname', 'sheet', 'blogger', 'publisher', 'partner', 'source', 'contact'
    ],
    ['vender', 'vendor', 'supplier', 'reseller', 'provider', 'seller'],
    /\b(vender\s*name|vendor\s*name|vender|vendor|supplier|reseller|sheet\s*name|owner|admin)\b/i
  );

  // DR / Domain Rating / DA
  const drCol = findCol(
    ['dr', 'domainrating', 'da', 'domainauthority', 'as', 'authorityscore', 'ahrefsdr', 'mozda', 'ur'],
    ['domainrating', 'domainauthority', 'authorityscore', 'ahrefsdr'],
    /\b(dr|da|domain\s*rating|domain\s*authority)\b/i
  );

  // Traffic / Monthly Visitors
  const trafficCol = findCol(
    ['traffic', 'organictraffic', 'monthlytraffic', 'visitors', 'ahrefstraffic', 'semrushtraffic', 'visits'],
    ['traffic', 'visitor', 'visits'],
    /\b(traffic|visitors?|monthly\s*traffic)\b/i
  );

  // Niche / Category
  const nicheCol = findCol(
    ['niche', 'category', 'vertical', 'topic', 'genre', 'industry', 'cat', 'siteniche', 'sitecategory'],
    ['category', 'niche', 'vertical', 'industry'],
    /\b(niche|cat|category|vertical|industry|topic)\b/i
  );

  // Turnaround Time (TAT)
  const tatCol = findCol(
    [
      'tat', 'turnaround', 'turnaroundtime', 'turnarounddays', 'turnaroundhours',
      'delivery', 'deliverytime', 'deliverydays', 'duration', 'time',
      'publishingtime', 'livetime', 'tatdays', 'tathours'
    ],
    ['turnaround', 'delivery', 'tat'],
    /\b(tat|turnaround|turn\s*around|delivery(?:\s*time)?|publishing\s*time|live\s*time)\b/i
  );

  // Link Type (DoFollow / NoFollow)
  const linkTypeCol = findCol(
    ['linktype', 'type', 'dofollow', 'rel', 'attribute', 'nature'],
    ['linktype', 'dofollow'],
    /\b(link\s*type|dofollow|follow)\b/i
  );

  // Link Insertion / Link Insert Column
  const linkInsertionCol = findCol(
    [
      'linkinsertion', 'linkinsertionprice', 'linkinsertionrate', 'linkinsert',
      'linkinsertprice', 'linkinsertrate', 'liprice', 'lirate', 'licost', 'insertionprice',
      'insertionrate', 'linkinsertioncost', 'linkinsertcost', 'linkinsertionfee',
      'linkinsertfee', 'insertion', 'existingpost', 'existingpostprice', 'existinglink', 'cdb'
    ],
    ['linkinsert', 'linkinsertion', 'insertionprice', 'insertionrate', 'liprice', 'existingpost'],
    /\b(link\s*insert(?:ion)?(?:\s*(?:price|rate|cost|fee|\$|pkr))?|insert(?:ion)?\s*(?:price|rate|cost)|li\s*price|existing\s*post|cdb)\b/i
  );

  return {
    urlCol,
    serialCol,
    priceCol,
    priceUsdCol,
    pricePkrCol,
    nicheCol,
    drCol,
    trafficCol,
    tatCol,
    linkTypeCol,
    vendorCol,
    linkInsertionCol,
  };
}

/**
 * Finds the actual header row index in raw lines or rows.
 * Handles banners with emails/WhatsApp, instructions, or merged title rows on rows 1-15.
 */
function findHeaderRowIndex(rawGrid: string[][]): number {
  if (rawGrid.length === 0) return 0;
  
  const domainRegex = /([a-z0-9-]+\.(?:com|org|net|io|co|ai|info|biz|me|de|fr|tech|media|app|it|es|us))/i;
  const headerKeywords = [
    'website', 'url', 'site', 'domain', 'price', 'rate', 'pkr', 'usd', '$',
    'tat', 'turnaround', 'delivery', 'link', 'insert', 'niche', 'category', 'dr', 'da', 'traffic', 'sr', 'sno', 'publisher'
  ];

  // 1. Look for a row with at least 2 header keywords that does not contain raw domains
  for (let i = 0; i < Math.min(30, rawGrid.length); i++) {
    const row = rawGrid[i].map(c => String(c || '').trim().toLowerCase());
    const matchesKeyword = row.filter(cell => headerKeywords.some(kw => cell.includes(kw))).length;
    const hasDomain = row.some(cell => domainRegex.test(cell));

    if (matchesKeyword >= 2 && !hasDomain) {
      return i;
    }
  }

  // 2. Look for the first row that contains domain data (data rows like naver.com, harvard.edu)
  for (let i = 0; i < Math.min(30, rawGrid.length); i++) {
    const row = rawGrid[i].map(c => String(c || '').trim());
    const domainMatches = row.filter(cell => domainRegex.test(cell)).length;
    if (domainMatches >= 1) {
      // The row right above data row is typically the header row
      if (i > 0) {
        return i - 1;
      }
      return 0;
    }
  }

  return 0;
}

/**
 * Parses a single CSV File object using PapaParse
 */
export function parseCsvFile(file: File): Promise<SheetFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rawGrid = (results.data || []).filter(r => r && r.some(c => c && String(c).trim().length > 0));
        if (rawGrid.length === 0) {
          return reject(new Error('File is empty'));
        }

        const headerIdx = findHeaderRowIndex(rawGrid);
        const headerRow = rawGrid[headerIdx].map((h, i) => String(h || '').trim() || `Column_${i + 1}`);
        const dataRows = rawGrid.slice(headerIdx + 1);

        const rows: Record<string, string>[] = dataRows.map(rowArr => {
          const rowObj: Record<string, string> = {};
          headerRow.forEach((h, i) => {
            rowObj[h] = rowArr[i] !== undefined && rowArr[i] !== null ? String(rowArr[i]).trim() : '';
          });
          return rowObj;
        });

        const detectedColumns = detectColumns(headerRow, rows.slice(0, 10));

        // Clean base name for vendor display
        const baseName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/^(?:vender|vendor|supplier|sheet)\s*[:=\-]?\s*/i, '')
          .replace(/[_\-]+/g, ' ')
          .trim();

        const parsedSheet: SheetFile = {
          id: `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          vendorName: baseName || file.name,
          size: file.size,
          rowCount: rows.length,
          columns: headerRow,
          detectedColumns,
          rows,
          uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        resolve(parsedSheet);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parses CSV string content (for demo/sample datasets or Google Sheets)
 */
export function parseCsvString(csvString: string, fileName: string, vendorOverride?: string): SheetFile {
  const parsed = Papa.parse<string[]>(csvString.trim(), {
    header: false,
    skipEmptyLines: 'greedy',
  });

  const rawGrid = (parsed.data || []).filter(r => r && r.some(c => c && String(c).trim().length > 0));
  if (rawGrid.length === 0) {
    return {
      id: `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: fileName,
      vendorName: vendorOverride || fileName,
      size: 0,
      rowCount: 0,
      columns: [],
      detectedColumns: {},
      rows: [],
      uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const headerIdx = findHeaderRowIndex(rawGrid);
  const headerRow = rawGrid[headerIdx].map((h, i) => String(h || '').trim() || `Column_${i + 1}`);
  const dataRows = rawGrid.slice(headerIdx + 1);

  const rows: Record<string, string>[] = dataRows.map(rowArr => {
    const rowObj: Record<string, string> = {};
    headerRow.forEach((h, i) => {
      rowObj[h] = rowArr[i] !== undefined && rowArr[i] !== null ? String(rowArr[i]).trim() : '';
    });
    return rowObj;
  });

  const detectedColumns = detectColumns(headerRow, rows.slice(0, 10));

  const cleanVendor = vendorOverride?.trim() || fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/^(?:vender|vendor|supplier|sheet)\s*[:=\-]?\s*/i, '')
    .replace(/[_\-]+/g, ' ')
    .trim();

  return {
    id: `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: fileName,
    vendorName: cleanVendor || fileName,
    size: new Blob([csvString]).size,
    rowCount: rows.length,
    columns: headerRow,
    detectedColumns,
    rows,
    uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
