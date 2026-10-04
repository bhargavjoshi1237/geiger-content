"use client";
import { requestVector } from "./semantic";

// Live test feed (/api/feed): batches, engagement events, reader profiles and similarity search.
const feed = (operation, projectId, options = {}) => requestVector(operation, projectId, { ...options, service: "feed" });

export const feedStatus = (projectId) => feed("status", projectId);
export const feedProfile = (projectId, profile) => feed("profile", projectId, { query: { profile } });
export const feedNext = (projectId, profile) => feed("next", projectId, { method: "POST", body: { profile } });
export const feedEvents = (projectId, profile, events) => feed("events", projectId, { method: "POST", body: { profile, events } });
export const feedReset = (projectId, profile) => feed("reset", projectId, { method: "POST", body: { profile } });
export const feedSimilar = (projectId, postId) => feed("similar", projectId, { method: "POST", body: { postId } });
export const feedSearch = (projectId, query) => feed("search", projectId, { method: "POST", body: { query } });
