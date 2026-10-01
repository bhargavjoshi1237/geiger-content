import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createArcticClient, BudgetExhausted } from "../lib/feed/crawl/arctic.mjs";
import { buildMatchers, classifyPost, compileKeyword } from "../lib/feed/crawl/classify.mjs";
import { DATE_FLOOR, extractSubredditLinks, foldGraph, resolveFloor, runCollect, subredditRecord } from "../lib/feed/crawl/crawler.mjs";
import { decodeHtml, extractImages, isImageCandidate } from "../lib/feed/crawl/media.mjs";
import { openStore, readManifest } from "../lib/feed/crawl/store.mjs";
import { loadTaxonomy } from "../lib/feed/taxonomy/index.mjs";
import { parseTaxonomy } from "../lib/feed/taxonomy/parse.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "feed-corpus-"));

test("keywords match whole words with plurals, not substrings", () => {
  const loop = compileKeyword({ field: "any", text: "loop" });
  assert.ok(loop.re.test("my first custom loops"));
  assert.ok(!loop.re.test("found a loophole"));
  assert.ok(compileKeyword({ field: "any", text: "60%" }).re.test("new 60% board"));
  assert.ok(compileKeyword({ field: "any", text: "$500" }).re.test("a $500 build"));
});

test("classifier prefers keyword steps over dedicated subs, then longer horizontal keywords", () => {
  const topics = loadTaxonomy().filter((t) => t.id === "pc-building");
  const { bySubreddit } = buildMatchers(topics);
  const hardline = classifyPost({ subreddit: "watercooling", title: "First hardline build, bending was hard", link_flair_text: "Build Complete" }, bySubreddit.get("watercooling"));
  assert.equal(hardline.step.id, "hardline-and-exotic-cooling");
  assert.equal(hardline.horizontal.id, "tube-bending");
  const loop = classifyPost({ subreddit: "watercooling", title: "Weekend project", link_flair_text: "Build Complete" }, bySubreddit.get("watercooling"));
  assert.equal(loop.step.id, "custom-loops");
  assert.equal(loop.horizontal.id, "finished-loops");
  assert.equal(loop.matched.horizontal, "flair:build complete");
  assert.equal(classifyPost({ subreddit: "pcmasterrace", title: "random meme" }, bySubreddit.get("pcmasterrace")), null);
});

test("classifier skips full horizontals and falls back to the next match", () => {
  const { bySubreddit } = buildMatchers(loadTaxonomy().filter((t) => t.id === "pc-building"));
  const post = { subreddit: "watercooling", title: "First custom loop leak, oops", link_flair_text: "" };
  const first = classifyPost(post, bySubreddit.get("watercooling"));
  const next = classifyPost(post, bySubreddit.get("watercooling"), { isFull: (p) => p === first.horizontal.path });
  assert.notEqual(next.horizontal.path, first.horizontal.path);
});

test("image detection accepts direct images and galleries, rejects video, NSFW and crossposts", () => {
  const base = { id: "a", title: "t", author: "u" };
  assert.ok(isImageCandidate({ ...base, url: "https://i.redd.it/x.jpeg" }));
  assert.ok(isImageCandidate({ ...base, url: "https://www.reddit.com/gallery/abc" }));
  assert.ok(!isImageCandidate({ ...base, url: "https://v.redd.it/x" }));
  assert.ok(!isImageCandidate({ ...base, url: "https://i.redd.it/x.jpeg", over_18: true }));
  assert.ok(!isImageCandidate({ ...base, url: "https://i.redd.it/x.jpeg", crosspost_parent: "t3_x" }));
  assert.ok(!isImageCandidate({ ...base, author: "[deleted]", url: "https://i.redd.it/x.jpeg" }));
});

test("gallery extraction keeps order, picks ≤1080px renditions and decodes entities", () => {
  const post = {
    is_gallery: true,
    gallery_data: { items: [{ media_id: "m2" }, { media_id: "m1" }, { media_id: "gone", is_deleted: true }] },
    media_metadata: {
      m1: { status: "valid", e: "Image", s: { x: 4000, u: "https://preview.redd.it/m1.jpg?w=4000&amp;s=1" }, p: [{ x: 640, u: "https://preview.redd.it/m1.jpg?w=640&amp;s=1" }, { x: 1080, u: "https://preview.redd.it/m1.jpg?w=1080&amp;s=1" }] },
      m2: { status: "valid", e: "Image", s: { x: 800, y: 600, u: "https://preview.redd.it/m2.jpg?a=1&amp;b=2" }, p: [] },
    },
  };
  const images = extractImages(post);
  assert.equal(images.length, 2);
  assert.equal(images[0].url, "https://preview.redd.it/m2.jpg?a=1&b=2");
  assert.equal(images[1].url, "https://preview.redd.it/m1.jpg?w=1080&s=1");
  assert.equal(decodeHtml("a&amp;b"), "a&b");
  assert.deepEqual(extractImages({ ...post, removed_by_category: "moderator" }), []);
});

test("date floor is never earlier than 2025-01-01", () => {
  assert.equal(resolveFloor("2024-06-01"), new Date(DATE_FLOOR).toISOString());
  assert.equal(resolveFloor(undefined), new Date(DATE_FLOOR).toISOString());
  assert.equal(resolveFloor("2026-03-01"), "2026-03-01T00:00:00.000Z");
});

test("subreddit records flag text-only subs and pull sidebar links", () => {
  const record = subredditRecord({ display_name: "buildapc", subscribers: 10, submission_type: "self", allow_images: false, allow_galleries: true, description: "See r/watercooling and /r/sffpc" }, "buildapc");
  assert.equal(record.imagePosts, false);
  assert.deepEqual(record.links, ["watercooling", "sffpc"]);
  assert.equal(subredditRecord(null, "gone").exists, false);
  assert.deepEqual(extractSubredditLinks("r/a1 r/Bbb_c xr/no"), ["bbb_c"]);
});

test("graph folding turns sidebar links into topic bridges", () => {
  const topics = loadTaxonomy();
  const folded = foldGraph({ subreddits: { watercooling: { exists: true, links: ["mechanicalkeyboards", "unknownsub"] }, mechanicalkeyboards: { exists: true, links: [] } } }, topics);
  assert.ok(folded.topicEdges.some((e) => e.from === "pc-building" && e.to === "mechanical-keyboards"));
});

test("client retries rate limits using the reset header, then enforces its request budget", async () => {
  let calls = 0;
  const waits = [];
  const fetchImpl = async () => {
    calls += 1;
    const limited = calls === 1;
    return { status: limited ? 422 : 200, headers: new Map([["x-ratelimit-reset", limited ? "7" : "0"]]), text: async () => JSON.stringify(limited ? { error: "Timeout. Maybe slow down a bit" } : { data: [{ id: "x" }] }) };
  };
  const client = createArcticClient({ fetchImpl, minIntervalMs: 0, maxRequests: 2, wait: async (ms) => waits.push(ms), onWait: () => {} });
  assert.deepEqual(await client.searchPosts({ subreddit: "a" }), [{ id: "x" }]);
  assert.ok(waits.some((ms) => ms >= 7000), "waited at least the reset window");
  await assert.rejects(client.searchPosts({ subreddit: "a" }), BudgetExhausted);
});

test("collect assigns, hydrates and persists posts, and resumes from the manifest", async () => {
  const dir = tmp();
  const [topic] = parseTaxonomy(`
# Demo {demo} > demo2 @demosub
## Sub @demosub
- Loops @!demosub ~ loop
  Budget: budget | Fancy: fancy | Fails: leak | First: first | Done: flair=done
- Two @demosub ~ two
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Three @demosub ~ three
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
- Four @demosub ~ four
  A: a1 | B: b1 | C: c1 | D: d1 | E: e1
`);
  for (const s of topic.subtopics) for (const st of s.steps) { st.path = `demo/${s.id}/${st.id}`; for (const h of st.horizontals) h.path = `${st.path}/${h.id}`; }
  const now = Math.floor(Date.parse("2026-09-01") / 1000);
  const posts = [
    { id: "p1", title: "budget build", subreddit: "demosub", author: "u", created_utc: now, url: "https://i.redd.it/1.jpg" },
    { id: "p2", title: "fancy one", subreddit: "demosub", author: "u", created_utc: now - 10, url: "https://www.reddit.com/gallery/p2" },
    { id: "p3", title: "no match here", subreddit: "demosub", author: "u", created_utc: now - 20, url: "https://i.redd.it/3.jpg" },
    { id: "p4", title: "a video", subreddit: "demosub", author: "u", created_utc: now - 30, url: "https://v.redd.it/4" },
  ];
  const hydrated = {
    p1: { id: "p1", url: "https://i.redd.it/1.jpg", post_hint: "image", preview: { images: [{ source: { url: "https://i.redd.it/1.jpg", width: 900, height: 600 }, resolutions: [] }] } },
    p2: { id: "p2", is_gallery: true, gallery_data: { items: [{ media_id: "g" }] }, media_metadata: { g: { status: "valid", e: "Image", s: { x: 500, u: "https://preview.redd.it/g.jpg" }, p: [] } } },
  };
  const client = {
    stats: { requests: 0, waits: 0, waitedMs: 0 },
    subredditInfo: async () => ({ display_name: "demosub", subscribers: 5, allow_images: true, submission_type: "any" }),
    searchPosts: async () => { client.stats.requests += 1; return client.stats.requests === 1 ? posts : []; },
    postsByIds: async (ids) => ids.map((id) => hydrated[id]).filter(Boolean),
  };
  const store = openStore(dir);
  const result = await runCollect({ client, store, topics: [topic], per: 2, phases: ["scan"] });
  assert.equal(result.added, 2);
  const records = [...readManifest(dir)];
  assert.deepEqual(records.map((r) => r.horizontalId).sort(), ["budget", "fancy"]);
  assert.equal(records.find((r) => r.id === "p2").image.url, "https://preview.redd.it/g.jpg");
  assert.ok(records.every((r) => Date.parse(r.createdAt) >= Date.parse(DATE_FLOOR)));
  const reopened = openStore(dir);
  assert.equal(reopened.total(), 2);
  assert.ok(reopened.seenPosts.has("p1"));
  assert.equal(reopened.cursor("scan:demosub").done, true);
});
