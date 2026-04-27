// ════════════════════════════════════════════════════════════════
// AUTH — Login + First Login Password Change
// ════════════════════════════════════════════════════════════════

// ── LOGIN ────────────────────────────────────────────────────────
function initLogin() {
  const form   = document.getElementById('login-form');
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

    const user = await attemptLogin(email, pass);

    btn.disabled = false;
    btn.textContent = 'Sign In';

    if (!user.success) {
      errEl.textContent = '⚠️ ' + user.error;
      passIn.value = '';
      return;
    }

    const loggedUser = user.user;

    // First login — force password change
    if (loggedUser.isFirstLogin) {
      APP.pendingUser = loggedUser; // hold while they set password
      openSetPasswordModal();
      return;
    }

    // Normal login
    completeLogin(loggedUser);
  });
}

// ── LOGIN ATTEMPT — tries Sheets first, falls back to local ──────
async function attemptLogin(email, password) {
  const cfg = Store.getSheetsConfig();

  // Try Google Sheets if configured
  if (cfg.webAppUrl) {
    try {
      const res = await Sheets.get('login', { email, password });
      if (res) return res; // success or error from Sheets
    } catch {}
  }

  // Fallback: local storage (only works for admin seeded locally)
  const localUsers = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
  const u = localUsers.find(u => u.email === email);
  if (!u) return { success: false, error: 'No Sheets URL configured. Please contact Admin.' };
  if (u.status === 'INACTIVE') return { success: false, error: 'Account deactivated.' };

  const match = u.password === password || (u.isFirstLogin && u.tempPassword === password);
  if (!match) return { success: false, error: 'Invalid email or password.' };

  return { success: true, user: { id:u.id, name:u.name, email:u.email, role:u.role, status:u.status, isFirstLogin:u.isFirstLogin } };
}

// ── COMPLETE LOGIN ────────────────────────────────────────────────
function completeLogin(user) {
  APP.currentUser = user;
  Store.saveSession(user);
  initDashboard();
  renderQuote();
  showPage('page-quote');
}

// ── FIRST LOGIN — SET PASSWORD MODAL ─────────────────────────────
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

  if (newPass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass) { errEl.textContent = 'Passwords do not match.'; return; }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const cfg = Store.getSheetsConfig();
  let saved = false;

  if (cfg.webAppUrl) {
    const res = await Sheets.post('changePassword', {
      userId: APP.pendingUser.id,
      newPassword: newPass
    });
    saved = res?.success === true;
  } else {
    // Fallback: update local storage
    const localUsers = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
    const u = localUsers.find(u => u.id === APP.pendingUser.id);
    if (u) { u.password = newPass; u.tempPassword = ''; u.isFirstLogin = false; }
    localStorage.setItem('ff_local_users', JSON.stringify(localUsers));
    saved = true;
  }

  btn.disabled = false;
  btn.textContent = 'Set Password & Continue';

  if (!saved) { errEl.textContent = 'Failed to save. Please try again.'; return; }

  // Update pending user state and proceed
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
  document.getElementById('quote-text').textContent    = '"' + q.text + '"';
  document.getElementById('quote-author').textContent  = '— ' + q.author;
  document.getElementById('quote-greeting').textContent = getGreeting() + ', ' + (user?.name?.split(' ')[0] || 'Champion') + ' 👋';
}

// ── LOGOUT ────────────────────────────────────────────────────────
function logout() {
  Store.clearSession();
  APP.currentUser = null;
  showPage('page-login');
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  document.getElementById('ready-btn')?.addEventListener('click', () => showPage('page-dashboard'));
});
