import { useEffect, useMemo, useState } from 'react';
import {
  resources,
  type ExamKey,
  type ResourceItem,
  type ResourceStatus,
} from '../data/resources';

type ExamFilter = ExamKey | 'all';
type StatusFilter = ResourceStatus | 'all';

const examOptions: Array<{ value: ExamFilter; label: string }> = [
  { value: 'all', label: '全部考试' },
  { value: 'kaoyan', label: '考研' },
  { value: 'gongkao', label: '考公' },
  { value: 'kaobian', label: '考编' },
  { value: 'teacher', label: '教师资格证' },
  { value: 'cet', label: '英语四六级' },
  { value: 'other', label: '其他考试' },
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '链接可用' },
  { value: 'review', label: '待重新验证' },
  { value: 'expired', label: '已失效' },
];

const statusLabels: Record<ResourceStatus, string> = {
  active: '链接可用',
  review: '待重新验证',
  expired: '已失效',
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

export function ResourceExplorer() {
  const [keyword, setKeyword] = useState('');
  const [exam, setExam] = useState<ExamFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const requestedExam = new URLSearchParams(window.location.search).get(
      'exam',
    );
    if (examOptions.some((option) => option.value === requestedExam)) {
      setExam(requestedExam as ExamFilter);
    }
  }, []);

  const filteredResources = useMemo(
    () =>
      resources
        .filter((resource) => exam === 'all' || resource.exam === exam)
        .filter((resource) => status === 'all' || resource.status === status)
        .filter((resource) => !keyword || includesKeyword(resource, keyword))
        .sort((left, right) => right.verifiedAt.localeCompare(left.verifiedAt)),
    [exam, keyword, status],
  );

  const copyCode = async (resource: ResourceItem) => {
    if (!resource.code) return;
    await navigator.clipboard.writeText(resource.code);
    setCopiedId(resource.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <section className="resource-explorer" aria-label="资料筛选">
      <div className="resource-explorer__toolbar">
        <label className="resource-field resource-field--search">
          <span>关键词</span>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索资料名称、科目或标签"
          />
        </label>

        <label className="resource-field">
          <span>考试类型</span>
          <select
            value={exam}
            onChange={(event) => setExam(event.target.value as ExamFilter)}
          >
            {examOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="resource-field">
          <span>链接状态</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="resource-explorer__summary" aria-live="polite">
        <span>检索结果</span>
        <strong>{filteredResources.length} 份资料</strong>
      </div>

      {filteredResources.length > 0 ? (
        <div className="resource-list">
          {filteredResources.map((resource) => (
            <article className="resource-row" key={resource.id}>
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
                <span
                  className={`resource-status resource-status--${resource.status}`}
                >
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
                    <button type="button" onClick={() => copyCode(resource)}>
                      {copiedId === resource.id ? '已复制' : '复制提取码'}
                    </button>
                  ) : null}
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    打开网盘
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="resource-empty">
          <span>RESOURCE INDEX / EMPTY</span>
          <h2>首批资料正在核验。</h2>
          <p>
            暂时不展示未经确认的链接。录入真实资料后，这里会自动支持搜索、分类和状态筛选。
          </p>
          <a href="/about/#资料收录原则">查看资料收录原则</a>
        </div>
      )}
    </section>
  );
}
