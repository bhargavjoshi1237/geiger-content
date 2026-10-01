import { publishedClient } from "@/lib/delivery/public";

// Slug delivery shares the project-tagged published data cache.

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

export async function GET(request, context) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const sb = publishedClient({ projectId: project });
    if (!sb) {
      return Response.json(
        { error: "Not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    let query = sb
      .from("entries")
      .select("*")
      .eq("slug", slug)
      .eq("status", "Published")
      .is("deleted_at", null);
    if (project) query = query.eq("project_id", project);
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return Response.json(
        { error: "Not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(normalize(data), {
      headers: { "Cache-Control": CACHE },
    });
  } catch {
    return Response.json(
      { error: "Couldn't load the entry." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
