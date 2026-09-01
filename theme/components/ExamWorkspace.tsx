import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  EXAMS,
  EXAM_ORDER,
  isExamId,
  type ExamConfig,
  type ExamId,
} from '../data/exams';

interface ExamWorkspaceProps {
  defaultExam?: ExamId;
}

function readInitialExam(fallback: ExamId): ExamId {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get('exam');
    if (isExamId(candidate)) {
      return candidate;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeExamToUrl(id: ExamId) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('exam') === id) {
      return;
    }
    url.searchParams.set('exam', id);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* ignore */
  }
}

function ExamSelector({
  selected,
  onSelect,
  baseId,
}: {
  selected: ExamId;
  onSelect: (id: ExamId) => void;
  baseId: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const settled = useRef(false);
  /**
   * 滑块（glider）：选中态的底色不画在 tab 上，而是由一条独立的胶囊
   * 在 tab 之间滑过去。测量交给 JS，动画交给 CSS。
   * 量不到时 data-glider="false"，tab 退回自带底色，功能不受影响。
   */
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);
  const listId = `${baseId}-list`;
  const currentIndex = EXAM_ORDER.indexOf(selected);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const measure = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (active) {
        setGlider({ x: active.offsetLeft, w: active.offsetWidth });
      }
    };

    measure();

    // 选中项滚进可视区（窄屏 tab 条会横向溢出）；首次测量不滚，避免加载时跳动
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (active && settled.current) {
      active.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
    settled.current = true;

    // 字体加载完 / 容器变宽都会改变 tab 宽度，滑块要跟着重新对齐
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const child of Array.from(list.children)) {
      observer.observe(child);
    }
    return () => observer.disconnect();
  }, [selected]);

  const focusTab = (index: number) => {
    const safe = (index + EXAM_ORDER.length) % EXAM_ORDER.length;
    const el = document.getElementById(`${baseId}-tab-${EXAM_ORDER[safe]}`);
    el?.focus();
  };

  const selectTab = (index: number) => {
    const safe = (index + EXAM_ORDER.length) % EXAM_ORDER.length;
    onSelect(EXAM_ORDER[safe]);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusTab(currentIndex + 1);
        selectTab(currentIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusTab(currentIndex - 1);
        selectTab(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        selectTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(EXAM_ORDER.length - 1);
        selectTab(EXAM_ORDER.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="exam-selector"
      ref={listRef}
      role="tablist"
      aria-label="选择考试"
      aria-orientation="horizontal"
      id={listId}
      data-glider={glider ? 'true' : 'false'}
      onKeyDown={handleKeyDown}
    >
      <span
        className="exam-selector__glider"
        aria-hidden="true"
        style={
          glider
            ? ({
                ['--glider-x' as never]: `${glider.x}px`,
                ['--glider-w' as never]: `${glider.w}px`,
              } as React.CSSProperties)
            : undefined
        }
      />

      {EXAM_ORDER.map((id) => {
        const exam = EXAMS[id];
        const active = id === selected;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${id}`}
            aria-selected={active}
            aria-controls={`${baseId}-panel-${id}`}
            tabIndex={active ? 0 : -1}
            className={`exam-selector__tab${active ? ' is-active' : ''}`}
            style={
              {
                ['--exam-soft' as never]: exam.tone.soft,
                ['--exam-accent' as never]: exam.tone.accent,
              } as React.CSSProperties
            }
            onClick={() => onSelect(id)}
          >
            <span className="exam-selector__dot" aria-hidden="true" />
            <span className="exam-selector__label">{exam.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function WorkspacePane({ exam, baseId }: { exam: ExamConfig; baseId: string }) {
  const showKnowledge = !!exam.knowledge;
  const knowledge = exam.knowledge;
  return (
    <div
      key={exam.id}
      className="workspace__pane"
      id={`${baseId}-panel-${exam.id}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${exam.id}`}
    >
      <header className="workspace__head">
        <h3 className="workspace__title">{exam.label}</h3>
        <p className="workspace__tagline">{exam.tagline}</p>
      </header>

      {/* 始终两栏：没有知识库时左栏显示「暂未上线」，
          塞进一栏会让场地右半边整个空掉 */}
      <div className="workspace__body">
        {showKnowledge && knowledge ? (
          <section
            className="workspace__col workspace__col--read"
            aria-labelledby={`${baseId}-read-${exam.id}`}
          >
            <p className="workspace__role">知识库</p>
            <h4
              className="workspace__col-title"
              id={`${baseId}-read-${exam.id}`}
            >
              直接开始学习
            </h4>
            <p className="workspace__col-summary">{knowledge.summary}</p>
            {knowledge.modules.length > 0 && (
              <ul className="workspace__modules">
                {knowledge.modules.map((m) => (
                  <li key={m.label}>
                    <strong>{m.label}</strong>
                    {m.hint && <span>{m.hint}</span>}
                  </li>
                ))}
              </ul>
            )}
            <a
              className="workspace__cta workspace__cta--primary"
              href={knowledge.href}
            >
              打开{exam.qualifier}知识库 <span aria-hidden="true">↗</span>
            </a>
          </section>
        ) : (
          <section
            className="workspace__col workspace__col--read workspace__col--placeholder"
            aria-labelledby={`${baseId}-read-${exam.id}`}
          >
            <p className="workspace__role">知识库</p>
            <h4
              className="workspace__col-title"
              id={`${baseId}-read-${exam.id}`}
            >
              暂未上线
            </h4>
            <p className="workspace__col-summary">
              {exam.label}目前以资料索引为主，知识讲解正在整理中。
            </p>
          </section>
        )}

        <section
          className="workspace__col workspace__col--find"
          aria-labelledby={`${baseId}-find-${exam.id}`}
        >
          <p className="workspace__role">资料库</p>
          <h4 className="workspace__col-title" id={`${baseId}-find-${exam.id}`}>
            查找备考资料
          </h4>
          <p className="workspace__col-summary">{exam.resources.summary}</p>
          {exam.resources.bullets.length > 0 && (
            <ul className="workspace__bullets">
              {exam.resources.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <a
            className={`workspace__cta${showKnowledge ? '' : ' workspace__cta--primary'}`}
            href={exam.resources.href}
          >
            查看{exam.label}资料 <span aria-hidden="true">↗</span>
          </a>
        </section>
      </div>
    </div>
  );
}

/**
 * 光斑跟随指针 —— 整节唯一的「跟手」反馈。
 * 只写 CSS 变量、用 rAF 合帧，不触发 React 重渲染。
 * 触屏和 reduced-motion 直接不挂，省得白算。
 */
function useSpotlight(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') {
      return;
    }
    const canHover = window.matchMedia('(hover: hover)').matches;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (!canHover || reduced) {
      return;
    }

    let frame = 0;
    let x = 50;
    let y = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty('--spot-x', `${x}%`);
      el.style.setProperty('--spot-y', `${y}%`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width) * 100;
      y = ((event.clientY - rect.top) / rect.height) * 100;
      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    };
    const onEnter = () => el.setAttribute('data-spot', 'true');
    const onLeave = () => el.removeAttribute('data-spot');

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [ref]);
}

export default function ExamWorkspace({
  defaultExam = 'kaoyan',
}: ExamWorkspaceProps) {
  const baseId = useId();
  const [selected, setSelected] = useState<ExamId>(defaultExam);
  const [mounted, setMounted] = useState(false);
  /** 切换方向：新面板从哪一侧滑进来，跟着 tab 的移动方向走 */
  const [dir, setDir] = useState(0);
  const prevIndex = useRef(EXAM_ORDER.indexOf(defaultExam));
  const fieldRef = useRef<HTMLDivElement>(null);

  useSpotlight(fieldRef);

  useEffect(() => {
    const initial = readInitialExam(defaultExam);
    setSelected(initial);
    prevIndex.current = EXAM_ORDER.indexOf(initial);
    setMounted(true);
  }, [defaultExam]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    writeExamToUrl(selected);
  }, [selected, mounted]);

  const handleSelect = (id: ExamId) => {
    if (id === selected) {
      return;
    }
    const next = EXAM_ORDER.indexOf(id);
    setDir(next > prevIndex.current ? 1 : -1);
    prevIndex.current = next;
    setSelected(id);
  };

  const exam = EXAMS[selected];

  return (
    <div
      className="exam-workspace"
      data-mounted={mounted ? 'true' : 'false'}
      style={
        {
          ['--exam-soft' as never]: exam.tone.soft,
          ['--exam-accent' as never]: exam.tone.accent,
        } as React.CSSProperties
      }
    >
      <ExamSelector
        selected={selected}
        onSelect={handleSelect}
        baseId={baseId}
      />
      <div
        className="workspace"
        ref={fieldRef}
        data-exam={selected}
        data-dir={dir}
      >
        <WorkspacePane exam={exam} baseId={baseId} />
      </div>
    </div>
  );
}
