"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, Play, Rss } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatGrid,
} from "@geiger/ui/screen-kit";
import {
  CartesianGrid,
  GRID_STROKE,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "@/components/internal/screens/intelligence/charts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@geiger/ui/chart";
import { useProject } from "@/context/project-context";
import { FEED_SLOT_MAP, FEED_SLOTS, formatPercent } from "./constants";

const depthChartConfig = {
  focusDepth: { label: "Known depth", color: "var(--chart-1)" },
  engaged: { label: "Engaged / batch", color: "var(--chart-2)" },
};

// Loads the topic tree, engine and simulator on demand so their ~300 KB stays out of the shell bundle.
function loadFeedModules() {
  return Promise.all([
    import("@/lib/feed/taxonomy/index.mjs"),
    import("@/lib/feed/engine.mjs"),
    import("@/lib/feed/simulator.mjs"),
  ]).then(([taxonomy, engine, simulator]) => {
    const topics = taxonomy.loadTaxonomy();
    const index = engine.indexCatalog(simulator.syntheticCatalog(topics, { perHorizontal: 6 }), {
      topicLinks: engine.buildTopicLinks(topics),
    });
    const names = {};
    for (const t of topics) {
      names[t.id] = t.name;
      for (const s of t.subtopics) names[`${t.id}/${s.id}`] = `${t.name} › ${s.name}`;
    }
    return { index, names, personas: simulator.PERSONAS, runSimulation: simulator.runSimulation };
  });
}

function simulate(lab, personaId, batches, seed) {
  const persona = lab.personas.find((p) => p.id === personaId) || lab.personas[0];
  const count = Math.min(150, Math.max(5, Number(batches) || 60));
  return lab.runSimulation({ persona, index: lab.index, batches: count, seed: Number(seed) || 1 });
}

// Feed Lab: runs simulated readers through the blended feed to show how it discovers
// interests, walks them deeper with quiet probes, and stays varied while doing it.
export function FeedLabScreen() {
  const [lab, setLab] = useState(null);
  const [running, setRunning] = useState(false);
  const [personaId, setPersonaId] = useState("aio-to-custom-loops");
  const [batches, setBatches] = useState(60);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState(null);
  const { projectId } = useProject();

  const run = useCallback((persona = personaId) => {
    if (!lab) return;
    setRunning(true);
    // Yield a frame so the button spinner paints before the simulation runs.
    setTimeout(() => {
      setResult(simulate(lab, persona, batches, seed));
      setRunning(false);
    }, 16);
  }, [batches, lab, personaId, seed]);

  useEffect(() => {
    let alive = true;
    // First run uses the defaults; later runs come from the controls.
    loadFeedModules().then((modules) => {
      if (!alive) return;
      setLab(modules);
      setResult(simulate(modules, "aio-to-custom-loops", 60, 42));
    });
    return () => { alive = false; };
  }, []);

  const names = lab?.names || {};
  const metrics = result?.metrics;
  const persona = lab?.personas.find((p) => p.id === personaId);

  const stats = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Engagement", value: formatPercent(metrics.engagementLate), footer: `from ${formatPercent(metrics.engagementEarly)} at the start` },
      { label: "Interest share", value: formatPercent(metrics.interestShareLate), footer: `from ${formatPercent(metrics.interestShareEarly)} — reader's topics` },
      { label: "Circling index", value: metrics.circlingIndex.toFixed(2), footer: "Top-3 topic share of last 50 · lower is fresher" },
      { label: "Topics per batch", value: metrics.distinctTopicsPerBatch.toFixed(1), footer: `Max run ${metrics.maxSameTopicRun} · ${metrics.sameHorizontalBackToBack + metrics.crowdedWindows} spacing breaks` },
      { label: "Focus depth", value: metrics.focusDepthReached ? `${metrics.focusDepthReached} / 4` : "—", footer: `${metrics.probes.accepted}/${metrics.probes.shown} probes accepted` },
    ];
  }, [metrics]);

  const slotMix = useMemo(() => {
    const recent = (result?.timeline || []).slice(-20).flatMap((t) => t.slots);
    return FEED_SLOTS.map((slot) => ({ slot, share: recent.length ? recent.filter((s) => s === slot).length / recent.length : 0 }));
  }, [result]);

  const profileColumns = [
    {
      key: "subtopic",
      header: "Subtopic",
      render: (s) => <span className="block max-w-[16rem] truncate font-medium text-foreground sm:max-w-sm" title={names[s.id] || s.id}>{names[s.id] || s.id}</span>,
    },
    { key: "interest", header: "Engagement", align: "right", render: (s) => formatPercent(s.interest) },
    { key: "lift", header: "Lift", align: "right", render: (s) => `${s.lift.toFixed(2)}×` },
    { key: "depth", header: "Known depth", align: "right", render: (s) => `${s.knowledgeDepth} / 4` },
  ];

  if (!lab) {
    return (
      <MainScreenWrapper>
        <ScreenHeader title="Feed Lab" description="Simulate how the blended feed discovers a reader's interests and leads them deeper." />
        <div className="flex justify-center py-16" role="status">
          <LogoLoading size={56} aria-label="Loading feed lab" />
        </div>
      </MainScreenWrapper>
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Feed Lab"
        description="Simulate how the blended feed discovers a reader's interests, leads them deeper, and stays fresh."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {projectId && (
              <Button asChild variant="ghost">
                <Link href={`/project/feed/${projectId}`}><Rss className="h-4 w-4" /> Open live feed</Link>
              </Button>
            )}
            <Button onClick={() => run()} disabled={running} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run simulation
            </Button>
          </div>
        }
      />
      {stats.length > 0 && <StatGrid stats={stats} columns={5} />}
      <SectionCard title="Simulation" description="Synthetic readers with hidden tastes scroll ten-item batches; the engine only sees their likes, saves, dwells and skips.">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Reader" hint={persona?.label} className="min-w-0 w-full sm:w-64">
            <Select value={personaId} onValueChange={(value) => { setPersonaId(value); run(value); }}>
              <SelectTrigger aria-label="Reader"><SelectValue/></SelectTrigger>
              <SelectContent>
                {lab.personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Batches" htmlFor="feed-lab-batches" hint="10 items each." className="min-w-0 w-full sm:w-28">
            <Input id="feed-lab-batches" type="number" min="5" max="150" value={batches} onChange={(e) => setBatches(e.target.value)} />
          </Field>
          <Field label="Seed" htmlFor="feed-lab-seed" hint="Same seed, feed." className="min-w-0 w-full sm:w-28">
            <Input id="feed-lab-seed" type="number" min="1" value={seed} onChange={(e) => setSeed(e.target.value)} />
          </Field>
        </div>
      </SectionCard>
      {result ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Depth funnel" description={persona?.focus ? `How deep the engine has led the reader in ${names[persona.focus] || persona.focus}.` : "This reader has no focus subtopic."} className="lg:col-span-2">
              <ChartContainer config={depthChartConfig} className="h-[260px] w-full">
                <LineChart data={result.timeline} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="batch" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent/>} />
                  <Line type="stepAfter" dataKey="focusDepth" stroke="var(--color-focusDepth)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="engaged" stroke="var(--color-engaged)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </SectionCard>
            <SectionCard title="Slot mix" description="Why items were shown in the last 20 batches.">
              <div className="flex flex-col gap-3">
                {slotMix.map(({ slot, share }) => (
                  <div key={slot} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Badge variant={FEED_SLOT_MAP[slot].variant} className="w-fit">{FEED_SLOT_MAP[slot].label}</Badge>
                      <span className="text-xs text-text-tertiary">{FEED_SLOT_MAP[slot].description}</span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-foreground">{formatPercent(share)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Feed timeline" description="Every impression in order, colored by why it was shown. Depth is the step within its subtopic.">
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
              {result.timeline.map((t) => (
                <div key={t.batch} className="flex items-start gap-3">
                  <span className="w-8 shrink-0 pt-0.5 text-xs tabular-nums text-text-tertiary sm:w-14">#{t.batch + 1}</span>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {t.topics.map((topic, i) => (
                      <Badge key={i} className="max-w-full" variant={FEED_SLOT_MAP[t.slots[i]]?.variant || "neutral"} title={`${names[topic] || topic} · ${FEED_SLOT_MAP[t.slots[i]]?.label || ""}`}>
                        <span className="truncate">{names[topic] || topic}</span>
                        <span className="shrink-0 opacity-60">·{t.depths[i]}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard bare title="Learned profile" description="What the engine inferred, relative to the reader's overall engagement.">
            <DataTable
              columns={profileColumns}
              data={metrics.profile.subtopics}
              getRowKey={(s) => s.id}
              empty={<EmptyState icon={FlaskConical} title="No clear interests yet" description="This reader hasn't engaged enough for the engine to single out a subtopic." />}
            />
          </SectionCard>
        </>
      ) : (
        <div className="flex justify-center py-16" role="status">
          <LogoLoading size={48} aria-label="Running simulation" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default FeedLabScreen;
