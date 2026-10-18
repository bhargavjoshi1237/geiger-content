import { publishedClient } from "@/lib/delivery/public";
import { isUuid } from "@/lib/vector/auth.mjs";

// Published delivery supports a bounded subset of GraphQL selection syntax.

const ALLOWED_FIELDS = new Map([
  ["id", "id"],
  ["title", "title"],
  ["slug", "slug"],
  ["status", "status"],
  ["type", "type"],
  ["excerpt", "excerpt"],
  ["body", "body"],
  ["author", "author"],
  ["locale", "locale"],
  ["coverUrl", "cover_url"],
  ["cover_url", "cover_url"],
  ["publishedAt", "published_at"],
  ["published_at", "published_at"],
]);

function errorResponse(errors, status = 400) {
  return Response.json(
    {
      data: null,
      errors: errors.map((message) => ({ message })),
      extensions: { geigerGraphql: "v1-placeholder" },
    },
    { status },
  );
}

// Keep allowlisted fields from the innermost selection set.
function pickFields(query) {
  const match = String(query || "").match(/\{([^{}]*)\}\s*\}?\s*$/);
  if (!match) return null;
  const names = match[1].trim().split(/[\s,]+/).filter(Boolean);
  const fields = names.filter((n) => ALLOWED_FIELDS.has(n));
  return fields.length ? fields : null;
}

// One string argument from an argument list such as `slug: "x", projectId: "y"`.
function argument(args, name) {
  return String(args || "").match(new RegExp(`\\b${name}\\s*:\\s*"([^"]+)"`))?.[1] || null;
}

function projectRow(row, fields) {
  const out = {};
  for (const name of fields) {
    out[name] = row[ALLOWED_FIELDS.get(name)] ?? null;
  }
  return out;
}

async function runQuery(query) {
  if (!query || typeof query !== "string") {
    return errorResponse(["`query` must be a non-empty string."]);
  }
  const sb = publishedClient();
  if (!sb) {
    return errorResponse(["Delivery API is not configured (missing Supabase env)."], 503);
  }

  const fields = pickFields(query);
  if (!fields) {
    return errorResponse([
      "Unsupported query. Try `{ entries(projectId: \"<project id>\") { id title slug status } }` or `{ entry(slug: \"…\", projectId: \"<project id>\") { id title slug status } }`.",
    ]);
  }

  // Every read is scoped to one project; slugs are only unique within a project.
  const singleMatch = query.match(/\bentry\s*\(([^)]*)\)/);
  if (singleMatch) {
    const slug = argument(singleMatch[1], "slug");
    const projectId = argument(singleMatch[1], "projectId");
    if (!slug || !isUuid(projectId)) {
      return errorResponse(['Use `{ entry(slug: "…", projectId: "<project id>") { … } }`.']);
    }
    const { data, error } = await sb
      .from("entries")
      .select("*")
      .eq("project_id", projectId)
      .eq("slug", slug)
      .eq("status", "Published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      return errorResponse(["Failed to load entry."], 500);
    }
    return Response.json({
      data: { entry: data ? projectRow(data, fields) : null },
      extensions: { geigerGraphql: "v1-placeholder" },
    });
  }

  if (/\bentries\b/.test(query)) {
    const projectId = argument(query.match(/\bentries\s*\(([^)]*)\)/)?.[1], "projectId");
    if (!isUuid(projectId)) {
      return errorResponse(['Use `{ entries(projectId: "<project id>") { … } }`.']);
    }
    const { data, error } = await sb
      .from("entries")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "Published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) {
      return errorResponse(["Failed to load entries."], 500);
    }
    return Response.json({
      data: { entries: (data || []).map((r) => projectRow(r, fields)) },
      extensions: { geigerGraphql: "v1-placeholder" },
    });
  }

  return errorResponse([
    "Unsupported query. Try `{ entries(projectId: \"<project id>\") { id title slug status } }` or `{ entry(slug: \"…\", projectId: \"<project id>\") { id title slug status } }`.",
  ]);
}

export async function POST(request) {
  try {
    const body = await request.json();
    return runQuery(body && body.query);
  } catch {
    return errorResponse(["Request body must be JSON with a `query` string."]);
  }
}

export async function GET(request) {
  const query = new URL(request.url).searchParams.get("query");
  return runQuery(query);
}
