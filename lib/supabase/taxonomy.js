"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for taxonomies. Owns `content.taxonomies`
// (key, name, hierarchical) + `content.terms`
// (taxonomy_id FK, slug, label, parent_id self-FK) + `content.entry_terms`
// (entry_id FK, term_id FK) with assign/remove helpers.
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const TAXONOMIES_TABLE = "taxonomies";
const TERMS_TABLE = "terms";
const ENTRY_TERMS_TABLE = "entry_terms";

export function normalizeTaxonomy(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    name: row.name ?? "Untitled taxonomy",
    hierarchical: Boolean(row.hierarchical),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function taxonomyToRow(input) {
  const row = {};
  const map = {
    key: "key",
    name: "name",
    hierarchical: "hierarchical",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export function normalizeTerm(row) {
  if (!row) return null;
  return {
    id: row.id,
    taxonomyId: row.taxonomy_id ?? null,
    slug: row.slug ?? "",
    label: row.label ?? "",
    parentId: row.parent_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

function termToRow(input) {
  const row = {};
  const map = {
    taxonomyId: "taxonomy_id",
    slug: "slug",
    label: "label",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("parentId" in input) row.parent_id = input.parentId || null;
  return row;
}

export async function listTaxonomies(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TAXONOMIES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) {
      console.error("[taxonomy.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeTaxonomy);
  } catch (e) {
    console.error("[taxonomy.list]", e);
    return null;
  }
}

export async function createTaxonomy(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = taxonomyToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TAXONOMIES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[taxonomy.create]", error.message);
      return null;
    }
    return normalizeTaxonomy(data);
  } catch (e) {
    console.error("[taxonomy.create]", e);
    return null;
  }
}

export async function updateTaxonomy(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TAXONOMIES_TABLE)
      .update(taxonomyToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[taxonomy.update]", error.message);
      return null;
    }
    return normalizeTaxonomy(data);
  } catch (e) {
    console.error("[taxonomy.update]", e);
    return null;
  }
}

export async function softDeleteTaxonomy(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TAXONOMIES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[taxonomy.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[taxonomy.delete]", e);
    return false;
  }
}

export async function listTermsByTaxonomy(taxonomyId) {
  if (!taxonomyId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TERMS_TABLE)
      .select("*")
      .eq("taxonomy_id", taxonomyId)
      .is("deleted_at", null)
      .order("label", { ascending: true });
    if (error) {
      console.error("[taxonomy.terms.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeTerm);
  } catch (e) {
    console.error("[taxonomy.terms.list]", e);
    return null;
  }
}

export async function createTerm(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = termToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(TERMS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[taxonomy.terms.create]", error.message);
      return null;
    }
    return normalizeTerm(data);
  } catch (e) {
    console.error("[taxonomy.terms.create]", e);
    return null;
  }
}

export async function updateTerm(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(TERMS_TABLE)
      .update(termToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[taxonomy.terms.update]", error.message);
      return null;
    }
    return normalizeTerm(data);
  } catch (e) {
    console.error("[taxonomy.terms.update]", e);
    return null;
  }
}

export async function softDeleteTerm(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(TERMS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[taxonomy.terms.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[taxonomy.terms.delete]", e);
    return false;
  }
}

// entry_terms — assign / remove / lookups.

export async function listEntryTerms(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(ENTRY_TERMS_TABLE)
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null);
    if (error) {
      console.error("[taxonomy.entryTerms.list]", error.message);
      return null;
    }
    return data || [];
  } catch (e) {
    console.error("[taxonomy.entryTerms.list]", e);
    return null;
  }
}

export async function assignTerm(entryId, termId) {
  if (!entryId || !termId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(ENTRY_TERMS_TABLE)
      .insert({ entry_id: entryId, term_id: termId })
      .select("*")
      .single();
    if (error) {
      console.error("[taxonomy.assign]", error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[taxonomy.assign]", e);
    return null;
  }
}

export async function removeTerm(entryId, termId) {
  if (!entryId || !termId || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(ENTRY_TERMS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("entry_id", entryId)
      .eq("term_id", termId);
    if (error) {
      console.error("[taxonomy.remove]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[taxonomy.remove]", e);
    return false;
  }
}
