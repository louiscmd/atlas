import "server-only";
// In-memory sliding-window limiter. Fine for a single instance; swap for Redis
// (same interface) when running multiple instances.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false as const, retryAfterSec: Math.ceil((windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true as const };
}

export const LIMITS = {
  auth: [10, 15 * 60_000],
  ai: [30, 60 * 60_000],
  aiVision: [20, 60 * 60_000],
  upload: [30, 60 * 60_000],
} as const;
