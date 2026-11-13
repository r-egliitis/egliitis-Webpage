import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { OsSidebarNav, OsTabBar } from "@/components/os/os-nav";
import { ThemeToggle } from "@/components/theme-toggle";

function OsLogo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="egliitis home">
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
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface/80 px-5 backdrop-blur-md md:hidden">
          <OsLogo />
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 md:px-10 md:py-10">
          {children}
        </div>
      </div>

      <OsTabBar />
    </div>
  );
}
