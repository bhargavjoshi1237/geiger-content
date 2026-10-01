"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Fingerprint, Merge } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
  Field,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { ActionMenu } from "@geiger/ui/action-menu";
import { formatDate, isAnonymousProfile } from "./constants";
import { listProfiles, mergeProfiles } from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

function ResolveDialog({ open, onOpenChange, target, onResolve }) {
  const [knownId, setKnownId] = useState("");

  const submit = () => {
    if (!knownId.trim()) {
      toast.error("Enter the known identifier to merge into.");
      return;
    }
    onResolve(target, knownId.trim());
    setKnownId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>Resolve identity</DialogTitle>
          <DialogDescription>
            Merge anonymous visitor{" "}
            <span className="font-medium text-foreground">
              {target?.primaryIdentifier}
            </span>{" "}
            into a known profile. Aliases, traits and events carry over.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Known identifier" htmlFor="known-id">
            <Input
              id="known-id"
              value={knownId}
              onChange={(e) => setKnownId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. user_123 or ada@example.com"
              autoFocus
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            Merge profiles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnonymousScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resolveTarget, setResolveTarget] = useState(null);
  const [now] = useState(() => Date.now());
  const { projectId } = useProject();

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

  const anonymous = useMemo(() => rows.filter(isAnonymousProfile), [rows]);

  const filtered = useMemo(() => {
    if (!search) return anonymous;
    const q = search.toLowerCase();
    return anonymous.filter((r) =>
      `${r.primaryIdentifier}`.toLowerCase().includes(q),
    );
  }, [anonymous, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const share = rows.length
      ? Math.round((anonymous.length / rows.length) * 100)
      : 0;
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const fresh = anonymous.filter(
      (r) => r.createdAt && new Date(r.createdAt).getTime() >= weekAgo,
    ).length;
    return [
      { label: "Anonymous visitors", value: String(anonymous.length), footer: `${share}% of profiles` },
      { label: "Known profiles", value: String(rows.length - anonymous.length), footer: "Resolved identities" },
      { label: "New this week", value: String(fresh), footer: "First seen" },
    ];
  }, [anonymous, rows.length, now]);

  const handleResolve = async (target, knownId) => {
    const merged = await mergeProfiles(
      projectId,
      target.primaryIdentifier,
      knownId,
    );
    if (!merged) {
      toast.error("Couldn't merge the profiles on the server.");
      return;
    }
    const refreshed = await listProfiles(projectId);
    setRows(refreshed ?? []);
    toast.success(`Merged into ${merged.primaryIdentifier}.`);
  };

  const columns = [
    {
      key: "identifier",
      header: "Anonymous ID",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {r.primaryIdentifier || "—"}
          </span>
          <span className="text-xs text-text-secondary">
            {r.createdAt ? `first seen ${formatDate(r.createdAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "active",
      header: "Last active",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(r.updatedAt) || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <ActionMenu
          label={`Actions for ${r.primaryIdentifier}`}
          items={[
            {
              icon: Merge,
              label: "Resolve into known…",
              onSelect: () => setResolveTarget(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Anonymous Visitors"
        description="Unresolved visitors with a single alias. Resolve one into a known profile when they log in or identify."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search anonymous IDs…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Fingerprint}
                  title={
                    rows.length
                      ? "No anonymous visitors match"
                      : "No anonymous visitors"
                  }
                  description={
                    rows.length
                      ? "Try clearing the search."
                      : "Anonymous visitors appear once the collect beacon receives unattributed events."
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="visitors" />
        </div>
      )}

      <ResolveDialog
        open={!!resolveTarget}
        onOpenChange={(open) => !open && setResolveTarget(null)}
        target={resolveTarget}
        onResolve={handleResolve}
      />
    </MainScreenWrapper>
  );
}

export default AnonymousScreen;
