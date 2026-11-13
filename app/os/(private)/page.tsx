import { Suspense } from "react";
import { Container } from "@/components/container";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "../actions";

// The static parts render instantly; only the per-user email streams in.
export default function OsDashboard() {
  return (
    <Container className="py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">/os</p>
      <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.75rem)] font-bold leading-[1.02] tracking-tight">
        Hi Roberts
      </h1>
      <p className="mt-6 min-h-[1.5em] font-mono text-muted">
        <Suspense fallback={null}>
          <UserEmail />
        </Suspense>
      </p>
      <form action={signOut} className="mt-10">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 py-3 text-[0.9375rem] font-medium text-fg transition-[box-shadow,border-color] duration-300 hover:border-fg hover:shadow-[0_0_24px_var(--glow-soft)]"
        >
          Sign out
        </button>
      </form>
    </Container>
  );
}

async function UserEmail() {
  // The (private) layout has already verified the user; this reuses that call.
  const user = await getUser();
  return user?.email;
}
