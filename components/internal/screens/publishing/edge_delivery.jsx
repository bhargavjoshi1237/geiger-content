"use client";
import { SectionCard, SettingRow, SettingsList } from "@/components/internal/shared/screen_kit";
import { useProject } from "@/context/project-context";
import { getDelivery } from "@/lib/supabase/delivery_ops";
import { OperationScreen, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function EdgeDeliveryScreen() {
  const { projectId } = useProject();
  const state = useOperationData(projectId, getDelivery);
  const endpoint = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/content/v1/entries?project=${projectId}`;
  return <OperationScreen title="Edge Delivery" description="Published content, delivery environments and the project's public delivery endpoints." projectId={projectId} {...state}>
    <SectionCard title="Delivery configuration"><SettingsList><SettingRow title="Public REST endpoint" description={endpoint} /><SettingRow title="Delivery cache" description="Public responses and the published renderer cache content for up to 60 seconds. Cache Invalidation expires the application data cache; external CDN caches follow their own TTL." /><SettingRow title="Configured sites" description={`${state.data?.sites.length || 0} site records; DNS and hosting are managed by your deployment provider.`} /></SettingsList></SectionCard>
    <SectionCard title="Environments"><OperationTable rows={state.data?.environments || []} columns={[{ key: "name", header: "Environment" }, { key: "key", header: "Key" }, { key: "isDefault", header: "Default", render: (row) => row.isDefault ? "Yes" : "No" }]} title="No delivery environments" /></SectionCard>
    <SectionCard title="Published entries" description="Up to the 100 most recently published entries."><OperationTable rows={state.data?.entries || []} columns={[{ key: "title", header: "Entry" }, { key: "slug", header: "Slug" }, { key: "publishedAt", header: "Published", render: (row) => displayTime(row.publishedAt) }, { key: "id", header: "Renderer", render: (row) => <a className="text-primary underline underline-offset-4" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/c/${row.id}`} target="_blank" rel="noreferrer">View entry</a> }]} title="No published entries" description="Publish content to make it available through delivery." /></SectionCard>
  </OperationScreen>;
}
export default EdgeDeliveryScreen;
