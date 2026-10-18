"use client";

import React, { useEffect, useState } from "react";
import { Clock, Loader2, Plus, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { PanelSection, runAction } from "./algorithm_dials";
import { STEERING_COPY } from "./constants";

const MINUTE = 60000;

function formatRemaining(ms) {
  if (!(ms > 0)) return "Expiring";
  const days = Math.floor(ms / (24 * 60 * MINUTE));
  const hours = Math.floor((ms % (24 * 60 * MINUTE)) / (60 * MINUTE));
  const minutes = Math.max(1, Math.floor((ms % (60 * MINUTE)) / MINUTE));
  if (days) return `${days}d ${hours}h left`;
  if (hours) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

// Ticks once a minute; null until the first tick, when the server's remainingMs is used instead.
function useMinuteClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// Active steering requests with time left and remove, plus a compact add form (the header composer adds too).
export function AlgorithmSteering({ feed }) {
  const requests = feed.summary?.steering || [];
  const busy = Boolean(feed.pending?.steering);
  const now = useMinuteClock();
  const [text, setText] = useState("");
  const [removing, setRemoving] = useState(null);
  const atLimit = requests.length >= STEERING_COPY.maxActive;
  const clean = text.trim().replace(/\s+/g, " ");
  const valid = clean.length >= STEERING_COPY.minLength && clean.length <= STEERING_COPY.maxLength;

  const add = async (e) => {
    e.preventDefault();
    if (!valid || atLimit || busy) return;
    if (await runAction(feed.addSteering, clean)) setText("");
  };

  const remove = async (id) => {
    setRemoving(id);
    await runAction(feed.removeSteering, id);
    setRemoving(null);
  };

  return (
    <PanelSection
      title={STEERING_COPY.title}
      description={STEERING_COPY.description}
      action={<span className="text-xs tabular-nums text-text-tertiary">{requests.length}/{STEERING_COPY.maxActive}</span>}
    >
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={STEERING_COPY.placeholder}
          maxLength={STEERING_COPY.maxLength}
          disabled={busy || atLimit}
          aria-label={STEERING_COPY.title}
        />
        <Button type="submit" variant="ghost" size="icon" disabled={busy || atLimit || !valid} aria-label={STEERING_COPY.submit}>
          {busy && !removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>
      {atLimit && <p className="text-xs text-text-tertiary">{STEERING_COPY.limitReached}</p>}
      {requests.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {requests.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="break-words text-sm text-foreground">{r.text}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-text-tertiary">
                  <Clock className="h-3 w-3" /> {formatRemaining(now ? r.expiresAt - now : r.remainingMs)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(r.id)} disabled={busy} aria-label={`Remove request “${r.text}”`}>
                {removing === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary">{STEERING_COPY.empty}</p>
      )}
    </PanelSection>
  );
}

export default AlgorithmSteering;
