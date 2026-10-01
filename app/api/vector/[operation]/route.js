import {
  vectorContext,
  vectorResponse,
  vectorFailure,
} from "@/lib/vector/server";
import { VectorError, assertSameOrigin } from "@/lib/vector/auth.mjs";
import * as service from "@/lib/vector/service.mjs";
import { retryJobs } from "@/lib/vector/repository.mjs";
import * as insights from "@/lib/vector/insights.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

async function context(request, operation, write = false) {
  const manage =
    ["settings", "sync", "worker", "retry"].includes(operation) && write;
  const permissions = manage
    ? ["content.type.manage"]
    : [
        "content.intelligence.view",
        "content.recommendations.view",
        "content.audiences.view",
      ];
  if (write) assertSameOrigin(request);
  return vectorContext(
    request,
    new URL(request.url).searchParams.get("projectId"),
    permissions,
  );
}

export async function GET(request, { params }) {
  try {
    const { operation } = await params;
    const ctx = await context(request, operation),
      query = new URL(request.url).searchParams;
    if (operation === "status")
      return vectorResponse(await service.status(ctx));
    if (operation === "audience")
      return vectorResponse(await service.audience(ctx));
    if (["duplicates", "gaps", "graph", "tags", "decisions"].includes(operation))
      return vectorResponse(await insights[operation](ctx, Object.fromEntries(query)));
    if (operation === "knowledge")
      return vectorResponse(
        await service.searchKnowledge(ctx, query.get("query")),
      );
    throw new VectorError(
      "unknown_operation",
      "This operation is not available.",
      404,
    );
  } catch (error) {
    return vectorFailure(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { operation } = await params,
      ctx = await context(request, operation, true);
    const text = await request.text();
    if (Buffer.byteLength(text) > 20000)
      throw new VectorError(
        "request_too_large",
        "This request is too large.",
        413,
      );
    let body;
    try {
      body = JSON.parse(text || "{}");
    } catch {
      throw new VectorError("invalid_json", "Send a valid JSON request.");
    }
    if (operation === "settings")
      return vectorResponse(await service.settings(ctx, body));
    if (operation === "sync")
      return vectorResponse(await service.startIndexing(ctx));
    if (operation === "worker")
      return vectorResponse(
        await service.runWorker({ projectId: ctx.projectId, limit: 3 }),
      );
    if (operation === "retry")
      return vectorResponse(await retryJobs(ctx.projectId));
    if (operation === "search" || operation === "similar")
      return vectorResponse(await service.search(ctx, body));
    if (operation === "audience")
      return vectorResponse(await service.updateAudience(ctx, body));
    if (operation === "recommend")
      return vectorResponse(await service.personalized(ctx, body));
    if (operation === "activity")
      return vectorResponse(await service.trackActivity(ctx, body));
    if (operation === "knowledge")
      return vectorResponse(
        body.action === "remove"
          ? await service.removeKnowledge(ctx, body.id)
          : await service.saveKnowledge(ctx, body),
      );
    throw new VectorError(
      "unknown_operation",
      "This operation is not available.",
      404,
    );
  } catch (error) {
    return vectorFailure(error);
  }
}
