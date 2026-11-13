-- Phase 1 of the private life OS (/os): areas, projects, tasks.
-- Single user. Every row is owned through user_id and guarded by RLS.
-- "Expose new tables" is off, so access is granted explicitly below.

-- ───────────────────────── helper trigger functions ─────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Keeps tasks.completed_at in step with tasks.status, for every write path
-- (single update, bulk update, SQL editor).
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'done' then
    new.completed_at := null;                -- reopened (or never done)
  elsif tg_op = 'INSERT' or old.status <> 'done' then
    new.completed_at := now();               -- just completed
  else
    new.completed_at := old.completed_at;    -- still done: keep original time
  end if;
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_task_completed_at() from public, anon, authenticated;

-- ───────────────────────────────── areas ────────────────────────────────────

create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  color       text check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint areas_user_name_key unique (user_id, name),  -- makes default-area seeding idempotent
  constraint areas_id_user_key   unique (id, user_id)     -- target for same-owner FKs
);

-- ──────────────────────────────── projects ──────────────────────────────────

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id     uuid,
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  description text,
  status      text not null default 'active' check (status in ('active', 'paused', 'done')),
  deadline    date,
  archived_at timestamptz,                                -- set = hidden from the projects list
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint projects_id_user_key unique (id, user_id),
  -- Composite FK: the area must belong to the same user. On delete, only area_id is nulled.
  constraint projects_area_fk foreign key (area_id, user_id)
    references public.areas (id, user_id) on delete set null (area_id)
);

-- ───────────────────────────────── tasks ────────────────────────────────────

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 300),
  notes        text,
  area_id      uuid,
  project_id   uuid,
  due_date     date,
  priority     smallint not null default 2 check (priority between 1 and 3),  -- 1 = high
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint tasks_completed_at_matches_status
    check ((status = 'done') = (completed_at is not null)),
  constraint tasks_area_fk foreign key (area_id, user_id)
    references public.areas (id, user_id) on delete set null (area_id),
  constraint tasks_project_fk foreign key (project_id, user_id)
    references public.projects (id, user_id) on delete set null (project_id)
);

-- ──────────────────────────────── indexes ───────────────────────────────────
-- areas.user_id is already covered by areas_user_name_key (user_id leads).
-- tasks.user_id is covered by tasks_user_status_due_idx (user_id leads).

create index projects_user_id_idx      on public.projects (user_id);
create index projects_area_id_idx      on public.projects (area_id);
create index tasks_area_id_idx         on public.tasks (area_id);
create index tasks_project_id_idx      on public.tasks (project_id);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);

-- ──────────────────────────────── triggers ──────────────────────────────────

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger tasks_set_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.set_task_completed_at();

-- ─────────────────────────── row level security ─────────────────────────────

alter table public.areas    enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

create policy "areas_select_own" on public.areas
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "areas_insert_own" on public.areas
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "areas_update_own" on public.areas
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "areas_delete_own" on public.areas
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "tasks_select_own" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ───────────────────────────────── grants ───────────────────────────────────
-- Default privileges in this project give anon/authenticated TRUNCATE,
-- REFERENCES, TRIGGER and MAINTAIN on new tables. Strip everything, then
-- grant exactly what the app needs. anon gets nothing.

revoke all on table public.areas, public.projects, public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.areas, public.projects, public.tasks to authenticated;
