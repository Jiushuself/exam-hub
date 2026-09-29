import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@rspress/core/runtime';
import {
  resources,
  type ExamKey,
  type ResourceItem,
  type ResourceStatus,
} from '../data/resources';

const statusLabels: Record<ResourceStatus, string> = {
  active: '链接可用',
  review: '待重新验证',
  expired: '已失效',
};

const examKeys: ExamKey[] = [
  'kaoyan',
  'gongkao',
  'kaobian',
  'teacher',
  'cet',
  'other',
];

const examLabels: Record<ExamKey, string> = {
  kaoyan: '考研资料',
  gongkao: '考公资料',
  kaobian: '考编资料',
  teacher: '教师类资料',
  cet: '英语四六级',
  other: '其他考试资料',
};

const examDescriptions: Record<ExamKey, string> = {
  kaoyan: '公共课、专业课与院校备考资料',
  gongkao: '行测、申论与公考备考课程',
  kaobian: '事业单位、三支一扶与考编资料',
  teacher: '教师资格证与教师招聘资料',
  cet: '英语四级、六级课程与备考资料',
  other: '医考、面试及其他考试资料',
};

function includesKeyword(resource: ResourceItem, keyword: string) {
  const searchableText = [
    resource.title,
    resource.description,
    resource.subject,
    resource.provider,
    resource.source,
    ...resource.types,
  ]
    .join(' ')
    .toLocaleLowerCase();

  return searchableText.includes(keyword.toLocaleLowerCase());
}

interface ResourceRowProps {
  resource: ResourceItem;
  copiedId: string | null;
  onCopyCode: (resource: ResourceItem) => void;
}

function ResourceRow({ resource, copiedId, onCopyCode }: ResourceRowProps) {
  return (
    <article className="resource-row" id={resource.id} tabIndex={-1}>
      <div className="resource-row__main">
        <div className="resource-row__meta">
          <span>{resource.subject}</span>
          {resource.year ? <span>{resource.year}</span> : null}
          <span>{resource.provider}</span>
        </div>
        <h2>{resource.title}</h2>
        <p>{resource.description}</p>
        <div className="resource-row__tags">
          {resource.types.map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
      </div>

      <div className="resource-row__aside">
        <span className={`resource-status resource-status--${resource.status}`}>
          {statusLabels[resource.status]}
        </span>
        <dl>
          <div>
            <dt>来源</dt>
            <dd>{resource.source}</dd>
          </div>
          <div>
            <dt>授权</dt>
            <dd>{resource.rights}</dd>
          </div>
          <div>
            <dt>最后验证</dt>
            <dd>{resource.verifiedAt}</dd>
          </div>
        </dl>
        <div className="resource-row__actions">
          {resource.code ? (
            <button type="button" onClick={() => onCopyCode(resource)}>
              {copiedId === resource.id ? '已复制' : '复制提取码'}
            </button>
          ) : null}
          <a href={resource.url} target="_blank" rel="noreferrer">
            打开网盘
          </a>
        </div>
      </div>
    </article>
  );
}

export function ResourceExplorer() {
  const [keyword, setKeyword] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExamKey>('kaoyan');
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const requestedExam = new URLSearchParams(location.search).get('exam');
    if (location.hash || !examKeys.includes(requestedExam as ExamKey)) return;

    const examKey = requestedExam as ExamKey;
    setActiveCategory(examKey);
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`resource-group-${examKey}`)
        ?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.search]);

  useEffect(() => {
    const targetId = decodeURIComponent(location.hash.slice(1));
    const targetResource = resources.find(
      (resource) => resource.id === targetId,
    );
    if (targetResource) {
      setActiveCategory(targetResource.exam);
      return;
    }

    const targetExam = examKeys.find(
      (examKey) => targetId === `resource-group-${examKey}`,
    );
    if (targetExam) setActiveCategory(targetExam);
  }, [location.hash]);

  const filteredResources = useMemo(
    () =>
      resources
        .filter((resource) => !keyword || includesKeyword(resource, keyword))
        .sort((left, right) => right.verifiedAt.localeCompare(left.verifiedAt)),
    [keyword],
  );

  const resourceGroups = useMemo(
    () =>
      examKeys
        .map((examKey) => ({
          key: examKey,
          label: examLabels[examKey],
          description: examDescriptions[examKey],
          items: filteredResources.filter(
            (resource) => resource.exam === examKey,
          ),
        }))
        .filter((group) => group.items.length > 0),
    [filteredResources],
  );

  const directoryGroups = useMemo(
    () =>
      examKeys.map((examKey) => ({
        key: examKey,
        label: examLabels[examKey],
        items: resources
          .filter((resource) => resource.exam === examKey)
          .sort((left, right) =>
            right.verifiedAt.localeCompare(left.verifiedAt),
          ),
      })),
    [],
  );
  const activeGroup = directoryGroups.find(
    (group) => group.key === activeCategory,
  );
  const activeSubjects = useMemo(() => {
    const subjects = new Map<
      string,
      { label: string; firstResourceId: string; count: number }
    >();

    for (const resource of activeGroup?.items ?? []) {
      const existing = subjects.get(resource.subject);
      if (existing) {
        existing.count += 1;
      } else {
        subjects.set(resource.subject, {
          label: resource.subject,
          firstResourceId: resource.id,
          count: 1,
        });
      }
    }

    return [...subjects.values()];
  }, [activeGroup]);

  const clearSearch = () => {
    setSearchDraft('');
    setKeyword('');
  };

  const applySearch = () => {
    const nextKeyword = searchDraft.trim();
    setKeyword(nextKeyword);
    const firstMatch = resources.find((resource) =>
      includesKeyword(resource, nextKeyword),
    );
    if (nextKeyword && firstMatch) setActiveCategory(firstMatch.exam);
  };

  const navigateToDirectoryTarget = (targetId: string, examKey: ExamKey) => {
    setActiveCategory(examKey);
    clearSearch();
    setPendingTarget(targetId);
  };

  useEffect(() => {
    if (!pendingTarget) return;
    const target = document.getElementById(pendingTarget);
    if (!target) return;

    if (window.location.hash !== `#${pendingTarget}`) {
      window.location.hash = pendingTarget;
    }
    target.scrollIntoView({ block: 'start' });
    setPendingTarget(null);
  }, [pendingTarget, keyword]);

  const copyCode = async (resource: ResourceItem) => {
    if (!resource.code) return;
    await navigator.clipboard.writeText(resource.code);
    setCopiedId(resource.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <section
      className="resource-explorer rp-not-doc"
      aria-label="资料目录与搜索"
    >
      <div className="resource-explorer__summary" aria-live="polite">
        <span>检索结果</span>
        <strong>{filteredResources.length} 份资料</strong>
      </div>

      <div className="resource-layout resource-layout--indexed">
        <nav className="resource-index" aria-label="资料目录">
          <div className="resource-index__head">
            <div>
              <span>RESOURCE INDEX</span>
              <strong>资料目录</strong>
            </div>
            <small>{examKeys.length} 大类</small>
          </div>

          <form
            className="resource-index__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <label htmlFor="resource-directory-search">搜索网盘资料</label>
            <div className="resource-index__search-row">
              <input
                id="resource-directory-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="科目、名称或标签"
              />
              <button type="submit">搜索</button>
            </div>
            {keyword || searchDraft ? (
              <button
                className="resource-index__clear"
                type="button"
                onClick={clearSearch}
              >
                清除搜索
              </button>
            ) : null}
            {keyword ? (
              <p className="resource-index__search-hint">
                点击目录可退出搜索并跳转到完整分类。
              </p>
            ) : null}
          </form>

          <div className="resource-index__label">考试分类</div>
          <ol className="resource-index__categories">
            {examKeys.map((examKey, index) => {
              const group = directoryGroups.find(
                (item) => item.key === examKey,
              );
              const content = (
                <>
                  <span className="resource-index__number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="resource-index__category-name">
                    {examLabels[examKey]}
                  </span>
                  <span className="resource-index__count">
                    {group?.items.length ?? 0}
                  </span>
                </>
              );

              return (
                <li key={examKey}>
                  <a
                    className={
                      activeGroup?.key === examKey
                        ? 'resource-index__category--active'
                        : undefined
                    }
                    href={`#resource-group-${examKey}`}
                    aria-current={
                      activeGroup?.key === examKey ? 'location' : undefined
                    }
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToDirectoryTarget(
                        `resource-group-${examKey}`,
                        examKey,
                      );
                    }}
                  >
                    {content}
                  </a>
                </li>
              );
            })}
          </ol>

          <div className="resource-index__subject-head">
            <strong>{activeGroup?.label ?? '暂无匹配分类'} · 科目</strong>
            <span>{activeSubjects.length}</span>
          </div>
          <ol className="resource-index__subjects">
            {activeSubjects.map((subject) => (
              <li key={subject.label}>
                <a
                  href={`#${subject.firstResourceId}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToDirectoryTarget(
                      subject.firstResourceId,
                      activeCategory,
                    );
                  }}
                >
                  <span>{subject.label}</span>
                  {subject.count > 1 ? <small>{subject.count}</small> : null}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {filteredResources.length > 0 ? (
          <div className="resource-list">
            {resourceGroups.map((group, index) => (
              <section
                className="resource-group"
                data-category={group.key}
                key={group.key}
              >
                <header
                  className="resource-group__header"
                  id={`resource-group-${group.key}`}
                  tabIndex={-1}
                >
                  <div className="resource-group__marker" aria-hidden="true">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <small>分类</small>
                  </div>
                  <div className="resource-group__heading">
                    <span>RESOURCE CATEGORY</span>
                    <h2>{group.label}</h2>
                    <p>{group.description}</p>
                  </div>
                  <strong className="resource-group__count">
                    {group.items.length} 份资料
                  </strong>
                </header>
                <div className="resource-group__items">
                  {group.items.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      copiedId={copiedId}
                      onCopyCode={copyCode}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="resource-empty">
            <span>RESOURCE INDEX / EMPTY</span>
            <h2>没有找到匹配的资料</h2>
            <p>试试其他关键词，或清除搜索后浏览完整目录。</p>
            <button type="button" onClick={clearSearch}>
              清除搜索
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
