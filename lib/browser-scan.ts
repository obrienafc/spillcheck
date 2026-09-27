import fs from 'node:fs';
import type { Browser, CDPSession, HTTPRequest } from 'puppeteer-core';
import { getDomain } from 'tldts';
import puppeteer from 'puppeteer-core';
import type { Kind, Resource } from './extract';
import { acceptConsent } from './consent';
import { startGuardProxy } from './guard-proxy';
import { ScanError } from './safe-fetch';

export type Stage = 'launch' | 'load' | 'watch' | 'consent' | 'grade';
export type Progress = (update: { stage: Stage; requests?: number; thirdPartyHosts?: number }) => void;

type Cookie = { name: string; domain: string };

export type BrowserResult = {
  finalUrl: URL;
  status: number;
  /** Everything requested, before and after consent. */
  resources: Resource[];
  /** How many of `resources` were requested before consent was given. */
  beforeConsent: number;
  cookiesBefore: Cookie[];
  cookiesAfter: Cookie[];
  /** The consent tool that was accepted, or null if no banner was found. */
  consent: string | null;
};

const NAV_TIMEOUT = 20_000;
const QUIET_MS = 1_500; // network idle this long ends the watch
const WATCH_MAX = 8_000;
const STEP_MAX = 8_000; // any single call into the page
// Serverless hosts cap the function at 60s; long-running servers have no such
// cap, so a page that never answers must not hold a browser open forever.
const SCAN_DEADLINE = 50_000;

/** Resolves to `fallback` if `promise` hasn't settled within `ms`. */
function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const late = new Promise<T>((resolve) => (timer = setTimeout(() => resolve(fallback), ms)));
  return Promise.race([promise.catch(() => fallback), late]).finally(() => clearTimeout(timer));
}

const SCROLL_SCRIPT = `(async () => {
  const h = document.documentElement.scrollHeight;
  for (const y of [h * 0.33, h * 0.66, h]) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 250));
  }
})()`;

const LOCAL_CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

const KINDS: Record<string, Kind> = {
  document: 'frame',
  stylesheet: 'stylesheet',
  image: 'image',
  media: 'media',
  texttrack: 'media',
  font: 'font',
  script: 'script',
  xhr: 'fetch',
  fetch: 'fetch',
  eventsource: 'fetch',
  websocket: 'websocket',
  ping: 'beacon',
  cspviolationreport: 'beacon',
};

async function launch(proxyPort: number): Promise<Browser> {
  const shared = [
    `--proxy-server=http://127.0.0.1:${proxyPort}`,
    // Also send loopback traffic through the proxy, where it's refused.
    '--proxy-bypass-list=<-loopback>',
    // Keep cross-site iframes in-process so their requests are observed too.
    '--disable-features=site-per-process,IsolateOrigins',
    '--disable-site-isolation-trials',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    '--disable-background-networking',
    '--disable-component-update',
  ];

  // An explicit CHROME_PATH wins everywhere (the Docker image sets one).
  // Containers run as an unprivileged user without namespaces for Chrome's
  // sandbox, and give /dev/shm only 64 MB.
  const explicit = process.env.CHROME_PATH;
  if (explicit && fs.existsSync(explicit)) {
    const container = process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
    return puppeteer.launch({ executablePath: explicit, headless: true, args: [...container, ...shared] });
  }
  const local = LOCAL_CHROME.find((p) => fs.existsSync(p));
  if (process.platform !== 'linux' && local) {
    return puppeteer.launch({ executablePath: local, headless: true, args: shared });
  }
  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: [...chromium.args, ...shared],
  });
}

export async function browserScan(url: URL, onProgress: Progress = () => {}): Promise<BrowserResult> {
  onProgress({ stage: 'launch' });
  const proxy = await startGuardProxy();
  let browser: Browser | undefined;
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ScanError('The site took too long to respond.', 'timeout', 504)),
      SCAN_DEADLINE,
    );
  });

  const run = async (): Promise<BrowserResult> => {
    browser = await launch(proxy.port);
    const page = await browser.newPage();
    const ua = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
    await page.setUserAgent(`${ua} Spillcheck/2.0 (+https://github.com/obrienafc/spillcheck)`);
    await page.setViewport({ width: 1366, height: 900 });

    const resources: Resource[] = [];
    const hosts = new Set<string>(); // third-party hosts, for live progress
    const siteOf = (host: string) => getDomain(host, { allowPrivateDomains: true }) ?? host;
    const site = siteOf(url.hostname);
    const bytes = new Map<string, number>();
    let lastActivity = Date.now();

    const cdp: CDPSession = await page.createCDPSession();
    await cdp.send('Network.enable');
    cdp.on('Network.loadingFinished', (e: { requestId: string; encodedDataLength: number }) => {
      bytes.set(e.requestId, e.encodedDataLength);
    });
    const ids = new Map<string, string>(); // url -> CDP requestId (first seen)
    cdp.on('Network.requestWillBeSent', (e: { requestId: string; request: { url: string } }) => {
      if (!ids.has(e.request.url)) ids.set(e.request.url, e.requestId);
    });

    page.on('request', (req: HTTPRequest) => {
      lastActivity = Date.now();
      const href = req.url();
      if (!/^https?:|^wss?:/.test(href)) return;
      const kind = KINDS[req.resourceType()] ?? 'other';
      resources.push({ url: href.replace(/^ws/, 'http'), kind });
      const host = new URL(href).hostname;
      if (siteOf(host) !== site) hosts.add(host);
      onProgress({ stage: 'watch', requests: resources.length, thirdPartyHosts: hosts.size });
    });
    page.on('requestfinished', () => (lastActivity = Date.now()));
    page.on('requestfailed', () => (lastActivity = Date.now()));

    onProgress({ stage: 'load' });
    let response;
    try {
      response = await page.goto(url.href, { waitUntil: 'load', timeout: NAV_TIMEOUT });
    } catch (err) {
      const message = String((err as Error).message);
      if (proxy.blocked.includes(url.hostname) || /ERR_TUNNEL|ERR_PROXY/.test(message)) {
        throw new ScanError('That address points to a private network.', 'private');
      }
      if (/timeout/i.test(message)) throw new ScanError('The site took too long to respond.', 'timeout', 504);
      if (/ERR_TOO_MANY_REDIRECTS/.test(message)) throw new ScanError('Too many redirects.', 'redirects', 502);
      throw new ScanError('Couldn’t connect to that site.', 'unreachable', 502);
    }

    const status = response?.status() ?? 0;
    const finalUrl = new URL(page.url());
    if (proxy.blocked.includes(finalUrl.hostname.replace(/^\[|\]$/g, ''))) {
      throw new ScanError('That address points to a private network.', 'private');
    }

    // Watch for late requests: scroll once to trigger lazy loading, then wait
    // until the network has been quiet for a moment.
    onProgress({ stage: 'watch', requests: resources.length, thirdPartyHosts: hosts.size });
    // A string, so bundler helpers can't leak into the page's scope.
    await within(page.evaluate(SCROLL_SCRIPT), STEP_MAX, undefined);
    const started = Date.now();
    while (Date.now() - started < WATCH_MAX && Date.now() - lastActivity < QUIET_MS) {
      await new Promise((r) => setTimeout(r, 250));
    }
    // One more beat for anything that started right at the end.
    await new Promise((r) => setTimeout(r, 400));

    const readCookies = async (): Promise<Cookie[]> => {
      const read = cdp.send('Network.getAllCookies') as Promise<{ cookies: Cookie[] }>;
      const { cookies } = await within(read, STEP_MAX, { cookies: [] });
      return cookies.map((c) => ({ name: c.name, domain: c.domain.replace(/^\./, '') }));
    };

    // What a visitor gets before touching the cookie banner...
    const beforeConsent = resources.length;
    const cookiesBefore = await readCookies();

    // ...and after clicking "Accept all".
    onProgress({ stage: 'consent', requests: resources.length, thirdPartyHosts: hosts.size });
    const consent = await within(acceptConsent(page), STEP_MAX, null);
    if (consent) {
      lastActivity = Date.now();
      // Some banners reload the page after consent.
      await page.waitForNetworkIdle({ idleTime: QUIET_MS, timeout: WATCH_MAX }).catch(() => {});
      await within(page.evaluate(SCROLL_SCRIPT), STEP_MAX, undefined);
      const afterStarted = Date.now();
      while (Date.now() - afterStarted < WATCH_MAX && Date.now() - lastActivity < QUIET_MS) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    const cookiesAfter = consent ? await readCookies() : cookiesBefore;

    onProgress({ stage: 'grade', requests: resources.length, thirdPartyHosts: hosts.size });

    for (const r of resources) {
      const id = ids.get(r.url);
      if (id && bytes.has(id)) r.bytes = bytes.get(id);
    }

    return { finalUrl, status, resources, beforeConsent, cookiesBefore, cookiesAfter, consent };
  };

  try {
    return await Promise.race([run(), deadline]);
  } finally {
    clearTimeout(timer);
    // Closing also fails any call still waiting on the page.
    const b = browser as Browser | undefined;
    const closed = await within(b?.close().then(() => true) ?? Promise.resolve(true), 5_000, false);
    if (!closed) b?.process()?.kill('SIGKILL');
    await proxy.close();
  }
}

/** True when a headless browser can be started in this environment. */
export function browserAvailable() {
  return process.platform === 'linux' || LOCAL_CHROME.some((p) => fs.existsSync(p));
}
