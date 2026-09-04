// RipLab service worker — enables "install" + offline play.
// Bump CACHE_NAME whenever you change any cached file so clients pick up the update.
var CACHE_NAME = "riplab-v33";
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
  "./images/qb-omar-nichols-case-hit.jpg",
  "./images/qb-jalen-cross.jpg",
  "./images/qb-jalen-cross-refractor.jpg",
  "./images/qb-jalen-cross-refractor-auto.jpg",
  "./images/qb-jalen-cross-green.jpg",
  "./images/qb-jalen-cross-green-auto.jpg",
  "./images/qb-jalen-cross-blue.jpg",
  "./images/qb-jalen-cross-blue-auto.jpg",
  "./images/qb-jalen-cross-orange.jpg",
  "./images/qb-jalen-cross-orange-auto.jpg",
  "./images/qb-jalen-cross-gold.jpg",
  "./images/qb-jalen-cross-gold-auto.jpg",
  "./images/qb-jalen-cross-red.jpg",
  "./images/qb-jalen-cross-red-auto.jpg",
  "./images/qb-jalen-cross-black.jpg",
  "./images/qb-jalen-cross-black-auto.jpg",
  "./images/qb-jalen-cross-superfractor.jpg",
  "./images/qb-jalen-cross-superfractor-auto.jpg",
  "./images/qb-jalen-cross-base-auto.jpg",
  "./images/qb-jalen-cross-case-hit.jpg",
  "./images/qb-theo-mercer.jpg",
  "./images/qb-theo-mercer-refractor.jpg",
  "./images/qb-theo-mercer-refractor-auto.jpg",
  "./images/qb-theo-mercer-green.jpg",
  "./images/qb-theo-mercer-green-auto.jpg",
  "./images/qb-theo-mercer-blue.jpg",
  "./images/qb-theo-mercer-blue-auto.jpg",
  "./images/qb-theo-mercer-orange.jpg",
  "./images/qb-theo-mercer-orange-auto.jpg",
  "./images/qb-theo-mercer-gold.jpg",
  "./images/qb-theo-mercer-gold-auto.jpg",
  "./images/qb-theo-mercer-red.jpg",
  "./images/qb-theo-mercer-red-auto.jpg",
  "./images/qb-theo-mercer-black.jpg",
  "./images/qb-theo-mercer-black-auto.jpg",
  "./images/qb-theo-mercer-superfractor.jpg",
  "./images/qb-theo-mercer-superfractor-auto.jpg",
  "./images/qb-theo-mercer-base-auto.jpg",
  "./images/qb-theo-mercer-case-hit.jpg",
  "./images/qb-malcolm-price.jpg",
  "./images/qb-malcolm-price-refractor.jpg",
  "./images/qb-malcolm-price-refractor-auto.jpg",
  "./images/qb-malcolm-price-green.jpg",
  "./images/qb-malcolm-price-green-auto.jpg",
  "./images/qb-malcolm-price-blue.jpg",
  "./images/qb-malcolm-price-blue-auto.jpg",
  "./images/qb-malcolm-price-orange.jpg",
  "./images/qb-malcolm-price-orange-auto.jpg",
  "./images/qb-malcolm-price-gold.jpg",
  "./images/qb-malcolm-price-gold-auto.jpg",
  "./images/qb-malcolm-price-red.jpg",
  "./images/qb-malcolm-price-red-auto.jpg",
  "./images/qb-malcolm-price-black.jpg",
  "./images/qb-malcolm-price-black-auto.jpg",
  "./images/qb-malcolm-price-superfractor.jpg",
  "./images/qb-malcolm-price-superfractor-auto.jpg",
  "./images/qb-malcolm-price-base-auto.jpg",
  "./images/qb-malcolm-price-case-hit.jpg",
  "./images/qb-jett-jones.jpg",
  "./images/qb-jett-jones-refractor.jpg",
  "./images/qb-jett-jones-refractor-auto.jpg",
  "./images/qb-jett-jones-green.jpg",
  "./images/qb-jett-jones-green-auto.jpg",
  "./images/qb-jett-jones-blue.jpg",
  "./images/qb-jett-jones-blue-auto.jpg",
  "./images/qb-jett-jones-orange.jpg",
  "./images/qb-jett-jones-orange-auto.jpg",
  "./images/qb-jett-jones-gold.jpg",
  "./images/qb-jett-jones-gold-auto.jpg",
  "./images/qb-jett-jones-red.jpg",
  "./images/qb-jett-jones-red-auto.jpg",
  "./images/qb-jett-jones-black.jpg",
  "./images/qb-jett-jones-black-auto.jpg",
  "./images/qb-jett-jones-superfractor.jpg",
  "./images/qb-jett-jones-superfractor-auto.jpg",
  "./images/qb-jett-jones-base-auto.jpg",
  "./images/qb-jett-jones-case-hit.jpg",
  "./images/qb-cal-braddock.jpg",
  "./images/qb-cal-braddock-refractor.jpg",
  "./images/qb-cal-braddock-refractor-auto.jpg",
  "./images/qb-cal-braddock-green.jpg",
  "./images/qb-cal-braddock-green-auto.jpg",
  "./images/qb-cal-braddock-blue.jpg",
  "./images/qb-cal-braddock-blue-auto.jpg",
  "./images/qb-cal-braddock-orange.jpg",
  "./images/qb-cal-braddock-orange-auto.jpg",
  "./images/qb-cal-braddock-gold.jpg",
  "./images/qb-cal-braddock-gold-auto.jpg",
  "./images/qb-cal-braddock-red.jpg",
  "./images/qb-cal-braddock-red-auto.jpg",
  "./images/qb-cal-braddock-black.jpg",
  "./images/qb-cal-braddock-black-auto.jpg",
  "./images/qb-cal-braddock-superfractor.jpg",
  "./images/qb-cal-braddock-superfractor-auto.jpg",
  "./images/qb-cal-braddock-base-auto.jpg",
  "./images/qb-cal-braddock-case-hit.jpg",
  "./images/qb-malachi-naylor.jpg",
  "./images/qb-malachi-naylor-refractor.jpg",
  "./images/qb-malachi-naylor-refractor-auto.jpg",
  "./images/qb-malachi-naylor-green.jpg",
  "./images/qb-malachi-naylor-green-auto.jpg",
  "./images/qb-malachi-naylor-blue.jpg",
  "./images/qb-malachi-naylor-blue-auto.jpg",
  "./images/qb-malachi-naylor-orange.jpg",
  "./images/qb-malachi-naylor-orange-auto.jpg",
  "./images/qb-malachi-naylor-gold.jpg",
  "./images/qb-malachi-naylor-gold-auto.jpg",
  "./images/qb-malachi-naylor-red.jpg",
  "./images/qb-malachi-naylor-red-auto.jpg",
  "./images/qb-malachi-naylor-black.jpg",
  "./images/qb-malachi-naylor-black-auto.jpg",
  "./images/qb-malachi-naylor-superfractor.jpg",
  "./images/qb-malachi-naylor-superfractor-auto.jpg",
  "./images/qb-malachi-naylor-base-auto.jpg",
  "./images/qb-malachi-naylor-case-hit.jpg",
  "./images/qb-roman-ranson.jpg",
  "./images/qb-roman-ranson-refractor.jpg",
  "./images/qb-roman-ranson-refractor-auto.jpg",
  "./images/qb-roman-ranson-green.jpg",
  "./images/qb-roman-ranson-green-auto.jpg",
  "./images/qb-roman-ranson-blue.jpg",
  "./images/qb-roman-ranson-blue-auto.jpg",
  "./images/qb-roman-ranson-orange.jpg",
  "./images/qb-roman-ranson-orange-auto.jpg",
  "./images/qb-roman-ranson-gold.jpg",
  "./images/qb-roman-ranson-gold-auto.jpg",
  "./images/qb-roman-ranson-red.jpg",
  "./images/qb-roman-ranson-red-auto.jpg",
  "./images/qb-roman-ranson-black.jpg",
  "./images/qb-roman-ranson-black-auto.jpg",
  "./images/qb-roman-ranson-superfractor.jpg",
  "./images/qb-roman-ranson-superfractor-auto.jpg",
  "./images/qb-roman-ranson-base-auto.jpg",
  "./images/qb-roman-ranson-case-hit.jpg",
  "./images/qb-taylor-lease.jpg",
  "./images/qb-taylor-lease-refractor.jpg",
  "./images/qb-taylor-lease-refractor-auto.jpg",
  "./images/qb-taylor-lease-green.jpg",
  "./images/qb-taylor-lease-green-auto.jpg",
  "./images/qb-taylor-lease-blue.jpg",
  "./images/qb-taylor-lease-blue-auto.jpg",
  "./images/qb-taylor-lease-orange.jpg",
  "./images/qb-taylor-lease-orange-auto.jpg",
  "./images/qb-taylor-lease-gold.jpg",
  "./images/qb-taylor-lease-gold-auto.jpg",
  "./images/qb-taylor-lease-red.jpg",
  "./images/qb-taylor-lease-red-auto.jpg",
  "./images/qb-taylor-lease-black.jpg",
  "./images/qb-taylor-lease-black-auto.jpg",
  "./images/qb-taylor-lease-superfractor.jpg",
  "./images/qb-taylor-lease-superfractor-auto.jpg",
  "./images/qb-taylor-lease-base-auto.jpg",
  "./images/qb-taylor-lease-case-hit.jpg"
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
