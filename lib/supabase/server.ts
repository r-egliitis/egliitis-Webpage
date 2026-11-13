import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Create a new one per request; never share it between requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. That's fine: proxy.ts
            // refreshes the session on every /os request.
          }
        },
      },
    },
  );
}

// The signed-in user, verified with the Supabase Auth server (not just read
// from the cookie). Deduped per request, so the layout and page share one call.
export const getUser = cache(async () => {
  // Auth is per request, and Supabase reads the clock (Date.now()) to check
  // token expiry, so keep this out of prerendering entirely.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
});
