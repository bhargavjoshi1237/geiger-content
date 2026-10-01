"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Loader2 } from "lucide-react";
import { SectionCard, Field } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { useRbac } from "@/context/rbac-context";
import { getInvalidations, requestOperation } from "@/lib/supabase/delivery_ops";
import { OperationScreen, OperationSelect, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function CacheInvalidationScreen() {
  const { projectId } = useProject();
  const { can } = useRbac();
  const state = useOperationData(projectId, getInvalidations);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const entryId = selection?.projectId === projectId ? selection.id : "";
  async function invalidate() {
    setBusy(true);
    const result = await requestOperation("cache-invalidation", projectId, { entryId });
    setBusy(false);
    if (result.ok) { toast.success("Delivery cache invalidation requested"); await state.reload(); } else toast.error(result.error);
  }
  return <OperationScreen title="Cache Invalidation" description="Invalidate delivery data and request entry renderer revalidation with an audit history." projectId={projectId} {...state}>
    <SectionCard title="Invalidate an entry" description="Expires the entry and project delivery data caches so the next read fetches fresh content. External CDN responses may remain until their 60-second TTL; this action does not purge external CDNs."><div className="space-y-4"><Field label="Published entry"><OperationSelect value={entryId} onChange={(id) => setSelection({ projectId, id })} options={(state.data?.entries || []).map((entry) => ({ value: entry.id, label: entry.title || "Untitled" }))} placeholder={state.data?.entries.length ? "Choose a published entry" : "No published entries"} /></Field><Button onClick={invalidate} disabled={busy || !entryId || !can("content.entry.publish")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{busy ? "Requesting…" : "Invalidate delivery cache"}</Button></div></SectionCard>
    <OperationTable rows={state.data?.history || []} title="No invalidation requests" columns={[{ key: "path", header: "Path" }, { key: "status", header: "Status" }, { key: "at", header: "Requested", render: (row) => displayTime(row.at) }]} />
  </OperationScreen>;
}
export default CacheInvalidationScreen;
