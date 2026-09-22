type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limit for single-instance deploys.
 * Returns true when the request is allowed.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientKey(prefix: string, formData: FormData, fallback = "anon") {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const invite = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  const id = email || invite || fallback;
  return `${prefix}:${id}`;
}
