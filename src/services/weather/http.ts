/**
 * Resilient HTTP helpers: timeout, retry with backoff, request deduplication,
 * and an opt-in persistent cache. Never caches credential-bearing requests.
 */

export class HttpError extends Error {
  readonly status: number | null;
  readonly url: string;
  constructor(message: string, status: number | null, url: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

const inflight = new Map<string, Promise<unknown>>();
const memoryCache = new Map<string, { expires: number; value: unknown }>();

const LS_PREFIX = "climate-chaser:cache:v1:";

/** Requests containing credentials must never be persisted. */
function isCacheable(url: string, cacheRequested: boolean): boolean {
  if (!cacheRequested) return false;
  if (/appid=|api_key=|apikey=|key=/i.test(url)) return false;
  return true;
}

function cacheKey(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) | 0;
  }
  return LS_PREFIX + (hash >>> 0).toString(36);
}

function readPersistentCache<T>(url: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expires: number; value: T };
    if (typeof parsed.expires !== "number" || parsed.expires < Date.now()) {
      localStorage.removeItem(cacheKey(url));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writePersistentCache<T>(url: string, value: T, ttlMs: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey(url),
      JSON.stringify({ expires: Date.now() + ttlMs, value })
    );
  } catch {
    // Quota exceeded or storage unavailable — non-fatal.
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  /** Use cache (memory + persistent) with this TTL. Credential URLs are never cached. */
  cacheTtlMs?: number;
  /** Skip cache read (e.g. user pressed Retry). */
  bypassCache?: boolean;
  signal?: AbortSignal;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<T> {
  const {
    timeoutMs = 8000,
    retries = 2,
    cacheTtlMs,
    bypassCache,
    signal,
  } = options;

  const cacheable = isCacheable(url, cacheTtlMs != null);
  const ttl = cacheTtlMs ?? 0;

  if (cacheable && !bypassCache) {
    const hit = memoryCache.get(url);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    const persisted = readPersistentCache<T>(url);
    if (persisted != null) {
      memoryCache.set(url, { expires: Date.now() + ttl, value: persisted });
      return persisted;
    }
  }

  // Deduplicate identical in-flight requests.
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const backoff = 250 * 2 ** (attempt - 1) + Math.random() * 150;
        await new Promise((r) => setTimeout(r, backoff));
      }
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const combined = signal
        ? anySignal([signal, timeoutSignal])
        : timeoutSignal;
      try {
        const response = await fetch(url, { signal: combined });
        if (response.ok) {
          const data = (await response.json()) as T;
          if (cacheable) {
            memoryCache.set(url, { expires: Date.now() + ttl, value: data });
            writePersistentCache(url, data, ttl);
          }
          return data;
        }
        if (!RETRYABLE_STATUS.has(response.status)) {
          throw new HttpError(
            `Request failed with status ${response.status}`,
            response.status,
            url
          );
        }
        lastError = new HttpError(
          response.status === 429
            ? "Rate limited by the weather service (HTTP 429)"
            : `Request failed with status ${response.status}`,
          response.status,
          url
        );
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        // Non-retryable client errors already thrown above as HttpError.
        if (error instanceof HttpError && error.status !== null && !RETRYABLE_STATUS.has(error.status)) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new HttpError("Network request failed", null, url);
  })();

  inflight.set(url, request);
  try {
    return await request;
  } finally {
    // Allow future requests after this one settles.
    if (inflight.get(url) === request) inflight.delete(url);
  }
}

/** AbortSignal.any fallback (Safari < 17.4). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}
