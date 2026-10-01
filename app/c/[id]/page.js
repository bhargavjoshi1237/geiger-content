import { notFound } from "next/navigation";
import { publishedClient } from "@/lib/delivery/public";

import { BodyBlocks } from "@/components/internal/screens/editorial/body_blocks";
import { parseBody } from "@/components/internal/screens/editorial/body_doc";

import { PageViewTracker } from "./tracker";

function formatDate(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sb = publishedClient({ entryId: id });
  if (!sb) return { title: "Not found" };
  const { data } = await sb
    .from("entries")
    .select("title, excerpt")
    .eq("id", id)
    .eq("status", "Published")
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return { title: "Not found" };
  return {
    title: data.title || "Untitled",
    description: data.excerpt || undefined,
  };
}

// Non-published and removed entries remain unavailable to public visitors.
export default async function PublicEntryPage({ params }) {
  const { id } = await params;
  const sb = publishedClient({ entryId: id });
  if (!sb) notFound();
  const { data: entry } = await sb
    .from("entries")
    .select("*")
    .eq("id", id)
    .eq("status", "Published")
    .is("deleted_at", null)
    .maybeSingle();
  if (!entry) notFound();

  const date = entry.published_at || entry.updated_at || entry.created_at;

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <PageViewTracker entryId={entry.id} projectId={entry.project_id} />
      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-text-tertiary">
          {entry.type || "Article"}
          {date ? ` · ${formatDate(date)}` : ""}
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {entry.title || "Untitled"}
        </h1>
        {entry.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-text-secondary">
            {entry.excerpt}
          </p>
        ) : null}
        {entry.author ? (
          <p className="mt-4 text-sm text-muted-foreground">
            By {entry.author}
          </p>
        ) : null}
        {entry.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.cover_url}
            alt=""
            className="mt-8 w-full rounded-xl border border-border object-cover"
          />
        ) : null}
        {entry.body &&
        parseBody(entry.body).blocks.some((b) => b.text.trim() !== "") ? (
          <div className="mt-8">
            <BodyBlocks value={entry.body} />
          </div>
        ) : null}
      </article>
    </main>
  );
}
