"use client";

import React from "react";
import { Copy } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { cn } from "@geiger/ui/lib/utils";

// Read-only monospace pane for the developer screens; scrolls inside itself so long lines never widen the page.
export function CodeBlock({
  code,
  onCopy,
  copyLabel = "Copy",
  wrap = false,
  className,
  preClassName,
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-lg border border-border bg-surface-card",
        className,
      )}
    >
      {onCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={copyLabel}
          title={copyLabel}
          className="absolute right-1.5 top-1.5 z-10 bg-surface-card text-text-secondary hover:bg-surface-active hover:text-foreground"
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
      ) : null}
      <pre
        tabIndex={0}
        role="region"
        aria-label="Code preview"
        className={cn(
          "max-w-full overflow-auto p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre",
          onCopy && "pr-11",
          preClassName,
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default CodeBlock;
