/**
 * Rate limiting for API routes.
 *
 * rateLimit(): in-memory and instant, but per server instance (on Vercel each
 * instance counts on its own). Fine for light, low-risk limits.
 *
 * limit(): shared across every instance through Upstash Redis when it's set
 * up (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or the KV_REST_API_*
 * pair Vercel's Upstash integration adds). Use it for anything abuse-prone —
 * sign-ups, codes, joins, payments. Without Upstash, or if it's slow or
 * down, it falls back to rateLimit() so requests are never blocked by it.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= max) return false; // blocked
  entry.count++;
  return true;
}

export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

const REDIS_URL = () => (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").replace(/\/+$/, "");
const REDIS_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
export const sharedLimitsOn = () => !!(REDIS_URL() && REDIS_TOKEN());

// Fixed window: one counter per key per window, which expires with the window.
export async function limit(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  const url = REDIS_URL(), token = REDIS_TOKEN();
  if (!url || !token) return rateLimit(key, max, windowMs);
  const k = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const r = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", k, "0", "PX", String(windowMs), "NX"], ["INCR", k]]),
      signal: AbortSignal.timeout(800),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`upstash ${r.status}`);
    const out = (await r.json()) as { result?: unknown; error?: string }[];
    const count = Number(out?.[1]?.result);
    if (!Number.isFinite(count)) throw new Error(out?.[1]?.error ?? "upstash: bad reply");
    return count <= max;
  } catch {
    return rateLimit(key, max, windowMs); // never fail closed because Redis hiccuped
  }
}
