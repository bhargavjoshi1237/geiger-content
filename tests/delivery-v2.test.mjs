import test from "node:test";
import assert from "node:assert/strict";
import { buildRegistry, schemaDocument } from "../lib/delivery/v2/schema.mjs";
import { parseListQuery, parseQueryString, parseSingleQuery } from "../lib/delivery/v2/parse.mjs";
import { compileOrder, compileWhere, escapeLike, quote } from "../lib/delivery/v2/compile.mjs";
import { castValue, paginationMeta, serializeEntry } from "../lib/delivery/v2/serialize.mjs";
import { generateTypes, typeName } from "../lib/delivery/v2/typegen.mjs";
import { ANONYMOUS, authenticate, hashToken, readBearer } from "../lib/delivery/v2/auth.mjs";
import { errorPayload } from "../lib/delivery/v2/errors.mjs";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AUTHOR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const field = (type_id, key, data_type, extra = {}) => ({ type_id, key, label: key, data_type, validation: {}, metadata: {}, position: 0, ...extra });
const registry = buildRegistry(
  [
    { id: ARTICLE, key: "article", name: "Article", api_id: "article", api_plural: "articles" },
    { id: AUTHOR, key: "author", name: "Author", api_id: "author", api_plural: "authors" },
    { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", key: "gone", name: "Gone", api_id: "gone", api_plural: "gones", deleted_at: "2026-01-01" },
  ],
  [
    field(ARTICLE, "price", "number", { position: 2 }),
    field(ARTICLE, "featured", "boolean", { position: 3 }),
    field(ARTICLE, "review_date", "date", { position: 4 }),
    field(ARTICLE, "tier", "enum", { validation: { options: ["free", "pro"] }, position: 5 }),
    field(ARTICLE, "extra", "json", { position: 6 }),
    field(ARTICLE, "hero", "media", { position: 7 }),
    field(ARTICLE, "writer", "reference", { position: 8 }),
    field(ARTICLE, "secret", "text", { metadata: { private: true } }),
    field(ARTICLE, "slug", "text"),
    field(ARTICLE, "bad-key", "text"),
    field(ARTICLE, "title", "text", { position: 1 }),
    field(AUTHOR, "name", "text"),
  ],
);
const article = registry.byPlural.get("articles");

test("registry exposes deliverable fields only and lets typed fields override built-ins", () => {
  assert.equal(registry.types.length, 2);
  assert.deepEqual(article.fields.map((f) => f.key), ["title", "price", "featured", "review_date", "tier", "extra", "hero", "writer"]);
  assert.equal(article.attributes.get("title").source, "data");
  assert.equal(article.attributes.get("excerpt").builtin, true);
  assert.equal(article.attributes.has("secret"), false);
  const doc = schemaDocument(registry);
  assert.deepEqual(doc.types[0].builtins, ["excerpt", "body", "author", "coverUrl"]);
  assert.deepEqual(doc.types[0].fields.find((f) => f.key === "tier").options, ["free", "pro"]);
});

test("bracket query strings decode like qs", () => {
  assert.deepEqual(parseQueryString("filters[price][$gt]=10&sort[0]=title:asc&sort[1]=id&fields=title,slug"), {
    filters: { price: { $gt: "10" } },
    sort: ["title:asc", "id"],
    fields: "title,slug",
  });
  assert.deepEqual(parseQueryString("filters[$or][0][title][$eq]=a&filters[$or][1][price][$in][]=1&filters[$or][1][price][$in][]=2"), {
    filters: { $or: [{ title: { $eq: "a" } }, { price: { $in: ["1", "2"] } }] },
  });
  assert.throws(() => parseQueryString("filters[__proto__][x]=1"), /Invalid query parameter/);
  assert.throws(() => parseQueryString(`a=${"x".repeat(9000)}`), (e) => e.status === 414);
  assert.throws(() => parseQueryString("a[b][c][d][e][f][g][h]=1"), /nested too deeply/);
});

test("filters compile to quoted PostgREST logic with typed paths", () => {
  const ir = parseListQuery(
    "filters[price][$gt]=10&filters[title][$containsi]=50%_off&filters[featured]=true&filters[$or][0][tier][$in][0]=pro&filters[$or][1][publishedAt][$null]=true",
    article,
  );
  assert.equal(
    compileWhere(ir.where),
    'and(data->price.gt."10",data->>title.ilike."*50\\\\%\\\\_off*",data->featured.eq."true",or(and(data->>tier.in.("pro")),and(published_at.is.null)))',
  );
  const between = parseListQuery("filters[review_date][$between][0]=2026-01-01&filters[review_date][$between][1]=2026-12-31T10:00:00Z&filters[$not][slug][$startsWith]=x", article);
  assert.equal(compileWhere(between.where), 'and(and(data->>review_date.gte."2026-01-01",data->>review_date.lte."2026-12-31"),not.and(and(slug.like."x*")))');
  assert.equal(compileWhere(parseListQuery("filters[hero][$notNull]=true&filters[id][$ne]=" + ARTICLE, article).where), `and(data->>hero.not.is.null,id.neq."${ARTICLE}")`);
  assert.equal(compileWhere(parseListQuery("", article).where), null);
});

test("values are quoted and LIKE metacharacters escaped", () => {
  assert.equal(quote('a"b\\c,d)'), '"a\\"b\\\\c,d)"');
  assert.equal(escapeLike("100%_*\\"), "100\\%\\__\\\\");
});

test("invalid filters fail with a path before any SQL is built", () => {
  const fails = (search, pattern, path) => {
    try {
      parseListQuery(search, article);
      assert.fail(`expected ${search} to fail`);
    } catch (error) {
      assert.equal(error.status, 400, search);
      assert.match(error.message, pattern);
      if (path) assert.deepEqual(error.path, path);
    }
  };
  fails("filters[nope][$eq]=1", /Invalid filter key/, ["filters", "nope"]);
  fails("filters[featured][$gt]=1", /doesn't apply to boolean/, ["filters", "featured", "$gt"]);
  fails("filters[price][$gt]=abc", /Expected a number/, ["filters", "price", "$gt"]);
  fails("filters[price][$wat]=1", /doesn't apply/);
  fails("filters[writer][name][$eq]=x", /relation "writer"/);
  fails("filters[secret][$eq]=x", /Invalid filter key/);
  fails("filters[id][$eq]=nope", /uuid/);
  fails("filters[price][$between][0]=1", /exactly two/);
  fails("filters[$xor][0][price]=1", /Unknown operator/);
  fails(Array.from({ length: 21 }, (_, i) => `filters[$and][${i}][price][$gt]=${i}`).join("&"), /at most 20 filter conditions/);
  fails("filters[$and][0][$and][0][$and][0][$and][0][$and][0][$and][0][price]=1", /nested too deeply|nest at most/);
  fails("status=draft", /preview token/);
  fails("unknown=1", /Invalid query parameter/);
  fails("sort=extra:asc", /Can't sort by "extra"/);
  fails("sort=a,b,c,d", /at most 3/);
  fails("fields[0]=secret", /Invalid field/);
  fails("populate=price", /isn't a relation or media field/);
  fails("populate[writer][populate][x]=true", /one level/);
  fails("pagination[page]=0", /at least 1/);
  fails("pagination[page]=1&pagination[limit]=5", /not both/);
  fails("locale=../../x", /Invalid locale/);
});

test("sort, fields, populate, pagination and locale defaults", () => {
  const ir = parseListQuery("sort=price:desc,title&fields[0]=title&populate=*&pagination[pageSize]=500", article, { defaultLocale: "en" });
  assert.deepEqual(compileOrder(ir.sort), [
    { column: "data->price", ascending: false },
    { column: "data->>title", ascending: true },
    { column: "id", ascending: true },
  ]);
  assert.deepEqual([...ir.fields], ["title"]);
  assert.deepEqual([...ir.populate.keys()], ["writer"]);
  assert.deepEqual(ir.pagination, { mode: "page", page: 1, pageSize: 100, limit: 100, offset: 0, withCount: true });
  assert.equal(ir.locale, "en");
  const defaults = parseListQuery("pagination[start]=40&pagination[limit]=10&pagination[withCount]=false&locale=de", article);
  assert.deepEqual(compileOrder(defaults.sort), [{ column: "published_at", ascending: false }, { column: "id", ascending: true }]);
  assert.deepEqual(defaults.pagination, { mode: "offset", start: 40, limit: 10, offset: 40, withCount: false });
  assert.equal(defaults.locale, "de");
  const single = parseSingleQuery("populate[writer][fields][0]=name", article);
  assert.deepEqual([...single.populate.get("writer").fields], ["name"]);
  assert.equal(single.locale, null);
});

test("serializer delivers typed values and drops everything outside the schema", () => {
  const row = {
    id: "e1", slug: "hello", locale: "en", title: "Column title", excerpt: "Ex", body: "B", author: "Ann", cover_url: "c.png",
    published_at: "2026-10-01T00:00:00Z", created_at: "2026-09-01T00:00:00Z", updated_at: null,
    status: "Published", metadata: { visibility: "public" }, project_id: PROJECT,
    data: { title: "Typed title", price: "49", featured: "true", review_date: "2026-10-17", tier: "enterprise", extra: { a: 1 }, hero: "asset-1", writer: "x", secret: "s", stray: 1 },
  };
  const media = new Map([["asset-1", { id: "asset-1", url: "u" }]]);
  const out = serializeEntry(row, article, { media, populated: new Map([["writer", { id: "a1" }]]) });
  assert.deepEqual(out, {
    id: "e1", slug: "hello", locale: "en", type: "article",
    publishedAt: "2026-10-01T00:00:00Z", createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
    excerpt: "Ex", body: "B", author: "Ann", coverUrl: "c.png",
    title: "Typed title", price: 49, featured: true, review_date: "2026-10-17", tier: null, extra: { a: 1 },
    hero: { id: "asset-1", url: "u" }, writer: { id: "a1" },
  });
  const slim = serializeEntry(row, article, { fields: new Set(["price"]) });
  assert.deepEqual(Object.keys(slim), ["id", "slug", "locale", "type", "publishedAt", "createdAt", "updatedAt", "price"]);
  assert.equal("writer" in serializeEntry(row, article), false);
  assert.equal(castValue({ type: "number" }, "abc"), null);
  assert.equal(castValue({ type: "text" }, 5), "5");
  assert.deepEqual(paginationMeta({ mode: "page", page: 2, pageSize: 25 }, 87, 25), { page: 2, pageSize: 25, pageCount: 4, total: 87 });
  assert.deepEqual(paginationMeta({ mode: "page", page: 1, pageSize: 25 }, null, 3), { page: 1, pageSize: 25, count: 3 });
});

test("type generation emits interfaces, filters and a plural map", () => {
  const ts = generateTypes(schemaDocument(registry));
  assert.match(ts, /export interface Article extends EntryBase \{\n  type: "article";/);
  assert.match(ts, /  price: number \| null;/);
  assert.match(ts, /  tier: "free" \| "pro" \| null;/);
  assert.match(ts, /  writer\?: Entry \| null;/);
  assert.match(ts, /  hero: Media \| null;/);
  assert.match(ts, /export type Entry = Article | Author;\| ContentAuthor;/);
  assert.match(ts, /  articles: Article;\n  authors:Entry = Article | Author;/);
  assert.doesNotMatch(ts, /secret/);
  assert.equal(typeName("blog-post"), "BlogPost");
  assert.equal(typeName("2fa"), "Type2fa");
  assert.equal(typeName("media"), "ContentMedia");
});

function tokenClient(row) {
  const calls = [];
  const builder = {
    select: () => builder,
    eq: (column, value) => (calls.push([column, value]), builder),
    is: () => builder,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { calls, from: () => builder };
}

test("bearer tokens must come from the header and belong to the project", async () => {
  const url = (q = "") => new URL(`https://x.test/api${q}`);
  assert.equal(readBearer(url(), new Headers()), null);
  assert.equal(readBearer(url(), new Headers({ authorization: "Bearer gct_abcdefgh123" })), "gct_abcdefgh123");
  assert.throws(() => readBearer(url("?token=gct_abcdefgh123"), new Headers()), (e) => e.status === 401);
  assert.throws(() => readBearer(url(), new Headers({ authorization: "Basic abc" })), (e) => e.status === 401);

  assert.equal(await authenticate(tokenClient(null), PROJECT, null), ANONYMOUS);
  const live = { id: "t1", project_id: PROJECT, scopes: ["delivery:read"], expires_at: null, revoked_at: null };
  const client = tokenClient(live);
  const caller = await authenticate(client, PROJECT, "gct_secret");
  assert.deepEqual([...caller.scopes], ["delivery:read"]);
  assert.deepEqual(client.calls, [["token_hash", hashToken("gct_secret")]]);
  for (const row of [null, { ...live, project_id: AUTHOR }, { ...live, revoked_at: "2026-01-01" }, { ...live, expires_at: "2000-01-01" }]) {
    await assert.rejects(authenticate(tokenClient(row), PROJECT, "gct_secret"), (e) => e.status === 401);
  }
});

test("unexpected errors never leak their message", () => {
  const { status, body } = errorPayload(new Error("relation content.secret does not exist"));
  assert.equal(status, 500);
  assert.equal(body.error.message, "Couldn't load content.");
});
