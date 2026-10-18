import { handleSingle } from "@/lib/delivery/v2/server";

// GET /api/content/v2/projects/{projectId}/{apiPlural}/{idOrSlug}: one published entry by uuid or slug.
export async function GET(request, { params }) {
  return handleSingle(request, params);
}
