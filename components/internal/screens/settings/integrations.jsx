"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Loader2 } from "lucide-react";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getIntegrations, setIntegrationStatus } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function IntegrationsScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.settings.manage");
  const state = useOperationData(projectId, getIntegrations);
  const [busy, setBusy] = useState(null);
  async function toggle(row) {
    setBusy(row.id);
    const result = await setIntegrationStatus(projectId, row, row.status === "Active" ? "Paused" : "Active");
    setBusy(null);
    if (result) { toast.success("Integration updated"); await state.reload(); } else toast.error("Could not update this integration.");
  }
  return <OperationScreen title="Integrations" description="Monitor and pause existing data connections and outbound webhooks. Configure new connections in Data Connections or Webhooks." projectId={projectId} {...state}>
    <OperationTable rows={state.data?.rows || []} title="No integrations connected" description="Add a Data Connection or Webhook to populate this list." columns={[{ key: "name", header: "Integration" }, { key: "kind", header: "Kind" }, { key: "type", header: "Source or events" }, { key: "status", header: "Status" }, { key: "updatedAt", header: "Updated", render: (row) => displayTime(row.updatedAt) }, { key: "id", header: "", render: (row) => <Button variant="outline" size="sm" onClick={() => toggle(row)} disabled={Boolean(busy) || !editable}>{busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{row.status === "Active" ? "Pause" : "Activate"}</Button> }]} />
  </OperationScreen>;
}
export default IntegrationsScreen;
