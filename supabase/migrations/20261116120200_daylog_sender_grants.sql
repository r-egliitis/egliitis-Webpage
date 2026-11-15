-- The daylog-push Edge Function uses the Supabase secret key (role
-- service_role). This project grants nothing on new tables by default, so
-- give the sender exactly what it uses: read and update subscriptions
-- (delete dead ones) and update the notifications it claimed.
grant select, update, delete on table public.push_subscriptions to service_role;
grant select, update on table public.notification_log to service_role;
