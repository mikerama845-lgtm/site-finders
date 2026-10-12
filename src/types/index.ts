export interface SheetFile {
  id: string;
  name: string;
  vendorName?: string; // Vendor / Supplier name (e.g. from notepad prefix or sheet)
  tabName?: string; // Sub-sheet / Worksheet tab name (e.g. "Fashion", "Health", "ALL Sites")
  groupName?: string;
  sourceUrl?: string; // Original Google Sheet URL or web link
  spreadsheetId?: string; // Google Sheet ID
  gid?: string; // Google Sheet tab GID
  size: number;
  rowCount: number;
  columns: string[];
  detectedColumns: {
    urlCol?: string;
    serialCol?: string;
    priceCol?: string;
    priceUsdCol?: string;
    pricePkrCol?: string;
    nicheCol?: string;
    drCol?: string;
    trafficCol?: string;
    tatCol?: string;
    linkTypeCol?: string;
    vendorCol?: string;
    linkInsertionCol?: string;
  };
  rows: Record<string, string>[];
  uploadedAt: string;
  isNotepadImport?: boolean;
}

export interface MatchedResult {
  id: string;
  sheetId: string;
  sheetName: string;
  vendorName: string; // Dedicated Vendor Name displayed in table & quotes
  tabName?: string; // Sub-sheet / Worksheet tab name (e.g. "Fashion", "Health")
  groupName?: string;
  rowIndex: number; // 1-based data row index
  sheetRowNumber: number; // 1-based row number in spreadsheet (accounting for header row = rowIndex + 1)
  sheetSourceUrl?: string; // Base Google Sheet URL
  directSheetUrl?: string; // Direct link to open Google Sheets right at this row (&range=A{sheetRowNumber})
  serialNumber: string;
  rawUrl: string;
  normalizedUrl: string;
  cleanDomain: string;
  price?: number;
  rawPrice?: string; // Formatted price (combined if both USD and PKR exist)
  rawPriceUsd?: string; // Specific USD price e.g. "$100"
  priceUsd?: number;
  rawPricePkr?: string; // Specific PKR price e.g. "PKR 28,000"
  pricePkr?: number;
  currency?: string; // 'USD', 'PKR', 'BOTH', etc.
  linkInsertion?: string; // Link insertion price / service details if present (e.g. "$50", "PKR 3,000")
  niche?: string;
  dr?: string;
  traffic?: string;
  tat?: string; // Turn Around Time e.g. "24 Hours", "2 Days"
  linkType?: string;
  allFields: Record<string, string>;
  isLowestPrice?: boolean;
}

export type SearchMode = 'smart' | 'exact' | 'contains';

export interface BatchSearchItemResult {
  query: string;
  normalizedQuery: string;
  matches: MatchedResult[];
  status: 'found' | 'not_found';
  lowestPrice?: number;
  bestSheetName?: string;
  bestVendorName?: string;
}

export interface SecurityConfig {
  isLocked: boolean;
  pinHash: string;
  hasCustomPin: boolean;
}

export type UserRole = 'admin' | 'user';
export type UserAccessStatus = 'approved' | 'pending' | 'rejected';

export interface UserAccessRecord {
  email: string;
  role: UserRole;
  status: UserAccessStatus;
  createdAt: string;
  approvedAt?: string;
  lastActiveAt?: string;
  sheetCount?: number;
}

export interface AuthSession {
  email: string;
  role: UserRole;
  status: UserAccessStatus;
  approved: boolean;
}
