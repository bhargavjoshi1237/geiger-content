"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { parseBody } from "./body_doc";

// Read-only renderer shared by the public page and the visual preview.
// Legacy plain-text bodies parse to a single paragraph, so old rows render
// unchanged. Returns null when there is no visible text.
export function BodyBlocks({ value, className }) {
  const doc = parseBody(value);
  const visible = doc.blocks.filter((b) => b.text.trim() !== "");
  if (visible.length === 0) return null;
  return (
    <div className={className || "space-y-4"}>
      {visible.map((block, i) =>
        block.type === "heading" ? (
          <h2
            key={i}
            className="break-words text-xl font-semibold leading-snug text-foreground"
          >
            {block.text}
          </h2>
        ) : (
          <p
            key={i}
            className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground"
          >
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

// Minimal block editor: heading/paragraph select + text input per block, with
// add/remove. Controlled on the parsed doc; parents persist via serializeBody.
export function BodyEditor({ doc, onChange }) {
  const blocks = doc?.blocks?.length
    ? doc.blocks
    : [{ type: "paragraph", text: "" }];

  const set = (next) => onChange?.({ blocks: next });

  const updateBlock = (index, patch) =>
    set(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const removeBlock = (index) => {
    if (blocks.length <= 1) {
      set([{ type: "paragraph", text: "" }]);
      return;
    }
    set(blocks.filter((_, i) => i !== index));
  };

  const addBlock = (type = "paragraph") =>
    set([...blocks, { type, text: "" }]);

  return (
    <div className="grid gap-3">
      {blocks.map((block, i) => (
        <div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
          <Select
            value={block.type === "heading" ? "heading" : "paragraph"}
            onValueChange={(v) => updateBlock(i, { type: v })}
          >
            <SelectTrigger
              className="w-full min-w-0 bg-surface-card"
              aria-label={`Block ${i + 1} type`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="heading">Heading</SelectItem>
            </SelectContent>
          </Select>
          <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
            {block.type === "heading" ? (
              <Input
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                placeholder="Heading…"
                aria-label={`Heading ${i + 1}`}
              />
            ) : (
              <Textarea
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                placeholder="Write a paragraph…"
                rows={3}
                aria-label={`Paragraph ${i + 1}`}
              />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeBlock(i)}
            aria-label={`Remove block ${i + 1}`}
            className="col-start-2 row-start-1 shrink-0 text-text-secondary hover:text-foreground sm:col-start-3"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => addBlock("paragraph")}
          className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add paragraph
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => addBlock("heading")}
          className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add heading
        </Button>
      </div>
    </div>
  );
}

export default BodyBlocks;
