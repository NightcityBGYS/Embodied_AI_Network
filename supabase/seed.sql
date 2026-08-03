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
  '正在梳理 BU 相关教授、博士、硕士和实验室，重点关注 VLA、多机器人、机器人操作、真实机器人数据与可验证 Benchmark。

最新补充：Dependable Computing Lab 更适合作为 SpecRLBench / Safe RL / formal specification 方向的 Benchmark 合作线索，第一联系对象建议为 Zijian Guo。',
  array['VLA', '真实机器人数据', 'SpecRLBench', 'Safe RL', 'Formal Specification'],
  'Eric'
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    focus_areas = excluded.focus_areas,
    updated_by = excluded.updated_by;

insert into public.next_steps (id, content, completed, sort_order)
values
  ('11111111-1111-4111-8111-111111111111', '为 Zijian Guo 准备第一封联系提纲，并单独精读 SpecRLBench。', false, 1),
  ('22222222-2222-4222-8222-222222222222', '整理 SpecRLBench-Embodied 可扩展任务：真实物体、RGB-D/视频、语言指令和长程组合任务。', false, 2),
  ('33333333-3333-4333-8333-333333333333', '把 İlker Işık 和 Sabbir Ahmad 的问题清单拆成形式化规格与安全指标两条支线。', false, 3)
on conflict (id) do update
set content = excluded.content,
    completed = excluded.completed,
    sort_order = excluded.sort_order;

insert into public.organizations (name, organization_type, priority, website_url, note)
values
  (
    'Dependable Computing Lab',
    '实验室',
    'A',
    'https://sites.bu.edu/depend/people/',
    'Wenchao Li 领导的 BU 实验室，主线为 specification-guided learning、Safe RL、Temporal Logic、neuro-symbolic generalization 与安全关键自主系统。已有 SpecRLBench，适合作为可验证具身 Benchmark、自然语言到形式化规格和 Safe VLA 评测合作线索；第一联系对象建议为 Zijian Guo。'
  ),
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
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Wenchao Li',
    'Professor',
    'Associate Professor',
    'Boston University',
    'Dependable Computing Lab',
    array['Formal Methods', 'Embodied Evaluation', 'Safe Reinforcement Learning'],
    'Dependable Computing Lab 战略负责人。应在先确认 SpecRLBench 扩展需求后联系，重点讨论真实任务、语言接口、评测平台和产业应用。',
    'A',
    '暂不联系',
    '待联系',
    'Eric',
    'https://example.feishu.cn/docx/wenchao-li',
    array['重点关注', '需要上级判断', '潜在合作对象'],
    'Eric'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Zijian Guo',
    'PhD Student',
    'PhD Student',
    'Boston University',
    'Dependable Computing Lab',
    array['Benchmark', 'Safe Reinforcement Learning', 'Temporal Logic'],
    '第一优先级。SpecRLBench 第一作者，是 Dependable Computing Lab 最适合先联系的 Benchmark 构建对象。',
    'S',
    '待批准联系',
    '待联系',
    'Eric',
    'https://example.feishu.cn/docx/zijian-guo',
    array['重点关注', '近期联系', '潜在合作对象'],
    'Eric'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'İlker Işık',
    'PhD Student',
    'PhD Student',
    'Boston University',
    'Dependable Computing Lab',
    array['Neuro-symbolic AI', 'Temporal Logic', 'Formal Methods'],
    '第二优先级。偏方法和表示，可回答规格如何生成、难度如何控制、模型是否真的理解规则。',
    'A',
    '暂不联系',
    '待调研',
    'Eric',
    'https://example.feishu.cn/docx/ilker-isik',
    array['重点关注', '潜在合作对象'],
    'Eric'
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'H. M. Sabbir Ahmad',
    'PhD Student',
    'PhD Student',
    'Boston University',
    'Dependable Computing Lab',
    array['Safe Reinforcement Learning', 'AI Safety', 'Control Systems'],
    '安全评测负责人。优先级 A-，联系时不要主打多智能体协作，应聚焦安全指标、动态环境和故障恢复。',
    'A',
    '暂不联系',
    '待调研',
    'Eric',
    'https://example.feishu.cn/docx/sabbir-ahmad',
    array['重点关注', '潜在合作对象'],
    'Eric'
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    'Chenyu Wang',
    'PhD Student',
    'PhD Student',
    'Boston University',
    'Dependable Computing Lab',
    array['AI Safety', 'Neuro-symbolic AI', 'Embodied Evaluation'],
    '条件性保留。当前成果不在 SpecRLBench 或机器人安全主线，适合未来转向 VLM/VLA 不确定性和安全拒绝时再推进。',
    'B',
    '暂不联系',
    '待调研',
    'Eric',
    'https://example.feishu.cn/docx/chenyu-wang',
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
    '99999999-9999-4999-8999-999999999999',
    '新增研究判断',
    '补充 Dependable Computing Lab 与 SpecRLBench 线索',
    '新增 Dependable Computing Lab 组织卡，并补充 Zijian Guo、İlker Işık、H. M. Sabbir Ahmad、Chenyu Wang 及 Wenchao Li 的 Benchmark / Safe RL / formal specification 判断。',
    'Dependable Computing Lab 的核心价值不是大规模真实机器人数据，而是把复杂任务、安全要求和时间顺序转化为可计算、可验证、可复现的 Benchmark；第一联系对象应为 SpecRLBench 第一作者 Zijian Guo。',
    '55555555-5555-4555-8555-555555555555',
    'Zijian Guo',
    'Dependable Computing Lab',
    'Eric',
    '2026-08-03 16:30+08'
  ),
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
