"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { normalizeContent } from "./content";
import { createVersion } from "./versions";
import { fireWebhooks } from "./webhooks";

// Publish pipeline (minimal, app-layer only — no SQL RPC). Publishing an
// entry flips its status to Published, stamps published_at, snapshots the row
// into content.entry_versions, and fans out to webhooks. Pure: validate,
// console.error on failure, return null / false — never throw, never toast.

const TABLE = "entries";

function snapshotPayload(row) {
  if (!row) return {};
  return {
    title: row.title ?? "",
    slug: row.slug ?? "",
    type: row.type ?? "",
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    author: row.author ?? "",
    locale: row.locale ?? "en",
    cover_url: row.cover_url ?? "",
    environment_id: row.environment_id ?? null,
  };
}

// Publishes one entry: status → Published, published_at → now, plus a version
// snapshot and webhook fan-out. Returns the updated entry, or null.
export async function publishEntry(id, userId) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data: current, error: readError } = await sb
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError || !current) {
      console.error("[publishing.publish]", readError?.message || "missing entry");
      return null;
    }
    const now = new Date().toISOString();
    const { data, error } = await sb
      .from(TABLE)
      .update({ status: "Published", published_at: now })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[publishing.publish]", error.message);
      return null;
    }
    await createVersion(id, snapshotPayload(data), {
      projectId: data.project_id ?? null,
      publishedAt: now,
      createdBy: userId ?? data.created_by ?? null,
    });
    if (data.project_id) {
      await fireWebhooks(data.project_id, "entry.published", {
        entryId: id,
        slug: data.slug ?? "",
        title: data.title ?? "",
      });
    }
    return normalizeContent(data);
  } catch (e) {
    console.error("[publishing.publish]", e);
    return null;
  }
}

// Unpublishes one entry: status → Draft (the row stays, delivery hides it).
// Returns the updated entry, or null.
export async function unpublishEntry(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .update({ status: "Draft" })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[publishing.unpublish]", error.message);
      return null;
    }
    if (data.project_id) {
      await fireWebhooks(data.project_id, "entry.unpublished", {
        entryId: id,
        slug: data.slug ?? "",
        title: data.title ?? "",
      });
    }
    return normalizeContent(data);
  } catch (e) {
    console.error("[publishing.unpublish]", e);
    return null;
  }
}

// Promotes every Scheduled entry whose scheduled_at has passed. Returns the
// count published. Backs the Vercel Cron route (app/api/cron/publish-due).
export async function publishDue() {
  if (!isSupabaseConfigured()) return 0;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TABLE)
      .select("id")
      .eq("status", "Scheduled")
      .is("deleted_at", null)
      .lte("scheduled_at", new Date().toISOString());
    if (error) {
      console.error("[publishing.publishDue]", error.message);
      return 0;
    }
    let published = 0;
    for (const row of data || []) {
      const saved = await publishEntry(row.id, null);
      if (saved) published += 1;
    }
    return published;
  } catch (e) {
    console.error("[publishing.publishDue]", e);
    return 0;
  }
}
