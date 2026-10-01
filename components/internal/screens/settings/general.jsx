"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Languages, Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { Skeleton } from "@geiger/ui/skeleton";
import { getSettings, upsertSettings } from "@/lib/supabase/settings";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const LOCALE_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "en-IN", label: "English — India (en-IN)" },
  { value: "de", label: "Deutsch (de)" },
];

const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Kolkata",
  "Europe/Berlin",
  "America/New_York",
];

export function GeneralScreen() {
  const { projectId } = useProject();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultLocale, setDefaultLocale] = useState("en");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    let alive = true;
    // getSettings(null) resolves null, so no project still clears loading here.
    getSettings(projectId).then((row) => {
      if (!alive) return;
      if (row) {
        setDefaultLocale(row.defaultLocale || "en");
        setTimezone(row.timezone || "UTC");
      }
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
      { defaultLocale, timezone },
      user?.id ?? null,
    );
    setSaving(false);
    if (saved) {
      toast.success("General settings saved");
    } else {
      toast.error("Couldn't save general settings.");
    }
  };

  return (
    <SecondaryScreenWrapper>
      <ScreenHeader
        title="General"
        description="Default locale and timezone applied to this project's content."
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
          icon={Globe}
          title="No project selected"
          description="Select a project to manage its general settings."
        />
      ) : loading ? (
        <SectionCard title="Localization">
          <div className="grid gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Localization"
          description="Used for scheduling, formatting, and new entries."
        >
          <SettingsList>
            <SettingRow
              title="Default locale"
              description="Language new entries are authored in."
              icon={Languages}
              control={
                <Field label="Default locale">
                  <Select
                    value={defaultLocale}
                    onValueChange={setDefaultLocale}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select locale" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              }
            />
            <SettingRow
              title="Timezone"
              description="Used for scheduled publishing times."
              icon={Globe}
              control={
                <Field label="Timezone">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              }
            />
          </SettingsList>
        </SectionCard>
      )}
    </SecondaryScreenWrapper>
  );
}

export default GeneralScreen;
