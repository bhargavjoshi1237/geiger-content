// Lookups for the Recommendations area. Config only — never row data.

// Why the blended feed showed an item (lib/feed/engine.mjs slot types).
export const FEED_SLOT_MAP = {
  similar: { label: "Similar", variant: "outline", description: "Nearest images to the reader's taste vectors" },
  core: { label: "Interest", variant: "success", description: "From a topic the reader engages with" },
  probe: { label: "Probe", variant: "warning", description: "One step deeper, placed quietly" },
  adjacent: { label: "Bridge", variant: "info", description: "Neighbouring topic, kept shallow" },
  explore: { label: "Explore", variant: "purple", description: "A topic the engine is unsure about" },
  fresh: { label: "Fresh", variant: "neutral", description: "Newest content anywhere" },
};

export const FEED_SLOTS = Object.keys(FEED_SLOT_MAP);

export const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

// Ranking rule state (Business Rules).
export const RULE_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-text-tertiary" },
};

// Ranking rule kind (boost / exclude).
export const RULE_TYPE_MAP = {
  boost: { label: "Boost", variant: "info", dot: false },
  exclude: { label: "Exclude", variant: "danger", dot: false },
};

// Honest maturity labels for the model catalog — never a number.
export const MODEL_STATUS_MAP = {
  Live: { label: "Live", variant: "success", dotClass: "bg-emerald-400" },
  Beta: { label: "Beta", variant: "info", dotClass: "bg-sky-400" },
  Estimate: { label: "Estimate", variant: "warning", dotClass: "bg-amber-400" },
  Planned: { label: "Planned", variant: "neutral", dotClass: "bg-text-tertiary" },
};

// Shared look for an empty/filtered-empty state sitting where a table would be.
export const EMPTY_PANEL_CLASS = "rounded-xl border border-border bg-surface-subtle";
