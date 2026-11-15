"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/os/(private)/actions/daylog";
import {
  currentSubscription,
  isIos,
  isStandalone,
  pushSupported,
  serialize,
  subscribe,
  VAPID_PUBLIC_KEY,
} from "@/lib/daylog/push-client";

type State =
  | { kind: "loading" }
  | { kind: "install" } // iPhone in a Safari tab: push needs the Home Screen app
  | { kind: "unsupported" }
  | { kind: "no-key" }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string };

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-5 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm transition-colors hover:border-fg disabled:opacity-50";

async function detect(): Promise<State> {
  if (isIos() && !isStandalone()) return { kind: "install" };
  if (!pushSupported()) return { kind: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { kind: "no-key" };
  if (Notification.permission === "denied") return { kind: "denied" };
  const subscription = Notification.permission === "granted" ? await currentSubscription() : null;
  return subscription ? { kind: "on", endpoint: subscription.endpoint } : { kind: "off" };
}

export function PushSetup() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    detect().then(setState, () => setState({ kind: "unsupported" }));
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const subscription = await subscribe(); // permission prompt: must come from this tap
        const result = await savePushSubscription(serialize(subscription));
        if (!result.ok) return setMessage(result.error);
        setState({ kind: "on", endpoint: subscription.endpoint });
      } catch (error) {
        if (error instanceof Error && error.message === "denied") setState({ kind: "denied" });
        else setMessage("Notifications weren't turned on. Try again.");
      }
    });
  }

  function disable(endpoint: string) {
    setMessage(null);
    startTransition(async () => {
      const subscription = await currentSubscription();
      await subscription?.unsubscribe();
      await deletePushSubscription(endpoint);
      setState({ kind: "off" });
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.ok ? "Sent. Lock your phone: it should arrive within a few seconds." : result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-line p-5">
      <h2 className="font-medium">Notifications</h2>

      {state.kind === "loading" && <p className="mt-2 text-sm text-muted">Checking this device…</p>}

      {state.kind === "install" && (
        <div className="mt-2 text-sm">
          <p className="text-muted">On iPhone, notifications only work in the Home Screen app:</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>
              Tap <strong>Share</strong> (the square with an arrow) in Safari.
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </li>
            <li>
              Open <strong>Day Log</strong> from your Home Screen and sign in there.
            </li>
            <li>Come back to this page in the app and turn notifications on.</li>
          </ol>
        </div>
      )}

      {state.kind === "unsupported" && (
        <p className="mt-2 text-sm text-muted">This browser can&apos;t receive push notifications. Use the Day Log app on your iPhone (iOS 16.4 or later).</p>
      )}

      {state.kind === "no-key" && (
        <p className="mt-2 text-sm text-muted">
          Push isn&apos;t configured yet: <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> is missing.
        </p>
      )}

      {state.kind === "denied" && (
        <p className="mt-2 text-sm text-muted">
          Notifications are blocked for Day Log. Allow them in Settings → Notifications → Day Log, then reopen this page.
        </p>
      )}

      {state.kind === "off" && (
        <>
          <p className="mt-2 text-sm text-muted">Get the 00:01 notice, the morning reminder and a ping every 20 minutes on tracked days.</p>
          <button type="button" onClick={enable} disabled={pending} className={`mt-4 ${buttonClass}`}>
            {pending ? "Turning on…" : "Enable notifications"}
          </button>
        </>
      )}

      {state.kind === "on" && (
        <>
          <p className="mt-2 text-sm text-muted">On for this device.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={test} disabled={pending} className={buttonClass}>
              Send test
            </button>
            <button type="button" onClick={() => disable(state.endpoint)} disabled={pending} className={secondaryButton}>
              Turn off on this device
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
