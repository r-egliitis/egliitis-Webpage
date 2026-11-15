// Day Log service worker (scope /os/). Shows pushes and opens the app at the
// right slot when one is tapped. It caches nothing: the app is online-only.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  // iOS revokes push permission if a push doesn't show a notification, so always show one.
  event.waitUntil(
    self.registration.showNotification(data.title || "Day Log", {
      body: data.body || "",
      // Same tag = a new ping replaces an unanswered one instead of piling up.
      tag: data.tag || "daylog",
      renotify: true,
      icon: "/daylog-icon-192.png",
      badge: "/daylog-icon-192.png",
      data: { url: data.url || "/os/daylog" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/os/daylog", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).pathname.startsWith("/os"));
      if (open) {
        await open.focus();
        try {
          await open.navigate(url);
        } catch {
          // Some platforms (notably iOS) refuse navigate(); the page handles this message.
          open.postMessage({ type: "daylog:navigate", url });
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
