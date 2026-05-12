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

    // The SDK loads with 'defer' — it may not be ready at the exact moment this
    // is called. Poll for up to 5 seconds before giving up.
    // Note: don't check the script tag — it's always in the DOM from index.html
    // but the script might still be loading. Only trust window.OneSignalDeferred.
    if (typeof window.OneSignalDeferred === 'undefined') {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (typeof window.OneSignalDeferred !== 'undefined') break;
      }
    }

    if (typeof window.OneSignalDeferred === 'undefined') return null;

    const sdkPromise = new Promise(resolve => {
      window.OneSignalDeferred.push(async OneSignal => {
        if (!this._initStarted) {
          this._initStarted = true;
          try {
            await OneSignal.init({
              appId: this.ONESIGNAL_APP_ID,
              // SW path must match OneSignal dashboard:
              // Settings → Web Push → Advanced → Service Workers
              // Path: /   Filename: sw.js   Scope: /
              serviceWorkerPath: '/sw.js',
              serviceWorkerParam: { scope: '/' },
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

    // 5-second timeout — if SDK init callback never fires we don't hang the toggle.
    // On timeout: resolve null AND reset state so the next tap can retry.
    const timeoutPromise = new Promise(resolve =>
      setTimeout(() => {
        console.warn('Push: OneSignal init timed out — will retry on next tap');
        resolve(null);
      }, 5000)
    );

    this._initPromise = Promise.race([sdkPromise, timeoutPromise]);

    // If timed out (null result), clear cached promise so next subscribe attempt retries
    this._initPromise.then(result => {
      if (!result) {
        this._initPromise  = null;
        this._initStarted  = false;
      }
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
      // ── STEP 1: Check/request OS permission — NO OneSignal needed here ──
      // This must happen FIRST. _ensureInit() can take up to 10 seconds;
      // asking permission before that makes the dialog appear immediately on tap.
      const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';

      if (perm === 'denied') {
        console.warn('Push: permission is BLOCKED at OS level');
        return { ok: false, reason: 'permission_blocked' };
      }

      if (perm === 'default') {
        // Show the Android OS notification permission dialog immediately
        let granted = false;
        try {
          const result = await Notification.requestPermission();
          granted = (result === 'granted');
        } catch (e) {
          // Older callback-style fallback
          granted = await new Promise(res =>
            Notification.requestPermission(r => res(r === 'granted'))
          );
        }
        if (!granted) {
          const finalPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
          return { ok: false, reason: finalPerm === 'denied' ? 'permission_blocked' : 'permission_denied' };
        }
      }

      // ── STEP 2: Permission granted — now init OneSignal and register ──
      // We do this AFTER getting permission so the user never waits for
      // OneSignal to load before seeing the dialog.
      const OneSignal = await this._ensureInit();
      if (!OneSignal) {
        // OneSignal not available, but OS permission is granted.
        // Save the intent — _healthCheckAndRecover() will register on next open.
        Store.set('ff_push_subscribed', true);
        return { ok: true, subId: 'pending' };
      }

      // ── STEP 3: Register device with OneSignal ──
      const subId = await this._registerWithOneSignal(OneSignal);
      if (subId) {
        await this._save();
        return { ok: true, subId };
      }

      // Registration pending — health check will finish it on next app open
      Store.set('ff_push_subscribed', true);
      await this._save();
      return { ok: true, subId: 'pending' };

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

  // ── Register with OneSignal after OS permission is already granted ─
  // Called from subscribe() — runs in background after user grants OS permission.
  // If OneSignal isn't ready, returns null — health check will retry on next open.
  async _registerWithOneSignal(OneSignal) {
    try {
      // Opt in (OneSignal knows permission is already granted)
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch (e) {
        console.warn('OneSignal optIn warning:', e?.message);
      }

      // Poll for subscription ID (up to 15 seconds)
      for (let i = 0; i < 30; i++) {
        try {
          const id = OneSignal.User.PushSubscription.id;
          if (id) return id;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }

      // Try recovery cycle
      const recovered = await this._forceRecovery();
      if (recovered) return OneSignal.User.PushSubscription.id || null;

      return null;
    } catch (e) {
      console.warn('OneSignal registration failed:', e?.message);
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
  // True ONLY if all three are true:
  //  1. OneSignal optedIn flag is true
  //  2. OneSignal has a valid subscription ID
  //  3. Browser permission is granted
  async isSubscribed() {
    if (!this.isSupported()) return false;
    try {
      // Browser-level check first
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        return false;
      }
      const OneSignal = await this._ensureInit();
      if (!OneSignal) return false;

      const optedIn = !!OneSignal.User.PushSubscription.optedIn;
      const subId   = OneSignal.User.PushSubscription.id;

      // Both must be true to count as actually subscribed
      return optedIn && !!subId;
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
// No in-app toggle — managed automatically on every login.
// Users manage notifications via Android Settings if they want to turn it off.
async function initPushNotifications() {
  if (!PUSH.isSupported()) return;
  if (typeof APP !== 'undefined' && APP.currentUser?.role === 'ADMIN') return;

  const perm = PUSH.getPermission();
  if (perm === 'denied') return; // user blocked at OS level — respect it

  if (perm === 'granted') {
    // Permission already granted — silently re-confirm subscription on every login.
    // This is critical after any OneSignal service worker path change: old subscriptions
    // are bound to the old SW scope and will never receive pushes. Re-calling optIn()
    // updates the subscription to the current SW path without showing any dialog.
    setTimeout(async () => {
      try {
        if (!APP.currentUser || APP.currentUser.role === 'ADMIN') return;
        const OneSignal = await PUSH._ensureInit();
        if (!OneSignal) return;
        // optIn() is a no-op if subscription is still valid,
        // creates a fresh one if it's stale/invalid
        await OneSignal.User.PushSubscription.optIn();
        // Wait briefly for subscription ID to appear
        await new Promise(r => setTimeout(r, 2000));
        const subId = OneSignal.User.PushSubscription.id;
        if (subId) {
          Store.set('ff_push_subscribed', true);
          await PUSH._save();
        }
      } catch (e) {
        console.warn('Push re-confirm failed:', e?.message);
      }
    }, 2000);

  } else {
    // Permission not asked yet — show OS dialog after short delay
    setTimeout(async () => {
      try {
        if (!APP.currentUser || APP.currentUser.role === 'ADMIN') return;
        await PUSH.subscribe();
      } catch (e) {
        console.warn('Auto push subscribe failed:', e?.message);
      }
    }, 3000);
  }
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
