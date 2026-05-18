#!/usr/bin/env tsx
/*
 * Render the <Invoice /> design-system template to a real PDF.
 *
 * Pipeline:
 *   1. Resolve invoice payload (CLI --input JSON | bundled sampleInvoice)
 *   2. Render React -> static HTML via react-dom/server
 *   3. Build a one-shot Tailwind CSS bundle for the rendered markup
 *      using the same preset Storybook consumes
 *   4. Inline tokens.css + fonts.css (with absolute file:// font URLs)
 *      and the Tailwind output into a single self-contained HTML doc
 *   5. Launch Chromium via Playwright (already a UI devDep), navigate
 *      to the document, and emit the PDF
 *
 * Usage:
 *   yarn workspace ui invoice:pdf
 *   yarn workspace ui invoice:pdf --input my-invoice.json --output ./out.pdf
 *   yarn workspace ui invoice:pdf --format A4 --theme dark
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
// `tailwindcss` ships a PostCSS plugin as its default export.
// @ts-expect-error — Tailwind v3 types don't ship a clean plugin signature.
import tailwindcss from "tailwindcss";
// @ts-expect-error — autoprefixer's typings are loose under ESM.
import autoprefixer from "autoprefixer";

import type { InvoiceValue } from "../src/templates/invoice/types";

// The `ui` package defaults to CommonJS (no `"type": "module"` in its
// package.json — Storybook/Vite tooling relies on that). `tsx` happily
// loads `.tsx` files but exposes named exports via the CJS interop
// surface, so ESM named imports come back empty. `createRequire` lets
// us reach the original CJS exports cleanly.
const require_ = createRequire(import.meta.url);
const tailwindPreset = require_("../tailwind.config.ts").default;
const { Invoice } = require_(
  "../src/templates/invoice/invoice"
) as typeof import("../src/templates/invoice/invoice");
const { sampleInvoice } = require_(
  "../src/templates/invoice/sample"
) as typeof import("../src/templates/invoice/sample");

type Theme = "light" | "dark";
type PageFormat = "Letter" | "A4" | "Legal";

interface CliOptions {
  input?: string;
  output: string;
  format: PageFormat;
  theme: Theme;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const SRC_ROOT = resolve(PACKAGE_ROOT, "src");
const STYLES_ROOT = resolve(SRC_ROOT, "styles");
const FONTS_ROOT = resolve(SRC_ROOT, "fonts");
const DIST_ROOT = resolve(PACKAGE_ROOT, "dist");

function parseArgs(argv: readonly string[]): CliOptions {
  const opts: CliOptions = {
    output: resolve(DIST_ROOT, "invoice.pdf"),
    format: "Letter",
    theme: "light",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--input":
        opts.input = resolve(process.cwd(), next ?? "");
        i++;
        break;
      case "--output":
        opts.output = resolve(process.cwd(), next ?? "");
        i++;
        break;
      case "--format":
        if (next !== "Letter" && next !== "A4" && next !== "Legal") {
          fail(`--format must be Letter | A4 | Legal (got "${next}")`);
        }
        opts.format = next as PageFormat;
        i++;
        break;
      case "--theme":
        if (next !== "light" && next !== "dark") {
          fail(`--theme must be light | dark (got "${next}")`);
        }
        opts.theme = next as Theme;
        i++;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        fail(`Unknown flag: ${arg}`);
    }
  }
  return opts;
}

function printHelp() {
  process.stdout.write(
    [
      "render-invoice-pdf",
      "",
      "Render the design-system Invoice template to a PDF.",
      "",
      "Options:",
      "  --input  <file.json>   Invoice payload (default: bundled sample)",
      "  --output <file.pdf>    Output path     (default: dist/invoice.pdf)",
      "  --format Letter|A4     Page size       (default: Letter)",
      "  --theme  light|dark    Document theme  (default: light)",
      "  -h, --help             Show this help",
      "",
    ].join("\n")
  );
}

function fail(msg: string): never {
  process.stderr.write(`render-invoice-pdf: ${msg}\n`);
  process.exit(1);
}

function loadValue(opts: CliOptions): InvoiceValue {
  if (!opts.input) return sampleInvoice;
  if (!existsSync(opts.input)) fail(`input not found: ${opts.input}`);
  const raw = readFileSync(opts.input, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`failed to parse ${opts.input}: ${(err as Error).message}`);
  }
  // Trust callers to match the InvoiceValue shape — we don't ship Zod here.
  // The template tolerates undefined party fields and falls back to em-dash
  // placeholders so a partial payload still renders cleanly.
  return parsed as InvoiceValue;
}

/**
 * Rewrite relative woff2 references inside the fonts CSS to absolute
 * file:// URLs. Without this, fonts only resolve when the HTML happens
 * to live next to `src/styles/`; with it the same doc can be written
 * anywhere (we use `dist/`).
 */
function inlineFontUrls(fontsCss: string): string {
  return fontsCss.replace(
    /url\("\.\.\/fonts\/([^"]+)"\)/g,
    (_, name: string) => `url("file://${resolve(FONTS_ROOT, name)}")`
  );
}

async function buildTailwindCss(bodyHtml: string): Promise<string> {
  // Scope the content scan to the rendered markup ONLY so the CSS
  // bundle is tight (Tailwind generates utilities used in the doc and
  // nothing else). The preset's color/spacing/typography extensions
  // are still applied because we spread the preset config.
  const config = {
    ...tailwindPreset,
    content: [{ raw: bodyHtml, extension: "html" }],
  };
  const input = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
  const result = await postcss([tailwindcss(config), autoprefixer]).process(
    input,
    { from: undefined }
  );
  return result.css;
}

function assembleHtml({
  bodyHtml,
  tailwindCss,
  tokensCss,
  fontsCss,
  globalsCss,
  theme,
}: {
  bodyHtml: string;
  tailwindCss: string;
  tokensCss: string;
  fontsCss: string;
  globalsCss: string;
  theme: Theme;
}): string {
  // Order matters: fonts -> tokens -> tailwind base/utilities -> globals.
  // Tokens declare CSS variables that Tailwind utilities reference at
  // runtime; globals contains the reset and selection rules.
  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<title>Invoice</title>
<style>
${fontsCss}
${tokensCss}
${tailwindCss}
${globalsCss}
@page { size: auto; margin: 0; }
html, body { background: white; }
[data-template="invoice"] { box-shadow: none !important; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

async function renderPdf(opts: CliOptions, html: string): Promise<void> {
  // Dynamic import so the tsx loader doesn't try to resolve Playwright
  // unless we actually reach this stage.
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    fail(
      `Playwright not available: ${(err as Error).message}\n` +
        "Run `yarn install` in the workspace root."
    );
  }

  let browser: import("playwright").Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    fail(
      `Failed to launch Chromium: ${(err as Error).message}\n` +
        "Did you run `npx playwright install chromium`?"
    );
  }

  try {
    const page = await browser.newPage();
    // Write to a temp file so font:// URLs resolve as a real same-origin
    // load (some Chromium font loads fail when the page URL is about:blank).
    mkdirSync(DIST_ROOT, { recursive: true });
    const htmlPath = resolve(DIST_ROOT, "invoice.html");
    writeFileSync(htmlPath, html, "utf8");
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    // Wait for webfonts (Kalice woff2 + Inter / IBM Plex Mono via CDN)
    // to settle so the PDF doesn't snapshot during the FOIT/FOUT swap.
    await page.evaluate(() => document.fonts.ready);

    mkdirSync(dirname(opts.output), { recursive: true });
    await page.pdf({
      path: opts.output,
      format: opts.format,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const value = loadValue(opts);

  const bodyHtml = renderToStaticMarkup(
    React.createElement(Invoice, { value, surface: opts.theme })
  );

  const tokensCss = readFileSync(resolve(STYLES_ROOT, "tokens.css"), "utf8");
  const fontsCss = inlineFontUrls(
    readFileSync(resolve(STYLES_ROOT, "fonts.css"), "utf8")
  );
  const globalsCss = readFileSync(
    resolve(STYLES_ROOT, "globals.css"),
    "utf8"
    // Strip the cascading @imports — we inline them explicitly above so
    // ordering stays deterministic and we never accidentally pull glass /
    // auth / connectors CSS into the invoice doc.
  ).replace(/^@import\s+"[^"]+"\s*;?\s*$/gm, "");

  process.stderr.write("→ Building Tailwind bundle…\n");
  const tailwindCss = await buildTailwindCss(bodyHtml);

  const html = assembleHtml({
    bodyHtml,
    tailwindCss,
    tokensCss,
    fontsCss,
    globalsCss,
    theme: opts.theme,
  });

  process.stderr.write(`→ Rendering PDF (${opts.format}, ${opts.theme})…\n`);
  await renderPdf(opts, html);

  process.stdout.write(`✓ Wrote ${opts.output}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`render-invoice-pdf failed:\n${String(err)}\n`);
  process.exit(1);
});
