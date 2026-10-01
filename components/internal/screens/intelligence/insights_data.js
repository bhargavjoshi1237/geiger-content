"use client";
import { useEffect, useState } from "react";
import { useProject } from "@/context/project-context";
import { requestVector } from "@/lib/supabase/semantic";

export function useInsights(operation, query = {}) {
  const { projectId } = useProject();
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const signature = JSON.stringify(query);
  const key = `${projectId}:${operation}:${signature}:${revision}`;
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    requestVector(operation, projectId, { query: JSON.parse(signature) }).then((value) => {
      if (alive) setResult({ key, value });
    });
    return () => { alive = false; };
  }, [projectId, operation, signature, key]);
  const value = result?.key === key ? result.value : null;
  return {
    data: value?.ok ? value.data : null,
    loading: Boolean(projectId && !value),
    error: !projectId ? "Choose a project to view intelligence." : value && !value.ok ? value.error : "",
    refresh: () => setRevision((r) => r + 1),
  };
}

export function exportInsights(title, rows) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replaceAll(" ", "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const similarityLabel = (score) => `${(Number(score) * 100).toFixed(1)}%`;
