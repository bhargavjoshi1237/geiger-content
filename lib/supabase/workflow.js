"use client";

import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { normalizeContent } from "./content";

// Data-access layer for editorial workflow. Owns `content.workflow_states`
// (key, label, position, is_terminal) + `content.assignments`
// (entry_id FK, assignee, due_at, status, priority). Also answers the review
// queue: entries whose status is "In review".
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast. DB snake_case; UI camelCase, mapped at this boundary.

const STATES_TABLE = "workflow_states";
const ASSIGNMENTS_TABLE = "assignments";
const ENTRIES_TABLE = "entries";

export function normalizeWorkflowState(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    key: row.key ?? "",
    label: row.label ?? "",
    position: Number(row.position ?? 0),
    isTerminal: Boolean(row.is_terminal),
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function stateToRow(input) {
  const row = {};
  const map = {
    key: "key",
    label: "label",
    position: "position",
    isTerminal: "is_terminal",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  return row;
}

export function normalizeAssignment(row) {
  if (!row) return null;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    entryId: row.entry_id ?? null,
    assignee: row.assignee ?? "",
    dueAt: row.due_at ?? null,
    status: row.status ?? "Open",
    priority: row.priority ?? "Normal",
    projectId: row.project_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? row.created_at ?? null,
    ...meta,
  };
}

function assignmentToRow(input) {
  const row = {};
  const map = {
    entryId: "entry_id",
    assignee: "assignee",
    status: "status",
    priority: "priority",
    projectId: "project_id",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("dueAt" in input) row.due_at = input.dueAt || null;
  return row;
}

export async function listWorkflowStates(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(STATES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) {
      console.error("[workflow.states.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeWorkflowState);
  } catch (e) {
    console.error("[workflow.states.list]", e);
    return null;
  }
}

export async function createWorkflowState(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = stateToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(STATES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[workflow.states.create]", error.message);
      return null;
    }
    return normalizeWorkflowState(data);
  } catch (e) {
    console.error("[workflow.states.create]", e);
    return null;
  }
}

export async function updateWorkflowState(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(STATES_TABLE)
      .update(stateToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[workflow.states.update]", error.message);
      return null;
    }
    return normalizeWorkflowState(data);
  } catch (e) {
    console.error("[workflow.states.update]", e);
    return null;
  }
}

export async function softDeleteWorkflowState(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(STATES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[workflow.states.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[workflow.states.delete]", e);
    return false;
  }
}

export async function listAssignments(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(ASSIGNMENTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[workflow.assignments.list]", error.message);
      return null;
    }
    return (data || []).map(normalizeAssignment);
  } catch (e) {
    console.error("[workflow.assignments.list]", e);
    return null;
  }
}

export async function createAssignment(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const payload = assignmentToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await sb
      .from(ASSIGNMENTS_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[workflow.assignments.create]", error.message);
      return null;
    }
    return normalizeAssignment(data);
  } catch (e) {
    console.error("[workflow.assignments.create]", e);
    return null;
  }
}

export async function updateAssignment(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(ASSIGNMENTS_TABLE)
      .update(assignmentToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[workflow.assignments.update]", error.message);
      return null;
    }
    return normalizeAssignment(data);
  } catch (e) {
    console.error("[workflow.assignments.update]", e);
    return null;
  }
}

export async function softDeleteAssignment(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const sb = contentClient();
    const { error } = await sb
      .from(ASSIGNMENTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[workflow.assignments.delete]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[workflow.assignments.delete]", e);
    return false;
  }
}

// Review queue: live entries awaiting approval.
export async function listReviewQueue(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from(ENTRIES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "In review")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[workflow.reviewQueue]", error.message);
      return null;
    }
    return (data || []).map(normalizeContent);
  } catch (e) {
    console.error("[workflow.reviewQueue]", e);
    return null;
  }
}
