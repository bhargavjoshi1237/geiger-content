"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Info, Loader2, RefreshCcw } from "lucide-react";
import { SectionCard, Field, StatsBar, StatusPill } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useRbac } from "@/context/rbac-context";
import { getInvalidations, requestOperation } from "@/lib/supabase/delivery_ops";
import { OperationScreen, OperationSelect, OperationTable, useOperationData, displayTime } from "../operations_ui";
import { INVALIDATION_STATUS_MAP, formatDate } from "./constants";

export function CacheInvalidationScreen() {
  const { projectId } = useProject();
  const { can } = useRbac();
  const state = useOperationData(projectId, getInvalidations);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const entryId = selection?.projectId === projectId ? selection.id : "";
  const entries = state.data?.entries || [];
  const history = state.data?.history || [];
  async function invalidate() {
    setBusy(true);
    const result = await requestOperation("cache-invalidation", projectId, { entryId });
    setBusy(false);
    if (result.ok) { toast.success("Delivery cache invalidation requested"); await state.reload(); } else toast.error(result.error);
  }
  const stats = [
    { label: "Published entries", value: String(entries.length), footer: "Eligible for invalidation" },
    { label: "Requests", value: String(history.length), footer: "In the audit history" },
    { label: "Last request", value: history[0] ? formatDate(history[0].at) || "—" : "—", footer: history[0] ? displayTime(history[0].at) : "Nothing requested yet" },
  ];
  const columns = [
    { key: "path", header: "Path", render: (row) => <span className="font-mono text-xs text-foreground">{row.path}</span> },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} map={INVALIDATION_STATUS_MAP} /> },
    { key: "at", header: "Requested", align: "right", render: (row) => <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.at)}</span> },
  ];
  return <OperationScreen title="Cache Invalidation" description="Invalidate delivery data and request entry renderer revalidation with an audit history." projectId={projectId} {...state}>
    <StatsBar stats={stats} columns={3} />
    <SectionCard title="Invalidate an entry" description="Expires the entry and project delivery data caches so the next read fetches fresh content.">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="Published entry" htmlFor="cache-entry"><OperationSelect id="cache-entry" value={entryId} onChange={(id) => setSelection({ projectId, id })} options={entries.map((entry) => ({ value: entry.id, label: entry.title || "Untitled" }))} placeholder={entries.length ? "Choose a published entry" : "No published entries"} disabled={!entries.length} /></Field>
        <Button onClick={invalidate} disabled={busy || !entryId || !can("content.entry.publish")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}{busy ? "Requesting…" : "Invalidate cache"}</Button>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-text-secondary"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />External CDN responses may remain until their 60-second TTL; this action does not purge external CDNs.</p>
    </SectionCard>
    <SectionCard bare title="Invalidation history" description="Every request is recorded in the project audit log.">
      <OperationTable rows={history} title="No invalidation requests" description="Requests appear here after you invalidate an entry." columns={columns} />
    </SectionCard>
  </OperationScreen>;
}
export default CacheInvalidationScreen;
