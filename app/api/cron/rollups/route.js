import { adminClient } from "@/lib/vector/sources.mjs";
import { cronAuthorized } from "@/lib/vector/cron.mjs";

// Recount daily analytics from retained events.

export const dynamic = "force-dynamic";

const NULL_KEY = "__null__";

function keyOf(date, projectId, entryId) {
  return `${date}||${projectId || NULL_KEY}||${entryId || NULL_KEY}`;
}

export async function GET(request) {
  try {
    if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const sb = adminClient().schema("content");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await sb
      .from("events")
      .select("project_id, entry_id, at")
      .gte("at", since)
      .is("deleted_at", null)
      .limit(5000);
    if (recentError) {

      return Response.json(
        { error: "Couldn't load recent events." },
        { status: 500 },
      );
    }
    if (!recent || recent.length === 0) {
      return Response.json({ days: 0, rows: 0 });
    }

    // Recount complete affected dates to preserve totals at window edges.
    const affected = new Map();
    const dates = new Set();
    for (const row of recent) {
      const date = String(row.at || "").slice(0, 10);
      if (!date) continue;
      dates.add(date);
      affected.set(keyOf(date, row.project_id, row.entry_id), {
        date,
        projectId: row.project_id || null,
        entryId: row.entry_id || null,
      });
    }
    if (affected.size === 0) return Response.json({ days: 0, rows: 0 });

    const minDate = [...dates].sort()[0];
    const { data: dayEvents, error: dayError } = await sb
      .from("events")
      .select("project_id, entry_id, type, at")
      .gte("at", `${minDate}T00:00:00.000Z`)
      .is("deleted_at", null)
      .limit(10000);
    if (dayError) {

      return Response.json(
        { error: "Couldn't load day events." },
        { status: 500 },
      );
    }

    const counts = new Map();
    for (const row of dayEvents || []) {
      const date = String(row.at || "").slice(0, 10);
      if (!date || !dates.has(date)) continue;
      const k = keyOf(date, row.project_id, row.entry_id);
      if (!affected.has(k)) continue;
      if (!counts.has(k)) counts.set(k, { views: 0, conversions: 0 });
      const agg = counts.get(k);
      if (row.type === "conversion") agg.conversions += 1;
      else agg.views += 1;
    }

    let rows = 0;
    for (const [k, target] of affected) {
      const agg = counts.get(k) || { views: 0, conversions: 0 };
      let lookup = sb
        .from("metrics_daily")
        .select("id")
        .eq("date", target.date);
      lookup =
        target.projectId === null
          ? lookup.is("project_id", null)
          : lookup.eq("project_id", target.projectId);
      lookup =
        target.entryId === null
          ? lookup.is("entry_id", null)
          : lookup.eq("entry_id", target.entryId);
      const { data: existing, error: lookupError } = await lookup.maybeSingle();
      if (lookupError) {

        continue;
      }
      if (!existing) {
        const { error: insertError } = await sb.from("metrics_daily").insert({
          project_id: target.projectId,
          date: target.date,
          entry_id: target.entryId,
          views: agg.views,
          conversions: agg.conversions,
        });
        if (insertError) {

          continue;
        }
      } else {
        const { error: updateError } = await sb
          .from("metrics_daily")
          .update({ views: agg.views, conversions: agg.conversions })
          .eq("id", existing.id);
        if (updateError) {

          continue;
        }
      }
      rows += 1;
    }
    return Response.json({ days: dates.size, rows });
  } catch {

    return Response.json(
      { error: "Couldn't roll up metrics." },
      { status: 500 },
    );
  }
}
