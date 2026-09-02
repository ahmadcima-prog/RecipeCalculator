// Recipe Calculator - offline cache
const CACHE = "recipes-v202609021707"; // version is auto-bumped by build_calculator.py

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            // Cache core files individually so ONE missing asset can never
            // block installation of the whole app.
            return Promise.all(
                ["./", "index.html", "manifest.webmanifest",
                 "icon-192.png", "icon-512.png"].map(function (url) {
                    return cache.add(url).catch(function () {});
                })
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE; })
                    .map(function (k) { return caches.delete(k); })
            );
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") { return; }

    // Pages (HTML): NETWORK-FIRST so the app always gets the newest version
    // when online; the cached copy is used only when offline.
    if (event.request.mode === "navigate"
            || (event.request.headers.get("accept") || "").indexOf("text/html") !== -1) {
        event.respondWith(
            fetch(event.request).then(function (response) {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then(function (cache) {
                        cache.put(event.request, copy);
                    });
                }
                return response;
            }).catch(function () {
                return caches.match(event.request).then(function (cached) {
                    return cached || caches.match("./");
                });
            })
        );
        return;
    }

    // Everything else (icons, manifest): cache-first.
    event.respondWith(
        caches.match(event.request).then(function (cached) {
            if (cached) { return cached; }
            return fetch(event.request).then(function (response) {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then(function (cache) {
                        cache.put(event.request, copy);
                    });
                }
                return response;
            }).catch(function () {
                return caches.match("./");
            });
        })
    );
});
