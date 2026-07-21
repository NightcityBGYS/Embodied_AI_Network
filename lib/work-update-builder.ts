import type { Person, UpdateType, WorkUpdate } from "./research-pool-types";

type AutoUpdate = Omit<WorkUpdate, "id" | "createdAt" | "updatedAt">;

type BuildContext = {
  author: string;
  occurredAt: string;
};

type PatchContext = BuildContext & {
  labIsNew: boolean;
};

function normalizePriority(value = "") {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "S" || /核心|高优先|高$/.test(value)) return "S";
  if (trimmed === "A" || /中高/.test(value)) return "A";
  if (trimmed === "B" || /中低|中/.test(value)) return "B";
  if (trimmed === "C" || /低|暂不|未评估/.test(value)) return "C";
  return "C";
}

function sameText(left = "", right = "") {
  return left.trim() === right.trim();
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
  const changes: string[] = [];
  let updateType: UpdateType | "" = "";
  let title = `更新人员：${after.name}`;
  let insight = "";

  const beforePriority = normalizePriority(before.priority);
  const afterPriority = normalizePriority(after.priority);
  if (beforePriority !== afterPriority) {
    changes.push(`优先级从「${beforePriority}」调整为「${afterPriority}」`);
    updateType ||= "调整优先级";
    title = `调整优先级：${after.name}`;
  }

  if (!sameText(before.shortAssessment, after.shortAssessment) && after.shortAssessment.trim()) {
    changes.push("更新简短判断");
    updateType = "新增研究判断";
    title = `更新判断：${after.name}`;
    insight = after.shortAssessment.trim();
  }

  if (!sameText(before.feishuDocUrl, after.feishuDocUrl) && after.feishuDocUrl.trim()) {
    changes.push("更新飞书人物资料链接");
    updateType ||= "新增资料";
    title = `更新人物资料：${after.name}`;
  }

  if (!sameText(before.lab, after.lab) && after.lab.trim() && context.labIsNew) {
    changes.push(`补充新实验室：${after.lab.trim()}`);
    updateType ||= "新增实验室";
    title = `补充实验室：${after.lab.trim()}`;
  }

  if (
    !sameText(before.researchStatus, after.researchStatus) &&
    /已访谈|已结束/.test(after.researchStatus)
  ) {
    changes.push("完成人物调研");
    updateType ||= "完成人物调研";
    title = `完成人物调研：${after.name}`;
  }

  if (
    (!sameText(before.researchStatus, after.researchStatus) &&
      /已联系|已回复|已预约|跟进中/.test(after.researchStatus)) ||
    (!sameText(before.lastVerifiedAt, after.lastVerifiedAt) && Boolean(after.lastVerifiedAt))
  ) {
    changes.push("完成信息核验");
    updateType ||= "完成信息核验";
    title = `完成信息核验：${after.name}`;
  }

  if (!changes.length || !updateType) {
    return null;
  }

  return baseUpdate(after, context, updateType, title, `${changes.join("；")}。`, insight);
}
