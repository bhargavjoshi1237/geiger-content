import { revalidatePath, revalidateTag } from "next/cache";
import { vectorContext, vectorResponse } from "@/lib/vector/server";
import { assertSameOrigin, VectorError } from "@/lib/vector/auth.mjs";
import { invalidationInput, operationBody } from "@/lib/operations_validation.mjs";

export const runtime = "nodejs";
const failure = (error) => vectorResponse({ error: error instanceof VectorError ? error.message : "Cache invalidation is unavailable." }, error instanceof VectorError ? error.status : 503);

async function context(request, write = false) {
  if (write) assertSameOrigin(request);
  return vectorContext(request, new URL(request.url).searchParams.get("projectId"), write ? ["content.entry.publish"] : ["content.publishing.view"]);
}

export async function GET(request) {
  try {
    const ctx = await context(request);
    const [entries, history] = await Promise.all([
      ctx.content.from("entries").select("id,title").eq("project_id", ctx.projectId).eq("status", "Published").is("deleted_at", null).limit(100),
      ctx.content.from("audit_log").select("id,entity_id,at,diff").eq("project_id", ctx.projectId).eq("action", "cache.invalidated").order("at", { ascending: false }).limit(100),
    ]);
    if (entries.error || history.error) throw new VectorError("cache_storage", "Could not read published entries or invalidation history.", 503);
    return vectorResponse({ entries: entries.data, history: history.data.map((row) => ({ id: row.id, path: row.diff?.path || `/c/${row.entity_id}`, at: row.at, status: "Revalidation requested" })) });
  } catch (error) { return failure(error); }
}

export async function POST(request) {
  try {
    const ctx = await context(request, true);
    const { entryId } = invalidationInput(await operationBody(request));
    const entry = await ctx.content.from("entries").select("id").eq("id", entryId).eq("project_id", ctx.projectId).eq("status", "Published").is("deleted_at", null).maybeSingle();
    if (entry.error || !entry.data) throw new VectorError("entry_unavailable", "Choose a published entry in this project.", 404);
    const path = `/c/${entryId}`;
    revalidateTag(`content-entry:${entryId}`, { expire: 0 });
    revalidateTag("content-public", { expire: 0 });
    revalidateTag(`content-project:${ctx.projectId}`, { expire: 0 });
    revalidatePath(path);
    const audit = await ctx.content.from("audit_log").insert({ project_id: ctx.projectId, actor: ctx.user.id, action: "cache.invalidated", entity: "entry", entity_id: entryId, diff: { path, scope: "next_delivery_cache" } }).select("id").single();
    if (audit.error) throw new VectorError("audit_unavailable", "Revalidation was requested, but its audit record could not be saved.", 503);
    return vectorResponse({ path, status: "Revalidation requested" });
  } catch (error) { return failure(error); }
}
