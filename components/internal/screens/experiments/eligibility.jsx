"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { listExperiments } from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { ExperimentCell } from "./parts";

// Eligibility Rules: who may enter an experiment. Rules live in each
// experiment's metadata bag under `eligibility` (free-form clauses, same
// key/op/value shape as variant rules). Editing ships with the workflow
// engine — this screen documents the contract and shows who's eligible.
export function EligibilityScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listExperiments(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const filtered = useMemo(
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const stats = useMemo(() => [
    { label: "Experiments", value: String(rows.length), footer: "Eligibility coverage" },
    { label: "Restricted", value: String(rows.filter((r) => r.eligibility && Object.keys(r.eligibility).length > 0).length), footer: "With eligibility rules" },
    { label: "Open", value: String(rows.filter((r) => !r.eligibility || Object.keys(r.eligibility).length === 0).length), footer: "Everyone eligible" },
  ], [rows]);

  const describe = (eligibility) => {
    if (!eligibility || Object.keys(eligibility).length === 0) return "Everyone is eligible.";
    if (Array.isArray(eligibility)) return eligibility.map((c) => `${c.field} ${c.op || "equals"} "${c.value}"`).join(" · ");
    return Object.entries(eligibility).map(([k, v]) => `${k} = "${v}"`).join(" · ");
  };

  const columns = [
    {
      key: "exp", header: "Experiment",
      render: (r) => (
        <ExperimentCell name={r.name} meta={r.status} />
      ),
    },
    {
      key: "eligibility", header: "Eligibility",
      render: (r) => <span className="block max-w-[20rem] whitespace-normal break-words text-sm text-text-secondary sm:max-w-lg">{describe(r.eligibility)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Eligibility Rules" description="Who may enter each experiment — same key/op/value clauses as variant targeting." />
      <StatsBar stats={stats} />
      <SectionCard title="Status: read-only for now" description="Eligibility is stored at metadata.eligibility on each experiment and evaluated before assignment. In-line editing ships with the workflow engine — until then every experiment is open to all profiles unless noted.">
        <p className="text-sm text-text-secondary">No fake eligibility counts are shown; the table below reflects stored rules only.</p>
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} experiments</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search experiments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={<EmptyState icon={CheckCheck} title="No experiments yet" description="Create one under All Experiments first." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default EligibilityScreen;
