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
// NOTE: Push event handling is done entirely by OneSignal's SDK imported above
// via importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js').
// DO NOT add manual 'push' or 'notificationclick' listeners here —
// they conflict with OneSignal's handlers and cause notifications to be
// silently swallowed or fail to display.
//
// The custom push/notificationclick handlers that were here previously were
// redundant (OneSignal already handles display + click routing) and caused
// the following issues:
//   1. Double-registration of the same event — one handler cancels the other
//   2. OneSignal's internal state gets out of sync with the displayed notification
//   3. Click routing to '/' fails because OneSignal's handler fires first and
//      the manual one throws an error trying to fire after
