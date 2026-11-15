import Link from "next/link";
import { Suspense } from "react";
import { SettingsForm } from "@/components/daylog/settings-form";
import { TagManager } from "@/components/daylog/tag-manager";
import { ListSkeleton } from "@/components/os/skeletons";
import { getDaylogSettings, getTags } from "@/lib/daylog/queries";

export default function DaylogSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl pb-24 md:pb-0">
      <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
        ← Day Log
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
      <p className="mt-2 text-muted">Changes apply from the next day you start; a running day keeps its settings.</p>
      <Suspense fallback={<div className="mt-8"><ListSkeleton /></div>}>
        <SettingsData />
      </Suspense>
    </div>
  );
}

async function SettingsData() {
  const [settings, tags] = await Promise.all([getDaylogSettings(), getTags()]);
  return (
    <>
      <div className="mt-8 rounded-2xl border border-line p-5">
        <SettingsForm initial={settings} />
      </div>
      <section aria-label="Tags" className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Your tags</h2>
        <div className="mt-3 rounded-2xl border border-line px-5 py-2">
          <TagManager tags={tags} />
        </div>
      </section>
    </>
  );
}
