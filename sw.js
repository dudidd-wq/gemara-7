/* Service worker: עבודה בלי אינטרנט. נוצר על ידי tools/build-sw.py – VERSION משתנה בכל שינוי תוכן. */
'use strict';
var VERSION = 'g7-010f7fd3f0';
// קריינות: לא בהתקנה – נשמרת במטמון נפרד בפעם הראשונה שמשמיעים קטע
var AUDIO = 'g7-audio-v1';
var FILES = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/style.css",
 "js/util.js",
 "js/store.js",
 "js/quiz.js",
 "js/iyun.js",
 "js/beki.js",
 "js/app.js",
 "data/bm76.json",
 "data/taanit.json",
 "data/taanit_text.json",
 "data/audio.json",
 "fonts/Rubik-Hebrew.woff2",
 "fonts/FrankRuhlLibre-Hebrew.woff2",
 "icons/icon.svg",
 "icons/icon-192.png",
 "icons/icon-512.png"
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION && k !== AUDIO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function rangeResponse(req, res) {
  var m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  return res.arrayBuffer().then(function (buf) {
    var size = buf.byteLength, start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    if (!m[1] && m[2]) { start = Math.max(0, size - +m[2]); end = size - 1; }
    return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/data\/[^/]+\.json$/.test(url.pathname)) { // רשת קודם (תוכן מעודכן), ואם אין – מהמטמון
    e.respondWith(fetch(req).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); } return r; })
      .catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  if (/\/audio\//.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then(function (c) {
      return c.match(req.url, { ignoreSearch: true }).then(function (hit) {
        if (hit) return req.headers.has('range') ? rangeResponse(req, hit) : hit;
        return fetch(req.url).then(function (r) {
          if (!r.ok) return r;
          return c.put(req.url, r.clone()).then(function () { return req.headers.has('range') ? rangeResponse(req, r) : r; });
        }).catch(function () { return fetch(req); });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(function (hit) {
    return hit || fetch(req).catch(function () { return caches.match('index.html'); });
  }));
});
