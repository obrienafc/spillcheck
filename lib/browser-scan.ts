import fs from 'node:fs';
import type { Browser, CDPSession, HTTPRequest } from 'puppeteer-core';
import { getDomain } from 'tldts';
import puppeteer from 'puppeteer-core';
import type { Kind, Resource } from './extract';
import { startGuardProxy } from './guard-proxy';
import { ScanError } from './safe-fetch';

export type Stage = 'launch' | 'load' | 'watch' | 'grade';
export type Progress = (update: { stage: Stage; requests?: number; thirdPartyHosts?: number }) => void;

export type BrowserResult = {
  finalUrl: URL;
  status: number;
  resources: Resource[];
  cookies: { name: string; domain: string }[];
};

const NAV_TIMEOUT = 20_000;
const QUIET_MS = 1_500; // network idle this long ends the watch
const WATCH_MAX = 8_000;

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

  try {
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
    await page.evaluate(SCROLL_SCRIPT).catch(() => {});
    const started = Date.now();
    while (Date.now() - started < WATCH_MAX && Date.now() - lastActivity < QUIET_MS) {
      await new Promise((r) => setTimeout(r, 250));
    }
    // One more beat for anything that started right at the end.
    await new Promise((r) => setTimeout(r, 400));

    onProgress({ stage: 'grade', requests: resources.length, thirdPartyHosts: hosts.size });
    const { cookies } = (await cdp.send('Network.getAllCookies')) as {
      cookies: { name: string; domain: string }[];
    };

    for (const r of resources) {
      const id = ids.get(r.url);
      if (id && bytes.has(id)) r.bytes = bytes.get(id);
    }

    return {
      finalUrl,
      status,
      resources,
      cookies: cookies.map((c) => ({ name: c.name, domain: c.domain.replace(/^\./, '') })),
    };
  } finally {
    await browser?.close().catch(() => {});
    await proxy.close();
  }
}

/** True when a headless browser can be started in this environment. */
export function browserAvailable() {
  return process.platform === 'linux' || LOCAL_CHROME.some((p) => fs.existsSync(p));
}
