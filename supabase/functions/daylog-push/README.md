# daylog-push

Sends Day Log notifications. `daylog_tick()` (SQL, every minute via pg_cron)
decides what is due and queues it in `notification_log`; `daylog_dispatch()`
wakes this function only when something is pending. The function claims the
rows, sends them with Web Push (`webpush.ts`, RFC 8291 + 8292, no
dependencies), marks them sent/failed, and deletes subscriptions that answer
404/410.

## One-time setup (in this order)

1. **Apply** `supabase/migrations/20261116120000_daylog_schema.sql`.
2. **VAPID keys:** `npx web-push generate-vapid-keys`. Keep both values.
3. **Supabase CLI** (once):
   ```
   npx supabase login
   npx supabase link --project-ref spyuqfomqxcdyguxggxa
   ```
4. **Function secrets.** The private key lives only here:
   ```
   npx supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<you> DAYLOG_CRON_SECRET=<long random string>
   ```
5. **Deploy:** `npx supabase functions deploy daylog-push --no-verify-jwt`
   (the function checks `x-daylog-secret` itself).
6. **Vault**, in the SQL Editor:
   ```sql
   select vault.create_secret('https://spyuqfomqxcdyguxggxa.supabase.co', 'daylog_project_url');
   select vault.create_secret('<same DAYLOG_CRON_SECRET>', 'daylog_cron_secret');
   ```
7. **Apply** `supabase/migrations/20261116120100_daylog_cron.sql` (starts the cron job).
8. **Next.js / Vercel env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>` in
   `.env.local` and in Vercel (Production + Preview), then redeploy.

## Debugging

- `select * from notification_log order by created_at desc limit 20;`
- `select * from cron.job_run_details order by start_time desc limit 10;`
- `select * from net._http_response order by created desc limit 10;`, the
  function's HTTP replies
- Supabase dashboard → Edge Functions → daylog-push → Logs
