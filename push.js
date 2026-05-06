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
    if (!this.isSupported()) return { ok: false, reason: 'unsupported' };
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return { ok: false, reason: 'init_failed' };

      // Step 1: Check browser permission first
      const browserPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';

      if (browserPerm === 'denied') {
        // Browser permission was explicitly blocked — user must unblock manually
        console.warn('Push: browser permission is BLOCKED — user must unblock in browser settings');
        return { ok: false, reason: 'permission_blocked' };
      }

      if (browserPerm === 'default') {
        // Need to ask user
        try {
          await OneSignal.Notifications.requestPermission();
        } catch (e) {
          console.warn('requestPermission threw:', e?.message);
        }
        // Re-check
        const newPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
        if (newPerm !== 'granted') {
          return { ok: false, reason: 'permission_denied' };
        }
      }

      // Step 2: Opt in to OneSignal
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (e) {
        console.warn('OneSignal optIn warning:', e?.message);
      }

      // Step 3: Poll for subscription ID (up to 15 seconds)
      let subId = null;
      for (let i = 0; i < 30; i++) {
        try {
          subId = OneSignal.User.PushSubscription.id;
          if (subId) break;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }

      // Step 4: If still no subId, attempt RECOVERY
      if (!subId) {
        console.warn('Push: subId did not appear — attempting recovery (clear SW + retry)');
        const recovered = await this._forceRecovery();
        if (recovered) {
          subId = OneSignal.User.PushSubscription.id;
        }
      }

      if (!subId) {
        return { ok: false, reason: 'no_subscription_id' };
      }

      // Step 5: Save to sheet
      await this._save();
      return { ok: true, subId: subId };
    } catch (e) {
      console.error('Push subscribe failed:', e?.message || e);
      return { ok: false, reason: 'exception', error: e?.message };
    }
  },

  // ── Last-resort recovery: unregister SW + force fresh re-init ───────
  async _forceRecovery() {
    try {
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return false;

      console.log('Push: trying optOut → optIn cycle...');
      try { await OneSignal.User.PushSubscription.optOut(); } catch {}
      await new Promise(r => setTimeout(r, 1000));
      try { await OneSignal.User.PushSubscription.optIn(); } catch {}

      // Poll again
      for (let i = 0; i < 20; i++) {
        const id = OneSignal.User.PushSubscription.id;
        if (id) {
          console.log('Push: recovery succeeded after optOut/optIn cycle');
          return true;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      // Last resort: unregister all service workers and prompt page reload
      console.warn('Push: recovery failed even after retry. User needs to reload page.');
      return false;
    } catch (e) {
      console.warn('Recovery threw:', e?.message);
      return false;
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

// ── HEALTH CHECK — detects invalid/expired subscriptions ──────────
// If the local "subscribed" flag is true but OneSignal can't get a subId,
// it means the FCM token expired. Re-subscribe to get a fresh one.
async function _healthCheckAndRecover() {
  if (!PUSH.isSupported()) return;
  try {
    const localFlag = Store.get('ff_push_subscribed') === true;
    if (!localFlag) return; // not subscribed locally, nothing to recover
    
    // Wait a moment for OneSignal to be ready
    const subId = await PUSH.getSubscriptionId();
    const permission = PUSH.getPermission();
    
    if (permission !== 'granted') {
      // Permission was revoked — clear local flag
      Store.set('ff_push_subscribed', false);
      console.log('Push: permission was revoked, marked as unsubscribed');
      return;
    }
    
    if (!subId) {
      // We think we're subscribed but OneSignal has no subscription ID
      // → token expired or invalidated. Force fresh subscribe.
      console.log('Push: subscription ID missing, attempting to recover...');
      const result = await PUSH.subscribe();
      if (result?.ok) {
        console.log('Push: re-subscription successful ✓');
      } else {
        console.warn('Push: re-subscription failed (' + (result?.reason || 'unknown') + ') — user may need to toggle in profile');
        Store.set('ff_push_subscribed', false);
      }
    } else {
      // Has subscription ID — refresh the user link/tags in case external_user_id was lost
      try {
        const OneSignal = await PUSH._ensureInit();
        const user = APP.currentUser;
        if (OneSignal && user) {
          await OneSignal.login(user.id);
          await OneSignal.User.addTags({
            email: user.email || '',
            name:  user.name  || '',
            role:  user.role  || 'USER',
            lastSeen: new Date().toISOString().slice(0, 10),
          });
        }
      } catch (e) {
        console.warn('Push: tag refresh failed:', e?.message);
      }
    }
  } catch (e) {
    console.warn('Push health check failed:', e?.message);
  }
}

// ── AUTO-INIT AFTER LOGIN ─────────────────────────────────────────
async function initPushNotifications() {
  if (!PUSH.isSupported()) return;
  
  // FIRST: Run health check — if FCM token expired, this re-subscribes silently
  // (runs in background, doesn't block UI)
  _healthCheckAndRecover().catch(e => console.warn('Push recovery failed:', e?.message));
  
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
