"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Fingerprint, KeyRound, Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { SectionCard, SettingsList, SettingRow, StatusPill } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getSecurity, revokeProjectToken, signOutOtherSessions } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

const TOKEN_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Expired: { label: "Expired", variant: "warning", dotClass: "bg-amber-400" },
  Revoked: { label: "Revoked", variant: "danger", dotClass: "bg-red-400" },
};

const tokenStatus = (row) =>
  row.revokedAt ? "Revoked" : row.expiresAt && new Date(row.expiresAt) < new Date() ? "Expired" : "Active";

const assuranceLabel = (assurance) =>
  assurance === "aal2"
    ? "MFA verified for this session"
    : assurance === "unavailable"
      ? "Assurance information unavailable"
      : "Single-factor session";

const ACCOUNT_COLUMNS = [
  {
    key: "name",
    header: "Account",
    render: (row) => <span className="block max-w-xs truncate font-medium text-foreground">{row.name}</span>,
  },
  { key: "role", header: "Role", render: (row) => <span className="text-sm text-text-secondary">{row.role}</span> },
];

const EVENT_COLUMNS = [
  {
    key: "action",
    header: "Action",
    render: (row) => <span className="text-sm font-medium capitalize text-foreground">{row.action}</span>,
  },
  {
    key: "entity",
    header: "Entity",
    render: (row) => <span className="text-sm capitalize text-text-secondary">{row.entity}</span>,
  },
  {
    key: "at",
    header: "Time",
    render: (row) => <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.at)}</span>,
  },
];

export function SecurityScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.token.manage");
  const state = useOperationData(projectId, getSecurity);
  const [busy, setBusy] = useState(null);

  async function revoke(id) {
    setBusy(id);
    const result = await revokeProjectToken(projectId, id);
    setBusy(null);
    if (result) {
      toast.success("Token revoked");
      await state.reload();
    } else toast.error("Could not revoke this token.");
  }

  async function signOutOthers() {
    setBusy("sessions");
    const success = await signOutOtherSessions();
    setBusy(null);
    if (!success) toast.error("Could not sign out other sessions.");
    else toast.success("Other refresh sessions signed out");
  }

  const tokenColumns = [
    {
      key: "name",
      header: "Token",
      render: (row) => <span className="block max-w-xs truncate font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "scopes",
      header: "Scopes",
      render: (row) =>
        row.scopes?.length ? (
          <div className="flex max-w-sm flex-wrap gap-1">
            {row.scopes.map((scope) => (
              <Badge key={scope} variant="outline" className="font-mono">
                {scope}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-text-tertiary">—</span>
        ),
    },
    {
      key: "lastUsedAt",
      header: "Last used",
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.lastUsedAt)}</span>
      ),
    },
    {
      key: "revokedAt",
      header: "Status",
      render: (row) => <StatusPill status={tokenStatus(row)} map={TOKEN_STATUS_MAP} />,
    },
    {
      key: "id",
      header: "",
      align: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => revoke(row.id)}
          disabled={Boolean(busy) || Boolean(row.revokedAt) || !editable}
        >
          {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Revoke
        </Button>
      ),
    },
  ];

  const data = state.data;

  return (
    <OperationScreen
      title="Security"
      description="Review your authenticated session and project access credentials."
      projectId={projectId}
      {...state}
    >
      <SectionCard title="Your session">
        <SettingsList>
          <SettingRow
            icon={UserRound}
            title="Signed-in account"
            description={<span className="break-all">{data?.email}</span>}
            control={null}
          />
          <SettingRow icon={Clock} title="Last sign-in" description={displayTime(data?.lastSignIn)} control={null} />
          <SettingRow
            icon={ShieldCheck}
            title="Authentication assurance"
            description={assuranceLabel(data?.assurance)}
            control={null}
          />
          <SettingRow
            icon={Fingerprint}
            title="Verified MFA factors"
            description={data?.factors === null ? "Factor information unavailable" : String(data?.factors || 0)}
            control={null}
          />
          <SettingRow
            icon={LogOut}
            title="Other sessions"
            description="Ends other refresh sessions. Existing access tokens remain valid until they expire."
            control={
              <Button variant="outline" size="sm" onClick={signOutOthers} disabled={Boolean(busy)}>
                {busy === "sessions" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign out others
              </Button>
            }
          />
        </SettingsList>
      </SectionCard>
      <SectionCard bare title="Delivery tokens" description="Project credentials used by delivery clients.">
        <OperationTable
          rows={data?.tokens || []}
          title="No delivery tokens"
          description="Tokens created for delivery clients appear here."
          columns={tokenColumns}
        />
      </SectionCard>
      <SectionCard bare title="Service accounts" description="Non-human identities with project access.">
        <OperationTable
          rows={data?.accounts || []}
          title="No service accounts"
          description="Service accounts created for this project appear here."
          columns={ACCOUNT_COLUMNS}
        />
      </SectionCard>
      <SectionCard bare title="Recent security context" description="The 20 most recent project audit events.">
        <OperationTable rows={data?.events || []} title="No audit events" columns={ACCOUNT_COLUMNS && EVENT_COLUMNS} />
      </SectionCard>
    </OperationScreen>
  );
}

export default SecurityScreen;
