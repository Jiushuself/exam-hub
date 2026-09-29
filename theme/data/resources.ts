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

const pendingSvipMajorMeta = {
  source: '用户提供的夸克网盘目录',
  rights: '资料来源与公开分享授权待核验',
  updatedAt: '2026-09-29',
  verifiedAt: '2026-09-29',
  status: 'review',
} satisfies Pick<
  ResourceItem,
  'source' | 'rights' | 'updatedAt' | 'verifiedAt' | 'status'
>;

const svipMajorItems: Array<
  [number: string, title: string, subject: string, url: string]
> = [
  [
    '00',
    '00.各专业后期陆续更新',
    '专业课更新',
    'https://pan.quark.cn/s/31fb2a7873f1',
  ],
  ['01', '01.2027 西综', '西综', 'https://pan.quark.cn/s/7cc5f18b9044'],
  ['02', '02.2027 法硕', '法硕', 'https://pan.quark.cn/s/532a0deb8f1b'],
  [
    '03',
    '03.2027 经济类联考',
    '经济类联考',
    'https://pan.quark.cn/s/d25ce459e965',
  ],
  [
    '04',
    '04.2027 管理类联考',
    '管理类联考',
    'https://pan.quark.cn/s/34a5ec30472f',
  ],
  ['05', '05.2027 计算机', '计算机', 'https://pan.quark.cn/s/ca78f2782d16'],
  [
    '06',
    '06.2027 教育学（333+311）',
    '教育学（333+311）',
    'https://pan.quark.cn/s/60365472ead5',
  ],
  ['07', '07.2027 金融学', '金融学', 'https://pan.quark.cn/s/ddd1dd090c71'],
  [
    '08',
    '08.2027 经济学+数字经济',
    '经济学+数字经济',
    'https://pan.quark.cn/s/00ae10262602',
  ],
  ['09', '09.2027 统计学', '统计学', 'https://pan.quark.cn/s/469654a9a60e'],
  [
    '10',
    '10.2027 心理学（347+312）',
    '心理学（347+312）',
    'https://pan.quark.cn/s/53db1d40fa99',
  ],
  ['11', '11.2027 马克思', '马克思', 'https://pan.quark.cn/s/fa5a0d079ac7'],
  ['12', '12.2027 历史学', '历史学', 'https://pan.quark.cn/s/5949994b1771'],
  ['13', '13.2027 机械', '机械', 'https://pan.quark.cn/s/2da8bf52eff3'],
  ['14', '14.2027 力学', '力学', 'https://pan.quark.cn/s/788b44ea2e85'],
  ['15', '15.2027 电路', '电路', 'https://pan.quark.cn/s/2e2e5775dc8f'],
  ['16', '16.2027 信号系统', '信号系统', 'https://pan.quark.cn/s/c22793f8973e'],
  ['17', '17.2027 护理', '护理', 'https://pan.quark.cn/s/0a5be5b6b749'],
  ['18', '18.2027 中医', '中医', 'https://pan.quark.cn/s/86dffa349069'],
  ['19', '19.2027 药学', '药学', 'https://pan.quark.cn/s/ddaec3f10a82'],
  ['20', '20.2027 口腔', '口腔', 'https://pan.quark.cn/s/537d68c92611'],
  ['21', '21.2027 公共卫生', '公共卫生', 'https://pan.quark.cn/s/3933cd456861'],
  ['22', '22.2027 新闻传播', '新闻传播', 'https://pan.quark.cn/s/d56524ae6392'],
  ['23', '23.2027 社会工作', '社会工作', 'https://pan.quark.cn/s/eca4eab8ba26'],
  ['24', '24.2027 翻译硕士', '翻译硕士', 'https://pan.quark.cn/s/d78ed6ed1acb'],
  ['25', '25.2027 汉语国际', '汉语国际', 'https://pan.quark.cn/s/aa1d0d31ee77'],
  ['26', '26.2027 国际商务', '国际商务', 'https://pan.quark.cn/s/8a00e0bb9251'],
  ['27', '27.2027 日语', '日语', 'https://pan.quark.cn/s/303196736800'],
  ['28', '28.2027 农学', '农学', 'https://pan.quark.cn/s/c99caa91f872'],
  ['29', '29.2027 艺术类', '艺术类', 'https://pan.quark.cn/s/bb28d8fbe10b'],
  ['30', '30.2027化工原理', '化工原理', 'https://pan.quark.cn/s/7a4b6f4b7229'],
  [
    '31',
    '31.2027 电力系统分析',
    '电力系统分析',
    'https://pan.quark.cn/s/a619081db90d',
  ],
  ['32', '32.2027 自动控制', '自动控制', 'https://pan.quark.cn/s/4f6339dd77fa'],
  ['33', '33.2027 物理化学', '物理化学', 'https://pan.quark.cn/s/167235c2be9c'],
  ['34', '34.2027 电气电分', '电气电分', 'https://pan.quark.cn/s/3c658bc3da01'],
  ['35', '35.2027 体育硕士', '体育硕士', 'https://pan.quark.cn/s/993afaf34d06'],
  ['36', '36.2027 税务专硕', '税务专硕', 'https://pan.quark.cn/s/b9bedb2f073b'],
  ['37', '37.2027 保险硕士', '保险硕士', 'https://pan.quark.cn/s/8a35a826523e'],
  ['38', '38.2027 资产评估', '资产评估', 'https://pan.quark.cn/s/b6a2a35e510d'],
  ['39', '39.2027 水力学', '水力学', 'https://pan.quark.cn/s/85ad459aa63c'],
  [
    '40',
    '40.2027 中国语言文学',
    '中国语言文学',
    'https://pan.quark.cn/s/d74b2cca6924',
  ],
  ['41', '41.2027 传热学', '传热学', 'https://pan.quark.cn/s/788da9401bf6'],
  [
    '42',
    '42.2027 工程热力学',
    '工程热力学',
    'https://pan.quark.cn/s/7fd2a4abf9e9',
  ],
  ['43', '43.2027 生物化学', '生物化学', 'https://pan.quark.cn/s/48e48500846a'],
  [
    '44',
    '44.2027 细胞生物学',
    '细胞生物学',
    'https://pan.quark.cn/s/2f90a23da130',
  ],
  [
    '45',
    '45.2027 分子生物学',
    '分子生物学',
    'https://pan.quark.cn/s/b03365f5dfff',
  ],
  [
    '46',
    '46.2027 普通生物学',
    '普通生物学',
    'https://pan.quark.cn/s/87f547be78f8',
  ],
  ['47', '47.2027 微生物学', '微生物学', 'https://pan.quark.cn/s/1a7bc33d0762'],
  ['48', '48.2027 通信原理', '通信原理', 'https://pan.quark.cn/s/9e01d81ef6a9'],
  ['49', '49.2027 数电模电', '数电模电', 'https://pan.quark.cn/s/b77e12c434a3'],
  ['50', '50.2027 运筹学', '运筹学', 'https://pan.quark.cn/s/270ebff0c1f1'],
  ['51', '51.2027 北航工热', '北航工热', 'https://pan.quark.cn/s/9fcbacb7ac56'],
];

const svipMajorResources: ResourceItem[] = svipMajorItems.map(
  ([number, title, subject, url]) => ({
    ...pendingSvipMajorMeta,
    id: `kaoyan-2027-svip-major-${number}`,
    title,
    description:
      '2027 年考研专业课资料分享入口；课程内容、资料完整性、原始来源与公开传播授权待核验。',
    exam: 'kaoyan',
    subject,
    year: '2027',
    types: ['专业课', '课程资料'],
    provider: '夸克网盘',
    url,
  }),
);

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
  ...svipMajorResources,
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
