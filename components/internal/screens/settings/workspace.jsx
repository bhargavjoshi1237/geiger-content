"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Loader2, Tag } from "lucide-react";

import { SecondaryScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  SettingRow,
  SettingsList,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Skeleton } from "@geiger/ui/skeleton";
import { getSettings, upsertSettings } from "@/lib/supabase/settings";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

export function WorkspaceScreen() {
  const { project, projectId } = useProject();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    let alive = true;
    // getSettings(null) resolves null, so no project still clears loading here.
    getSettings(projectId).then((row) => {
      if (!alive) return;
      setBrandName(row?.brandName || "");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const save = async () => {
    if (!projectId || saving) return;
    setSaving(true);
    const user = await getUser().catch(() => null);
    const saved = await upsertSettings(
      projectId,
      { brandName: brandName.trim() },
      user?.id ?? null,
    );
    setSaving(false);
    if (saved) {
      setBrandName(saved.brandName || "");
      toast.success("Workspace settings saved");
    } else {
      toast.error("Couldn't save workspace settings.");
    }
  };

  return (
    <SecondaryScreenWrapper>
      <ScreenHeader
        title="Workspace"
        description="Project identity and brand name for this workspace."
        actions={
          <Button onClick={save} disabled={loading || saving || !projectId}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      {!projectId ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No project selected"
          description="Select a project to manage its workspace settings."
        />
      ) : loading ? (
        <SectionCard title="Workspace">
          <div className="grid gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Workspace"
          description="How this project is identified across Content."
        >
          <SettingsList>
            <SettingRow
              title="Project"
              description={
                projectId ? `Active project · ${projectId}` : "Active project"
              }
              icon={BriefcaseBusiness}
              control={
                <span className="text-sm font-medium text-muted-foreground">
                  {project?.name || "Untitled project"}
                </span>
              }
            />
            <SettingRow
              title="Brand name"
              description="Shown in previews and delivery surfaces."
              icon={Tag}
              control={
                <Field label="Brand name">
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Geiger"
                    className="w-56"
                  />
                </Field>
              }
            />
          </SettingsList>
        </SectionCard>
      )}
    </SecondaryScreenWrapper>
  );
}

export default WorkspaceScreen;
