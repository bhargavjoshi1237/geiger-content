"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Recommendation helpers (pure where possible). `similarContent` ranks by
// keyword overlap over title/excerpt/body; `affinityRanking` re-ranks by
// per-entry event counts supplied by the caller; `rank()` applies editorial
// `content.ranking_rules` (boost multipliers, exclude removals). Embeddings
// live in `content.entry_embeddings` as jsonb arrays — cosine similarity in
// JS (see migration header for the pgvector upgrade note). Pure functions
// never throw; DB readers follow the tri-state contract.

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    const x = Number(a[i]) || 0;
    const y = Number(b[i]) || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Keyword-overlap similarity of every entry to the reference entry.
// Pure — returns [{ entry, score }] sorted desc, never throws.
export function similarContent(entries, referenceId, { limit = 5 } = {}) {
  try {
    const ref = (entries || []).find((e) => e.id === referenceId);
    if (!ref) return [];
    const refTokens = new Set(tokenize(`${ref.title} ${ref.excerpt} ${ref.body}`));
    if (refTokens.size === 0) return [];
    return (entries || [])
      .filter((e) => e.id !== referenceId)
      .map((entry) => {
        const tokens = tokenize(`${entry.title} ${entry.excerpt} ${entry.body}`);
        let overlap = 0;
        for (const t of new Set(tokens)) if (refTokens.has(t)) overlap += 1;
        const score = overlap / Math.sqrt(refTokens.size * Math.max(new Set(tokens).size, 1));
        return { entry, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.error("[recommend.similar]", e);
    return [];
  }
}

// Re-rank entries by caller-supplied per-entry affinity counts
// ({ entryId: count }) blended with recency. Pure, never throws.
export function affinityRanking(entries, affinityCounts = {}, { limit = 10 } = {}) {
  try {
    return [...(entries || [])]
      .map((entry) => ({
        entry,
        score: Number(affinityCounts[entry.id] ?? 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    console.error("[recommend.affinity]", e);
    return [];
  }
}

// Apply editorial ranking rules: excludes drop entries, boosts multiply the
// base score by weight. Pure, never throws.
export function rank(scored, rules = []) {
  try {
    const active = (rules || []).filter((r) => (r.status || "Active") === "Active");
    const excluded = new Set(
      active.filter((r) => r.ruleType === "exclude").map((r) => r.entryId),
    );
    const boosts = new Map();
    for (const r of active) {
      if (r.ruleType === "boost" && r.entryId) boosts.set(r.entryId, Number(r.weight ?? 1));
    }
    return (scored || [])
      .filter((s) => !excluded.has(s.entry?.id))
      .map((s) => ({
        ...s,
        score: Number(s.score ?? 0) * (boosts.get(s.entry?.id) ?? 1),
        boosted: boosts.has(s.entry?.id),
      }))
      .sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error("[recommend.rank]", e);
    return scored || [];
  }
}

export async function getEmbedding(entryId) {
  if (!entryId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("entry_embeddings")
      .select("*")
      .eq("entry_id", entryId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[recommend.embedding.get]", error.message);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id,
      entryId: data.entry_id,
      embedding: Array.isArray(data.embedding) ? data.embedding : [],
      model: data.model ?? "unassigned",
      updatedAt: data.updated_at ?? null,
    };
  } catch (e) {
    console.error("[recommend.embedding.get]", e);
    return null;
  }
}

export async function saveEmbedding(entryId, embedding, { model = "unassigned", projectId = null } = {}) {
  if (!entryId || !Array.isArray(embedding) || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const existing = await getEmbedding(entryId);
    if (existing) {
      const { data, error } = await sb
        .from("entry_embeddings")
        .update({ embedding, model })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
        console.error("[recommend.embedding.save]", error.message);
        return null;
      }
      return data?.id || null;
    }
    const { data, error } = await sb
      .from("entry_embeddings")
      .insert({ project_id: projectId, entry_id: entryId, embedding, model })
      .select("*")
      .single();
    if (error) {
      console.error("[recommend.embedding.save]", error.message);
      return null;
    }
    return data?.id || null;
  } catch (e) {
    console.error("[recommend.embedding.save]", e);
    return null;
  }
}
