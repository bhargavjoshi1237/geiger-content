import React from "react";

import { cn } from "@geiger/ui/lib/utils";

export function MainScreenWrapper({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "mx-auto min-w-0 w-full space-y-6 px-0 py-4 sm:space-y-8 lg:max-w-[85%] lg:px-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SecondaryScreenWrapper({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "mx-auto min-w-0 w-full max-w-5xl space-y-6 px-0 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
