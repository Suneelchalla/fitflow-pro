// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Push Notification Manager (OneSignal)
//
// HOW THIS WORKS:
//   • OneSignal handles all the broken VAPID/ECDSA stuff for us.
//   • Frontend uses OneSignal Web SDK to subscribe users.
//   • Apps Script calls OneSignal REST API to send notifications.
//   • Subscription state is stored in BOTH:
//       - OneSignal's own database (so they can deliver pushes)
//       - Your Google Sheet (so you can correlate users)
//
// SETUP REQUIRED (one time only):
//   1. Add this script tag to <head> of index.html (BEFORE this push.js):
//        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
//   2. Upload OneSignalSDKWorker.js to GitHub repo ROOT (same folder as index.html)
//   3. In Apps Script Project Settings → Script Properties, add:
//        ONESIGNAL_APP_ID       = 5dfd18d7-bde4-4f26-a478-0f522b2f299f
//        ONESIGNAL_REST_API_KEY = <your REST API key>
// ════════════════════════════════════════════════════════════════

const PUSH = {

  ONESIGNAL_APP_ID: '5dfd18d7-bde4-4f26-a478-0f522b2f299f',

  _initPromise: null,
  _initStarted: false,

  // ── Initialize OneSignal SDK once per page load ─────────────────
  async _ensureInit() {
    if (this._initPromise) return this._initPromise;
    if (typeof window.OneSignalDeferred === 'undefined') return null;

    this._initPromise = new Promise(resolve => {
      window.OneSignalDeferred.push(async OneSignal => {
        if (!this._initStarted) {
          this._initStarted = true;
          try {
            await OneSignal.init({
              appId: this.ONESIGNAL_APP_ID,
              // Reuse our existing sw.js — it imports OneSignal SDK via importScripts.
              // This prevents two SW registrations fighting over the same scope.
              serviceWorkerPath: '/fitflow-pro/sw.js',
              serviceWorkerParam: { scope: '/fitflow-pro/' },
              allowLocalhostAsSecureOrigin: true,
              notifyButton: { enable: false },
              autoRegister: false,
              autoResubscribe: true,
            });
          } catch (e) {
            console.warn('OneSignal init error:', e?.message || e);
          }
        }
        resolve(OneSignal);
      });
    });
    return this._initPromise;
  },

  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  getPermission() {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  },

  // ── Subscribe (asks for permission if needed) ───────────────────
  async subscribe() {
    if (!this.isSupported()) return null;
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return null;

      // Step 1: Browser permission
      if (OneSignal.Notifications.permission !== true) {
        await OneSignal.Notifications.requestPermission();
      }
      if (OneSignal.Notifications.permission !== true) {
        // User denied or dismissed
        return null;
      }

      // Step 2: Explicitly opt the user in to OneSignal pushes
      // (permission alone is not enough — must also set opted-in)
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (e) {
        console.warn('OneSignal optIn warning:', e?.message);
      }

      // Step 3: Wait for OneSignal to register the subscription
      // Poll up to 8 seconds for subscription ID to appear
      let subId = null;
      for (let i = 0; i < 16; i++) {
        subId = OneSignal.User.PushSubscription.id;
        if (subId) break;
        await new Promise(r => setTimeout(r, 500));
      }
      if (!subId) {
        console.warn('OneSignal subscription ID never appeared');
        return null;
      }

      // Step 4: Save the subscription to your sheet
      await this._save();
      return true;
    } catch (e) {
      console.error('Push subscribe failed:', e?.message || e);
      return null;
    }
  },

  // ── Unsubscribe ─────────────────────────────────────────────────
  async unsubscribe() {
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return;
      await OneSignal.User.PushSubscription.optOut();
      await new Promise(r => setTimeout(r, 500)); // give it a moment
      await this._remove();
    } catch (e) {
      console.warn('Push unsubscribe error:', e?.message || e);
    }
  },

  // ── Check current subscription state ────────────────────────────
  async isSubscribed() {
    if (!this.isSupported()) return false;
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return false;
      // optedIn is the OneSignal v16 flag for "this user wants pushes"
      return !!OneSignal.User.PushSubscription.optedIn;
    } catch {
      return false;
    }
  },

  // ── Get the OneSignal Subscription ID (a UUID per device/browser) ─
  async getSubscriptionId() {
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return null;
      return OneSignal.User.PushSubscription.id || null;
    } catch {
      return null;
    }
  },

  // ── Save subscription to our Google Sheet (for analytics + cleanup) ─
  async _save() {
    const user = APP.currentUser;
    if (!user) return;
    const subId = await this.getSubscriptionId();
    if (!subId) return; // OneSignal hasn't registered yet — will retry next time

    // Tag the user in OneSignal so we can target by userId
    try {
      const OneSignal = await this._ensureInit();
      if (OneSignal) {
        await OneSignal.login(user.id);
        await OneSignal.User.addTags({
          email:  user.email || '',
          name:   user.name  || '',
          role:   user.role  || 'USER',
        });
      }
    } catch (e) { console.warn('OneSignal user tag failed:', e?.message); }

    // Save reference in your sheet too (for admin dashboard / cleanup)
    try {
      await Sheets.post('savePushSubscription', {
        userId:        user.id,
        name:          user.name,
        email:         user.email,
        endpoint:      'onesignal:' + subId,  // prefix to distinguish from old VAPID
        p256dh:        '',
        auth:          '',
        savedAt:       new Date().toISOString(),
        provider:      'onesignal',
        onesignalSubId: subId,
      });
    } catch (e) { console.warn('Sheet save failed:', e?.message); }

    Store.set('ff_push_subscribed', true);
  },

  async _remove() {
    const user = APP.currentUser;
    if (!user) return;
    const subId = await this.getSubscriptionId();
    try {
      await Sheets.post('removePushSubscription', {
        userId:   user.id,
        endpoint: subId ? 'onesignal:' + subId : 'unknown',
      });
    } catch {}
    Store.set('ff_push_subscribed', false);
  },
};

// ── AUTO-INIT AFTER LOGIN ─────────────────────────────────────────
async function initPushNotifications() {
  if (!PUSH.isSupported()) return;
  // Initialize OneSignal SDK so it can register the service worker
  await PUSH._ensureInit();

  // If already subscribed, refresh the user tag on Sheets
  if (await PUSH.isSubscribed()) {
    await PUSH._save();
  }
  // Don't auto-prompt — let the user toggle it themselves from the menu
}

function showPushPrompt(force = false) {
  if (!APP.currentUser) return;
  if (APP.currentUser.role === 'ADMIN') return;
  if (!force && APP.currentPage !== 'page-dashboard') return;
  if (!force && Store.get('ff_push_dismissed_today') === new Date().toDateString()) return;
  const banner = document.getElementById('push-banner');
  if (banner) {
    banner.classList.remove('hidden');
    banner.style.display = 'block';
  }
}

async function acceptPushNotifications() {
  const b = document.getElementById('push-banner');
  if (b) { b.classList.add('hidden'); b.style.display = 'none'; }
  const ok = await PUSH.subscribe();
  showToast(
    ok ? '🔔 Daily workout reminders enabled!' : 'Could not enable — check browser notification settings.',
    ok ? 'success' : 'error'
  );
}

function dismissPushNotifications() {
  const b = document.getElementById('push-banner');
  if (b) { b.classList.add('hidden'); b.style.display = 'none'; }
  Store.set('ff_push_dismissed_today', new Date().toDateString());
}
