"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Database } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { DataTable, EmptyState, ScreenHeader, SearchInput } from "@/components/internal/shared/screen_kit";
import { SecondaryScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { useRbac } from "@/context/rbac-context";
import { useProject } from "@/context/project-context";

export function useOperationOwner(permission) {
  const { project } = useProject();
  const { isOwner, userId, can, loading } = useRbac();
  const creator = Boolean(userId && project?.created_by === userId);
  return !loading && (creator || (isOwner && can(permission)));
}

export function useOperationData(projectId, loader) {
  const [state, setState] = useState(null);
  const load = useCallback(async () => {
    const data = await loader(projectId).catch(() => null);
    setState({ projectId, data });
  }, [projectId, loader]);
  useEffect(() => {
    let alive = true;
    loader(projectId).then((data) => { if (alive) setState({ projectId, data }); }).catch(() => { if (alive) setState({ projectId, data: null }); });
    return () => { alive = false; };
  }, [projectId, loader]);
  return { data: state?.projectId === projectId ? state.data : null, loading: Boolean(projectId) && state?.projectId !== projectId, reload: load };
}

export function OperationScreen({ title, description, projectId, loading, data, reload, actions, children }) {
  return <SecondaryScreenWrapper>
    <ScreenHeader title={title} description={description} actions={<>{actions}<Button variant="outline" size="icon" aria-label="Refresh" onClick={reload} disabled={loading || !projectId}><RefreshCw className="h-4 w-4" /></Button></>} />
    {!projectId ? <EmptyState icon={Database} title="No project selected" description="Select a project to continue." /> : loading ? <div className="flex min-h-48 items-center justify-center"><LogoLoading size={48} aria-label={`Loading ${title}`} /></div> : data === null ? <EmptyState icon={Database} title={`${title} unavailable`} description="Could not load this project's data. Check your access and database connection, then refresh." /> : children}
  </SecondaryScreenWrapper>;
}

export function OperationTable({ rows, columns, title = "No records yet", description = "Records will appear here as you use this project." }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter((row) => Object.values(row).some((value) => typeof value === "string" && value.toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-4"><SearchInput value={search} onChange={setSearch} placeholder="Filter records…" /><DataTable columns={columns} data={filtered} getRowKey={(row) => row.id} empty={<EmptyState icon={Database} title={rows.length ? "No matching records" : title} description={rows.length ? "Clear or change your filter." : description} />} /></div>;
}

export const displayTime = (value) => value ? new Date(value).toLocaleString() : "—";

export function OperationSelect({ value, onChange, options, placeholder = "Choose…", disabled = false }) {
  return <Select value={value || undefined} onValueChange={onChange} disabled={disabled}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
