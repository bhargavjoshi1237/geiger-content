"use client";
import { requestOperation } from "./delivery_ops";

export async function getAssistant(projectId) {
  const result = await requestOperation("assistant", projectId);
  return result.ok ? result.data : null;
}

export async function askAssistant(projectId, prompt, entryId) {
  return requestOperation("assistant", projectId, { prompt, entryId: entryId || null });
}
