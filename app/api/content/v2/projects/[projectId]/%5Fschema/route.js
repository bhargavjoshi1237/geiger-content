import { handleSchema } from "@/lib/delivery/v2/server";

// GET /api/content/v2/projects/{projectId}/_schema[?format=ts]: content types and fields, or TypeScript declarations.
export async function GET(request, { params }) {
  return handleSchema(request, params);
}
