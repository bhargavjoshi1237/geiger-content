"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Field, SectionCard } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getBranding, saveBranding } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, useOperationData } from "../operations_ui";

const BRAND_FIELDS = [
  { key: "brandName", label: "Brand name", type: "text", placeholder: "e.g. Geiger" },
  { key: "tagline", label: "Tagline", type: "text", placeholder: "A short line under the name" },
  { key: "logoUrl", label: "Logo URL", type: "url", placeholder: "https://…", hint: "Must be an HTTPS URL." },
  { key: "supportEmail", label: "Support email", type: "email", placeholder: "support@example.com" },
];

export function BrandingScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.settings.manage");
  const state = useOperationData(projectId, getBranding);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = draft?.projectId === projectId ? draft : state.data || {};

  async function save() {
    setBusy(true);
    const result = await saveBranding(projectId, input);
    setBusy(false);
    if (result) {
      setDraft(null);
      toast.success("Branding saved");
      await state.reload();
    } else toast.error("Could not save branding. Use an HTTPS URL for the logo.");
  }

  return (
    <OperationScreen
      title="Branding"
      description="Store the project's brand identity for connected delivery clients."
      projectId={projectId}
      actions={
        <Button onClick={save} disabled={!editable || busy || state.loading || !state.data}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Saving…" : "Save branding"}
        </Button>
      }
      {...state}
    >
      <SectionCard
        title="Brand identity"
        description={
          editable
            ? "Delivery clients can use these settings when rendering the brand."
            : "Only project owners can edit these settings."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {BRAND_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} hint={field.hint} htmlFor={`branding-${field.key}`}>
              <Input
                id={`branding-${field.key}`}
                type={field.type}
                placeholder={field.placeholder}
                value={input[field.key] || ""}
                disabled={!editable || busy}
                onChange={(event) => setDraft({ ...input, projectId, [field.key]: event.target.value })}
              />
            </Field>
          ))}
        </div>
      </SectionCard>
    </OperationScreen>
  );
}

export default BrandingScreen;
