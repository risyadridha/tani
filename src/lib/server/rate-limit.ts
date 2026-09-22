import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Rate limit in-memory untuk /login & /register (10 req/menit/IP).
// Jujur single-instance: reset saat restart, tidak lintas replica.
// Production terdistribusi wajib Redis/store eksternal. Didokumentasikan,
// bukan diklaim lebih.
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_HITS = 10;
const hits = new Map<string, number[]>();

function prune(list: number[], now: number): number[] {
  return list.filter((t) => now - t < WINDOW_MS);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const list = prune(hits.get(ip) ?? [], now);
  if (list.length >= MAX_HITS) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}
