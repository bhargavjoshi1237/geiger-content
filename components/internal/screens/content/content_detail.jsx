"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { EditorShell } from "@/components/internal/shared/editor_shell";
import { Button } from "@geiger/ui/button";

import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { CONTENT_STATUS_MAP, formatDate } from "./constants";
import { NAV_GROUPS, SECTIONS } from "./content_sections";
import { updateContent } from "@/lib/supabase/content";

export function ContentDetailScreen({ content, backLabel, onBack, onUpdate }) {
  const { section: active, setSection: setActive } = useWorkspaceUrl();
  const [form, setForm] = useState(content);
  const [seedId, setSeedId] = useState(content?.id);
  if (content && content.id !== seedId) {
    setSeedId(content.id);
    setForm(content);
  }

  if (!content) return null;

  const patch = (partial) => setForm((f) => ({ ...f, ...partial }));

  const commit = (partial) => {
    const next = { ...form, ...partial };
    setForm(next);
    onUpdate?.(next);
  };

  const save = async () => {
    const next = { ...form };
    const saved = await updateContent(form.id, next);
    if (!saved) {
      toast.error("Couldn't save your changes to the server.");
      return;
    }
    onUpdate?.(saved);
    toast.success("Changes saved.");
  };

  const viewLive = () => {
    if (typeof window !== "undefined") {
      window.open(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/c/${form.id}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  return (
    <EditorShell
      searchable
      back={{ label: backLabel || "All Content", onClick: onBack }}
      title={form.title}
      status={form.status}
      statusMap={CONTENT_STATUS_MAP}
      meta={
        [formatDate(form.updatedAt), form.type, form.slug]
          .filter(Boolean)
          .join(" · ") || "No metadata yet"
      }
      actions={
        <>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={viewLive}
            title="View live page"
            aria-label="View live page"
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
            content={form}
            headerItem={activeItem}
            onPatch={patch}
            onCommit={commit}
            onNavigate={setActive}
            onViewLive={viewLive}
          />
        );
      }}
    </EditorShell>
  );
}

export default ContentDetailScreen;
