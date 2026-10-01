import { createHash } from "node:crypto";

export const MODEL = "gemini-embedding-2";
export const DIMENSIONS = 768;
export const PREPROCESSING = "retrieval-v2";
export const READABLE_PREPROCESSING = ["retrieval-v1", PREPROCESSING];
export const ACTION_WEIGHTS = {
  page_view: 1,
  view: 1,
  click: 2,
  like: 3,
  save: 5,
  bookmark: 5,
  share: 4,
  conversion: 6,
};
export const NEGATIVE_ACTIONS = new Set([
  "dismiss",
  "not_interested",
  "dislike",
  "unlike",
]);

export function validateVector(value) {
  if (
    !Array.isArray(value) ||
    value.length !== DIMENSIONS ||
    value.some((x) => typeof x !== "number" || !Number.isFinite(x))
  )
    throw new Error("Invalid 768-dimensional embedding.");
  if (!value.some((x) => x !== 0))
    throw new Error("An embedding cannot be a zero vector.");
  return value;
}

export function normalizeVector(value) {
  const norm = Math.sqrt(value.reduce((sum, x) => sum + x * x, 0));
  return norm > 0 ? value.map((x) => x / norm) : null;
}

export function chunkText(text, maxBytes = 6000, overlapBytes = 300) {
  if (!Number.isInteger(maxBytes) || maxBytes < 4)
    throw new Error("Chunk size must be at least four bytes.");
  const units = [], chunks = [];
  const overlap = Math.max(0, Math.min(overlapBytes, Math.floor(maxBytes / 2)));
  const fragmentBytes = Math.max(4, maxBytes - overlap);
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  for (const paragraph of String(text || "").split(/\n\s*\n/)) {
    let first = true;
    for (const { segment } of segmenter.segment(paragraph.trim())) {
      const sentence = segment.trim();
      if (!sentence) continue;
      if (Buffer.byteLength(sentence) <= maxBytes) {
        units.push({ text: sentence, paragraph: first });
        first = false;
        continue;
      }
      let part = "";
      for (const word of sentence.split(/\s+/)) {
        if (Buffer.byteLength(`${part}${part ? " " : ""}${word}`) > fragmentBytes && part) {
          units.push({ text: part, paragraph: first });
          first = false;
          part = "";
        }
        if (Buffer.byteLength(word) > fragmentBytes && Buffer.byteLength(word) <= maxBytes) {
          units.push({ text: word, paragraph: first });
          first = false;
          continue;
        }
        if (part) part += " ";
        for (const char of word) {
          if (Buffer.byteLength(part + char) > fragmentBytes) {
            units.push({ text: part, paragraph: first });
            first = false;
            part = "";
          }
          part += char;
        }
      }
      if (part.trim()) units.push({ text: part.trim(), paragraph: first });
      first = false;
    }
  }
  const join = (items) => items.map((unit, index) => `${index ? unit.paragraph ? "\n\n" : " " : ""}${unit.text}`).join("");
  let current = [];
  for (const unit of units) {
    if (current.length && (Buffer.byteLength(join([...current, unit])) > maxBytes || (unit.paragraph && Buffer.byteLength(join(current)) > maxBytes * 0.65))) {
      chunks.push(join(current));
      const tail = [];
      for (let i = current.length - 1; i >= 0; i--) {
        if (Buffer.byteLength(join([current[i], ...tail])) > overlap) break;
        tail.unshift(current[i]);
      }
      if (!tail.length && overlap) {
        const words = join(current).split(/\s+/), suffix = [];
        for (let i = words.length - 1; i >= 0; i--) {
          if (Buffer.byteLength([words[i], ...suffix].join(" ")) > overlap) break;
          suffix.unshift(words[i]);
        }
        if (suffix.length) tail.push({ text: suffix.join(" "), paragraph: false });
      }
      current = tail;
      while (current.length && Buffer.byteLength(join([...current, unit])) > maxBytes) current.shift();
    }
    current.push(unit);
  }
  if (current.length) chunks.push(join(current));
  return chunks;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export function fingerprint(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function chunkFingerprint(input, model = MODEL, preprocessing = PREPROCESSING) {
  return fingerprint({ model, preprocessing, ...(input.image
    ? { image: createHash("sha256").update(input.image).digest("hex"), mime: input.mime }
    : { title: String(input.title ?? "none").slice(0, 200), text: input.text }) });
}

export function weightedInterest(
  events,
  { now = Date.now(), halfLifeDays = 30 } = {},
) {
  const seen = new Set(),
    sources = new Map(),
    excluded = new Set();
  for (const event of events) {
    if (!event.id || seen.has(event.id) || !event.sourceId) continue;
    seen.add(event.id);
    if (NEGATIVE_ACTIONS.has(event.type)) {
      excluded.add(event.sourceId);
      continue;
    }
    const strength = ACTION_WEIGHTS[event.type];
    if (!strength || !Array.isArray(event.embedding)) continue;
    try {
      validateVector(event.embedding);
    } catch {
      continue;
    }
    const at = Date.parse(event.at);
    if (!Number.isFinite(at) || at > now + 60000) continue;
    const age = Math.max(0, now - at) / 86400000;
    const weight = strength * Math.pow(0.5, age / halfLifeDays);
    const existing = sources.get(event.sourceId);
    if (!existing || existing.weight < weight)
      sources.set(event.sourceId, { weight, embedding: event.embedding });
  }
  const sum = Array(DIMENSIONS).fill(0);
  let signals = 0;
  for (const [id, source] of sources) {
    if (excluded.has(id)) continue;
    source.embedding.forEach((x, i) => {
      sum[i] += source.weight * x;
    });
    signals += 1;
  }
  return {
    embedding: signals ? normalizeVector(sum) : null,
    signals,
    excluded: [...excluded].sort(),
  };
}

export function imageStoragePath(value, projectId, assetId, base) {
  const url = new URL(value),
    origin = new URL(base);
  if (
    url.protocol !== "https:" ||
    url.origin !== origin.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Image must belong to the project storage bucket.");
  const path = decodeURIComponent(url.pathname);
  const prefix = `/storage/v1/object/public/content/assets/${projectId}/${assetId}/`;
  if (!path.startsWith(prefix) || path.includes("..") || path.includes("\\"))
    throw new Error("Image must belong to the project storage bucket.");
  return path.slice("/storage/v1/object/public/content/".length);
}

export function nextPacificReset(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const midnight = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day) + 1,
  );
  let result = midnight + 8 * 3600000;
  for (let i = 0; i < 3; i++) {
    const offsetPart = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      timeZoneName: "shortOffset",
    })
      .formatToParts(result)
      .find((p) => p.type === "timeZoneName").value;
    const offset = Number(offsetPart.replace("GMT", "")) || 0;
    result = midnight - offset * 3600000;
  }
  return new Date(result);
}

export function filterCandidates(rows, rules = [], excluded = []) {
  const blocked = new Set(excluded),
    boosts = new Map();
  for (const rule of rules) {
    if (rule.status !== "Active") continue;
    if (rule.rule_type === "exclude") blocked.add(rule.entry_id);
    if (rule.rule_type === "boost")
      boosts.set(
        rule.entry_id,
        Number.isFinite(Number(rule.weight))
          ? Math.max(0, Number(rule.weight))
          : 1,
      );
  }
  return rows
    .filter(
      (row) => !blocked.has(row.sourceId) && !blocked.has(row.parentEntryId),
    )
    .map((row) => ({
      ...row,
      score:
        row.score *
        (boosts.get(row.sourceId) ?? boosts.get(row.parentEntryId) ?? 1),
      boosted: boosts.has(row.sourceId) || boosts.has(row.parentEntryId),
    }))
    .sort((a, b) => b.score - a.score);
}

export function journeyCandidates(rows, stages = []) {
  const canonical = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll("_", " ");
  const current = new Map(
    stages.map((row) => [row.topic_label, canonical(row.stage)]),
  );
  const experienced = new Set([
    "engaged",
    "advocate",
    "activated",
    "retained",
    "expanding",
    "converted",
  ]);
  return rows
    .filter((row) => {
      const matching = (row.topics || []).map((topic) => ({
        topic,
        stage: current.get(topic) || "no signal",
      }));
      if (matching.some((item) => item.stage === "not interested"))
        return false;
      if (
        row.targetStages?.length &&
        !matching.some((item) =>
          row.targetStages.map(canonical).includes(item.stage),
        )
      )
        return false;
      if (
        row.difficulty === "advanced" &&
        !matching.some((item) => experienced.has(item.stage))
      )
        return false;
      return true;
    })
    .map((row) => ({
      ...row,
      journeyStages: (row.topics || [])
        .filter((topic) => current.has(topic))
        .map((topic) => ({ topic, stage: current.get(topic) })),
    }));
}

export function extractEntryText(entry) {
  let body = entry.body || "";
  try {
    const doc = typeof body === "string" ? JSON.parse(body) : body;
    if (Array.isArray(doc.blocks))
      body = doc.blocks.map((block) => block.text || "").join("\n\n");
  } catch {}
  return (
    [entry.excerpt, body].filter(Boolean).join("\n\n") || entry.title || ""
  );
}
