"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, Copy, KeyRound, Plus, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
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
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import {
  createToken,
  listTokens,
  revokeToken,
} from "@/lib/supabase/tokens";

const AVAILABLE_SCOPES = [
  "delivery:read",
  "content:read",
  "content:write",
  "webhooks:write",
];

function isExpired(t) {
  return Boolean(t.expiresAt) && new Date(t.expiresAt) <= new Date();
}

function tokenState(t) {
  if (t.revokedAt) return "Revoked";
  if (isExpired(t)) return "Expired";
  return "Active";
}

const TOKEN_STATE_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Expired: { label: "Expired", variant: "purple", dotClass: "bg-violet-300" },
  Revoked: { label: "Revoked", variant: "outline", dotClass: "bg-[#525252]" },
};

function CreateTokenDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["delivery:read"]);
  const [expiresAt, setExpiresAt] = useState("");

  const toggleScope = (scope) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope],
    );
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give your token a name first.");
      return;
    }
    onCreate({
      name: name.trim(),
      scopes,
      expiresAt: expiresAt || null,
    });
    setName("");
    setScopes(["delivery:read"]);
    setExpiresAt("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>Mint API token</DialogTitle>
          <DialogDescription>
            The bearer value is shown exactly once. Only its hash is stored.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Storefront read-only"
              autoFocus
            />
          </Field>
          <Field label="Scopes">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((s) => {
                const on = scopes.includes(s);
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={on ? "default" : "outline"}
                    className={
                      on
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                    }
                    onClick={() => toggleScope(s)}
                  >
                    {s}
                  </Button>
                );
              })}
            </div>
          </Field>
          <Field label="Expires at (optional)">
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
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
            Mint token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TokensScreen() {
  const { projectId } = useProject();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [plainToken, setPlainToken] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listTokens(projectId).then((result) => {
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
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.name} ${(r.scopes || []).join(" ")}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Total tokens", value: String(rows.length), footer: "This project" },
      { label: "Active", value: String(count((t) => tokenState(t) === "Active")), footer: "Usable now" },
      { label: "Revoked", value: String(count((t) => t.revokedAt)), footer: "Manually revoked" },
      { label: "Expired", value: String(count((t) => tokenState(t) === "Expired")), footer: "Past expiry" },
    ];
  }, [rows]);

  const handleCreate = async (draft) => {
    const optimistic = {
      id: crypto.randomUUID(),
      name: draft.name,
      scopes: draft.scopes,
      expiresAt: draft.expiresAt
        ? new Date(draft.expiresAt).toISOString()
        : null,
      revokedAt: null,
      lastUsedAt: null,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const created = await createToken({ ...optimistic, projectId });
    if (!created) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't mint the token on the server.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === optimistic.id ? created.token : r)),
    );
    setPlainToken({ name: created.token.name, plain: created.plain });
    toast.success(`"${created.token.name}" minted.`);
  };

  const handleRevoke = async (row) => {
    setRevokeTarget(null);
    const prev = rows;
    setRows((rows) =>
      rows.map((r) =>
        r.id === row.id ? { ...r, revokedAt: new Date().toISOString() } : r,
      ),
    );
    const saved = await revokeToken(row.id);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't revoke the token on the server.");
      return;
    }
    setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${row.name}" revoked.`);
  };

  const copyPlain = async () => {
    if (!plainToken) return;
    try {
      await navigator.clipboard.writeText(plainToken.plain);
      toast.success("Token copied — store it somewhere safe.");
    } catch (e) {
      console.error("[tokens.copy]", e);
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Token",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="font-mono text-xs text-text-secondary">
            {(r.scopes || []).join(" ") || "no scopes"}
          </span>
        </div>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (r) => {
        const state = tokenState(r);
        const entry = TOKEN_STATE_MAP[state];
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
            <span className={`h-2 w-2 rounded-full ${entry.dotClass}`} />
            {entry.label}
          </span>
        );
      },
    },
    {
      key: "lastUsed",
      header: "Last used",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) =>
        r.revokedAt ? null : (
          <ActionMenu
            label={`Actions for ${r.name}`}
            items={[
              {
                icon: Ban,
                label: "Revoke",
                variant: "destructive",
                onSelect: () => setRevokeTarget(r),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="API Tokens"
        description="Hashed, scoped, revocable bearer tokens for the delivery API. Values are shown once."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Mint token
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tokens…"
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
                  icon={KeyRound}
                  title={rows.length ? "No tokens match your filters" : "No tokens yet"}
                  description={
                    rows.length
                      ? "Try clearing the search."
                      : "Mint your first token to let an application read the delivery API."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Mint token
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="tokens" />
        </div>
      )}

      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog open={!!plainToken} onOpenChange={(open) => !open && setPlainToken(null)}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Copy your token</DialogTitle>
            <DialogDescription>
              This is the only time “{plainToken?.name}” is shown. Only its
              hash is stored — lose it and you mint a new one.
            </DialogDescription>
          </DialogHeader>
          <p className="break-all rounded-lg border border-border bg-surface-subtle px-3 py-2 font-mono text-xs text-foreground">
            {plainToken?.plain}
          </p>
          <DialogFooter>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={copyPlain}
            >
              <Copy className="h-4 w-4" /> Copy token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke token</DialogTitle>
            <DialogDescription>
              “{revokeTarget?.name}” stops working immediately. This cannot be
              undone — mint a replacement instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => handleRevoke(revokeTarget)}
            >
              <Trash2 className="h-4 w-4" /> Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default TokensScreen;
