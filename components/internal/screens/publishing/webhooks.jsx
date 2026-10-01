"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  FlaskConical,
  Pencil,
  Plus,
  Trash2,
  Webhook,
} from "lucide-react";

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
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
  Field,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import { Input } from "@geiger/ui/input";
import { Checkbox } from "@geiger/ui/checkbox";
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
import {
  DELIVERY_STATUS_MAP,
  WEBHOOK_STATUS_MAP,
  formatDateTime,
  newId,
} from "./constants";
import {
  WEBHOOK_EVENTS,
  createWebhook,
  listProjectDeliveries,
  listWebhooks,
  logDelivery,
  softDeleteWebhook,
  updateWebhook,
} from "@/lib/supabase/webhooks";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const EMPTY_DRAFT = { name: "", url: "", events: ["entry.published"], secret: "" };

function WebhookDialog({ open, onOpenChange, initial, onSubmit, title, cta }) {
  // Callers pass a distinct `key` per target so the draft resets on open.
  const [draft, setDraft] = useState(initial);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleEvent = (event) => {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(event)
        ? d.events.filter((e) => e !== event)
        : [...d.events, event],
    }));
  };

  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give your webhook a name first.");
      return;
    }
    if (!draft.url.trim() || !/^https?:\/\//.test(draft.url.trim())) {
      toast.error("Enter a valid http(s) URL.");
      return;
    }
    if (draft.events.length === 0) {
      toast.error("Subscribe to at least one event.");
      return;
    }
    onSubmit({ ...draft });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            POSTs JSON {`{ event, payload, sentAt }`} on every subscribed
            publish/unpublish. Failures are recorded, never raised.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="webhook-name">
            <Input
              id="webhook-name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Site rebuild"
              autoFocus
            />
          </Field>
          <Field label="URL" htmlFor="webhook-url">
            <Input
              id="webhook-url"
              value={draft.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://example.com/hooks/content"
              inputMode="url"
            />
          </Field>
          <Field label="Events">
            <div className="flex flex-col gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    checked={draft.events.includes(event)}
                    onCheckedChange={() => toggleEvent(event)}
                  />
                  <span className="font-mono text-xs">{event}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Secret" hint="Stored with the webhook; sent as nothing yet — reserved for HMAC signing.">
            <Input
              value={draft.secret}
              onChange={(e) => set("secret")(e.target.value)}
              placeholder="Optional signing secret"
              type="password"
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
            {cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WebhooksScreen() {
  const [rows, setRows] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listWebhooks(projectId), listProjectDeliveries(projectId, 50)]).then(
      ([hooks, logs]) => {
        if (!alive) return;
        setRows(hooks ?? []);
        setDeliveries(logs ?? []);
        setLoading(false);
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.url}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    const failed = deliveries.filter((d) => d.status === "Failed").length;
    return [
      { label: "Total webhooks", value: String(rows.length), footer: `${count((r) => r.status === "Active")} active` },
      { label: "Deliveries", value: String(deliveries.length), footer: "Recent attempts" },
      { label: "Failed", value: String(failed), footer: "Needs attention" },
    ];
  }, [rows, deliveries]);

  const handleCreate = async (draft) => {
    const optimistic = {
      id: newId(),
      name: draft.name.trim(),
      url: draft.url.trim(),
      events: draft.events,
      secret: draft.secret || "",
      status: "Active",
      hasSecret: Boolean(draft.secret),
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createWebhook({
      ...optimistic,
      secret: draft.secret || "",
    });
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the webhook to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleUpdate = async (draft) => {
    if (!editTarget) return;
    const prev = rows;
    const next = {
      ...editTarget,
      name: draft.name.trim(),
      url: draft.url.trim(),
      events: draft.events,
      hasSecret: editTarget.hasSecret || Boolean(draft.secret),
    };
    setRows((rows) => rows.map((r) => (r.id === next.id ? next : r)));
    setEditTarget(null);
    const patch = { name: next.name, url: next.url, events: next.events };
    if (draft.secret) patch.secret = draft.secret;
    const saved = await updateWebhook(next.id, patch);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
      return;
    }
    setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Webhook updated.");
  };

  const handleTogglePause = async (row) => {
    const prev = rows;
    const nextStatus = row.status === "Active" ? "Paused" : "Active";
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
    const saved = await updateWebhook(row.id, { status: nextStatus });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the webhook.");
      return;
    }
    toast.success(nextStatus === "Active" ? "Webhook resumed." : "Webhook paused.");
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteWebhook(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the webhook on the server.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = {
      ...row,
      id: newId(),
      name: `${row.name} (copy)`,
      status: "Paused",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createWebhook({
      name: optimistic.name,
      url: row.url,
      events: row.events,
      status: "Paused",
      secret: "",
      id: optimistic.id,
      projectId,
      createdBy: userId,
    });
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the webhook.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Duplicated "${row.name}".`);
  };

  const handleTest = async (row) => {
    const body = {
      event: "entry.published",
      payload: { test: true, webhookId: row.id },
      sentAt: new Date().toISOString(),
    };
    try {
      const res = await fetch(row.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text().catch(() => "");
      const logged = await logDelivery({
        webhookId: row.id,
        projectId,
        event: "entry.published",
        payload: body,
        status: res.ok ? "Delivered" : "Failed",
        attempts: 1,
        responseCode: res.status,
        responseBody: text,
      });
      if (logged) setDeliveries((prev) => [logged, ...prev].slice(0, 50));
      if (res.ok) toast.success("Test delivery succeeded.");
      else toast.error(`Test delivery failed (HTTP ${res.status}).`);
    } catch {
      const logged = await logDelivery({
        webhookId: row.id,
        projectId,
        event: "entry.published",
        payload: body,
        status: "Failed",
        attempts: 1,
        responseCode: null,
        responseBody: "fetch failed",
      });
      if (logged) setDeliveries((prev) => [logged, ...prev].slice(0, 50));
      toast.error("Test delivery failed — endpoint unreachable.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Webhook",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="font-mono text-xs text-text-secondary">{r.url || "—"}</span>
        </div>
      ),
    },
    {
      key: "events",
      header: "Events",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.events || []).map((e) => (
            <Badge key={e} variant="neutral">
              {e}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={WEBHOOK_STATUS_MAP} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            label={`Actions for ${r.name}`}
            items={[
              { icon: Pencil, label: "Edit", onSelect: () => setEditTarget(r) },
              { icon: FlaskConical, label: "Send test", onSelect: () => handleTest(r) },
              { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
              {
                icon: Pencil,
                label: r.status === "Active" ? "Pause" : "Resume",
                onSelect: () => handleTogglePause(r),
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
        </div>
      ),
    },
  ];

  const deliveryColumns = [
    {
      key: "event",
      header: "Event",
      render: (d) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-foreground">{d.event}</span>
          <span className="text-xs text-text-secondary">{formatDateTime(d.createdAt)}</span>
        </div>
      ),
    },
    {
      key: "webhook",
      header: "Webhook",
      render: (d) => (
        <span className="text-sm text-text-secondary">
          {rows.find((r) => r.id === d.webhookId)?.name || "Deleted webhook"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusPill status={d.status} map={DELIVERY_STATUS_MAP} />,
    },
    {
      key: "response",
      header: "Response",
      align: "right",
      className: "text-right",
      render: (d) => (
        <span className="font-mono text-xs text-text-secondary">
          {d.responseCode ?? "—"}
          {d.attempts > 1 ? ` · ${d.attempts} tries` : ""}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Webhooks"
        description="Outbound subscriptions fired on publish and unpublish — targets, events, and every delivery attempt."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create webhook
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search webhooks…"
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
                  icon={Webhook}
                  title={rows.length ? "No webhooks match your filters" : "No webhooks yet"}
                  description={
                    rows.length
                      ? "Try clearing the search."
                      : "Subscribe a URL to publish events and every fire lands in the delivery log below."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create webhook
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="webhooks" />

          <SectionCard title="Delivery log">
            <DataTable
              columns={deliveryColumns}
              data={deliveries}
              getRowKey={(d) => d.id}
              empty={
                <EmptyState
                  icon={Webhook}
                  title="No deliveries yet"
                  description="Publish an entry or send a test and the attempt is recorded here."
                />
              }
            />
          </SectionCard>
        </div>
      )}

      <WebhookDialog
        key="webhook-create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={EMPTY_DRAFT}
        onSubmit={handleCreate}
        title="Create webhook"
        cta="Create webhook"
      />
      <WebhookDialog
        key={editTarget ? `webhook-edit-${editTarget.id}` : "webhook-edit-closed"}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        initial={
          editTarget
            ? { name: editTarget.name, url: editTarget.url, events: editTarget.events, secret: "" }
            : EMPTY_DRAFT
        }
        onSubmit={handleUpdate}
        title="Edit webhook"
        cta="Save changes"
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Its delivery history stays in the log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
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

export default WebhooksScreen;
