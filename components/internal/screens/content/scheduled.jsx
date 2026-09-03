"use client";

import React from "react";

import { EntriesList } from "./entries_list";

export function ScheduledScreen() {
  return (
    <EntriesList
      title="Scheduled"
      description="Entries queued for future publication. Review dates, dependencies, and conflicts before they go live."
      fixedStatus="Scheduled"
      hideStatusFilter
      createStatus="Scheduled"
      itemLabel="scheduled entries"
      backLabel="Scheduled"
      showSchedule
      createButtonLabel="Schedule content"
      emptyTitle="Nothing scheduled"
      emptyDescription="Schedule an entry from its Visibility tab and it will queue here."
    />
  );
}

export default ScheduledScreen;
