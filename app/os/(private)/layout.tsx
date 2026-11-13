import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

// Every /os page except /os/login lives in this (private) group.
// proxy.ts already redirects signed-out visitors; this is the second check,
// done server-side against the Supabase Auth server.
export default function PrivateLayout({ children }: LayoutProps<"/os">) {
  return (
    <Suspense fallback={null}>
      <RequireUser>{children}</RequireUser>
    </Suspense>
  );
}

async function RequireUser({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/os/login");
  return children;
}
