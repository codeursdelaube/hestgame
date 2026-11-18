/**
 * lib/rate-limit.ts
 * Limitation de débit simple en mémoire (20 req/min par IP)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map en mémoire : ip -> { count, resetAt }
const ipMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

export function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

/** Nettoie les entrées expirées */
export function cleanupRateLimit(): void {
  const now = Date.now();
  // Utilise Array.from pour compatibilité TS sans downlevelIteration
  for (const [ip, entry] of Array.from(ipMap.entries())) {
    if (now > entry.resetAt) ipMap.delete(ip);
  }
}
