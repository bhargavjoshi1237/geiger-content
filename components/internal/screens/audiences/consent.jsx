"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { CONSENT_PURPOSES, CONSENT_STATUS_MAP } from "./constants";
import {
  listConsent,
  setConsent,
} from "@/lib/supabase/consent";
import { listProfiles } from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

export function ConsentScreen() {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState([]);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listProfiles(projectId).then(async (result) => {
      if (!alive) return;
      const list = result ?? [];
      setProfiles(list);
      if (list.length && !profileId) setProfileId(list[0].id);
      setLoading(false);
      // Overview counts across every profile (best-effort, one batch).
      const all = await Promise.all(list.map((p) => listConsent(p.id)));
      if (alive) setOverview(all.flatMap((r) => r || []));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    listConsent(profileId).then((result) => {
      if (alive) setRows(result ?? []);
    });
    return () => {
      alive = false;
    };
  }, [profileId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId],
  );

  const purposes = useMemo(() => {
    const byPurpose = new Map(rows.map((r) => [r.purpose, r]));
    return CONSENT_PURPOSES.map(
      (purpose) =>
        byPurpose.get(purpose) || {
          id: purpose,
          profileId,
          purpose,
          status: "pending",
          unsaved: true,
        },
    );
  }, [rows, profileId]);

  const stats = useMemo(() => {
    const count = (s) => overview.filter((r) => r.status === s).length;
    return [
      { label: "Granted", value: String(count("granted")), footer: "Purposes allowed" },
      { label: "Denied", value: String(count("denied")), footer: "Purposes suppressed" },
      { label: "Pending", value: String(count("pending")), footer: "Never answered" },
      { label: "Profiles covered", value: String(profiles.length), footer: "In project" },
    ];
  }, [overview, profiles.length]);

  const handleChange = async (purpose, status) => {
    const prev = rows;
    setRows((rows) => {
      const next = rows.filter((r) => r.purpose !== purpose);
      return [
        ...next,
        {
          id: purpose,
          profileId,
          purpose,
          status,
          updatedAt: new Date().toISOString(),
        },
      ];
    });
    const saved = await setConsent(profileId, purpose, status);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save consent on the server.");
      return;
    }
    setRows((rows) => rows.map((r) => (r.purpose === purpose ? saved : r)));
    setOverview((all) => {
      const next = all.filter(
        (r) => !(r.profileId === profileId && r.purpose === purpose),
      );
      return [...next, saved];
    });
    toast.success(`${purpose}: ${status}.`);
  };

  const columns = [
    {
      key: "purpose",
      header: "Purpose",
      render: (r) => (
        <span className="font-medium capitalize text-foreground">
          {r.purpose}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={CONSENT_STATUS_MAP} />,
    },
    {
      key: "change",
      header: "Change",
      align: "right",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={r.status}
            onValueChange={(v) => handleChange(r.purpose, v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["granted", "denied", "pending"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Consent State"
        description="Per-profile, per-purpose consent. Reads default to allow — only an explicit denial suppresses a purpose."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <Select
          value={profileId}
          onValueChange={(id) => {
            setProfileId(id);
            setRows([]);
          }}
        >
          <SelectTrigger className="w-72">
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
          data={purposes}
          getRowKey={(r) => r.purpose}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={ShieldCheck}
                title="No profiles yet"
                description="Consent rows appear once profiles exist."
              />
            </div>
          }
        />
      )}
      {selected ? (
        <p className="text-xs text-text-secondary">
          Showing consent for {selected.primaryIdentifier}. Unanswered purposes
          count as pending (allowed until denied).
        </p>
      ) : null}
    </MainScreenWrapper>
  );
}

export default ConsentScreen;
