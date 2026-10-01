"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import {
  decideOverVariants,
  normalizeVariant,
  rulesMatch,
  hashChoice,
} from "@/lib/decide-core";

// Decision engine (pure, explainable). `decide(slotKey, { profile, context })`
// resolves a slot key to the winning variant plus a human-readable `reason`
// string — the explainability requirement from the Phase 6 plan.
// Rule matcher: each variant's `rules` is a flat object (or { all: [...] })
// of { field, op, value } clauses over segment/locale/device; every clause
// must match (AND). Winners are picked by priority first, then weight
// (deterministic hash on profile id so one profile sticks to one variant).
//
// The pure decision math lives in `@/lib/decide-core` (server-safe, no
// "use client") so the edge endpoint can share it; this module re-exports it
// alongside the browser `decide()` fetcher.
export { decideOverVariants, normalizeVariant, rulesMatch, hashChoice };

// Full decision: fetch the slot by key, then its variants, then decide.
// Tri-state friendly: returns { entryId: null, variantId: null, reason }
// (with an explanatory reason) when the DB is absent or nothing matches.
export async function decide(slotKey, { profile = {}, context = {}, projectId = null } = {}) {
  if (!slotKey) return { entryId: null, variantId: null, reason: "No slot key was provided, so no decision could be made." };
  if (!isSupabaseConfigured()) {
    return { entryId: null, variantId: null, reason: "The database is not configured, so no decision could be made." };
  }
  try {
    const sb = contentClient();
    if (!sb) {
      return { entryId: null, variantId: null, reason: "The database is not configured, so no decision could be made." };
    }
    let slotQuery = sb.from("slots").select("id, key").is("deleted_at", null).eq("key", slotKey);
    if (projectId) slotQuery = slotQuery.eq("project_id", projectId);
    const { data: slot, error: slotError } = await slotQuery.maybeSingle();
    if (slotError) {
      console.error("[decide.slot]", slotError.message);
      return { entryId: null, variantId: null, reason: `Could not load slot "${slotKey}" (${slotError.message}).` };
    }
    if (!slot) {
      return { entryId: null, variantId: null, reason: `No slot with key "${slotKey}" exists, so no decision could be made.` };
    }
    const { data, error } = await sb
      .from("variants")
      .select("*")
      .eq("slot_id", slot.id)
      .is("deleted_at", null)
      .order("priority", { ascending: false });
    if (error) {
      console.error("[decide.variants]", error.message);
      return { entryId: null, variantId: null, reason: `Could not load variants for slot "${slotKey}" (${error.message}).` };
    }
    const { normalizeVariant } = await import("./variants");
    const variants = (data || []).map(normalizeVariant);
    return decideOverVariants(variants, { profile, context });
  } catch (e) {
    console.error("[decide]", e);
    return { entryId: null, variantId: null, reason: "An unexpected error interrupted the decision." };
  }
}
