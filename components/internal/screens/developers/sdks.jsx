"use client";

import React, { useMemo } from "react";
import { toast } from "sonner";
import { Code2, Copy } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";

// Static install + usage snippets for the delivery API. No registry, no
// network — copy-paste reference only.
const SNIPPETS = [
  {
    id: "curl",
    title: "cURL",
    install: null,
    code: `curl "https://your-app.example/api/content/v1/entries?limit=10" \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    id: "js",
    title: "JavaScript / TypeScript",
    install: "npm install @geiger/content-sdk",
    code: `import { createContentClient } from "@geiger/content-sdk";

const content = createContentClient({
  baseUrl: "https://your-app.example",
  token: process.env.GEIGER_TOKEN,
});

const entries = await content.entries.list({ limit: 10 });`,
  },
  {
    id: "python",
    title: "Python",
    install: "pip install geiger-content",
    code: `from geiger_content import ContentClient

client = ContentClient(
    base_url="https://your-app.example",
    token=os.environ["GEIGER_TOKEN"],
)

entries = client.entries.list(limit=10)`,
  },
  {
    id: "graphql",
    title: "GraphQL (v1 placeholder)",
    install: null,
    code: `curl -X POST https://your-app.example/api/content/v1/graphql \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "{ entries { id title slug status } }" }'`,
  },
];

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  } catch (e) {
    console.error("[sdks.copy]", e);
    toast.error("Couldn't copy to clipboard.");
  }
}

export function SdksScreen() {
  const stats = useMemo(
    () => [
      { label: "Snippets", value: String(SNIPPETS.length), footer: "Copy-paste reference" },
      { label: "Auth", value: "Bearer", footer: "API token required" },
      { label: "Version", value: "v1", footer: "Delivery surface" },
    ],
    [],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="SDKs & CLI"
        description="Install the client libraries and start reading published content."
      />

      <StatsBar stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        {SNIPPETS.map((s) => (
          <SectionCard
            key={s.id}
            title={s.title}
            description={s.install || "No install — plain HTTP."}
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-text-secondary hover:text-foreground"
                onClick={() =>
                  copyText(s.install ? `${s.install}\n\n${s.code}` : s.code, s.title)
                }
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            }
          >
            {s.install ? (
              <p className="mb-2 break-all rounded-lg border border-border bg-surface-subtle px-3 py-2 font-mono text-xs text-text-secondary">
                {s.install}
              </p>
            ) : (
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <Code2 className="h-3.5 w-3.5" /> Usage
              </p>
            )}
            <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-foreground">
              {s.code}
            </pre>
          </SectionCard>
        ))}
      </div>
    </MainScreenWrapper>
  );
}

export default SdksScreen;
