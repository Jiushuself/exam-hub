/**
 * 一次性脚本：给 design-demos 下的三版资料卡变体截图。
 * 输出 artifacts/design-demos/shots/*.png（2x，便于看细节）
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DIR = path.join('artifacts', 'design-demos');
const OUT = path.join(DIR, 'shots');

const FILES = [
  'variant-01-ticket.html',
  'variant-02-index-card.html',
  'variant-03-alert-banner.html',
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

for (const file of FILES) {
  const context = await browser.newContext({
    viewport: { width: 1140, height: 820 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn(`  ! ${file}: ${e}`));

  const url = pathToFileURL(path.resolve(DIR, file)).href;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);

  const out = path.join(OUT, file.replace('.html', '.png'));
  await page.locator('main').screenshot({ path: out });
  console.log(`  ✓ ${out}`);
  await context.close();
}

await shutdown(browser);
