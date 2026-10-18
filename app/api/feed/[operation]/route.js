import { vectorContext, vectorResponse, vectorFailure } from "@/lib/vector/server";
import { VectorError, assertSameOrigin } from "@/lib/vector/auth.mjs";
import { vectorPool } from "@/lib/vector/connection.mjs";
import { createFeedVectors } from "@/lib/feed/vectors.mjs";
import { createLiveFeed, FeedRequestError, FeedSettingsError, FeedSteeringError } from "@/lib/feed/live.mjs";
import { QueryEmbeddingError } from "@/lib/feed/query-text.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const PERMISSIONS = ["content.recommendations.view", "content.intelligence.view"];

// One catalog cache per server process.
function live() {
  globalThis.geigerLiveFeed ||= { vectors: createFeedVectors(vectorPool()) };
  globalThis.geigerLiveFeed.feed ||= createLiveFeed(globalThis.geigerLiveFeed.vectors);
  return globalThis.geigerLiveFeed;
}

const profileName = (value) => String(value || "default").trim().slice(0, 40) || "default";
const PROFILE_OPERATIONS = ["next", "events", "reset", "settings", "steering", "exclude", "probe"];

function failure(error) {
  if (error instanceof FeedSettingsError) return vectorFailure(new VectorError("invalid_settings", error.message, 400));
  if (error instanceof FeedSteeringError || error instanceof FeedRequestError) return vectorFailure(new VectorError(error.code, error.message, error.status));
  if (error instanceof QueryEmbeddingError) return vectorFailure(new VectorError(error.code, error.message, error.code === "invalid_query" ? 400 : 503));
  return vectorFailure(error);
}

export async function GET(request, { params }) {
  try {
    const { operation } = await params;
    const query = new URL(request.url).searchParams;
    const ctx = await vectorContext(request, query.get("projectId"), PERMISSIONS);
    const { vectors, feed } = live();
    if (operation === "status") {
      const [status, profiles] = await Promise.all([vectors.status(), vectors.listProfiles(ctx.projectId, ctx.user.id)]);
      return vectorResponse({ ...status, profiles });
    }
    if (operation === "profile")
      return vectorResponse(await feed.profile(ctx.projectId, ctx.user.id, profileName(query.get("profile"))));
    throw new VectorError("unknown_operation", "This operation is not available.", 404);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { operation } = await params;
    assertSameOrigin(request);
    const ctx = await vectorContext(request, new URL(request.url).searchParams.get("projectId"), PERMISSIONS);
    const text = await request.text();
    if (Buffer.byteLength(text) > 20000) throw new VectorError("request_too_large", "This request is too large.", 413);
    let body;
    try {
      body = JSON.parse(text || "{}");
    } catch {
      throw new VectorError("invalid_json", "Send a valid JSON request.");
    }
    const { vectors, feed } = live();
    if (PROFILE_OPERATIONS.includes(operation)) {
      const row = await vectors.profile(ctx.projectId, ctx.user.id, profileName(body.profile));
      if (operation === "next") return vectorResponse(await feed.next(row));
      if (operation === "events") return vectorResponse(await feed.record(row.id, body.events));
      if (operation === "settings") return vectorResponse(await feed.updateSettings(row.id, body.settings || {}));
      if (operation === "steering") return vectorResponse(await feed.steering(row.id, { action: body.action, text: body.text, id: body.id }));
      if (operation === "exclude") return vectorResponse(await feed.exclude(row.id, { scope: body.scope, id: body.id, on: body.on }));
      if (operation === "probe") return vectorResponse(await feed.probe(row.id, { action: body.action, sub: body.sub }));
      // Reset: everything (settings survive) or one scope (topic/subject, emotion, knowledge).
      if (!body.scope || body.scope === "all") await vectors.resetProfile(row.id);
      else await feed.scopedReset(row.id, { scope: body.scope, id: body.id });
      return vectorResponse(await feed.profile(ctx.projectId, ctx.user.id, row.name));
    }
    if (operation === "similar") return vectorResponse(await feed.similar(body.postId));
    if (operation === "search") return vectorResponse(await feed.search(body.query));
    throw new VectorError("unknown_operation", "This operation is not available.", 404);
  } catch (error) {
    return failure(error);
  }
}
