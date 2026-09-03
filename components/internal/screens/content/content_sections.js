"use client";

import {
  LayoutDashboard,
  SquarePen,
  FileText,
  ImageIcon,
  Eye,
  Users,
} from "lucide-react";

import {
  Field,
  SectionCard,
} from "@/components/internal/shared/screen_kit";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { CONTENT_STATUS_MAP, CONTENT_TYPE_MAP } from "./sample_data";

function OverviewSection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Summary">
        <div className="grid gap-4">
          <Field label="Excerpt">
            <Textarea
              value={content?.excerpt || ""}
              onChange={(e) => patch({ excerpt: e.target.value })}
              placeholder="One-line summary for cards and previews…"
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Author">
              <Input
                value={content?.author || ""}
                onChange={(e) => patch({ author: e.target.value })}
                placeholder="Who wrote this?"
              />
            </Field>
            <Field label="Locale">
              <Select
                value={content?.locale || "en"}
                onValueChange={(v) => patch({ locale: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="en-IN">English — India (en-IN)</SelectItem>
                  <SelectItem value="de">German (de)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function BasicsSection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Basics">
        <div className="grid gap-4">
          <Field label="Title">
            <Input
              value={content?.title || ""}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="What's it called?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug">
              <Input
                value={content?.slug || ""}
                onChange={(e) => patch({ slug: e.target.value })}
                placeholder="url-slug"
              />
            </Field>
            <Field label="Type">
              <Select
                value={content?.type || "Article"}
                onValueChange={(v) => patch({ type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CONTENT_TYPE_MAP).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function BodySection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Body">
        <Field label="Body">
          <Textarea
            value={content?.body || ""}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="Write the entry…"
            rows={10}
          />
        </Field>
      </SectionCard>
    </div>
  );
}

function MediaSection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Cover">
        <Field label="Cover URL">
          <Input
            value={content?.coverUrl || ""}
            onChange={(e) => patch({ coverUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
      </SectionCard>
    </div>
  );
}

function VisibilitySection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Visibility">
        <Field label="Status">
          <Select
            value={content?.status || "Draft"}
            onValueChange={(v) => patch({ status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CONTENT_STATUS_MAP).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </SectionCard>
    </div>
  );
}

function TeamSection({ content, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Ownership">
        <Field label="Author">
          <Input
            value={content?.author || ""}
            onChange={(e) => patch({ author: e.target.value })}
            placeholder="Who owns this entry?"
          />
        </Field>
      </SectionCard>
    </div>
  );
}

export const NAV_GROUPS = [
  {
    group: null,
    items: [
      {
        key: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "Summary, author, and locale.",
      },
    ],
  },
  {
    group: "General",
    items: [
      {
        key: "basics",
        label: "Basics",
        icon: SquarePen,
        desc: "Title, slug, and content type.",
      },
    ],
  },
  {
    group: "Content",
    items: [
      {
        key: "body",
        label: "Body",
        icon: FileText,
        desc: "The entry body.",
      },
      {
        key: "media",
        label: "Media",
        icon: ImageIcon,
        desc: "Cover and assets.",
      },
    ],
  },
  {
    group: "Publishing",
    items: [
      {
        key: "visibility",
        label: "Visibility",
        icon: Eye,
        desc: "Status and delivery state.",
      },
    ],
  },
  {
    group: "Team",
    items: [
      {
        key: "team",
        label: "Team",
        icon: Users,
        desc: "Ownership and review.",
      },
    ],
  },
];

export const SECTIONS = {
  overview: OverviewSection,
  basics: BasicsSection,
  body: BodySection,
  media: MediaSection,
  visibility: VisibilitySection,
  team: TeamSection,
};
