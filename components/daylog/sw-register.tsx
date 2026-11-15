"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { savePushSubscription } from "@/app/os/(private)/actions/daylog";
import { currentSubscription, pushSupported, registerServiceWorker, serialize } from "@/lib/daylog/push-client";

// Mounted in the /os shell. Registers the service worker, re-saves this
// device's push subscription on every open (subscriptions can rotate), and
// follows "open this slot" messages from a tapped notification.
export function SwRegister() {
  const router = useRouter();

  useEffect(() => {
    if (!pushSupported()) return;
    let cancelled = false;

    registerServiceWorker()
      .then(async () => {
        if (cancelled || Notification.permission !== "granted") return;
        const subscription = await currentSubscription();
        if (subscription) await savePushSubscription(serialize(subscription));
      })
      .catch((error) => console.warn("Day Log service worker:", error));

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "daylog:navigate" || !data.url) return;
      const url = new URL(data.url, window.location.origin);
      if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [router]);

  return null;
}
