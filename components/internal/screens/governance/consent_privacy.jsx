"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Loader2 } from "lucide-react";
import { Field, SectionCard } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getProjectConsent, saveProjectConsent } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationSelect, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function ConsentPrivacyScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.consent.override");
  const state = useOperationData(projectId, getProjectConsent);
  const [selection, setSelection] = useState(null);
  const [purpose, setPurpose] = useState("personalization");
  const [status, setStatus] = useState("denied");
  const [busy, setBusy] = useState(false);
  const profileId = selection?.projectId === projectId ? selection.id : "";
  async function save() {
    setBusy(true);
    const result = await saveProjectConsent(projectId, profileId, purpose, status);
    setBusy(false);
    if (result) { toast.success("Consent updated"); await state.reload(); } else toast.error("Could not update this profile's consent.");
  }
  return <OperationScreen title="Consent & Privacy" description="Inspect recorded purposes and update consent for project profiles." projectId={projectId} {...state}>
    <SectionCard title="Record consent" description="Shows up to the 500 newest profiles. Only explicit granted personalization consent makes a profile eligible for audience embeddings."><div className="grid gap-4 sm:grid-cols-3"><Field label="Profile"><OperationSelect value={profileId} onChange={(id) => setSelection({ projectId, id })} options={(state.data?.profiles || []).map((row) => ({ value: row.id, label: row.primaryIdentifier || row.id }))} placeholder="Choose a profile" /></Field><Field label="Purpose"><OperationSelect value={purpose} onChange={setPurpose} options={["analytics", "personalization"].map((value) => ({ value, label: value }))} /></Field><Field label="Status"><OperationSelect value={status} onChange={setStatus} options={["granted", "denied", "pending"].map((value) => ({ value, label: value }))} /></Field></div><Button className="mt-4" onClick={save} disabled={busy || !profileId || !editable}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{busy ? "Saving…" : "Save consent"}</Button></SectionCard>
    <OperationTable rows={state.data?.rows || []} title="No recorded consent" description="Missing consent records do not count as granted personalization consent." columns={[{ key: "identifier", header: "Profile" }, { key: "purpose", header: "Purpose" }, { key: "status", header: "Status" }, { key: "updatedAt", header: "Updated", render: (row) => displayTime(row.updatedAt) }]} />
  </OperationScreen>;
}
export default ConsentPrivacyScreen;
