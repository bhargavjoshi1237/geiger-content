"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Flag, Pause, Play, Plus, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { ActionMenu } from "@geiger/ui/action-menu";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  createRankingRule,
  listRankingRules,
  softDeleteRankingRule,
  updateRankingRule,
} from "@/lib/supabase/variants";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { ACTIVE_STATUS_MAP, EmptyPanel } from "./personalization_kit";

// Boosts & Exclusions: boosts multiply an entry's recommendation score by weight; excludes drop it from ranking.
export function BoostsScreen() {
  const [rows, setRows] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [ruleType, setRuleType] = useState("boost");
  const [weight, setWeight] = useState(1.5);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listRankingRules(projectId), listContent(projectId)]).then(([rules, entryRows]) => {
      if (!alive) return;
      setRows(rules ?? []);
      setEntries(entryRows ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const entryTitle = (id) => entries.find((e) => e.id === id)?.title || "—";

  const filtered = useMemo(
    () => rows.filter((r) => !search || `${entryTitle(r.entryId)} ${r.ruleType}`.toLowerCase().includes(search.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, search, entries],
  );

  const stats = useMemo(() => [
    { label: "Boosts", value: String(rows.filter((r) => r.ruleType === "boost" && r.status === "Active").length), footer: "Active multipliers" },
    { label: "Exclusions", value: String(rows.filter((r) => r.ruleType === "exclude" && r.status === "Active").length), footer: "Removed from ranking" },
    { label: "Entries affected", value: String(new Set(rows.filter((r) => r.status === "Active").map((r) => r.entryId)).size), footer: "Distinct entries" },
  ], [rows]);

  const handleCreate = async () => {
    if (!entryId) {
      toast.error("Pick an entry first.");
      return;
    }
    const optimistic = {
      id: crypto.randomUUID(), entryId, ruleType, projectId,
      weight: Number(weight) || 1, reason: "", status: "Active",
    };
    setRows((prev) => [optimistic, ...prev]);
    setCreateOpen(false);
    const saved = await createRankingRule(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the rule.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Ranking rule created.");
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteRankingRule(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the rule.");
    } else {
      toast.success("Rule deleted.");
    }
  };

  const toggleStatus = async (row) => {
    const next = row.status === "Active" ? "Paused" : "Active";
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const saved = await updateRankingRule(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the rule.");
    }
  };

  const columns = [
    {
      key: "entry", header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
          <span className="truncate font-medium text-foreground">{entryTitle(r.entryId)}</span>
          <span className="text-xs text-text-secondary tabular-nums">{r.ruleType === "boost" ? `boost × ${r.weight}` : "excluded"}</span>
        </div>
      ),
    },
    {
      key: "type", header: "Rule",
      render: (r) => (
        <Badge variant={r.ruleType === "exclude" ? "danger" : "info"} className="capitalize">{r.ruleType}</Badge>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.status} map={ACTIVE_STATUS_MAP} />,
    },
    {
      key: "actions", header: "", align: "right", className: "text-right",
      render: (r) => (
        <ActionMenu
          label="Rule actions"
          items={[
            { icon: r.status === "Active" ? Pause : Play, label: r.status === "Active" ? "Pause" : "Activate", onSelect: () => toggleStatus(r) },
            { separator: true },
            { icon: Trash2, label: "Delete", variant: "destructive", onSelect: () => handleDelete(r) },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Boosts & Exclusions"
        description="Editorial overrides on ranking — boost what matters, exclude what must never surface."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create rule
          </Button>
        }
      />
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} rules</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search entries…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <EmptyPanel
              icon={Flag}
              title={rows.length ? "No rules match your search" : "No ranking rules yet"}
              description={rows.length ? "Try clearing the search." : "Boost priority content or exclude entries from recommendations."}
              action={rows.length ? (
                <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button>
              ) : (
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create rule
                </Button>
              )}
            />
          }
        />
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create ranking rule</DialogTitle>
            <DialogDescription>Boosts multiply the score; excludes remove the entry from ranking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Entry">
              <Select value={entryId} onValueChange={setEntryId}>
                <SelectTrigger><SelectValue placeholder="Select an entry" /></SelectTrigger>
                <SelectContent>
                  {(entries || []).map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Rule type">
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boost">Boost</SelectItem>
                    <SelectItem value="exclude">Exclude</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Weight" hint="Boost multiplier">
                <Input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={ruleType === "exclude"} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate}>Create rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default BoostsScreen;
