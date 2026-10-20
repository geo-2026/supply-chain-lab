/* 서비스 워커 — 앱 전체를 캐시해 인터넷 없이도 동작 */
const VERSION = 'scl-v1.2.0';
const FILES = [
  './', './index.html', './view.html', './manifest.webmanifest', './css/app.css',
  './js/data.js', './js/geo.js', './js/store.js', './js/map.js', './js/resources.js', './js/worksheet.js', './js/pdf.js', './js/main.js',
  './lib/localforage.min.js', './lib/html2canvas.min.js', './lib/jspdf.umd.min.js',
  './fonts/NotoSansKR-400.woff2', './fonts/NotoSansKR-700.woff2',
  './assets/world.json', './assets/icon-192.png', './assets/icon-512.png',
  ...[1, 2, 3, 4, 5, 6].flatMap(i => [`./assets/ads/ad${i}.png`, `./assets/ads/ad${i}_thumb.png`, `./assets/labels/label${i}.png`, `./assets/labels/label${i}_thumb.png`, `./assets/pdf/ad${i}.pdf`, `./assets/pdf/label${i}.pdf`]),
  ...[1, 2, 3, 4, 5, 6, 7].map(i => `./assets/va/va${i}.png`),
  './assets/pdf/value-added.pdf', './assets/pdf/raw-material-prices.xlsx', './assets/pdf/worksheet-original.pdf'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    // 큰 파일이 하나 실패해도 설치가 막히지 않도록 개별 추가
    await Promise.all(FILES.map(f => c.add(f).catch(err => console.warn('cache fail', f, err))));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res && res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
