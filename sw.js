// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Service Worker v44 (with OneSignal Push)
// Combines: PWA offline cache + OneSignal push notifications
// ════════════════════════════════════════════════════════════════

// Import OneSignal's service worker — handles push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE = 'fitflow-v54';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/data-cali.js',
  './js/app.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/running.js',
  './js/admin.js',
  './push.js',
  './js/custom-workouts.js',
  './js/weekly-report.js',
  './manifest.json',
  './privacy.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL ───────────────────────────────────────────────────────
// NOTE: No skipWaiting() — combined with clients.claim() it was causing forced
// reloads on every page load. SW now waits until all tabs are closed before taking over.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────────
// NOTE: No clients.claim() — claiming immediately after SW update caused all
// open tabs to reload, which is the unwanted refresh users were experiencing.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// ── FETCH ─────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Never intercept Google Apps Script API calls — pass through to network
  // Intercepting these causes login failures and "offline" errors
  if (e.request.url.includes('script.google.com')) return;

  // Never intercept Google accounts / OAuth calls
  if (e.request.url.includes('accounts.google.com')) return;

  // Never intercept any googleapis
  if (e.request.url.includes('googleapis.com')) return;

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
