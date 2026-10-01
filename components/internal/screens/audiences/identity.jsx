"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Merge } from "lucide-react";

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
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
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
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
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
        <span className="text-sm text-text-secondary">
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

      <StatsBar stats={stats} />

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
            Preview
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleMerge}
            disabled={merging}
          >
            <Merge className="h-4 w-4" />
            {merging ? "Merging…" : "Merge profiles"}
          </Button>
        </div>
        {preview ? (
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            {[
              { label: "Anonymous", p: preview.anon, traits: preview.anonTraits },
              { label: "Known", p: preview.known, traits: preview.knownTraits },
            ].map((side) => (
              <div
                key={side.label}
                className="rounded-xl border border-border bg-surface-card p-3"
              >
                <p className="font-medium text-foreground">{side.label}</p>
                {side.p ? (
                  <>
                    <p className="mt-1 text-text-secondary">
                      {side.p.primaryIdentifier} ·{" "}
                      {(side.p.identifiers || []).length} aliases
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {Object.keys(side.traits || {}).length} traits
                      {side.traits && Object.keys(side.traits).length
                        ? `: ${Object.keys(side.traits).join(", ")}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-text-secondary">
                    Not found — it will be created on merge.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <Toolbar>
        <div />
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
