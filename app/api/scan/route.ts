import { ScanError } from '@/lib/safe-fetch';
import { scan } from '@/lib/scan';

export const maxDuration = 60;

function errorBody(err: unknown) {
  const known = err instanceof ScanError;
  if (!known) console.error(err);
  return {
    error: known ? err.message : 'Something went wrong while scanning.',
    code: known ? err.code : 'failed',
    status: known ? err.status : 500,
  };
}

/**
 * GET /api/scan?url=example.com
 *
 * With `Accept: application/x-ndjson` the scan streams progress lines
 * ({"type":"progress",...}) followed by one {"type":"report"} or
 * {"type":"error"} line. Otherwise it returns the report as plain JSON.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  const streaming = request.headers.get('accept')?.includes('application/x-ndjson');

  if (!streaming) {
    try {
      const report = await scan(url);
      return Response.json(report, {
        headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600' },
      });
    } catch (err) {
      const { status, ...body } = errorBody(err);
      return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: object) => controller.enqueue(encoder.encode(JSON.stringify(line) + '\n'));
      try {
        let last = 0;
        let lastStage = '';
        const report = await scan(url, (p) => {
          // At most ~8 updates a second, but never drop a stage change.
          const now = Date.now();
          if (p.stage === lastStage && now - last < 120) return;
          last = now;
          lastStage = p.stage;
          send({ type: 'progress', ...p });
        });
        send({ type: 'report', report });
      } catch (err) {
        const { status: _status, ...body } = errorBody(err);
        send({ type: 'error', ...body });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
