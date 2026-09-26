import { badge } from '@/lib/badge';
import { scan } from '@/lib/scan';

export const maxDuration = 60;

// GET /badge?url=example.com[&label=privacy][&detail=1]
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const url = params.get('url') ?? '';
  const label = (params.get('label') || 'privacy').slice(0, 24);
  const detail = params.get('detail') === '1';

  try {
    const report = await scan(url);
    const n = report.parties.length;
    const value = detail
      ? `${report.grade} · ${n} third ${n === 1 ? 'party' : 'parties'}`
      : report.grade;
    return svg(badge(label, value), 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  } catch {
    // Badges live in other people's READMEs, so a failed scan still renders.
    return svg(badge(label, 'unknown', { muted: true }), 'public, max-age=300, s-maxage=3600');
  }
}

function svg(body: string, cacheControl: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': cacheControl,
      // Badge SVGs never need to run anything.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
