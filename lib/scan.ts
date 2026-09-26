import { getCache } from '@vercel/functions';
import { getDomain, getPublicSuffix } from 'tldts';
import { browserAvailable, browserScan, type Progress } from './browser-scan';
import { CATEGORIES, type Category } from './categories';
import { extractCss, extractHtml, type Kind, type Resource } from './extract';
import { identify, type Service } from './parties';
import { guardedLookup } from './net-guard';
import { allowScan } from './rate-limit';
import { ScanError, assertPublicUrl, safeFetch } from './safe-fetch';

const MAX_STYLESHEETS = 12;
const MAX_SAMPLES = 5;
const CACHE_TTL = 6 * 60 * 60; // seconds
const CACHE_VERSION = 'v2';

// Evidence that a party *may* be contacted, rather than a resource the page
// loads: URLs in inline scripts, preconnect hints and form targets. Only the
// static fallback produces these; the browser sees real requests.
const REFERENCE_KINDS = new Set<Kind>(['script-reference', 'connection', 'form']);

// Namespace and documentation URLs that appear in markup but are never fetched.
const IGNORED_HOSTS = /(^|\.)(w3\.org|schema\.org|example\.(com|org|net)|ogp\.me|purl\.org|xmlns\.com)$/i;

export type Party = {
  id: string;
  name: string;
  company: string | null;
  category: Category;
  hosts: string[];
  kinds: Kind[];
  requests: number;
  bytes: number;
  /** True when the only evidence is an inline-script URL, a preconnect hint or a form target. */
  referencedOnly: boolean;
  samples: string[];
  cookies: string[];
};

export type Report = {
  url: string;
  finalUrl: string;
  scannedAt: string;
  /** "browser" loads the page in headless Chromium; "static" reads HTML and CSS only. */
  mode: 'browser' | 'static';
  status: number;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  requests: { firstParty: number; thirdParty: number };
  thirdPartyBytes: number;
  cookies: { firstParty: string[]; thirdParty: { name: string; domain: string; related: boolean }[] };
  parties: Party[];
  companies: string[];
  googleFonts: { families: string[] } | null;
  notes: string[];
  /** Where the scan ran. Sites often load fewer trackers for EU visitors. */
  region: string;
  /** What happened when Spillcheck tried to accept the cookie banner. */
  consent: ConsentResult;
};

/** The parts of a report that change once cookies are accepted. */
export type ConsentView = Pick<
  Report,
  'score' | 'grade' | 'requests' | 'thirdPartyBytes' | 'cookies' | 'parties' | 'companies' | 'googleFonts'
>;

export type ConsentResult =
  | { status: 'accepted'; tool: string; after: ConsentView }
  | { status: 'not-found' }
  | { status: 'not-attempted' };

export type ScanProgress = Progress;

export type ScanOptions = {
  onProgress?: Progress;
  /** For rate limiting new scans. */
  ip?: string | null;
};

function siteOf(url: URL) {
  return getDomain(url.hostname, { allowPrivateDomains: true }) ?? url.hostname;
}

/** "bbc" for bbc.co.uk: the registrable domain without its public suffix. */
function brandOf(url: URL) {
  const domain = siteOf(url);
  const suffix = getPublicSuffix(url.hostname, { allowPrivateDomains: true }) ?? '';
  return domain.slice(0, domain.length - suffix.length - 1).split('.').pop() ?? domain;
}

/**
 * Same brand on another domain (bbc.com and bbci.co.uk for bbc.co.uk).
 * Exact name matches, or the site's name plus at most two characters.
 */
function isRelated(brand: string, other: string) {
  if (brand.length < 3) return false;
  return other === brand || (other.startsWith(brand) && other.length - brand.length <= 2);
}

function gradeFor(score: number, parties: number): Report['grade'] {
  if (parties === 0) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function normalizeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new ScanError('Enter a URL to scan.');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[^/]+:\d/.test(trimmed)) {
    throw new ScanError('Only http and https URLs can be scanned.', 'invalid');
  }
  return `https://${trimmed}`;
}

function cacheKey(url: URL) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  return `${CACHE_VERSION}:${url.hostname.toLowerCase()}${path}${url.search}`;
}

/** Returns a cached report when there is one, otherwise scans and caches. */
export async function scan(input: string, { onProgress, ip }: ScanOptions = {}): Promise<Report> {
  const url = assertPublicUrl(normalizeInput(input));
  const cache = getCache({ namespace: 'spillcheck' });
  // Results differ by location, so each region caches its own.
  const key = `${process.env.VERCEL_REGION ?? 'local'}:${cacheKey(url)}`;

  const cached = (await cache.get(key).catch(() => null)) as Report | null;
  if (cached) return { ...cached, url: input };

  if (!(await allowScan(ip ?? null))) {
    throw new ScanError('Too many new scans from this address. Try again in a minute.', 'rate-limited', 429);
  }

  // Resolve first: private addresses fail fast, before a browser starts.
  await new Promise<void>((resolve, reject) =>
    guardedLookup(url.hostname.replace(/^\[|\]$/g, ''), {}, (err) =>
      err
        ? reject(
            err.message.includes('private')
              ? new ScanError(err.message, 'private')
              : new ScanError('Couldn’t find that site. Check the address.', 'unreachable', 502),
          )
        : resolve(),
    ),
  );

  let report: Report;
  let fellBack = false;
  if (browserAvailable()) {
    try {
      report = await scanWithBrowser(url, input, onProgress);
    } catch (err) {
      if (err instanceof ScanError) throw err;
      console.error('Browser scan failed, falling back to static scan', err);
      report = await scanStatically(url, input);
      report.notes.unshift('The headless browser couldn’t start, so this is a static scan of the HTML and CSS only.');
      fellBack = true;
    }
  } else {
    report = await scanStatically(url, input);
  }

  // A fallback is a degraded result: keep it briefly so the next visit retries.
  const ttl = fellBack ? 60 : CACHE_TTL;
  await cache.set(key, report, { ttl, name: url.hostname }).catch(() => {});
  return report;
}

async function scanWithBrowser(url: URL, input: string, onProgress?: Progress) {
  const result = await browserScan(url, onProgress);
  if (result.status >= 400) {
    throw new ScanError(
      `The site responded with HTTP ${result.status}.`,
      [401, 403, 429].includes(result.status) ? 'blocked' : 'unreachable',
      502,
    );
  }
  const shared = { input, mode: 'browser' as const, finalUrl: result.finalUrl, status: result.status };
  // The headline is what a visitor gets before touching the banner.
  const before = buildReport({
    ...shared,
    resources: result.resources.slice(0, result.beforeConsent),
    cookies: result.cookiesBefore,
    notes: [],
  });
  if (!result.consent) return { ...before, consent: { status: 'not-found' } } satisfies Report;

  const after = buildReport({ ...shared, resources: result.resources, cookies: result.cookiesAfter, notes: [] });
  const { score, grade, requests, thirdPartyBytes, cookies, parties, companies, googleFonts } = after;
  return {
    ...before,
    consent: {
      status: 'accepted',
      tool: result.consent,
      after: { score, grade, requests, thirdPartyBytes, cookies, parties, companies, googleFonts },
    },
  } satisfies Report;
}

async function scanStatically(url: URL, input: string) {
  const page = await safeFetch(url.href);
  if (page.status >= 400) {
    throw new ScanError(
      `The site responded with HTTP ${page.status}.`,
      [401, 403, 429].includes(page.status) ? 'blocked' : 'unreachable',
      502,
    );
  }
  if (!/html|xml/i.test(page.contentType) && !/^\s*</.test(page.body)) {
    throw new ScanError('That URL didn’t return a web page.', 'not-html', 422);
  }

  const notes: string[] = [];
  const { resources, stylesheets } = extractHtml(page.body, page.url);

  // Follow stylesheets (and their @imports) to find fonts and images they load.
  const queue = [...stylesheets];
  const seen = new Set<string>();
  let fetched = 0;
  while (queue.length && fetched < MAX_STYLESHEETS) {
    const css = queue.shift()!;
    if (seen.has(css.href)) continue;
    seen.add(css.href);
    fetched++;
    try {
      const res = await safeFetch(css.href, { maxBytes: 1_000_000, timeoutMs: 5_000, accept: 'text/css,*/*;q=0.1' });
      if (res.status < 400) {
        const found = extractCss(res.body, res.url);
        resources.push(...found.resources);
        queue.push(...found.imports);
      }
    } catch {
      // A stylesheet that can't be fetched doesn't stop the scan.
    }
  }
  if (queue.length) notes.push(`Only the first ${MAX_STYLESHEETS} stylesheets were inspected.`);

  // Static scans see the same URL many times in markup; count each once.
  const unique = new Map<string, Resource>();
  for (const r of resources) {
    const existing = unique.get(r.url);
    if (!existing || (REFERENCE_KINDS.has(existing.kind) && !REFERENCE_KINDS.has(r.kind))) unique.set(r.url, r);
  }

  const host = page.url.hostname;
  const report = buildReport({
    input,
    mode: 'static',
    finalUrl: page.url,
    status: page.status,
    resources: [...unique.values()],
    cookies: page.setCookies
      .map((c) => ({ name: c.split('=')[0].trim(), domain: host }))
      .filter((c) => c.name),
    notes,
  });
  return { ...report, consent: { status: 'not-attempted' } } satisfies Report;
}

function buildReport(input: {
  input: string;
  mode: Report['mode'];
  finalUrl: URL;
  status: number;
  resources: Resource[];
  cookies: { name: string; domain: string }[];
  notes: string[];
}): Omit<Report, 'consent'> {
  const { finalUrl, resources, notes } = input;
  const site = siteOf(finalUrl);
  const brand = brandOf(finalUrl);
  const parties = new Map<string, Party>();
  const googleFontFamilies = new Set<string>();
  let firstParty = 0;
  let thirdParty = 0;
  let thirdPartyBytes = 0;

  // Hosts serving the Google Fonts CSS API that aren't Google: Glyphyard
  // instances and other self-hosted font proxies.
  const fontProxyHosts = new Set<string>();
  for (const { url: href } of resources) {
    const url = new URL(href);
    if (/^\/css2?$/.test(url.pathname) && url.searchParams.has('family') && !url.hostname.endsWith('googleapis.com')) {
      fontProxyHosts.add(url.hostname);
    }
  }
  const fontProxy = (host: string): Service => ({
    name: host.includes('glyphyard') ? 'Glyphyard' : 'Self-hosted Google Fonts proxy',
    company: null,
    category: 'private-fonts',
    domains: [host],
  });

  const partyFor = (url: URL) => {
    const service =
      identify(url) ??
      (fontProxyHosts.has(url.hostname) ? fontProxy(url.hostname) : null) ??
      (isRelated(brand, brandOf(url))
        ? ({ name: siteOf(url), company: null, category: 'related', domains: [siteOf(url)] } satisfies Service)
        : null);
    const id = service ? `${service.name}:${service.domains[0]}` : siteOf(url);
    let party = parties.get(id);
    if (!party) {
      party = {
        id,
        name: service?.name ?? siteOf(url),
        company: service?.company ?? null,
        category: service?.category ?? 'unknown',
        hosts: [],
        kinds: [],
        requests: 0,
        bytes: 0,
        referencedOnly: true,
        samples: [],
        cookies: [],
      };
      parties.set(id, party);
    }
    return party;
  };

  for (const { url: href, kind, bytes = 0 } of resources) {
    const url = new URL(href);
    if (IGNORED_HOSTS.test(url.hostname)) continue;
    if (siteOf(url) === site) {
      firstParty++;
      continue;
    }
    thirdParty++;
    thirdPartyBytes += bytes;

    if (url.hostname === 'fonts.googleapis.com') {
      for (const fam of url.searchParams.getAll('family')) {
        for (const f of fam.split('|')) googleFontFamilies.add(f.split(':')[0].replace(/\+/g, ' '));
      }
    }

    const party = partyFor(url);
    if (!party.hosts.includes(url.hostname)) party.hosts.push(url.hostname);
    if (!party.kinds.includes(kind)) party.kinds.push(kind);
    party.requests++;
    party.bytes += bytes;
    if (!REFERENCE_KINDS.has(kind)) party.referencedOnly = false;
    if (party.samples.length < MAX_SAMPLES && !party.samples.includes(href)) party.samples.push(href);
  }

  // Cookies: third-party cookies are attributed to the party that set them.
  const firstPartyCookies: string[] = [];
  const thirdPartyCookies: { name: string; domain: string; related: boolean }[] = [];
  for (const c of input.cookies) {
    const url = new URL(`https://${c.domain}/`);
    if (siteOf(url) === site) {
      firstPartyCookies.push(c.name);
    } else {
      const party = partyFor(url);
      thirdPartyCookies.push({ ...c, related: party.category === 'related' });
      if (!party.hosts.includes(url.hostname)) party.hosts.push(url.hostname);
      party.cookies.push(c.name);
      party.referencedOnly = false;
    }
  }

  const list = [...parties.values()].sort(
    (a, b) =>
      CATEGORIES[b.category].weight - CATEGORIES[a.category].weight ||
      Number(a.referencedOnly) - Number(b.referencedOnly) ||
      b.requests - a.requests,
  );

  // Referenced-only parties count half. Third-party cookies add a small
  // penalty each (capped), since they're how visitors are followed across sites.
  const penalty =
    list.reduce((sum, p) => sum + CATEGORIES[p.category].weight * (p.referencedOnly ? 0.5 : 1), 0) +
    Math.min(20, thirdPartyCookies.filter((c) => !c.related).length * 2);
  const score = Math.max(0, Math.round(100 - penalty));

  if (input.mode === 'static' && list.some((p) => p.category === 'tag-manager')) {
    notes.push('A tag manager is present, so more scripts are probably loaded at runtime.');
  }

  return {
    url: input.input,
    finalUrl: finalUrl.href,
    scannedAt: new Date().toISOString(),
    mode: input.mode,
    status: input.status,
    score,
    grade: gradeFor(score, list.length),
    requests: { firstParty, thirdParty },
    thirdPartyBytes,
    cookies: { firstParty: firstPartyCookies, thirdParty: thirdPartyCookies },
    parties: list,
    companies: [...new Set(list.map((p) => p.company).filter((c): c is string => !!c))].sort(),
    googleFonts: list.some((p) => p.name === 'Google Fonts') ? { families: [...googleFontFamilies].sort() } : null,
    notes,
    region: process.env.VERCEL_REGION ?? 'local',
  };
}
