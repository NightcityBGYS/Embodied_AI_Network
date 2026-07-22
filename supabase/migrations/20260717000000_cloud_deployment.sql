create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  email text unique,
  display_name text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_profiles where auth_user_id = auth.uid()),
    'viewer'
  );
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  organization_type text not null default 'organization',
  priority text not null default 'B' check (priority in ('S', 'A', 'B', 'C')),
  website_url text not null default '',
  note text not null default '',
  source_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_topics (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  degree text not null default '',
  avatar_url text not null default '',
  role text not null default 'Researcher',
  title text not null default '',
  institution text not null default '',
  lab text not null default '',
  department text not null default '',
  location text not null default '',
  bio text not null default '',
  current_research_focus text not null default '',
  contacts jsonb not null default '[]'::jsonb,
  feishu_doc_url text not null default '',
  short_assessment text not null default '',
  supervisor_note text not null default '',
  manager_note text not null default '',
  research_document text not null default '',
  research_topics text[] not null default '{}',
  secondary_topics text[] not null default '{}',
  representative_projects text[] not null default '{}',
  representative_publications jsonb not null default '[]'::jsonb,
  datasets text[] not null default '{}',
  benchmarks text[] not null default '{}',
  robot_platforms text[] not null default '{}',
  research_mode text not null default '',
  why_important text not null default '',
  zoda_relevance text not null default '',
  potential_data_need text not null default '',
  benchmark_value text not null default '',
  network_value text not null default '',
  recommended_approach text not null default '',
  interview_questions text not null default '',
  research_status text not null default '初步录入',
  priority text not null default '未评估',
  contact_status text not null default '暂不联系',
  owner_name text not null default '',
  is_starred boolean not null default false,
  flags text[] not null default '{}',
  tags text[] not null default '{}',
  next_action text not null default '',
  follow_up_date date,
  advisor_ids text[] not null default '{}',
  advisee_ids text[] not null default '{}',
  collaborator_ids text[] not null default '{}',
  former_affiliations text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  last_modified_by text not null default '',
  last_modified_at timestamptz not null default now(),
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.person_research_topics (
  person_id uuid not null references public.people(id) on delete cascade,
  topic_id uuid not null references public.research_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, topic_id)
);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  update_type text not null,
  title text not null,
  summary text not null default '',
  insight text not null default '',
  linked_person_id uuid references public.people(id) on delete set null,
  linked_person text not null default '',
  linked_organization text not null default '',
  feishu_url text not null default '',
  author_name text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_brief (
  id text primary key default 'default',
  title text not null,
  description text not null,
  focus_areas text[] not null default '{}',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.next_steps (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null default '',
  actor_role text not null default 'Viewer',
  action text not null,
  target_type text not null,
  target_id uuid,
  summary text not null,
  before_value text not null default '',
  after_value text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists people_archived_idx on public.people (archived);
create index if not exists people_priority_idx on public.people (priority);
create index if not exists organizations_priority_idx on public.organizations (priority);
create index if not exists people_topics_idx on public.people using gin (research_topics);
create index if not exists updates_occurred_idx on public.updates (occurred_at desc);
create index if not exists updates_type_idx on public.updates (update_type);
create index if not exists updates_person_idx on public.updates (linked_person_id);
create index if not exists updates_org_idx on public.updates (linked_organization);
create index if not exists next_steps_visible_idx on public.next_steps (completed, sort_order);
create index if not exists activity_created_idx on public.activity_logs (created_at desc);

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists research_topics_updated_at on public.research_topics;
create trigger research_topics_updated_at
before update on public.research_topics
for each row execute function public.set_updated_at();

drop trigger if exists people_updated_at on public.people;
create trigger people_updated_at
before update on public.people
for each row execute function public.set_updated_at();

drop trigger if exists updates_updated_at on public.updates;
create trigger updates_updated_at
before update on public.updates
for each row execute function public.set_updated_at();

drop trigger if exists dashboard_brief_updated_at on public.dashboard_brief;
create trigger dashboard_brief_updated_at
before update on public.dashboard_brief
for each row execute function public.set_updated_at();

drop trigger if exists next_steps_updated_at on public.next_steps;
create trigger next_steps_updated_at
before update on public.next_steps
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.research_topics enable row level security;
alter table public.person_research_topics enable row level security;
alter table public.people enable row level security;
alter table public.updates enable row level security;
alter table public.dashboard_brief enable row level security;
alter table public.next_steps enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "profiles are readable by signed-in users" on public.user_profiles;
drop policy if exists "admins manage profiles" on public.user_profiles;
drop policy if exists "authenticated users read organizations" on public.organizations;
drop policy if exists "editors manage organizations" on public.organizations;
drop policy if exists "authenticated users read topics" on public.research_topics;
drop policy if exists "editors manage topics" on public.research_topics;
drop policy if exists "authenticated users read person topics" on public.person_research_topics;
drop policy if exists "editors manage person topics" on public.person_research_topics;
drop policy if exists "authenticated users read people" on public.people;
drop policy if exists "editors insert people" on public.people;
drop policy if exists "editors update people" on public.people;
drop policy if exists "editors delete people" on public.people;
drop policy if exists "authenticated users read updates" on public.updates;
drop policy if exists "editors insert updates" on public.updates;
drop policy if exists "editors update updates" on public.updates;
drop policy if exists "editors delete updates" on public.updates;
drop policy if exists "authenticated users read dashboard brief" on public.dashboard_brief;
drop policy if exists "editors manage dashboard brief" on public.dashboard_brief;
drop policy if exists "authenticated users read next steps" on public.next_steps;
drop policy if exists "editors manage next steps" on public.next_steps;
drop policy if exists "authenticated users read activity logs" on public.activity_logs;
drop policy if exists "editors write activity logs" on public.activity_logs;

create policy "profiles are readable by signed-in users"
on public.user_profiles for select
to authenticated
using (true);

create policy "admins manage profiles"
on public.user_profiles for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "authenticated users read organizations"
on public.organizations for select
to authenticated
using (true);

create policy "editors manage organizations"
on public.organizations for all
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read topics"
on public.research_topics for select
to authenticated
using (true);

create policy "editors manage topics"
on public.research_topics for all
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read person topics"
on public.person_research_topics for select
to authenticated
using (true);

create policy "editors manage person topics"
on public.person_research_topics for all
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read people"
on public.people for select
to authenticated
using (true);

create policy "editors insert people"
on public.people for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors update people"
on public.people for update
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors delete people"
on public.people for delete
to authenticated
using (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read updates"
on public.updates for select
to authenticated
using (true);

create policy "editors insert updates"
on public.updates for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors update updates"
on public.updates for update
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors delete updates"
on public.updates for delete
to authenticated
using (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read dashboard brief"
on public.dashboard_brief for select
to authenticated
using (true);

create policy "editors manage dashboard brief"
on public.dashboard_brief for all
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read next steps"
on public.next_steps for select
to authenticated
using (true);

create policy "editors manage next steps"
on public.next_steps for all
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "authenticated users read activity logs"
on public.activity_logs for select
to authenticated
using (true);

create policy "editors write activity logs"
on public.activity_logs for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

insert into public.dashboard_brief (id, title, description, focus_areas, updated_by)
values (
  'default',
  'BU 具身智能科研对象池建设',
  '正在梳理 BU 相关教授、博士、硕士和实验室，重点关注 VLA、多机器人、机器人操作和真实机器人数据。',
  array['VLA', '多机器人', '机器人操作', '真实机器人数据'],
  'Eric'
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users read avatars" on storage.objects;
drop policy if exists "editors upload avatars" on storage.objects;
drop policy if exists "editors update avatars" on storage.objects;
drop policy if exists "editors delete avatars" on storage.objects;

create policy "authenticated users read avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "editors upload avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.current_app_role() in ('admin', 'editor')
);

create policy "editors update avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.current_app_role() in ('admin', 'editor')
)
with check (
  bucket_id = 'avatars'
  and public.current_app_role() in ('admin', 'editor')
);

create policy "editors delete avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.current_app_role() in ('admin', 'editor')
);
