// Polite client for the Arctic Shift Reddit archive (no API key). Throttles requests,
// retries timeouts/rate limits using the server's reset headers, and reports every wait.

export const ARCTIC_BASE = "https://arctic-shift.photon-reddit.com";
// Fields allowed by /api/posts/search `fields=` (gallery/preview data needs /api/posts/ids).
export const SEARCH_FIELDS = "id,title,subreddit,author,created_utc,score,num_comments,link_flair_text,url,post_hint,over_18,crosspost_parent,spoiler";

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });

export class BudgetExhausted extends Error {
  constructor(message) { super(message); this.code = "budget_exhausted"; }
}

export function createArcticClient({
  baseUrl = ARCTIC_BASE,
  fetchImpl = globalThis.fetch,
  minIntervalMs = 1200,
  maxRetries = 6,
  maxRequests = Infinity,
  deadline = Infinity,
  signal,
  onWait = () => {},
  now = () => Date.now(),
  wait = sleep,
} = {}) {
  let last = 0;
  const stats = { requests: 0, retries: 0, waits: 0, waitedMs: 0, errors: 0 };

  async function request(path, params = {}, { maxRetries: retries = maxRetries } = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    const url = `${baseUrl}${path}?${query}`;
    for (let attempt = 0; ; attempt += 1) {
      if (signal?.aborted) throw new BudgetExhausted("aborted");
      if (stats.requests >= maxRequests) throw new BudgetExhausted(`request budget of ${maxRequests} reached`);
      if (now() >= deadline) throw new BudgetExhausted("time budget reached");
      const gap = last + minIntervalMs - now();
      if (gap > 0) await wait(gap, signal);
      last = now();
      stats.requests += 1;
      let status = 0;
      let body = null;
      let resetSeconds = null;
      try {
        const res = await fetchImpl(url, { headers: { "user-agent": "geiger-content-feed-corpus/1.0" }, signal });
        status = res.status;
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        resetSeconds = Number.isFinite(reset) && reset > 0 ? reset : null;
        const text = await res.text();
        try { body = JSON.parse(text); } catch { body = { error: text.slice(0, 200) }; }
      } catch (error) {
        if (signal?.aborted) throw new BudgetExhausted("aborted");
        body = { error: error.message || "network error" };
      }
      const message = String(body?.error || "");
      const retryable = status === 0 || status === 429 || status >= 500 || /timeout|slow down|rate/i.test(message);
      if (status === 200 && !body?.error) return body;
      if (!retryable || attempt >= retries) {
        stats.errors += 1;
        const error = new Error(`${path} ${status}: ${message || "request failed"}`);
        error.status = status;
        error.retryable = retryable;
        throw error;
      }
      // Back off: honour the server's reset window, else exponential, capped at 2 minutes.
      const backoff = Math.min(120000, Math.max(resetSeconds ? resetSeconds * 1000 : 0, 2000 * 2 ** attempt)) + Math.floor(Math.random() * 500);
      stats.retries += 1;
      stats.waits += 1;
      stats.waitedMs += backoff;
      onWait({ at: new Date(now()).toISOString(), path, params, status, message: message.slice(0, 120), attempt: attempt + 1, waitMs: backoff, resetSeconds });
      await wait(backoff, signal);
    }
  }

  return {
    stats,
    request,
    searchPosts: (params, options) => request("/api/posts/search", { limit: 100, sort: "desc", fields: SEARCH_FIELDS, ...params }, options).then((b) => b.data || []),
    postsByIds: (ids) => (ids.length ? request("/api/posts/ids", { ids: ids.join(",") }).then((b) => b.data || []) : Promise.resolve([])),
    subredditInfo: (name) => request("/api/subreddits/search", { subreddit: name, limit: 1 }).then((b) => (b.data || [])[0] || null),
  };
}
