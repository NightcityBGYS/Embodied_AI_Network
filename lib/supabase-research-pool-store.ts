import { seedDashboardBrief } from "./seed-data";
import { requireSupabaseConfig } from "./supabase-config";
import {
  formatDate,
  formatStamp,
  nowStamp,
  todayDate,
  toSupabaseTimestamp,
} from "./time";
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
  ResearchStatus,
  UpdateType,
  WorkUpdate,
} from "./research-pool-types";
import type { CurrentUser } from "./server-auth";

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

type PersonRow = Record<string, unknown>;
type OrganizationRow = Record<string, unknown>;
type UpdateRow = Record<string, unknown>;
type ActivityRow = Record<string, unknown>;
type BriefRow = Record<string, unknown>;
type NextStepRow = Record<string, unknown>;

const validUpdateTypes: UpdateType[] = [
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

function normalizePriority(value = ""): Priority {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "S" || /核心|高优先|高$/.test(value)) return "S";
  if (trimmed === "A" || /中高/.test(value)) return "A";
  if (trimmed === "B" || /中低|中/.test(value)) return "B";
  if (trimmed === "C" || /低|暂不|未评估/.test(value)) return "C";
  return "C";
}

function normalizeOrganizationPriority(organization: Partial<ResearchOrganization>): Priority {
  const explicit = String(organization.priority ?? "").trim().toUpperCase();
  if (explicit === "S" || explicit === "A" || explicit === "B" || explicit === "C") {
    return explicit;
  }
  const name = String(organization.name ?? "").trim().toLowerCase();
  if (name === "h2x lab") return "S";
  if (name === "dependable computing lab") return "A";
  if (name === "collaborative autonomy group" || name === "cag") return "B";
  return "B";
}

function priorityWeight(priority: string) {
  return { S: 0, A: 1, B: 2, C: 3 }[normalizePriority(priority)] ?? 9;
}

function normalizeUpdateType(value = ""): UpdateType {
  return validUpdateTypes.includes(value as UpdateType)
    ? (value as UpdateType)
    : "手动记录";
}

function sortNextSteps(steps: NextStep[]) {
  return [...steps].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt),
  );
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function splitList(value: string) {
  return value
    .split(/[;,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
      if (char === "\r" && next === "\n") index += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) row.push(cell.trim());
  if (row.length) rows.push(row);

  const [headers = [], ...records] = rows;
  return records.map((record) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header.trim()] = record[index] ?? "";
      return accumulator;
    }, {}),
  );
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = requireSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("authorization", `Bearer ${config.serviceRoleKey}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${config.url}/rest/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Supabase request failed: ${message}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

function personFromRow(row: PersonRow): Person {
  const stamp = nowStamp();
  const date = todayDate();
  return {
    id: asString(row.id),
    name: asString(row.name),
    degree: asString(row.degree),
    avatarUrl: asString(row.avatar_url),
    role: asString(row.role, "Researcher"),
    title: asString(row.title) || asString(row.role, "Researcher"),
    institution: asString(row.institution),
    lab: asString(row.lab),
    department: asString(row.department),
    location: asString(row.location),
    bio: asString(row.bio),
    currentResearchFocus: asString(row.current_research_focus),
    contacts: asJsonArray(row.contacts),
    feishuDocUrl: asString(row.feishu_doc_url),
    shortAssessment: asString(row.short_assessment).slice(0, 150),
    supervisorNote: asString(row.supervisor_note),
    managerNote: asString(row.manager_note),
    researchDocument: asString(row.research_document),
    researchTopics: asStringArray(row.research_topics),
    secondaryTopics: asStringArray(row.secondary_topics),
    representativeProjects: asStringArray(row.representative_projects),
    representativePublications: asJsonArray(row.representative_publications),
    datasets: asStringArray(row.datasets),
    benchmarks: asStringArray(row.benchmarks),
    robotPlatforms: asStringArray(row.robot_platforms),
    researchMode: asString(row.research_mode, "仿真 + 真实机器人"),
    whyImportant: asString(row.why_important),
    zodaRelevance: asString(row.zoda_relevance),
    potentialDataNeed: asString(row.potential_data_need),
    benchmarkValue: asString(row.benchmark_value),
    networkValue: asString(row.network_value),
    recommendedApproach: asString(row.recommended_approach),
    interviewQuestions: asString(row.interview_questions),
    researchStatus: asString(row.research_status, "待调研") as ResearchStatus,
    priority: normalizePriority(asString(row.priority, "C")),
    contactStatus: asString(row.contact_status, "暂不联系") as ContactStatus,
    owner: asString(row.owner_name, "Eric"),
    isStarred: asBoolean(row.is_starred),
    flags: asStringArray(row.flags),
    tags: asStringArray(row.tags),
    nextAction: asString(row.next_action),
    followUpDate: formatDate(row.follow_up_date, date),
    advisorIds: asStringArray(row.advisor_ids),
    adviseeIds: asStringArray(row.advisee_ids),
    collaboratorIds: asStringArray(row.collaborator_ids),
    formerAffiliations: asStringArray(row.former_affiliations),
    sources: asJsonArray(row.sources),
    archived: asBoolean(row.archived),
    lastModifiedBy: asString(row.last_modified_by, "Eric"),
    lastModifiedAt: formatStamp(row.last_modified_at, stamp),
    lastVerifiedAt: formatDate(row.last_verified_at, date),
    createdAt: formatDate(row.created_at, date),
    updatedAt: formatDate(row.updated_at, date),
  };
}

function personToRow(person: Partial<Person>, user: CurrentUser, includeId = false) {
  const row: Record<string, unknown> = {
    name: person.name,
    degree: person.degree ?? "",
    avatar_url: person.avatarUrl ?? "",
    role: person.role || "Researcher",
    title: person.title || person.role || "Researcher",
    institution: person.institution ?? "",
    lab: person.lab ?? "",
    department: person.department ?? "",
    location: person.location ?? "",
    bio: person.bio ?? "",
    current_research_focus: person.currentResearchFocus ?? "",
    contacts: person.contacts ?? [],
    feishu_doc_url: person.feishuDocUrl ?? "",
    short_assessment: person.shortAssessment?.trim().slice(0, 150) ?? "",
    supervisor_note: person.supervisorNote ?? person.managerNote ?? "",
    manager_note: person.managerNote ?? "",
    research_document: person.researchDocument ?? "",
    research_topics: person.researchTopics ?? [],
    secondary_topics: person.secondaryTopics ?? [],
    representative_projects: person.representativeProjects ?? [],
    representative_publications: person.representativePublications ?? [],
    datasets: person.datasets ?? [],
    benchmarks: person.benchmarks ?? [],
    robot_platforms: person.robotPlatforms ?? [],
    research_mode: person.researchMode ?? "仿真 + 真实机器人",
    why_important: person.whyImportant ?? "",
    zoda_relevance: person.zodaRelevance ?? "",
    potential_data_need: person.potentialDataNeed ?? "",
    benchmark_value: person.benchmarkValue ?? "",
    network_value: person.networkValue ?? "",
    recommended_approach: person.recommendedApproach ?? "",
    interview_questions: person.interviewQuestions ?? "",
    research_status: person.researchStatus ?? "待调研",
    priority: normalizePriority(String(person.priority ?? "C")),
    contact_status: person.contactStatus ?? "暂不联系",
    owner_name: person.owner || user.name,
    is_starred: Boolean(person.isStarred),
    flags: person.flags ?? [],
    tags: person.tags ?? [],
    next_action: person.nextAction ?? "",
    follow_up_date: person.followUpDate || todayDate(),
    advisor_ids: person.advisorIds ?? [],
    advisee_ids: person.adviseeIds ?? [],
    collaborator_ids: person.collaboratorIds ?? [],
    former_affiliations: person.formerAffiliations ?? [],
    sources: person.sources ?? [],
    archived: Boolean(person.archived),
    last_modified_by: user.name,
    last_modified_at: toSupabaseTimestamp(person.lastModifiedAt || nowStamp()),
    last_verified_at: person.lastVerifiedAt || todayDate(),
  };

  if (includeId && person.id && isUuid(person.id)) {
    row.id = person.id;
  }

  return row;
}

function updateFromRow(row: UpdateRow): WorkUpdate {
  const stamp = nowStamp();
  return {
    id: asString(row.id),
    updateType: normalizeUpdateType(asString(row.update_type)),
    title: asString(row.title),
    summary: asString(row.summary),
    insight: asString(row.insight),
    linkedPersonId: asString(row.linked_person_id) || undefined,
    linkedPerson: asString(row.linked_person),
    linkedOrganization: asString(row.linked_organization),
    feishuUrl: asString(row.feishu_url),
    author: asString(row.author_name, "Eric"),
    occurredAt: formatStamp(row.occurred_at, stamp),
    createdAt: formatStamp(row.created_at, stamp),
    updatedAt: formatStamp(row.updated_at, stamp),
  };
}

function organizationFromRow(row: OrganizationRow, sourceCount?: number): ResearchOrganization {
  const stamp = nowStamp();
  return {
    id: asString(row.id),
    name: asString(row.name),
    type: normalizeOrganizationType(asString(row.organization_type, "实验室")),
    priority: normalizeOrganizationPriority({
      name: asString(row.name),
      priority: asString(row.priority),
    }),
    websiteUrl: asString(row.website_url),
    note: asString(row.note),
    sourceCount: sourceCount ?? asNumber(row.source_count),
    createdAt: formatStamp(row.created_at, stamp),
    updatedAt: formatStamp(row.updated_at, stamp),
  };
}

function normalizeOrganizationType(value = "") {
  const trimmed = value.trim();
  if (trimmed === "lab") return "实验室";
  if (trimmed === "company" || trimmed === "industry") return "公司/产业机构";
  if (trimmed === "team" || trimmed === "group") return "研究团队";
  if (trimmed === "center" || trimmed === "project") return "项目/中心";
  if (trimmed === "organization") return "其他";
  return trimmed || "实验室";
}

function organizationToRow(
  organization: Partial<ResearchOrganization>,
  options: { includePriority?: boolean } = {},
) {
  const row: Record<string, unknown> = {
    name: organization.name?.trim() || "未命名组织",
    organization_type: organization.type?.trim() || "实验室",
    website_url: organization.websiteUrl?.trim() || "",
    note: organization.note?.trim() || "",
  };
  if (options.includePriority !== false) {
    row.priority = normalizeOrganizationPriority(organization);
  }
  return row;
}

function isMissingOrganizationPriorityColumn(error: unknown) {
  return error instanceof Error && /organizations\\.priority|priority.*column|column.*priority/i.test(error.message);
}

function updateToRow(update: Partial<WorkUpdate>, user: CurrentUser) {
  return {
    update_type: normalizeUpdateType(update.updateType),
    title: update.title?.trim() || "记录进展",
    summary: update.summary?.trim() || "",
    insight: update.insight?.trim() || "",
    linked_person_id: update.linkedPersonId && isUuid(update.linkedPersonId)
      ? update.linkedPersonId
      : null,
    linked_person: update.linkedPerson?.trim() || "",
    linked_organization: update.linkedOrganization?.trim() || "",
    feishu_url: update.feishuUrl?.trim() || "",
    author_name: update.author?.trim() || user.name,
    occurred_at: toSupabaseTimestamp(update.occurredAt || nowStamp()),
  };
}

function activityFromRow(row: ActivityRow): ActivityLog {
  return {
    id: asString(row.id),
    actor: asString(row.actor_name, "Eric"),
    actorRole: asString(row.actor_role, "Admin") as ActivityLog["actorRole"],
    action: asString(row.action),
    targetType: asString(row.target_type, "system") as ActivityLog["targetType"],
    targetId: asString(row.target_id) || undefined,
    summary: asString(row.summary),
    before: asString(row.before_value) || undefined,
    after: asString(row.after_value) || undefined,
    createdAt: formatStamp(row.created_at, nowStamp()),
  };
}

function briefFromRow(row: BriefRow): DashboardBrief {
  return {
    title: asString(row.title, seedDashboardBrief.title),
    description: asString(row.description, seedDashboardBrief.description),
    focusAreas: asStringArray(row.focus_areas),
    updatedAt: formatStamp(row.updated_at, nowStamp()),
    updatedBy: asString(row.updated_by, "Eric"),
  };
}

function nextStepFromRow(row: NextStepRow): NextStep {
  return {
    id: asString(row.id),
    content: asString(row.content),
    completed: asBoolean(row.completed),
    sortOrder: asNumber(row.sort_order),
    createdAt: formatStamp(row.created_at, nowStamp()),
    updatedAt: formatStamp(row.updated_at, nowStamp()),
  };
}

export async function listPeople() {
  const rows = await supabaseFetch<PersonRow[]>("/people?select=*&order=updated_at.desc");
  return rows.map(personFromRow);
}

export async function getPerson(id: string) {
  const rows = await supabaseFetch<PersonRow[]>(
    `/people?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  return rows[0] ? personFromRow(rows[0]) : null;
}

export async function createPerson(person: Person, user: CurrentUser) {
  const stamp = nowStamp();
  const row = personToRow(
    {
      ...person,
      priority: normalizePriority(person.priority),
      shortAssessment: person.shortAssessment?.trim().slice(0, 150) || "",
      owner: person.owner || user.name,
      lastModifiedAt: stamp,
      lastModifiedBy: user.name,
    },
    user,
    true,
  );
  const rows = await supabaseFetch<PersonRow[]>("/people?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  const saved = personFromRow(rows[0]);

  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增人员",
    targetType: "person",
    targetId: saved.id,
    summary: `${user.name} 新增了 ${saved.name}。`,
  });

  await appendUpdate(buildPersonCreatedUpdate(saved, { author: user.name, occurredAt: stamp }));

  return saved;
}

export async function patchPerson(
  id: string,
  payload: PersonPatchPayload,
  user: CurrentUser,
) {
  const current = await getPerson(id);
  if (!current) return null;
  const stamp = nowStamp();

  const existingLabs = new Set(
    (await listPeople())
      .filter((person) => person.id !== id)
      .map((person) => person.lab)
      .filter(Boolean),
  );
  const savedInput: Person = {
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
    updatedAt: todayDate(),
  };

  const rows = await supabaseFetch<PersonRow[]>(
    `/people?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(personToRow(savedInput, user)),
    },
  );
  const saved = rows[0] ? personFromRow(rows[0]) : null;
  if (!saved) return null;

  await appendActivity({
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
    await appendUpdate(autoUpdate, { mergeSimilar: true });
  }

  return saved;
}

export async function archivePerson(id: string, user: CurrentUser) {
  const person = await getPerson(id);
  if (!person) return null;
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

export async function deletePerson(id: string, user: CurrentUser) {
  const person = await getPerson(id);
  if (!person) return null;

  await supabaseFetch(`/people?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除人员",
    targetType: "person",
    targetId: id,
    summary: `${user.name} 删除了 ${person.name}。`,
    before: person.name,
    after: "已删除",
  });
  return person;
}

export async function listActivities() {
  const rows = await supabaseFetch<ActivityRow[]>(
    "/activity_logs?select=*&order=created_at.desc&limit=100",
  );
  return rows.map(activityFromRow);
}

export async function getDashboardBrief() {
  const rows = await supabaseFetch<BriefRow[]>(
    "/dashboard_brief?id=eq.default&select=*&limit=1",
  );
  if (rows[0]) return briefFromRow(rows[0]);

  const created = await supabaseFetch<BriefRow[]>("/dashboard_brief?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: "default",
      title: seedDashboardBrief.title,
      description: seedDashboardBrief.description,
      focus_areas: seedDashboardBrief.focusAreas,
      updated_by: seedDashboardBrief.updatedBy,
    }),
  });
  return briefFromRow(created[0]);
}

export async function patchDashboardBrief(
  payload: DashboardBriefPayload,
  user: CurrentUser,
) {
  const current = await getDashboardBrief();
  const patch = payload.patch ?? {};
  const savedRow = {
    title: patch.title?.trim() || current.title,
    description: patch.description?.trim() || current.description,
    focus_areas: Array.isArray(patch.focusAreas)
      ? patch.focusAreas.map((area) => area.trim()).filter(Boolean)
      : current.focusAreas,
    updated_at: toSupabaseTimestamp(nowStamp()),
    updated_by: user.name,
  };

  const rows = await supabaseFetch<BriefRow[]>(
    "/dashboard_brief?id=eq.default&select=*",
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(savedRow),
    },
  );

  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新工作简报",
    targetType: "system",
    summary: `${user.name} 更新了首页工作简报。`,
    before: current.title,
    after: asString(rows[0]?.title, current.title),
  });
  return briefFromRow(rows[0]);
}

export async function listNextSteps() {
  const rows = await supabaseFetch<NextStepRow[]>(
    "/next_steps?select=*&order=sort_order.asc,created_at.asc",
  );
  return sortNextSteps(rows.map(nextStepFromRow));
}

export async function createNextStep(payload: NextStepPayload, user: CurrentUser) {
  const current = await listNextSteps();
  const maxOrder = current.reduce((max, step) => Math.max(max, step.sortOrder), 0);
  const content = payload.step.content?.trim() || "新的下一步计划";
  const rows = await supabaseFetch<NextStepRow[]>("/next_steps?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      content,
      completed: Boolean(payload.step.completed),
      sort_order:
        typeof payload.step.sortOrder === "number" &&
        Number.isFinite(payload.step.sortOrder)
          ? payload.step.sortOrder
          : maxOrder + 1,
    }),
  });
  const saved = nextStepFromRow(rows[0]);
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增下一步",
    targetType: "system",
    targetId: saved.id,
    summary: `${user.name} 新增了下一步计划：${saved.content}。`,
  });
  return saved;
}

export async function patchNextStep(
  id: string,
  payload: NextStepPayload,
  user: CurrentUser,
) {
  const rows = await supabaseFetch<NextStepRow[]>(
    `/next_steps?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  if (!rows[0]) return null;
  const current = nextStepFromRow(rows[0]);
  const savedRows = await supabaseFetch<NextStepRow[]>(
    `/next_steps?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        content: payload.step.content?.trim() || current.content,
        completed:
          typeof payload.step.completed === "boolean"
            ? payload.step.completed
            : current.completed,
        sort_order:
          typeof payload.step.sortOrder === "number" &&
          Number.isFinite(payload.step.sortOrder)
            ? payload.step.sortOrder
            : current.sortOrder,
        updated_at: toSupabaseTimestamp(nowStamp()),
      }),
    },
  );
  const saved = nextStepFromRow(savedRows[0]);
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新下一步",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 更新了下一步计划：${saved.content}。`,
  });
  return saved;
}

export async function deleteNextStep(id: string, user: CurrentUser) {
  const rows = await supabaseFetch<NextStepRow[]>(
    `/next_steps?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  if (!rows[0]) return null;
  const current = nextStepFromRow(rows[0]);
  await supabaseFetch(`/next_steps?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除下一步",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 删除了下一步计划：${current.content}。`,
  });
  return current;
}

export async function listUpdates(filters: UpdateFilters = {}) {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "occurred_at.desc");
  if (filters.updateType) params.set("update_type", `eq.${filters.updateType}`);
  if (filters.date) {
    params.set("occurred_at", `gte.${toSupabaseTimestamp(`${filters.date} 00:00`)}`);
    params.append("occurred_at", `lte.${toSupabaseTimestamp(`${filters.date} 23:59`)}`);
  }
  if (filters.from) params.set("occurred_at", `gte.${toSupabaseTimestamp(`${filters.from} 00:00`)}`);
  if (filters.to) params.append("occurred_at", `lte.${toSupabaseTimestamp(`${filters.to} 23:59`)}`);
  if (filters.person) params.set("linked_person", `ilike.*${filters.person}*`);
  if (filters.organization) {
    params.set("linked_organization", `ilike.*${filters.organization}*`);
  }
  const rows = await supabaseFetch<UpdateRow[]>(`/updates?${params.toString()}`);
  return rows.map(updateFromRow);
}

export async function getUpdate(id: string) {
  const rows = await supabaseFetch<UpdateRow[]>(
    `/updates?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  return rows[0] ? updateFromRow(rows[0]) : null;
}

export async function createUpdate(payload: UpdatePayload, user: CurrentUser) {
  const saved = await appendUpdate({
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
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增工作动态",
    targetType: "system",
    targetId: saved.id,
    summary: `${user.name} 新增了工作动态：${saved.title}。`,
  });
  return saved;
}

export async function patchUpdate(
  id: string,
  payload: UpdatePayload,
  user: CurrentUser,
) {
  const current = await getUpdate(id);
  if (!current) return null;
  const rows = await supabaseFetch<UpdateRow[]>(
    `/updates?id=eq.${encodeURIComponent(id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        ...updateToRow({ ...current, ...payload.update }, user),
        updated_at: toSupabaseTimestamp(nowStamp()),
      }),
    },
  );
  const saved = updateFromRow(rows[0]);
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "更新工作动态",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 更新了工作动态：${saved.title}。`,
  });
  return saved;
}

export async function deleteUpdate(id: string, user: CurrentUser) {
  const current = await getUpdate(id);
  if (!current) return null;
  await supabaseFetch(`/updates?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除工作动态",
    targetType: "system",
    targetId: id,
    summary: `${user.name} 删除了工作动态：${current.title}。`,
  }).catch((error) => {
    console.warn("Failed to write delete update activity log", error);
  });
  return current;
}

export async function importPeopleFromCsv(csv: string, user: CurrentUser) {
  const records = parseCsv(csv);
  const imported: Person[] = [];
  for (const record of records) {
    if (!record.name) continue;
    const person = await createPerson(
      {
        ...createEmptyPerson(user),
        name: record.name,
        role: record.role || "Researcher",
        title: record.title || record.role || "Researcher",
        institution: record.institution || "未填写学校",
        lab: record.lab || "",
        department: record.department || "",
        location: record.location || "",
        researchTopics: splitList(record.research_topics || ""),
        shortAssessment:
          record.short_assessment ||
          record.assessment ||
          record.eric_assessment ||
          record.why_important ||
          "",
        priority: normalizePriority(record.priority),
        researchStatus: record.research_status || "待调研",
        contactStatus: record.contact_status || "暂不联系",
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
        tags: splitList(record.tags || ""),
        flags: splitList(record.flags || "信息待核验"),
      },
      user,
    );
    imported.push(person);
  }
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "CSV 导入",
    targetType: "system",
    summary: `${user.name} 通过 CSV 导入了 ${imported.length} 位人员。`,
  });
  return imported;
}

export async function listOrganizations() {
  const [rows, sourceCounts] = await Promise.all([
    supabaseFetch<OrganizationRow[]>(
      "/organizations?select=*&organization_type=neq.school",
    ),
    organizationSourceCounts(),
  ]);
  return rows
    .map((row) =>
      organizationFromRow(row, sourceCounts.get(asString(row.name).toLowerCase())),
    )
    .sort(
      (left, right) =>
        priorityWeight(left.priority) - priorityWeight(right.priority) ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.name.localeCompare(right.name),
    );
}

export async function createOrganization(
  payload: OrganizationPayload,
  user: CurrentUser,
) {
  let rows: OrganizationRow[];
  try {
    rows = await supabaseFetch<OrganizationRow[]>("/organizations?on_conflict=name&select=*", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(organizationToRow(payload.organization)),
    });
  } catch (error) {
    if (!isMissingOrganizationPriorityColumn(error)) throw error;
    rows = await supabaseFetch<OrganizationRow[]>("/organizations?on_conflict=name&select=*", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(organizationToRow(payload.organization, { includePriority: false })),
    });
  }
  const saved = organizationFromRow(rows[0]);
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "新增组织",
    targetType: "organization",
    targetId: saved.id,
    summary: `${user.name} 新增了组织：${saved.name}。`,
  });
  return saved;
}

export async function patchOrganization(
  id: string,
  payload: OrganizationPayload,
  user: CurrentUser,
) {
  const currentRows = await supabaseFetch<OrganizationRow[]>(
    `/organizations?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  if (!currentRows[0]) {
    return null;
  }
  const current = organizationFromRow(currentRows[0]);
  let rows: OrganizationRow[];
  try {
    rows = await supabaseFetch<OrganizationRow[]>(
      `/organizations?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(
          organizationToRow({
            ...current,
            ...payload.organization,
          }),
        ),
      },
    );
  } catch (error) {
    if (!isMissingOrganizationPriorityColumn(error)) throw error;
    rows = await supabaseFetch<OrganizationRow[]>(
      `/organizations?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(
          organizationToRow(
            {
              ...current,
              ...payload.organization,
            },
            { includePriority: false },
          ),
        ),
      },
    );
  }
  const saved = organizationFromRow(rows[0]);
  const priorityChanged = current.priority !== saved.priority;
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: priorityChanged ? "调整组织优先级" : "更新组织",
    targetType: "organization",
    targetId: saved.id,
    summary: priorityChanged
      ? `${user.name} 调整组织优先级：${saved.name}。优先级从 ${current.priority} 调整为 ${saved.priority}。`
      : `${user.name} 更新了组织：${saved.name}。`,
    before: priorityChanged ? current.priority : undefined,
    after: priorityChanged ? saved.priority : undefined,
  });
  if (priorityChanged) {
    await appendUpdate({
      updateType: "调整优先级",
      title: `调整组织优先级：${saved.name}`,
      summary: `优先级从 ${current.priority} 调整为 ${saved.priority}`,
      insight: "",
      linkedPersonId: undefined,
      linkedPerson: "",
      linkedOrganization: saved.name,
      feishuUrl: saved.websiteUrl,
      author: user.name,
      occurredAt: nowStamp(),
    });
  }
  return saved;
}

export async function deleteOrganization(id: string, user: CurrentUser) {
  const currentRows = await supabaseFetch<OrganizationRow[]>(
    `/organizations?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  if (!currentRows[0]) {
    return null;
  }
  const current = organizationFromRow(currentRows[0]);
  await supabaseFetch(`/organizations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await appendActivity({
    actor: user.name,
    actorRole: user.role,
    action: "删除组织",
    targetType: "organization",
    targetId: current.id,
    summary: `${user.name} 删除了组织：${current.name}。`,
  });
  return current;
}

async function organizationSourceCounts() {
  const rows = await supabaseFetch<Array<{ lab?: string }>>(
    "/people?select=lab&archived=eq.false",
  );
  const counts = new Map<string, number>();
  for (const row of rows) {
    const lab = asString(row.lab).trim().toLowerCase();
    if (!lab) continue;
    counts.set(lab, (counts.get(lab) ?? 0) + 1);
  }
  return counts;
}

async function appendUpdate(
  update: AutoUpdate,
  options: { mergeSimilar?: boolean } = {},
) {
  if (options.mergeSimilar) {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "occurred_at.desc");
    params.set("limit", "20");
    if (update.author) params.set("author_name", `eq.${update.author}`);
    const recentRows = await supabaseFetch<UpdateRow[]>(`/updates?${params.toString()}`);
    const target = recentRows.map(updateFromRow).find((existing) =>
      shouldMergeAutoUpdate(existing, update),
    );

    if (target) {
      const merged = mergeAutoUpdate(target, update, nowStamp());
      const rows = await supabaseFetch<UpdateRow[]>(
        `/updates?id=eq.${encodeURIComponent(target.id)}&select=*`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            ...updateToRow(merged, { name: merged.author, role: "Admin" }),
            updated_at: toSupabaseTimestamp(merged.updatedAt),
          }),
        },
      );
      return updateFromRow(rows[0]);
    }
  }

  const rows = await supabaseFetch<UpdateRow[]>("/updates?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(updateToRow(update, { name: update.author, role: "Admin" })),
  });
  return updateFromRow(rows[0]);
}

async function appendActivity(activity: Omit<ActivityLog, "id" | "createdAt">) {
  await supabaseFetch("/activity_logs", {
    method: "POST",
    body: JSON.stringify({
      actor_name: activity.actor,
      actor_role: activity.actorRole,
      action: activity.action,
      target_type: activity.targetType,
      target_id: activity.targetId && isUuid(activity.targetId) ? activity.targetId : null,
      summary: activity.summary,
      before_value: activity.before ?? "",
      after_value: activity.after ?? "",
    }),
  });
}

function createEmptyPerson(user: CurrentUser): Person {
  const stamp = nowStamp();
  const date = todayDate();
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
