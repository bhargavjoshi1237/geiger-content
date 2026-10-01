import { publishedClient } from "@/lib/delivery/public";

// Public delivery returns only published entries with a tagged 60-second data cache.

const CACHE = "public, s-maxage=60, stale-while-revalidate";

function normalize(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    slug: row.slug ?? "",
    status: row.status ?? "Published",
    type: row.type ?? "Article",
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    author: row.author ?? "",
    locale: row.locale ?? "en",
    coverUrl: row.cover_url ?? "",
    environmentId: row.environment_id ?? null,
    projectId: row.project_id ?? null,
    scheduledAt: row.scheduled_at ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project");
  const sb = publishedClient({ projectId: project });
  if (!sb) {
    return Response.json([], { headers: { "Cache-Control": CACHE } });
  }
  try {
    const type = searchParams.get("type");
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 50, 1),
      100,
    );
    let query = sb
      .from("entries")
      .select("*")
      .eq("status", "Published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (project) query = query.eq("project_id", project);
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) {
      return Response.json(
        { error: "Couldn't load entries." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json((data || []).map(normalize), {
      headers: { "Cache-Control": CACHE },
    });
  } catch {
    return Response.json(
      { error: "Couldn't load entries." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
