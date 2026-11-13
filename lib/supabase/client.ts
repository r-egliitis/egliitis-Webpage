import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Supabase client for Client Components. Uses the publishable key only.
// The /os app does all data access on the server; this is kept for auth-only use.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
