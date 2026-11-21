/**
 * Fixed-window rate limiter, kept in memory. On serverless hosting each
 * instance has its own counts, so this is a speed bump against runaway
 * scripts and casual spam, not a hard guarantee. For stronger limits, add a
 * Vercel Firewall rate-limit rule in front of the app.
 */
export interface Limit {
  /** Requests allowed per window. */
  max: number;
  windowMs: number;
}

export const LIMITS = {
  /** Creating games or lobbies, per IP. */
  create: { max: 20, windowMs: 10 * 60_000 },
  /** Joining lobbies, per IP. */
  join: { max: 30, windowMs: 10 * 60_000 },
  /** Moves and bot steps, per IP. Bots step every ~300ms, so this leaves plenty of room. */
  move: { max: 600, windowMs: 60_000 },
} satisfies Record<string, Limit>;

const MAX_KEYS = 10_000;

export function createRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    /** Count one request; false if `key` is over its limit for this window. */
    allow(key: string, limit: Limit): boolean {
      const t = now();
      const w = windows.get(key);
      if (!w || t - w.start >= limit.windowMs) {
        if (windows.size >= MAX_KEYS) prune(t, limit.windowMs);
        windows.set(key, { start: t, count: 1 });
        return true;
      }
      w.count++;
      return w.count <= limit.max;
    },
  };

  function prune(t: number, windowMs: number) {
    for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
    // Still full (a flood of distinct keys): drop the oldest half rather than grow forever.
    if (windows.size >= MAX_KEYS) {
      [...windows.keys()].slice(0, MAX_KEYS / 2).forEach((k) => windows.delete(k));
    }
  }
}
