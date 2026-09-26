import { ScanError } from '@/lib/safe-fetch';
import { scan } from '@/lib/scan';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  try {
    const report = await scan(url);
    return Response.json(report, {
      headers: {
        // Identical scans within 10 minutes are served from the CDN.
        'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    const known = err instanceof ScanError;
    if (!known) console.error(err);
    return Response.json(
      {
        error: known ? err.message : 'Something went wrong while scanning.',
        code: known ? err.code : 'failed',
      },
      { status: known ? err.status : 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
