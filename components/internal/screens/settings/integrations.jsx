"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pause, Play } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { StatusPill } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getIntegrations, setIntegrationStatus } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

const INTEGRATION_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-text-tertiary" },
};

export function IntegrationsScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.settings.manage");
  const state = useOperationData(projectId, getIntegrations);
  const [busy, setBusy] = useState(null);

  async function toggle(row) {
    setBusy(row.id);
    const result = await setIntegrationStatus(projectId, row, row.status === "Active" ? "Paused" : "Active");
    setBusy(null);
    if (result) {
      toast.success("Integration updated");
      await state.reload();
    } else toast.error("Could not update this integration.");
  }

  const columns = [
    {
      key: "name",
      header: "Integration",
      render: (row) => (
        <div className="flex min-w-0 max-w-xs flex-col gap-1">
          <span className="truncate font-medium text-foreground">{row.name}</span>
          <span className="truncate text-xs capitalize text-text-secondary">{row.kind}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Source or events",
      render: (row) => <span className="block max-w-xs truncate text-sm text-text-secondary">{row.type}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} map={INTEGRATION_STATUS_MAP} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.updatedAt)}</span>
      ),
    },
    {
      key: "id",
      header: "",
      align: "right",
      render: (row) => {
        const active = row.status === "Active";
        const Icon = active ? Pause : Play;
        return (
          <Button variant="outline" size="sm" onClick={() => toggle(row)} disabled={Boolean(busy) || !editable}>
            {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {active ? "Pause" : "Activate"}
          </Button>
        );
      },
    },
  ];

  return (
    <OperationScreen
      title="Integrations"
      description="Monitor and pause existing data connections and outbound webhooks. Configure new connections in Data Connections or Webhooks."
      projectId={projectId}
      {...state}
    >
      <OperationTable
        rows={state.data?.rows || []}
        title="No integrations connected"
        description="Add a Data Connection or Webhook to populate this list."
        columns={columns}
      />
    </OperationScreen>
  );
}

export default IntegrationsScreen;
