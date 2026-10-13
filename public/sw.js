// Self-unregistering service worker to clean up stale service workers on localhost
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        return caches.keys().then((keys) => {
          return Promise.all(keys.map((key) => caches.delete(key)));
        });
      })
  );
});