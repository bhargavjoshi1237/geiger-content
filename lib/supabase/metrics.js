import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for daily rollups. Owns `content.metrics_daily`
// (pre-computed per-day views/conversions Intelligence reads instead of
// scanning events; entry_id NULL = the site-wide rollup for that day).
// Pure: validate, console.error on failure, return null / [] — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TABLE = "metrics_daily";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeMetric(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    date: row.date ?? null,
    entryId: row.entry_id ?? null,
    views: Number(row.views ?? 0),
    conversions: Number(row.conversions ?? 0),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

// Daily rows for a project, oldest first. Optional filters: entryId
// (pass null explicitly for the site-wide rollup), since / until (YYYY-MM-DD).
export async function getDaily(projectId, filters = {}) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    let query = sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: true });
    if ("entryId" in filters) {
      query =
        filters.entryId === null
          ? query.is("entry_id", null)
          : query.eq("entry_id", filters.entryId);
    }
    if (filters.since) query = query.gte("date", filters.since);
    if (filters.until) query = query.lte("date", filters.until);
    const { data, error } = await query;
    if (error) {
      console.error("[metrics.getDaily]", error.message);
      return null;
    }
    return (data || []).map(normalizeMetric);
  } catch (e) {
    console.error("[metrics.getDaily]", e);
    return null;
  }
}

// Totals over the filtered window, summed in JS from the daily rows.
export async function getTotals(projectId, filters = {}) {
  const rows = await getDaily(projectId, filters);
  if (!rows) return null;
  return rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      conversions: acc.conversions + r.conversions,
    }),
    { views: 0, conversions: 0 },
  );
}

// Best-effort aggregation helper: bump today's row for (project, entry).
// kind is "view" or "conversion". Read-then-write (not atomic under beacon
// concurrency) — the nightly rollup job reconciles from content.events, which
// stays the source of truth.
export async function recordView({
  projectId,
  entryId = null,
  kind = "view",
  date = todayISO(),
} = {}) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    let lookup = sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("date", date);
    lookup = entryId === null ? lookup.is("entry_id", null) : lookup.eq("entry_id", entryId);
    const { data: existing, error: readError } = await lookup.maybeSingle();
    if (readError) {
      console.error("[metrics.record]", readError.message);
      return null;
    }
    const delta =
      kind === "conversion" ? { conversions: 1 } : { views: 1 };
    if (!existing) {
      const { data, error } = await sb
        .from(TABLE)
        .insert({
          project_id: projectId,
          date,
          entry_id: entryId,
          views: delta.views || 0,
          conversions: delta.conversions || 0,
        })
        .select("*")
        .single();
      if (error) {
        console.error("[metrics.record]", error.message);
        return null;
      }
      return normalizeMetric(data);
    }
    const { data, error } = await sb
      .from(TABLE)
      .update({
        views: Number(existing.views ?? 0) + (delta.views || 0),
        conversions:
          Number(existing.conversions ?? 0) + (delta.conversions || 0),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      console.error("[metrics.record]", error.message);
      return null;
    }
    return normalizeMetric(data);
  } catch (e) {
    console.error("[metrics.record]", e);
    return null;
  }
}
