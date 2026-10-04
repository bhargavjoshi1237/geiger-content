"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Field, SectionCard, StatusPill } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getProjectConsent, saveProjectConsent } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationSelect, OperationTable, useOperationData, displayTime } from "../operations_ui";
import { CONSENT_STATUS_MAP } from "./constants";

const PURPOSE_OPTIONS = [
  { value: "analytics", label: "Analytics" },
  { value: "personalization", label: "Personalization" },
];

const STATUS_OPTIONS = ["granted", "denied", "pending"].map((value) => ({
  value,
  label: CONSENT_STATUS_MAP[value].label,
}));

const COLUMNS = [
  {
    key: "identifier",
    header: "Profile",
    render: (row) => (
      <span className="block max-w-xs truncate font-medium text-foreground">{row.identifier}</span>
    ),
  },
  {
    key: "purpose",
    header: "Purpose",
    render: (row) => <span className="text-sm capitalize text-text-secondary">{row.purpose}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusPill status={row.status} map={CONSENT_STATUS_MAP} />,
  },
  {
    key: "updatedAt",
    header: "Updated",
    render: (row) => (
      <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.updatedAt)}</span>
    ),
  },
];

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
    if (result) {
      toast.success("Consent updated");
      await state.reload();
    } else toast.error("Could not update this profile's consent.");
  }

  const profileOptions = (state.data?.profiles || []).map((row) => ({
    value: row.id,
    label: row.primaryIdentifier || row.id,
  }));

  return (
    <OperationScreen
      title="Consent & Privacy"
      description="Inspect recorded purposes and update consent for project profiles."
      projectId={projectId}
      {...state}
    >
      <SectionCard
        title="Record consent"
        description="Shows up to the 500 newest profiles. Only explicit granted personalization consent makes a profile eligible for audience embeddings."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Profile" htmlFor="consent-profile">
            <OperationSelect
              id="consent-profile"
              value={profileId}
              onChange={(id) => setSelection({ projectId, id })}
              options={profileOptions}
              placeholder="Choose a profile"
            />
          </Field>
          <Field label="Purpose" htmlFor="consent-purpose">
            <OperationSelect id="consent-purpose" value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS} />
          </Field>
          <Field label="Status" htmlFor="consent-status">
            <OperationSelect id="consent-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button className="w-full sm:w-auto" onClick={save} disabled={busy || !profileId || !editable}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Saving…" : "Save consent"}
          </Button>
        </div>
      </SectionCard>
      <SectionCard bare

        title="Recorded consent"
        description="Missing consent records do not count as granted personalization consent."
      >
        <OperationTable
          rows={state.data?.rows || []}
          title="No recorded consent"
          description="Consent you record above appears here."
          columns={COLUMNS}
        />
      </SectionCard>
    </OperationScreen>
  );
}

export default ConsentPrivacyScreen;
