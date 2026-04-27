// ── LOGIN ────────────────────────────────────────────────────────
function initLogin() {
  const form = document.getElementById('login-form');
  const emailIn = document.getElementById('login-email');
  const passIn = document.getElementById('login-password');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailIn.value.trim().toLowerCase();
    const pass = passIn.value.trim();
    if (!email || !pass) { errEl.textContent = 'Please enter email and password.'; return; }

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    errEl.textContent = '';

    // Try Sheets first if configured
    let user = null;
    const cfg = Store.getSheetsConfig();
    if (cfg.webAppUrl) {
      try {
        const res = await sheetsPost('login', { email, password: pass });
        if (res && res.success) user = res.user;
      } catch {}
    }

    // Fall back to local
    if (!user) {
      user = Store.getUserByEmail(email);
      if (!user || user.password !== pass) user = null;
    }

    btn.disabled = false;
    btn.textContent = 'Sign In';

    if (!user || user.status === 'INACTIVE') {
      errEl.textContent = user ? '⚠️ Your account has been deactivated.' : '⚠️ Invalid email or password.';
      passIn.value = '';
      return;
    }

    APP.currentUser = user;
    Store.saveSession(user);
    initDashboard();
    renderQuote();
    showPage('page-quote');
  });

  // Toggle password
  document.getElementById('toggle-pass')?.addEventListener('click', () => {
    passIn.type = passIn.type === 'password' ? 'text' : 'password';
  });
}

// ── QUOTE PAGE ────────────────────────────────────────────────────
function renderQuote() {
  const user = APP.currentUser;
  const quotes = APP_DATA.quotes;
  const q = quotes[Math.floor(Math.random() * quotes.length)];

  document.getElementById('quote-text').textContent = '"' + q.text + '"';
  document.getElementById('quote-author').textContent = '— ' + q.author;
  document.getElementById('quote-greeting').textContent =
    getGreeting() + ', ' + (user?.name?.split(' ')[0] || 'Champion') + ' 👋';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();

  document.getElementById('ready-btn')?.addEventListener('click', () => {
    showPage('page-dashboard');
  });
});
