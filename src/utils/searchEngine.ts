import { SheetFile, MatchedResult, SearchMode, BatchSearchItemResult } from '../types';
import {
  matchesQuery,
  normalizeUrl,
  parsePrice,
  extractDomainFromString,
  isLikelyUrlOrDomain,
} from './urlMatcher';

export function searchSheets(
  sheets: SheetFile[],
  query: string,
  mode: SearchMode = 'smart'
): MatchedResult[] {
  const trimmed = query.trim();
  if (!trimmed || sheets.length === 0) return [];

  const results: MatchedResult[] = [];

  for (const sheet of sheets) {
    const urlCol = sheet.detectedColumns.urlCol;
    const serialCol = sheet.detectedColumns.serialCol;
    const priceCol = sheet.detectedColumns.priceCol;
    const priceUsdCol = sheet.detectedColumns.priceUsdCol;
    const pricePkrCol = sheet.detectedColumns.pricePkrCol;
    const nicheCol = sheet.detectedColumns.nicheCol;
    const drCol = sheet.detectedColumns.drCol;
    const trafficCol = sheet.detectedColumns.trafficCol;
    const tatCol = sheet.detectedColumns.tatCol;
    const linkTypeCol = sheet.detectedColumns.linkTypeCol;
    const vendorCol = sheet.detectedColumns.vendorCol;
    const linkInsertionCol = sheet.detectedColumns.linkInsertionCol;

    sheet.rows.forEach((row, idx) => {
      let isMatch = false;
      let matchedRawUrl = '';

      // 1. Primary Check: If this sheet has a designated URL column, ONLY check that URL column!
      // This strictly prevents returning a random site from the sheet when searching for a domain.
      if (urlCol && row[urlCol]) {
        if (matchesQuery(row[urlCol], trimmed, mode)) {
          isMatch = true;
          matchedRawUrl = row[urlCol];
        }
      }

      // 2. If the sheet does NOT have a designated URL column:
      // Only check cells that actually contain a valid URL or domain!
      if (!isMatch && !urlCol) {
        for (const [colName, cellVal] of Object.entries(row)) {
          if (
            cellVal &&
            typeof cellVal === 'string' &&
            cellVal.trim().length > 0 &&
            isLikelyUrlOrDomain(cellVal)
          ) {
            if (matchesQuery(cellVal, trimmed, mode)) {
              isMatch = true;
              matchedRawUrl = cellVal;
              break;
            }
          }
        }
      }

      // 3. Fallback: Serial Number exact match (e.g. user typed "#15" or "SN-102")
      if (!isMatch && serialCol && row[serialCol]) {
        const sVal = String(row[serialCol]).trim();
        if (sVal.toLowerCase() === trimmed.toLowerCase()) {
          isMatch = true;
          matchedRawUrl = (urlCol && row[urlCol]) || sVal;
        }
      }

      if (isMatch) {
        // If matchedRawUrl doesn't look like a URL but row[urlCol] does, prefer row[urlCol]
        if (urlCol && row[urlCol] && extractDomainFromString(row[urlCol])) {
          matchedRawUrl = row[urlCol];
        }

        const norm = normalizeUrl(matchedRawUrl);

        // Derive serial number
        const serialNumber = serialCol && row[serialCol] && row[serialCol].trim().length > 0
          ? String(row[serialCol]).trim()
          : `#${idx + 1}`;

        // Derive ALL prices (supports BOTH USD and PKR in the same sheet!)
        const {
          price,
          rawPrice,
          rawPriceUsd,
          priceUsd,
          rawPricePkr,
          pricePkr,
          currency,
        } = resolveAllPrices(row, priceCol, priceUsdCol, pricePkrCol, serialCol, drCol, trafficCol);

        // Derive Link Insertion details & price if mentioned in the sheet
        const linkInsertion = resolveLinkInsertion(row, linkInsertionCol, currency);

        // Derive TAT (Turnaround Time)
        const tat = findSafeTAT(row, tatCol);

        // Derive Niche / Category
        const niche = findSafeNiche(row, nicheCol);

        // Derive EXACT vendor name
        const vendorName = deriveExactVendorName(row, vendorCol, sheet);

        // Clean domain name
        const cleanDomain = norm.hostname || extractDomainFromString(matchedRawUrl) || norm.cleaned || trimmed;

        const sheetRowNumber = idx + 2; // Row 1 is header in spreadsheets, row 2 is first data row

        // Compute direct link to jump to this exact row in Google Sheets
        let directSheetUrl: string | undefined = undefined;
        if (sheet.spreadsheetId) {
          const gid = sheet.gid || '0';
          directSheetUrl = `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit#gid=${gid}&range=A${sheetRowNumber}`;
        } else if (sheet.sourceUrl && sheet.sourceUrl.includes('docs.google.com/spreadsheets/d/')) {
          const sMatch = sheet.sourceUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (sMatch) {
            const gidMatch = sheet.sourceUrl.match(/[#&?]gid=([0-9]+)/);
            const gid = gidMatch ? gidMatch[1] : '0';
            directSheetUrl = `https://docs.google.com/spreadsheets/d/${sMatch[1]}/edit#gid=${gid}&range=A${sheetRowNumber}`;
          }
        }

        // Also check if any cell in this row has a Google Sheets URL
        if (!directSheetUrl) {
          for (const cellVal of Object.values(row)) {
            if (typeof cellVal === 'string' && cellVal.includes('docs.google.com/spreadsheets/d/')) {
              const sMatch = cellVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
              if (sMatch) {
                const gidMatch = cellVal.match(/[#&?]gid=([0-9]+)/);
                const gid = gidMatch ? gidMatch[1] : '0';
                directSheetUrl = `https://docs.google.com/spreadsheets/d/${sMatch[1]}/edit#gid=${gid}&range=A${sheetRowNumber}`;
                break;
              }
            }
          }
        }

        results.push({
          id: `${sheet.id}_row_${idx}`,
          sheetId: sheet.id,
          sheetName: sheet.name,
          vendorName,
          tabName: sheet.tabName,
          groupName: sheet.groupName,
          rowIndex: idx + 1,
          sheetRowNumber,
          sheetSourceUrl: sheet.sourceUrl,
          directSheetUrl,
          serialNumber,
          rawUrl: matchedRawUrl,
          normalizedUrl: norm.cleaned || cleanDomain,
          cleanDomain,
          price,
          rawPrice,
          rawPriceUsd,
          priceUsd,
          rawPricePkr,
          pricePkr,
          currency,
          linkInsertion,
          niche,
          dr: drCol && row[drCol] ? row[drCol] : findFallbackDR(row),
          traffic: trafficCol && row[trafficCol] ? row[trafficCol] : undefined,
          tat,
          linkType: linkTypeCol && row[linkTypeCol] ? row[linkTypeCol] : undefined,
          allFields: row,
        });
      }
    });
  }

  // Determine lowest price flag for each matching domain group (compare within USD or PKR)
  const domainPrices: Record<string, { price: number; currency: string }> = {};
  for (const res of results) {
    if (res.price !== undefined && res.cleanDomain) {
      const curr = res.currency === 'PKR' ? 'PKR' : 'USD';
      const compPrice = curr === 'PKR' ? (res.pricePkr || res.price) : (res.priceUsd || res.price);
      if (compPrice !== undefined) {
        const key = `${res.cleanDomain}_${curr}`;
        if (
          domainPrices[key] === undefined ||
          compPrice < domainPrices[key].price
        ) {
          domainPrices[key] = { price: compPrice, currency: curr };
        }
      }
    }
  }

  for (const res of results) {
    if (res.price !== undefined && res.cleanDomain) {
      const curr = res.currency === 'PKR' ? 'PKR' : 'USD';
      const compPrice = curr === 'PKR' ? (res.pricePkr || res.price) : (res.priceUsd || res.price);
      const key = `${res.cleanDomain}_${curr}`;
      if (
        compPrice !== undefined &&
        domainPrices[key] !== undefined &&
        compPrice === domainPrices[key].price
      ) {
        const hasCompetitors = results.some(
          other => {
            if (other.id === res.id || other.cleanDomain !== res.cleanDomain) return false;
            const otherCurr = other.currency === 'PKR' ? 'PKR' : 'USD';
            if (otherCurr !== curr) return false;
            const otherCompPrice = otherCurr === 'PKR' ? (other.pricePkr || other.price) : (other.priceUsd || other.price);
            return otherCompPrice !== undefined && otherCompPrice > compPrice;
          }
        );
        if (hasCompetitors) {
          res.isLowestPrice = true;
        }
      }
    }
  }

  return results.sort((a, b) => {
    if (a.price !== undefined && b.price !== undefined) {
      if ((a.currency || 'USD') === (b.currency || 'USD')) {
        return a.price - b.price;
      }
    }
    if (a.price !== undefined) return -1;
    if (b.price !== undefined) return 1;
    return 0;
  });
}

/**
 * Helper to extract both USD and PKR if they were written in a single cell
 * e.g. "$50 / 14000 PKR", "$50 (14000 PKR)", "$50 / 14000", "USD 50 | PKR 14000"
 */
function extractBothPricesFromSingleCell(val: string): { usd?: string; pkr?: string } | null {
  if (!val) return null;
  const trimmed = val.trim();

  // Pattern: USD first, then PKR: "$50 / 14000 PKR" or "$50 (14000 PKR)" or "$50 / 14000"
  const dualMatch = trimmed.match(
    /(?:(?:usd|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:\$|usd))\s*(?:[\/|\-–—,]|or|\(|\bto\b)\s*(?:(?:pkr|rs\.?|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:pkr|rs\.?|rupees?)|\s*(\d{4,6}))/i
  );
  if (dualMatch) {
    const usdVal = dualMatch[1] || dualMatch[2];
    const pkrVal = dualMatch[3] || dualMatch[4] || dualMatch[5];
    if (usdVal && pkrVal) {
      return {
        usd: `$${usdVal}`,
        pkr: `PKR ${pkrVal.replace(/,/g, '')}`
      };
    }
  }

  // Reverse pattern: PKR first, then USD: "PKR 14000 / $50"
  const revMatch = trimmed.match(
    /(?:(?:pkr|rs\.?|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:pkr|rs\.?|rupees?))\s*(?:[\/|\-–—,]|or|\(|\bto\b)\s*(?:(?:usd|\$)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:\$|usd))/i
  );
  if (revMatch) {
    const pkrVal = revMatch[1] || revMatch[2];
    const usdVal = revMatch[3] || revMatch[4];
    if (usdVal && pkrVal) {
      return {
        usd: `$${usdVal}`,
        pkr: `PKR ${pkrVal.replace(/,/g, '')}`
      };
    }
  }

  // Slash with 2 numbers: "50 / 14000" (smaller is USD, larger >= 1000 is PKR)
  const slashNumMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[\/|\-–—]\s*(\d+(?:,\d+)*(?:\.\d+)?)$/);
  if (slashNumMatch) {
    const n1 = parseFloat(slashNumMatch[1]);
    const n2 = parseFloat(slashNumMatch[2].replace(/,/g, ''));
    if (n1 > 0 && n2 >= 1000) {
      return { usd: `$${n1}`, pkr: `PKR ${n2}` };
    } else if (n2 > 0 && n1 >= 1000) {
      return { usd: `$${n2}`, pkr: `PKR ${n1}` };
    }
  }

  return null;
}

/**
 * Resolves both USD and PKR prices when both are present in the same sheet or row.
 */
function resolveAllPrices(
  row: Record<string, string>,
  priceCol?: string,
  priceUsdCol?: string,
  pricePkrCol?: string,
  serialCol?: string,
  drCol?: string,
  trafficCol?: string
): {
  price?: number;
  rawPrice?: string;
  rawPriceUsd?: string;
  priceUsd?: number;
  rawPricePkr?: string;
  pricePkr?: number;
  currency?: string;
} {
  let rawUsdVal: string | undefined = undefined;
  let rawPkrVal: string | undefined = undefined;

  // 1. Check designated USD column
  if (priceUsdCol && row[priceUsdCol] && isValidPriceCell(row[priceUsdCol])) {
    const cellVal = row[priceUsdCol].trim();
    const dual = extractBothPricesFromSingleCell(cellVal);
    if (dual) {
      rawUsdVal = dual.usd;
      if (!rawPkrVal) rawPkrVal = dual.pkr;
    } else {
      rawUsdVal = cellVal;
    }
  }

  // 2. Check designated PKR column
  if (pricePkrCol && row[pricePkrCol] && isValidPriceCell(row[pricePkrCol])) {
    const cellVal = row[pricePkrCol].trim();
    const dual = extractBothPricesFromSingleCell(cellVal);
    if (dual) {
      rawPkrVal = dual.pkr;
      if (!rawUsdVal) rawUsdVal = dual.usd;
    } else {
      rawPkrVal = cellVal;
    }
  }

  // 3. If neither or only one is set, check generic priceCol
  if (priceCol && row[priceCol] && isValidPriceCell(row[priceCol])) {
    const cellVal = row[priceCol].trim();
    const dual = extractBothPricesFromSingleCell(cellVal);
    if (dual) {
      if (!rawUsdVal) rawUsdVal = dual.usd;
      if (!rawPkrVal) rawPkrVal = dual.pkr;
    } else {
      const isPkr = /pkr|rs\.?|rupee/i.test(cellVal) || /pkr|rs\.?|rupee/i.test(priceCol);
      if (isPkr && !rawPkrVal) {
        rawPkrVal = cellVal;
      } else if (!isPkr && !rawUsdVal) {
        rawUsdVal = cellVal;
      }
    }
  }

  // 4. Scan other row columns for USD and PKR cells if still missing
  for (const [colName, cellVal] of Object.entries(row)) {
    if (!cellVal || typeof cellVal !== 'string') continue;
    const val = cellVal.trim();
    if (!isValidPriceCell(val)) continue;
    if (colName === serialCol || colName === drCol || colName === trafficCol) continue;
    const colLower = colName.toLowerCase();
    if (
      colLower.includes('rating') ||
      colLower.includes('serial') ||
      colLower.includes('traffic') ||
      colLower.includes('tat') ||
      colLower.includes('delivery') ||
      colLower.includes('turnaround') ||
      /\b(dr|da|sr|id|no)\b/i.test(colLower)
    ) {
      continue;
    }

    // Check single cell containing both
    const dual = extractBothPricesFromSingleCell(val);
    if (dual) {
      if (!rawUsdVal) rawUsdVal = dual.usd;
      if (!rawPkrVal) rawPkrVal = dual.pkr;
      continue;
    }

    // Check for PKR in cell or column name
    const isPkr =
      /pkr|rs\.?|rupee/i.test(val) ||
      /pkr|rs\.?|rupee/i.test(colLower) ||
      (/^\d{4,6}$/.test(val) && parseInt(val, 10) >= 1000 && /(price|rate|reat|cost|fee)/i.test(colLower));

    if (isPkr && !rawPkrVal) {
      rawPkrVal = val;
      continue;
    }

    // Check for USD in cell or column name
    const isUsd =
      val.startsWith('$') ||
      /usd/i.test(val) ||
      colLower.includes('usd') ||
      colLower.includes('$') ||
      (/^\d{1,3}$/.test(val) && parseInt(val, 10) > 0 && parseInt(val, 10) < 1000 && /(price|rate|reat|cost|fee)/i.test(colLower));

    if (isUsd && !rawUsdVal) {
      rawUsdVal = val;
      continue;
    }
  }

  // Format USD
  let priceUsd: number | undefined = undefined;
  let rawPriceUsd: string | undefined = undefined;
  if (rawUsdVal) {
    priceUsd = parsePrice(rawUsdVal);
    if (rawUsdVal.startsWith('$') || rawUsdVal.startsWith('€') || rawUsdVal.startsWith('£')) {
      rawPriceUsd = rawUsdVal;
    } else if (priceUsd !== undefined) {
      rawPriceUsd = `$${priceUsd}`;
    } else {
      rawPriceUsd = rawUsdVal;
    }
  }

  // Format PKR
  let pricePkr: number | undefined = undefined;
  let rawPricePkr: string | undefined = undefined;
  if (rawPkrVal) {
    pricePkr = parsePrice(rawPkrVal);
    if (pricePkr !== undefined) {
      rawPricePkr = `PKR ${pricePkr.toLocaleString()}`;
    } else {
      rawPricePkr = rawPkrVal.toUpperCase().startsWith('PKR') ? rawPkrVal : `PKR ${rawPkrVal}`;
    }
  }

  // Combined price display
  let rawPrice: string | undefined = undefined;
  let currency: string | undefined = undefined;
  let price: number | undefined = undefined;

  if (rawPriceUsd && rawPricePkr) {
    rawPrice = `${rawPriceUsd} / ${rawPricePkr}`;
    currency = 'BOTH';
    price = priceUsd || pricePkr;
  } else if (rawPriceUsd) {
    rawPrice = rawPriceUsd;
    currency = 'USD';
    price = priceUsd;
  } else if (rawPricePkr) {
    rawPrice = rawPricePkr;
    currency = 'PKR';
    price = pricePkr;
  }

  return {
    price,
    rawPrice,
    rawPriceUsd,
    priceUsd,
    rawPricePkr,
    pricePkr,
    currency,
  };
}

function isValidPriceCell(val: string): boolean {
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '--' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'not allowed' ||
    trimmed.toLowerCase() === 'no'
  ) {
    return false;
  }
  return true;
}

/**
 * Extracts and formats Link Insertion price or service status.
 */
function resolveLinkInsertion(
  row: Record<string, string>,
  linkInsertionCol?: string,
  sheetCurrency: string = 'USD'
): string | undefined {
  let rawVal = '';
  let matchedColName = '';

  if (linkInsertionCol && row[linkInsertionCol] && row[linkInsertionCol].trim().length > 0) {
    rawVal = row[linkInsertionCol].trim();
    matchedColName = linkInsertionCol;
  } else {
    for (const [colName, val] of Object.entries(row)) {
      if (val && typeof val === 'string' && val.trim().length > 0) {
        const colLower = colName.toLowerCase();
        if (
          colLower.includes('link insert') ||
          colLower.includes('link insertion') ||
          colLower.includes('li price') ||
          colLower.includes('li rate') ||
          colLower.includes('insertion rate') ||
          colLower.includes('insertion price') ||
          colLower.includes('insertion cost') ||
          (colLower === 'insertion' && val.trim().length > 0)
        ) {
          rawVal = val.trim();
          matchedColName = colName;
          break;
        }
      }
    }
  }

  if (
    !rawVal ||
    rawVal === '-' ||
    rawVal === '--' ||
    rawVal.toLowerCase() === 'n/a' ||
    rawVal.toLowerCase() === 'no' ||
    rawVal.toLowerCase() === 'not allowed' ||
    rawVal.toLowerCase() === 'none'
  ) {
    return undefined;
  }

  const num = parsePrice(rawVal);
  const colLower = matchedColName.toLowerCase();
  const valLower = rawVal.toLowerCase();

  const isPkr =
    valLower.includes('pkr') ||
    valLower.includes('rs') ||
    valLower.includes('rupee') ||
    colLower.includes('pkr') ||
    colLower.includes('rs') ||
    sheetCurrency === 'PKR';

  const isEur = rawVal.startsWith('€') || valLower.includes('eur') || colLower.includes('eur') || sheetCurrency === 'EUR';
  const isGbp = rawVal.startsWith('£') || valLower.includes('gbp') || colLower.includes('gbp') || sheetCurrency === 'GBP';

  if (/^\d+(\.\d+)?$/.test(rawVal) && num !== undefined) {
    if (isPkr) return `PKR ${num.toLocaleString()}`;
    if (isEur) return `€${num}`;
    if (isGbp) return `£${num}`;
    return `$${num}`;
  }

  if (rawVal.startsWith('$') || rawVal.startsWith('€') || rawVal.startsWith('£')) {
    return rawVal;
  }

  if (isPkr && num !== undefined && !valLower.includes('pkr') && !valLower.includes('rs')) {
    return `PKR ${num.toLocaleString()}`;
  }

  return rawVal;
}

/**
 * Extracts TAT (Turnaround Time) cleanly
 */
function findSafeTAT(row: Record<string, string>, tatCol?: string): string | undefined {
  if (tatCol && row[tatCol] && row[tatCol].trim().length > 0) {
    const val = row[tatCol].trim();
    if (val !== '-' && val !== '--' && val.toLowerCase() !== 'n/a') return val;
  }
  for (const [colName, val] of Object.entries(row)) {
    if (val && typeof val === 'string' && val.trim().length > 0) {
      const colLower = colName.toLowerCase();
      if (
        colLower.includes('tat') ||
        colLower.includes('turnaround') ||
        colLower.includes('delivery time') ||
        colLower.includes('delivery') ||
        colLower.includes('duration')
      ) {
        const trimmed = val.trim();
        if (trimmed !== '-' && trimmed !== '--' && trimmed.toLowerCase() !== 'n/a') return trimmed;
      }
    }
  }
  return undefined;
}

/**
 * Extracts Niche / Category cleanly
 */
function findSafeNiche(row: Record<string, string>, nicheCol?: string): string | undefined {
  if (nicheCol && row[nicheCol] && row[nicheCol].trim().length > 0) {
    const val = row[nicheCol].trim();
    if (val !== '-' && val !== '--' && val.toLowerCase() !== 'n/a') return val;
  }
  for (const [colName, val] of Object.entries(row)) {
    if (val && typeof val === 'string' && val.trim().length > 0) {
      const colLower = colName.toLowerCase();
      if (
        colLower.includes('niche') ||
        colLower.includes('category') ||
        colLower.includes('vertical') ||
        colLower.includes('genre') ||
        colLower.includes('industry') ||
        colLower === 'cat'
      ) {
        const trimmed = val.trim();
        if (trimmed !== '-' && trimmed !== '--' && trimmed.toLowerCase() !== 'n/a') return trimmed;
      }
    }
  }
  return undefined;
}

/**
 * Derives the exact vendor name cleanly
 */
function deriveExactVendorName(
  row: Record<string, string>,
  vendorCol: string | undefined,
  sheet: SheetFile
): string {
  // 1. Direct row vendor column
  if (vendorCol && row[vendorCol] && row[vendorCol].trim().length > 0) {
    return cleanVendorName(row[vendorCol]);
  }

  // 2. Scan row for any vendor-like header
  for (const [colName, val] of Object.entries(row)) {
    if (val && typeof val === 'string' && val.trim().length > 0) {
      const colLower = colName.toLowerCase();
      if (
        colLower.includes('vender') ||
        colLower.includes('vendor') ||
        colLower.includes('supplier') ||
        colLower.includes('reseller') ||
        colLower.includes('seller') ||
        colLower.includes('sheet name')
      ) {
        return cleanVendorName(val);
      }
    }
  }

  // 3. Sheet-level vendor name
  if (sheet.vendorName && sheet.vendorName.trim().length > 0) {
    return cleanVendorName(sheet.vendorName);
  }

  // 4. Sheet file name
  return cleanVendorName(sheet.name);
}

function cleanVendorName(raw: string): string {
  return raw
    .replace(/\.[^/.]+$/, '') // remove .csv, .xlsx
    .replace(/^(?:vender\s*name|vendor\s*name|vender|vendor|supplier|sheet\s*name|sheet|seller|partner)\s*[:=\-]?\s*/i, '')
    .replace(/^[0-9]+[.\-:\)]\s*/, '') // remove numbering "1. ", "2) "
    .replace(/^[=\-#*\[\]:\s]+|[=\-#*\[\]:\s]+$/g, '')
    .trim() || 'Vendor';
}

function findFallbackDR(row: Record<string, string>): string | undefined {
  for (const [k, v] of Object.entries(row)) {
    const lk = k.toLowerCase();
    if (lk.includes('dr') || lk.includes('domain rating') || lk.includes('da') || lk.includes('authority')) {
      if (v && v.trim()) return v.trim();
    }
  }
  return undefined;
}

export function batchSearchSheets(
  sheets: SheetFile[],
  urlList: string[],
  mode: SearchMode = 'smart'
): BatchSearchItemResult[] {
  return urlList
    .map(u => u.trim())
    .filter(Boolean)
    .map(query => {
      const norm = normalizeUrl(query);
      const matches = searchSheets(sheets, query, mode);
      let lowestPrice: number | undefined = undefined;
      let bestSheetName: string | undefined = undefined;
      let bestVendorName: string | undefined = undefined;

      for (const m of matches) {
        if (m.price !== undefined) {
          if (lowestPrice === undefined || m.price < lowestPrice) {
            lowestPrice = m.price;
            bestSheetName = m.sheetName;
            bestVendorName = m.vendorName;
          }
        }
      }

      return {
        query,
        normalizedQuery: norm.cleaned || query,
        matches,
        status: matches.length > 0 ? 'found' : 'not_found',
        lowestPrice,
        bestSheetName,
        bestVendorName,
      };
    });
}
