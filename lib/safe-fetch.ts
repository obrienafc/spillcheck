import dns from 'node:dns';
import net from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

export type ErrorCode =
  | 'invalid'
  | 'private'
  | 'timeout'
  | 'unreachable'
  | 'blocked'
  | 'not-html'
  | 'redirects'
  | 'failed';

export class ScanError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = 'invalid',
    public status = 400,
  ) {
    super(message);
  }
}

// An honest bot identity. Pretending to be Chrome gets connections reset by
// servers that check whether a "browser" really behaves like one.
const USER_AGENT = 'Spillcheck/1.0 (+https://github.com/obrienafc/spillcheck)';

const MAX_REDIRECTS = 5;

/** True for loopback, private, link-local, CGNAT, multicast and other non-public ranges. */
export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      /^f[cd]/.test(lower) || // fc00::/7 unique local
      /^fe[89ab]/.test(lower) || // fe80::/10 link local
      /^ff/.test(lower) || // multicast
      lower.startsWith('64:ff9b:') // NAT64
    );
  }
  return true;
}

// Every connection is checked at connect time, so redirects and DNS answers
// that change between checks (rebinding) can't reach internal addresses.
const agent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, '', 4);
        const list = addresses as dns.LookupAddress[];
        const blocked = list.find((a) => isPrivateAddress(a.address));
        if (blocked || list.length === 0) {
          return callback(new ScanError('That address points to a private network.', 'private'), '', 4);
        }
        if ((options as dns.LookupOptions).all) return callback(null, list as never, 4);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
  headersTimeout: 8_000,
  bodyTimeout: 8_000,
});

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScanError('That doesn’t look like a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScanError('Only http and https URLs can be scanned.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new ScanError('Only standard ports (80 and 443) can be scanned.');
  }
  if (url.username || url.password) throw new ScanError('URLs with credentials aren’t allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new ScanError('That address points to a private network.', 'private');
  }
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new ScanError('That address points to a private network.', 'private');
  }
  return url;
}

export type FetchResult = {
  url: URL;
  status: number;
  contentType: string;
  body: string;
  setCookies: string[];
};

/** Fetches a public URL with redirect, size and time limits. */
export async function safeFetch(
  raw: string,
  { maxBytes = 3_000_000, timeoutMs = 10_000, accept = 'text/html,*/*;q=0.8' } = {},
): Promise<FetchResult> {
  let url = assertPublicUrl(raw);
  const signal = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res;
    try {
      res = await undiciFetch(url, {
        dispatcher: agent,
        redirect: 'manual',
        signal,
        headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'en' },
      });
    } catch (err) {
      const cause = (err as { cause?: unknown }).cause;
      if (cause instanceof ScanError) throw cause;
      if (err instanceof ScanError) throw err;
      if ((err as Error).name === 'TimeoutError') throw new ScanError('The site took too long to respond.', 'timeout', 504);
      throw new ScanError('Couldn’t connect to that site.', 'unreachable', 502);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel();
      url = assertPublicUrl(new URL(res.headers.get('location')!, url).toString());
      continue;
    }

    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }

    return {
      url,
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body: new TextDecoder().decode(Buffer.concat(chunks)),
      setCookies: res.headers.getSetCookie?.() ?? [],
    };
  }

  throw new ScanError('Too many redirects.', 'redirects', 502);
}
