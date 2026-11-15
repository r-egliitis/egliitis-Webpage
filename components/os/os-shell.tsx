import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { OsSidebarNav, OsTabBar } from "@/components/os/os-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SwRegister } from "@/components/daylog/sw-register";

function OsLogo() {
  return (
    // /os, not /: inside the installed app, / would leave its scope.
    <Link href="/os" className="flex items-center gap-2" aria-label="egliitis OS home">
      <Image src="/joker.png" alt="" width={22} height={22} />
      <span className="font-bold tracking-tight">egliitis</span>
      <span className="font-mono text-xs text-muted">/os</span>
    </Link>
  );
}

// Phone: slim top bar + bottom tab bar. Desktop (md+): left sidebar.
export function OsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <div className="px-3">
          <OsLogo />
        </div>
        <OsSidebarNav />
        <div className="mt-auto px-3">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Safe-area padding: the installed app draws under the iPhone status bar. */}
        <div className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-line bg-surface/80 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <OsLogo />
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 md:px-10 md:py-10">
          {children}
        </div>
      </div>

      <OsTabBar />
      <SwRegister />
    </div>
  );
}
