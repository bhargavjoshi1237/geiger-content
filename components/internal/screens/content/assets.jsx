"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PackageOpen,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
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
  StatsBar,
  StatusPill,
  Toolbar,
  Field,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
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
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  ASSET_STATUS_MAP,
  ASSET_TYPE_MAP,
  ASSET_TYPES,
  formatBytes,
  formatDate,
  newId,
} from "./constants";
import {
  createAsset,
  listAssets,
  softDeleteAsset,
  updateAsset,
} from "@/lib/supabase/assets";
import { removeAsset, uploadAsset } from "@/lib/supabase/storage";
import { getUser } from "@/lib/supabase/user";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { useCan } from "@/context/rbac-context";
import { AssetDetailScreen } from "./asset_detail";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...ASSET_TYPES.map((t) => ({
    value: t,
    label: ASSET_TYPE_MAP[t]?.label || t,
  })),
];

function CreateAssetDialog({ open, onOpenChange, onCreate, onCreateWithFile }) {
  const [mode, setMode] = useState("upload");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fileType, setFileType] = useState("image");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const pickFile = (next) => {
    if (!next) return;
    setFile(next);
    if (next.type?.startsWith("image/")) setFileType("image");
    else if (next.type?.startsWith("video/")) setFileType("video");
    else if (next.type?.startsWith("audio/")) setFileType("audio");
    else if (next.type === "application/pdf") setFileType("document");
    if (!name.trim()) {
      setName(
        String(next.name || "")
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim(),
      );
    }
  };

  const reset = () => {
    setName("");
    setUrl("");
    setFileType("image");
    setFolder("");
    setFile(null);
    setDragOver(false);
    setBusy(false);
  };

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      toast.error("Give your asset a name first.");
      return;
    }
    if (mode === "url") {
      if (!url.trim()) {
        toast.error("Add a file URL first.");
        return;
      }
      onCreate({ name: name.trim(), url: url.trim(), fileType, folder });
      reset();
      onOpenChange(false);
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload first.");
      return;
    }
    setBusy(true);
    await onCreateWithFile({
      name: name.trim(),
      folder,
      fileType,
      file,
    });
    setBusy(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>Add asset</DialogTitle>
          <DialogDescription>
            Register a file in the media library. Entries can reference it by
            URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === "upload" ? "default" : "outline"}
              className={
                mode === "upload"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              }
              onClick={() => setMode("upload")}
            >
              <Upload className="h-4 w-4" /> Upload
            </Button>
            <Button
              type="button"
              variant={mode === "url" ? "default" : "outline"}
              className={
                mode === "url"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              }
              onClick={() => setMode("url")}
            >
              <Link2 className="h-4 w-4" /> URL
            </Button>
          </div>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Homepage hero"
              autoFocus
            />
          </Field>
          {mode === "upload" ? (
            <Field label="File">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface-subtle hover:bg-surface-active"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                {file ? (
                  <>
                    <span className="text-sm font-medium text-foreground">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                      {file.type ? ` · ${file.type}` : ""}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Choose a different file
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Drop a file here or click to browse
                    </span>
                    <span className="text-xs text-text-tertiary">
                      Images, video, or PDF
                    </span>
                  </>
                )}
              </div>
            </Field>
          ) : (
            <Field label="File URL">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ASSET_TYPE_MAP[t]?.label || t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Folder">
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. hero"
              />
            </Field>
          </div>
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
            disabled={busy}
          >
            {busy ? "Uploading…" : mode === "upload" ? "Upload asset" : "Add asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssetsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { assetId, openAsset, closeAsset } = useWorkspaceUrl();
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);
  // Advisory gating: hidden for roles without the upload capability.
  const canCreate = useCan("content.asset.upload");

  const selected = useMemo(
    () => (assetId ? rows.find((r) => r.id === assetId) || null : null),
    [assetId, rows],
  );

  useEffect(() => {
    let alive = true;
    listAssets(projectId).then((result) => {
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
    return rows.filter((r) => {
      if (fileType !== "all" && r.fileType !== fileType) return false;
      if (
        search &&
        !`${r.name} ${r.folder} ${r.mime}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, fileType]);

  const pager = usePagination(filtered, { resetKey: `${search}|${fileType}` });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    const bytes = rows.reduce((n, r) => n + (r.sizeBytes || 0), 0);
    return [
      { label: "Total assets", value: String(rows.length), footer: formatBytes(bytes) || "Library size" },
      { label: "Images", value: String(count((r) => r.fileType === "image")), footer: "Image files" },
      { label: "Video", value: String(count((r) => r.fileType === "video")), footer: "Video files" },
      { label: "Documents", value: String(count((r) => r.fileType === "document")), footer: "Doc files" },
    ];
  }, [rows]);

  const handleCreate = async ({ name, url, fileType: ft, folder }) => {
    const optimistic = {
      id: newId(),
      name,
      folder: folder || "",
      fileType: ft || "image",
      mime: "",
      sizeBytes: 0,
      url,
      alt: "",
      status: "Ready",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createAsset(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the asset to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" added.`);
  };

  const handleCreateWithFile = async ({ name, folder, fileType: ft, file }) => {
    if (!file) {
      toast.error("Choose a file to upload first.");
      return;
    }
    const id = newId();
    const inferred = file.type?.startsWith("image/")
      ? "image"
      : file.type?.startsWith("video/")
        ? "video"
        : file.type?.startsWith("audio/")
          ? "audio"
          : "other";
    const optimistic = {
      id,
      name,
      folder: folder || "",
      fileType: ft || inferred,
      mime: file.type || "",
      sizeBytes: file.size || 0,
      url: "",
      alt: "",
      status: "Processing",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const uploaded = await uploadAsset({
      projectId,
      assetId: id,
      file,
      userId,
    });
    if (!uploaded) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Upload failed. Check the file and try again.");
      return;
    }
    const saved = await createAsset({
      ...optimistic,
      url: uploaded.publicUrl,
      mime: uploaded.mime,
      sizeBytes: uploaded.sizeBytes,
      contentHash: uploaded.contentHash,
      status: "Ready",
    });
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      await removeAsset(uploaded.path);
      toast.error("Couldn't save the asset to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" uploaded.`);
  };

  const handleUpdate = async (updated) => {
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    const saved = await updateAsset(updated.id, updated);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteAsset(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the asset on the server.");
    }
  };

  const handleCopyUrl = async (row) => {
    try {
      await navigator.clipboard.writeText(row.url || "");
      toast.success("URL copied.");
    } catch {
      toast.error("Couldn't copy the URL.");
    }
  };

  const handleOpenUrl = (row) => {
    if (row.url && typeof window !== "undefined") {
      window.open(row.url, "_blank", "noopener,noreferrer");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Asset",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {r.folder ? `/${r.folder} · ` : ""}
            {r.mime || ASSET_TYPE_MAP[r.fileType]?.label || r.fileType}
            {r.sizeBytes ? ` · ${formatBytes(r.sizeBytes)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={ASSET_TYPE_MAP[r.fileType]?.variant || "neutral"}>
          {ASSET_TYPE_MAP[r.fileType]?.label || r.fileType}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={ASSET_STATUS_MAP} />,
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(r.updatedAt)}
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
          label={`Actions for ${r.name}`}
          items={[
            { icon: Pencil, label: "Edit", onSelect: () => openAsset(r.id) },
            { icon: Copy, label: "Copy URL", onSelect: () => handleCopyUrl(r) },
            { icon: ExternalLink, label: "Open file", onSelect: () => handleOpenUrl(r) },
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

  if (selected) {
    return (
      <AssetDetailScreen
        asset={selected}
        onBack={closeAsset}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Assets"
        description="Images, video, documents, and other media used by entries — with folders, metadata, and usage references."
        actions={
          canCreate ? (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add asset
            </Button>
          ) : null
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={fileType}
            onValueChange={setFileType}
            options={TYPE_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search assets, folders…"
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
            onRowClick={(r) => openAsset(r.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={PackageOpen}
                  title={rows.length ? "No assets match your filters" : "No assets yet"}
                  description={
                    rows.length
                      ? "Try clearing the search or filters, or add a new asset."
                      : "Add your first asset to start building the media library."
                  }
                  action={
                    canCreate ? (
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="h-4 w-4" /> Add asset
                      </Button>
                    ) : null
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="assets" />
        </div>
      )}

      <CreateAssetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        onCreateWithFile={handleCreateWithFile}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Entries referencing its URL will break.
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

export default AssetsScreen;
