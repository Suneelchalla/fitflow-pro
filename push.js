// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Push Notification Manager
// Replace VAPID_PUBLIC_KEY with your Firebase key
// ════════════════════════════════════════════════════════════════

const PUSH = {

  VAPID_PUBLIC_KEY: 'BCeIE1VrMnvo7_KvhVNsJjQYOnnGP3GiNVv41pqoOaicMXSVgastxAQmlyioHAazWpXvj6gZ4Frcl9ePYzvGSPo', // ← Replace this

  isSupported() {
    return 'serviceWorker' in navigator
        && 'PushManager'   in window
        && 'Notification'  in window;
  },

  getPermission() {
    return Notification.permission;
  },

  _toUint8Array(base64) {
    const pad  = '='.repeat((4 - base64.length % 4) % 4);
    const b64  = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw  = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  },

  async subscribe() {
    if (!this.isSupported() || this.VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') return null;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return null;
      const reg = await navigator.serviceWorker.ready;
      let sub   = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: this._toUint8Array(this.VAPID_PUBLIC_KEY),
        });
      }
      await this._save(sub);
      return sub;
    } catch (e) {
      console.error('Push subscribe failed:', e);
      return null;
    }
  },

  async unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await sub.unsubscribe(); await this._remove(sub); }
    } catch {}
  },

  async isSubscribed() {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      return !!(await reg.pushManager.getSubscription());
    } catch { return false; }
  },

  async _save(sub) {
    const user = APP.currentUser;
    if (!user) return;
    await Sheets.post('savePushSubscription', {
      userId:   user.id,
      name:     user.name,
      email:    user.email,
      endpoint: sub.endpoint,
      p256dh:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
      auth:     btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
      savedAt:  new Date().toISOString(),
    });
    Store.set('ff_push_subscribed', true);
  },

  async _remove(sub) {
    const user = APP.currentUser;
    if (!user) return;
    await Sheets.post('removePushSubscription', { userId: user.id, endpoint: sub.endpoint });
    Store.set('ff_push_subscribed', false);
  },
};

// ── AUTO-INIT AFTER LOGIN ─────────────────────────────────────────
async function initPushNotifications() {
  if (!PUSH.isSupported()) return;
  if (PUSH.VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') return;
  if (Notification.permission === 'granted') {
    await PUSH.subscribe(); // silently renew
  } else if (Notification.permission === 'default') {
    setTimeout(showPushPrompt, 5000); // ask after 5s
  }
}

function showPushPrompt() {
  // Only show if user is logged in on the dashboard
  if (!APP.currentUser) return;
  if (APP.currentUser.role === 'ADMIN') return;
  if (APP.currentPage !== 'page-dashboard') return;
  if (Store.get('ff_push_dismissed_today') === new Date().toDateString()) return;
  const banner = document.getElementById('push-banner');
  if (banner) banner.style.display = 'block';
}

async function acceptPushNotifications() {
  const b = document.getElementById('push-banner');
  if (b) b.style.display = 'none';
  const sub = await PUSH.subscribe();
  showToast(sub ? '🔔 Daily workout reminders enabled!' : 'Could not enable — check browser settings.', sub ? 'success' : 'error');
}

function dismissPushNotifications() {
  const b = document.getElementById('push-banner');
  if (b) b.style.display = 'none';
  Store.set('ff_push_dismissed_today', new Date().toDateString());
}
