/*
 * EstateFlow service worker.
 *
 * Strategy:
 *   - Navigations: network first, falling back to the cached app shell,
 *     then to the offline page. So a phone with no signal still opens
 *     the app instead of the browser's error screen.
 *   - Hashed build assets and icons: cache first (they never change
 *     under the same URL).
 *   - API calls (another origin) and anything non-GET: never touched.
 *     Stale visit/visitor data would be dangerous, so the app always
 *     talks to the API live and shows its own inline error state.
 */

const CACHE_NAME = "estateflow-shell-v2";
const OUTBOX_SYNC_TAG = "estateflow-outbox";

const SHELL_FILES = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.webmanifest",
    "/favicon.svg",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("push", (event) => {
    const data = event.data ? (() => {
        try {
            return event.data.json();
        } catch {
            return { body: event.data.text() || "A visitor is waiting at the estate gate." };
        }
    })() : {};
    event.waitUntil(self.registration.showNotification(data.title || "EstateFlow", {
        body: data.body || "A visitor is waiting at the estate gate.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: data.url || "/resident/visits" },
        tag: "estateflow-visitor-request",
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = new URL(event.notification.data?.url || "/resident/visits", self.location.origin).href;
    event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
        for (const client of clients) {
            if ("focus" in client) {
                await client.navigate(targetUrl);
                return client.focus();
            }
        }
        return self.clients.openWindow(targetUrl);
    }));
});

self.addEventListener("sync", (event) => {
    if (event.tag !== OUTBOX_SYNC_TAG) return;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                client.postMessage({ type: "ESTATEFLOW_SYNC_REQUEST" });
            }
        }),
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // API lives on its own origin; never cache it.
    if (url.origin !== self.location.origin) {
        return;
    }

    if (url.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put("/index.html", copy));

                    return response;
                })
                .catch(async () => {
                    const cached =
                        (await caches.match(request)) ||
                        (await caches.match("/index.html"));

                    return cached || caches.match("/offline.html");
                })
        );

        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request)
                .then((response) => {
                    const isCacheable =
                        response.ok &&
                        (url.pathname.startsWith("/assets/") ||
                            url.pathname.startsWith("/icons/"));

                    if (isCacheable) {
                        const copy = response.clone();

                        caches
                            .open(CACHE_NAME)
                            .then((cache) => cache.put(request, copy));
                    }

                    return response;
                })
                .catch(() => cached);
        })
    );
});
