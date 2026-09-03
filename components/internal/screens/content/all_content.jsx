"use client";

import React from "react";

import { EntriesList } from "./entries_list";

export function AllContentScreen() {
  return (
    <EntriesList
      title="All Content"
      description="Every entry in your workspace — drafts, in review, and published. Search, filter, and manage them all from here."
      itemLabel="entries"
      backLabel="All Content"
      emptyTitle="No content yet"
      emptyDescription="Create your first entry to start modeling, writing, and publishing."
    />
  );
}

export default AllContentScreen;
