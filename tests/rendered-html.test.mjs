import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the research pool shell", async () => {
  const response = await render("/dashboard");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /具身智能科研对象池/i);
  assert.match(html, /__next|_next|科研对象池|内部协作管理平台/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("project metadata no longer references the starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /ResearchPoolApp/);
  assert.match(layout, /具身智能科研对象池/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("REST API exposes simplified people, dashboard, updates and activity logs", async () => {
  const [people, activities, updates, organizations, brief, nextSteps] = await Promise.all([
    render("/api/people"),
    render("/api/activity-logs"),
    render("/api/updates"),
    render("/api/organizations"),
    render("/api/dashboard/brief"),
    render("/api/dashboard/next-steps"),
  ]);

  assert.equal(people.status, 200);
  assert.equal(activities.status, 200);
  assert.equal(updates.status, 200);
  assert.equal(organizations.status, 200);
  assert.equal(brief.status, 200);
  assert.equal(nextSteps.status, 200);

  const peopleBody = await people.json();
  const activitiesBody = await activities.json();
  const updatesBody = await updates.json();
  const organizationsBody = await organizations.json();
  const briefBody = await brief.json();
  const nextStepsBody = await nextSteps.json();

  assert.ok(Array.isArray(peopleBody.people));
  assert.ok(peopleBody.people.length > 0);
  assert.ok(Array.isArray(peopleBody.people[0].contacts));
  assert.ok(typeof peopleBody.people[0].avatarUrl === "string");
  assert.ok(typeof peopleBody.people[0].institution === "string");
  assert.ok(typeof peopleBody.people[0].lab === "string");
  assert.ok(typeof peopleBody.people[0].feishuDocUrl === "string");
  assert.ok(typeof peopleBody.people[0].shortAssessment === "string");
  assert.ok(typeof peopleBody.people[0].supervisorNote === "string");
  assert.ok(typeof peopleBody.people[0].managerNote === "string");
  assert.ok(Array.isArray(activitiesBody.activities));
  assert.ok(Array.isArray(updatesBody.updates));
  assert.ok(updatesBody.updates.length > 0);
  assert.ok(typeof updatesBody.updates[0].updateType === "string");
  assert.ok(typeof updatesBody.updates[0].title === "string");
  assert.ok(typeof updatesBody.updates[0].occurredAt === "string");
  assert.ok(Array.isArray(organizationsBody.organizations));
  assert.ok(organizationsBody.organizations.some((organization) => organization.name === "H2X Lab"));
  assert.ok(typeof organizationsBody.organizations[0].note === "string");
  assert.ok(typeof briefBody.brief.title === "string");
  assert.ok(Array.isArray(briefBody.brief.focusAreas));
  assert.ok(Array.isArray(nextStepsBody.nextSteps));
  assert.ok(typeof nextStepsBody.nextSteps[0].content === "string");
});

test("organizations directory renders specific organization cards", async () => {
  const response = await render("/organizations");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /组织目录/);
  assert.match(html, /研究组织名单/);
  assert.match(html, /H2X Lab/);
  assert.match(html, /Collaborative Autonomy Group/);
  assert.match(html, /新增组织/);
  assert.match(html, /补充飞书详情|飞书详情 ↗/);
  assert.match(html, /关联人员/);
  assert.doesNotMatch(html, /Boston University<\/h2>/);
});

test("people directory renders read-only management summary", async () => {
  const response = await render("/people");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /待调研/);
  assert.match(html, /详情 ↗/);
  assert.match(html, /\+ 添加简短判断/);
  assert.match(html, /更换头像/);
  assert.match(html, /按添加时间/);
  assert.match(html, /按名字首字母/);
  assert.match(html, /按优先级/);
  assert.match(html, /S → A → B → C/);
  assert.doesNotMatch(html, /Eric 判断/);
  assert.doesNotMatch(html, /实验室待补充/);
  assert.doesNotMatch(html, /当前阶段/);
  assert.doesNotMatch(html, /负责人和截止日期/);
  assert.doesNotMatch(html, /查看人物详情 ↗/);
  assert.doesNotMatch(html, /飞书文档 ↗/);
  assert.doesNotMatch(html, /table-input short/);
  assert.doesNotMatch(html, /<table class="compact-table people-summary-table"/);
});

test("dashboard renders research brief and daily work records", async () => {
  const response = await render("/dashboard");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /实时工作简报/);
  assert.match(html, /今日与本周摘要/);
  assert.match(html, /最近工作记录/);
  assert.match(html, /最近记录/);
  assert.match(html, /最新判断/);
  assert.match(html, /编辑简报/);
  assert.match(html, /新增判断/);
  assert.match(html, /下一步/);
  assert.match(html, /查看全部记录/);
  assert.doesNotMatch(html, /最新发现/);
  assert.doesNotMatch(html, /当前重点人物/);
  assert.doesNotMatch(html, /最新资料/);
  assert.doesNotMatch(html, /按日期筛选/);
  assert.doesNotMatch(html, /待上级处理/);
  assert.doesNotMatch(html, /逾期事项/);
  assert.doesNotMatch(html, /即将到期/);
});

test("updates page renders full work record management", async () => {
  const response = await render("/updates");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /每日更新记录/);
  assert.match(html, /全部历史记录/);
  assert.match(html, /按日期筛选/);
  assert.match(html, /按类型筛选/);
  assert.match(html, /按人员筛选/);
  assert.match(html, /按实验室筛选/);
  assert.match(html, /编辑/);
  assert.match(html, /删除/);
  assert.match(html, /复制/);
});
