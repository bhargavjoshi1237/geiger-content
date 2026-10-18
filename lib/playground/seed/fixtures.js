// The Content playground seed: the demonstrator project (supabase/demo/fixtures.json, built by
// `npm run demo:fixtures`) recast as Halcyon Studio. One deterministic pass rebrands it — dates shifted so
// the seed's "today" is the visitor's today, project id -> PLAYGROUND_PROJECT, the seed's team -> the cast,
// Geiger brand strings -> Halcyon, storage covers -> generated SVGs (no request leaves the browser).
// Tables come back keyed as the memory client resolves them: "content.<table>" and bare public tables.
import fixtureFile from "../../../supabase/demo/fixtures.json";
import { PEOPLE, STUDIO, person, personId } from "../cast.js";
import { PLAYGROUND_PROJECT } from "../mode.js";
import { PROJECT_ID, noise, sid } from "./helpers.js";

const DAY = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;
const STORAGE_URL = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^"]*$/;

// The seed's team (scripts/build-playground-fixtures.mjs) and who plays them in Halcyon Studio.
const TEAM = [
  { name: "Maya Patel", email: "maya.patel@example.test", n: 1 },
  { name: "Alex Morgan", email: "alex.morgan@example.test", n: 2 },
  { name: "Priya Shah", email: "priya.shah@example.test", n: 3 },
  { name: "Noah Kim", email: "noah.kim@example.test", n: 5 },
  { name: "Lena Ortiz", email: "lena.ortiz@example.test", n: 12 },
];

// The rest of the cast joins the team with the content role closest to their suite role.
const CONTENT_ROLE = { owner: "owner", admin: "admin", manager: "editor", member: "writer", viewer: "viewer" };

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replacer(pairs) {
  const map = new Map(pairs);
  const pattern = new RegExp([...map.keys()].sort((a, b) => b.length - a.length).map(escape).join("|"), "g");
  return (value) => value.replace(pattern, (match) => map.get(match));
}

// Generated cover art in the studio palette, so seeded media renders without the real storage bucket.
function coverSvg(label, n) {
  const palettes = [
    [STUDIO.brandColor, STUDIO.accentColor],
    [STUDIO.accentColor, "#1F2933"],
    ["#D4A017", STUDIO.brandColor],
    ["#6C5CE7", STUDIO.accentColor],
  ];
  const [from, to] = palettes[n % palettes.length];
  const words = String(label).replace(/\s+—.*$/, "").split(/\s+/);
  const lines = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= 22) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const text = lines
    .slice(0, 3)
    .map((line, i) => `<text x="64" y="${300 + i * 72}" font-family="Georgia,serif" font-size="60" fill="#fff">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="${900 + (n % 5) * 40}" cy="${180 + (n % 3) * 60}" r="220" fill="#fff" fill-opacity="0.08"/><text x="64" y="120" font-family="Helvetica,Arial,sans-serif" font-size="28" letter-spacing="6" fill="#fff" fill-opacity="0.8">HALCYON STUDIO</text>${text}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildTables() {
  const shiftDays = Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(fixtureFile.anchor)) / DAY);
  const creatorId = fixtureFile.tables["content.api_tokens"]?.[0]?.created_by;
  const teamIds = new Map(fixtureFile.tables["content.role_grants"].map((g) => [g.user_id, g.metadata?.name]));

  const ids = replacer([
    [fixtureFile.projectId, PROJECT_ID],
    ...(creatorId ? [[creatorId, personId(1)]] : []),
    ...[...teamIds].map(([id, name]) => [id, personId(TEAM.find((m) => m.name === name)?.n ?? 1)]),
  ]);
  const text = replacer([
    ...TEAM.flatMap((m) => [[m.name, person(m.n).name], [m.email, person(m.n).email]]),
    ["Geiger Content Studio", STUDIO.name],
    ["Geiger demonstration cover", `${STUDIO.name} cover`],
    ["Content Studio", STUDIO.name],
    ["geiger-content-studio", "halcyon-studio"],
    ["geiger-content-demonstrator-v1", "halcyon-content-playground"],
    ["studio@example.test", `hello@${STUDIO.domain}`],
    [".example.test", `.${STUDIO.domain}`],
    ["@example.test", "@example.com"],
    ["Asia/Calcutta", "Europe/Lisbon"],
    ["Demo / ", "Journal / "],
  ]);

  // Covers keyed by the storage path's asset id, labelled with the (rebranded) asset name.
  const coverLabels = new Map(fixtureFile.tables["content.assets"].map((a, i) => [a.id, [text(a.name || ""), i]]));
  const covers = new Map();
  const cover = (url) => {
    if (!covers.has(url)) {
      const assetId = url.split("/").find((part) => coverLabels.has(part));
      const [label, n] = coverLabels.get(assetId) ?? [STUDIO.name, covers.size];
      covers.set(url, coverSvg(label, n));
    }
    return covers.get(url);
  };

  const shift = (value) => {
    const moved = new Date(Date.parse(value) + shiftDays * DAY).toISOString();
    return value.length === 10 ? moved.slice(0, 10) : moved;
  };
  const transform = (value) => {
    if (typeof value === "string") {
      if (STORAGE_URL.test(value)) return cover(value);
      if (shiftDays && ISO_DATE.test(value)) return shift(value);
      // Entry bodies are JSON strings; rebrand them as text.
      return ids(text(value)).replace(/^demo-(?=[a-z])/, "").replace(/^Demo ([A-Za-z])/, (_, c) => c.toUpperCase());
    }
    if (Array.isArray(value)) return value.map(transform);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, transform(v)]));
    return value;
  };

  const tables = {};
  for (const [key, rows] of Object.entries(fixtureFile.tables)) {
    tables[key.startsWith("public.") ? key.slice("public.".length) : key] = transform(rows);
  }

  // The shared project row and the studio's brand settings.
  tables.projects = tables.projects.map((p) => ({ ...p, ...PLAYGROUND_PROJECT, status: "active", deleted_at: null }));

  // Audit history and review threads read as a team: spread them over the people on the project.
  const team = [1, 2, 3, 4, 5, 6, 7, 9, 10];
  tables["content.audit_log"] = tables["content.audit_log"].map((row, i) => ({ ...row, actor: personId(team[Math.floor(noise(i + 11) * team.length)]) }));
  tables["content.comments"] = tables["content.comments"].map((row, i) => ({ ...row, created_by: personId(team[Math.floor(noise(i + 37) * team.length)]) }));

  // The whole cast holds a role; the seed's five grants keep their ids.
  const roleId = Object.fromEntries(tables.roles.map((r) => [r.key, r.id]));
  const granted = new Set(tables["content.role_grants"].map((g) => g.user_id));
  const template = tables["content.role_grants"][0];
  PEOPLE.filter((p) => !granted.has(p.id)).forEach((p) => {
    tables["content.role_grants"].push({
      ...template,
      id: sid("grant", p.n),
      user_id: p.id,
      role_id: roleId[CONTENT_ROLE[p.role]] ?? roleId.writer,
      metadata: { name: p.name, email: p.email },
      created_at: new Date(Date.parse(template.created_at) + p.n * DAY).toISOString(),
    });
  });

  return tables;
}

let built = null;

// Every table of the rebranded fixtures; built once per page session.
export function fixtureTables() {
  built ??= buildTables();
  return built;
}
