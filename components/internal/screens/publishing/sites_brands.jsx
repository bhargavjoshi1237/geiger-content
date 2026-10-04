"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { ActionMenu } from "@geiger/ui/action-menu";
import { Archive, Loader2, Pencil } from "lucide-react";
import { Field, SectionCard, StatsBar, StatusPill } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useOperationOwner } from "@/components/internal/screens/operations_ui";
import { listSites, saveSite, archiveSite } from "@/lib/supabase/enterprise_settings";
import { OperationScreen, OperationSelect, OperationTable, useOperationData } from "../operations_ui";
import { SITE_STATUS_MAP } from "./constants";

const blank = { name: "", hostname: "", brandName: "", environmentId: "", status: "Draft" };
const TEXT_FIELDS = [["name", "Site name", "e.g. Marketing site"], ["hostname", "Hostname", "www.example.com"], ["brandName", "Brand name", "e.g. Acme"]];

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
  const sites = state.data?.sites || [];
  const environments = state.data?.environments || [];
  const envName = (id) => environments.find((row) => row.id === id)?.name;
  const stats = [
    { label: "Sites", value: String(sites.length), footer: "Configured site records" },
    { label: "Active", value: String(sites.filter((row) => row.status === "Active").length), footer: "Marked active" },
    { label: "Environments", value: String(environments.length), footer: "Available delivery targets" },
  ];
  const columns = [
    { key: "name", header: "Site", render: (row) => <div className="flex min-w-0 flex-col gap-1"><span className="font-medium text-foreground">{row.name}</span><span className="font-mono text-xs text-text-secondary">{row.hostname}</span></div> },
    { key: "brandName", header: "Brand", render: (row) => <span className="text-sm text-text-secondary">{row.brandName || "—"}</span> },
    { key: "environmentId", header: "Environment", render: (row) => <span className="text-sm text-text-secondary">{envName(row.environmentId) || "—"}</span> },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} map={SITE_STATUS_MAP} /> },
    { key: "id", header: "", align: "right", render: (row) => <ActionMenu label={`Actions for ${row.name}`} disabled={!editable || busy} items={[{ icon: Pencil, label: "Edit", onSelect: () => setDraft({ ...row, projectId }) }, { separator: true }, { icon: Archive, label: "Archive", destructive: true, onSelect: () => archive(row.id) }]} /> },
  ];
  return <OperationScreen title="Sites & Brands" description="Manage project site identities and their delivery environments. Hosting and DNS remain with your deployment provider." projectId={projectId} {...state}>
    <StatsBar stats={stats} columns={3} />
    <SectionCard title={input.id ? "Edit site" : "Add site"} description={editable ? undefined : "Only project owners can add or change sites."}>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map(([key, label, placeholder]) => <Field key={key} label={label} htmlFor={`site-${key}`}><Input id={`site-${key}`} value={input[key]} onChange={(event) => patch(key, event.target.value)} disabled={!editable || busy} placeholder={placeholder} /></Field>)}
        <Field label="Environment" htmlFor="site-environment"><OperationSelect id="site-environment" value={input.environmentId || "none"} onChange={(value) => patch("environmentId", value === "none" ? "" : value)} disabled={!editable || busy} options={[{ value: "none", label: "No environment" }, ...environments.map((row) => ({ value: row.id, label: row.name }))]} /></Field>
        <Field label="Status" htmlFor="site-status"><OperationSelect id="site-status" value={input.status} onChange={(value) => patch("status", value)} disabled={!editable || busy} options={["Draft", "Active", "Paused"].map((value) => ({ value, label: value }))} /></Field>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {input.id ? <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>Cancel edit</Button> : null}
        <Button onClick={save} disabled={!editable || busy || !input.name.trim() || !input.hostname.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{input.id ? "Save changes" : "Add site"}</Button>
      </div>
    </SectionCard>
    <SectionCard bare title="Sites" description="Archived sites are hidden from this list.">
      <OperationTable rows={sites} title="No sites configured" description="Add a site above to give this project a delivery identity." columns={columns} />
    </SectionCard>
  </OperationScreen>;
}
export default SitesBrandsScreen;
