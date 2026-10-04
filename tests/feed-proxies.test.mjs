import test from "node:test";
import assert from "node:assert/strict";
import { createProxiedFetch, parseProxies } from "../lib/feed/crawl/proxies.mjs";

test("parseProxies keeps unique ip:port HTTP proxies in either notation", () => {
  const list = parseProxies("1.2.3.4:8080\r\nhttp://1.2.3.4:8080\nhttps://5.6.7.8:3128\nsocks5://9.9.9.9:1080\njunk\n10.0.0.1:80");
  assert.deepEqual(list, ["http://1.2.3.4:8080", "http://5.6.7.8:3128", "http://10.0.0.1:80"]);
});

test("a dead proxy is retired and swapped before the request fails", async () => {
  // Nothing listens on port 9 locally, so every connect is refused immediately.
  const handed = [];
  const retired = [];
  const pool = {
    take: async () => { handed.push("http://127.0.0.1:9"); return "http://127.0.0.1:9"; },
    retire: (p) => retired.push(p),
  };
  const { fetchImpl, current } = createProxiedFetch({ pool, name: "t", maxSwaps: 3, timeoutMs: 5000 });
  await assert.rejects(fetchImpl("https://example.invalid/"));
  assert.equal(handed.length, 3);
  assert.equal(retired.length, 3);
  assert.equal(current(), null);
});

test("an aborted pool ends the request without swapping further", async () => {
  const pool = { take: async () => null, retire: () => assert.fail("nothing to retire") };
  const { fetchImpl } = createProxiedFetch({ pool, name: "t" });
  await assert.rejects(fetchImpl("https://example.invalid/"), /aborted/);
});
