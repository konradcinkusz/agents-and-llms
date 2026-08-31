#!/usr/bin/env node
/**
 * make-og.mjs — regenerate og-image.png from scripts/og-card.html.
 *
 * The social preview card is a committed PNG, not something the site builds:
 * scrapers can't run JavaScript and most of them reject SVG, so the raster has
 * to exist in the repo. This script is the reproducible way to redraw it after
 * editing the card, and is the ONLY thing here that needs a tool installed —
 * the site itself still has no dependencies and no build step.
 *
 *   npx playwright@1 install --with-deps chromium   # once, if you don't have it
 *   node scripts/make-og.mjs
 *
 * The card deliberately uses only widely-available system fonts so the render
 * is stable across machines; it does not depend on the webfonts the site loads.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CARD = join(ROOT, "scripts", "og-card.html");
const OUT = join(ROOT, "og-image.png");

// 1200x630 is the size every major scraper crops to (1.91:1).
const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.goto("file://" + CARD, { waitUntil: "load" });
  await page.screenshot({ path: OUT, type: "png" });
  console.log(`wrote og-image.png (${WIDTH}x${HEIGHT}) from scripts/og-card.html`);
} finally {
  await browser.close();
}
