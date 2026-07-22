-- Repeatable starter data for the cloud deployment.
-- Replace the auth_user_id values after creating users in Supabase Auth.

-- Example:
-- insert into public.user_profiles (auth_user_id, email, display_name, role)
-- values ('00000000-0000-0000-0000-000000000000', 'eric@example.com', 'Eric', 'admin')
-- on conflict (auth_user_id) do update
-- set email = excluded.email,
--     display_name = excluded.display_name,
--     role = excluded.role;

insert into public.dashboard_brief (id, title, description, focus_areas, updated_by)
values (
  'default',
  'BU 具身智能科研对象池建设',
  '正在梳理 BU 相关教授、博士、硕士和实验室，重点关注 VLA、多机器人、机器人操作和真实机器人数据。',
  array['VLA', '多机器人', '机器人操作', '真实机器人数据'],
  'Eric'
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    focus_areas = excluded.focus_areas,
    updated_by = excluded.updated_by;

insert into public.next_steps (id, content, completed, sort_order)
values
  ('11111111-1111-4111-8111-111111111111', '补齐 BU 高优先级人员的飞书人物资料链接。', false, 1),
  ('22222222-2222-4222-8222-222222222222', '继续核验 H2X Lab 与 VLA、具身感知方向的相关资料。', false, 2),
  ('33333333-3333-4333-8333-333333333333', '整理下一批 MIT / Harvard 相关候选名单。', false, 3)
on conflict (id) do update
set content = excluded.content,
    completed = excluded.completed,
    sort_order = excluded.sort_order;

insert into public.organizations (name, organization_type, priority, website_url, note)
values
  (
    'H2X Lab',
    '实验室',
    'S',
    '',
    'BU 具身感知、VLA、自动驾驶评测和真实环境泛化方向的重点实验室线索。当前重点关联 Eshed Ohn-Bar、Kamran Vakil 及 H2X 学生网络。'
  ),
  (
    'Collaborative Autonomy Group',
    '实验室',
    'B',
    '',
    'Alyssa Pierson 领导的多机器人协作、自主规划、人机协作和异构机器人团队研究线索。适合作为多机器人 Benchmark 与产业连接的重点组织。'
  )
on conflict (name) do update
set organization_type = excluded.organization_type,
    priority = excluded.priority,
    website_url = excluded.website_url,
    note = excluded.note;

insert into public.people (
  id,
  name,
  role,
  title,
  institution,
  lab,
  research_topics,
  short_assessment,
  priority,
  contact_status,
  research_status,
  owner_name,
  feishu_doc_url,
  flags,
  last_modified_by
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Alyssa Pierson',
    'Professor',
    'Associate Professor',
    'Boston University',
    'Collaborative Autonomy Group',
    array['Multi-Robot Systems', 'Human-Robot Interaction', 'Robot Planning'],
    'BU 多机器人协作方向核心 PI，研究与多机器人自主、人机协作和真实机器人数据直接相关。',
    '高',
    '暂不联系',
    '初步录入',
    'Eric',
    '',
    array['信息待核验'],
    'Eric'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Eshed Ohn-Bar',
    'Professor',
    'Assistant Professor',
    'Boston University',
    'H2X Lab',
    array['Embodied AI', 'Vision-Language-Action', 'Robot Learning'],
    'H2X Lab 与具身感知和 VLA 相关度较高，适合作为 BU 具身智能方向重点跟踪对象。',
    '高',
    '计划联系',
    '初步录入',
    'Eric',
    '',
    array['信息待核验'],
    'Eric'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Kamran Vakil',
    'PhD Student',
    'PhD Student',
    'Boston University',
    'H2X Lab',
    array['Embodied AI', 'Robot Learning'],
    '',
    '中',
    '暂不联系',
    '初步录入',
    'Eric',
    '',
    array['信息待核验'],
    'Eric'
  )
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    title = excluded.title,
    institution = excluded.institution,
    lab = excluded.lab,
    research_topics = excluded.research_topics,
    short_assessment = excluded.short_assessment,
    priority = excluded.priority,
    contact_status = excluded.contact_status,
    research_status = excluded.research_status,
    owner_name = excluded.owner_name,
    feishu_doc_url = excluded.feishu_doc_url,
    flags = excluded.flags,
    last_modified_by = excluded.last_modified_by;

insert into public.updates (
  id,
  update_type,
  title,
  summary,
  insight,
  linked_person_id,
  linked_person,
  linked_organization,
  author_name,
  occurred_at
)
values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '新增研究判断',
    '确认 BU 多机器人方向优先关注 Alyssa Pierson',
    '整理团队研究方向和近期项目，确认其与多机器人自主和人机协作方向直接相关。',
    'Alyssa Pierson 具备多机器人、人机协作和真实机器人数据方向的综合连接价值。',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Alyssa Pierson',
    'Collaborative Autonomy Group',
    'Eric',
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '新增资料',
    '补充 H2X Lab 人物资料入口',
    '统一整理 Eshed Ohn-Bar 和 Kamran Vakil 的人物资料入口。',
    'H2X Lab 与具身感知、VLA 和真实机器人数据相关度较高。',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Eshed Ohn-Bar',
    'H2X Lab',
    'Eric',
    now()
  )
on conflict (id) do update
set update_type = excluded.update_type,
    title = excluded.title,
    summary = excluded.summary,
    insight = excluded.insight,
    linked_person_id = excluded.linked_person_id,
    linked_person = excluded.linked_person,
    linked_organization = excluded.linked_organization,
    author_name = excluded.author_name,
    occurred_at = excluded.occurred_at;
