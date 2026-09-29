/**
 * 一次性脚本：截资料库页的转存提醒卡片（桌面明/暗 + 移动端）。
 * 用法：npm run dev 后 node artifacts/design-demos/shoot-resource-notice.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join('artifacts', 'design-demos', 'shots');
const URL = 'http://localhost:3000/resources/';

const SHOTS = [
  {
    name: 'notice-desktop-light',
    viewport: { width: 1440, height: 900 },
    theme: 'light',
  },
  {
    name: 'notice-desktop-dark',
    viewport: { width: 1440, height: 900 },
    theme: 'dark',
  },
  {
    name: 'notice-mobile-light',
    viewport: { width: 390, height: 844 },
    theme: 'light',
  },
  {
    name: 'notice-mobile-dark',
    viewport: { width: 390, height: 844 },
    theme: 'dark',
  },
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
    colorScheme: shot.theme,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn(`  ! ${shot.name}: ${e}`));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.evaluate((theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, shot.theme);
  await page.waitForSelector('.resource-notice', { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const out = path.join(OUT, `${shot.name}.png`);
  await page.locator('.resource-notice').screenshot({ path: out });
  console.log(`  ✓ ${out}`);
  await context.close();
}

await shutdown(browser);
