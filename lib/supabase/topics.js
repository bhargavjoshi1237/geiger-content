"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";

// Data-access layer for topic journey stages. Owns `content.topic_stages`
// (profile_id nullable, term_id nullable until Phase 3 taxonomies land,
// topic_label text, stage, score, updated_at; unique
// (project_id, profile_id, topic_label)). Pure: validate, console.error on
// failure, return null / [] — never throw, never toast. DB snake_case; UI
// camelCase, mapped at this boundary.

const TABLE = "topic_stages";

export const TOPIC_STAGES = ["unaware", "curious", "engaged", "advocate"];

export function normalizeTopicStage(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    profileId: row.profile_id ?? null,
    termId: row.term_id ?? null,
    topicLabel: row.topic_label ?? "",
    stage: row.stage ?? "unaware",
    score: Number(row.score ?? 0),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function toRow(input) {
  const row = {};
  const map = {
    profileId: "profile_id",
    termId: "term_id",
    topicLabel: "topic_label",
    stage: "stage",
    score: "score",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("termId" in input) row.term_id = input.termId || null;
  return row;
}

export async function listTopicStages(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[topics.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeTopicStage);
  } catch (e) {
    console.error("[topics.list]", e);
    return null;
  }
}

export async function listStagesByProfile(projectId, profileId) {
  if (!projectId || !profileId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .order("score", { ascending: false });
    if (error) {
      console.error("[topics.listByProfile]", error.message);
      return null;
    }
    return (data || []).map(normalizeTopicStage);
  } catch (e) {
    console.error("[topics.listByProfile]", e);
    return null;
  }
}

export async function listByProfile(projectId, profileId) {
  return listStagesByProfile(projectId, profileId);
}

export async function getStage(projectId, profileId, topicLabel) {
  if (!projectId || !profileId || !topicLabel || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from(TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("profile_id", profileId)
      .eq("topic_label", topicLabel)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[topics.get]", error.message);
      return null;
    }
    return normalizeTopicStage(data);
  } catch (e) {
    console.error("[topics.get]", e);
    return null;
  }
}

export async function setStage(projectId, profileId, topicLabel, { stage, score } = {}) {
  if (!projectId || !profileId || !topicLabel || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    if (!sb) return null;
    const existing = await getStage(projectId, profileId, topicLabel);
    const payload = { stage, score };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    if (existing) {
      const { data, error } = await sb
        .from(TABLE)
        .update(toRow(payload))
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) {
        console.error("[topics.set]", error.message);
        return null;
      }
      return normalizeTopicStage(data);
    }
    const { data, error } = await sb
      .from(TABLE)
      .insert(toRow({ projectId, profileId, topicLabel, stage: stage || "unaware", score: score ?? 0 }))
      .select("*")
      .single();
    if (error) {
      console.error("[topics.set]", error.message);
      return null;
    }
    return normalizeTopicStage(data);
  } catch (e) {
    console.error("[topics.set]", e);
    return null;
  }
}
