import type { Person, UpdateType, WorkUpdate } from "./research-pool-types";

export type AutoUpdate = Omit<WorkUpdate, "id" | "createdAt" | "updatedAt">;

type BuildContext = {
  author: string;
  occurredAt: string;
};

type PatchContext = BuildContext & {
  labIsNew: boolean;
};

function sameText(left = "", right = "") {
  return left.trim() === right.trim();
}

function meaningfulProgressSummary(person: Person, fallback: string) {
  return person.nextAction.trim() || fallback;
}

function baseUpdate(
  person: Person,
  context: BuildContext,
  updateType: UpdateType,
  title: string,
  summary: string,
  insight = "",
): AutoUpdate {
  return {
    updateType,
    title,
    summary,
    insight,
    linkedPersonId: person.id,
    linkedPerson: person.name,
    linkedOrganization: person.lab || person.institution,
    feishuUrl: person.feishuDocUrl,
    author: context.author,
    occurredAt: context.occurredAt,
  };
}

export function buildPersonCreatedUpdate(
  person: Person,
  context: BuildContext,
): AutoUpdate {
  return baseUpdate(
    person,
    context,
    "新增人员",
    `新增人员：${person.name}`,
    person.feishuDocUrl ? "已关联飞书人物资料。" : "",
    person.shortAssessment?.trim() || "",
  );
}

export function buildPersonPatchedUpdate(
  before: Person,
  after: Person,
  context: PatchContext,
): AutoUpdate | null {
  if (!sameText(before.shortAssessment, after.shortAssessment) && after.shortAssessment.trim()) {
    return baseUpdate(
      after,
      context,
      "新增研究判断",
      `形成判断：${after.name}`,
      "更新了简短判断，可作为当前推荐理由。",
      after.shortAssessment.trim(),
    );
  }

  if (!sameText(before.feishuDocUrl, after.feishuDocUrl) && after.feishuDocUrl.trim()) {
    return baseUpdate(
      after,
      context,
      "新增资料",
      `更新人物资料：${after.name}`,
      "补充或更新飞书人物资料入口。",
      after.shortAssessment.trim(),
    );
  }

  if (!sameText(before.lab, after.lab) && after.lab.trim() && context.labIsNew) {
    return baseUpdate(
      after,
      context,
      "新增实验室",
      `补充实验室线索：${after.lab.trim()}`,
      `通过 ${after.name} 补充 ${after.lab.trim()} 作为后续跟踪组织。`,
      after.shortAssessment.trim(),
    );
  }

  if (
    !sameText(before.researchStatus, after.researchStatus) &&
    /已访谈|已结束/.test(after.researchStatus)
  ) {
    return baseUpdate(
      after,
      context,
      "完成人物调研",
      `完成人物调研：${after.name}`,
      meaningfulProgressSummary(after, "已完成阶段性人物调研。"),
      after.shortAssessment.trim(),
    );
  }

  if (!sameText(before.lastVerifiedAt, after.lastVerifiedAt) && Boolean(after.lastVerifiedAt)) {
    return baseUpdate(
      after,
      context,
      "完成信息核验",
      `完成信息核验：${after.name}`,
      meaningfulProgressSummary(after, "完成公开信息核验。"),
      after.shortAssessment.trim(),
    );
  }

  return null;
}

const MERGEABLE_AUTO_UPDATE_TYPES = new Set<UpdateType>([
  "完成信息核验",
  "新增实验室",
  "新增资料",
  "更新人物资料",
]);

function updateTimestamp(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameSubject(left: Pick<WorkUpdate, "linkedPersonId" | "linkedPerson">, right: AutoUpdate) {
  if (left.linkedPersonId && right.linkedPersonId) {
    return left.linkedPersonId === right.linkedPersonId;
  }
  return Boolean(left.linkedPerson && right.linkedPerson && left.linkedPerson === right.linkedPerson);
}

function uniqueSentences(...values: string[]) {
  const seen = new Set<string>();
  return values
    .flatMap((value) =>
      value
        .replace(/\n+/g, "。")
        .split("。")
        .map((sentence) => sentence.trim())
        .filter(Boolean),
    )
    .filter((sentence) => {
      if (seen.has(sentence)) return false;
      seen.add(sentence);
      return true;
    })
    .join("。");
}

export function shouldMergeAutoUpdate(existing: WorkUpdate, incoming: AutoUpdate) {
  if (!MERGEABLE_AUTO_UPDATE_TYPES.has(existing.updateType)) return false;
  if (!MERGEABLE_AUTO_UPDATE_TYPES.has(incoming.updateType)) return false;
  if (existing.author && incoming.author && existing.author !== incoming.author) return false;
  if (!sameSubject(existing, incoming)) return false;

  const existingTime = updateTimestamp(existing.occurredAt);
  const incomingTime = updateTimestamp(incoming.occurredAt);
  if (!existingTime || !incomingTime) return existing.occurredAt.slice(0, 10) === incoming.occurredAt.slice(0, 10);

  return Math.abs(incomingTime - existingTime) <= 30 * 60 * 1000;
}

export function mergeAutoUpdate(existing: WorkUpdate, incoming: AutoUpdate, updatedAt: string): WorkUpdate {
  const personName = incoming.linkedPerson || existing.linkedPerson;
  const summary = uniqueSentences(existing.summary, incoming.summary);

  return {
    ...existing,
    updateType: "更新人物资料",
    title: personName ? `更新人物资料：${personName}` : incoming.title || existing.title,
    summary: summary ? `${summary}。` : incoming.summary || existing.summary,
    insight: incoming.insight || existing.insight,
    linkedPersonId: incoming.linkedPersonId || existing.linkedPersonId,
    linkedPerson: incoming.linkedPerson || existing.linkedPerson,
    linkedOrganization: incoming.linkedOrganization || existing.linkedOrganization,
    feishuUrl: incoming.feishuUrl || existing.feishuUrl,
    author: incoming.author || existing.author,
    occurredAt: incoming.occurredAt > existing.occurredAt ? incoming.occurredAt : existing.occurredAt,
    updatedAt,
  };
}
