import { getDomain } from 'tldts';
import { extractCss, extractHtml, type Kind, type Resource } from './extract';
import { CATEGORIES, type Category } from './categories';
import { identify } from './parties';
import { ScanError, safeFetch } from './safe-fetch';

const MAX_STYLESHEETS = 12;
const MAX_SAMPLES = 5;

// Evidence that a party *may* be contacted, rather than a resource the page loads:
// URLs in inline scripts, preconnect hints, and form targets (only on submit).
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
  /** True when the only evidence is an inline-script URL, a preconnect hint or a form target. */
  referencedOnly: boolean;
  samples: string[];
};

export type Report = {
  url: string;
  finalUrl: string;
  scannedAt: string;
  status: number;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  firstPartyRequests: number;
  cookies: string[];
  parties: Party[];
  companies: string[];
  googleFonts: { families: string[] } | null;
  notes: string[];
};

function siteOf(url: URL) {
  return getDomain(url.hostname, { allowPrivateDomains: true }) ?? url.hostname;
}

function gradeFor(score: number, parties: number): Report['grade'] {
  if (parties === 0) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function normalizeInput(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new ScanError('Enter a URL to scan.');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[^/]+:\d/.test(trimmed)) {
    throw new ScanError('Only http and https URLs can be scanned.', 'invalid');
  }
  return `https://${trimmed}`;
}

export async function scan(input: string): Promise<Report> {
  const page = await safeFetch(normalizeInput(input));
  if (page.status >= 400) {
    throw new ScanError(
      `The site responded with HTTP ${page.status}.`,
      page.status === 401 || page.status === 403 || page.status === 429 ? 'blocked' : 'unreachable',
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

  const site = siteOf(page.url);
  const parties = new Map<string, Party>();
  let firstPartyRequests = 0;
  const googleFontFamilies = new Set<string>();

  const unique = new Map<string, Resource>();
  for (const r of resources) {
    const existing = unique.get(r.url);
    // Prefer a concrete kind over a script reference for the same URL.
    if (!existing || (REFERENCE_KINDS.has(existing.kind) && !REFERENCE_KINDS.has(r.kind))) unique.set(r.url, r);
  }

  for (const { url: href, kind } of unique.values()) {
    const url = new URL(href);
    if (IGNORED_HOSTS.test(url.hostname)) continue;
    if (siteOf(url) === site) {
      firstPartyRequests++;
      continue;
    }

    if (url.hostname === 'fonts.googleapis.com') {
      for (const fam of url.searchParams.getAll('family')) {
        for (const f of fam.split('|')) googleFontFamilies.add(f.split(':')[0].replace(/\+/g, ' '));
      }
    }

    const service = identify(url);
    const id = service ? service.name : siteOf(url);
    const party =
      parties.get(id) ??
      ({
        id,
        name: service?.name ?? siteOf(url),
        company: service?.company ?? null,
        category: service?.category ?? 'unknown',
        hosts: [],
        kinds: [],
        requests: 0,
        referencedOnly: true,
        samples: [],
      } satisfies Party);

    if (!party.hosts.includes(url.hostname)) party.hosts.push(url.hostname);
    if (!party.kinds.includes(kind)) party.kinds.push(kind);
    party.requests++;
    if (!REFERENCE_KINDS.has(kind)) party.referencedOnly = false;
    if (party.samples.length < MAX_SAMPLES) party.samples.push(href);
    parties.set(id, party);
  }

  const list = [...parties.values()].sort(
    (a, b) =>
      CATEGORIES[b.category].weight - CATEGORIES[a.category].weight ||
      Number(a.referencedOnly) - Number(b.referencedOnly) ||
      b.requests - a.requests,
  );

  // Referenced-only parties (e.g. a URL in an inline script) count half.
  const penalty = list.reduce(
    (sum, p) => sum + CATEGORIES[p.category].weight * (p.referencedOnly ? 0.5 : 1),
    0,
  );
  const score = Math.max(0, Math.round(100 - penalty));

  if (list.some((p) => p.category === 'tag-manager')) {
    notes.push('A tag manager is present, so more scripts are probably loaded at runtime.');
  }

  const cookies = page.setCookies.map((c) => c.split('=')[0].trim()).filter(Boolean);

  return {
    url: input,
    finalUrl: page.url.href,
    scannedAt: new Date().toISOString(),
    status: page.status,
    score,
    grade: gradeFor(score, list.length),
    firstPartyRequests,
    cookies,
    parties: list,
    companies: [...new Set(list.map((p) => p.company).filter((c): c is string => !!c))].sort(),
    googleFonts: list.some((p) => p.name === 'Google Fonts')
      ? { families: [...googleFontFamilies].sort() }
      : null,
    notes,
  };
}
