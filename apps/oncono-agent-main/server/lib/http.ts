/**
 * Shared outbound HTTP lane for every external scientific API this server talks to.
 *
 * Retry/backoff used to be written per-route in api.ts. It is defined once here so
 * CIViC, Ensembl, Open Targets, ChEMBL, OncoTree and ClinicalTrials.gov all degrade
 * identically under upstream 429/5xx, and so a caller cannot accidentally turn one
 * of them into an unhandled rejection.
 */

export interface RetryOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: RetryOptions = {}
): Promise<globalThis.Response> {
  const { maxRetries = 2, baseDelayMs = 500, timeoutMs, ...init } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = timeoutMs ? new AbortController() : null;
    const timer = timeoutMs && controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { ...init, signal: controller?.signal ?? init.signal });
      if (response.ok) return response;
      // 429 and 5xx are transient; anything else is the upstream's own verdict.
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw new Error(`Exhausted retries for ${url}`);
}

/**
 * Wraps a failed upstream in the shape the API layer already returns to the UI:
 * `{ available: false, source, reason }`. Never throws, never fabricates data.
 */
export function upstreamUnavailable(source: string, err: unknown): { available: false; source: string; reason: string } {
  const reason =
    err instanceof Error
      ? err.name === 'AbortError'
        ? `${source} timed out`
        : err.message
      : String(err);
  return { available: false, source, reason };
}

/**
 * Resolves to `promise`'s value, or to `fallback('deadline exceeded')` if it does
 * not settle within `ms`.
 *
 * Exists because knowledge enrichment fans out to six upstreams and one patient
 * panel can trigger ~40 individual HTTP calls. Without a bound, `/onco-agent/analyze`
 * was observed taking longer than 90 seconds and the request was aborted by the
 * client — the report endpoint must not block on a slow upstream. The late result
 * is discarded; the caller sees an honest `available: false` instead of a hang.
 */
export async function settleWithin<T>(
  promise: Promise<T>,
  ms: number,
  onDeadline: (reason: string) => T
): Promise<T> {
  // A deadline already in the past must resolve immediately, not schedule a
  // negative-duration timer (Node clamps those to 1ms and warns).
  const budget = Math.max(0, ms);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onDeadline(`exceeded ${budget}ms enrichment deadline`)), budget);
  });
  try {
    return await Promise.race([promise, deadline]);
  } catch (err) {
    return onDeadline(err instanceof Error ? err.message : String(err));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Deterministic TTL map so repeat requests never re-hammer an upstream. */
export class TtlCache<V> {
  private entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly opts: { ttlMs: number; maxEntries?: number }) {}

  get(key: string): V | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): V {
    this.entries.set(key, { value, expiresAt: Date.now() + this.opts.ttlMs });
    if (this.opts.maxEntries && this.entries.size > this.opts.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    return value;
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}
