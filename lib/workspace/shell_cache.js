"use client";

import { useLayoutEffect, useRef } from "react";

// Last-known workspace-shell state — currently the signed-in user's RBAC grants
// — kept in memory and mirrored to localStorage.
//
// The shell needs a round trip before it knows what this user may see. Without a
// cache it paints the ungated default first and corrects itself when the
// database replies, so every reload flashes. This lets it paint the answer it
// had last time on the first frame.
//
// It is a PAINT HINT, never a source of truth: every consumer still revalidates
// through its data layer on mount and overwrites what it finds here.

const PREFIX = "geiger-content:shell";

const memory = new Map();

function storageKey(name, projectId) {
  return `${PREFIX}:${name}:${projectId}`;
}

function readShellCache(name, projectId) {
  if (!name || !projectId) return null;
  const key = storageKey(name, projectId);
  if (memory.has(key)) return memory.get(key);
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== "object" || !("value" in entry)) return null;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export function writeShellCache(name, projectId, userId, value) {
  if (!name || !projectId) return;
  const key = storageKey(name, projectId);
  const entry = { userId: userId ?? null, value };
  memory.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Private mode or quota — the in-memory copy still serves this session.
  }
}

export function usePaintFromShellCache(name, projectId, apply) {
  const seededFor = useRef(null);

  useLayoutEffect(() => {
    const key = `${name}:${projectId}`;
    if (!projectId || seededFor.current === key) return;
    seededFor.current = key;
    const entry = readShellCache(name, projectId);
    if (entry) apply(entry);
  }, [name, projectId, apply]);
}
