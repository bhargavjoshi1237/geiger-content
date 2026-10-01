"use client";
import { Download, RefreshCw, Search } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ScreenHeader, SectionCard, EmptyState, StatsBar } from "@/components/internal/shared/screen_kit";
import { exportInsights } from "./insights_data";

export function InsightsScreen({ title, description, state, search, onSearchChange, controls, rows, emptyTitle, emptyDescription, stats, children, onNext, onPrevious }) {
  const hasRows = Boolean(state.data?.rows?.length);
  return (
    <MainScreenWrapper>
      <ScreenHeader title={title} description={description} actions={<>
        <Button variant="outline" disabled={state.loading} onClick={state.refresh}><RefreshCw className="h-4 w-4" />Refresh</Button>
        <Button variant="outline" disabled={!rows.length || state.loading || Boolean(state.error)} onClick={() => exportInsights(title, rows)}><Download className="h-4 w-4" />Export</Button>
      </>} />
      {state.data && stats ? <StatsBar stats={stats(state.data)} /> : null}
      <SectionCard title="Explore" description="Filter the current live results.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <Input className="pl-9" aria-label={`Search ${title.toLowerCase()}`} placeholder="Filter results…" value={search} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          {controls}
        </div>
      </SectionCard>
      {state.loading ? <div className="flex justify-center py-16" role="status"><LogoLoading size={56} aria-label={`Loading ${title.toLowerCase()}`} /></div> : state.error ?
        <SectionCard title="Unavailable"><div role="alert"><EmptyState title={`${title} unavailable`} description={state.error} /></div></SectionCard> :
        !hasRows ? <SectionCard title="Results"><EmptyState title={emptyTitle} description={emptyDescription} /></SectionCard> :
        !rows.length ? <SectionCard title="Results"><EmptyState title="No results for these filters" description="Try a broader search or change the filters." /></SectionCard> : children}
      {state.data?.truncated ? <p role="status" className="text-sm text-text-secondary">This view reached its safety limit. Coverage and totals describe the scanned records.</p> : null}
      {state.data && (onPrevious || onNext) ? <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">Scanned {state.data.scanned} indexed sources in this page; neighbours can come from the full project index.</p>
        <div className="flex gap-2"><Button variant="outline" disabled={state.loading || !onPrevious} onClick={onPrevious}>Previous sources</Button><Button variant="outline" disabled={state.loading || !onNext} onClick={onNext}>Next sources</Button></div>
      </div> : null}
    </MainScreenWrapper>
  );
}
