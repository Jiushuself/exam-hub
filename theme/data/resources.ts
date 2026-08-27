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
export const resources: ResourceItem[] = [];
