"use client";
import { toast } from "sonner";
import { Clock, Copy, ExternalLink, Globe, Server } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { SectionCard, SettingRow, SettingsList, StatsBar } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { getDelivery } from "@/lib/supabase/delivery_ops";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function EdgeDeliveryScreen() {
  const { projectId } = useProject();
  const state = useOperationData(projectId, getDelivery);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const endpoint = `${basePath}/api/content/v1/entries?project=${projectId}`;
  const entries = state.data?.entries || [];
  const environments = state.data?.environments || [];
  const sites = state.data?.sites || [];
  const defaultEnv = environments.find((row) => row.isDefault);
  const copyEndpoint = () => Promise.resolve(navigator.clipboard?.writeText(`${window.location.origin}${endpoint}`) ?? Promise.reject()).then(() => toast.success("Endpoint copied"), () => toast.error("Couldn't copy the endpoint."));
  const stats = [
    { label: "Published entries", value: String(entries.length), footer: "Up to the latest 100" },
    { label: "Environments", value: String(environments.length), footer: defaultEnv ? `Default: ${defaultEnv.name}` : "No default set" },
    { label: "Sites", value: String(sites.length), footer: "Configured site records" },
    { label: "Cache TTL", value: "60s", footer: "Public responses" },
  ];
  return <OperationScreen title="Edge Delivery" description="Published content, delivery environments and the project's public delivery endpoints." projectId={projectId} {...state}>
    <StatsBar stats={stats} />
    <SectionCard title="Delivery configuration">
      <SettingsList>
        <SettingRow icon={Globe} title="Public REST endpoint" description={<span className="break-all font-mono">{endpoint}</span>} control={<Button variant="outline" size="icon-sm" aria-label="Copy endpoint" onClick={copyEndpoint}><Copy className="h-4 w-4" /></Button>} />
        <SettingRow icon={Clock} title="Delivery cache" description="Public responses and the published renderer cache content for up to 60 seconds. Cache Invalidation expires the application data cache; external CDN caches follow their own TTL." control={null} />
        <SettingRow icon={Server} title="Configured sites" description="DNS and hosting are managed by your deployment provider." control={<Badge variant="neutral">{sites.length} {sites.length === 1 ? "site" : "sites"}</Badge>} />
      </SettingsList>
    </SectionCard>
    <SectionCard bare title="Environments" description="Delivery targets entries can be scoped to.">
      <OperationTable rows={environments} title="No delivery environments" description="Create environments from the Environments screen." columns={[
        { key: "name", header: "Environment", render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
        { key: "key", header: "Key", render: (row) => <span className="font-mono text-xs text-text-secondary">{row.key || "—"}</span> },
        { key: "isDefault", header: "Default", align: "right", render: (row) => row.isDefault ? <Badge variant="success">Default</Badge> : <span className="text-text-tertiary">—</span> },
      ]} />
    </SectionCard>
    <SectionCard bare title="Published entries" description="Up to the 100 most recently published entries.">
      <OperationTable rows={entries} title="No published entries" description="Publish content to make it available through delivery." columns={[
        { key: "title", header: "Entry", render: (row) => <div className="flex min-w-0 flex-col gap-1"><span className="font-medium text-foreground">{row.title || "Untitled"}</span><span className="font-mono text-xs text-text-secondary">/{row.slug}</span></div> },
        { key: "publishedAt", header: "Published", render: (row) => <span className="whitespace-nowrap text-sm text-text-secondary">{displayTime(row.publishedAt)}</span> },
        { key: "id", header: "", align: "right", render: (row) => <Button asChild variant="ghost" size="sm" className="text-muted-foreground"><a href={`${basePath}/c/${row.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />View</a></Button> },
      ]} />
    </SectionCard>
  </OperationScreen>;
}
export default EdgeDeliveryScreen;
