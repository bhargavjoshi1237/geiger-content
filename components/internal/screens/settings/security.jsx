"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Loader2 } from "lucide-react";
import { SectionCard, SettingsList, SettingRow } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getSecurity, revokeProjectToken, signOutOtherSessions } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function SecurityScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.token.manage");
  const state = useOperationData(projectId, getSecurity);
  const [busy, setBusy] = useState(null);
  async function revoke(id) {
    setBusy(id);
    const result = await revokeProjectToken(projectId, id);
    setBusy(null);
    if (result) { toast.success("Token revoked"); await state.reload(); } else toast.error("Could not revoke this token.");
  }
  async function signOutOthers() {
    setBusy("sessions");
    const success = await signOutOtherSessions();
    setBusy(null);
    if (!success) toast.error("Could not sign out other sessions."); else toast.success("Other refresh sessions signed out");
  }
  return <OperationScreen title="Security" description="Review your authenticated session and project access credentials." projectId={projectId} {...state}>
    <SectionCard title="Your session"><SettingsList><SettingRow title="Signed-in account" description={state.data?.email} /><SettingRow title="Last sign-in" description={displayTime(state.data?.lastSignIn)} /><SettingRow title="Authentication assurance" description={state.data?.assurance === "aal2" ? "MFA verified for this session" : state.data?.assurance === "unavailable" ? "Assurance information unavailable" : "Single-factor session"} /><SettingRow title="Verified MFA factors" description={state.data?.factors === null ? "Factor information unavailable" : String(state.data?.factors || 0)} /><SettingRow title="Other sessions" description="Ends other refresh sessions. Existing access tokens remain valid until they expire." control={<Button variant="outline" onClick={signOutOthers} disabled={Boolean(busy)}>{busy === "sessions" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Sign out other sessions</Button>} /></SettingsList></SectionCard>
    <SectionCard title="Delivery tokens"><OperationTable rows={state.data?.tokens || []} title="No delivery tokens" columns={[{ key: "name", header: "Token" }, { key: "scopes", header: "Scopes", render: (row) => row.scopes.join(", ") }, { key: "lastUsedAt", header: "Last used", render: (row) => displayTime(row.lastUsedAt) }, { key: "revokedAt", header: "Status", render: (row) => row.revokedAt ? "Revoked" : row.expiresAt && new Date(row.expiresAt) < new Date() ? "Expired" : "Active" }, { key: "id", header: "", render: (row) => <Button variant="outline" size="sm" onClick={() => revoke(row.id)} disabled={Boolean(busy) || Boolean(row.revokedAt) || !editable}>{busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Revoke</Button> }]} /></SectionCard>
    <SectionCard title="Service accounts"><OperationTable rows={state.data?.accounts || []} title="No service accounts" columns={[{ key: "name", header: "Account" }, { key: "role", header: "Role" }]} /></SectionCard>
    <SectionCard title="Recent security context" description="The 20 most recent project audit events."><OperationTable rows={state.data?.events || []} title="No audit events" columns={[{ key: "action", header: "Action" }, { key: "entity", header: "Entity" }, { key: "at", header: "Time", render: (row) => displayTime(row.at) }]} /></SectionCard>
  </OperationScreen>;
}
export default SecurityScreen;
