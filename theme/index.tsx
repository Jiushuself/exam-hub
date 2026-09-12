import './index.css';

import { useLocation, useSidebar } from '@rspress/core/runtime';
import {
  Layout as OriginalLayout,
  SidebarList,
} from '@rspress/core/theme-original';
import { useLayoutEffect, useRef, useState } from 'react';
import type { SidebarData } from '@rspress/shared';

export * from '@rspress/core/theme-original';

type ExamSection = 'kaoyan' | 'gongkao';
type SidebarEntry = SidebarData[number];

function getExamSection(pathname: string): ExamSection | null {
  if (/\/(?:knowledge\/)?kaoyan(?:\/|$)/.test(pathname)) {
    return 'kaoyan';
  }

  if (/\/(?:knowledge\/)?gongkao(?:\/|$)/.test(pathname)) {
    return 'gongkao';
  }

  return null;
}

function shouldHideLink(link: string | undefined, section: ExamSection) {
  if (!link) {
    return false;
  }

  const normalizedLink = link.replace(/\/$/, '');
  const otherSection = section === 'kaoyan' ? 'gongkao' : 'kaoyan';

  return new RegExp(`/(?:knowledge/)?${otherSection}(?:/|$)`).test(
    normalizedLink,
  );
}

function filterSidebarEntry(
  item: SidebarEntry,
  section: ExamSection,
): SidebarEntry | null {
  if ('link' in item && shouldHideLink(item.link, section)) {
    return null;
  }

  if ('items' in item) {
    const items = item.items
      .map((child) => filterSidebarEntry(child, section))
      .filter((child): child is SidebarEntry => child !== null);

    if (items.length === 0 && !('link' in item && item.link)) {
      return null;
    }

    return { ...item, items };
  }

  return item;
}

function filterSidebarData(
  sidebarData: SidebarData,
  section: ExamSection,
): SidebarData {
  return sidebarData
    .map((item) => filterSidebarEntry(item, section))
    .filter((item): item is SidebarEntry => item !== null);
}

function SiteWordmark() {
  return (
    <a className="site-wordmark" href="/" aria-label="上岸知识库首页">
      <span className="site-wordmark__symbol" aria-hidden="true">
        <img src="/brand-mark.svg" alt="" width="34" height="34" />
      </span>
      <span className="site-wordmark__text">
        <strong>上岸知识库</strong>
        <small>EXAM HUB</small>
      </span>
    </a>
  );
}

/**
 * 让侧栏的目录分组默认折叠起来，由用户点箭头展开。
 *
 * 注意：这里必须硬写 collapsed: true，而不能写成 `item.collapsed ?? true`。
 * Rspress 的 normalizeThemeConfig 会给每个分组填默认值 collapsed: false，
 * 所以「框架填的 false」和「用户手动展开的 false」在数据上无法区分。
 * 因此折叠只在初始化时执行一次（见 Sidebar 里的 ref 守卫），
 * 之后由 Rspress 自己的 setSidebarData 接管，用户的手动操作不会被覆盖。
 */
function collapseSidebarEntry(item: SidebarEntry): SidebarEntry {
  if (!('items' in item) || !Array.isArray(item.items)) {
    return item;
  }

  return {
    ...item,
    items: item.items.map(collapseSidebarEntry),
    collapsible: true,
    collapsed: true,
  };
}

function collapseSidebarData(sidebarData: SidebarData): SidebarData {
  return sidebarData.map(collapseSidebarEntry);
}

/**
 * 生成侧栏的初始数据：先按分区过滤（考研页不显示考公），再默认折叠。
 *
 * 过滤和折叠都要写进 state 本身，不能在渲染时临时算一份副本：
 * SidebarGroup 的展开/收起是按「数组下标」回写 setSidebarData 的，
 * 如果渲染的是过滤后的副本、而 setSidebarData 操作的是未过滤的原始数据，
 * 下标就会错位——例如考公页点「考公」实际改到的是不可见的「考研」。
 */
function buildSidebarData(
  rawSidebarData: SidebarData,
  section: ExamSection | null,
): SidebarData {
  const filtered = section
    ? filterSidebarData(rawSidebarData, section)
    : rawSidebarData;

  return collapseSidebarData(filtered);
}

export function Sidebar() {
  const { pathname } = useLocation();
  const rawSidebarData = useSidebar();
  const section = getExamSection(pathname);

  // 用 useState 的惰性初始化把「过滤 + 默认折叠」做进首屏渲染。
  // 这点很关键：若改成用 useLayoutEffect 折叠，SSR 阶段 effect 不执行，
  // 生产构建的 HTML 会是全展开的，用户会先看到侧栏闪一下再收起。
  const [sidebarData, setSidebarData] = useState(() =>
    buildSidebarData(rawSidebarData, section),
  );

  // 只在切换知识库分区（考研 <-> 考公）时重算，
  // 分区内跳转保留用户手动展开的分组。
  const builtFor = useRef<ExamSection | null>(section);

  useLayoutEffect(() => {
    if (builtFor.current === section) {
      return;
    }
    builtFor.current = section;
    setSidebarData(buildSidebarData(rawSidebarData, section));
  }, [section, rawSidebarData]);

  return (
    <SidebarList sidebarData={sidebarData} setSidebarData={setSidebarData} />
  );
}

export function Layout() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest) {
        return;
      }
      const fill = target.closest('.gongkao-fill');
      if (fill) {
        fill.classList.toggle('gk-revealed');
        return;
      }
      const toggle = target.closest('.gongkao-fill-toggle');
      if (toggle) {
        const next = !document.documentElement.classList.contains('gk-reveal-all');
        document.documentElement.classList.toggle('gk-reveal-all', next);
        document.querySelectorAll('.gongkao-fill-toggle').forEach((el) => {
          el.setAttribute('aria-pressed', String(next));
        });
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // 路由切换后同步页内按钮的开关状态（SPA 内容稍后挂载）
  useLayoutEffect(() => {
    const id = window.setTimeout(() => {
      const on = document.documentElement.classList.contains('gk-reveal-all');
      document.querySelectorAll('.gongkao-fill-toggle').forEach((el) => {
        el.setAttribute('aria-pressed', String(on));
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return <OriginalLayout navTitle={<SiteWordmark />} />;
}
