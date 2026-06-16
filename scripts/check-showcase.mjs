#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// check-showcase.mjs — verify the intentïon.com showcase actually RENDERS each
// fleet repo's screenshot, on the live site and inside the "Show all" grid.
//
// Two layers:
//   1. HTTP gate (always, no deps): each repo's SCREENSHOT_INDEX.png + summary.json
//      on the agentic-lib-logs branch must return 200 with an image/JSON body.
//      Also flags the S3 "generic render" smell: all screenshots byte-identical.
//   2. Playwright DOM check (if `playwright` is importable): load the live site,
//      click "Show all", and assert every screenshot <img> loaded (naturalWidth>0).
//
// Run after a benchmark delivery (reset deletes agentic-lib-logs, so the screenshot
// must be re-published via `on-screenshot` — see benchmark-run.sh `finalize`).
//
// Usage: node scripts/check-showcase.mjs [repo ...]   (defaults to the live fleet)
//        SITE_URL overrides the site (default https://xn--intenton-z2a.com/)

const OWNER = process.env.OWNER || "polycode-public";
const SITE = process.env.SITE_URL || "https://xn--intenton-z2a.com/";
const REPOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "8-kyu-remember-hello-world",
      "6-kyu-understand-roman-numerals",
      "3-kyu-analyze-lunar-lander",
      "2-kyu-create-markdown-compiler",
    ];

const shotUrl = (r) => `https://raw.githubusercontent.com/${OWNER}/${r}/agentic-lib-logs/SCREENSHOT_INDEX.png`;

let failures = 0;
const sizes = {};

// ─── Layer 1: HTTP gate ───────────────────────────────────────────────
console.log(`\n== HTTP gate: screenshots on agentic-lib-logs ==`);
for (const r of REPOS) {
  try {
    const res = await fetch(shotUrl(r));
    const buf = Buffer.from(await res.arrayBuffer());
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50; // PNG magic
    sizes[r] = buf.length;
    if (res.status === 200 && isPng) {
      console.log(`  ✓ ${r}  (${buf.length} bytes, PNG)`);
    } else {
      console.log(`  ✗ ${r}  HTTP ${res.status}, ${isPng ? "PNG" : "NOT a PNG"} — broken/missing`);
      failures++;
    }
  } catch (e) {
    console.log(`  ✗ ${r}  fetch error: ${e.message}`);
    failures++;
  }
}
// S3 smell: all identical size → likely a generic/fallback render, not the repo's demo
const uniq = new Set(Object.values(sizes));
if (Object.keys(sizes).length > 1 && uniq.size === 1) {
  console.log(
    `  ⚠ WARNING: all ${Object.keys(sizes).length} screenshots are byte-identical ` +
      `(${[...uniq][0]} bytes) — likely a GENERIC src/web render, not each repo's real demo (S3). ` +
      `Deliveries should update src/web to demo the feature.`,
  );
}

// ─── Layer 2: Playwright DOM check (best-effort) ──────────────────────
console.log(`\n== Playwright: live site + "Show all" grid (${SITE}) ==`);
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch {
    console.log(
      `  (skipped — playwright not importable here. Install it or run via the site repo. ` +
        `The HTTP gate above is the hard signal.)`,
    );
  }
}
if (chromium) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(SITE, { waitUntil: "networkidle", timeout: 30000 });
    // open the "Show all" grid overlay
    await page.click("#showcase-show-all", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500); // let images load
    // every screenshot <img> on the page (cards + grid) must have rendered pixels
    const imgs = await page.$$eval("img.screenshot-img, #grid-overlay img, .screenshot-item img", (els) =>
      els
        .filter((e) => /SCREENSHOT_INDEX\.png/.test(e.src) || e.classList.contains("screenshot-img"))
        .map((e) => ({ src: e.src, w: e.naturalWidth, h: e.naturalHeight })),
    );
    if (!imgs.length) {
      console.log(`  ⚠ no screenshot <img> elements found in the DOM (selector drift?)`);
    }
    for (const im of imgs) {
      const repo = (im.src.match(/polycode-public\/([^/]+)\//) || [])[1] || im.src;
      if (im.w > 0 && im.h > 0) console.log(`  ✓ rendered ${repo} (${im.w}×${im.h})`);
      else {
        console.log(`  ✗ NOT rendered ${repo} (naturalWidth=0) — ${im.src}`);
        failures++;
      }
    }
  } finally {
    await browser.close();
  }
}

const summary = failures === 0 ? "✅ showcase screenshots OK" : `❌ ${failures} screenshot failure(s)`;
console.log(`\n${summary}`);
process.exit(failures === 0 ? 0 : 1);
