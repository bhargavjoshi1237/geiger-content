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
  StatusPill,
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
import { GRANT_STATUS_MAP, formatDate, newId, shortId } from "./constants";
import {
  grantRole,
  listGrants,
  listRoles,
  revokeGrant,
  setMemberRole,
} from "@/lib/supabase/rbac";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

function InviteDialog({ open, onOpenChange, roles, onInvite }) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");

  const submit = () => {
    if (!userId.trim()) {
      toast.error("Enter the member's user id first.");
      return;
    }
    if (!roleId) {
      toast.error("Pick a role for the new member.");
      return;
    }
    onInvite({ userId: userId.trim(), roleId });
    setUserId("");
    setRoleId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Grant a signed-up user a role in this project. They appear in the
            member list immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="User id" htmlFor="invite-user-id">
            <Input
              id="invite-user-id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID of an existing user"
              autoFocus
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamMembersScreen() {
  const [grants, setGrants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listGrants(projectId), listRoles(projectId)]).then(
      ([grantRows, roleRows]) => {
        if (!alive) return;
        setGrants(grantRows ?? []);
        setRoles(roleRows ?? []);
        setLoading(false);
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const filtered = useMemo(() => {
    return grants.filter((g) => {
      if (!search) return true;
      const role = roleById.get(g.roleId);
      return `${g.userId} ${role?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [grants, search, roleById]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const members = new Set(grants.map((g) => g.userId)).size;
    const narrowed = grants.filter(
      (g) => g.scope && Object.keys(g.scope).length > 0,
    ).length;
    return [
      { label: "Members", value: String(members), footer: "Distinct users" },
      { label: "Active grants", value: String(grants.length), footer: "Role assignments" },
      { label: "Roles in use", value: String(roleById.size), footer: "Defined roles" },
      { label: "Scoped grants", value: String(narrowed), footer: "Narrowed to resources" },
    ];
  }, [grants, roleById]);

  const handleInvite = async ({ userId: invitee, roleId }) => {
    const optimistic = {
      id: newId(),
      projectId,
      userId: invitee,
      roleId,
      scope: {},
      status: "active",
      grantedBy: userId,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    setGrants((prev) => [optimistic, ...prev]);
    const saved = await grantRole({
      id: optimistic.id,
      projectId,
      userId: invitee,
      roleId,
      grantedBy: userId,
    });
    if (!saved) {
      setGrants((prev) => prev.filter((g) => g.id !== optimistic.id));
      toast.error("Couldn't invite that member.");
      return;
    }
    setGrants((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
    toast.success("Member invited.");
  };

  const handleRoleChange = async (grant, roleId) => {
    if (grant.roleId === roleId) return;
    const prev = grants;
    setGrants((rows) =>
      rows.map((g) => (g.id === grant.id ? { ...g, roleId } : g)),
    );
    const saved = await setMemberRole({
      projectId,
      userId: grant.userId,
      roleId,
      grantedBy: userId,
      currentGrants: prev,
    });
    if (!saved) {
      setGrants(prev);
      toast.error("Couldn't change that member's role.");
      return;
    }
    const refreshed = await listGrants(projectId);
    if (refreshed) setGrants(refreshed);
    toast.success("Role updated.");
  };

  const handleRevoke = async (grant) => {
    setRevokeTarget(null);
    const prev = grants;
    setGrants((rows) => rows.filter((g) => g.id !== grant.id));
    toast.success("Grant revoked.");
    const ok = await revokeGrant(grant.id);
    if (!ok) {
      setGrants(prev);
      toast.error("Couldn't revoke the grant on the server.");
    }
  };

  const columns = [
    {
      key: "member",
      header: "Member",
      render: (g) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="whitespace-nowrap font-mono text-sm font-medium text-foreground">
            {shortId(g.userId)}
          </span>
          <span className="whitespace-nowrap text-xs text-text-secondary">
            Granted{g.createdAt ? ` · ${formatDate(g.createdAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (g) => (
        <Select
          value={g.roleId || ""}
          onValueChange={(roleId) => handleRoleChange(g, roleId)}
        >
          <SelectTrigger className="w-44" aria-label={`Role for ${shortId(g.userId)}`}>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (g) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {g.scope && Object.keys(g.scope).length > 0
            ? "Narrowed"
            : "Whole project"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (g) => (
        <StatusPill status={g.status || "active"} map={GRANT_STATUS_MAP} />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (g) => (
        <ActionMenu
          label={`Actions for ${shortId(g.userId)}`}
          items={[
            {
              icon: Trash2,
              label: "Revoke grant",
              variant: "destructive",
              onSelect: () => setRevokeTarget(g),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Team & Members"
        description="Who holds which role in this project — invite members, reassign roles, and revoke access."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" /> Invite member
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search members, roles…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(g) => g.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Users}
                  title={grants.length ? "No members match your filters" : "No members yet"}
                  description={
                    grants.length
                      ? "Try a different search, or invite someone new."
                      : "Invite your first member to start sharing this project."
                  }
                  action={
                    grants.length ? (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    ) : (
                      <Button onClick={() => setInviteOpen(true)}>
                        <Plus className="h-4 w-4" /> Invite member
                      </Button>
                    )
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="members" />
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        onInvite={handleInvite}
      />

      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke grant</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium text-foreground">
                {roleById.get(revokeTarget?.roleId)?.name || "this role"}
              </span>{" "}
              from{" "}
              <span className="font-medium text-foreground">
                {shortId(revokeTarget?.userId)}
              </span>
              ? They lose that access immediately. A revoked grant is never
              handed back automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
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

export default TeamMembersScreen;
