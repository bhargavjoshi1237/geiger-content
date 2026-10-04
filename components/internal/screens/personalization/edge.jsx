"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  Field,
  ScreenHeader,
  SectionCard,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";

// Edge Decisions: live inspector over POST /api/decide. Type a slot key plus
// profile/context JSON, see the winning entry and the human-readable reason.
export function EdgeScreen() {
  const [slotKey, setSlotKey] = useState("");
  const [profile, setProfile] = useState('{\n  "segment": "subscriber"\n}');
  const [context, setContext] = useState('{\n  "locale": "en",\n  "device": "desktop"\n}');
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const inspect = async () => {
    setError("");
    setResult(null);
    let profileObj = {};
    let contextObj = {};
    try {
      profileObj = profile.trim() ? JSON.parse(profile) : {};
      contextObj = context.trim() ? JSON.parse(context) : {};
    } catch {
      setError("Profile or context is not valid JSON.");
      return;
    }
    if (!slotKey.trim()) {
      setError("Enter a slot key first.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey: slotKey.trim(), profile: profileObj, context: contextObj }),
      });
      const json = await res.json();
      setResult(json);
    } catch {
      setError("The decision request failed. Is the database configured?");
    } finally {
      setPending(false);
    }
  };

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Edge Decisions"
        description="Inspect what the decision engine serves for any slot, profile and context — with the reason attached."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={pending} onClick={inspect}>
            <Zap className="h-4 w-4" /> {pending ? "Deciding…" : "Run decision"}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Request" description="Slot key plus the profile and context bags the rules match against.">
          <div className="grid gap-4">
            <Field label="Slot key">
              <Input value={slotKey} onChange={(e) => setSlotKey(e.target.value)} placeholder="e.g. homepage_hero" />
            </Field>
            <Field label="Profile (JSON)">
              <Textarea value={profile} onChange={(e) => setProfile(e.target.value)} rows={5} className="font-mono text-xs" />
            </Field>
            <Field label="Context (JSON)">
              <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={5} className="font-mono text-xs" />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Decision" description="Winning entry, variant and the human-readable explanation.">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : !result ? (
            <p className="text-sm text-text-secondary">Run a decision to see the result here.</p>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-border bg-surface-card p-3">
                  <p className="text-xs text-text-secondary">Entry</p>
                  <p className="truncate text-sm font-medium text-foreground">{result.entryId || "—"}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-border bg-surface-card p-3">
                  <p className="text-xs text-text-secondary">Variant</p>
                  <p className="truncate text-sm font-medium text-foreground">{result.variantId || "—"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-card p-3">
                <p className="text-xs text-text-secondary">Reason</p>
                <p className="break-words text-sm text-foreground">{result.reason}</p>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default EdgeScreen;
