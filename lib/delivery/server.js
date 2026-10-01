import "server-only";
import { createClient } from "@supabase/supabase-js";

export function deliveryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function deliveryProject(client, projectId) {
  const { data, error } = await client.schema("public").from("projects").select("id").eq("id", projectId).is("deleted_at", null).maybeSingle();
  return !error && Boolean(data);
}

export async function purposeDenied(content, projectId, identifier, purpose) {
  if (!identifier) return false;
  const [direct, alias] = await Promise.all([
    content.from("profiles").select("id").eq("project_id", projectId).eq("primary_identifier", identifier).is("deleted_at", null),
    content.from("profiles").select("id").eq("project_id", projectId).contains("identifiers", [identifier]).is("deleted_at", null),
  ]);
  if (direct.error || alias.error) throw new Error("consent_unavailable");
  const ids = [...new Set([...(direct.data || []), ...(alias.data || [])].map((row) => row.id))];
  if (!ids.length) return false;
  const { data, error } = await content.from("consent_state").select("status").in("profile_id", ids).eq("purpose", purpose);
  if (error) throw new Error("consent_unavailable");
  return (data || []).some((row) => row.status === "denied");
}
