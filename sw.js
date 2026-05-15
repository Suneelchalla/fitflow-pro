// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Service Worker (with OneSignal Push)
// Combines: PWA offline cache + OneSignal push notifications
// Cache version is the source of truth — see CACHE constant below.
// ════════════════════════════════════════════════════════════════

// Import OneSignal's service worker — handles push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE = 'fitflow-v118';
const ASSETS = [
  './',
  './index.html',
  './css/style.css?v=75',
  './js/data.js?v=78',
  './js/data-cali.js?v=75',
  './js/app.js?v=79',
  './js/auth.js?v=80',
  './js/dashboard.js?v=86',
  './js/running.js?v=90',
  './js/admin.js?v=80',
  './push.js?v=7',
  './js/custom-workouts.js?v=75',
  './js/weekly-report.js?v=77',
  './manifest.json',
  './privacy.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// ── INSTALL ───────────────────────────────────────────────────────
// skipWaiting() takes over immediately on update so users get the new code
// on next launch without needing to fully close every tab.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();  // take over immediately on update
});

// ── ACTIVATE ──────────────────────────────────────────────────────
// clients.claim() lets the fresh SW take control of all open tabs at activate
// time, so version bumps don't require a manual page reload to apply.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
    // ── KILL ORPHAN ACTIVITY NOTIFICATIONS on every SW activation ─────
    // When a fresh SW takes over (e.g. app update), any "live activity"
    // notification from the previous SW is by definition stale — the old
    // run's JS heap is gone, the timer is dead, no one is going to send
    // another ACTIVITY_UPDATE. Without this sweep the notification stays
    // pinned in the shade indefinitely (requireInteraction:true).
    .then(() => self.registration.getNotifications({ tag: ACTIVITY_NOTIF_TAG }))
    .then(notifs => notifs && notifs.forEach(n => { try { n.close(); } catch {} }))
    // Also sweep untagged "live" notifications from older SW versions whose
    // bodies look like activity stats (heuristic — older versions used
    // different tags or different titles).
    .then(() => self.registration.getNotifications())
    .then(notifs => notifs && notifs.forEach(n => {
      const blob = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
      if (
        /\bkm\b|\bpace\b|\bkcal\b|tap to open fitflow|km\/h/.test(blob) &&
        !/reminder|streak/i.test(blob)
      ) {
        try { n.close(); } catch {}
      }
    }))
    .then(() => self.clients.claim())  // take control of all open tabs immediately
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

  // Never cache Nominatim reverse-geocoding calls — each URL encodes unique
  // lat/lon coordinates and caching them would grow the cache unboundedly
  if (e.request.url.includes('nominatim.openstreetmap.org')) return;

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

// ── ACTIVITY LIVE NOTIFICATION ────────────────────────────────────
// Handles persistent notification showing live run/walk/cycle stats
// Posted from running.js via postMessage, updates every 3 seconds

const ACTIVITY_NOTIF_TAG = 'fitflow-activity';

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'ACTIVITY_START') {
    _showActivityNotif(e.data);
  }

  if (e.data.type === 'ACTIVITY_UPDATE') {
    _showActivityNotif(e.data);
  }

  if (e.data.type === 'ACTIVITY_STOP') {
    self.registration.getNotifications({ tag: ACTIVITY_NOTIF_TAG })
      .then(notifs => notifs.forEach(n => n.close()));
  }
});

function _showActivityNotif(data) {
  const { emoji, label, distance, time, pace, speed, kcal, paused } = data;
  const statusIcon = paused ? '⏸' : emoji;

  // Title: activity type + the two most glanceable stats
  const title = `${statusIcon} ${label}  ·  ${distance} km  ·  ${time}`;

  // Body: full stats line — speed, pace, calories
  const body = paused
    ? `Paused  ·  ${distance} km logged`
    : `${speed || '0.0'} km/h  ·  Pace ${pace}/km  ·  ${kcal} kcal`;

  self.registration.showNotification(title, {
    tag:               ACTIVITY_NOTIF_TAG,
    body,
    icon:              '/icons/icon-192.png',
    badge:             '/icons/icon-192.png',
    silent:            true,   // no sound on every 3s update
    renotify:          false,  // update in place — no vibration
    requireInteraction: true,  // stays on lock screen until dismissed
    data: { url: '/#page-running' },
    // No actions — tap notification to open app
  });
}

self.addEventListener('notificationclick', e => {
  if (e.notification.tag !== ACTIVITY_NOTIF_TAG) return;
  e.notification.close();
  // Tap notification → open / focus the app on the running page
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const match = clients.find(c => c.url.includes('fitflowpro.in'));
      if (match) return match.focus();
      return self.clients.openWindow('/#page-running');
    })
  );
});
