import React from "react";

import { cn } from "@/lib/utils";

export function MainScreenWrapper({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-8 px-2 py-4 lg:max-w-[85%] lg:px-0",
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
        "mx-auto w-full max-w-5xl space-y-6 px-2 py-4 lg:px-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
