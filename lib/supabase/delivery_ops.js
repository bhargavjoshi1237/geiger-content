"use client";

import { contentClient } from "@/supabase/components/content-client";
import { createClient } from "@/lib/supabase/client";
import { normalizeOperationRow } from "./enterprise_settings";

export async function requestOperation(route, projectId, body) {
  if (!projectId) return { ok: false, error: "Choose a project first." };
  try {
    const { data } = await createClient().auth.getSession();
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/${route}?${new URLSearchParams({ projectId })}`, {
      method: body ? "POST" : "GET", cache: "no-store",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(data?.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    return response.ok ? { ok: true, data: normalizeOperationRow(result) } : { ok: false, error: result.error || "This operation is unavailable." };
  } catch { return { ok: false, error: "Could not reach the project service." }; }
}

export async function getDelivery(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  try {
    const [entries, environments, sites] = await Promise.all([
      sb.from("entries").select("id,title,slug,environment_id,published_at").eq("project_id", projectId).eq("status", "Published").is("deleted_at", null).order("published_at", { ascending: false }).limit(100),
      sb.from("environments").select("id,name,key,is_default").eq("project_id", projectId).is("deleted_at", null),
      sb.from("sites").select("id,name,hostname,status").eq("project_id", projectId).is("deleted_at", null),
    ]);
    return [entries, environments, sites].some((result) => result.error) ? null : normalizeOperationRow({ entries: entries.data, environments: environments.data, sites: sites.data });
  } catch { return null; }
}

export async function getInvalidations(projectId) {
  const result = await requestOperation("cache-invalidation", projectId);
  return result.ok ? result.data : null;
}
