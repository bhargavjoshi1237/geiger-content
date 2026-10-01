// Lookups for the Recommendations area. Config only — never row data.

// Why the blended feed showed an item (lib/feed/engine.mjs slot types).
export const FEED_SLOT_MAP = {
  core: { label: "Interest", variant: "success", description: "From a topic the reader engages with" },
  probe: { label: "Probe", variant: "warning", description: "One step deeper, placed quietly" },
  adjacent: { label: "Bridge", variant: "info", description: "Neighbouring topic, kept shallow" },
  explore: { label: "Explore", variant: "purple", description: "A topic the engine is unsure about" },
  fresh: { label: "Fresh", variant: "neutral", description: "Newest content anywhere" },
};

export const FEED_SLOTS = Object.keys(FEED_SLOT_MAP);

export const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
