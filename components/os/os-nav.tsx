"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectsIcon, TasksIcon, TodayIcon } from "@/components/os/os-icons";
import { cn } from "@/lib/utils";

const items = [
  { href: "/os", label: "Today", Icon: TodayIcon, match: (path: string) => path === "/os" },
  { href: "/os/tasks", label: "Tasks", Icon: TasksIcon, match: (path: string) => path.startsWith("/os/tasks") },
  {
    href: "/os/projects",
    label: "Projects",
    Icon: ProjectsIcon,
    match: (path: string) => path.startsWith("/os/projects"),
  },
] as const;

/** Desktop: vertical list in the sidebar. */
export function OsSidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="OS" className="mt-10 flex flex-col gap-1">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-colors",
              active ? "bg-fg/[0.07] font-medium text-fg" : "text-muted hover:bg-fg/[0.04] hover:text-fg",
            )}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone: tab bar fixed to the bottom, clear of the home indicator. */
export function OsTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="OS"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <Icon />
                {label}
                <span
                  aria-hidden
                  className={cn("h-0.5 w-5 rounded-full", active ? "bg-accent" : "bg-transparent")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
