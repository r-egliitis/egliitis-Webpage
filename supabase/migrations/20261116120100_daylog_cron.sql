-- Day Log scheduler: pg_cron + pg_net + the Edge Function sender.
-- Apply only after the daylog-push Edge Function is deployed and the Vault
-- secrets daylog_project_url and daylog_cron_secret exist.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- Wakes the sender only when something is pending.
create or replace function public.daylog_dispatch()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.notification_log where status = 'pending') then return; end if;
  perform net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'daylog_project_url')
               || '/functions/v1/daylog-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-daylog-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daylog_cron_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 10000);
end $$;

-- "Send test notification" button. At most one per minute.
create or replace function public.daylog_request_test_push()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  insert into public.notification_log (user_id, kind, dedupe_key, title, body, url)
  values (auth.uid(), 'test', 'test:' || to_char(date_trunc('minute', now()), 'YYYYMMDDHH24MI'),
          'Day Log', 'Test notification - push works.', '/os/daylog')
  on conflict (user_id, dedupe_key) do nothing;
  perform public.daylog_dispatch();
end $$;

revoke execute on function public.daylog_dispatch() from public, anon, authenticated;
revoke execute on function public.daylog_request_test_push() from public, anon;
grant  execute on function public.daylog_request_test_push() to authenticated;


-- Claimed by the Edge Function (service_role only). skip locked = overlapping runs never take the same row.
create or replace function public.daylog_claim_pending() returns setof public.notification_log
language sql security definer set search_path = '' as $$
  update public.notification_log set status = 'sending', attempts = attempts + 1
   where id in (select id from public.notification_log where status = 'pending'
                 order by created_at limit 50 for update skip locked)
  returning *;
$$;
revoke execute on function public.daylog_claim_pending() from public, anon, authenticated;
grant execute on function public.daylog_claim_pending() to service_role;

-- The Edge Function checks the x-daylog-secret header here, so the secret
-- lives only in Vault (no copy in the function's environment).
create or replace function public.daylog_verify_dispatch_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select decrypted_secret = p_secret and length(p_secret) >= 32
       from vault.decrypted_secrets where name = 'daylog_cron_secret'),
    false);
$$;
revoke execute on function public.daylog_verify_dispatch_secret(text) from public, anon, authenticated;
grant execute on function public.daylog_verify_dispatch_secret(text) to service_role;

select cron.schedule('daylog-tick', '* * * * *',
  $$ select public.daylog_tick(); select public.daylog_dispatch(); $$);
