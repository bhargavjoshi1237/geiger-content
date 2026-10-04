"use client";

import { contentClient } from "@/supabase/components/content-client";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode, notifyDemoWrite } from "@/supabase/demo/demo-mode";

export function normalizeOperationRow(row) {
  if (Array.isArray(row)) return row.map(normalizeOperationRow);
  if (!row || typeof row !== "object") return row;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), normalizeOperationRow(value)]));
}

async function read(query) {
  try {
    if (!query) return null;
    const { data, error } = await query;
    return error ? null : normalizeOperationRow(data);
  } catch { return null; }
}

export async function listSites(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const [sites, environments] = await Promise.all([
    read(sb.from("sites").select("id,name,hostname,brand_name,environment_id,status,created_at").eq("project_id", projectId).is("deleted_at", null).order("created_at", { ascending: false })),
    read(sb.from("environments").select("id,name,key").eq("project_id", projectId).is("deleted_at", null)),
  ]);
  return sites && environments ? { sites, environments } : null;
}

export async function saveSite(projectId, input, id = null) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const hostname = String(input.hostname || "").trim().toLowerCase();
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname) || !input.name?.trim()) return null;
  const { data: auth } = await createClient().auth.getUser();
  if (!auth?.user) return null;
  const payload = { name: input.name.trim().slice(0, 120), hostname, brand_name: String(input.brandName || "").slice(0, 120), environment_id: input.environmentId || null, status: ["Draft", "Active", "Paused"].includes(input.status) ? input.status : "Draft" };
  if (payload.environment_id) {
    const environment = await read(sb.from("environments").select("id").eq("id", payload.environment_id).eq("project_id", projectId).is("deleted_at", null).maybeSingle());
    if (!environment) return null;
  }
  return read((id ? sb.from("sites").update(payload).eq("id", id).eq("project_id", projectId) : sb.from("sites").insert({ ...payload, project_id: projectId, created_by: auth.user.id })).select("id,name,hostname,brand_name,environment_id,status").single());
}

export async function archiveSite(projectId, id) {
  const sb = contentClient();
  if (!sb || !projectId || !id) return null;
  return read(sb.from("sites").update({ deleted_at: new Date().toISOString() }).eq("project_id", projectId).eq("id", id).is("deleted_at", null).select("id").single());
}

export async function getBranding(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const { data, error } = await sb.from("project_settings").select("id,brand_name,metadata").eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (error) return null;
  return { brandName: data?.brand_name || "", tagline: data?.metadata?.branding?.tagline || "", logoUrl: data?.metadata?.branding?.logoUrl || "", supportEmail: data?.metadata?.branding?.supportEmail || "" };
}

export async function saveBranding(projectId, input) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  if (input.logoUrl) {
    try { if (new URL(input.logoUrl).protocol !== "https:") return null; } catch { return null; }
  }
  const { data: auth } = await createClient().auth.getUser();
  if (!auth?.user) return null;
  const existing = await sb.from("project_settings").select("id,metadata,updated_at").eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (existing.error) return null;
  const payload = { brand_name: String(input.brandName || "").slice(0, 120), metadata: { ...existing.data?.metadata, branding: { tagline: String(input.tagline || "").slice(0, 240), logoUrl: String(input.logoUrl || "").slice(0, 1000), supportEmail: String(input.supportEmail || "").slice(0, 254) } } };
  return read((existing.data ? sb.from("project_settings").update(payload).eq("id", existing.data.id).eq("project_id", projectId).eq("updated_at", existing.data.updated_at) : sb.from("project_settings").insert({ ...payload, project_id: projectId, created_by: auth.user.id })).select("id").single());
}

export async function getIntegrations(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const [connections, webhooks] = await Promise.all([
    read(sb.from("data_connections").select("id,name,type,status,updated_at").eq("project_id", projectId).is("deleted_at", null)),
    read(sb.from("webhooks").select("id,name,events,status,updated_at").eq("project_id", projectId).is("deleted_at", null)),
  ]);
  return connections && webhooks ? { rows: [...connections.map((row) => ({ ...row, kind: "Connection" })), ...webhooks.map((row) => ({ ...row, kind: "Webhook", type: row.events.join(", ") }))] } : null;
}

export async function setIntegrationStatus(projectId, row, status) {
  const sb = contentClient();
  if (!sb || !projectId || !["Active", "Paused"].includes(status)) return null;
  const table = row.kind === "Webhook" ? "webhooks" : "data_connections";
  return read(sb.from(table).update({ status }).eq("id", row.id).eq("project_id", projectId).select("id").single());
}

export async function getProjectConsent(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const profiles = await read(sb.from("profiles").select("id,primary_identifier").eq("project_id", projectId).is("deleted_at", null).order("created_at", { ascending: false }).limit(500));
  if (!profiles) return null;
  if (!profiles.length) return { profiles, rows: [] };
  const consent = await read(sb.from("consent_state").select("id,profile_id,purpose,status,updated_at").in("profile_id", profiles.map((row) => row.id)));
  return consent ? { profiles, rows: consent.map((row) => ({ ...row, identifier: profiles.find((profile) => profile.id === row.profileId)?.primaryIdentifier || row.profileId })) } : null;
}

export async function saveProjectConsent(projectId, profileId, purpose, status) {
  const sb = contentClient();
  if (!sb || !projectId || !["granted", "denied", "pending"].includes(status) || !["analytics", "personalization", "marketing"].includes(purpose)) return null;
  const profile = await read(sb.from("profiles").select("id").eq("id", profileId).eq("project_id", projectId).is("deleted_at", null).maybeSingle());
  if (!profile) return null;
  if (isDemoMode()) {
    notifyDemoWrite();
    return null;
  }
  try {
    const { data } = await createClient().auth.getSession();
    if (!data?.session?.access_token) return null;
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/consent?${new URLSearchParams({ projectId })}`, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ profileId, purpose, status }),
    });
    if (!response.ok) return null;
    return normalizeOperationRow(await response.json());
  } catch { return null; }
}

export async function getSecurity(projectId) {
  const sb = contentClient();
  if (!sb || !projectId) return null;
  const auth = createClient().auth;
  const [user, assurance, factors, tokens, accounts, events] = await Promise.all([
    auth.getUser(), auth.mfa.getAuthenticatorAssuranceLevel(), auth.mfa.listFactors(),
    read(sb.from("api_tokens").select("id,name,scopes,expires_at,revoked_at,last_used_at").eq("project_id", projectId).is("deleted_at", null)),
    read(sb.from("service_accounts").select("id,name,role").eq("project_id", projectId).is("deleted_at", null)),
    read(sb.from("audit_log").select("id,action,entity,at").eq("project_id", projectId).order("at", { ascending: false }).limit(20)),
  ]);
  if (!user.data?.user || tokens === null || accounts === null || events === null) return null;
  return { email: user.data.user.email || "Signed in", lastSignIn: user.data.user.last_sign_in_at, assurance: assurance.error ? "unavailable" : assurance.data?.currentLevel || "aal1", factors: factors.error ? null : (factors.data?.all || []).filter((factor) => factor.status === "verified").length, tokens, accounts, events };
}

export async function revokeProjectToken(projectId, id) {
  const sb = contentClient();
  if (!sb || !projectId || !id) return null;
  return read(sb.from("api_tokens").update({ revoked_at: new Date().toISOString() }).eq("project_id", projectId).eq("id", id).select("id").single());
}

export async function signOutOtherSessions() {
  try {
    const { error } = await createClient().auth.signOut({ scope: "others" });
    return !error;
  } catch { return false; }
}
