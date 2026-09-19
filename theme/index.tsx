import './index.css';

import { useLocation, useSidebar } from '@rspress/core/runtime';
import {
  Layout as OriginalLayout,
  SidebarList,
} from '@rspress/core/theme-original';
import { useLayoutEffect, useState } from 'react';
import type { SidebarData } from '@rspress/shared';

export * from '@rspress/core/theme-original';

type SidebarEntry = SidebarData[number];

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
 * 让侧栏第一级分组（考研/考公）默认展开，第二级内容直接可见；
 * 更深的分组保持折叠，用户点箭头手动展开。
 *
 * 注意：这里必须硬写 collapsed 的值，而不能写成 `item.collapsed ?? true`。
 * Rspress 的 normalizeThemeConfig 会给每个分组填默认值 collapsed: false，
 * 「框架填的默认值」和「用户手动展开/收起后的值」在数据上无法区分，
 * 所以展开策略只在初始化时执行一次，之后由 Rspress 自己的 setSidebarData
 * 接管，用户的手动操作不会被覆盖。
 */
function expandSidebarEntry(item: SidebarEntry, depth: number): SidebarEntry {
  if (!('items' in item) || !Array.isArray(item.items)) {
    return item;
  }

  return {
    ...item,
    items: item.items.map((child) => expandSidebarEntry(child, depth + 1)),
    collapsible: true,
    collapsed: depth > 0,
  };
}

function expandSidebarData(sidebarData: SidebarData): SidebarData {
  return sidebarData.map((item) => expandSidebarEntry(item, 0));
}

export function Sidebar() {
  const rawSidebarData = useSidebar();

  // 用 useState 的惰性初始化把「展开到第二级」做进首屏渲染。
  // 这点很关键：若改成用 useLayoutEffect 展开，SSR 阶段 effect 不执行，
  // 生产构建的 HTML 会是全折叠的，用户会先看到侧栏闪一下再展开。
  const [sidebarData, setSidebarData] = useState(() =>
    expandSidebarData(rawSidebarData),
  );

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
        const next =
          !document.documentElement.classList.contains('gk-reveal-all');
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
