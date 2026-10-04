import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("theme bootstrap executes on the server and is inert on client renders", async () => {
  await mkdir(".next", { recursive: true });
  const dir = await mkdtemp(resolve(".next/theme-test-"));
  const savedWindow = globalThis.window;
  try {
    const file = resolve(dir, "provider.mjs");
    await build({ entryPoints: ["components/theme-provider.jsx"], outfile: file, bundle: true, packages: "external", platform: "node", format: "esm", jsx: "automatic", logLevel: "silent" });
    const { ThemeProvider } = await import(pathToFileURL(file).href);
    const render = () => renderToStaticMarkup(React.createElement(ThemeProvider, { attribute: "class", defaultTheme: "light", enableSystem: true }, "content"));
    delete globalThis.window;
    assert.match(render(), /<script[^>]*type="text\/javascript"/);
    globalThis.window = {};
    const html = render();
    assert.match(html, /<script[^>]*type="text\/plain"/);
    assert.ok(html.includes("localStorage.getItem"));
    assert.ok(html.includes("content"));
  } finally {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
    assert.ok(dir.startsWith(`${resolve(".next")}${sep}`));
    await rm(dir, { recursive: true, force: true });
  }
});
