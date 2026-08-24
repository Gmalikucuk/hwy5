/*
 * Keeps the app on the phone so it opens with no signal at all.
 *
 * The version below is the whole trick: change it whenever the app changes,
 * and every phone picks up the new one on its next load. Leave it unchanged
 * and phones will happily run last week's app for ever, which is the classic
 * way this goes wrong.
 */
var VERSION = 'hwy5-2026-08-24-rate-fields';
var SHELL = ['/', '/index.html', '/manifest.json', '/icon180.png', '/icon512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Anything going to Apps Script must never be cached: it is the live data,
  // and a cached answer would be a lie. Offline, it fails and the app queues.
  if (url.hostname.indexOf('script.google') > -1) return;
  if (e.request.method !== 'GET') return;

  // The app itself: serve from the phone first so it opens instantly and
  // without signal, then quietly refresh the copy for next time.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var live = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || live;
    })
  );
});
