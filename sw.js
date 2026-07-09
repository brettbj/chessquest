// ChessQuest service worker — cache-first for full offline play.
const VERSION = "cq-v7";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./css/style.css",
  "./js/app.js", "./js/state.js", "./js/sounds.js", "./js/board.js",
  "./js/puzzles.js", "./js/bots.js", "./js/trainer.js", "./js/review.js",
  "./js/feedback.js", "./js/engine.js", "./js/engine-worker.js",
  "./js/vendor/chess.esm.js", "./js/sync.js", "./data/puzzles.js", "./data/openings.js",
  "./data/content.js", "./data/drills.js",
  "./assets/icon-192.png", "./assets/icon-512.png", "./assets/icon-180.png",
  ...["k", "q", "r", "b", "n", "p"].flatMap((p) => [`./assets/pieces/${p}l.svg`, `./assets/pieces/${p}d.svg`]),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(e.request).then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      })
    )
  );
});
