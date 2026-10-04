"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Merge, ScanSearch } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
  Field,
  SectionCard,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import { Input } from "@geiger/ui/input";
import { formatDate, isAnonymousProfile } from "./constants";
import { getTraitsMap, listProfiles, mergeProfiles } from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

export function IdentityScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [anonId, setAnonId] = useState("");
  const [knownId, setKnownId] = useState("");
  const [merging, setMerging] = useState(false);
  const [preview, setPreview] = useState(null);
  const { projectId } = useProject();

  const refresh = async () => {
    const result = await listProfiles(projectId);
    setRows(result ?? []);
    return result ?? [];
  };

  useEffect(() => {
    let alive = true;
    listProfiles(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const resolved = useMemo(
    () => rows.filter((r) => !isAnonymousProfile(r)),
    [rows],
  );

  const filtered = useMemo(() => {
    if (!search) return resolved;
    const q = search.toLowerCase();
    return resolved.filter((r) =>
      `${r.primaryIdentifier} ${(r.identifiers || []).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [resolved, search]);

  const stats = useMemo(() => {
    const coverage = rows.length
      ? Math.round((resolved.length / rows.length) * 100)
      : 0;
    return [
      { label: "Resolved identities", value: String(resolved.length), footer: `${coverage}% coverage` },
      { label: "Pending anonymous", value: String(rows.length - resolved.length), footer: "Awaiting login" },
      { label: "Total profiles", value: String(rows.length), footer: "Known + anonymous" },
    ];
  }, [resolved.length, rows.length]);

  const handlePreview = async () => {
    if (!anonId.trim() || !knownId.trim()) {
      toast.error("Enter both identifiers to preview the merge.");
      return;
    }
    const all = await refresh();
    const find = (id) =>
      all.find(
        (p) =>
          p.primaryIdentifier === id || (p.identifiers || []).includes(id),
      ) || null;
    const anon = find(anonId.trim());
    const known = find(knownId.trim());
    const [anonTraits, knownTraits] = await Promise.all([
      anon ? getTraitsMap(anon.id) : null,
      known ? getTraitsMap(known.id) : null,
    ]);
    setPreview({ anon, known, anonTraits, knownTraits });
  };

  const handleMerge = async () => {
    if (!anonId.trim() || !knownId.trim()) {
      toast.error("Enter both identifiers first.");
      return;
    }
    if (anonId.trim() === knownId.trim()) {
      toast.error("The two identifiers are the same profile already.");
      return;
    }
    setMerging(true);
    const merged = await mergeProfiles(
      projectId,
      anonId.trim(),
      knownId.trim(),
    );
    setMerging(false);
    if (!merged) {
      toast.error("Couldn't merge the profiles on the server.");
      return;
    }
    setAnonId("");
    setKnownId("");
    setPreview(null);
    await refresh();
    toast.success(`Merged into ${merged.primaryIdentifier}.`);
  };

  const columns = [
    {
      key: "identifier",
      header: "Resolved identity",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-xs">
          <span className="truncate font-medium text-foreground">
            {r.primaryIdentifier || "—"}
          </span>
          <span className="text-xs text-text-secondary">
            {(r.identifiers || []).length} aliases
            {r.updatedAt ? ` · active ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "aliases",
      header: "Merged aliases",
      render: (r) => (
        <span className="block max-w-[16rem] truncate text-sm text-text-secondary sm:max-w-md">
          {(r.identifiers || [])
            .filter((a) => a !== r.primaryIdentifier)
            .join(", ") || "—"}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Identity Resolution"
        description="Merge anonymous visitors into known profiles on login. Aliases, traits and events carry over to the survivor."
      />

      <StatsBar stats={stats} columns={3} />

      <SectionCard
        title="Merge tool"
        description="Look up both sides, preview what merges, then resolve."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Anonymous identifier" htmlFor="merge-anon">
            <Input
              id="merge-anon"
              value={anonId}
              onChange={(e) => setAnonId(e.target.value)}
              placeholder="e.g. 9f3a… (browser id)"
            />
          </Field>
          <Field label="Known identifier" htmlFor="merge-known">
            <Input
              id="merge-known"
              value={knownId}
              onChange={(e) => setKnownId(e.target.value)}
              placeholder="e.g. user_123 or ada@example.com"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <ScanSearch className="h-4 w-4" /> Preview
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleMerge}
            disabled={merging}
          >
            {merging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Merge className="h-4 w-4" />
            )}
            {merging ? "Merging…" : "Merge profiles"}
          </Button>
        </div>
        {preview ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              { label: "Anonymous", p: preview.anon, traits: preview.anonTraits },
              { label: "Known", p: preview.known, traits: preview.knownTraits },
            ].map((side) => (
              <div
                key={side.label}
                className="min-w-0 rounded-xl border border-border bg-surface-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                    {side.label}
                  </p>
                  {side.p ? (
                    <Badge variant="success">Found</Badge>
                  ) : (
                    <Badge variant="neutral">New</Badge>
                  )}
                </div>
                {side.p ? (
                  <>
                    <p className="mt-2 truncate text-sm font-medium text-foreground">
                      {side.p.primaryIdentifier}
                    </p>
                    <p className="mt-1 break-words text-xs text-text-secondary">
                      {(side.p.identifiers || []).length} aliases ·{" "}
                      {Object.keys(side.traits || {}).length} traits
                      {side.traits && Object.keys(side.traits).length
                        ? `: ${Object.keys(side.traits).join(", ")}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-text-secondary">
                    Not found — it will be created on merge.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search resolved identities…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Merge}
                title="No resolved identities yet"
                description="Use the merge tool above to resolve an anonymous visitor into a known profile."
              />
            </div>
          }
        />
      )}
    </MainScreenWrapper>
  );
}

export default IdentityScreen;
