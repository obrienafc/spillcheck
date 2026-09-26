import { handleScan } from '@/lib/scan-handler';

// Runs in Dublin (see vercel.json), to show what visitors in the EU get.
export const maxDuration = 60;

export function GET(request: Request) {
  return handleScan(request);
}
