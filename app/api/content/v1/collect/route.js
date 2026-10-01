import { deliveryClient, deliveryProject, purposeDenied } from "@/lib/delivery/server";
import { isUuid } from "@/lib/vector/auth.mjs";

export const runtime = "nodejs";
const CORS_HEADERS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
const json = (data, status = 200) => Response.json(data, { status, headers: CORS_HEADERS });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Events are authoritative; the scheduled rollup corrects this best-effort display counter.
async function bumpDaily(sb, projectId, entryId, kind) {
  const date = new Date().toISOString().slice(0, 10);
  const conversion = kind === "conversion";
  let lookup = sb.from("metrics_daily").select("id,views,conversions").eq("project_id", projectId).eq("date", date);
  lookup = entryId ? lookup.eq("entry_id", entryId) : lookup.is("entry_id", null);
  const { data: existing, error } = await lookup.maybeSingle();
  if (error) return;
  if (!existing) {
    await sb.from("metrics_daily").insert({ project_id: projectId, date, entry_id: entryId, views: conversion ? 0 : 1, conversions: conversion ? 1 : 0 });
  } else {
    await sb.from("metrics_daily").update({ views: Number(existing.views ?? 0) + (conversion ? 0 : 1), conversions: Number(existing.conversions ?? 0) + (conversion ? 1 : 0) }).eq("id", existing.id);
  }
}

// Public beacons use a privileged server client only after validating the delivery scope and consent.
export async function POST(request) {
  try {
    const client = deliveryClient();
    if (!client) return json({ ok: false, error: "unconfigured" }, 503);
    const text = await request.text();
    if (Buffer.byteLength(text) > 20000) return json({ ok: false, error: "request too large" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ ok: false, error: "invalid json" }, 400); }
    const anonymousId = body?.anonymousId || null;
    const userId = body?.userId || null;
    if ((!anonymousId && !userId) || [anonymousId, userId].some((value) => value !== null && (typeof value !== "string" || value.length > 200))) return json({ ok: false, error: "a valid visitor identifier is required" }, 400);
    const projectId = body?.projectId;
    const entryId = body?.entryId || null;
    const type = body?.type || "page_view";
    if (!isUuid(projectId) || (entryId !== null && !isUuid(entryId)) || typeof type !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(type)) return json({ ok: false, error: "invalid event scope" }, 400);
    if (!(await deliveryProject(client, projectId))) return json({ ok: false, error: "project not found" }, 404);
    const sb = client.schema("content");
    if (entryId) {
      const { data, error } = await sb.from("entries").select("id,metadata").eq("id", entryId).eq("project_id", projectId).eq("status", "Published").is("deleted_at", null).maybeSingle();
      if (error) return json({ ok: false, error: "entry unavailable" }, 503);
      if (!data || data.metadata?.visibility === "private") return json({ ok: false, error: "published entry not found" }, 404);
    }
    const identifiers = [...new Set([userId, anonymousId].filter(Boolean))];
    const denials = await Promise.all(identifiers.map((identifier) => purposeDenied(sb, projectId, identifier, "analytics")));
    if (denials.some(Boolean)) return json({ ok: true, suppressed: true });
    const context = body?.context && typeof body.context === "object" && !Array.isArray(body.context) ? body.context : {};
    const { data, error } = await sb.from("events").insert({ project_id: projectId, anonymous_id: anonymousId, user_id: userId, entry_id: entryId, type, context }).select("id").single();
    if (error) return json({ ok: false, error: "insert failed" }, 503);
    await bumpDaily(sb, projectId, entryId, type);
    return json({ ok: true, id: data.id });
  } catch {
    return json({ ok: false, error: "collection unavailable" }, 503);
  }
}
