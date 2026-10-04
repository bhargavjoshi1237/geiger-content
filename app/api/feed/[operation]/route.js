import { vectorContext, vectorResponse, vectorFailure } from "@/lib/vector/server";
import { VectorError, assertSameOrigin } from "@/lib/vector/auth.mjs";
import { vectorPool } from "@/lib/vector/connection.mjs";
import { createFeedVectors } from "@/lib/feed/vectors.mjs";
import { createLiveFeed } from "@/lib/feed/live.mjs";
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

function failure(error) {
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
    if (["next", "events", "reset"].includes(operation)) {
      const row = await vectors.profile(ctx.projectId, ctx.user.id, profileName(body.profile));
      if (operation === "next") return vectorResponse(await feed.next(row));
      if (operation === "events") return vectorResponse(await feed.record(row.id, body.events));
      await vectors.resetProfile(row.id);
      return vectorResponse(await feed.profile(ctx.projectId, ctx.user.id, row.name));
    }
    if (operation === "similar") return vectorResponse(await feed.similar(body.postId));
    if (operation === "search") return vectorResponse(await feed.search(body.query));
    throw new VectorError("unknown_operation", "This operation is not available.", 404);
  } catch (error) {
    return failure(error);
  }
}
