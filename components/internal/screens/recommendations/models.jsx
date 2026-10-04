"use client";

import React, { useMemo } from "react";
import { BrainCircuit } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { EMPTY_PANEL_CLASS, MODEL_STATUS_MAP } from "./constants";

const MODELS = [
  { name: "Similar content", status: "Live", detail: "Keyword-overlap ranking over title, excerpt and body. Try it under Similar Content." },
  { name: "Content-based ranking", status: "Live", detail: "Similarity blended with editorial boosts and exclusions. Try it under Content-based Ranking." },
  { name: "User affinity", status: "Beta", detail: "Topic-stage scores re-rank candidates per profile. Directional until traffic grows." },
  { name: "Collaborative ranking", status: "Estimate", detail: "Profile-overlap recommendations need denser behavior data — currently a session-based demo." },
  { name: "Context-aware ranking", status: "Live", detail: "Slot decisions resolved per request context via the decision engine." },
  { name: "Trending", status: "Estimate", detail: "Recency proxy until the Phase 5 metrics pipeline lands. Labeled as estimates everywhere." },
  { name: "Embeddings (pgvector)", status: "Planned", detail: "Vectors stored as jsonb arrays today; cosine similarity runs in JS. pgvector upgrade is a deliberate later migration." },
];

// Recommendation Models: catalog of ranking strategies with honest maturity labels (Live/Beta/Estimate/Planned), never fake metrics.
export function ModelsScreen() {
  const stats = useMemo(
    () => Object.keys(MODEL_STATUS_MAP).map((status) => ({
      label: status,
      value: String(MODELS.filter((m) => m.status === status).length),
      footer: `of ${MODELS.length} strategies`,
    })),
    [],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Recommendation Models"
        description="Every ranking strategy in one catalog — what it does, and how mature it really is."
      />
      <StatsBar stats={stats} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODELS.map((m) => (
          <SectionCard key={m.name} title={m.name} action={<StatusPill status={m.status} map={MODEL_STATUS_MAP} />}>
            <p className="text-sm text-text-secondary">{m.detail}</p>
          </SectionCard>
        ))}
      </div>
      <EmptyState
        icon={BrainCircuit}
        title="No model training here"
        description="Models are deterministic strategies over your content and rules — there is no training job to monitor yet."
        className={EMPTY_PANEL_CLASS}
      />
    </MainScreenWrapper>
  );
}

export default ModelsScreen;
