export type ExamId =
  'kaoyan' | 'gongkao' | 'kaobian' | 'teacher' | 'cet' | 'other';

export interface ExamTone {
  /** Pastel background used for the workspace hero block */
  soft: string;
  /** Accent color used for active states, headings and the primary CTA */
  accent: string;
}

export interface ExamKnowledge {
  available: true;
  href: string;
  summary: string;
  modules: Array<{ label: string; hint?: string }>;
}

export interface ExamResources {
  href: string;
  summary: string;
  bullets: string[];
}

export interface ExamConfig {
  id: ExamId;
  /** Display name in Chinese (without subject qualifier) */
  label: string;
  /** Short qualifier shown under the label */
  qualifier: string;
  /** Mono uppercase code shown in the eyebrow */
  code: string;
  /** Short tagline shown in the selector tooltip / workspace head */
  tagline: string;
  /** Visual tone — sourced from existing hero cards to keep colors consistent */
  tone: ExamTone;
  knowledge?: ExamKnowledge;
  resources: ExamResources;
}

export const EXAM_ORDER: ExamId[] = [
  'kaoyan',
  'gongkao',
  'kaobian',
  'teacher',
  'cet',
  'other',
];

export const EXAMS: Record<ExamId, ExamConfig> = {
  kaoyan: {
    id: 'kaoyan',
    label: '计算机 408',
    qualifier: '考研',
    code: 'KAOYAN / 408',
    tagline: '站内可读 · 资料可查',
    tone: { soft: '#def6ef', accent: '#138f79' },
    knowledge: {
      available: true,
      href: '/knowledge/kaoyan/408/',
      summary: '四门专业课已整理成可顺序阅读的章节。',
      modules: [
        { label: '数据结构', hint: '结构、算法与复杂度' },
        { label: '计算机组成原理', hint: '数据表示与系统结构' },
        { label: '操作系统', hint: '进程、内存与文件系统' },
        { label: '计算机网络', hint: '协议分层与传输过程' },
      ],
    },
    resources: {
      href: '/resources/?exam=kaoyan',
      summary: '考研综合资料按科目、阶段、资料类型整理。',
      bullets: ['综合资料', '专业课', '课程 / 讲义', '备考工具'],
    },
  },
  gongkao: {
    id: 'gongkao',
    label: '考公',
    qualifier: '公务员 / 事业单位',
    code: 'GONGKAO',
    tagline: '行测六大模块与申论',
    tone: { soft: '#ffebe3', accent: '#dc7459' },
    knowledge: {
      available: true,
      href: '/knowledge/gongkao/',
      summary: '行测六大模块和申论按章节持续整理。',
      modules: [
        { label: '资料分析' },
        { label: '言语理解' },
        { label: '判断推理' },
        { label: '数量关系' },
        { label: '政治理论' },
        { label: '公基常识' },
        { label: '申论' },
      ],
    },
    resources: {
      href: '/resources/?exam=gongkao',
      summary: '行测、申论与公考备考课程统一检索。',
      bullets: ['行测', '申论', '公考课程'],
    },
  },
  kaobian: {
    id: 'kaobian',
    label: '考编',
    qualifier: '事业单位 / 三支一扶',
    code: 'KAOBIAN',
    tagline: '当前以资料索引为主',
    tone: { soft: '#fff3cf', accent: '#c99526' },
    resources: {
      href: '/resources/?exam=kaobian',
      summary: '事业单位、三支一扶及相关备考资料统一整理。',
      bullets: ['事业单位', '三支一扶', '课程资料'],
    },
  },
  teacher: {
    id: 'teacher',
    label: '教师资格证',
    qualifier: '教师资格 / 教师招聘',
    code: 'TEACHER',
    tagline: '当前以资料索引为主',
    tone: { soft: '#ece8fa', accent: '#7760aa' },
    resources: {
      href: '/resources/?exam=teacher',
      summary: '教师资格证与教师招聘课程资料统一检索。',
      bullets: ['资格证', '教师招聘', '课程资料'],
    },
  },
  cet: {
    id: 'cet',
    label: '英语四六级',
    qualifier: 'CET 4 / CET 6',
    code: 'CET 4 / 6',
    tagline: '当前以资料索引为主',
    tone: { soft: '#e6efff', accent: '#5379cc' },
    resources: {
      href: '/resources/?exam=cet',
      summary: '四级、六级课程与备考资料。',
      bullets: ['四级课程', '六级课程', '备考合集'],
    },
  },
  other: {
    id: 'other',
    label: '其他考试',
    qualifier: '持续整理',
    code: 'MORE',
    tagline: '当前以资料索引为主',
    tone: { soft: '#eef1ef', accent: '#68766f' },
    resources: {
      href: '/resources/?exam=other',
      summary: '医考、面试及其他考试资料持续整理。',
      bullets: ['医考', '面试', '基层项目'],
    },
  },
};

export function isExamId(value: string | null | undefined): value is ExamId {
  return !!value && value in EXAMS;
}
