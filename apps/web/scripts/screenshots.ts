// Takes the screenshots that a change to the interface has to be judged on, because a
// route answering 200 says nothing about what it renders: a panel can come back twelve
// pixels wide, a skeleton can be invisible, a figure can be printed over by a hardcoded
// zero, and every one of those passes typecheck, lint and the tests.
//
// It shoots each route at the four widths the layout has to survive and in both colour
// schemes, and reports the page title and whether the document scrolls sideways — the
// cheap check that catches a blown-out layout. Note what it cannot catch: clipping
// inside a container leaves the document itself the right width, so the images still
// have to be looked at.
//
//   bun run screenshots                        # /login against a local dev server
//   bun run screenshots /login /register       # explicit routes
//   SCREENSHOT_BASE_URL=https://plan.example.com bun run screenshots
//
// The app has to be running already: this drives a browser, it does not start anything.

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The widths a layout has to survive: desktop, tablet, phone, and the narrowest phone
// still in use. A break shows up at the edges, not in the middle.
const WIDTHS = [1440, 768, 390, 320] as const;
const SCHEMES = ['light', 'dark'] as const;

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3001';
const OUT_DIR =
  process.env.SCREENSHOT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');

// A route reachable without a session, so the command works on a fresh instance.
const DEFAULT_ROUTES = ['/login'];

function fileNameOf(route: string, scheme: string, width: number): string {
  const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
  return `${slug}-${scheme}-${width}.png`;
}

async function main(): Promise<void> {
  const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES;

  // Imported here rather than at the top so the failure names the missing piece: the
  // package and its browsers are a local tool, not something the app needs to run.
  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error(
      'playwright is not installed: run `bun install`, then `bunx playwright install chromium`.',
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch().catch(() => {
    throw new Error('Chromium is missing: run `bunx playwright install chromium`.');
  });

  const problems: string[] = [];
  try {
    for (const route of routes) {
      for (const scheme of SCHEMES) {
        for (const width of WIDTHS) {
          const context = await browser.newContext({
            viewport: { width, height: 900 },
            colorScheme: scheme,
          });
          const page = await context.newPage();
          page.on('pageerror', (error) =>
            problems.push(`${route} ${scheme}/${width}: ${String(error).slice(0, 160)}`),
          );

          const response = await page.goto(`${BASE_URL}${route}`, {
            waitUntil: 'networkidle',
            timeout: 45_000,
          });
          const status = response?.status() ?? 0;
          if (status >= 400) problems.push(`${route} ${scheme}/${width}: HTTP ${status}`);

          const scrollsSideways = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          );
          if (scrollsSideways) problems.push(`${route} ${scheme}/${width}: scrolls sideways`);

          const file = join(OUT_DIR, fileNameOf(route, scheme, width));
          await page.screenshot({ path: file });
          console.log(
            `${route} ${scheme}/${width} http=${status} sideways=${scrollsSideways} "${await page.title()}"`,
          );
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${routes.length * WIDTHS.length * SCHEMES.length} images in ${OUT_DIR}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log('No page errors, no sideways scroll. Now look at the images.');
}

await main();
