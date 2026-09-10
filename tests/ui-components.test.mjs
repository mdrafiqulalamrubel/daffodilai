import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
// Created under node_modules (not the OS tmpdir) so Node's bare-specifier
// resolution for the externalized "react"/"react-dom" imports below can walk
// up and find this project's node_modules/react.
const dir = await mkdtemp(path.join(root, "node_modules", ".dai-ui-"));

async function loadComponent(entry) {
  // CJS output (not ESM): some deps (e.g. lucide-react) ship a CJS build
  // that calls require("react") internally, which only resolves when the
  // bundle itself runs under CommonJS (real `require` available at runtime).
  const output = path.join(dir, path.basename(entry).replace(/\.tsx?$/, "") + ".cjs");
  await build({
    entryPoints: [path.join(root, entry)],
    outfile: output,
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node24",
    jsx: "automatic",
    logLevel: "silent",
    tsconfig: path.join(root, "tsconfig.json"),
    external: ["react", "react-dom", "react-dom/server"],
  });
  return import(pathToFileURL(output).href);
}

test.after(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits the catalog's animation and scrolling utilities", async () => {
  const css = await readCssTree(path.join(root, ".next", "static"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scroll-fade-x/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await loadComponent("components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await loadComponent("components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await loadComponent("components/ui/sidebar.tsx");
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});
