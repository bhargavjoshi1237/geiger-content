"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Developer tokens + service accounts. Owns
// `content.api_tokens` (hashed, scoped, revocable bearer tokens) and
// `content.service_accounts` (named non-human identities). Pure: validate,
// console.error on failure, return null / false / [] — never throw, never
// toast. DB snake_case; UI camelCase, mapped at this boundary.
//
// Token secrecy contract: the plain bearer value exists only at mint time.
// Only its SHA-256 hex (`token_hash`) is stored; every read omits the hash
// column so hashes never reach the UI, and verification re-hashes the
// presented value and compares hashes.

const TOKENS_TABLE = "api_tokens";
const ACCOUNTS_TABLE = "service_accounts";

// --- Hashing (client-safe: WebCrypto SubtleCrypto, no node:crypto import) ---

function randomId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function subtle() {
  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof crypto.subtle.digest === "function"
  ) {
    return crypto.subtle;
  }
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    return globalThis.crypto.subtle;
  }
  return null;
}

export async function hashToken(plain) {
  if (!plain) return null;
  try {
    const engine = subtle();
    if (!engine) {
      console.error("[tokens.hash] no SubtleCrypto available");
      return null;
    }
    const bytes = await engine.digest(
      "SHA-256",
      new TextEncoder().encode(String(plain)),
    );
    return Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    console.error("[tokens.hash]", e);
    return null;
  }
}

// Mint a fresh bearer value plus its hash. The caller persists the hash via
// createToken and shows `plain` to the user exactly once.
export async function generateToken() {
  const plain = `gct_${randomId().replace(/-/g, "")}${randomId()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  const hash = await hashToken(plain);
  if (!hash) return null;
  return { plain, hash };
}

// --- API tokens ------------------------------------------------------------

const META_COLUMNS = "id, project_id, name, scopes, expires_at, revoked_at, last_used_at, created_by, created_at, updated_at";

export function normalizeApiToken(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name ?? "Untitled token",
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    lastUsedAt: row.last_used_at ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function tokenToRow(input) {
  const row = {};
  const map = {
    name: "name",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("scopes" in input)
    row.scopes = Array.isArray(input.scopes) ? input.scopes : [];
  if ("expiresAt" in input) row.expires_at = input.expiresAt || null;
  return row;
}

export async function listTokens(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .select(META_COLUMNS)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[tokens.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeApiToken);
  } catch (e) {
    console.error("[tokens.list]", e);
    return null;
  }
}

// Stores the hash, returns `{ plain, token }` — `plain` is returned exactly
// once so the UI can show it; afterwards only `token` (metadata) exists.
export async function createToken(input = {}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const minted = await generateToken();
    if (!minted) return null;
    const sb = contentClient();
    if (!sb) return null;
    const payload = {
      ...tokenToRow(input),
      token_hash: minted.hash,
    };
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .insert(payload)
      .select(META_COLUMNS)
      .single();
    if (error) {
      console.error("[tokens.create]", error.message);
      return null;
    }
    return { plain: minted.plain, token: normalizeApiToken(data) };
  } catch (e) {
    console.error("[tokens.create]", e);
    return null;
  }
}

export async function updateToken(id, patch = {}) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .update(tokenToRow(patch))
      .eq("id", id)
      .select(META_COLUMNS)
      .single();
    if (error) {
      console.error("[tokens.update]", error.message);
      return null;
    }
    return normalizeApiToken(data);
  } catch (e) {
    console.error("[tokens.update]", e);
    return null;
  }
}

export async function revokeToken(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .select(META_COLUMNS)
      .single();
    if (error) {
      console.error("[tokens.revoke]", error.message);
      return null;
    }
    return normalizeApiToken(data);
  } catch (e) {
    console.error("[tokens.revoke]", e);
    return null;
  }
}

// Hash-compare a presented bearer value. Returns the token metadata when the
// hash matches a live token (not revoked, not expired, not deleted), else
// null. Touches last_used_at on success without blocking the result.
export async function verifyToken(plain) {
  if (!plain || !isSupabaseConfigured()) return null;
  try {
    const hash = await hashToken(plain);
    if (!hash) return null;
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TOKENS_TABLE)
      .select(META_COLUMNS)
      .eq("token_hash", hash)
      .is("deleted_at", null)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) {
      console.error("[tokens.verify]", error.message);
      return null;
    }
    const token = normalizeApiToken(data);
    if (!token) return null;
    if (token.expiresAt && new Date(token.expiresAt) <= new Date()) return null;
    sb.from(TOKENS_TABLE)
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", token.id)
      .then(({ error: touchError }) => {
        if (touchError)
          console.error("[tokens.touch]", touchError.message);
      });
    return token;
  } catch (e) {
    console.error("[tokens.verify]", e);
    return null;
  }
}

// --- Service accounts ------------------------------------------------------

export function normalizeServiceAccount(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    name: row.name ?? "Untitled service account",
    role: row.role ?? "viewer",
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function accountToRow(input) {
  const row = {};
  const map = {
    name: "name",
    role: "role",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listServiceAccounts(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(ACCOUNTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[service-accounts.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeServiceAccount);
  } catch (e) {
    console.error("[service-accounts.list]", e);
    return null;
  }
}

export async function createServiceAccount(input = {}) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = accountToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(ACCOUNTS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[service-accounts.create]", error.message);
      return null;
    }
    return normalizeServiceAccount(data);
  } catch (e) {
    console.error("[service-accounts.create]", e);
    return null;
  }
}

export async function updateServiceAccount(id, patch = {}) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(ACCOUNTS_TABLE)
      .update(accountToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[service-accounts.update]", error.message);
      return null;
    }
    return normalizeServiceAccount(data);
  } catch (e) {
    console.error("[service-accounts.update]", e);
    return null;
  }
}

export async function softDeleteServiceAccount(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(ACCOUNTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[service-accounts.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[service-accounts.delete]", e);
    return false;
  }
}
