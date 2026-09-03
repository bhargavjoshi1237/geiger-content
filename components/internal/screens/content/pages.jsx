"use client";

import React from "react";

import { EntriesList } from "./entries_list";

export function PagesScreen() {
  return (
    <EntriesList
      title="Pages"
      description="Structured pages for websites and applications — slugs, layouts, locales, previews, and publishing state."
      fixedType="Page"
      hideTypeFilter
      createType="Page"
      itemLabel="pages"
      backLabel="Pages"
      createButtonLabel="Create page"
      emptyTitle="No pages yet"
      emptyDescription="Create your first page to start composing slugs, blocks, and locales."
    />
  );
}

export default PagesScreen;
