"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/user";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

// Active-project context for the Content workspace. The dashboard is scoped to
// one project at a time; the active project lives in the URL (/project/<uuid>,
// via useWorkspaceUrl) so a refresh or shared link stays on it. localStorage
// only remembers the last choice to pre-select it on a fresh visit. Projects are
// the shared suite entity public.projects — read through a public-schema client.

const ProjectContext = createContext(undefined);

const LAST_PROJECT_KEY = "geiger-content:last-project";

// The project to open when none is in the URL: the last-used one (if still
// valid), else the first. Returns null for an empty list.
export function pickDefaultProjectId(projects) {
  if (!projects || projects.length === 0) return null;
  try {
    const remembered = window.localStorage.getItem(LAST_PROJECT_KEY);
    if (remembered && projects.some((p) => p.id === remembered)) {
      return remembered;
    }
  } catch {
    // ignore storage failures
  }
  return projects[0].id;
}

// A public-schema view of the base client. public.projects and the org
// bootstrap RPC are shared suite tables, outside this app's own schema.
function publicClient() {
  return createClient().schema("public");
}

function slugify(name) {
  return (
    String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "project"
  );
}

export function ProjectProvider({ children }) {
  const { projectId, setProject } = useWorkspaceUrl();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pure fetch of the caller's projects (RLS returns only orgs they belong to).
  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured()) return [];
    try {
      const sb = publicClient();
      const { data, error } = await sb
        .from("projects")
        .select("id, name, slug, organization_id, created_by")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[project-context] load", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("[project-context] load", e);
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    const rows = await fetchProjects();
    setProjects(rows);
    setLoading(false);
    return rows;
  }, [fetchProjects]);

  // Load once on mount.
  useEffect(() => {
    let alive = true;
    fetchProjects().then((rows) => {
      if (!alive) return;
      setProjects(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [fetchProjects]);

  // Remember the last valid active project so /project (and a fresh visit) can
  // reopen it.
  useEffect(() => {
    if (loading || !projectId) return;
    if (!projects.some((p) => p.id === projectId)) return;
    try {
      window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, [loading, projects, projectId]);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId],
  );

  // Create a project against the caller's organization (bootstrapping one if
  // needed), then select it.
  const createProject = useCallback(
    async (name) => {
      if (!isSupabaseConfigured()) return null;
      try {
        const sb = publicClient();
        const user = await getUser();
        const { data: organizationId, error: orgError } = await sb.rpc(
          "flow_ensure_user_organization",
        );
        if (orgError) {
          console.error("[project-context] ensureOrg", orgError.message);
          return null;
        }
        const { data, error } = await sb
          .from("projects")
          .insert({
            name: name?.trim() || "Untitled project",
            slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
            organization_id: organizationId ?? null,
            created_by: user?.id ?? null,
            status: "active",
          })
          .select("id, name, slug, organization_id, created_by")
          .single();
        if (error) {
          console.error("[project-context] create", error.message);
          return null;
        }
        setProjects((prev) => [...prev, data]);
        setProject(data.id);
        return data;
      } catch (e) {
        console.error("[project-context] create", e);
        return null;
      }
    },
    [setProject],
  );

  const value = useMemo(
    () => ({
      project,
      projectId: project?.id || null,
      projects,
      loading,
      setActiveProject: setProject,
      createProject,
      refresh,
    }),
    [project, projects, loading, setProject, createProject, refresh],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (ctx === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
