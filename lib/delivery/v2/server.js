import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicFetchOptions } from "../core.mjs";
import { authenticate, readBearer } from "./auth.mjs";
import { canReadPrivate, findEntries, findEntry, loadProject } from "./engine.mjs";
import { DeliveryError, errorPayload, forbiddenError, notFoundError, unauthorizedError, validationError } from "./errors.mjs";
import { isUuid, parseListQuery, parseQueryString, parseSingleQuery } from "./parse.mjs";
import { schemaDocument } from "./schema.mjs";
import { generateTypes } from "./typegen.mjs";

// Delivery v2 route handlers. Reads use the service role, so project, publication and visibility scoping live in engine.mjs.

const PUBLIC_CACHE = "public, s-maxage=60, stale-while-revalidate=300";
const SCHEMA_CACHE = "public, s-maxage=300, stale-while-revalidate=600";
const PRIVATE_CACHE = "private, max-age=0, must-revalidate";

function serviceClient(fetchOptions) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, ...fetchOptions }) },
  }).schema("content");
}

function respond(request, body, { cache, contentType = "application/json; charset=utf-8" }) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const etag = `W/"${createHash("sha1").update(text).digest("base64url")}"`;
  const headers = { "Cache-Control": cache, ETag: etag, Vary: "Authorization" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(text, { status: 200, headers: { ...headers, "Content-Type": contentType } });
}

function failed(error) {
  const { status, body } = errorPayload(error);
  if (status >= 500 && !(error instanceof DeliveryError)) console.error("[delivery.v2]", error);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Shared per-request setup: tenant id, caller identity, and the project's registry.
async function open(request, projectId) {
  if (!isUuid(projectId)) throw notFoundError("Project not found.");
  const url = new URL(request.url);
  const sb = serviceClient(publicFetchOptions({ projectId }));
  const fresh = serviceClient({ cache: "no-store" });
  if (!sb || !fresh) throw new DeliveryError(503, "ServiceUnavailableError", "Delivery isn't configured.");
  const caller = await authenticate(fresh, projectId, readBearer(url, request.headers));
  if (caller.tokenId) {
    after(async () => {
      const { error } = await fresh.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", caller.tokenId);
      if (error) console.error("[delivery.v2.touch]", error.message);
    });
  }
  const project = await loadProject(sb, projectId);
  return { url, sb, ctx: { projectId, caller, project } };
}

function resolveType({ ctx }, apiPlural) {
  if (!ctx.project.publicDelivery && !canReadPrivate(ctx.caller)) throw notFoundError("Project not found.");
  const type = ctx.project.registry.byPlural.get(apiPlural);
  if (!type) throw notFoundError(`Unknown content type "${apiPlural}".`);
  return type;
}

// Route params may arrive encoded; a malformed escape keeps the raw value.
function decodeParam(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const cacheFor = (caller) => (caller.anonymous ? PUBLIC_CACHE : PRIVATE_CACHE);

export async function handleList(request, params) {
  try {
    const { projectId, type: apiPlural } = await params;
    const session = await open(request, projectId);
    const type = resolveType(session, apiPlural);
    const ir = parseListQuery(session.url.search, type, { defaultLocale: session.ctx.project.defaultLocale });
    const body = await findEntries(session.sb, session.ctx, type, ir);
    return respond(request, body, { cache: cacheFor(session.ctx.caller) });
  } catch (error) {
    return failed(error);
  }
}

export async function handleSingle(request, params) {
  try {
    const { projectId, type: apiPlural, idOrSlug } = await params;
    const session = await open(request, projectId);
    const type = resolveType(session, apiPlural);
    const ir = parseSingleQuery(session.url.search, type);
    const body = await findEntry(session.sb, session.ctx, type, decodeParam(idOrSlug), ir);
    return respond(request, body, { cache: cacheFor(session.ctx.caller) });
  } catch (error) {
    return failed(error);
  }
}

export async function handleSchema(request, params) {
  try {
    const { projectId } = await params;
    const session = await open(request, projectId);
    const { caller, project } = session.ctx;
    if (!project.publicSchema && !caller.scopes.has("schema:read")) {
      throw caller.anonymous
        ? unauthorizedError("Schema access needs a token with the schema:read scope.")
        : forbiddenError("This token is missing the schema:read scope.");
    }
    const query = parseQueryString(session.url.search);
    const extra = Object.keys(query).find((key) => key !== "format");
    if (extra) throw validationError(`Invalid query parameter "${extra}".`, [extra]);
    const format = query.format ?? "json";
    if (format !== "json" && format !== "ts") throw validationError("format must be json or ts.", ["format"]);
    const schema = schemaDocument(project.registry);
    const cache = caller.anonymous ? SCHEMA_CACHE : PRIVATE_CACHE;
    if (format === "ts") {
      return respond(request, generateTypes(schema, { source: `Geiger Content project ${projectId}` }), {
        cache,
        contentType: "text/plain; charset=utf-8",
      });
    }
    return respond(request, { data: schema, meta: {} }, { cache });
  } catch (error) {
    return failed(error);
  }
}
