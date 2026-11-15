# daylog-push

Sends Day Log notifications. `daylog_tick()` (SQL, every minute via pg_cron)
decides what is due and queues it in `notification_log`; `daylog_dispatch()`
wakes this function only when something is pending. The function checks the
caller's secret against Vault, claims the rows, sends them with Web Push
(`webpush.ts`, RFC 8291 + 8292, no dependencies), marks them sent/failed, and
deletes subscriptions that answer 404/410.

## One-time setup (in this order)

1. **Apply** `supabase/migrations/20261116120000_daylog_schema.sql`.
2. **VAPID keys:** `npx web-push generate-vapid-keys`.
3. **Deploy** the function with JWT verification **off** (it checks the Vault
   secret itself): `npx supabase functions deploy daylog-push --no-verify-jwt`.
4. **Function secrets** (Dashboard → Edge Functions → Secrets):
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Optional `VAPID_SUBJECT`
   (`mailto:` or `https:`; defaults to `https://egliitis.id.lv`).
5. **Vault**, in the SQL Editor. The cron secret is generated in the
   database and never leaves it:
   ```sql
   select vault.create_secret('https://spyuqfomqxcdyguxggxa.supabase.co', 'daylog_project_url');
   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'daylog_cron_secret');
   ```
6. **Apply** `supabase/migrations/20261116120100_daylog_cron.sql` (starts the cron job).
7. **Next.js / Vercel env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>` in
   `.env.local` and in Vercel (Production + Preview), then redeploy.

## Debugging

- `select * from notification_log order by created_at desc limit 20;`
- `select * from cron.job_run_details order by start_time desc limit 10;`
- `select * from net._http_response order by created desc limit 10;`, the
  function's HTTP replies
- Supabase dashboard → Edge Functions → daylog-push → Logs
