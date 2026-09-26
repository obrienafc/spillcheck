import { getCache } from '@vercel/functions';

// New scans (cache misses) per IP per minute. Each one runs a headless
// browser, so this is what keeps a single visitor from running up the bill.
export const SCANS_PER_MINUTE = 10;

/**
 * Counts a scan for this IP and says whether it's allowed. Uses the runtime
 * cache, so the count is approximate under heavy concurrency; that's fine for
 * stopping abuse, which is the point.
 */
export async function allowScan(ip: string | null): Promise<boolean> {
  if (!ip) return true;
  const cache = getCache({ namespace: 'spillcheck-rate' });
  const key = `${ip}:${Math.floor(Date.now() / 60_000)}`;
  try {
    const count = ((await cache.get(key)) as number | null) ?? 0;
    if (count >= SCANS_PER_MINUTE) return false;
    await cache.set(key, count + 1, { ttl: 90 });
  } catch {
    // If the cache is unavailable, don't block people.
  }
  return true;
}

/** The visitor's IP as seen by Vercel's edge (not spoofable by the client there). */
export function clientIp(request: Request) {
  return request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}
