"use client";
import { AlertCircle, Download, RefreshCw, SearchX, Sparkles } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { LoadingArea } from "@geiger/ui/screen-kit";
import { cn } from "@geiger/ui/lib/utils";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ScreenHeader, SectionCard, EmptyState, StatsBar, Toolbar, SearchInput, DataTable } from "@geiger/ui/screen-kit";
import { exportInsights } from "./insights_data";

// Open table section: a heading and row dividers without nested card frames.
export function InsightsTable({ title, description, action, ...table }) {
  return (
    <SectionCard bare title={title} description={description} action={action} >
      <DataTable {...table} />
    </SectionCard>
  );
}

export function InsightsScreen({ title, description, state, search, onSearchChange, controls, rows, emptyTitle, emptyDescription, stats, children, onNext, onPrevious }) {
  const hasRows = Boolean(state.data?.rows?.length);
  return (
    <MainScreenWrapper>
      <ScreenHeader title={title} description={description} actions={<>
        <Button variant="outline" disabled={state.loading} onClick={state.refresh}><RefreshCw className={cn("h-4 w-4", state.loading && "animate-spin")} />Refresh</Button>
        <Button variant="outline" disabled={!rows.length || state.loading || Boolean(state.error)} onClick={() => exportInsights(title, rows)}><Download className="h-4 w-4" />Export</Button>
      </>} />
      {state.data && stats ? <StatsBar stats={stats(state.data)} columns={3} /> : null}
      <Toolbar>
        <div className="flex min-w-0 flex-wrap items-center gap-2">{controls}</div>
        <div className="w-full sm:w-72">
          <SearchInput expanded value={search} onChange={onSearchChange} placeholder="Filter results…" aria-label={`Search ${title.toLowerCase()}`} />
        </div>
      </Toolbar>
      {state.loading ? <LoadingArea panel size={56} label={`Loading ${title.toLowerCase()}`} /> : state.error ?
        <SectionCard><div role="alert"><EmptyState icon={AlertCircle} title={`${title} unavailable`} description={state.error} /></div></SectionCard> :
        !hasRows ? <SectionCard><EmptyState icon={Sparkles} title={emptyTitle} description={emptyDescription} /></SectionCard> :
        !rows.length ? <SectionCard><EmptyState icon={SearchX} title="No results for these filters" description="Try a broader search or change the filters." action={search ? <Button variant="outline" size="sm" onClick={() => onSearchChange("")}>Clear search</Button> : null} /></SectionCard> :
        children}
      {state.data?.truncated ? <p role="status" className="text-xs text-text-secondary">This view reached its safety limit. Coverage and totals describe the scanned records.</p> : null}
      {state.data && (onPrevious || onNext) ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-secondary">Scanned {state.data.scanned} indexed sources in this page; neighbours can come from the full project index.</p>
        <div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" disabled={state.loading || !onPrevious} onClick={onPrevious}>Previous sources</Button><Button size="sm" variant="outline" disabled={state.loading || !onNext} onClick={onNext}>Next sources</Button></div>
      </div> : null}
    </MainScreenWrapper>
  );
}
