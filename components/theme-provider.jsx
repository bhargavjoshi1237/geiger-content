"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, scriptProps, ...props }) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        ...scriptProps,
        // Execute before the server page paints; client renders keep the script inert.
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
