// ── LOGIN ─────────────────────────────────────────────────────────
function initLogin() {
  const form    = document.getElementById('login-form');
  const emailIn = document.getElementById('login-email');
  const passIn  = document.getElementById('login-password');
  const errEl   = document.getElementById('login-error');
  const btn     = document.getElementById('login-btn');

  document.getElementById('toggle-pass')?.addEventListener('click', () => {
    passIn.type = passIn.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailIn.value.trim().toLowerCase();
    const pass  = passIn.value.trim();

    if (!email || !pass) { errEl.textContent = 'Please enter email and password.'; return; }

    btn.disabled  = true;
    btn.innerHTML = '<span class="loader" style="width:20px;height:20px;border-width:2px;display:inline-block"></span>';
    errEl.textContent = '';

    const result = await attemptLogin(email, pass);

    btn.disabled    = false;
    btn.textContent = 'Sign In';

    if (!result.success) {
      errEl.textContent = '⚠️ ' + result.error;
      passIn.value = '';
      return;
    }

    const user = result.user;
    if (user.isFirstLogin) {
      APP.pendingUser = user;
      openSetPasswordModal();
    } else {
      completeLogin(user);
    }
  });
}

// ── ATTEMPT LOGIN (Sheets → local fallback) ───────────────────────
async function attemptLogin(email, password) {
  const cfg = Store.getSheetsConfig();

  if (cfg.webAppUrl) {
    try {
      const res = await Sheets.get('login', { email, password });
      if (res && res.success !== undefined) return res;
    } catch (e) {
      console.warn('Sheets login error:', e);
    }
    // Network failure → fall through to local
  }

  // Local fallback (admin only when Sheets unreachable)
  const local = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
  const u     = local.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!u) {
    return {
      success: false,
      error: cfg.webAppUrl
        ? 'Cannot reach server. Check your connection.'
        : 'Sheets not configured. Contact Admin.',
    };
  }
  if ((u.status || '').toUpperCase() === 'INACTIVE') {
    return { success: false, error: 'Account deactivated. Contact Admin.' };
  }

  const entered     = (password || '').trim();
  const matchStored = u.password     && u.password     === entered;
  const matchTemp   = u.tempPassword && u.tempPassword === entered;
  if (!matchStored && !matchTemp) {
    return { success: false, error: 'Invalid email or password.' };
  }

  return {
    success: true,
    user: {
      id:           u.id,
      name:         u.name,
      email:        u.email,
      role:         (u.role || 'USER').toUpperCase(),
      status:       u.status || 'ACTIVE',
      isFirstLogin: u.isFirstLogin === true || u.isFirstLogin === 'TRUE',
    },
  };
}

// ── COMPLETE LOGIN ────────────────────────────────────────────────
function completeLogin(user) {
  APP.currentUser = user;
  Store.saveSession(user);

  // Sync all admin-edited content from Sheets (non-blocking)
  syncContentFromSheets();

  if (user.role === 'ADMIN') {
    initDashboard();
    showPage('page-admin');
    renderAdminPanel();
    return;
  }

  // Init push notifications for regular users (non-blocking)
  if (typeof initPushNotifications === 'function') initPushNotifications();

  const lastQuote = Store.get('ff_quote_' + user.id);
  const today     = todayStr();

  if (lastQuote === today) {
    initDashboard();
    showPage('page-dashboard');
    setActiveNav('home');
  } else {
    Store.set('ff_quote_' + user.id, today);
    initDashboard();
    renderQuote();
    showPage('page-quote');
  }
}

// ── SYNC FROM SHEETS (background, non-blocking) ──────────────────
// Fetches: all admin content edits + user's own workout logs
async function syncContentFromSheets() {
  const cfg  = Store.getSheetsConfig();
  const user = APP.currentUser;
  if (!cfg.webAppUrl) return;

  // Run both in parallel
  await Promise.all([
    _syncContent(),
    user ? _syncUserLogs(user.id) : Promise.resolve(),
  ]);
}

async function _syncContent() {
  try {
    const res = await Sheets.get('getAllContent');
    if (!res?.success || !res.content) return;
    Object.entries(res.content).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        Store.setContent(key, value);
        _applyToAppData(key, value);
      }
    });
  } catch (e) {
    console.warn('Content sync skipped:', e.message);
  }
}

async function _syncUserLogs(userId) {
  try {
    const res = await Sheets.get('getUserLogs', { userId });
    if (!res?.success || !Array.isArray(res.logs) || !res.logs.length) return;

    // Merge Sheets logs with local logs (avoid duplicates)
    const local = Store.getLogs();
    let changed = false;
    res.logs.forEach(sheetLog => {
      const exists = local.find(l =>
        l.userId === sheetLog.userId &&
        l.module === sheetLog.module &&
        l.day    === sheetLog.day    &&
        l.date   === sheetLog.date
      );
      if (!exists) {
        local.push({ ...sheetLog, id: sheetLog.id || 'log_' + Date.now() + Math.random() });
        changed = true;
      }
    });
    if (changed) Store.set('ff_logs', local);
  } catch (e) {
    console.warn('Log sync skipped:', e.message);
  }
}

function _applyToAppData(key, value) {
  try {
    if (key === 'custom_quotes' && Array.isArray(value)) {
      APP_DATA.quotes = value;
    }
    const exMatch = key.match(/^exercises_(.+)$/);
    if (exMatch && value?.days && APP_DATA.modules[exMatch[1]]) {
      APP_DATA.modules[exMatch[1]].days = value.days;
    }
    const wuMatch = key.match(/^warmup_(.+)$/);
    if (wuMatch && Array.isArray(value)) {
      APP_DATA.warmups[wuMatch[1]] = value;
    }
    const cdMatch = key.match(/^cooldown_(.+)$/);
    if (cdMatch && Array.isArray(value)) {
      APP_DATA.cooldowns[cdMatch[1]] = value;
    }
  } catch { /* silently ignore */ }
}

// ── FIRST LOGIN — SET PASSWORD ────────────────────────────────────
function openSetPasswordModal() {
  document.getElementById('set-pass-name').textContent   = APP.pendingUser?.name || 'there';
  document.getElementById('set-pass-error').textContent  = '';
  document.getElementById('new-pass-input').value        = '';
  document.getElementById('confirm-pass-input').value    = '';
  openModal('modal-set-password');
}

async function submitNewPassword() {
  const newPass     = document.getElementById('new-pass-input').value.trim();
  const confirmPass = document.getElementById('confirm-pass-input').value.trim();
  const errEl       = document.getElementById('set-pass-error');
  const btn         = document.getElementById('set-pass-btn');

  errEl.textContent = '';
  if (newPass.length < 6)      { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass)  { errEl.textContent = 'Passwords do not match.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  let saved = false;
  const cfg = Store.getSheetsConfig();

  if (cfg.webAppUrl) {
    const res = await Sheets.post('changePassword', { userId: APP.pendingUser.id, newPassword: newPass });
    saved = res?.success === true;
  } else {
    const local = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
    const u = local.find(u => u.id === APP.pendingUser.id);
    if (u) { u.password = newPass; u.tempPassword = ''; u.isFirstLogin = false; }
    localStorage.setItem('ff_local_users', JSON.stringify(local));
    saved = true;
  }

  btn.disabled    = false;
  btn.textContent = 'Set Password & Continue';

  if (!saved) { errEl.textContent = 'Failed to save. Please try again.'; return; }

  // Take a copy before clearing pendingUser
  const user = { ...APP.pendingUser, isFirstLogin: false };
  APP.pendingUser = null;
  closeModal('modal-set-password');
  showToast('Password set! Welcome to FitFlow Pro 🎉', 'success');
  completeLogin(user);
}

// ── QUOTE PAGE ────────────────────────────────────────────────────
function renderQuote() {
  const user   = APP.currentUser;
  const quotes = APP_DATA.quotes;
  if (!quotes?.length) return;
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('quote-text').textContent     = '"' + q.text + '"';
  document.getElementById('quote-author').textContent   = '— ' + q.author;
  document.getElementById('quote-greeting').textContent = getGreeting() + ', ' + (user?.name?.split(' ')[0] || 'Champion') + ' 👋';
}

// ── LOGOUT ────────────────────────────────────────────────────────
function logout() {
  Store.clearSession();
  APP.currentUser  = null;
  APP.pageHistory  = [];
  APP.currentPage  = null;
  showPage('page-login', false);
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  document.getElementById('ready-btn')?.addEventListener('click', () => {
    showPage('page-dashboard');
    setActiveNav('home');
  });
});
