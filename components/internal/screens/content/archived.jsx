"use client";

import React from "react";

import { EntriesList } from "./entries_list";

export function ArchivedScreen() {
  return (
    <EntriesList
      title="Archived"
      description="Entries removed from editorial and delivery workflows. Restore them as drafts or delete them permanently."
      fixedStatus="Archived"
      hideStatusFilter
      createStatus="Archived"
      itemLabel="archived entries"
      backLabel="Archived"
      showRestore
      createButtonLabel="Create content"
      emptyTitle="Nothing archived"
      emptyDescription="Archived entries will wait here for restoration or permanent deletion."
    />
  );
}

export default ArchivedScreen;
