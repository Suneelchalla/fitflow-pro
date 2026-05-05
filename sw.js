// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Service Worker v43
// Updated for PWABuilder / Play Store compatibility
// ════════════════════════════════════════════════════════════════

const CACHE = 'fitflow-v43';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js?v=43',
  './js/data-cali.js?v=43',
  './js/app.js?v=43',
  './js/auth.js?v=43',
  './js/dashboard.js?v=43',
  './js/running.js?v=43',
  './js/admin.js?v=43',
  './push.js?v=43',
  './js/custom-workouts.js?v=43',
  './js/weekly-report.js?v=43',
  './manifest.json',
  './privacy.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL ───────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Don't cache Google Apps Script API calls — always fetch fresh
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response(
      JSON.stringify({ success: false, error: 'You are offline.' }),
      { headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'FitFlow Pro 💪', body: "Time for your workout! Let's go!" };
  try {
    if (e.data) data = e.data.json();
  } catch {
    if (e.data) data.body = e.data.text();
  }

  const options = {
    body:     data.body    || "Time for your workout! Let's go!",
    tag:      data.tag     || 'fitflow-daily',
    renotify: true,
    vibrate:  [200, 100, 200],
    data:     { url: '/' },
    actions:  [
      { action: 'open',    title: "Let's Go! 💪" },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'FitFlow Pro 💪', options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
