// Public HTTP proxies for the fleet worker: each crawl slot gets its own exit IP, so Arctic Shift's per-IP
// rate limit applies per slot. HTTPS goes through a CONNECT tunnel, so a proxy can't read or alter responses.
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { ARCTIC_BASE } from "./arctic.mjs";

// Free lists that publish plain ip:port HTTP proxies; refreshed at build time and when the embedded list runs dry.
export const PROXY_SOURCES = [
  "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=protocolipport&format=text&timeout=5000",
  "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
  "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
];
const PROBE_PATH = "/api/posts/search?subreddit=pics&limit=2&fields=id";
const DEAD_RETRY_MS = 30 * 60000;

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });

// Normalises "ip:port" / "http://ip:port" lines into unique http:// proxy URLs.
export function parseProxies(text) {
  const out = new Set();
  for (const raw of String(text).split(/\s+/)) {
    const m = raw.trim().match(/^(?:https?:\/\/)?(\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})$/);
    if (m) out.add(`http://${m[1]}:${m[2]}`);
  }
  return [...out];
}

export async function fetchProxyLists({ sources = PROXY_SOURCES, timeoutMs = 30000 } = {}) {
  const lists = await Promise.all(sources.map(async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return res.ok ? parseProxies(await res.text()) : [];
    } catch { return []; }
  }));
  return [...new Set(lists.flat())];
}

// fetch() through one proxy that buffers the body, so a dying proxy fails here rather than mid-read.
async function viaProxy(agent, url, { signal, headers, timeoutMs }) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), timeoutMs);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await undiciFetch(url, { headers, dispatcher: agent, signal: timeout.signal });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: res.headers });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// Two clean archive answers in a row: free proxies that answer once and then stall are common.
export async function probeProxy(proxy, { baseUrl = ARCTIC_BASE, timeoutMs = 8000, rounds = 2 } = {}) {
  const agent = new ProxyAgent({ uri: proxy });
  try {
    for (let i = 0; i < rounds; i += 1) {
      const res = await viaProxy(agent, `${baseUrl}${PROBE_PATH}`, { timeoutMs });
      if (res.status !== 200) return false;
      const body = JSON.parse(await res.text());
      if (!Array.isArray(body?.data) || !body.data.length) return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    agent.close().catch(() => {});
  }
}

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Hands out working proxies in random order: probes candidates in the background, keeps a few spares,
// and retires proxies that fail (they become candidates again after 30 minutes).
export function createProxyPool({ embedded = [], spares = 3, concurrency = 48, signal, log = () => {} } = {}) {
  let candidates = shuffle(embedded);
  const ready = [];
  const inUse = new Set();
  const dead = new Map();
  const waiters = [];
  let probing = null;
  let lastRefresh = 0;
  const stats = { probed: 0, working: 0, retired: 0 };

  const nextCandidate = () => {
    while (candidates.length) {
      const p = candidates.pop();
      if (inUse.has(p) || ready.includes(p)) continue;
      const diedAt = dead.get(p);
      if (diedAt && Date.now() - diedAt < DEAD_RETRY_MS) continue;
      return p;
    }
    return null;
  };

  const hand = () => {
    while (waiters.length && ready.length) {
      const proxy = ready.shift();
      inUse.add(proxy);
      waiters.shift()(proxy);
    }
  };

  async function refill() {
    while (!signal?.aborted && ready.length < waiters.length + spares) {
      if (!candidates.length) {
        // Embedded list exhausted: pull fresh lists (at most every 10 minutes), retrying the long-dead ones too.
        const wait = lastRefresh + 10 * 60000 - Date.now();
        if (wait > 0) { await sleep(Math.min(wait, 60000), signal); continue; }
        lastRefresh = Date.now();
        const fresh = await fetchProxyLists();
        candidates = shuffle([...new Set([...fresh, ...embedded])]);
        log(`proxies: refreshed the candidate list (${candidates.length})`);
        if (!candidates.length) continue;
      }
      const batch = [];
      for (let i = 0; i < concurrency; i += 1) { const p = nextCandidate(); if (p) batch.push(p); }
      if (!batch.length) continue;
      const results = await Promise.all(batch.map(async (p) => [p, await probeProxy(p)]));
      for (const [p, ok] of results) {
        stats.probed += 1;
        if (ok) { stats.working += 1; ready.push(p); } else dead.set(p, Date.now());
      }
      hand();
    }
  }

  const kick = () => { if (!probing) probing = refill().finally(() => { probing = null; if (waiters.length) kick(); }); };

  return {
    stats,
    // Resolves with a working proxy (null once aborted).
    take() {
      return new Promise((resolve) => {
        if (signal?.aborted) return resolve(null);
        waiters.push(resolve);
        signal?.addEventListener("abort", () => resolve(null), { once: true });
        hand();
        kick();
      });
    },
    retire(proxy) {
      inUse.delete(proxy);
      dead.set(proxy, Date.now());
      stats.retired += 1;
      kick();
    },
  };
}

// A fetchImpl for createArcticClient that sends every request through the slot's current proxy and swaps
// to a fresh one when it fails, so a dead proxy never surfaces as a failed page (which could block a task).
export function createProxiedFetch({ pool, name, signal, timeoutMs = 45000, maxSwaps = 4, log = () => {} }) {
  let proxy = null;
  let agent = null;
  const drop = () => {
    if (!proxy) return;
    pool.retire(proxy);
    agent.close().catch(() => {});
    proxy = null;
    agent = null;
  };
  const fetchImpl = async (url, { headers } = {}) => {
    for (let swaps = 0; ; swaps += 1) {
      if (!proxy) {
        proxy = await pool.take();
        if (!proxy) throw new Error("aborted");
        agent = new ProxyAgent({ uri: proxy });
        log(`${name}: using proxy ${proxy}`);
      }
      try {
        // Inside the TLS tunnel every response is the archive's own; only connect/transport errors are the proxy's.
        return await viaProxy(agent, url, { signal, headers, timeoutMs });
      } catch (error) {
        if (signal?.aborted) throw error;
        log(`${name}: proxy ${proxy} failed (${error.cause?.code || error.message}) — swapping`);
        drop();
        if (swaps + 1 >= maxSwaps) throw error;
      }
    }
  };
  return { fetchImpl, current: () => proxy };
}
