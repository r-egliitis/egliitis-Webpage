-- Archived projects are hidden from the projects list; tasks keep their link.
-- Already part of 20261113120000_phase1_tasks.sql; this brings databases that
-- ran the earlier draft of that file up to date. Safe to run twice.
alter table public.projects add column if not exists archived_at timestamptz;
