/**
 * 首页视觉抽查 —— 把 dev server 上的页面按视口 / 明暗 / 考试 tab 截成图。
 *
 * 用法：
 *   npm run dev            # 另开一个终端
 *   npm run shot           # 全部截一遍
 *   npm run shot -- --only workspace-gongkao,updates
 *   npm run shot -- --url http://localhost:3001
 *
 * 输出：artifacts/screenshots/（已 gitignore；想留档就手动挪进 design-review/）
 *
 * 复用系统已装的 Chrome，不额外下载浏览器。
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join('artifacts', 'screenshots');
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const SHOTS = [
  // 整页
  { name: 'home-desktop-light', el: null, viewport: DESKTOP, theme: 'light' },
  { name: 'home-desktop-dark', el: null, viewport: DESKTOP, theme: 'dark' },
  { name: 'home-mobile-light', el: null, viewport: MOBILE, theme: 'light' },

  // 分区细看（2x，看得清字重和间距）
  { name: 'hero', el: '.landing-hero', viewport: DESKTOP, theme: 'light' },
  {
    name: 'workspace-kaoyan',
    el: '#exam-workspace',
    viewport: DESKTOP,
    theme: 'light',
  },
  // 考公有 7 个模块，是清单最密的一档
  {
    name: 'workspace-gongkao',
    el: '#exam-workspace',
    viewport: DESKTOP,
    theme: 'light',
    tab: '考公',
  },
  // 教资没有知识库，走「暂未上线」那个分支
  {
    name: 'workspace-teacher',
    el: '#exam-workspace',
    viewport: DESKTOP,
    theme: 'light',
    tab: '教师资格证',
  },
  {
    name: 'workspace-dark',
    el: '#exam-workspace',
    viewport: DESKTOP,
    theme: 'dark',
  },
  {
    name: 'workspace-mobile',
    el: '#exam-workspace',
    viewport: MOBILE,
    theme: 'light',
  },
  {
    name: 'updates',
    el: '.landing-section--updates',
    viewport: DESKTOP,
    theme: 'light',
  },
  { name: 'footer', el: '.landing-footer', viewport: DESKTOP, theme: 'light' },
];

function parseArgs(argv) {
  const out = { url: 'http://localhost:3000', only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url') out.url = argv[++i];
    else if (argv[i] === '--only')
      out.only = argv[++i].split(',').map((s) => s.trim());
  }
  return out;
}

/**
 * 等页面真正就位：
 * 1. ExamWorkspace 挂载后会把 data-mounted 置 true —— 现成的水合信号；
 * 2. SmoothReveal 用 IntersectionObserver 做入场，不滚一遍的话
 *    首屏以下全是 opacity:0，截出来是一片空白。
 */
async function settle(page) {
  await page
    .waitForSelector('.exam-workspace[data-mounted="true"]', {
      timeout: 15_000,
    })
    .catch(() => console.warn('  ! 没等到 data-mounted，可能没水合'));

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // 字体没加载完就截图，字重和换行都是错的
    await document.fonts.ready;
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await sleep(80);
    }
    window.scrollTo(0, 0);
    // 兜底：视口外没被触发的直接标记，免得截到空白
    for (const el of document.querySelectorAll(
      '[data-reveal],[data-reveal-group]',
    )) {
      el.classList.add('sr-visible');
    }
    await sleep(300);
  });
}

/**
 * Windows 上用 channel:'chrome' 时 browser.close() 会无限挂住。
 * 图这时已经全部落盘了，所以给它 3 秒，然后直接退进程。
 */
async function shutdown(browser, code = 0) {
  await Promise.race([
    browser.close().catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  process.exit(code);
}

async function run() {
  const { url, only } = parseArgs(process.argv.slice(2));

  const res = await fetch(url).catch(() => null);
  if (!res?.ok) {
    console.error(`\n✗ ${url} 连不上。先在另一个终端跑 npm run dev。\n`);
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  let browser;
  try {
    // 自带的 headless_shell 在这台机器上截图会报
    // "Protocol error (Page.captureScreenshot)"，系统 Chrome 正常，优先用它
    browser = await chromium.launch({
      channel: 'chrome',
      args: ['--disable-gpu'],
    });
  } catch {
    console.warn('! 找不到系统 Chrome，退回 Playwright 自带 Chromium');
    browser = await chromium.launch({ args: ['--disable-gpu'] });
  }

  const queue = only ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
  if (queue.length === 0) {
    console.error(
      `✗ --only 没匹配到任何一项。可选：${SHOTS.map((s) => s.name).join(', ')}`,
    );
    await shutdown(browser, 1);
  }

  const problems = [];

  for (const shot of queue) {
    const context = await browser.newContext({
      viewport: shot.viewport,
      colorScheme: shot.theme,
      // 分区图用 2x 看细节，整页图用 1x 免得文件过大
      deviceScaleFactor: shot.el ? 2 : 1,
    });
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    // 注意：不能用 waitUntil:'networkidle'。dev server 的 HMR socket
    // 一直开着，网络永远闲不下来，会一直挂到超时。
    // domcontentloaded + 下面的 settle() 才是可靠的就位信号。
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // rspress 用 html.dark 切主题，直接钉住，不依赖它读系统偏好
    await page.evaluate((theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }, shot.theme);

    await settle(page);

    if (shot.tab) {
      await page.getByRole('tab', { name: shot.tab, exact: true }).click();
      await page.waitForTimeout(800); // 让滑块和面板入场跑完
    }

    const file = path.join(OUT_DIR, `${shot.name}.png`);
    const target = shot.el ? page.locator(shot.el) : page;
    await target.screenshot({
      path: file,
      animations: 'disabled',
      ...(shot.el ? {} : { fullPage: true }),
    });

    console.log(`  ✓ ${file}`);
    if (errors.length) {
      problems.push({ name: shot.name, errors: [...new Set(errors)] });
    }
    await context.close();
  }

  if (problems.length) {
    console.log('\n浏览器控制台报错：');
    for (const p of problems) {
      console.log(`  [${p.name}]`);
      for (const e of p.errors) console.log(`    ${e.slice(0, 300)}`);
    }
  } else {
    console.log('\n控制台无报错。');
  }
  console.log(`\n共 ${queue.length} 张 → ${OUT_DIR}\n`);

  await shutdown(browser);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
