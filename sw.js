// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Service Worker v44 (with OneSignal Push)
// Combines: PWA offline cache + OneSignal push notifications
// ════════════════════════════════════════════════════════════════

// Import OneSignal's service worker — handles push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE = 'fitflow-v61';
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
  const { emoji, label, distance, time, pace, kcal, paused } = data;
  const statusIcon = paused ? '⏸' : emoji;
  const title      = `${statusIcon} ${label}  ·  ${distance} km  ·  ${time}`;
  const body       = paused
    ? `Paused — Tap to resume`
    : `Pace ${pace}/km  ·  ${kcal} kcal burned`;

  self.registration.showNotification(title, {
    tag:              ACTIVITY_NOTIF_TAG,
    body,
    icon:             '/fitflow-pro/icons/icon-192.png',
    badge:            '/fitflow-pro/icons/icon-192.png',
    silent:           true,
    renotify:         false,
    requireInteraction: true,
    actions: [
      { action: 'open',  title: '📱 Open App' },
      { action: 'pause', title: paused ? '▶ Resume' : '⏸ Pause' },
    ],
    data: { url: '/fitflow-pro/#page-running' },
  });
}

self.addEventListener('notificationclick', e => {
  if (e.notification.tag !== ACTIVITY_NOTIF_TAG) return;
  e.notification.close();

  if (e.action === 'pause') {
    // Send message to app to toggle pause
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_TOGGLE_PAUSE' }));
    });
    return;
  }

  // Open/focus the app
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const match = clients.find(c => c.url.includes('fitflow-pro'));
      if (match) return match.focus();
      return self.clients.openWindow('/fitflow-pro/#page-running');
    })
  );
});
