import { handleList } from "@/lib/delivery/v2/server";

// GET /api/content/v2/projects/{projectId}/{apiPlural}: published entries of one type, Strapi v5 query syntax.
export async function GET(request, { params }) {
  return handleList(request, params);
}
