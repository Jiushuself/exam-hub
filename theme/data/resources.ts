export type ExamKey =
  'kaoyan' | 'gongkao' | 'kaobian' | 'teacher' | 'cet' | 'other';

export type ResourceStatus = 'active' | 'review' | 'expired';

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  exam: ExamKey;
  subject: string;
  year?: string;
  types: string[];
  provider: string;
  url: string;
  code?: string;
  source: string;
  rights: string;
  updatedAt: string;
  verifiedAt: string;
  status: ResourceStatus;
}

/**
 * 在这里录入经过核验的真实资料。
 * 不提供示例假链接，避免它们被误认为可以下载的资源。
 */
const pendingReviewMeta = {
  source: '用户提供（未注明原始发布者）',
  rights: '来源与授权待核验',
  updatedAt: '2026-08-27',
  verifiedAt: '2026-08-27',
  status: 'review',
} satisfies Pick<
  ResourceItem,
  'source' | 'rights' | 'updatedAt' | 'verifiedAt' | 'status'
>;

export const resources: ResourceItem[] = [
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-quark-collection',
    title: '2027 考研资料大合集',
    description:
      '用户提供的 2027 考研综合资料分享入口，具体科目范围、内容完整性与更新情况待核验。',
    exam: 'kaoyan',
    subject: '考研综合',
    year: '2027',
    types: ['资料合集', '综合资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/8e765485e185',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-quark-ebooks',
    title: '2027 考研电子版资料',
    description:
      '用户提供的 2027 考研电子版资料分享入口，文件来源、版本与公开传播授权待核验。',
    exam: 'kaoyan',
    subject: '考研综合',
    year: '2027',
    types: ['电子资料', '资料合集'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/4a1826f35d01',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-quark-retest',
    title: '院校复试资料',
    description:
      '用户提供的考研院校复试资料分享入口，覆盖院校与资料年份尚待进一步核验。',
    exam: 'kaoyan',
    subject: '院校复试',
    types: ['复试资料', '院校资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/ee6145617ca2',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-quark-self-set-video',
    title: '自命题院校视频',
    description:
      '用户提供的自命题院校专业课视频分享入口，课程来源、适用院校与授权情况待核验。',
    exam: 'kaoyan',
    subject: '自命题专业课',
    types: ['视频课程', '院校资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/347659d1e081',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-quark-classic-courses',
    title: '考研经典课程合集',
    description:
      '用户提供的往期考研课程分享入口，课程版本、原始发布者与公开传播授权待核验。',
    exam: 'kaoyan',
    subject: '考研课程',
    types: ['视频课程', '往期课程'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/790373bad0c2',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-quark-answer-sheet',
    title: '考研答题卡',
    description:
      '用户提供的考研答题卡资料分享入口，具体科目、版式与适用年份待核验。',
    exam: 'kaoyan',
    subject: '答题卡',
    types: ['答题卡', '打印资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/eaef1699afe2',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-quark-tools',
    title: '考研实用工具',
    description:
      '用户提供的考研工具类资料分享入口，工具清单、适用平台与安全性待核验。',
    exam: 'kaoyan',
    subject: '备考工具',
    types: ['实用工具', '辅助资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/872f6c16902a',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-baidu-english',
    title: '2027 考研英语',
    description:
      '用户提供的 2027 考研英语资料分享入口，课程与讲义明细、来源及授权情况待核验。',
    exam: 'kaoyan',
    subject: '考研英语',
    year: '2027',
    types: ['公共课', '课程资料'],
    provider: '百度网盘',
    url: 'https://pan.baidu.com/s/17RDuYvMTMJ16547f11_QAw?pwd=6666',
    code: '6666',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-baidu-politics',
    title: '2027 考研政治',
    description:
      '用户提供的 2027 考研政治资料分享入口，课程与讲义明细、来源及授权情况待核验。',
    exam: 'kaoyan',
    subject: '考研政治',
    year: '2027',
    types: ['公共课', '课程资料'],
    provider: '百度网盘',
    url: 'https://pan.baidu.com/s/1xbmxETFR3CeoD1hMBdibeQ?pwd=6666',
    code: '6666',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-baidu-math',
    title: '2027 考研数学',
    description:
      '用户提供的 2027 考研数学资料分享入口，课程与讲义明细、来源及授权情况待核验。',
    exam: 'kaoyan',
    subject: '考研数学',
    year: '2027',
    types: ['公共课', '课程资料'],
    provider: '百度网盘',
    url: 'https://pan.baidu.com/s/1kJeDA9Peied4EsrwrlkWeg?pwd=6666',
    code: '6666',
  },
  {
    ...pendingReviewMeta,
    id: 'kaoyan-2027-baidu-major',
    title: '2027 考研专业课',
    description:
      '用户提供的 2027 考研专业课资料分享入口，适用专业、院校范围、来源及授权情况待核验。',
    exam: 'kaoyan',
    subject: '考研专业课',
    year: '2027',
    types: ['专业课', '课程资料'],
    provider: '百度网盘',
    url: 'https://pan.baidu.com/s/1aDfQR1DQnMl4Jp-Y_OaDPg?pwd=6666',
    code: '6666',
  },
  {
    ...pendingReviewMeta,
    id: 'gongkao-2026-quark-collection',
    title: '2026 公考资料总合集',
    description:
      '用户提供的 2026 公考综合资料分享入口，具体考试范围、课程来源与授权情况待核验。',
    exam: 'gongkao',
    subject: '行测与申论',
    year: '2026',
    types: ['资料合集', '课程资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/a99acafb0fd9',
  },
  {
    ...pendingReviewMeta,
    id: 'kaobian-2026-quark-institutions',
    title: '事业单位课程资料',
    description:
      '用户提供的事业单位考试课程分享入口，适用地区、年份、课程来源与授权情况待核验。',
    exam: 'kaobian',
    subject: '事业单位',
    types: ['课程资料', '备考合集'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/baa3498b7293',
  },
  {
    ...pendingReviewMeta,
    id: 'teacher-2026-quark-qualification',
    title: '2026 教师资格证资料总合集',
    description:
      '用户提供的 2026 教师资格证综合资料分享入口，科目范围、课程来源与授权情况待核验。',
    exam: 'teacher',
    subject: '教师资格证',
    year: '2026',
    types: ['资料合集', '课程资料'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/1b2a9eaa58f5',
  },
  {
    ...pendingReviewMeta,
    id: 'teacher-quark-courses',
    title: '教师类课程资料',
    description:
      '用户提供的教师类考试课程分享入口，具体适用考试、年份、来源与授权情况待核验。',
    exam: 'teacher',
    subject: '教师类考试',
    types: ['课程资料', '教师招聘'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/b764968fef73',
  },
  {
    ...pendingReviewMeta,
    id: 'cet-quark-courses',
    title: '英语四六级课程资料',
    description:
      '用户提供的英语四六级课程分享入口，适用考次、课程来源与授权情况待核验。',
    exam: 'cet',
    subject: '英语四六级',
    types: ['课程资料', '备考合集'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/e1e285035b5e',
  },
  {
    ...pendingReviewMeta,
    id: 'other-quark-medical',
    title: '医考类课程资料',
    description:
      '用户提供的医学考试课程分享入口，具体考试类别、适用年份、来源与授权情况待核验。',
    exam: 'other',
    subject: '医学考试',
    types: ['课程资料', '医考'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/9a43f174fcdc',
  },
  {
    ...pendingReviewMeta,
    id: 'other-quark-sanzhiyifu',
    title: '三支一扶课程资料',
    description:
      '用户提供的三支一扶考试课程分享入口，适用地区、年份、来源与授权情况待核验。',
    exam: 'other',
    subject: '三支一扶',
    types: ['课程资料', '基层项目'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/d9b45a943b43',
  },
  {
    ...pendingReviewMeta,
    id: 'other-quark-interview',
    title: '面试课程资料',
    description:
      '用户提供的面试课程分享入口，适用考试类别、年份、课程来源与授权情况待核验。',
    exam: 'other',
    subject: '面试',
    types: ['课程资料', '面试备考'],
    provider: '夸克网盘',
    url: 'https://pan.quark.cn/s/41ec601d2e83',
  },
];
