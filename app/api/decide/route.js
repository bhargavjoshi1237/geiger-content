import { decideOverVariants, normalizeVariant } from "@/lib/decide-core";
import { eligibleVariants, publicScope, safeDecisionContext } from "@/lib/delivery/core.mjs";
import { deliveryClient, deliveryProject, purposeDenied } from "@/lib/delivery/server";

export const runtime = "nodejs";

function result(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

// Public decisions use project-scoped published content and record no profile identifiers.
export async function POST(request) {
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 20000) return result({ error: "Request too large." }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return result({ error: "Send a valid JSON request." }, 400); }
    if (!publicScope(body)) return result({ error: "A valid projectId and slotKey are required." }, 400);
    const { projectId, slotKey, profile = {}, context = {} } = body;
    const client = deliveryClient();
    if (!client) return result({ error: "Delivery is not configured." }, 503);
    if (!(await deliveryProject(client, projectId))) return result({ error: "Project not found." }, 404);
    const content = client.schema("content");
    const { data: slot, error: slotError } = await content.from("slots").select("id, fallback_entry_id")
      .eq("project_id", projectId).eq("key", slotKey).is("deleted_at", null).maybeSingle();
    if (slotError) return result({ error: "Could not load this slot." }, 503);
    if (!slot) return result({ error: "Slot not found." }, 404);
    const [variantResult, entryResult] = await Promise.all([
      content.from("variants").select("*").eq("project_id", projectId).eq("slot_id", slot.id).is("deleted_at", null).order("priority", { ascending: false }),
      content.from("entries").select("id, project_id, status, deleted_at, metadata").eq("project_id", projectId).eq("status", "Published").is("deleted_at", null),
    ]);
    if (variantResult.error || entryResult.error) return result({ error: "Could not load eligible content." }, 503);
    const identifiers = [...new Set([profile?.id, profile?.anonymousId, context?.anonymousId].filter((value) => typeof value === "string" && value.length > 0))];
    if (identifiers.some((identifier) => identifier.length > 200)) return result({ error: "Visitor identifiers are too long." }, 400);
    const denied = (await Promise.all(identifiers.map((identifier) => purposeDenied(content, projectId, identifier, "personalization")))).some(Boolean);
    const variants = eligibleVariants(variantResult.data || [], entryResult.data || [], projectId).map(normalizeVariant);
    const decision = decideOverVariants(denied ? variants.filter((variant) => !Object.keys(variant.rules || {}).length) : variants, { profile: denied ? {} : profile, context: denied ? {} : context });
    if (!decision.entryId && (entryResult.data || []).some((entry) => entry.id === slot.fallback_entry_id && entry.metadata?.visibility !== "private")) {
      decision.entryId = slot.fallback_entry_id;
      decision.variantId = null;
      decision.reason = "No eligible targeted variant matched; selected the published slot fallback.";
    }
    if (!denied) {
      const { error } = await content.from("decision_traces").insert({ project_id: projectId, slot_id: slot.id, entry_id: decision.entryId, variant_id: decision.variantId, reason: decision.reason, context: safeDecisionContext(context) });
      if (error) return result({ error: "Could not record this decision." }, 503);
    }
    return result(decision);
  } catch {
    return result({ error: "The decision service is unavailable." }, 503);
  }
}
