import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<FilterOption<T>>;
  onChange: (value: T) => void;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const listId = `${baseId}-list`;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isOpen]);

  const focusOption = (index: number) => {
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  };

  const openAndFocus = (index: number) => {
    setIsOpen(true);
    focusOption(index);
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openAndFocus(selectedIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openAndFocus(options.length - 1);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const lastIndex = options.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index === lastIndex ? 0 : index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index === 0 ? lastIndex : index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(lastIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectOption = (option: FilterOption<T>) => {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      className={`resource-field resource-select${isOpen ? ' resource-select--open' : ''}`}
      ref={rootRef}
    >
      <span id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="resource-select__trigger"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span id={valueId}>{selectedOption.label}</span>
        <svg
          className="resource-select__chevron"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="m5.75 7.75 4.25 4.5 4.25-4.5" />
        </svg>
      </button>

      {isOpen ? (
        <ul
          id={listId}
          className="resource-select__menu"
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value} role="presentation">
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  className="resource-select__option"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span>{option.label}</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="m5.2 10.2 3 3.1 6.7-7" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

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
    <article className="resource-row">
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

  const resourceGroups = useMemo(
    () =>
      examKeys
        .map((examKey) => ({
          key: examKey,
          label: examLabels[examKey],
          items: filteredResources.filter(
            (resource) => resource.exam === examKey,
          ),
        }))
        .filter((group) => group.items.length > 0),
    [filteredResources],
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

        <FilterSelect
          label="考试类型"
          value={exam}
          options={examOptions}
          onChange={setExam}
        />

        <FilterSelect
          label="链接状态"
          value={status}
          options={statusOptions}
          onChange={setStatus}
        />
      </div>

      <div className="resource-explorer__summary" aria-live="polite">
        <span>检索结果</span>
        <strong>{filteredResources.length} 份资料</strong>
      </div>

      {filteredResources.length > 0 ? (
        <div className="resource-list">
          {resourceGroups.map((group, index) => (
            <section className="resource-group" key={group.key}>
              <header className="resource-group__header">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{group.label}</h2>
                  <p>{group.items.length} 份资料</p>
                </div>
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
