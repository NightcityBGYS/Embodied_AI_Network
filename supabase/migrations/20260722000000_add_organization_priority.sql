alter table public.organizations
add column if not exists priority text not null default 'B';

alter table public.organizations
drop constraint if exists organizations_priority_check;

alter table public.organizations
add constraint organizations_priority_check
check (priority in ('S', 'A', 'B', 'C'));

update public.organizations
set priority = case
  when lower(name) = 'h2x lab' then 'S'
  when lower(name) in ('collaborative autonomy group', 'cag') then 'B'
  when priority in ('S', 'A', 'B', 'C') then priority
  else 'B'
end;

create index if not exists organizations_priority_idx
on public.organizations (priority);
