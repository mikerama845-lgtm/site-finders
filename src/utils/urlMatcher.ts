/**
 * High-Precision URL & Site Name Matcher for SEO Resellers.
 * Focuses strongly on the CORE SITE NAME / BRAND NAME,
 * while automatically ignoring protocols (http/https), subdomains (www),
 * domain extensions (.com, .org, .net), and trailing slashes.
 */

export interface NormalizedUrlInfo {
  original: string;
  cleaned: string;          // e.g. "magazine.it.com" or "magazine.it.com/blog"
  hostname: string;         // e.g. "magazine.it.com"
  rootDomain: string;       // e.g. "magazine.it.com"
  coreName: string;         // e.g. "techcrunch", "venturebeat", "magazine"
  normalizedName: string;   // stripped of spaces/hyphens/dots e.g. "venturebeat"
  path: string;
}

const TWO_LEVEL_TLDS = new Set([
  'com.pk', 'org.pk', 'net.pk', 'edu.pk', 'gov.pk', 'web.pk',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'ltd.uk', 'plc.uk',
  'com.au', 'net.au', 'org.au', 'edu.au',
  'co.nz', 'net.nz', 'org.nz',
  'co.in', 'net.in', 'org.in', 'gen.in', 'com.in', 'ind.in',
  'com.br', 'net.br', 'org.br',
  'com.sg', 'edu.sg',
  'co.za', 'net.za', 'org.za',
  'co.jp', 'ne.jp',
  'com.mx', 'edu.mx',
  'com.ph', 'net.ph', 'org.ph',
  'com.my', 'net.my', 'org.my',
  'com.bd', 'org.bd',
  'com.ng', 'net.ng', 'org.ng',
  'com.ar', 'com.tr', 'com.sa', 'com.ae', 'co.ae',
  'it.com', 'us.com', 'eu.com', 'uk.com', 'de.com', 'qc.to',
]);

const COMMON_SINGLE_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'io', 'co', 'ai', 'info', 'biz', 'me', 'de', 'fr',
  'ca', 'tech', 'media', 'app', 'it', 'es', 'us', 'tv',
  'news', 'online', 'site', 'store', 'blog', 'xyz', 'in',
  'pk', 'uk', 'eu', 'cc', 'ws', 'pro', 'club', 'design',
  'life', 'live', 'world', 'today', 'agency', 'global',
  'digital', 'network', 'technology', 'zone', 'press',
  'space', 'center', 'guru', 'link', 'cloud', 'vip'
]);

export function isDomainOrUrlQuery(query: string): boolean {
  if (!query) return false;
  const trimmed = query.trim();
  if (/^(?:https?:)?\/\//i.test(trimmed) || /^www\d*\./i.test(trimmed)) {
    return true;
  }
  if (trimmed.includes('/') && !trimmed.includes(' ')) {
    return true;
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9-_]*(?:\.[a-zA-Z0-9-_]+)+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isLikelyUrlOrDomain(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const str = val.trim();
  if (str.length < 3 || str.length > 250) return false;

  // Obvious non-URLs
  if (str.includes('$') || /^(pkr|rs|usd|eur|gbp)\b/i.test(str)) return false;
  if (/^\d+$/.test(str)) return false;

  if (/^(?:https?:)?\/\//i.test(str) || /^www\d*\./i.test(str)) {
    return true;
  }

  const domain = extractDomainFromString(str);
  if (domain && domain.length >= 4) {
    const wordCount = str.split(/\s+/).length;
    if (wordCount <= 4) {
      return true;
    }
  }

  return false;
}

const GENERIC_STOP_WORDS = new Set([
  'www', 'http', 'https', 'ftp', 'com', 'net', 'org', 'co',
  'io', 'info', 'biz', 'html', 'php', 'index', 'slash', 'dot',
  'url', 'site', 'website', 'domain', 'link'
]);

export function isGenericStopWord(word: string): boolean {
  if (!word) return true;
  const clean = word.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return clean.length <= 1 || GENERIC_STOP_WORDS.has(clean);
}

/**
 * Extracts the core site / brand name from any URL or messy cell text.
 * e.g.:
 * - "https://www.techcrunch.com/" -> "techcrunch"
 * - "www.forbes.com/advisor/" -> "forbes"
 * - "venturebeat.com" -> "venturebeat"
 * - "the-verge.com" -> "the-verge" (normalized: "theverge")
 * - "https://magazine.it.com/" -> "magazine"
 * - "TechCrunch [DoFollow]" -> "techcrunch"
 * - "Venture Beat" -> "venture beat" (normalized: "venturebeat")
 */
export function extractCoreSiteName(input: string): { coreName: string; normalizedName: string } {
  if (!input) return { coreName: '', normalizedName: '' };

  let text = input.trim().toLowerCase();

  // Strip wrapping quotes, brackets, angle brackets
  text = text.replace(/^["'\[\(<]+|["'\]\)>]+$/g, '').trim();

  // Strip trailing bracket/parenthesis annotations like "[DoFollow]", "(Guest Post)", "(Row 1)"
  text = text.replace(/\s*\[.*?\]\s*$/, '').replace(/\s*\(.*?\)\s*$/, '').trim();

  // If text starts with protocol, strip it
  text = text.replace(/^(?:https?:)?\/\//i, '').replace(/^ftp:\/\//i, '').trim();

  // Strip credentials
  if (text.includes('@')) {
    text = text.split('@').pop() || text;
  }

  // Strip query and hash
  text = text.split('#')[0].split('?')[0].trim();

  // Strip path if a slash exists (e.g. "techcrunch.com/category/ai" -> "techcrunch.com")
  const slashIdx = text.indexOf('/');
  if (slashIdx !== -1) {
    text = text.substring(0, slashIdx).trim();
  }

  // Strip port (e.g. "localhost:3000")
  text = text.replace(/:\d+$/, '').trim();

  // Strip leading www, www1, www2, etc.
  text = text.replace(/^www\d*\./i, '');

  let domainPart = text;

  // If domainPart contains dots (e.g. "techcrunch.com" or "magazine.it.com")
  if (domainPart.includes('.')) {
    const parts = domainPart.split('.').filter(Boolean);

    if (parts.length >= 3) {
      const lastTwo = parts.slice(-2).join('.');
      if (TWO_LEVEL_TLDS.has(lastTwo)) {
        // e.g. "magazine.it.com" -> "magazine"
        // e.g. "bbc.co.uk" -> "bbc"
        domainPart = parts.slice(0, -2).join('.');
      } else {
        const lastOne = parts[parts.length - 1];
        if (COMMON_SINGLE_TLDS.has(lastOne)) {
          // If subdomain exists like "blog.techcrunch.com", keep primary domain "techcrunch"
          const candidate = parts[parts.length - 2];
          domainPart = candidate;
        } else {
          domainPart = parts.slice(0, -1).join('.');
        }
      }
    } else if (parts.length === 2) {
      // e.g. "techcrunch.com" or "forbes.com"
      const lastOne = parts[1];
      if (COMMON_SINGLE_TLDS.has(lastOne) || lastOne.length >= 2) {
        domainPart = parts[0];
      }
    }
  }

  const coreName = domainPart.trim();
  // Normalized name removes all spaces, hyphens, underscores, dots:
  // e.g. "venture beat" -> "venturebeat", "tech-crunch" -> "techcrunch", "the verge" -> "theverge"
  const normalizedName = coreName.replace(/[\s\-_.]+/g, '').toLowerCase();

  return { coreName, normalizedName };
}

/**
 * Extracts clean domain or URL from messy cell text (e.g. "https://magazine.it.com/ [DoFollow]")
 */
export function extractDomainFromString(str: string): string {
  if (!str) return '';
  const match = str.match(/(?:https?:\/\/)?(?:www\d*\.)?([a-zA-Z0-9][a-zA-Z0-9-_]*(?:\.[a-zA-Z0-9-_]+)+)/i);
  if (match && match[1]) {
    return match[1].toLowerCase().trim().replace(/[.\/]+$/, '');
  }
  return '';
}

/**
 * Normalizes any URL string into clean hostname, root domain, core name, and path.
 */
export function normalizeUrl(input: string): NormalizedUrlInfo {
  if (!input) {
    return { original: '', cleaned: '', hostname: '', rootDomain: '', coreName: '', normalizedName: '', path: '' };
  }

  let text = input.trim();

  // Strip wrapping quotes, brackets, parens
  text = text.replace(/^["'\[\(<]+|["'\]\)>]+$/g, '').trim();

  // Take the first whitespace/comma/tab token if surrounded by notes
  const firstToken = text.split(/[\s,;|\t]+/)[0] || text;
  text = firstToken;

  // Strip protocols
  let withoutProtocol = text
    .replace(/^(?:https?:)?\/\//i, '')
    .replace(/^ftp:\/\//i, '')
    .trim();

  // Remove credentials
  if (withoutProtocol.includes('@')) {
    withoutProtocol = withoutProtocol.split('@').pop() || withoutProtocol;
  }

  // Remove port
  withoutProtocol = withoutProtocol.replace(/:\d+/, '');

  // Remove query and hash
  withoutProtocol = withoutProtocol.split('#')[0].split('?')[0];

  let hostPart = withoutProtocol;
  let pathPart = '';
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex !== -1) {
    hostPart = withoutProtocol.substring(0, slashIndex);
    pathPart = withoutProtocol.substring(slashIndex).replace(/\/+$/, '');
  }

  let hostname = hostPart.toLowerCase().trim().replace(/^www\d*\./i, '');
  hostname = hostname.replace(/[.\/]+$/, '');

  const rootDomain = extractRootDomain(hostname);
  const cleaned = pathPart ? `${hostname}${pathPart}` : hostname;
  const { coreName, normalizedName } = extractCoreSiteName(input);

  return {
    original: input,
    cleaned,
    hostname,
    rootDomain,
    coreName,
    normalizedName,
    path: pathPart,
  };
}

export function extractRootDomain(hostname: string): string {
  if (!hostname) return '';
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return hostname;
  }

  const lastTwo = parts.slice(-2).join('.');
  if (TWO_LEVEL_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Precision URL & Site Matcher for SEO Resellers.
 * Ensures that whatever the user asks for, ONLY that exact/related site is returned!
 * - Never returns a random site just because candidate contains a word prefix
 * - Never matches non-URL categories/notes against domain queries
 * - Perfectly matches exact domains, subdomains, cleaned URLs, and normalized brand names
 */
export function matchesQuery(
  candidateRaw: string,
  queryRaw: string,
  mode: 'smart' | 'exact' | 'contains' = 'smart'
): boolean {
  if (!candidateRaw || !queryRaw) return false;

  const rawQ = queryRaw.trim();
  const rawC = candidateRaw.trim();
  if (!rawQ || !rawC) return false;

  const qLower = rawQ.toLowerCase();
  const cLower = rawC.toLowerCase();

  // Direct string equality (e.g. exact match on serial numbers or identical strings)
  if (qLower === cLower) return true;

  const isQueryDomain = isDomainOrUrlQuery(rawQ);
  const qNorm = normalizeUrl(rawQ);
  const cNorm = normalizeUrl(rawC);

  const cDomainExtracted = extractDomainFromString(rawC);
  const isCandidateUrl = isLikelyUrlOrDomain(rawC) || !!cDomainExtracted;

  // RULE 1: If user searched for a domain (e.g. "fashion.com", "health.com", "techcrunch.com"):
  // Non-URL candidate text (e.g. "Fashion & Beauty", "Health") CAN NEVER MATCH!
  if (isQueryDomain && !isCandidateUrl) {
    return false;
  }

  const qCore = extractCoreSiteName(rawQ);
  const cCore = extractCoreSiteName(rawC);

  const qHost = qNorm.hostname;
  const cHost = cNorm.hostname;
  const qClean = qNorm.cleaned;
  const cClean = cNorm.cleaned;

  // ==========================================
  // MODE 1: EXACT MODE
  // ==========================================
  if (mode === 'exact') {
    if (isQueryDomain) {
      if (qHost && cHost && qHost === cHost) return true;
      if (qClean && cClean && qClean === cClean) return true;
      if (qNorm.rootDomain && cNorm.rootDomain && qNorm.rootDomain === cNorm.rootDomain) return true;
      return false;
    }
    return Boolean(
      qCore.normalizedName &&
      cCore.normalizedName &&
      qCore.normalizedName === cCore.normalizedName &&
      !isGenericStopWord(qCore.normalizedName)
    );
  }

  // ==========================================
  // MODE 2: CONTAINS MODE (Explicit substring mode)
  // ==========================================
  if (mode === 'contains') {
    if (qLower.length >= 3 && !isGenericStopWord(qLower)) {
      if (cLower.includes(qLower)) return true;
      if (cHost && cHost.includes(qLower)) return true;
      if (cNorm.normalizedName && qCore.normalizedName && cNorm.normalizedName.includes(qCore.normalizedName)) {
        return true;
      }
    }
    return false;
  }

  // ==========================================
  // MODE 3: SMART MATCH (Default)
  // ==========================================

  // A. When Query is a Domain or URL (e.g. techcrunch.com, https://theverge.com, tribune.com.pk)
  if (isQueryDomain) {
    // 1. Exact Hostname Match (e.g. techcrunch.com === techcrunch.com)
    if (qHost && cHost && qHost === cHost) {
      return true;
    }

    // 2. Exact Cleaned URL Match (e.g. techcrunch.com/category === techcrunch.com/category)
    if (qClean && cClean && qClean === cClean) {
      return true;
    }

    // 3. Subpath match: query is techcrunch.com and candidate is techcrunch.com/blog
    if (qHost && cClean && cClean.startsWith(`${qHost}/`)) {
      return true;
    }

    // 4. Subdomain match: candidate is blog.techcrunch.com and query is techcrunch.com, or vice versa
    if (qHost && cHost && (cHost.endsWith(`.${qHost}`) || qHost.endsWith(`.${cHost}`))) {
      return true;
    }

    // 5. Root Domain match: candidate and query share the same root domain
    // e.g. "https://www.techcrunch.com/" and "techcrunch.com" -> both rootDomain = "techcrunch.com"
    if (
      qNorm.rootDomain &&
      cNorm.rootDomain &&
      qNorm.rootDomain === cNorm.rootDomain &&
      qNorm.rootDomain.length > 3
    ) {
      return true;
    }

    // 6. Extracted domain from candidate string with annotations (e.g. "techcrunch.com [DoFollow]")
    if (cDomainExtracted) {
      const extNorm = normalizeUrl(cDomainExtracted);
      if (extNorm.hostname === qHost) return true;
      if (extNorm.rootDomain && qNorm.rootDomain && extNorm.rootDomain === qNorm.rootDomain) return true;
      if (qHost && extNorm.hostname && (extNorm.hostname.endsWith(`.${qHost}`) || qHost.endsWith(`.${extNorm.hostname}`))) {
        return true;
      }
    }

    // 7. If candidate cell is purely the site name (e.g. "TechCrunch") without extension in the website column:
    // Only match if the normalized brand names match exactly
    if (
      qCore.normalizedName &&
      cCore.normalizedName &&
      qCore.normalizedName === cCore.normalizedName &&
      !isGenericStopWord(qCore.normalizedName)
    ) {
      return true;
    }

    // When query is a domain, candidates with DIFFERENT root domains must NOT match!
    // (e.g. tech.com MUST NOT match techcrunch.com! pro.com MUST NOT match propertyweek.com!)
    return false;
  }

  // B. When Query is a Brand Name / Site Name without extension (e.g. "techcrunch", "the verge", "venture beat", "forbes")
  if (qCore.normalizedName && !isGenericStopWord(qCore.normalizedName)) {
    // 1. Exact normalized name match:
    // e.g. "tech crunch" -> "techcrunch" === "techcrunch" (matches techcrunch.com)
    // e.g. "venture beat" -> "venturebeat" === "venturebeat" (matches venturebeat.com)
    // e.g. "the verge" -> "theverge" === "theverge" (matches theverge.com)
    // e.g. "forbes" -> "forbes" === "forbes" (matches forbes.com)
    if (cCore.normalizedName && qCore.normalizedName === cCore.normalizedName) {
      return true;
    }

    // 2. Exact coreName case-insensitive equality
    if (cCore.coreName && qCore.coreName && qCore.coreName.toLowerCase() === cCore.coreName.toLowerCase()) {
      return true;
    }
  }

  return false;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses numeric price from messy text fields like "$150", "USD 200", "€80", "120.00"
 */
export function parsePrice(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/[^0-9.]/g, '');
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}
