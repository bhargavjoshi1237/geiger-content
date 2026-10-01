"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Loader2 } from "lucide-react";
import { Field, SectionCard } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { getBranding, saveBranding } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, useOperationData } from "../operations_ui";

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
    if (result) { setDraft(null); toast.success("Branding saved"); await state.reload(); } else toast.error("Could not save branding. Use an HTTPS URL for the logo.");
  }
  return <OperationScreen title="Branding" description="Store the project's brand identity for connected delivery clients." projectId={projectId} {...state}>
    <SectionCard title="Brand identity" description="Owners can edit these project settings. Delivery clients can use them when rendering the brand."><div className="grid gap-4 sm:grid-cols-2">{[["brandName", "Brand name"], ["tagline", "Tagline"], ["logoUrl", "Logo URL (HTTPS)"], ["supportEmail", "Support email"]].map(([key, label]) => <Field key={key} label={label}><Input type={key === "supportEmail" ? "email" : key === "logoUrl" ? "url" : "text"} value={input[key] || ""} disabled={!editable || busy} onChange={(event) => setDraft({ ...input, projectId, [key]: event.target.value })} /></Field>)}</div><Button className="mt-4" onClick={save} disabled={!editable || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{busy ? "Saving…" : "Save branding"}</Button></SectionCard>
  </OperationScreen>;
}
export default BrandingScreen;
