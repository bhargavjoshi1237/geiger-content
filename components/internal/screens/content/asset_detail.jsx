"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileImage,
  Settings2,
  Copy,
  ExternalLink,
} from "lucide-react";

import { EditorShell } from "@/components/internal/shared/editor_shell";
import { Field, SectionCard } from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import {
  ASSET_STATUS_MAP,
  ASSET_TYPE_MAP,
  ASSET_TYPES,
  formatBytes,
  formatDate,
} from "./constants";
import { updateAsset } from "@/lib/supabase/assets";

function OverviewSection({ asset, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      {asset?.url && asset?.fileType === "image" ? (
        <SectionCard title="Preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt={asset.alt || asset.name}
            className="max-h-64 w-full rounded-lg border border-border object-contain bg-surface-subtle"
          />
        </SectionCard>
      ) : null}
      <SectionCard title="Summary">
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={asset?.name || ""}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Asset name"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Folder">
              <Input
                value={asset?.folder || ""}
                onChange={(e) => patch({ folder: e.target.value })}
                placeholder="e.g. hero / docs"
              />
            </Field>
            <Field label="Alt text">
              <Input
                value={asset?.alt || ""}
                onChange={(e) => patch({ alt: e.target.value })}
                placeholder="Describe the asset…"
              />
            </Field>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function FileSection({ asset, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="File">
        <div className="grid gap-4">
          <Field label="URL">
            <Input
              value={asset?.url || ""}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Type">
              <Select
                value={asset?.fileType || "image"}
                onValueChange={(v) => patch({ fileType: v })}
              >
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
            <Field label="MIME">
              <Input
                value={asset?.mime || ""}
                onChange={(e) => patch({ mime: e.target.value })}
                placeholder="image/png"
              />
            </Field>
            <Field label="Size (bytes)">
              <Input
                type="number"
                min={0}
                value={asset?.sizeBytes ?? 0}
                onChange={(e) => patch({ sizeBytes: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <Field label="Status">
            <Select
              value={asset?.status || "Ready"}
              onValueChange={(v) => patch({ status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ASSET_STATUS_MAP).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

const NAV_GROUPS = [
  {
    group: null,
    items: [
      {
        key: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "Name, folder, and alt text.",
      },
    ],
  },
  {
    group: "General",
    items: [
      {
        key: "file",
        label: "File",
        icon: FileImage,
        desc: "URL, type, and status.",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: Settings2,
        desc: "File details and identifiers.",
      },
    ],
  },
];

const SECTIONS = {
  overview: OverviewSection,
  file: FileSection,
  settings: FileSection,
};

export function AssetDetailScreen({ asset, backLabel, onBack, onUpdate }) {
  const { section: active, setSection: setActive } = useWorkspaceUrl();
  const [form, setForm] = useState(asset);
  const [seedId, setSeedId] = useState(asset?.id);
  if (asset && asset.id !== seedId) {
    setSeedId(asset.id);
    setForm(asset);
  }

  if (!asset) return null;

  const patch = (partial) => setForm((f) => ({ ...f, ...partial }));

  const save = async () => {
    const saved = await updateAsset(form.id, form);
    if (!saved) {
      toast.error("Couldn't save your changes to the server.");
      return;
    }
    onUpdate?.(saved);
    setForm(saved);
    toast.success("Changes saved.");
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(form.url || "");
      toast.success("URL copied.");
    } catch {
      toast.error("Couldn't copy the URL.");
    }
  };

  const openUrl = () => {
    if (form.url && typeof window !== "undefined") {
      window.open(form.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <EditorShell
      searchable
      back={{ label: backLabel || "Assets", onClick: onBack }}
      title={form.name}
      status={form.status}
      statusMap={ASSET_STATUS_MAP}
      meta={
        [
          formatDate(form.updatedAt),
          ASSET_TYPE_MAP[form.fileType]?.label || form.fileType,
          form.folder ? `/${form.folder}` : null,
          form.sizeBytes ? formatBytes(form.sizeBytes) : null,
        ]
          .filter(Boolean)
          .join(" · ") || "No metadata yet"
      }
      actions={
        <>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={copyUrl}
            title="Copy URL"
            aria-label="Copy URL"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={openUrl}
            title="Open file"
            aria-label="Open file"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={save}
          >
            Save Changes
          </Button>
        </>
      }
      nav={NAV_GROUPS}
      subject={form}
      active={active}
      onActiveChange={setActive}
    >
      {({ activeItem }) => {
        const ActiveSection = SECTIONS[active] || SECTIONS.overview;
        return (
          <ActiveSection
            asset={form}
            headerItem={activeItem}
            onPatch={patch}
          />
        );
      }}
    </EditorShell>
  );
}

export default AssetDetailScreen;
