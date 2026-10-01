"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Loader2 } from "lucide-react";
import { Field, SectionCard } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { listSites, saveSite, archiveSite } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationSelect, OperationTable, useOperationData } from "../operations_ui";

const blank = { name: "", hostname: "", brandName: "", environmentId: "", status: "Draft" };
export function SitesBrandsScreen() {
  const { projectId } = useProject();
  const editable = useOperationOwner("content.settings.manage");
  const state = useOperationData(projectId, listSites);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = draft?.projectId === projectId ? draft : blank;
  const patch = (key, value) => setDraft({ ...input, projectId, [key]: value });
  async function save() {
    setBusy(true);
    const result = await saveSite(projectId, input, input.id);
    setBusy(false);
    if (result) { setDraft(null); toast.success("Site saved"); await state.reload(); } else toast.error("Could not save this site. Use a valid unique hostname and an environment in this project.");
  }
  async function archive(id) {
    setBusy(true);
    const result = await archiveSite(projectId, id);
    setBusy(false);
    if (result) { if (input.id === id) setDraft(null); toast.success("Site archived"); await state.reload(); } else toast.error("Could not archive this site.");
  }
  return <OperationScreen title="Sites & Brands" description="Manage project site identities and their delivery environments. Hosting and DNS remain with your deployment provider." projectId={projectId} {...state}>
    <SectionCard title={input.id ? "Edit site" : "Add site"}><div className="grid gap-4 sm:grid-cols-2">{[["name", "Site name"], ["hostname", "Hostname"], ["brandName", "Brand name"]].map(([key, label]) => <Field key={key} label={label}><Input value={input[key]} onChange={(event) => patch(key, event.target.value)} disabled={!editable || busy} placeholder={key === "hostname" ? "www.example.com" : ""} /></Field>)}<Field label="Environment"><OperationSelect value={input.environmentId || "none"} onChange={(value) => patch("environmentId", value === "none" ? "" : value)} disabled={!editable || busy} options={[{ value: "none", label: "No environment" }, ...(state.data?.environments || []).map((row) => ({ value: row.id, label: row.name }))]} /></Field><Field label="Status"><OperationSelect value={input.status} onChange={(value) => patch("status", value)} disabled={!editable || busy} options={["Draft", "Active", "Paused"].map((value) => ({ value, label: value }))} /></Field><div className="flex items-end gap-2"><Button onClick={save} disabled={!editable || busy || !input.name.trim() || !input.hostname.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save site</Button>{input.id ? <Button variant="outline" onClick={() => setDraft(null)}>Cancel edit</Button> : null}</div></div></SectionCard>
    <OperationTable rows={state.data?.sites || []} title="No sites configured" columns={[{ key: "name", header: "Site" }, { key: "hostname", header: "Hostname" }, { key: "brandName", header: "Brand" }, { key: "status", header: "Status" }, { key: "id", header: "", render: (row) => <div className="flex gap-2"><Button variant="outline" size="sm" disabled={!editable || busy} onClick={() => setDraft({ ...row, projectId })}>Edit</Button><Button variant="outline" size="sm" disabled={!editable || busy} onClick={() => archive(row.id)}>Archive</Button></div> }]} />
  </OperationScreen>;
}
export default SitesBrandsScreen;
