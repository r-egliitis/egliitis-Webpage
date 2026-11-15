-- Day Log (/os/daylog): tables, RLS, grants, guards and the scheduler tick.
-- Single user; same conventions as phase1_tasks (same-owner composite FKs,
-- explicit grants because "expose new tables" is off).

create extension if not exists btree_gist with schema extensions;  -- uuid "=" in the overlap exclusion

-- ───────────────────────────── settings ─────────────────────────────
create table public.daylog_settings (
  user_id                uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  interval_minutes       smallint not null default 20 check (interval_minutes in (15, 20, 30, 60)),
  missed_slot_mode       text not null default 'backfill' check (missed_slot_mode in ('backfill', 'lock', 'skip')),
  lock_after_slots       smallint not null default 3 check (lock_after_slots between 1 and 24),
  multi_slot_entries     boolean not null default true,
  tagging_mode           text not null default 'while_writing'
                           check (tagging_mode in ('off', 'while_writing', 'review', 'both')),
  pause_mode             text not null default 'button' check (pause_mode in ('off', 'button', 'timer')),
  pause_timer_minutes    smallint not null default 90 check (pause_timer_minutes between 5 and 600),
  unanswered_ping_mode   text not null default 'always' check (unanswered_ping_mode in ('always', 'quiet_after')),
  quiet_after_unanswered smallint not null default 3 check (quiet_after_unanswered between 1 and 20),
  midnight_notice        boolean not null default true,
  morning_reminder_time  time default '07:00',                 -- null = no morning reminder
  auto_end_time          time not null default '04:00' check (auto_end_time between '00:00' and '12:00'),
  updated_at             timestamptz not null default now()
);

-- Effective settings as jsonb: the user's row, or the defaults above if none yet.
create or replace function public.daylog_settings_json(p_user uuid)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(
    (select to_jsonb(s) - 'user_id' - 'updated_at' from public.daylog_settings s where s.user_id = p_user),
    jsonb_build_object(
      'interval_minutes', 20, 'missed_slot_mode', 'backfill', 'lock_after_slots', 3,
      'multi_slot_entries', true, 'tagging_mode', 'while_writing', 'pause_mode', 'button',
      'pause_timer_minutes', 90, 'unanswered_ping_mode', 'always', 'quiet_after_unanswered', 3,
      'midnight_notice', true, 'morning_reminder_time', '07:00:00', 'auto_end_time', '04:00:00'));
$$;

-- ─────────────────────────────── days ───────────────────────────────
create table public.daylog_days (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day               date not null,
  status            text not null default 'scheduled' check (status in ('scheduled', 'active', 'ended', 'missed')),
  window_start      timestamptz not null,   -- day 00:00 Riga        (set by trigger)
  window_end        timestamptz not null,   -- day+1 auto_end Riga   (set by trigger)
  started_at        timestamptz,            -- time of the opening entry
  ended_at          timestamptz,
  end_reason        text check (end_reason in ('manual', 'auto')),
  settings_snapshot jsonb,                  -- copied when the day starts
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint daylog_days_user_day_key unique (user_id, day),
  constraint daylog_days_id_user_key  unique (id, user_id),
  constraint daylog_days_started check ((status in ('active', 'ended')) = (started_at is not null)),
  constraint daylog_days_ended   check ((status = 'ended') = (ended_at is not null)),
  constraint daylog_days_snapshot check (status in ('scheduled', 'missed') or settings_snapshot is not null),
  constraint daylog_days_started_in_window
    check (started_at is null or (started_at >= window_start and started_at < window_end))
);
-- Only one active day at a time.
create unique index daylog_days_one_active_idx on public.daylog_days (user_id) where status = 'active';
create index daylog_days_status_window_idx on public.daylog_days (status, window_end);

create or replace function public.daylog_days_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare v_settings jsonb;
begin
  if tg_op = 'UPDATE' and new.day is distinct from old.day and old.status <> 'scheduled' then
    raise exception 'A started day can''t be moved.' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' or new.day is distinct from old.day then
    v_settings := coalesce(new.settings_snapshot, public.daylog_settings_json(new.user_id));
    new.window_start := new.day::timestamp at time zone 'Europe/Riga';
    new.window_end   := ((new.day + 1)::timestamp + (v_settings ->> 'auto_end_time')::time) at time zone 'Europe/Riga';
    if new.window_end <= now() then
      raise exception 'That day is already over.' using errcode = 'check_violation';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger daylog_days_before_write
  before insert or update on public.daylog_days
  for each row execute function public.daylog_days_before_write();

-- ────────────────────────────── entries ─────────────────────────────
create table public.daylog_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_id     uuid not null,
  kind       text not null default 'slot' check (kind in ('opening', 'slot', 'pause')),
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  body       text check (char_length(body) <= 2000),
  skipped    boolean not null default false,
  search     tsvector generated always as (to_tsvector('simple', coalesce(body, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daylog_entries_id_user_key unique (id, user_id),
  constraint daylog_entries_day_fk foreign key (day_id, user_id)
    references public.daylog_days (id, user_id) on delete cascade,
  -- An opening entry is a point in time; every other entry is a range.
  constraint daylog_entries_range check (case when kind = 'opening' then start_at = end_at else end_at > start_at end),
  constraint daylog_entries_body  check (skipped or char_length(btrim(coalesce(body, ''))) > 0),
  constraint daylog_entries_skip  check (not (skipped and kind = 'opening')),
  -- Entries of one day never overlap (an opening entry's empty range overlaps nothing).
  constraint daylog_entries_no_overlap
    exclude using gist (day_id with =, tstzrange(start_at, end_at, '[)') with &&)
);
create unique index daylog_entries_one_opening_idx on public.daylog_entries (day_id) where kind = 'opening';
create index daylog_entries_day_user_idx on public.daylog_entries (day_id, user_id);
create index daylog_entries_user_start_idx on public.daylog_entries (user_id, start_at);
create index daylog_entries_search_idx on public.daylog_entries using gin (search);

-- Entry rules. The first (opening) entry starts a scheduled day.
create or replace function public.daylog_entries_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_day      public.daylog_days%rowtype;
  v_now      timestamptz := now();
  v_step     int;
  v_open_end timestamptz;
begin
  if tg_op = 'UPDATE' and (new.kind <> old.kind or new.day_id <> old.day_id) then
    raise exception 'An entry can''t change its kind or day.' using errcode = 'check_violation';
  end if;

  select * into v_day from public.daylog_days
   where id = new.day_id and user_id = new.user_id for update;
  if not found then raise exception 'Unknown day.' using errcode = 'foreign_key_violation'; end if;

  if v_day.status = 'missed' then
    raise exception 'This day was missed.' using errcode = 'check_violation';
  elsif v_day.status = 'scheduled' then
    if tg_op <> 'INSERT' or new.kind <> 'opening' then
      raise exception 'Write the first entry to start the day.' using errcode = 'check_violation';
    end if;
    if v_now < v_day.window_start or v_now >= v_day.window_end then
      raise exception 'This day isn''t open right now.' using errcode = 'check_violation';
    end if;
    -- The unique "one active day" index rejects this if another day is active.
    update public.daylog_days
       set status = 'active', started_at = v_now,
           settings_snapshot = public.daylog_settings_json(new.user_id)
     where id = v_day.id;
    new.start_at := v_now;
    new.end_at   := v_now;
  elsif new.kind = 'opening' then
    if tg_op = 'INSERT' then
      raise exception 'This day has already started.' using errcode = 'check_violation';
    end if;
    new.start_at := old.start_at;   -- the opening time is fixed; only body can change
    new.end_at   := old.end_at;
  else
    -- active/ended: entries stay inside [started_at, end of the slot in progress or ended_at).
    v_step := (v_day.settings_snapshot ->> 'interval_minutes')::int * 60;
    v_open_end := coalesce(
      v_day.ended_at,
      least(v_day.window_end, to_timestamp((floor(extract(epoch from v_now) / v_step) + 1) * v_step)));
    if new.start_at < v_day.started_at or new.end_at > v_open_end then
      raise exception 'That time is outside this day.' using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at := v_now;
  return new;
end $$;

create trigger daylog_entries_before_write
  before insert or update on public.daylog_entries
  for each row execute function public.daylog_entries_before_write();

-- ──────────────────────────────── tags ──────────────────────────────
create table public.daylog_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  color      text check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  constraint daylog_tags_id_user_key unique (id, user_id)
);
create unique index daylog_tags_user_name_idx on public.daylog_tags (user_id, lower(name));

create table public.daylog_entry_tags (
  entry_id uuid not null,
  tag_id   uuid not null,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (entry_id, tag_id),
  constraint daylog_entry_tags_entry_fk foreign key (entry_id, user_id)
    references public.daylog_entries (id, user_id) on delete cascade,
  constraint daylog_entry_tags_tag_fk foreign key (tag_id, user_id)
    references public.daylog_tags (id, user_id) on delete cascade
);
create index daylog_entry_tags_entry_user_idx on public.daylog_entry_tags (entry_id, user_id);
create index daylog_entry_tags_tag_user_idx   on public.daylog_entry_tags (tag_id, user_id);

-- ─────────────────────────────── pauses ─────────────────────────────
create table public.daylog_pauses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_id     uuid not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  resume_at  timestamptz,                    -- "pause with timer" (phase 2)
  created_at timestamptz not null default now(),
  constraint daylog_pauses_day_fk foreign key (day_id, user_id)
    references public.daylog_days (id, user_id) on delete cascade,
  constraint daylog_pauses_order check (ended_at is null or ended_at > started_at),
  constraint daylog_pauses_no_overlap
    exclude using gist (day_id with =, tstzrange(started_at, coalesce(ended_at, 'infinity'), '[)') with &&)
);
create index daylog_pauses_day_user_idx on public.daylog_pauses (day_id, user_id);

-- ───────────────────────── push subscriptions ───────────────────────
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  last_error   text,
  fail_count   int not null default 0
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ───────────────────────── notification log ─────────────────────────
create table public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  day_id     uuid references public.daylog_days (id) on delete cascade,
  kind       text not null check (kind in ('midnight', 'morning', 'slot', 'resume', 'test')),
  dedupe_key text not null,
  slot_start timestamptz,
  slot_end   timestamptz,
  title      text not null,
  body       text not null,
  url        text not null,
  status     text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts   smallint not null default 0,
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  constraint notification_log_dedupe_key unique (user_id, dedupe_key)   -- never queued twice
);
create index notification_log_pending_idx on public.notification_log (created_at) where status in ('pending', 'sending');
create index notification_log_day_idx on public.notification_log (day_id);

-- ─────────────────────── RLS, policies, grants ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['daylog_settings', 'daylog_days', 'daylog_entries', 'daylog_tags',
                           'daylog_entry_tags', 'daylog_pauses', 'push_subscriptions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- The log is written only by the tick and the Edge Function; you can read yours.
alter table public.notification_log enable row level security;
create policy notification_log_select_own on public.notification_log
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.notification_log from anon, authenticated;
grant select on table public.notification_log to authenticated;

-- ───────────────────────────── scheduler ────────────────────────────
-- Everything due at p_now. Read-only, so it can be tested with any timestamp:
--   select * from public.daylog_due_notifications('2027-03-28 10:20:30+03');
create or replace function public.daylog_due_notifications(p_now timestamptz default now())
returns table (user_id uuid, day_id uuid, kind text, dedupe_key text, slot_start timestamptz,
               slot_end timestamptz, title text, body text, url text)
language sql stable security definer set search_path = '' as $$
  with scheduled as (
    select d.*, public.daylog_settings_json(d.user_id) as s
      from public.daylog_days d where d.status = 'scheduled'
  ),
  notices as (
    select d.user_id, d.id as day_id, 'midnight'::text as kind, 'midnight:' || d.day as dedupe_key,
           ((d.day::timestamp + time '00:01') at time zone 'Europe/Riga') as due_at,
           'Today is a Day Log day - write your first entry when you wake up.'::text as body
      from scheduled d where (d.s ->> 'midnight_notice')::boolean
    union all
    select d.user_id, d.id, 'morning', 'morning:' || d.day,
           ((d.day::timestamp + (d.s ->> 'morning_reminder_time')::time) at time zone 'Europe/Riga'),
           'No Day Log entry yet - write your first one when you''re up.'
      from scheduled d where d.s ->> 'morning_reminder_time' is not null
  ),
  active as (
    select d.*, (d.settings_snapshot ->> 'interval_minutes')::int * 60 as step
      from public.daylog_days d where d.status = 'active'
  ),
  boundaries as (
    -- Slot boundaries align on epoch seconds; Riga's offset is whole hours and
    -- every interval divides 60, so this is :00/:20/:40 local in summer and winter.
    select a.*, to_timestamp(floor(extract(epoch from p_now) / a.step) * a.step) as boundary from active a
  ),
  slots as (
    select b.user_id, b.id as day_id, b.boundary,
           greatest(b.boundary - make_interval(secs => b.step), b.started_at) as slot_start
      from boundaries b
     where b.boundary > b.started_at
       and b.boundary <= b.window_end
       and p_now < b.boundary + interval '5 minutes'          -- don't send stale pings
  )
  select n.user_id, n.day_id, n.kind, n.dedupe_key, null::timestamptz, null::timestamptz,
         'Day Log', n.body, '/os/daylog'
    from notices n
   where p_now >= n.due_at and p_now < n.due_at + interval '15 minutes'
  union all
  select s.user_id, s.day_id, 'slot', 'slot:' || s.day_id || ':' || extract(epoch from s.boundary)::bigint,
         s.slot_start, s.boundary, 'Day Log',
         'What did you do ' || to_char(s.slot_start at time zone 'Europe/Riga', 'HH24:MI') || '-'
                            || to_char(s.boundary   at time zone 'Europe/Riga', 'HH24:MI') || '?',
         '/os/daylog?slot=' || to_char(s.slot_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    from slots s
   where not exists (                                          -- already written (e.g. ahead, or multi-slot)
     select 1 from public.daylog_entries e
      where e.day_id = s.day_id and tstzrange(e.start_at, e.end_at) @> tstzrange(s.slot_start, s.boundary));
$$;

-- One scheduler step. Returns how many notifications are waiting to be sent.
create or replace function public.daylog_tick(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare v_pending int;
begin
  update public.daylog_days set status = 'missed'
   where status = 'scheduled' and window_end <= p_now;

  update public.daylog_pauses p set ended_at = d.window_end
    from public.daylog_days d
   where p.day_id = d.id and p.ended_at is null and d.status = 'active' and d.window_end <= p_now;

  update public.daylog_days set status = 'ended', ended_at = window_end, end_reason = 'auto'
   where status = 'active' and window_end <= p_now;

  -- created_at = p_now, so expiry is measured from when it fell due.
  insert into public.notification_log (user_id, day_id, kind, dedupe_key, slot_start, slot_end, title, body, url, created_at)
  select n.*, p_now from public.daylog_due_notifications(p_now) n
  on conflict (user_id, dedupe_key) do nothing;

  update public.notification_log set status = 'expired'
   where status in ('pending', 'sending') and created_at < p_now - interval '10 minutes';

  select count(*) into v_pending from public.notification_log where status = 'pending';
  return v_pending;
end $$;

revoke execute on function public.daylog_due_notifications(timestamptz) from public, anon, authenticated;
revoke execute on function public.daylog_tick(timestamptz) from public, anon, authenticated;
-- Functions owned by postgres aren't executable by default in this project, so
-- the triggers' helpers are granted to authenticated explicitly.
revoke execute on function public.daylog_settings_json(uuid) from public, anon;
grant  execute on function public.daylog_settings_json(uuid) to authenticated;
revoke execute on function public.daylog_days_before_write() from public, anon, authenticated;
revoke execute on function public.daylog_entries_before_write() from public, anon, authenticated;
