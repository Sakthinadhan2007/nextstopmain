const CACHE_VERSION = "stopmate-v3";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/alarm.mp3"];
const TRACKING_NOTIF_TAG = "erangu-tracking";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// ── Message handler ────────────────────────────────────────────────────────
// Main app sends SHOW_TRACKING when alarm is armed to post a sticky notification.
// This keeps the browser process alive on Android even when the screen dims.
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SHOW_TRACKING") {
    const { title, body } = event.data;
    self.registration.showNotification(title || "ERANGU — Tracking Active", {
      body: body || "Location monitoring is running. You will be alerted near your stop.",
      tag: TRACKING_NOTIF_TAG,
      renotify: false,
      silent: true,
      requireInteraction: true,
      icon: "/icon.svg",
      badge: "/icon.svg",
      actions: [{ action: "open", title: "Open App" }]
    });
    return;
  }

  if (event.data.type === "DISMISS_TRACKING") {
    self.registration.getNotifications({ tag: TRACKING_NOTIF_TAG }).then((notifs) => {
      notifs.forEach((n) => n.close());
    });
    return;
  }
});

// Tap on the tracking notification → focus or open the app tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

// ── Network strategies ─────────────────────────────────────────────────────

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      return response;
    }
    if (request.mode === "navigate") {
      const fallback = await cache.match("/index.html");
      if (fallback) return fallback;
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match("/index.html");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cache.match("/index.html");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isApi = url.origin === self.location.origin && url.pathname.startsWith("/api");
  const isDocument = request.mode === "navigate";

  if (isApi || isDocument) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
