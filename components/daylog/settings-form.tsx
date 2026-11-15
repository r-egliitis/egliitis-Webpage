"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { saveSettings } from "@/app/os/(private)/actions/daylog";
import { fieldClass, labelClass } from "@/components/os/sheet";
import { Segmented } from "@/components/os/task-sheet";
import { cn } from "@/lib/utils";
import type { DaylogSettings } from "@/types/database";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-6 first:pt-0 last:border-b-0">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function NumberSelect({ label, value, options, suffix, onChange }: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={cn(fieldClass, "normal-case tracking-normal")}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option} {suffix}
          </option>
        ))}
      </select>
    </label>
  );
}

const hhmm = (time: string | null) => (time ? time.slice(0, 5) : "");

export function SettingsForm({ initial }: { initial: DaylogSettings }) {
  const [settings, setSettings] = useState<DaylogSettings>({
    ...initial,
    morning_reminder_time: hhmm(initial.morning_reminder_time) || null,
    auto_end_time: hhmm(initial.auto_end_time),
  });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof DaylogSettings>(key: K, value: DaylogSettings[K]) => {
    setMessage(null);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveSettings(settings);
      setMessage(result.ok ? { text: "Saved. These apply from the next day you start.", error: false } : { text: result.error, error: true });
    });
  }

  return (
    <form onSubmit={submit}>
      <Section title="Rhythm" hint="How often you're asked, aligned to the clock.">
        <Segmented
          label="Interval"
          value={settings.interval_minutes}
          onChange={(value) => set("interval_minutes", value)}
          options={[15, 20, 30, 60].map((minutes) => ({ value: minutes as DaylogSettings["interval_minutes"], label: `${minutes} min` }))}
        />
        <Segmented
          label="One entry for several slots"
          value={settings.multi_slot_entries ? "on" : "off"}
          onChange={(value) => set("multi_slot_entries", value === "on")}
          options={[
            { value: "on", label: "Allowed" },
            { value: "off", label: "One slot each" },
          ]}
        />
      </Section>

      <Section title="Missed slots" hint="What happens to a slot you didn't answer.">
        <Segmented
          label="Gaps"
          value={settings.missed_slot_mode}
          onChange={(value) => set("missed_slot_mode", value)}
          options={[
            { value: "backfill", label: "Fill in anytime" },
            { value: "lock", label: "Lock later" },
            { value: "skip", label: "Mark skipped" },
          ]}
        />
        {settings.missed_slot_mode === "lock" && (
          <NumberSelect
            label="Lock a gap after"
            value={settings.lock_after_slots}
            options={[1, 2, 3, 4, 6, 8, 12]}
            suffix="more slots"
            onChange={(value) => set("lock_after_slots", value)}
          />
        )}
        {settings.missed_slot_mode === "skip" && (
          <p className="text-sm text-muted">A gap still empty once the next slot has ended is marked Skipped and can&apos;t be filled in.</p>
        )}
      </Section>

      <Section title="Tags">
        <Segmented
          label="When to tag"
          value={settings.tagging_mode}
          onChange={(value) => set("tagging_mode", value)}
          options={[
            { value: "off", label: "Off" },
            { value: "while_writing", label: "Writing" },
            { value: "review", label: "Review" },
            { value: "both", label: "Both" },
          ]}
        />
      </Section>

      <Section title="Pause" hint="Stops the pings; on resume you write one entry for the paused time.">
        <Segmented
          label="Pause"
          value={settings.pause_mode}
          onChange={(value) => set("pause_mode", value)}
          options={[
            { value: "off", label: "Off" },
            { value: "button", label: "Button" },
            { value: "timer", label: "With timer" },
          ]}
        />
        {settings.pause_mode === "timer" && (
          <NumberSelect
            label="Resume after"
            value={settings.pause_timer_minutes}
            options={[15, 30, 45, 60, 90, 120, 180, 240]}
            suffix="minutes"
            onChange={(value) => set("pause_timer_minutes", value)}
          />
        )}
      </Section>

      <Section title="Unanswered pings">
        <Segmented
          label="If I don't answer"
          value={settings.unanswered_ping_mode}
          onChange={(value) => set("unanswered_ping_mode", value)}
          options={[
            { value: "always", label: "Keep pinging" },
            { value: "quiet_after", label: "Go quiet" },
          ]}
        />
        {settings.unanswered_ping_mode === "quiet_after" && (
          <NumberSelect
            label="Go quiet after"
            value={settings.quiet_after_unanswered}
            options={[1, 2, 3, 4, 5, 6, 8, 10]}
            suffix="unanswered pings"
            onChange={(value) => set("quiet_after_unanswered", value)}
          />
        )}
      </Section>

      <Section title="Day" hint="When a scheduled day reminds you, and when it ends on its own.">
        <Segmented
          label="00:01 notice"
          value={settings.midnight_notice ? "on" : "off"}
          onChange={(value) => set("midnight_notice", value === "on")}
          options={[
            { value: "on", label: "On" },
            { value: "off", label: "Off" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Morning reminder
            <input
              type="time"
              value={settings.morning_reminder_time ?? ""}
              onChange={(event) => set("morning_reminder_time", event.target.value || null)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Day ends at
            <input
              type="time"
              required
              max="12:00"
              value={settings.auto_end_time}
              onChange={(event) => set("auto_end_time", event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <p className="text-xs text-muted">Clear the morning reminder to turn it off. The day ends the next morning at that time.</p>
      </Section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur-md md:bottom-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {message && (
          <p role="status" className="text-sm">
            {message.error && <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
