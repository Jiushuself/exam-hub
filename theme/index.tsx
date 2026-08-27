import './index.css';

import { useLocation, useSidebarDynamic } from '@rspress/core/runtime';
import {
  Layout as OriginalLayout,
  SidebarList,
} from '@rspress/core/theme-original';
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

export function Sidebar() {
  const { pathname } = useLocation();
  const [sidebarData, setSidebarData] = useSidebarDynamic();
  const section = getExamSection(pathname);
  const visibleSidebar = section
    ? filterSidebarData(sidebarData, section)
    : sidebarData;

  return (
    <SidebarList sidebarData={visibleSidebar} setSidebarData={setSidebarData} />
  );
}

export function Layout() {
  return <OriginalLayout navTitle={<SiteWordmark />} />;
}
