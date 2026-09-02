// RipLab service worker — enables "install" + offline play.
// Bump CACHE_NAME whenever you change any cached file so clients pick up the update.
var CACHE_NAME = "riplab-v26";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./rlfl-data.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./images/qb-chrome.jpg",
  "./images/qb-justin-hayes.jpg",
  "./images/qb-justin-hayes-refractor.jpg",
  "./images/qb-justin-hayes-refractor-auto.jpg",
  "./images/qb-justin-hayes-green.jpg",
  "./images/qb-justin-hayes-green-auto.jpg",
  "./images/qb-justin-hayes-blue.jpg",
  "./images/qb-justin-hayes-blue-auto.jpg",
  "./images/qb-justin-hayes-orange.jpg",
  "./images/qb-justin-hayes-orange-auto.jpg",
  "./images/qb-justin-hayes-gold.jpg",
  "./images/qb-justin-hayes-gold-auto.jpg",
  "./images/qb-justin-hayes-red.jpg",
  "./images/qb-justin-hayes-red-auto.jpg",
  "./images/qb-justin-hayes-black.jpg",
  "./images/qb-justin-hayes-black-auto.jpg",
  "./images/qb-justin-hayes-superfractor.jpg",
  "./images/qb-justin-hayes-superfractor-auto.jpg",
  "./images/qb-justin-hayes-base-auto.jpg",
  "./images/qb-justin-hayes-case-hit.jpg",
  "./images/qb-omar-nichols.jpg",
  "./images/qb-omar-nichols-refractor.jpg",
  "./images/qb-omar-nichols-refractor-auto.jpg",
  "./images/qb-omar-nichols-green.jpg",
  "./images/qb-omar-nichols-green-auto.jpg",
  "./images/qb-omar-nichols-blue.jpg",
  "./images/qb-omar-nichols-blue-auto.jpg",
  "./images/qb-omar-nichols-orange.jpg",
  "./images/qb-omar-nichols-orange-auto.jpg",
  "./images/qb-omar-nichols-gold.jpg",
  "./images/qb-omar-nichols-gold-auto.jpg",
  "./images/qb-omar-nichols-red.jpg",
  "./images/qb-omar-nichols-red-auto.jpg",
  "./images/qb-omar-nichols-black.jpg",
  "./images/qb-omar-nichols-black-auto.jpg",
  "./images/qb-omar-nichols-superfractor.jpg",
  "./images/qb-omar-nichols-superfractor-auto.jpg",
  "./images/qb-omar-nichols-base-auto.jpg",
  "./images/qb-omar-nichols-case-hit.jpg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Cache-first for the app's own files, network for everything else (e.g. Google Fonts),
// falling back to cache if the network is unavailable.
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  var isOwnFile = url.origin === self.location.origin;

  if (isOwnFile) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          return res;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(req).catch(function () { return caches.match(req); })
    );
  }
});
