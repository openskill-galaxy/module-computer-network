const scope = new URL(self.registration.scope);
const slug = scope.pathname.split("/").filter(Boolean).pop() || "portal";
const CACHE_PREFIX = `openskill-galaxy-${slug}-`;
const CACHE_NAME = "openskill-galaxy-module-v8".replace("-module-", `-${slug}-`) + "-" + "__BUILD_REVISION__";
const files = /* build:offline-files */ [];
const assetUrls = new Set(files.map((file) => new URL(file, scope).href));
const shellUrl = new URL("index.html", scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // One atomic batch keeps an interrupted release from replacing a working one.
    await cache.addAll([...assetUrls].map((url) => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const obsolete = keys.filter((key) => key !== CACHE_NAME && key.startsWith(CACHE_PREFIX) &&
      /^v\d+(?:-[a-f0-9]{16})?$/.test(key.slice(CACHE_PREFIX.length)));
    // An already-open tab may still import a chunk from the previous build.
    const previous = obsolete.filter((key) => /-[a-f0-9]{16}$/.test(key)).pop();
    await Promise.all(obsolete.filter((key) => key !== previous).map((key) => caches.delete(key)));
    if (previous) {
      const cache = await caches.open(previous);
      const requests = await cache.keys();
      await Promise.all(requests.filter((request) => !new URL(request.url).pathname
        .startsWith(scope.pathname + "assets/")).map((request) => cache.delete(request)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !files.length) return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  const isAppRoute = request.mode === "navigate" && !path.includes(".") &&
    (slug !== "portal" || /^(?:$|(?:modules|paths|about)(?:\/|$))/.test(path));

  const isChunk = path.startsWith("assets/");
  if (isAppRoute || isChunk || assetUrls.has(url.href)) {
    event.respondWith((async () => {
      const cached = await caches.match(isAppRoute ? shellUrl : request, { cacheName: CACHE_NAME });
      if (cached) return cached;
      if (isChunk) {
        const previous = (await caches.keys()).find((key) => key !== CACHE_NAME &&
          key.startsWith(CACHE_PREFIX) && /^v\d+-[a-f0-9]{16}$/.test(key.slice(CACHE_PREFIX.length)));
        if (previous) {
          const chunk = await caches.match(request, { cacheName: previous });
          if (chunk) return chunk;
        }
      }
      return fetch(request);
    })());
  }
});
