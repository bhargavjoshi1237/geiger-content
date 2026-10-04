"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { ActionMenu } from "@geiger/ui/action-menu";
import { formatDateTime } from "./constants";
import {
  deleteTrait,
  listProfiles,
  listTraits,
  setTrait,
} from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

function TraitDialog({ open, onOpenChange, onSave, initial, profileLabel }) {
  const [key, setKey] = useState(initial?.key || "");
  const [value, setValue] = useState(
    initial ? JSON.stringify(initial.value) : "",
  );

  // The dialog remounts per target (key= on the caller side), so the
  // initializers above are the only sync point — no reset effect needed.

  const submit = () => {
    if (!key.trim()) {
      toast.error("Give the trait a key first.");
      return;
    }
    let parsed = value;
    try {
      parsed = value === "" ? null : JSON.parse(value);
    } catch {
      // Not JSON — keep the raw string.
    }
    onSave(key.trim(), parsed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit trait" : "Set trait"}</DialogTitle>
          <DialogDescription>
            {initial
              ? `Update ${initial.key} on ${profileLabel}.`
              : `Attach a key/value trait to ${profileLabel}. Values stay typed (string, number, boolean, JSON).`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Key" htmlFor="trait-key">
            <Input
              id="trait-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. plan, persona, lifecycle_stage"
              disabled={!!initial}
              autoFocus
            />
          </Field>
          <Field label="Value (JSON or plain text)" htmlFor="trait-value">
            <Input
              id="trait-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder='e.g. "pro", 42, true, ["a","b"]'
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
            Save trait
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TraitsScreen() {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [traits, setTraits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listProfiles(projectId).then((result) => {
      if (!alive) return;
      const list = result ?? [];
      setProfiles(list);
      if (!profileId && list.length) setProfileId(list[0].id);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    listTraits(profileId).then((result) => {
      if (alive) setTraits(result ?? []);
    });
    return () => {
      alive = false;
    };
  }, [profileId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId],
  );

  const stats = useMemo(
    () => [
      { label: "Traits on profile", value: String(traits.length), footer: selected?.primaryIdentifier || "—" },
      { label: "Profiles", value: String(profiles.length), footer: "In project" },
    ],
    [traits.length, profiles.length, selected],
  );

  const handleSave = async (key, value) => {
    const saved = await setTrait(profileId, key, value);
    if (!saved) {
      toast.error("Couldn't save the trait to the server.");
      return;
    }
    setTraits((prev) => {
      const next = prev.filter((t) => t.key !== key);
      return [...next, saved].sort((a, b) => a.key.localeCompare(b.key));
    });
    setEditing(null);
    toast.success(`Trait "${key}" saved.`);
  };

  const handleDelete = async (trait) => {
    setDeleteTarget(null);
    const prev = traits;
    setTraits((rows) => rows.filter((t) => t.key !== trait.key));
    const ok = await deleteTrait(profileId, trait.key);
    if (!ok) {
      setTraits(prev);
      toast.error("Couldn't delete the trait on the server.");
      return;
    }
    toast.success(`Trait "${trait.key}" deleted.`);
  };

  const columns = [
    {
      key: "key",
      header: "Key",
      render: (r) => (
        <span className="block max-w-[16rem] truncate font-medium text-foreground" title={r.key}>{r.key}</span>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (r) => (
        <span className="block max-w-[16rem] truncate font-mono text-xs text-text-secondary sm:max-w-md">
          {typeof r.value === "object"
            ? JSON.stringify(r.value)
            : String(r.value ?? "—")}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDateTime(r.updatedAt) || "—"}
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
          label={`Actions for ${r.key}`}
          items={[
            {
              icon: Pencil,
              label: "Edit",
              onSelect: () => {
                setEditing(r);
                setDialogOpen(true);
              },
            },
            { separator: true },
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
        title="Traits"
        description="Key/value attributes per profile — plan, persona, lifecycle stage. Segments read these."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={!profileId}
          >
            <Plus className="h-4 w-4" /> Set trait
          </Button>
        }
      />

      <StatsBar stats={stats} columns={2} />

      <Toolbar>
        <Select
          value={profileId}
          onValueChange={(id) => {
            setProfileId(id);
            setTraits([]);
          }}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select a profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.primaryIdentifier || p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={traits}
          getRowKey={(r) => r.key}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Tags}
                title={profiles.length ? "No traits yet" : "No profiles yet"}
                description={
                  profiles.length
                    ? "Set the first trait on this profile to start building segments."
                    : "Profiles appear once the collect beacon receives events."
                }
                action={
                  profiles.length ? (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Set trait
                    </Button>
                  ) : undefined
                }
              />
            </div>
          }
        />
      )}

      <TraitDialog
        key={editing?.key || "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        onSave={handleSave}
        initial={editing}
        profileLabel={selected?.primaryIdentifier || "profile"}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete trait</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="break-all font-medium text-foreground">
                {deleteTarget?.key}
              </span>{" "}
              from this profile? Segments matching on it will stop matching.
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

export default TraitsScreen;
