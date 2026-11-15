import Link from "next/link";
import { PushSetup } from "@/components/daylog/push-setup";

// Install on iPhone + turn on notifications for this device.
export default function DaylogSetupPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
        ← Day Log
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Setup</h1>
      <p className="mt-2 text-muted">Day Log pings your phone every 20 minutes on the days you schedule.</p>
      <div className="mt-8">
        <PushSetup />
      </div>
      <section aria-label="How it works" className="mt-8 space-y-2 text-sm text-muted">
        <p>
          <span className="text-fg">00:01</span> on a scheduled day: a reminder that it&apos;s a Day Log day.
        </p>
        <p>
          <span className="text-fg">07:00</span>: one more reminder if you haven&apos;t written anything yet.
        </p>
        <p>
          <span className="text-fg">Every :00, :20 and :40</span> after your first entry: &ldquo;What did you do?&rdquo;
        </p>
        <p>
          <span className="text-fg">04:00</span> the next morning: the day ends on its own if you forgot to end it.
        </p>
      </section>
    </div>
  );
}
