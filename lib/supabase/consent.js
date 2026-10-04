import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { isDemoMode, notifyDemoWrite } from "@/supabase/demo/demo-mode";

// Data-access layer for Consent. Owns `content.consent_state` (one row per
// profile + purpose). Pure: validate, console.error on failure, return
// null / false — never throw, never toast. DB snake_case; UI camelCase,
// mapped at this boundary.
//
// Status set: granted | denied | pending. Reads default to allow — only an
// explicit `denied` row suppresses a purpose (see consentHonoured).

const TABLE = "consent_state";

export const CONSENT_STATUSES = ["granted", "denied", "pending"];

export function normalizeConsent(row) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id ?? null,
    purpose: row.purpose ?? "analytics",
    status: row.status ?? "pending",
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

// Every consent row for one profile.
export async function listConsent(profileId) {
  if (!profileId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("profile_id", profileId)
      .order("purpose", { ascending: true });
    if (error) {
      console.error("[consent.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeConsent);
  } catch (e) {
    console.error("[consent.list]", e);
    return null;
  }
}

// One purpose's status for one profile, or null when never recorded.
export async function getConsent(profileId, purpose = "analytics") {
  if (!profileId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("profile_id", profileId)
      .eq("purpose", purpose)
      .maybeSingle();
    if (error) {
      console.error("[consent.get]", error.message);
      return null;
    }
    return normalizeConsent(data);
  } catch (e) {
    console.error("[consent.get]", e);
    return null;
  }
}

// The server saves consent under the profile lock and erases withdrawn personalization vectors.
export async function setConsent(profileId, purpose = "analytics", status = "granted") {
  if (!profileId || !purpose || !isSupabaseConfigured()) return null;
  if (!CONSENT_STATUSES.includes(status)) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data: profile, error } = await sb.from("profiles").select("project_id").eq("id", profileId).is("deleted_at", null).maybeSingle();
    if (error || !profile?.project_id) return null;
    // Consent is saved through the API route, which the read-only playground has no backing for.
    if (isDemoMode()) {
      notifyDemoWrite();
      return null;
    }
    const response = await fetch(`/api/consent?projectId=${encodeURIComponent(profile.project_id)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, purpose, status }),
    });
    if (!response.ok) return null;
    return normalizeConsent(await response.json());
  } catch {
    return null;
  }
}

// Whether a purpose is honoured for a profile. Default allow: missing rows,
// `granted` and `pending` all pass — only an explicit `denied` suppresses.
// Accepts either the row list from listConsent() or a single status string.
export function consentHonoured(consents, purpose = "analytics") {
  if (typeof consents === "string") return consents !== "denied";
  if (!Array.isArray(consents)) return true;
  const row = consents.find((c) => c?.purpose === purpose);
  if (!row) return true;
  return row.status !== "denied";
}
