"use client";
import { createClient } from "@/lib/supabase/client";
import { DEMO_UNAVAILABLE, isDemoMode } from "@/supabase/demo/demo-mode";

export async function requestVector(
  operation,
  projectId,
  { method = "GET", body, query = {}, service = "vector" } = {},
) {
  if (!projectId)
    return {
      ok: false,
      error: "Choose a project first.",
      code: "invalid_project",
    };
  if (isDemoMode()) return DEMO_UNAVAILABLE;
  try {
    const { data } = await createClient().auth.getSession();
    const params = new URLSearchParams({ projectId, ...query });
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/${service}/${operation}?${params}`,
      {
        method,
        headers: {
          ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
          ...(data?.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {}),
        },
        ...(method !== "GET" ? { body: JSON.stringify(body || {}) } : {}),
        cache: "no-store",
      },
    );
    const result = await response.json();
    return response.ok
      ? { ok: true, data: result }
      : {
          ok: false,
          error: result.error || "The semantic service is unavailable.",
          code: result.code,
          retryAt: result.retryAt,
        };
  } catch {
    return {
      ok: false,
      error: "Could not reach the semantic service.",
      code: "network_error",
    };
  }
}

export async function semanticSimilarity(projectId, referenceId, limit = 10) {
  const result = await requestVector("similar", projectId, {
    method: "POST",
    body: { referenceId, referenceKind: "entry", kind: "entry", limit },
  });
  return result.ok
    ? {
        ...result,
        data: {
          ...result.data,
          results: result.data.results.map((row) => ({
            entry: row.entry,
            score: row.score,
            boosted: row.boosted,
          })),
        },
      }
    : result;
}
