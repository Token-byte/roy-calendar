const CACHE = 'roy-cal-v2.3.3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'year.js', 'parse-he.js', 'cats-auto.js', 'sync-keep.js', 'wrap.js', 'voice.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
  'apple-touch-icon-v3.png', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function isDocument(req, url){
  if (req.mode === 'navigate') return true;
  const path = url.pathname;
  return path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('/roy-calendar');
}
function isTouchIcon(url){
  return /apple-touch-icon/i.test(url.pathname);
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;
  // HTML and the home-screen icon always come from the network first, so Safari
  // does not keep a stale page or an old icon when adding to the home screen.
  if (isDocument(e.request, url) || isTouchIcon(url)){
    e.respondWith(fetch(e.request).then(r => {
      if (r && r.ok){
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return r;
    }).catch(async () => {
      const c = await caches.open(CACHE);
      return (await c.match(e.request)) || (isDocument(e.request, url) ? c.match('index.html') : undefined);
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || undefined;
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const k = e.notification.data && e.notification.data.k;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list){ if ('focus' in c){ if (k) c.postMessage({ k }); return c.focus(); } }
    return self.clients.openWindow(k ? './?d=' + k : './');
  }));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch(_){ d = { title: 'יומן', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'יומן', { body: d.body || '', icon: 'icons/icon-192.png', data: { k: d.k } }));
});
