import { cronAuthorized } from "@/lib/vector/cron.mjs";
import { runWorker } from "@/lib/vector/ingestion.mjs";
import { vectorResponse, vectorFailure } from "@/lib/vector/server";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request) {
  if (!cronAuthorized(request))
    return vectorResponse(
      { error: "Unauthorized.", code: "unauthorized" },
      401,
    );
  try {
    return vectorResponse(await runWorker());
  } catch (error) {
    return vectorFailure(error);
  }
}
