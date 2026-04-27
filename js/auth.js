// ════════════════════════════════════════════════════════════════
// AUTH — Login + First Login Password Change + Quote Logic
// ════════════════════════════════════════════════════════════════

// ── LOGIN ────────────────────────────────────────────────────────
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

    btn.disabled = true;
    btn.innerHTML = '<span class="loader" style="width:20px;height:20px;border-width:2px;display:inline-block"></span>';
    errEl.textContent = '';

    const result = await attemptLogin(email, pass);

    btn.disabled = false;
    btn.textContent = 'Sign In';

    if (!result.success) {
      errEl.textContent = '⚠️ ' + result.error;
      passIn.value = '';
      return;
    }

    const user = result.user;

    // First login → force password change
    if (user.isFirstLogin) {
      APP.pendingUser = user;
      openSetPasswordModal();
      return;
    }

    completeLogin(user);
  });
}

// ── LOGIN ATTEMPT ─────────────────────────────────────────────────
async function attemptLogin(email, password) {
  const cfg = Store.getSheetsConfig();

  if (cfg.webAppUrl) {
    try {
      const res = await Sheets.get('login', { email, password });
      if (res) return res;
    } catch {}
  }

  // Local fallback (admin only)
  const localUsers = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
  const u = localUsers.find(u => u.email === email);
  if (!u) return { success: false, error: 'Sheets not configured. Contact Admin.' };
  if (u.status === 'INACTIVE') return { success: false, error: 'Account deactivated.' };
  const match = u.password === password || (u.isFirstLogin && u.tempPassword === password);
  if (!match) return { success: false, error: 'Invalid email or password.' };
  return { success: true, user: { id:u.id, name:u.name, email:u.email, role:u.role, status:u.status, isFirstLogin:u.isFirstLogin } };
}

// ── COMPLETE LOGIN ────────────────────────────────────────────────
function completeLogin(user) {
  APP.currentUser = user;
  Store.saveSession(user);

  // Admin → skip quote, go straight to admin panel
  if (user.role === 'ADMIN') {
    initDashboard();
    showPage('page-admin');
    renderAdminPanel();
    return;
  }

  // User → check if quote already shown today
  const lastQuoteDate = Store.get('ff_quote_' + user.id);
  const today = todayStr();

  if (lastQuoteDate === today) {
    // Already seen quote today → go straight to dashboard
    initDashboard();
    showPage('page-dashboard');
  } else {
    // First login of the day → show quote
    Store.set('ff_quote_' + user.id, today);
    initDashboard();
    renderQuote();
    showPage('page-quote');
  }
}

// ── FIRST LOGIN — SET PASSWORD ────────────────────────────────────
function openSetPasswordModal() {
  document.getElementById('set-pass-name').textContent = APP.pendingUser?.name || 'there';
  document.getElementById('set-pass-error').textContent = '';
  document.getElementById('new-pass-input').value = '';
  document.getElementById('confirm-pass-input').value = '';
  openModal('modal-set-password');
}

async function submitNewPassword() {
  const newPass     = document.getElementById('new-pass-input').value.trim();
  const confirmPass = document.getElementById('confirm-pass-input').value.trim();
  const errEl       = document.getElementById('set-pass-error');
  const btn         = document.getElementById('set-pass-btn');

  errEl.textContent = '';
  if (newPass.length < 6)        { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass)   { errEl.textContent = 'Passwords do not match.'; return; }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const cfg = Store.getSheetsConfig();
  let saved = false;

  if (cfg.webAppUrl) {
    const res = await Sheets.post('changePassword', { userId: APP.pendingUser.id, newPassword: newPass });
    saved = res?.success === true;
  } else {
    const localUsers = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
    const u = localUsers.find(u => u.id === APP.pendingUser.id);
    if (u) { u.password = newPass; u.tempPassword = ''; u.isFirstLogin = false; }
    localStorage.setItem('ff_local_users', JSON.stringify(localUsers));
    saved = true;
  }

  btn.disabled = false;
  btn.textContent = 'Set Password & Continue';

  if (!saved) { errEl.textContent = 'Failed to save. Please try again.'; return; }

  APP.pendingUser.isFirstLogin = false;
  closeModal('modal-set-password');
  showToast('Password set! Welcome to FitFlow Pro 🎉', 'success');
  completeLogin(APP.pendingUser);
  APP.pendingUser = null;
}

// ── QUOTE PAGE ────────────────────────────────────────────────────
function renderQuote() {
  const user   = APP.currentUser;
  const quotes = APP_DATA.quotes;
  const q      = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('quote-text').textContent     = '"' + q.text + '"';
  document.getElementById('quote-author').textContent   = '— ' + q.author;
  document.getElementById('quote-greeting').textContent = getGreeting() + ', ' + (user?.name?.split(' ')[0] || 'Champion') + ' 👋';
}

// ── LOGOUT ────────────────────────────────────────────────────────
function logout() {
  Store.clearSession();
  APP.currentUser = null;
  APP.pageHistory = [];
  showPage('page-login');
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  document.getElementById('ready-btn')?.addEventListener('click', () => {
    showPage('page-dashboard');
    setActiveNav('home');
  });
});
