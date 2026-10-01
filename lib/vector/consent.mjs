import { VectorError, isUuid } from "./auth.mjs";
import { adminClient } from "./sources.mjs";
import { withProfileLock, eraseProfile } from "./repository.mjs";

export const CONSENT_PURPOSES = ["analytics", "personalization", "marketing"];
export const CONSENT_STATUSES = ["granted", "denied", "pending"];

export async function saveConsent(ctx, input = {}, dependencies = {}) {
  if (!isUuid(ctx?.projectId) || !isUuid(ctx?.user?.id) || typeof ctx?.content?.rpc !== "function")
    throw new VectorError("unauthorized", "Sign in before changing consent.", 401);
  if (!isUuid(input.profileId) || !CONSENT_PURPOSES.includes(input.purpose) || !CONSENT_STATUSES.includes(input.status))
    throw new VectorError("invalid_consent", "Choose a valid profile, purpose and consent status.");
  try {
    const access = await ctx.content.rpc("can_access_project", { p_project_id: ctx.projectId });
    if (access.error || access.data !== true)
      throw new VectorError("forbidden", "You do not have access to this project.", 403);
    const admin = dependencies.admin || adminClient();
    const lock = dependencies.withProfileLock || withProfileLock;
    const erase = dependencies.eraseProfile || eraseProfile;
    async function authorizedProfile() {
      const { data: profile, error } = await admin.schema("content").from("profiles")
        .select("id,project_id,primary_identifier,identifiers,deleted_at")
        .eq("project_id", ctx.projectId).eq("id", input.profileId).is("deleted_at", null).maybeSingle();
      if (error) throw new VectorError("profile_unavailable", "Could not verify the consent profile.", 503);
      if (!profile || profile.project_id !== ctx.projectId || profile.id !== input.profileId || profile.deleted_at)
        throw new VectorError("profile_unavailable", "The consent profile is unavailable in this project.", 404);
      const own = profile.primary_identifier === ctx.user.id || (Array.isArray(profile.identifiers) && profile.identifiers.includes(ctx.user.id));
      if (!own) {
        const allowed = await ctx.content.rpc("rbac_allows", { p_permission: "content.consent.override", p_project: ctx.projectId });
        if (allowed.error || allowed.data !== true)
          throw new VectorError("forbidden", "Your role cannot change another profile's consent.", 403);
      }
      return profile;
    }
    const profile = await authorizedProfile();
    return await lock(ctx.projectId, profile.id, async (client) => {
      await authorizedProfile();
      const { data, error } = await admin.schema("content").from("consent_state")
        .upsert({ profile_id: profile.id, purpose: input.purpose, status: input.status }, { onConflict: "profile_id,purpose" })
        .select("id,profile_id,purpose,status,created_at,updated_at").single();
      if (error || !data)
        throw new VectorError("consent_unavailable", "Could not save the consent choice.", 503);
      if (input.purpose === "personalization" && input.status !== "granted")
        await erase(client, ctx.projectId, profile.id);
      return data;
    });
  } catch (error) {
    if (error instanceof VectorError) throw error;
    throw new VectorError("consent_unavailable", "The consent service is unavailable. Try again when the profile lock and data stores are available.", 503);
  }
}
