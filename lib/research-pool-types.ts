export type UserRole = "Admin" | "Editor" | "Commenter" | "Viewer";

export type ResearchStatus = string;

export type Priority = string;

export type ContactStatus = string;

export type ContactMethodType =
  | "邮箱"
  | "电话"
  | "主页"
  | "Google Scholar"
  | "LinkedIn"
  | "ORCID"
  | "其他";

export type ContactMethod = {
  id: string;
  type: ContactMethodType;
  label: string;
  value: string;
};

export type SourceRecord = {
  title: string;
  url: string;
  sourceType: string;
  accessedAt: string;
};

export type Publication = {
  title: string;
  year: string;
  venue: string;
  url: string;
  summary: string;
};

export type ActivityLog = {
  id: string;
  actor: string;
  actorRole: UserRole;
  action: string;
  targetType: "person" | "organization" | "system";
  targetId?: string;
  summary: string;
  before?: string;
  after?: string;
  createdAt: string;
};

export type UpdateType =
  | "新增人员"
  | "完成人物调研"
  | "完成信息核验"
  | "新增实验室"
  | "新增资料"
  | "更新人物资料"
  | "新增研究判断"
  | "调整优先级"
  | "手动记录";

export type WorkUpdate = {
  id: string;
  updateType: UpdateType;
  title: string;
  summary: string;
  insight: string;
  linkedPersonId?: string;
  linkedPerson: string;
  linkedOrganization: string;
  feishuUrl: string;
  author: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardBrief = {
  title: string;
  description: string;
  focusAreas: string[];
  updatedAt: string;
  updatedBy: string;
};

export type NextStep = {
  id: string;
  content: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ResearchOrganization = {
  id: string;
  name: string;
  type: string;
  websiteUrl: string;
  note: string;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Person = {
  id: string;
  name: string;
  degree: string;
  avatarUrl: string;
  role: string;
  title: string;
  institution: string;
  lab: string;
  department: string;
  location: string;
  bio: string;
  currentResearchFocus: string;
  contacts: ContactMethod[];
  feishuDocUrl: string;
  shortAssessment: string;
  supervisorNote: string;
  managerNote: string;
  researchDocument: string;
  researchTopics: string[];
  secondaryTopics: string[];
  representativeProjects: string[];
  representativePublications: Publication[];
  datasets: string[];
  benchmarks: string[];
  robotPlatforms: string[];
  researchMode: string;
  whyImportant: string;
  zodaRelevance: string;
  potentialDataNeed: string;
  benchmarkValue: string;
  networkValue: string;
  recommendedApproach: string;
  interviewQuestions: string;
  researchStatus: ResearchStatus;
  priority: Priority;
  contactStatus: ContactStatus;
  owner: string;
  isStarred: boolean;
  flags: string[];
  tags: string[];
  nextAction: string;
  followUpDate: string;
  advisorIds: string[];
  adviseeIds: string[];
  collaboratorIds: string[];
  formerAffiliations: string[];
  sources: SourceRecord[];
  archived: boolean;
  lastModifiedBy: string;
  lastModifiedAt: string;
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ResearchPoolState = {
  people: Person[];
  organizations: ResearchOrganization[];
  activities: ActivityLog[];
  updates: WorkUpdate[];
  dashboardBrief: DashboardBrief;
  nextSteps: NextStep[];
};
