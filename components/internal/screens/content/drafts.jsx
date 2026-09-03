"use client";

import React from "react";

import { EntriesList } from "./entries_list";

export function DraftsScreen() {
  return (
    <EntriesList
      title="Drafts"
      description="Unfinished entries that haven't entered review yet. Pick up where you left off, fix validation issues, and send them for review."
      fixedStatus="Draft"
      hideStatusFilter
      createStatus="Draft"
      itemLabel="drafts"
      backLabel="Drafts"
      createButtonLabel="Create draft"
      emptyTitle="No drafts"
      emptyDescription="Drafts you create will wait here until they're ready for review."
    />
  );
}

export default DraftsScreen;
