"use client";

import React from "react";

// Shared gate states for the project-scoped workspace. Used by the /project
// resolver and the /project/[projectId] shell.

// Re-exported from the suite kit so every product's workspace gate shows the
// same animated mark.
export { LoadingArea } from "@geiger/ui";
