"use client";

import React from "react";
import { BrainCircuit } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
} from "@/components/internal/shared/screen_kit";

const MODELS = [
  { name: "Similar content", status: "Live", detail: "Keyword-overlap ranking over title, excerpt and body. Try it under Similar Content." },
  { name: "Content-based ranking", status: "Live", detail: "Similarity blended with editorial boosts and exclusions. Try it under Content-based Ranking." },
  { name: "User affinity", status: "Beta", detail: "Topic-stage scores re-rank candidates per profile. Directional until traffic grows." },
  { name: "Collaborative ranking", status: "Estimate", detail: "Profile-overlap recommendations need denser behavior data — currently a session-based demo." },
  { name: "Context-aware ranking", status: "Live", detail: "Slot decisions resolved per request context via the decision engine." },
  { name: "Trending", status: "Estimate", detail: "Recency proxy until the Phase 5 metrics pipeline lands. Labeled as estimates everywhere." },
  { name: "Embeddings (pgvector)", status: "Planned", detail: "Vectors stored as jsonb arrays today; cosine similarity runs in JS. pgvector upgrade is a deliberate later migration." },
];

// Recommendation Models: catalog of the ranking strategies available, with
// honest maturity labels. No fake metrics — status is Live, Beta, Estimate
// or Planned, never a number.
export function ModelsScreen() {
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Recommendation Models"
        description="Every ranking strategy in one catalog — what it does, and how mature it really is."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {MODELS.map((m) => (
          <SectionCard key={m.name} title={m.name} description={m.status}>
            <p className="text-sm text-text-secondary">{m.detail}</p>
          </SectionCard>
        ))}
      </div>
      <EmptyState
        icon={BrainCircuit}
        title="No model training here"
        description="Models are deterministic strategies over your content and rules — there is no training job to monitor yet."
      />
    </MainScreenWrapper>
  );
}

export default ModelsScreen;
