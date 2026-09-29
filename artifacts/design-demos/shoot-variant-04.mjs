/**
 * 一次性脚本：截变体 04（Tailwind 现代版）桌面 + 移动端。
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DIR = path.join('artifacts', 'design-demos');
const OUT = path.join(DIR, 'shots');

const SHOTS = [
  { name: 'variant-04-desktop', viewport: { width: 1280, height: 860 } },
  { name: 'variant-04-mobile', viewport: { width: 390, height: 844 } },
];

async function shutdown(browser, code = 0) {
  await Promise.race([
    browser.close().catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  process.exit(code);
}

let browser;
try {
  browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-gpu'],
  });
} catch {
  browser = await chromium.launch({ args: ['--disable-gpu'] });
}

await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn(`  ! ${shot.name}: ${e}`));

  const url = pathToFileURL(path.resolve(DIR, 'variant-04-modern.html')).href;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const out = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: out });
  console.log(`  ✓ ${out}`);
  await context.close();
}

await shutdown(browser);
