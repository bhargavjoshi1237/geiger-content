import { publishedClient } from "@/lib/delivery/public";

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
      "Unsupported query. Try `{ entries { id title slug status } }` or `{ entry(slug: \"…\") { id title slug status } }`.",
    ]);
  }

  const singleMatch = query.match(/entry\s*\(\s*slug\s*:\s*"([^"]+)"\s*\)/);
  if (singleMatch) {
    const { data, error } = await sb
      .from("entries")
      .select("*")
      .eq("slug", singleMatch[1])
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
    const projectMatch = query.match(/entries\s*\(\s*projectId\s*:\s*"([^"]+)"\s*\)/);
    let req = sb
      .from("entries")
      .select("*")
      .eq("status", "Published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(50);
    if (projectMatch) req = req.eq("project_id", projectMatch[1]);
    const { data, error } = await req;
    if (error) {
      return errorResponse(["Failed to load entries."], 500);
    }
    return Response.json({
      data: { entries: (data || []).map((r) => projectRow(r, fields)) },
      extensions: { geigerGraphql: "v1-placeholder" },
    });
  }

  return errorResponse([
    "Unsupported query. Try `{ entries { id title slug status } }` or `{ entry(slug: \"…\") { id title slug status } }`.",
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
