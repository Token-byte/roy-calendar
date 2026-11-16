const CACHE = 'roy-cal-v2.0.0';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin){
    // stale-while-revalidate for the app shell
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || c.match('index.html');
    }));
  }
  // Google APIs / sign-in: always network, never cached
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const k = e.notification.data && e.notification.data.k;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list){ if ('focus' in c){ if (k) c.postMessage({ k }); return c.focus(); } }
    return self.clients.openWindow(k ? './?view=day&d=' + k : './');
  }));
});
// Ready for server push (phase 2): payload {title, body, k}
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch(_){ d = { title: 'יומן', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'יומן', { body: d.body || '', icon: 'icons/icon-192.png', data: { k: d.k } }));
});
