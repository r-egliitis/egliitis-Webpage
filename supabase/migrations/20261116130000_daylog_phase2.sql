-- Day Log phase 2: pauses, quiet mode, missed-slot lock/skip, settings that
-- take effect when a day starts. Replaces three functions from
-- 20261116120000_daylog_schema.sql; no table changes.

-- ─────────────────────────── entry rules ────────────────────────────
create or replace function public.daylog_entries_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_day      public.daylog_days%rowtype;
  v_now      timestamptz := now();
  v_settings jsonb;
  v_step     int;
  v_open_end timestamptz;
  v_mode     text;
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
    -- Settings are frozen here; the auto-end time is re-read so a change made
    -- after scheduling still applies to this day.
    v_settings := public.daylog_settings_json(new.user_id);
    update public.daylog_days
       set status = 'active', started_at = v_now, settings_snapshot = v_settings,
           window_end = ((v_day.day + 1)::timestamp + (v_settings ->> 'auto_end_time')::time) at time zone 'Europe/Riga'
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

    -- Missed-slot modes apply to new written entries, not to edits or skip rows.
    if tg_op = 'INSERT' and not new.skipped then
      v_mode := coalesce(v_day.settings_snapshot ->> 'missed_slot_mode', 'backfill');
      if v_mode = 'lock' and v_now >= new.end_at
           + make_interval(secs => v_step * coalesce((v_day.settings_snapshot ->> 'lock_after_slots')::int, 3)) then
        raise exception 'That time is locked: it''s too far back to fill in.' using errcode = 'check_violation';
      elsif v_mode = 'skip' and v_now >= new.end_at + make_interval(secs => v_step) then
        raise exception 'Filling in is off for this day; that slot was skipped.' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  new.updated_at := v_now;
  return new;
end $$;

-- ─────────────────────────── due notifications ───────────────────────
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
    select d.*,
           (d.settings_snapshot ->> 'interval_minutes')::int * 60 as step,
           coalesce(d.settings_snapshot ->> 'unanswered_ping_mode', 'always') = 'quiet_after' as quiet_mode,
           coalesce((d.settings_snapshot ->> 'quiet_after_unanswered')::int, 3) as quiet_after
      from public.daylog_days d where d.status = 'active'
  ),
  boundaries as (
    -- Slot boundaries align on epoch seconds; Riga's offset is whole hours and
    -- every interval divides 60, so this is :00/:20/:40 local in summer and winter.
    select a.*, to_timestamp(floor(extract(epoch from p_now) / a.step) * a.step) as boundary from active a
  ),
  slots as (
    select b.user_id, b.id as day_id, b.boundary,
           greatest(b.boundary - make_interval(secs => b.step), b.started_at) as slot_start,
           b.quiet_mode, b.quiet_after, b.started_at
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
            where e.day_id = s.day_id and tstzrange(e.start_at, e.end_at) @> tstzrange(s.slot_start, s.boundary))
     and not exists (                                          -- paused during (part of) this slot
           select 1 from public.daylog_pauses p
            where p.day_id = s.day_id and p.started_at < s.boundary
              and coalesce(p.ended_at, 'infinity'::timestamptz) > s.slot_start)
     and (not s.quiet_mode or (                                -- quiet after N unanswered pings
           select count(*) from public.notification_log l
            where l.day_id = s.day_id and l.kind = 'slot'
              and l.created_at > coalesce(
                    (select max(e.created_at) from public.daylog_entries e where e.day_id = s.day_id and not e.skipped),
                    s.started_at)
         ) < s.quiet_after);
$$;

-- ──────────────────────────────── tick ───────────────────────────────
create or replace function public.daylog_tick(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare v_pending int;
begin
  update public.daylog_days set status = 'missed'
   where status = 'scheduled' and window_end <= p_now;

  -- Timer pauses whose time is up resume on their own, with one notice.
  with resumed as (
    update public.daylog_pauses p set ended_at = p.resume_at
      from public.daylog_days d
     where p.day_id = d.id and d.status = 'active' and p.ended_at is null
       and p.resume_at is not null and p.resume_at <= p_now and p.resume_at < d.window_end
    returning p.id, p.user_id, p.day_id, p.started_at, p.ended_at
  )
  insert into public.notification_log (user_id, day_id, kind, dedupe_key, slot_start, slot_end, title, body, url, created_at)
  select r.user_id, r.day_id, 'resume', 'resume:' || r.id, r.started_at, r.ended_at, 'Day Log',
         'You''re back. What did you do ' || to_char(r.started_at at time zone 'Europe/Riga', 'HH24:MI') || '-'
                                          || to_char(r.ended_at   at time zone 'Europe/Riga', 'HH24:MI') || '?',
         '/os/daylog', p_now
    from resumed r
  on conflict (user_id, dedupe_key) do nothing;

  update public.daylog_pauses p set ended_at = d.window_end
    from public.daylog_days d
   where p.day_id = d.id and p.ended_at is null and d.status = 'active' and d.window_end <= p_now;

  update public.daylog_days set status = 'ended', ended_at = window_end, end_reason = 'auto'
   where status = 'active' and window_end <= p_now;

  -- Auto-skip mode: a gap still empty once the following slot has ended becomes "Skipped".
  insert into public.daylog_entries (user_id, day_id, kind, start_at, end_at, skipped)
  select d.user_id, d.id, 'slot',
         greatest(b.slot_end - make_interval(secs => d.step), d.started_at), b.slot_end, true
    from (select dd.*, (dd.settings_snapshot ->> 'interval_minutes')::int * 60 as step
            from public.daylog_days dd
           where dd.status = 'active' and dd.settings_snapshot ->> 'missed_slot_mode' = 'skip') d
   cross join lateral generate_series(
           to_timestamp((floor(extract(epoch from d.started_at) / d.step) + 1) * d.step),
           to_timestamp(floor(extract(epoch from p_now - make_interval(secs => d.step)) / d.step) * d.step),
           make_interval(secs => d.step)) as b(slot_end)
   where not exists (select 1 from public.daylog_entries e
                      where e.day_id = d.id
                        and tstzrange(e.start_at, e.end_at) && tstzrange(greatest(b.slot_end - make_interval(secs => d.step), d.started_at), b.slot_end))
     and not exists (select 1 from public.daylog_pauses p
                      where p.day_id = d.id and p.started_at < b.slot_end
                        and coalesce(p.ended_at, 'infinity'::timestamptz) > b.slot_end - make_interval(secs => d.step))
  on conflict do nothing;

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
revoke execute on function public.daylog_entries_before_write() from public, anon, authenticated;
