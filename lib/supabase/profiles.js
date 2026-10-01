import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for Audience Profiles. Owns `content.profiles` plus the
// per-profile key/value bag `content.profile_traits`. Pure: validate,
// console.error on failure, return null / [] / false — never throw, never
// toast. DB snake_case; UI camelCase, mapped at this boundary.

const PROFILES_TABLE = "profiles";
const TRAITS_TABLE = "profile_traits";

export function normalizeProfile(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    primaryIdentifier: row.primary_identifier ?? "",
    identifiers: Array.isArray(row.identifiers) ? row.identifiers : [],
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta, // expansion-bag keys surface as first-class fields
  };
}

export function normalizeTrait(row) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id ?? null,
    key: row.key ?? "",
    value: row.value ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function toProfileRow(input) {
  const row = {};
  const map = {
    projectId: "project_id",
    primaryIdentifier: "primary_identifier",
    identifiers: "identifiers",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export async function listProfiles(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(PROFILES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[profiles.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeProfile);
  } catch (e) {
    console.error("[profiles.list]", e);
    return null;
  }
}

export async function getProfile(id) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(PROFILES_TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[profiles.get]", error.message);
      return null;
    }
    return normalizeProfile(data);
  } catch (e) {
    console.error("[profiles.get]", e);
    return null;
  }
}

// Find a profile by its canonical identifier or any alias, creating it when
// nothing matches. Returns the profile view model or null.
export async function getOrCreateProfile(projectId, identifier) {
  if (!projectId || !identifier || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    // Two safe queries (eq, then array-contains) instead of one raw .or()
    // string, so identifiers with commas/quotes can't break the filter.
    const { data: direct, error } = await sb
      .from(PROFILES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("primary_identifier", identifier)
      .maybeSingle();
    if (error) {
      console.error("[profiles.getOrCreate]", error.message);
      return null;
    }
    if (direct) return normalizeProfile(direct);
    const { data: aliased, error: aliasError } = await sb
      .from(PROFILES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .contains("identifiers", [identifier])
      .maybeSingle();
    if (aliasError) {
      console.error("[profiles.getOrCreate]", aliasError.message);
      return null;
    }
    if (aliased) return normalizeProfile(aliased);
    const { data: created, error: createError } = await sb
      .from(PROFILES_TABLE)
      .insert({
        project_id: projectId,
        primary_identifier: identifier,
        identifiers: [identifier],
      })
      .select("*")
      .single();
    if (createError) {
      console.error("[profiles.getOrCreate]", createError.message);
      return null;
    }
    return normalizeProfile(created);
  } catch (e) {
    console.error("[profiles.getOrCreate]", e);
    return null;
  }
}

// Merge an anonymous profile into a known one on login: union the identifier
// aliases, fill missing traits (known values win), attribute the anonymous
// events to the known identity (best-effort), soft-delete the anonymous row.
// Returns the surviving (known) profile or null.
export async function mergeProfiles(projectId, anonymousIdentifier, knownIdentifier) {
  if (!projectId || !anonymousIdentifier || !knownIdentifier)
    return null;
  if (anonymousIdentifier === knownIdentifier) return null;
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const [anon, known] = await Promise.all([
      getOrCreateProfile(projectId, anonymousIdentifier),
      getOrCreateProfile(projectId, knownIdentifier),
    ]);
    if (!anon || !known) return null;
    if (anon.id === known.id) return known;

    // Union aliases onto the survivor.
    const identifiers = Array.from(
      new Set([...(known.identifiers || []), ...(anon.identifiers || [])]),
    );
    await sb
      .from(PROFILES_TABLE)
      .update({ primary_identifier: knownIdentifier, identifiers })
      .eq("id", known.id);

    // Fill trait gaps (existing known values win over anonymous ones).
    const [anonTraits, knownTraits] = await Promise.all([
      listTraits(anon.id),
      listTraits(known.id),
    ]);
    const knownKeys = new Set((knownTraits || []).map((t) => t.key));
    for (const trait of anonTraits || []) {
      if (!knownKeys.has(trait.key)) {
        await setTrait(known.id, trait.key, trait.value);
      }
    }

    // Attribute anonymous events to the known identity (best-effort).
    try {
      await sb
        .from("events")
        .update({ user_id: knownIdentifier })
        .eq("project_id", projectId)
        .eq("anonymous_id", anonymousIdentifier);
    } catch (e) {
      console.error("[profiles.merge] events", e);
    }

    await sb
      .from(PROFILES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", anon.id);
    return { ...known, identifiers, primaryIdentifier: knownIdentifier };
  } catch (e) {
    console.error("[profiles.merge]", e);
    return null;
  }
}

export async function softDeleteProfile(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(PROFILES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[profiles.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[profiles.delete]", e);
    return false;
  }
}

// All traits for one profile, keyed list form.
export async function listTraits(profileId) {
  if (!profileId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TRAITS_TABLE)
      .select("*")
      .eq("profile_id", profileId)
      .order("key", { ascending: true });
    if (error) {
      console.error("[profiles.traits]", error.message);
      return null;
    }
    return (data || []).map(normalizeTrait);
  } catch (e) {
    console.error("[profiles.traits]", e);
    return null;
  }
}

// Traits as a plain { key: value } map — the shape the segment matcher reads.
export async function getTraitsMap(profileId) {
  const rows = await listTraits(profileId);
  if (!rows) return null;
  const map = {};
  for (const t of rows) map[t.key] = t.value;
  return map;
}

// Upsert one trait (unique on profile_id + key). Value is stored as jsonb so
// traits stay typed (string, number, boolean, arrays).
export async function setTrait(profileId, key, value) {
  if (!profileId || !key || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TRAITS_TABLE)
      .upsert(
        { profile_id: profileId, key, value: value ?? null },
        { onConflict: "profile_id,key" },
      )
      .select("*")
      .single();
    if (error) {
      console.error("[profiles.setTrait]", error.message);
      return null;
    }
    return normalizeTrait(data);
  } catch (e) {
    console.error("[profiles.setTrait]", e);
    return null;
  }
}

export async function deleteTrait(profileId, key) {
  if (!profileId || !key || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    if (!sb) return false;
    const { error } = await sb
      .from(TRAITS_TABLE)
      .delete()
      .eq("profile_id", profileId)
      .eq("key", key);
    if (error) {
      console.error("[profiles.deleteTrait]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[profiles.deleteTrait]", e);
    return false;
  }
}

// Create a bare profile (the UI mints a UUID up front for optimistic rows).
export async function createProfile(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const payload = toProfileRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(PROFILES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[profiles.create]", error.message);
      return null;
    }
    return normalizeProfile(data);
  } catch (e) {
    console.error("[profiles.create]", e);
    return null;
  }
}
