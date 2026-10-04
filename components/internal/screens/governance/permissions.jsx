"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FlaskConical, LockKeyhole } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
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
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { PERMISSION_RESULT_MAP } from "./constants";
import { WORKSPACE_PERMISSIONS } from "@/lib/rbac";
import { evaluatePermission } from "@/lib/supabase/rbac";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const GROUPS = Array.from(
  new Set(WORKSPACE_PERMISSIONS.map((p) => p.group || "Other")),
);

const GROUP_FILTER_OPTIONS = [
  { value: "all", label: "All groups" },
  ...GROUPS.map((g) => ({ value: g, label: g })),
];

export function PermissionsScreen() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [testUserId, setTestUserId] = useState("");
  const [testKey, setTestKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const { projectId } = useProject();

  useEffect(() => {
    getUser().then((u) => {
      if (u?.id) setTestUserId((prev) => prev || u.id);
    });
  }, []);

  const filtered = useMemo(() => {
    return WORKSPACE_PERMISSIONS.filter((p) => {
      if (group !== "all" && (p.group || "Other") !== group) return false;
      if (
        search &&
        !`${p.key} ${p.label}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [search, group]);

  const pager = usePagination(filtered, { resetKey: `${search}|${group}` });

  const stats = useMemo(() => {
    const viewKeys = WORKSPACE_PERMISSIONS.filter((p) =>
      p.key.endsWith(".view"),
    ).length;
    return [
      { label: "Permission keys", value: String(WORKSPACE_PERMISSIONS.length), footer: `${GROUPS.length} groups` },
      { label: "View keys", value: String(viewKeys), footer: "Gate navigation" },
      {
        label: "Operation keys",
        value: String(WORKSPACE_PERMISSIONS.length - viewKeys),
        footer: "Gate actions + RLS",
      },
      { label: "Groups", value: String(GROUPS.length), footer: "Catalog sections" },
    ];
  }, []);

  const runTest = async () => {
    if (!projectId || !testUserId.trim() || !testKey) {
      setResult(null);
      return;
    }
    setTesting(true);
    // Read-only RPC: returns the winning grant path; nothing is written.
    const outcome = await evaluatePermission(
      projectId,
      testUserId.trim(),
      testKey,
    );
    setTesting(false);
    setResult(outcome);
  };

  const columns = [
    {
      key: "key",
      header: "Permission key",
      render: (p) => (
        <span className="whitespace-nowrap font-mono text-sm text-foreground">
          {p.key}
        </span>
      ),
    },
    {
      key: "label",
      header: "Label",
      render: (p) => (
        <span className="text-sm text-text-secondary">{p.label}</span>
      ),
    },
    {
      key: "group",
      header: "Group",
      render: (p) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {p.group}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Permissions"
        description="The permission catalog every role is composed from — plus a read-only tester that evaluates any user against any key."
      />

      <StatsBar stats={stats} />

      <SectionCard
        title="Permission tester"
        description="Evaluate one user's grants against one capability via the database. Read-only — nothing is granted or changed."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label="User id" htmlFor="permission-test-user">
            <Input
              id="permission-test-user"
              value={testUserId}
              onChange={(e) => {
                setTestUserId(e.target.value);
                setResult(null);
              }}
              placeholder="UUID of the user to test"
            />
          </Field>
          <Field label="Permission" htmlFor="permission-test-key">
            <Select
              value={testKey}
              onValueChange={(v) => {
                setTestKey(v);
                setResult(null);
              }}
            >
              <SelectTrigger id="permission-test-key" className="w-full min-w-0 [&_[data-slot=select-value]]:truncate">
                <SelectValue placeholder="Select a permission key" />
              </SelectTrigger>
              <SelectContent>
                {WORKSPACE_PERMISSIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              onClick={runTest}
              disabled={testing || !projectId || !testUserId.trim() || !testKey}
            >
              <FlaskConical className="h-4 w-4" />
              {testing ? "Testing…" : "Evaluate"}
            </Button>
          </div>
        </div>
        {result ? (
          <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                status={result.allowed ? "allowed" : "denied"}
                map={PERMISSION_RESULT_MAP}
              />
              <span className="break-all font-mono text-xs text-text-secondary">
                {testKey}
              </span>
              {result.roleName ? (
                <span className="text-sm text-foreground">
                  via {result.roleName}
                </span>
              ) : null}
            </div>
            {result.patterns?.length ? (
              <p className="break-all font-mono text-xs text-text-secondary">
                matched: {result.patterns.join(", ")}
              </p>
            ) : null}
            {result.scope && Object.keys(result.scope).length > 0 ? (
              <p className="break-all font-mono text-xs text-text-secondary">
                scope: {JSON.stringify(result.scope)}
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={group}
            onValueChange={setGroup}
            options={GROUP_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search keys, labels…"
        />
      </Toolbar>

      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(p) => p.key}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={LockKeyhole}
                title="No permissions match your filters"
                description="Try a different search or group."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setGroup("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="permissions" />
      </div>
    </MainScreenWrapper>
  );
}

export default PermissionsScreen;
