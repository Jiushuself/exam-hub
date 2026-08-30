import { useEffect } from 'react';
import { useLocation } from '@rspress/core/runtime';

/**
 * SmoothReveal —— 全局丝滑体验
 * 1. 给标记 data-reveal / data-reveal-group 的元素做滚动入场；
 * 2. 路由切换时给内容区做一次轻微淡入。
 * 全部遵守 prefers-reduced-motion；JS 失效时内容直接可见（CSS 只在
 * html.sr-armed 下隐藏元素，本组件挂载后才加 sr-armed）。
 */
export default function SmoothReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const markAllVisible = () => {
      for (const el of document.querySelectorAll<HTMLElement>(
        '[data-reveal], [data-reveal-group]',
      )) {
        el.classList.add('sr-visible');
      }
    };

    if (reduced || !('IntersectionObserver' in window)) {
      markAllVisible();
      return;
    }

    const root = document.documentElement;
    root.classList.add('sr-armed');

    // 路由切换淡入
    const page = document.querySelector<HTMLElement>(
      '.rp-doc-layout__content, .rp-doc-layout, main.landing-home',
    );
    if (page) {
      page.classList.remove('sr-page-enter');
      requestAnimationFrame(() => {
        page.classList.add('sr-page-enter');
      });
    }

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const el = entry.target as HTMLElement;
          if (el.hasAttribute('data-reveal-group')) {
            const kids = Array.from(el.children) as HTMLElement[];
            kids.forEach((kid, i) => {
              kid.style.setProperty('--sr-delay', `${Math.min(i * 70, 560)}ms`);
            });
          }
          el.classList.add('sr-visible');
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const scan = () => {
      for (const el of document.querySelectorAll(
        '[data-reveal], [data-reveal-group]',
      )) {
        if (observed.has(el) || el.classList.contains('sr-visible')) {
          continue;
        }
        observed.add(el);
        observer.observe(el);
      }
    };
    scan();

    // 自定义页在客户端可能重渲染 DOM，用 MutationObserver 兜底重扫
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
      root.classList.remove('sr-armed');
    };
  }, [pathname]);

  return null;
}
