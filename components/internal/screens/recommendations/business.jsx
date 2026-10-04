"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { ActionMenu } from "@geiger/ui/action-menu";
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
import { EMPTY_PANEL_CLASS, RULE_STATUS_MAP, RULE_TYPE_MAP } from "./constants";

// Business Rules: the commercial layer on ranking (same ranking_rules table as Boosts & Exclusions), framed for merchandising.
export function BusinessScreen() {
  const [rows, setRows] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [ruleType, setRuleType] = useState("boost");
  const [weight, setWeight] = useState(2);
  const [reason, setReason] = useState("");
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
    () => rows.filter((r) => !search || `${entryTitle(r.entryId)} ${r.reason} ${r.ruleType}`.toLowerCase().includes(search.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, search, entries],
  );

  const stats = useMemo(() => [
    { label: "Business rules", value: String(rows.filter((r) => r.status === "Active").length), footer: "Active commercial overrides" },
    { label: "Sponsor boosts", value: String(rows.filter((r) => r.ruleType === "boost" && r.status === "Active").length), footer: "Paid / margin priority" },
    { label: "Compliance excludes", value: String(rows.filter((r) => r.ruleType === "exclude" && r.status === "Active").length), footer: "Must-not-surface" },
  ], [rows]);

  const handleCreate = async () => {
    if (!entryId) {
      toast.error("Pick an entry first.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Give the business reason first (e.g. sponsor Q4).");
      return;
    }
    const optimistic = {
      id: crypto.randomUUID(), entryId, ruleType, projectId,
      weight: Number(weight) || 1, reason: reason.trim(), status: "Active",
    };
    setRows((prev) => [optimistic, ...prev]);
    setCreateOpen(false);
    setReason("");
    const saved = await createRankingRule(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the rule.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Business rule created.");
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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{entryTitle(r.entryId)}</span>
          <span className="line-clamp-2 text-xs text-text-secondary">{r.reason || "No reason recorded"}</span>
        </div>
      ),
    },
    {
      key: "type", header: "Rule",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <StatusPill status={r.ruleType} map={RULE_TYPE_MAP} />
          {r.ruleType === "boost" ? <span className="text-xs tabular-nums text-text-secondary">× {r.weight}</span> : null}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.status} map={RULE_STATUS_MAP} />,
    },
    {
      key: "actions", header: "", align: "right", className: "text-right",
      render: (r) => (
        <ActionMenu
          label="Rule actions"
          items={[
            { label: r.status === "Active" ? "Pause" : "Activate", onSelect: () => toggleStatus(r) },
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
        title="Business Rules"
        description="Commercial overrides on ranking — sponsors, margin, compliance. Every rule carries its reason."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create rule
          </Button>
        }
      />
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} {filtered.length === 1 ? "rule" : "rules"}</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search entries, reasons…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <EmptyState
              icon={BriefcaseBusiness}
              title={rows.length ? "No rules match your search" : "No business rules yet"}
              description={rows.length ? "Try clearing the search." : "Pin sponsor content or block regulated entries — with the reason attached."}
              action={
                rows.length ? (
                  <Button variant="outline" className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : (
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> Create rule
                  </Button>
                )
              }
              className={EMPTY_PANEL_CLASS}
            />
          }
        />
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create business rule</DialogTitle>
            <DialogDescription>The reason is required — every commercial override must explain itself.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Entry">
              <Select value={entryId} onValueChange={setEntryId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select an entry" /></SelectTrigger>
                <SelectContent>
                  {(entries || []).map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Rule type">
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boost">Boost</SelectItem>
                    <SelectItem value="exclude">Exclude</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Weight">
                <Input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={ruleType === "exclude"} />
              </Field>
            </div>
            <Field label="Business reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sponsor Q4, compliance block" />
            </Field>
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

export default BusinessScreen;
