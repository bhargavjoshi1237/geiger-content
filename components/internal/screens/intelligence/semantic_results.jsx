"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { EmptyState } from "@/components/internal/shared/screen_kit";
import { requestVector } from "@/lib/supabase/semantic";

export function SemanticResults({
  results = [],
  projectId,
  emptyDescription = "Index published content and images to start finding related results.",
}) {
  async function like(row) {
    const result = await requestVector("activity", projectId, {
      method: "POST",
      body: {
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        type: "like",
        eventId: crypto.randomUUID(),
      },
    });
    if (result.ok)
      toast.success("Liked. Your interests will update in the background.");
    else toast.error(result.error);
  }
  if (!results.length)
    return (
      <EmptyState
        icon={ImageIcon}
        title="No matching results"
        description={emptyDescription}
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {results.map((row) => (
        <article
          key={`${row.sourceKind}:${row.sourceId}`}
          className="overflow-hidden rounded-xl border border-border bg-surface-card"
        >
          {row.sourceKind === "asset" ? (
            <a href={row.url} target="_blank" rel="noreferrer">
              <Image
                src={row.url}
                alt={row.excerpt || row.title}
                width={480}
                height={320}
                unoptimized
                className="aspect-[3/2] w-full object-cover"
              />
            </a>
          ) : (
            <div className="flex h-20 items-center px-4 text-text-secondary">
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs capitalize text-text-secondary">
                  {row.sourceKind === "asset" ? "Image" : "Content"}
                  {row.boosted ? " · Editorial boost" : ""}
                </p>
                {row.sourceKind === "entry" ? (
                  <Link
                    className="mt-1 block font-medium text-foreground hover:underline"
                    href={`/c/${row.sourceId}`}
                  >
                    {row.title}
                  </Link>
                ) : (
                  <p className="mt-1 font-medium text-foreground">
                    {row.title}
                  </p>
                )}
              </div>
              <span className="text-xs tabular-nums text-text-secondary">
                {Number(row.score).toFixed(3)}
              </span>
            </div>
            {row.excerpt ? (
              <p className="line-clamp-2 text-sm text-text-secondary">
                {row.excerpt}
              </p>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => like(row)}>
              <Heart className="h-3.5 w-3.5" /> Like
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
