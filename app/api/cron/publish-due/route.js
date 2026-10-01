import { adminClient } from "@/lib/vector/sources.mjs";
import { cronAuthorized } from "@/lib/vector/cron.mjs";

// Publish due entries and snapshot their released version.

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!cronAuthorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const sb = adminClient().schema("content");
    const { data, error } = await sb
      .from("entries")
      .select("id")
      .eq("status", "Scheduled")
      .is("deleted_at", null)
      .lte("scheduled_at", new Date().toISOString());
    if (error) {

      return Response.json(
        { error: "Couldn't load due entries." },
        { status: 500 },
      );
    }
    let published = 0;
    for (const row of data || []) {
      const now = new Date().toISOString();
      const { data: entry, error: updateError } = await sb
        .from("entries")
        .update({ status: "Published", published_at: now })
        .eq("id", row.id)
        .select("*")
        .single();
      if (updateError || !entry) {

        continue;
      }
      const { data: prior } = await sb
        .from("entry_versions")
        .select("version")
        .eq("entry_id", row.id)
        .order("version", { ascending: false })
        .limit(1);
      const next = (prior?.[0]?.version || 0) + 1;
      await sb.from("entry_versions").insert({
        entry_id: row.id,
        version: next,
        payload: {
          title: entry.title ?? "",
          slug: entry.slug ?? "",
          type: entry.type ?? "",
          excerpt: entry.excerpt ?? "",
          body: entry.body ?? "",
          author: entry.author ?? "",
          locale: entry.locale ?? "en",
          cover_url: entry.cover_url ?? "",
        },
        project_id: entry.project_id ?? null,
        published_at: now,
      });
      published += 1;
    }
    return Response.json({ published });
  } catch {

    return Response.json(
      { error: "Couldn't publish due entries." },
      { status: 500 },
    );
  }
}
