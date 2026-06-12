"use client";

import { useEffect } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DARK_FAVICON = `${BASE_PATH}/favicon.ico`;
const LIGHT_FAVICON = `${BASE_PATH}/faviconL.ico`;

export function SystemFavicon() {
  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

    const updateFavicon = () => {
      document
        .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
        .forEach((link) => link.remove());

      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/x-icon";
      link.href = colorScheme.matches ? DARK_FAVICON : LIGHT_FAVICON;
      document.head.appendChild(link);
    };

    updateFavicon();
    colorScheme.addEventListener("change", updateFavicon);

    return () => colorScheme.removeEventListener("change", updateFavicon);
  }, []);

  return null;
}
