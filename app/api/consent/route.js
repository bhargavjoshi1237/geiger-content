import { vectorContext, vectorResponse, vectorFailure } from "@/lib/vector/server";
import { assertSameOrigin, isUuid, VectorError } from "@/lib/vector/auth.mjs";
import { operationBody } from "@/lib/operations_validation.mjs";
import { saveConsent } from "@/lib/vector/consent.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const projectId = new URL(request.url).searchParams.get("projectId");
    const ctx = await vectorContext(request, projectId, ["content.audiences.view", "content.governance.view"]);
    const body = await operationBody(request);
    if (!isUuid(body.profileId) || !["analytics", "personalization", "marketing"].includes(body.purpose) || !["granted", "denied", "pending"].includes(body.status)) {
      throw new VectorError("invalid_consent", "Choose a valid profile, purpose and consent status.");
    }
    return vectorResponse(await saveConsent(ctx, { profileId: body.profileId, purpose: body.purpose, status: body.status }));
  } catch (error) { return vectorFailure(error); }
}
