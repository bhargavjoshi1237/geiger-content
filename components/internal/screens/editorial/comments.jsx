"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, MessageSquareText, Plus, Undo2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
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
import { listContent } from "@/lib/supabase/content";
import {
  createComment,
  listComments,
  resolveThread,
} from "@/lib/supabase/comments";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { formatDateTime, newId } from "./constants";

const THREAD_STATUS_MAP = {
  open: { label: "Open", variant: "info", dotClass: "bg-sky-400" },
  resolved: { label: "Resolved", variant: "success", dotClass: "bg-emerald-400" },
};

function NewThreadDialog({ entries, onClose, onSave }) {
  const [entryId, setEntryId] = useState(() => entries[0]?.id || "");
  const [fieldKey, setFieldKey] = useState("");
  const [body, setBody] = useState("");
  const submit = () => {
    if (!entryId || !body.trim()) {
      toast.error("Pick an entry and write the comment first.");
      return;
    }
    onSave({ entryId, fieldKey: fieldKey.trim(), body: body.trim() });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
          <DialogDescription>
            Open a field-anchored discussion on an entry. @mentions notify teammates.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Entry">
            <Select value={entryId} onValueChange={setEntryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an entry" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Field key" hint="Optional — which field this is about.">
            <Input
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g. standfirst"
            />
          </Field>
          <Field label="Comment">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What needs attention? @name to mention…"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            Start thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseMentions(body) {
  const found = String(body || "").match(/@[\w.-]+/g) || [];
  return Array.from(new Set(found));
}

export function CommentsScreen() {
  const [comments, setComments] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replyFor, setReplyFor] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listComments(projectId), listContent(projectId)]).then(
      ([commentRows, entryRows]) => {
        if (!alive) return;
        setComments(commentRows ?? []);
        setEntries(entryRows ?? []);
        setLoading(false);
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const entryById = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e])),
    [entries],
  );

  const threads = useMemo(() => {
    const groups = new Map();
    for (const c of comments) {
      const key = c.threadId || c.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    return Array.from(groups.entries())
      .map(([threadId, replies]) => {
        const sorted = [...replies].sort((a, b) =>
          String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
        );
        return {
          threadId,
          entry: entryById[sorted[0].entryId],
          fieldKey: sorted[0].fieldKey,
          resolved: sorted.every((r) => r.resolved),
          replies: sorted,
          latest: sorted[sorted.length - 1]?.createdAt || "",
        };
      })
      .sort((a, b) => String(b.latest).localeCompare(String(a.latest)));
  }, [comments, entryById]);

  const filtered = useMemo(
    () =>
      threads.filter((t) => {
        if (filter === "open" && t.resolved) return false;
        if (filter === "resolved" && !t.resolved) return false;
        if (
          search &&
          !`${t.entry?.title || ""} ${t.fieldKey} ${t.replies.map((r) => r.body).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [threads, search, filter],
  );

  const stats = useMemo(
    () => [
      { label: "Threads", value: String(threads.length) },
      {
        label: "Open",
        value: String(threads.filter((t) => !t.resolved).length),
        footer: "Need a reply or resolve",
      },
      {
        label: "Replies",
        value: String(comments.length),
        footer: "Across all threads",
      },
    ],
    [threads, comments],
  );

  const handleNewThread = async ({ entryId, fieldKey, body }) => {
    const optimistic = {
      id: newId(),
      entryId,
      fieldKey,
      threadId: "",
      body,
      mentions: parseMentions(body),
      resolved: false,
      createdBy: userId,
      projectId,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [optimistic, ...prev]);
    const saved = await createComment(optimistic);
    if (!saved) {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      toast.error("Couldn't post the comment.");
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    toast.success("Thread started.");
  };

  const handleReply = async (thread) => {
    if (!replyBody.trim()) {
      toast.error("Write the reply first.");
      return;
    }
    const first = thread.replies[0];
    const optimistic = {
      id: newId(),
      entryId: first.entryId,
      fieldKey: first.fieldKey,
      threadId: thread.threadId,
      body: replyBody.trim(),
      mentions: parseMentions(replyBody),
      resolved: false,
      createdBy: userId,
      projectId,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [optimistic, ...prev]);
    setReplyBody("");
    setReplyFor(null);
    const saved = await createComment(optimistic);
    if (!saved) {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      toast.error("Couldn't post the reply.");
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    toast.success("Reply posted.");
  };

  const handleResolve = async (thread, resolved) => {
    const prev = comments;
    setComments((rows) =>
      rows.map((c) =>
        (c.threadId || c.id) === thread.threadId ? { ...c, resolved } : c,
      ),
    );
    const ok = await resolveThread(thread.threadId, resolved);
    if (!ok) {
      setComments(prev);
      toast.error("Couldn't update the thread on the server.");
      return;
    }
    toast.success(resolved ? "Thread resolved." : "Thread reopened.");
  };

  const columns = [
    {
      key: "thread",
      header: "Thread",
      render: (t) => (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">
              {t.entry?.title || "Deleted entry"}
            </span>
            {t.fieldKey ? (
              <Badge variant="neutral">{t.fieldKey}</Badge>
            ) : null}
            <StatusPill
              status={t.resolved ? "resolved" : "open"}
              map={THREAD_STATUS_MAP}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            {t.replies.map((r) => (
              <p key={r.id} className="text-sm text-text-secondary">
                {r.body}
                <span className="ml-2 text-xs text-text-tertiary">
                  {formatDateTime(r.createdAt)}
                </span>
              </p>
            ))}
          </div>
          {replyFor === t.threadId ? (
            <div className="flex items-center gap-2">
              <Input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReply(t);
                  }
                }}
              />
              <Button size="sm" onClick={() => handleReply(t)}>
                Post
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyFor(t.threadId);
                  setReplyBody("");
                }}
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolve(t, !t.resolved)}
              >
                {t.resolved ? (
                  <>
                    <Undo2 className="h-3 w-3" /> Reopen
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-3 w-3" /> Resolve
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Comments & Mentions"
        description="Every open thread across entries, with resolve and reply."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" /> New thread
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex items-center gap-2">
          {["all", "open", "resolved"].map((v) => (
            <Badge
              key={v}
              variant={filter === v ? "info" : "neutral"}
              className="cursor-pointer"
              onClick={() => setFilter(v)}
            >
              {v === "all" ? "All" : THREAD_STATUS_MAP[v].label}
            </Badge>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search threads…"
        />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(t) => t.threadId}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={MessageSquareText}
                title={threads.length ? "No threads match your filters" : "No threads yet"}
                description="Discuss entries field-by-field; @mention teammates to pull them in."
                action={
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> New thread
                  </Button>
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <NewThreadDialog
          entries={entries}
          onClose={() => setDialogOpen(false)}
          onSave={handleNewThread}
        />
      )}
    </MainScreenWrapper>
  );
}

export default CommentsScreen;
