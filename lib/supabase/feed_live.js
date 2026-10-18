"use client";
import { requestVector } from "./semantic";

// Live test feed (/api/feed): batches, engagement events, reader profiles, algorithm controls and similarity search.
const feed = (operation, projectId, options = {}) => requestVector(operation, projectId, { ...options, service: "feed" });

export const feedStatus = (projectId) => feed("status", projectId);
export const feedProfile = (projectId, profile) => feed("profile", projectId, { query: { profile } });
export const feedNext = (projectId, profile) => feed("next", projectId, { method: "POST", body: { profile } });
export const feedEvents = (projectId, profile, events) => feed("events", projectId, { method: "POST", body: { profile, events } });
export const feedSettings = (projectId, profile, settings) => feed("settings", projectId, { method: "POST", body: { profile, settings } });
// scope: "all" (default) | "topic" (id = area or subject path) | "emotion" | "knowledge".
export const feedReset = (projectId, profile, scope, id) => feed("reset", projectId, { method: "POST", body: { profile, ...(scope ? { scope } : {}), ...(id ? { id } : {}) } });
// action: "add" ({ text }) | "remove" ({ id }) | "list".
export const feedSteering = (projectId, profile, action, payload = {}) => feed("steering", projectId, { method: "POST", body: { ...payload, profile, action } });
// payload: { scope: "item" | "topic" | "session", id?, on? }.
export const feedExclude = (projectId, profile, payload = {}) => feed("exclude", projectId, { method: "POST", body: { ...payload, profile } });
// action: "get" | "dismiss" ({ sub }).
export const feedProbe = (projectId, profile, action, payload = {}) => feed("probe", projectId, { method: "POST", body: { ...payload, profile, action } });
export const feedSimilar = (projectId, postId) => feed("similar", projectId, { method: "POST", body: { postId } });
export const feedSearch = (projectId, query) => feed("search", projectId, { method: "POST", body: { query } });
