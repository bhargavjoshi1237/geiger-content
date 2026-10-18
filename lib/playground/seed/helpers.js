// Shared helpers for the playground seed. Seed rows are raw DB rows (snake_case),
// exactly what Supabase would return, so every normalize*() in lib/supabase/*
// runs over them unchanged. Keep seed files free of "use client" and of React
// imports so the integrity test can load them in plain Node.

import { PLAYGROUND_PROJECT } from "../mode.js";

export const PROJECT_ID = PLAYGROUND_PROJECT.id;

// Stable, valid UUIDs per entity kind so cross-table references line up.
// EDIT PER APP: an 8-hex-digit app prefix and the kinds the seed uses.
// sid("grant", 3) -> "c0e70001-0000-4000-8000-000000000003".
const APP_PREFIX = 0xc0e70000;
const KIND_CODES = {
  // kind: code (1..4095), unique within the app
  grant: 1,
  trace: 2,
  invalidation: 3,
  assistant: 4,
  knowledge: 5,
};

export function sid(kind, n) {
  const code = KIND_CODES[kind];
  if (!code) throw new Error(`Unknown seed kind: ${kind}`);
  const prefix = (APP_PREFIX + code).toString(16).padStart(8, "0");
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Everything is relative to page load so the demo never looks stale.
export function daysAgo(days, hours = 0) {
  return new Date(Date.now() - days * DAY - hours * HOUR).toISOString();
}

export function hoursAgo(hours) {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

export function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function daysFromNow(days, hours = 0) {
  return new Date(Date.now() + days * DAY + hours * HOUR).toISOString();
}

export function dateOnly(iso) {
  return iso.slice(0, 10);
}

// Deterministic 0..1 pseudo-random from a number, so seeded data looks organic
// but is identical on every load.
export function noise(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Deterministic integer in [min, max].
export function between(n, min, max) {
  return Math.round(min + noise(n) * (max - min));
}

// Deterministic element of an array.
export function pick(arr, n) {
  return arr[Math.floor(noise(n) * arr.length) % arr.length];
}

// Deterministic weighted choice: weighted(7, [["paid", 8], ["refunded", 1]]).
export function weighted(n, pairs) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = noise(n) * total;
  for (const [value, w] of pairs) {
    roll -= w;
    if (roll < 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

// range(3, (i) => i * 2) -> [2, 4, 6]; i is 1-based so it doubles as sid n.
export function range(count, fn = (i) => i) {
  return Array.from({ length: count }, (_, i) => fn(i + 1));
}

// Base columns most project-owned rows carry. Drop or override what a table
// doesn't have.
export function base(kind, n, { created = 30, updated, ...rest } = {}) {
  return {
    id: sid(kind, n),
    project_id: PROJECT_ID,
    created_at: daysAgo(created),
    updated_at: daysAgo(updated ?? Math.max(0, created - 1)),
    ...rest,
  };
}
