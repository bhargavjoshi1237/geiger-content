// Bearer-token callers for delivery. Tokens are looked up by SHA-256 hash and must belong to the requested project.
import { createHash } from "node:crypto";
import { DeliveryError, unauthorizedError } from "./errors.mjs";

export const ANONYMOUS = Object.freeze({ anonymous: true, tokenId: null, scopes: new Set() });
const QUERY_TOKEN_PARAMS = ["token", "access_token", "api_token", "apiKey"];

export function hashToken(plain) {
  return createHash("sha256").update(String(plain)).digest("hex");
}

// Only the Authorization header carries tokens; a token in the URL would leak into logs and caches.
export function readBearer(url, headers) {
  if (QUERY_TOKEN_PARAMS.some((key) => url.searchParams.has(key))) {
    throw unauthorizedError("Send API tokens in the Authorization header, not the query string.");
  }
  const header = headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S{8,512})$/i);
  if (!match) throw unauthorizedError("Use an Authorization: Bearer <token> header.");
  return match[1];
}

export async function authenticate(sb, projectId, plain, now = Date.now()) {
  if (!plain) return ANONYMOUS;
  const { data, error } = await sb
    .from("api_tokens")
    .select("id, project_id, scopes, expires_at, revoked_at")
    .eq("token_hash", hashToken(plain))
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[delivery.v2.auth]", error.message);
    throw new DeliveryError(500, "ApplicationError", "Couldn't verify the API token.");
  }
  const expired = data?.expires_at && Date.parse(data.expires_at) <= now;
  if (!data || data.revoked_at || expired || data.project_id !== projectId) {
    throw unauthorizedError("The API token is invalid, expired or belongs to another project.");
  }
  return { anonymous: false, tokenId: data.id, scopes: new Set(Array.isArray(data.scopes) ? data.scopes : []) };
}
