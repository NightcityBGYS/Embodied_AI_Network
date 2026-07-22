import { seedResearchPoolState } from "./seed-data";
import { nowStamp, todayDate } from "./time";
import {
  buildPersonCreatedUpdate,
  buildPersonPatchedUpdate,
  mergeAutoUpdate,
  shouldMergeAutoUpdate,
  type AutoUpdate,
} from "./work-update-builder";
import type {
  ActivityLog,
  ContactStatus,
  DashboardBrief,
  NextStep,
  Person,
  Priority,
  ResearchOrganization,
  ResearchPoolState,
  ResearchStatus,
  UpdateType,
  UserRole,
  WorkUpdate,
} from "./research-pool-types";

type CurrentUser = {
  name: string;
  role: UserRole;
};

type PersonPatchPayload = {
  patch: Partial<Person>;
  action?: string;
  summary?: string;
  before?: string;
  after?: string;
};

type UpdatePayload = {
  update: Partial<WorkUpdate>;
};

type UpdateFilters = {
  date?: string;
  from?: string;
  to?: string;
  updateType?: string;
  person?: string;
  organization?: string;
};

type DashboardBriefPayload = {
  patch: Partial<DashboardBrief>;
};

type NextStepPayload = {
  step: Partial<NextStep>;
};

type OrganizationPayload = {
  organization: Partial<ResearchOrganization>;
};

const validRoles: UserRole[] = ["Admin", "Editor", "Commenter", "Viewer"];

let state: ResearchPoolState = clone(seedResearchPoolState);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `person-${Date.now()}`
  );
}

function splitList(value: string) {
  return value
    .split(/[;,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePriority(value = ""): Priority {
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

function normalizeOrganizationPriority(organization: Partial<ResearchOrganization>): Priority {
  const explicit = String(organization.priority ?? "").trim().toUpperCase();
  if (explicit === "S" || explicit === "A" || explicit === "B" || explicit === "C") {
    return explicit;
  }
  const name = String(organization.name ?? "").trim().toLowerCase();
  if (name === "h2x lab") return "S";
  if (name === "collaborative autonomy group" || name === "cag") return "B";
  return "B";
}

function priorityWeight(priority: string) {
  return { S: 0, A: 1, B: 2, C: 3 }[normalizePriority(priority)] ?? 9;
}

function normalizeUpdateType(value = ""): UpdateType {
  const allowed: UpdateType[] = [
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
  return allowed.includes(value as UpdateType) ? (value as UpdateType) : "手动记录";
}

function updateDate(value: string) {
  return value.slice(0, 10);
}

function sortNextSteps(steps: NextStep[]) {
  return [...steps].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

function organizationSourceCount(name: string) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return 0;
  return state.people.filter((person) => person.lab.trim().toLowerCase() === normalized).length;
}

function normalizeOrganization(organization: Partial<ResearchOrganization>): ResearchOrganization {
  const stamp = nowStamp();
  const name = organization.name?.trim() || "未命名组织";
  return {
    id: organization.id || slugify(name),
    name,
    type: organization.type?.trim() || "实验室",
    priority: normalizeOrganizationPriority({ ...organization, name }),
    websiteUrl: organization.websiteUrl?.trim() || "",
    note: organization.note?.trim() || "",
    sourceCount: organizationSourceCount(name),
    createdAt: organization.createdAt || stamp,
    updatedAt: stamp,
  };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header.trim()] = record[index] ?? "";
      return accumulator;
    }, {}),
  );
}

export function userFromRequest(request: Request): CurrentUser {
  const role = request.headers.get("x-current-role") as UserRole | null;
  return {
    name: request.headers.get("x-current-user") || "Eric",
    role: role && validRoles.includes(role) ? role : "Admin",
  };
}

export function getResearchPoolState() {
  return clone(state);
}

export function resetResearchPoolState(user: CurrentUser) {
  state = clone(seedResearchPoolState);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "重置数据",
    targetType: "system",
    summary: `${user.name} 将对象池恢复为种子数据。`,
  });
  return getResearchPoolState();
}

export function listPeople() {
  return clone(state.people);
}

export function listOrganizations() {
  return clone(
    state.organizations
      .filter((organization) => organization.type !== "school")
      .map((organization) => ({
        ...normalizeOrganization(organization),
        sourceCount: organizationSourceCount(organization.name),
      }))
      .sort(
        (left, right) =>
          priorityWeight(left.priority) - priorityWeight(right.priority) ||
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.name.localeCompare(right.name),
      ),
  );
}

export function createOrganization(payload: OrganizationPayload, user: CurrentUser) {
  const saved = normalizeOrganization(payload.organization);
  state.organizations = [
    saved,
    ...state.organizations.filter((organization) => organization.id !== saved.id),
  ];
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增组织",
    targetType: "organization",
    targetId: saved.id,
    summary: `${user.name} 新增了组织：${saved.name}。`,
  });
  return clone(saved);
}

export function patchOrganization(
  id: string,
  payload: OrganizationPayload,
  user: CurrentUser,
) {
  const index = state.organizations.findIndex((organization) => organization.id === id);
  if (index === -1) {
    return null;
  }
  const before = state.organizations[index];
  const saved = normalizeOrganization(
    {
      ...before,
      ...payload.organization,
      id: before.id,
      createdAt: before.createdAt,
    },
  );
  state.organizations[index] = saved;
  const priorityChanged = before.priority !== saved.priority;
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: priorityChanged ? "调整组织优先级" : "更新组织",
    targetType: "organization",
    targetId: saved.id,
    summary: priorityChanged
      ? `${user.name} 调整组织优先级：${saved.name}。优先级从 ${before.priority} 调整为 ${saved.priority}。`
      : `${user.name} 更新了组织：${saved.name}。`,
    before: priorityChanged ? before.priority : undefined,
    after: priorityChanged ? saved.priority : undefined,
  });
  if (priorityChanged) {
    appendUpdate({
      updateType: "调整优先级",
      title: `调整组织优先级：${saved.name}`,
      summary: `优先级从 ${before.priority} 调整为 ${saved.priority}`,
      insight: "",
      linkedPersonId: undefined,
      linkedPerson: "",
      linkedOrganization: saved.name,
      feishuUrl: saved.websiteUrl,
      author: user.name,
      occurredAt: nowStamp(),
    });
  }
  return clone(saved);
}

export function deleteOrganization(id: string, user: CurrentUser) {
  const organization = state.organizations.find((item) => item.id === id);
  if (!organization) {
    return null;
  }
  state.organizations = state.organizations.filter((item) => item.id !== id);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除组织",
    targetType: "organization",
    targetId: organization.id,
    summary: `${user.name} 删除了组织：${organization.name}。`,
  });
  return clone(organization);
}

export function getPerson(id: string) {
  const person = state.people.find((item) => item.id === id);
  return person ? clone(person) : null;
}

export function createPerson(person: Person, user: CurrentUser) {
  const stamp = nowStamp();
  const date = stamp.slice(0, 10);
  const id = person.id || slugify(person.name);
  const saved: Person = {
    ...person,
    id,
    title: person.title || person.role,
    priority: normalizePriority(person.priority),
    shortAssessment: person.shortAssessment?.trim().slice(0, 150) || "",
    supervisorNote: person.supervisorNote || person.managerNote || "",
    owner: person.owner || user.name,
    lastModifiedBy: user.name,
    lastModifiedAt: stamp,
    createdAt: person.createdAt || date,
    updatedAt: date,
    lastVerifiedAt: person.lastVerifiedAt || date,
  };

  state.people = [
    saved,
    ...state.people.filter((existing) => existing.id !== saved.id),
  ];
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增人员",
    targetType: "person",
    targetId: saved.id,
    summary: `${user.name} 新增了 ${saved.name}。`,
  });

  appendUpdate(buildPersonCreatedUpdate(saved, { author: user.name, occurredAt: stamp }));
  return clone(saved);
}

export function patchPerson(id: string, payload: PersonPatchPayload, user: CurrentUser) {
  const stamp = nowStamp();
  const date = stamp.slice(0, 10);
  const index = state.people.findIndex((person) => person.id === id);
  if (index < 0) {
    return null;
  }

  const current = state.people[index];
  const existingLabs = new Set(
    state.people
      .filter((person) => person.id !== id)
      .map((person) => person.lab.trim())
      .filter(Boolean),
  );
  const saved: Person = {
    ...current,
    ...payload.patch,
    id,
    priority: normalizePriority(String(payload.patch.priority ?? current.priority)),
    shortAssessment:
      typeof payload.patch.shortAssessment === "string"
        ? payload.patch.shortAssessment.trim().slice(0, 150)
        : current.shortAssessment,
    lastModifiedBy: user.name,
    lastModifiedAt: stamp,
    updatedAt: date,
  };
  state.people[index] = saved;
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: payload.action || "更新人员",
    targetType: "person",
    targetId: id,
    summary: payload.summary || `${user.name} 更新了 ${saved.name}。`,
    before: payload.before,
    after: payload.after,
  });

  const autoUpdate = buildPersonPatchedUpdate(current, saved, {
    author: user.name,
    labIsNew: Boolean(saved.lab && !existingLabs.has(saved.lab)),
    occurredAt: stamp,
  });
  if (autoUpdate) {
    appendUpdate(autoUpdate, { mergeSimilar: true });
  }
  return clone(saved);
}

export function archivePerson(id: string, user: CurrentUser) {
  const person = state.people.find((item) => item.id === id);
  if (!person) {
    return null;
  }
  return patchPerson(
    id,
    {
      patch: { archived: true },
      action: "归档人员",
      summary: `${user.name} 归档了 ${person.name}。`,
      before: "未归档",
      after: "已归档",
    },
    user,
  );
}

export function deletePerson(id: string, user: CurrentUser) {
  const person = state.people.find((item) => item.id === id);
  if (!person) {
    return null;
  }

  state.people = state.people.filter((item) => item.id !== id);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除人员",
    targetType: "person",
    targetId: id,
    summary: `${user.name} 删除了 ${person.name}。`,
    before: person.name,
    after: "已删除",
  });
  return clone(person);
}

export function listActivities() {
  return clone(state.activities);
}

export function getDashboardBrief() {
  return clone(state.dashboardBrief);
}

export function patchDashboardBrief(payload: DashboardBriefPayload, user: CurrentUser) {
  const stamp = nowStamp();
  const current = state.dashboardBrief;
  const patch = payload.patch ?? {};
  const saved: DashboardBrief = {
    ...current,
    ...patch,
    title: patch.title?.trim() || current.title,
    description: patch.description?.trim() || current.description,
    focusAreas: Array.isArray(patch.focusAreas)
      ? patch.focusAreas.map((area) => area.trim()).filter(Boolean)
      : current.focusAreas,
    updatedAt: stamp,
    updatedBy: user.name,
  };

  state.dashboardBrief = saved;
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新工作简报",
    targetType: "system",
    summary: `${user.name} 更新了首页工作简报。`,
    before: current.title,
    after: saved.title,
  });
  return clone(saved);
}

export function listNextSteps() {
  return clone(sortNextSteps(state.nextSteps));
}

export function createNextStep(payload: NextStepPayload, user: CurrentUser) {
  const stamp = nowStamp();
  const maxOrder = state.nextSteps.reduce(
    (max, step) => Math.max(max, step.sortOrder),
    0,
  );
  const content = payload.step.content?.trim() || "新的下一步计划";
  const saved: NextStep = {
    id: `next-step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content,
    completed: Boolean(payload.step.completed),
    sortOrder:
      typeof payload.step.sortOrder === "number" &&
      Number.isFinite(payload.step.sortOrder)
        ? Number(payload.step.sortOrder)
        : maxOrder + 1,
    createdAt: stamp,
    updatedAt: stamp,
  };
  state.nextSteps = sortNextSteps([...state.nextSteps, saved]);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增下一步",
    targetType: "system",
    targetId: saved.id,
    summary: `${user.name} 新增了下一步计划：${saved.content}。`,
  });
  return clone(saved);
}

export function patchNextStep(id: string, payload: NextStepPayload, user: CurrentUser) {
  const stamp = nowStamp();
  const index = state.nextSteps.findIndex((step) => step.id === id);
  if (index < 0) {
    return null;
  }

  const current = state.nextSteps[index];
  const saved: NextStep = {
    ...current,
    ...payload.step,
    id,
    content: payload.step.content?.trim() || current.content,
    completed:
      typeof payload.step.completed === "boolean"
        ? payload.step.completed
        : current.completed,
    sortOrder:
      typeof payload.step.sortOrder === "number" &&
      Number.isFinite(payload.step.sortOrder)
        ? Number(payload.step.sortOrder)
        : current.sortOrder,
    updatedAt: stamp,
  };
  state.nextSteps[index] = saved;
  state.nextSteps = sortNextSteps(state.nextSteps);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新下一步",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 更新了下一步计划：${saved.content}。`,
  });
  return clone(saved);
}

export function deleteNextStep(id: string, user: CurrentUser) {
  const current = state.nextSteps.find((step) => step.id === id);
  if (!current) {
    return null;
  }

  state.nextSteps = state.nextSteps.filter((step) => step.id !== id);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除下一步",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 删除了下一步计划：${current.content}。`,
  });
  return clone(current);
}

export function listUpdates(filters: UpdateFilters = {}) {
  const updates = state.updates.filter((update) => {
    const occurredDate = updateDate(update.occurredAt);
    const matchesDate = !filters.date || occurredDate === filters.date;
    const matchesFrom = !filters.from || occurredDate >= filters.from;
    const matchesTo = !filters.to || occurredDate <= filters.to;
    const matchesType =
      !filters.updateType || update.updateType === filters.updateType;
    const personQuery = filters.person?.trim().toLowerCase() ?? "";
    const orgQuery = filters.organization?.trim().toLowerCase() ?? "";
    const matchesPerson =
      !personQuery ||
      update.linkedPerson.toLowerCase().includes(personQuery) ||
      (update.linkedPersonId ?? "").toLowerCase().includes(personQuery);
    const matchesOrg =
      !orgQuery || update.linkedOrganization.toLowerCase().includes(orgQuery);

    return (
      matchesDate &&
      matchesFrom &&
      matchesTo &&
      matchesType &&
      matchesPerson &&
      matchesOrg
    );
  });

  return clone(
    updates.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
  );
}

export function getUpdate(id: string) {
  const update = state.updates.find((item) => item.id === id);
  return update ? clone(update) : null;
}

export function createUpdate(payload: UpdatePayload, user: CurrentUser) {
  const saved = appendUpdate({
    updateType: normalizeUpdateType(payload.update.updateType),
    title: payload.update.title?.trim() || "记录进展",
    summary: payload.update.summary?.trim() || "",
    insight: payload.update.insight?.trim() || "",
    linkedPersonId: payload.update.linkedPersonId,
    linkedPerson: payload.update.linkedPerson?.trim() || "",
    linkedOrganization: payload.update.linkedOrganization?.trim() || "",
    feishuUrl: payload.update.feishuUrl?.trim() || "",
    author: payload.update.author?.trim() || user.name,
    occurredAt: payload.update.occurredAt || nowStamp(),
  });

  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增工作动态",
    targetType: "system",
    targetId: saved.id,
    summary: `${user.name} 新增了工作动态：${saved.title}。`,
  });
  return clone(saved);
}

export function patchUpdate(id: string, payload: UpdatePayload, user: CurrentUser) {
  const stamp = nowStamp();
  const index = state.updates.findIndex((update) => update.id === id);
  if (index < 0) {
    return null;
  }

  const current = state.updates[index];
  const saved: WorkUpdate = {
    ...current,
    ...payload.update,
    id,
    updateType: normalizeUpdateType(payload.update.updateType ?? current.updateType),
    updatedAt: stamp,
  };
  state.updates[index] = saved;
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新工作动态",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 更新了工作动态：${saved.title}。`,
  });
  return clone(saved);
}

export function deleteUpdate(id: string, user: CurrentUser) {
  const update = state.updates.find((item) => item.id === id);
  if (!update) {
    return null;
  }

  state.updates = state.updates.filter((item) => item.id !== id);
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除工作动态",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 删除了工作动态：${update.title}。`,
  });
  return clone(update);
}

export function importPeopleFromCsv(csv: string, user: CurrentUser) {
  const records = parseCsv(csv);
  const stamp = nowStamp();
  const imported = records
    .filter((record) => record.name)
    .map((record) => {
      const person: Person = {
        ...createEmptyPerson(user),
        id: slugify(record.name),
        name: record.name,
        role: record.role || "Researcher",
        title: record.title || record.role || "Researcher",
        institution: record.institution || "未填写学校",
        lab: record.lab || "",
        department: record.department ?? "",
        location: record.location || "",
        researchTopics: splitList(record.research_topics ?? ""),
        shortAssessment:
          record.short_assessment ||
          record.assessment ||
          record.eric_assessment ||
          record.why_important ||
          "",
        priority: normalizePriority(record.priority),
        researchStatus: (record.research_status as ResearchStatus) || "待调研",
        contactStatus: (record.contact_status as ContactStatus) || "暂不联系",
        feishuDocUrl:
          record.feishu_doc_url ||
          record.feishu_url ||
          record.document_url ||
          record.doc_url ||
          "",
        supervisorNote:
          record.supervisor_note ||
          record.manager_note ||
          record.instruction ||
          record.note ||
          "",
        managerNote: record.manager_note || record.instruction || record.note || "",
        owner: record.owner || user.name,
        nextAction: record.next_action || "",
        followUpDate: record.deadline || record.follow_up_date || todayDate(),
        tags: splitList(record.tags ?? ""),
        flags: splitList(record.flags ?? "信息待核验"),
        sources: record.source_url
          ? [
              {
                title: "CSV 导入来源",
                url: record.source_url,
                sourceType: "csv",
                accessedAt: todayDate(),
              },
            ]
          : [],
        lastModifiedAt: stamp,
        lastModifiedBy: user.name,
      };
      return person;
    });

  state.people = [
    ...imported,
    ...state.people.filter(
      (person) => !imported.some((incoming) => incoming.id === person.id),
    ),
  ];
  appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "CSV 导入",
    targetType: "system",
    summary: `${user.name} 通过 CSV 导入了 ${imported.length} 位人员。`,
  });

  imported.forEach((person) => {
    appendUpdate(buildPersonCreatedUpdate(person, { author: user.name, occurredAt: stamp }));
  });
  return clone(imported);
}

function createEmptyPerson(user: CurrentUser): Person {
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
    owner: user.name,
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
    lastModifiedBy: user.name,
    lastModifiedAt: stamp,
    lastVerifiedAt: date,
    createdAt: date,
    updatedAt: date,
  };
}

function appendUpdate(
  update: AutoUpdate,
  options: { mergeSimilar?: boolean } = {},
) {
  const stamp = nowStamp();
  if (options.mergeSimilar) {
    const target = state.updates.find((existing) => shouldMergeAutoUpdate(existing, update));
    if (target) {
      const merged = mergeAutoUpdate(target, update, stamp);
      state.updates = state.updates
        .map((existing) => (existing.id === target.id ? merged : existing))
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
      return merged;
    }
  }

  const saved: WorkUpdate = {
    ...update,
    id: `update-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: stamp,
    updatedAt: stamp,
  };
  state.updates = [saved, ...state.updates].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
  return saved;
}

function appendActivity(activity: Omit<ActivityLog, "id" | "createdAt">) {
  state.activities = [
    {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: nowStamp(),
    },
    ...state.activities,
  ].slice(0, 100);
}
