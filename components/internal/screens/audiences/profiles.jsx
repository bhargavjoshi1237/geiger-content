"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

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
} from "@geiger/ui/screen-kit";
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
import { formatDate, newId } from "./constants";
import {
  createProfile,
  listProfiles,
  softDeleteProfile,
} from "@/lib/supabase/profiles";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

function CreateProfileDialog({ open, onOpenChange, onCreate }) {
  const [identifier, setIdentifier] = useState("");

  const submit = () => {
    if (!identifier.trim()) {
      toast.error("Enter a user id or email first.");
      return;
    }
    onCreate(identifier.trim());
    setIdentifier("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create profile</DialogTitle>
          <DialogDescription>
            Register a known profile by its canonical identifier. Anonymous
            visitors merge into it on login.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Primary identifier" htmlFor="profile-id">
            <Input
              id="profile-id"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            Create profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfilesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    listProfiles(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.primaryIdentifier} ${(r.identifiers || []).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    const merged = rows.filter((r) => (r.identifiers || []).length > 1).length;
    const fresh = rows.filter(
      (r) => r.createdAt && new Date(r.createdAt).getTime() >= weekAgo,
    ).length;
    return [
      { label: "Total profiles", value: String(rows.length), footer: `${merged} merged` },
      { label: "Anonymous", value: String(rows.length - merged), footer: "Single alias" },
      { label: "Merged", value: String(merged), footer: "Anonymous → known" },
      { label: "New this week", value: String(fresh), footer: "First seen" },
    ];
  }, [rows, now]);

  const handleCreate = async (identifier) => {
    const optimistic = {
      id: newId(),
      primaryIdentifier: identifier,
      identifiers: [identifier],
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createProfile(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the profile to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Profile created.");
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success("Profile deleted.");
    const ok = await softDeleteProfile(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the profile on the server.");
    }
  };

  const columns = [
    {
      key: "identifier",
      header: "Profile",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-xs">
          <span className="truncate font-medium text-foreground">
            {r.primaryIdentifier || "—"}
          </span>
          <span className="text-xs text-text-secondary">
            {(r.identifiers || []).length} alias
            {(r.identifiers || []).length === 1 ? "" : "es"}
            {r.createdAt ? ` · since ${formatDate(r.createdAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "aliases",
      header: "Aliases",
      render: (r) => (
        <span className="block max-w-[16rem] truncate text-sm text-text-secondary sm:max-w-sm">
          {(r.identifiers || []).slice(0, 3).join(", ") || "—"}
          {(r.identifiers || []).length > 3
            ? ` +${r.identifiers.length - 3} more`
            : ""}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Last active",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
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
              icon: Trash2,
              label: "Delete",
              variant: "destructive",
              onSelect: () => setDeleteTarget(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Profiles"
        description="Known and anonymous audience profiles with every identifier alias each has been seen as."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create profile
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search identifiers…"
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
                  icon={Users}
                  title={
                    rows.length
                      ? "No profiles match your filters"
                      : "No profiles yet"
                  }
                  description={
                    rows.length
                      ? "Try clearing the search, or create a new profile."
                      : "Profiles appear automatically once the collect beacon receives events."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create profile
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="profiles" />
        </div>
      )}

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="break-all font-medium text-foreground">
                {deleteTarget?.primaryIdentifier}
              </span>
              ? Its traits and consent rows go with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteTarget)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default ProfilesScreen;
