import { APP_TIME_ZONE, nowStamp, todayDate } from "@/lib/time";
import type {
  DashboardBrief,
  NextStep,
  Person,
  ResearchOrganization,
  UpdateType,
  UserRole,
  WorkUpdate,
} from "@/lib/research-pool-types";

export type View =
  | "login"
  | "dashboard"
  | "updates"
  | "organizations"
  | "people"
  | "detail"
  | "new"
  | "edit";

export type CurrentUserState = {
  name: string;
  role: UserRole;
  email?: string;
};

export type Filters = {
  search: string;
  institutions: string[];
  labs: string[];
  roles: string[];
  topics: string[];
  researchStatuses: string[];
  priorities: string[];
  contactStatuses: string[];
  flags: string[];
  tags: string[];
  showArchived: boolean;
};

export type BadgeTone = "neutral" | "strong" | "warning" | "success" | "danger" | "muted";

export type PeopleSortMode = "createdAt" | "name" | "priority";

export type CardEditMode = "basic" | "priority" | "doc" | "avatar" | "assessment" | "progress";

export type PersonCardDraft = Pick<
  Person,
  | "name"
  | "role"
  | "title"
  | "institution"
  | "lab"
  | "avatarUrl"
  | "researchTopics"
  | "shortAssessment"
  | "nextAction"
  | "researchStatus"
  | "priority"
  | "feishuDocUrl"
  | "supervisorNote"
>;

export type UpdateDraft = Pick<
  WorkUpdate,
  | "updateType"
  | "title"
  | "summary"
  | "insight"
  | "linkedPersonId"
  | "linkedPerson"
  | "linkedOrganization"
  | "feishuUrl"
  | "occurredAt"
>;

export type UpdateFilters = {
  date: string;
  updateType: string;
  person: string;
  organization: string;
};

export type UpdateDrawerMode = "create" | "edit";

export type BriefDraft = Pick<DashboardBrief, "title" | "description" | "focusAreas">;

export type NextStepDraft = Pick<NextStep, "id" | "content" | "completed" | "sortOrder" | "createdAt" | "updatedAt"> & {
  isNew?: boolean;
  deleted?: boolean;
};

export type OrganizationDraft = Pick<ResearchOrganization, "name" | "type" | "priority" | "websiteUrl" | "note">;

export type SaveState = {
  error: string;
  saving: boolean;
  success: string;
};

export const EMPTY_FILTERS: Filters = {
  search: "",
  institutions: [],
  labs: [],
  roles: [],
  topics: [],
  researchStatuses: [],
  priorities: [],
  contactStatuses: [],
  flags: [],
  tags: [],
  showArchived: false,
};

export const userRoleLabels: Record<UserRole, string> = {
  Admin: "管理员",
  Editor: "编辑者",
  Commenter: "评论者",
  Viewer: "查看者",
};

export const roleLabels: Record<string, string> = {
  Professor: "教授",
  "Principal Investigator": "PI / 课题负责人",
  "Research Professor": "研究教授",
  Postdoc: "博士后",
  "PhD Student": "博士生",
  "Master Student": "硕士生",
  "Research Scientist": "研究科学家",
  "Industry Researcher": "产业研究员",
  Researcher: "研究人员",
};

export const SIMPLE_PRIORITIES = ["S", "A", "B", "C"] as const;
export const PRIORITY_WEIGHT: Record<(typeof SIMPLE_PRIORITIES)[number], number> = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
};
export const PROGRESS_STATUSES = [
  "待调研",
  "待联系",
  "已联系",
  "已回复",
  "已预约",
  "已访谈",
  "跟进中",
  "已结束",
] as const;
export const SPECIAL_PROGRESS_STATUSES = ["长期维护", "暂停推进"] as const;
export const ALL_PROGRESS_STATUSES = [...PROGRESS_STATUSES, ...SPECIAL_PROGRESS_STATUSES] as const;
export const ORGANIZATION_TYPES = ["实验室", "研究团队", "公司/产业机构", "项目/中心", "其他"] as const;
export const EMPTY_SAVE_STATE: SaveState = { error: "", saving: false, success: "" };

export const UPDATE_TYPES: UpdateType[] = [
  "新增人员",
  "完成人物调研",
  "完成信息核验",
  "新增实验室",
  "新增资料",
  "更新人物资料",
  "新增研究判断",
  "调整优先级",
  "手动记录",
];

export const EMPTY_UPDATE_FILTERS: UpdateFilters = {
  date: "",
  updateType: "",
  person: "",
  organization: "",
};

export function normalizePriority(value = "") {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "S" || /核心|高优先|高$/.test(value)) {
    return "S";
  }
  if (trimmed === "A" || /中高/.test(value)) {
    return "A";
  }
  if (trimmed === "B" || /中低|中/.test(value)) {
    return "B";
  }
  if (trimmed === "C" || /低|暂不|未评估/.test(value)) {
    return "C";
  }
  return "C";
}

export function normalizeOrganizationPriority(organization: Partial<ResearchOrganization>) {
  const explicit = String(organization.priority ?? "").trim().toUpperCase();
  if ((SIMPLE_PRIORITIES as readonly string[]).includes(explicit)) {
    return explicit;
  }

  const name = String(organization.name ?? "").trim().toLowerCase();
  if (name === "h2x lab") {
    return "S";
  }
  if (name === "collaborative autonomy group" || name === "cag") {
    return "B";
  }
  return "B";
}

export function normalizeOrganization(
  organization: Partial<ResearchOrganization>,
): ResearchOrganization {
  const stamp = nowStamp();
  const name = organization.name?.trim() || "未命名组织";
  return {
    id: organization.id || slugify(name),
    name,
    type: organization.type?.trim() || "实验室",
    priority: normalizeOrganizationPriority({ ...organization, name }),
    websiteUrl: organization.websiteUrl?.trim() || "",
    note: organization.note?.trim() || "",
    sourceCount: organization.sourceCount ?? 0,
    createdAt: organization.createdAt || stamp,
    updatedAt: organization.updatedAt || stamp,
  };
}

export function compareByPriority(left: string, right: string) {
  return (
    (PRIORITY_WEIGHT[normalizePriority(left) as keyof typeof PRIORITY_WEIGHT] ?? 9) -
    (PRIORITY_WEIGHT[normalizePriority(right) as keyof typeof PRIORITY_WEIGHT] ?? 9)
  );
}

export function sortPeopleByPriority(people: Person[]) {
  const statusRank = new Map<string, number>(
    [...PROGRESS_STATUSES, ...SPECIAL_PROGRESS_STATUSES].map((status, index) => [
      status,
      index,
    ]),
  );
  return [...people].sort(
    (left, right) =>
      compareByPriority(left.priority, right.priority) ||
      (statusRank.get(normalizeProgressStatus(left.researchStatus)) ?? 99) -
        (statusRank.get(normalizeProgressStatus(right.researchStatus)) ?? 99) ||
      right.updatedAt.localeCompare(left.updatedAt) ||
      right.lastModifiedAt.localeCompare(left.lastModifiedAt) ||
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
  );
}

export function sortOrganizationsByPriority(organizations: ResearchOrganization[]) {
  return [...organizations].sort(
    (left, right) =>
      compareByPriority(left.priority, right.priority) ||
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
  );
}

export function normalizeProgressStatus(value = "") {
  const trimmed = value.trim();
  if ((ALL_PROGRESS_STATUSES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  if (/调研完成|完成访谈/.test(trimmed)) return "已访谈";
  if (/待收集|初步录入|待核验|详细调研中/.test(trimmed)) return "待调研";
  if (/待上级|待批准|计划联系/.test(trimmed)) return "待联系";
  if (/已约/.test(trimmed)) return "已预约";
  if (/已关闭|信息过期/.test(trimmed)) return "已结束";
  if (/暂不|暂停/.test(trimmed)) return "暂停推进";
  if (/维护/.test(trimmed)) return "长期维护";
  return "待调研";
}

export function hasRealAssessment(value = "") {
  return Boolean(value.trim()) && !value.includes("待补充 Eric");
}

export function displayAssessment(value = "") {
  return hasRealAssessment(value) ? value.trim().slice(0, 150) : "";
}

export function initials(name = "") {
  const compact = name.trim();
  if (!compact) {
    return "EA";
  }
  const parts = compact.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return compact.slice(0, 2).toUpperCase();
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `person-${Date.now()}`
  );
}

export function splitList(value: string) {
  return value
    .split(/[;,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePerson(person: Person): Person {
  const priority = normalizePriority(person.priority);
  const shortAssessment = hasRealAssessment(person.shortAssessment)
    ? person.shortAssessment.slice(0, 150)
    : "";

  return {
    ...person,
    priority,
    isStarred: priority === "S" && person.isStarred,
    contacts: person.contacts ?? [],
    feishuDocUrl: person.feishuDocUrl ?? "",
    shortAssessment,
    supervisorNote: person.supervisorNote ?? person.managerNote ?? "",
    managerNote: person.managerNote ?? "",
    researchDocument: person.researchDocument ?? "",
  };
}

export function isThisWeek(dateValue: string) {
  if (!dateValue) {
    return false;
  }
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  const now = new Date(`${todayDate()}T00:00:00`);
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  return date >= weekStart && date <= now;
}

export function formatDateLabel(dateValue: string) {
  if (!dateValue) {
    return "未记录日期";
  }
  const [year, month, day] = dateValue.slice(0, 10).split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function formatTimeLabel(dateValue: string) {
  const trimmed = dateValue.trim();
  if (!trimmed) {
    return "--:--";
  }

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        timeZone: APP_TIME_ZONE,
      }).format(date);
    }
  }

  const match = trimmed.match(/[ T](\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
}

export function displayUpdateSummary(update: WorkUpdate) {
  const sentences = update.summary
    .replace(/\n+/g, "。")
    .split("。")
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !isBasicUpdateSentence(sentence));

  return sentences.join("。");
}

function isBasicUpdateSentence(sentence: string) {
  const normalized = sentence.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return true;
  }
  if (/研究方向[:：]/.test(normalized)) {
    return true;
  }
  if (
    /(^|\s)(PhD|Master|Bachelor|Associate Professor|Assistant Professor|Senior Lecturer|Lecturer|Professor|Researcher)\b/i.test(
      normalized,
    ) &&
    normalized.includes(" · ")
  ) {
    return true;
  }
  if (
    (normalized.match(/ · /g) ?? []).length >= 2 &&
    /(University|Institute|Lab|Group|Draper|Boston|MIT|Harvard|大学|学院|实验室|团队|博士|硕士|教授|讲师)/i.test(
      normalized,
    )
  ) {
    return true;
  }
  return false;
}

export function visibleUpdateOrganization(value: string) {
  const trimmed = value.trim();
  return trimmed && !/待补充/.test(trimmed) ? trimmed : "";
}

export function isToday(dateValue: string) {
  return dateValue.slice(0, 10) === todayDate();
}

export function isRecentDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  const now = new Date(`${todayDate()}T00:00:00`);
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  return date >= start && date <= now;
}

export function statusTone(value: string): BadgeTone {
  if (value === "S") {
    return "warning";
  }
  if (value === "A") {
    return "strong";
  }
  if (value === "B") {
    return "neutral";
  }
  if (value === "C") {
    return "muted";
  }
  if (/已联系|已回复|已预约|已访谈/.test(value)) {
    return "success";
  }
  if (/待联系|跟进中/.test(value)) {
    return "warning";
  }
  if (/长期维护/.test(value)) {
    return "strong";
  }
  if (/待调研|已结束|暂停推进/.test(value)) {
    return "muted";
  }
  if (/完成|已核验|已联系|已回复|已约/.test(value)) {
    return "success";
  }
  if (/待上级|待批准|近期/.test(value)) {
    return "warning";
  }
  if (/过期|逾期|暂不/.test(value)) {
    return "muted";
  }
  return "neutral";
}

export function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function initialPerson(
  currentUser: { name: string; role: UserRole },
): Person {
  const stamp = nowStamp();
  const date = stamp.slice(0, 10);

  return {
    id: "",
    name: "",
    degree: "",
    avatarUrl: "",
    role: "PhD Student",
    title: "",
    institution: "",
    lab: "",
    department: "",
    location: "",
    bio: "",
    currentResearchFocus: "",
    contacts: [],
    feishuDocUrl: "",
    shortAssessment: "",
    supervisorNote: "",
    managerNote: "",
    researchDocument: "",
    researchTopics: [],
    secondaryTopics: [],
    representativeProjects: [],
    representativePublications: [],
    datasets: [],
    benchmarks: [],
    robotPlatforms: [],
    researchMode: "仿真 + 真实机器人",
    whyImportant: "",
    zodaRelevance: "",
    potentialDataNeed: "",
    benchmarkValue: "",
    networkValue: "",
    recommendedApproach: "",
    interviewQuestions: "",
    researchStatus: "待调研",
    priority: "C",
    contactStatus: "暂不联系",
    owner: currentUser.name,
    isStarred: false,
    flags: ["信息待核验"],
    tags: [],
    nextAction: "",
    followUpDate: date,
    advisorIds: [],
    adviseeIds: [],
    collaboratorIds: [],
    formerAffiliations: [],
    sources: [],
    archived: false,
    lastModifiedBy: currentUser.name,
    lastModifiedAt: stamp,
    lastVerifiedAt: date,
    createdAt: date,
    updatedAt: date,
  };
}
