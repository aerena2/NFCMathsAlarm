
const CACHE_NAME = "nfc-maths-alarm-v4";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./sound/alarm.mp3"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("nfc-maths-alarm-") &&
                              name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const isAppFile =
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css");

  if (request.mode === "navigate" || isAppFile) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, copy)
            );
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          return caches.match("./index.html");
        })
    );

    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request)
    )
  );
});
