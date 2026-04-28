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
      // Send via POST so password travels as JSON body - no URL encoding issues
      const r = await fetch(cfg.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const res = await r.json();
      if (res && res.success !== undefined) return res;
    } catch (e) {
      console.warn('Login error:', e);
    }
  }

  // Local fallback — admin only, when Sheets is unreachable
  const local = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
  const u     = local.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!u) {
    return {
      success: false,
      error: 'Cannot reach server. Check your internet connection.',
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
  // Show My Plan nav tab if user has a registered plan
  if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();

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
// Fetches: all admin content edits + user's own workout logs + run logs + plan progress
async function syncContentFromSheets() {
  const cfg  = Store.getSheetsConfig();
  const user = APP.currentUser;
  if (!cfg.webAppUrl) return;

  await Promise.all([
    _syncContent(),
    user ? _syncUserLogs(user.id)        : Promise.resolve(),
    user ? _syncUserRunLogs(user.id)     : Promise.resolve(),
    user ? _syncPlanProgress(user.id)    : Promise.resolve(),
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

async function _syncUserRunLogs(userId) {
  try {
    const res = await Sheets.get('getUserRunLogs', { userId });
    if (!res?.success || !Array.isArray(res.logs) || !res.logs.length) return;

    const local = Store.getRunLogs();
    let changed = false;
    res.logs.forEach(sheetLog => {
      // Deduplicate by date + planType + distance (close enough for runs)
      const exists = local.find(l =>
        l.userId   === sheetLog.userId &&
        l.date     === sheetLog.date   &&
        l.planType === sheetLog.planType &&
        Math.abs((l.distance||0) - (sheetLog.distance||0)) < 0.01
      );
      if (!exists) {
        local.push({ ...sheetLog, id: sheetLog.id || 'run_' + Date.now() + Math.random() });
        changed = true;
      }
    });
    if (changed) Store.set('ff_runlogs', local);
  } catch (e) {
    console.warn('Run log sync skipped:', e.message);
  }
}

async function _syncPlanProgress(userId) {
  try {
    // Sync active plan registration
    const planRes = await Sheets.get('getActivePlan', { userId });
    if (planRes?.success && planRes.plan) {
      const k = `ff_activeplan_${userId}`;
      const local = Store.get(k);
      // Only overwrite if Sheets has a plan and local doesn't, or planKey differs
      if (!local || local.planKey !== planRes.plan.planKey) {
        Store.set(k, {
          planKey:      planRes.plan.planKey,
          startDate:    planRes.plan.startDate    || '',
          registeredAt: planRes.plan.registeredAt
            ? new Date(planRes.plan.registeredAt).getTime()
            : Date.now(),
        });
        if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
      }
    }

    // Sync completed plan days
    const progRes = await Sheets.get('getPlanProgress', { userId });
    if (!progRes?.success || !Array.isArray(progRes.completedDays)) return;
    progRes.completedDays.forEach(d => {
      const key = `ff_pday_${userId}_${d.planKey}_w${d.week}_d${d.day}`;
      if (!Store.get(key)) {
        Store.set(key, {
          date: d.completedDate || '',
          dist: d.distanceKm   || 0,
          dur:  d.durationSec  || 0,
          ts:   d.completedDate ? new Date(d.completedDate).getTime() : Date.now(),
        });
      }
    });
  } catch (e) {
    console.warn('Plan progress sync skipped:', e.message);
  }
}

function _applyToAppData(key, value) {
  try {
    if (key === 'custom_quotes' && Array.isArray(value)) {
      APP_DATA.quotes = value;
    }
    if (key === 'announcement' && typeof renderAnnouncementBanner === 'function') {
      renderAnnouncementBanner();
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
  APP.currentUser = user;
  Store.saveSession(user);
  // New users get onboarding flow instead of direct dashboard
  if (user.role !== 'ADMIN') {
    if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
    startOnboarding();
  } else {
    completeLogin(user);
  }
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

// ── CHANGE PASSWORD (logged-in users & admin) ─────────────────────
function openChangePasswordModal() {
  // Close any open menus
  const menu = document.getElementById('profile-menu');
  if (menu) menu.style.display = 'none';

  // Reset all fields and state
  ['cp-current','cp-new','cp-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.type = 'password'; }
  });
  const errEl = document.getElementById('cp-error');
  if (errEl) errEl.textContent = '';
  const wrap = document.getElementById('cp-strength-wrap');
  if (wrap) wrap.style.display = 'none';

  // Wire up strength meter
  const newInput = document.getElementById('cp-new');
  if (newInput) {
    newInput.oninput = () => _updatePasswordStrength(newInput.value);
  }

  openModal('modal-change-password');
}

function toggleCpVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function _updatePasswordStrength(val) {
  const wrap  = document.getElementById('cp-strength-wrap');
  const bar   = document.getElementById('cp-strength-bar');
  const label = document.getElementById('cp-strength-label');
  if (!wrap || !bar || !label) return;

  if (!val) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  let score = 0;
  if (val.length >= 6)                    score++;
  if (val.length >= 10)                   score++;
  if (/[A-Z]/.test(val))                  score++;
  if (/[0-9]/.test(val))                  score++;
  if (/[^A-Za-z0-9]/.test(val))           score++;

  const levels = [
    { pct: 20,  color: '#ef5350', text: 'Very weak'  },
    { pct: 40,  color: '#ff7043', text: 'Weak'       },
    { pct: 60,  color: '#ffa726', text: 'Fair'       },
    { pct: 80,  color: '#66bb6a', text: 'Strong'     },
    { pct: 100, color: '#43a047', text: 'Very strong'},
  ];
  const level = levels[Math.min(score, 4)];
  bar.style.width      = level.pct + '%';
  bar.style.background = level.color;
  label.textContent    = level.text;
  label.style.color    = level.color;
}

async function submitChangePassword() {
  const currentPass = document.getElementById('cp-current').value.trim();
  const newPass     = document.getElementById('cp-new').value.trim();
  const confirmPass = document.getElementById('cp-confirm').value.trim();
  const errEl       = document.getElementById('cp-error');
  const btn         = document.getElementById('cp-submit-btn');

  errEl.textContent = '';

  // Client-side validations
  if (!currentPass)            { errEl.textContent = 'Please enter your current password.'; return; }
  if (!newPass)                { errEl.textContent = 'Please enter a new password.'; return; }
  if (newPass.length < 6)      { errEl.textContent = 'New password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass)  { errEl.textContent = 'New passwords do not match.'; return; }
  if (newPass === currentPass)  { errEl.textContent = 'New password must be different from current password.'; return; }

  // Verify current password by attempting login
  const user = APP.currentUser;
  btn.disabled = true; btn.textContent = 'Verifying…';

  const verify = await attemptLogin(user.email, currentPass);
  if (!verify.success) {
    btn.disabled = false; btn.textContent = 'Update Password';
    errEl.textContent = 'Current password is incorrect.';
    return;
  }

  btn.textContent = 'Saving…';

  let saved = false;
  const cfg = Store.getSheetsConfig();

  if (cfg.webAppUrl) {
    const res = await Sheets.post('changePassword', { userId: user.id, newPassword: newPass });
    saved = res?.success === true;
  } else {
    // Local fallback (admin only without Sheets)
    const local = JSON.parse(localStorage.getItem('ff_local_users') || '[]');
    const u = local.find(u => u.id === user.id);
    if (u) { u.password = newPass; u.tempPassword = ''; u.isFirstLogin = false; }
    localStorage.setItem('ff_local_users', JSON.stringify(local));
    saved = true;
  }

  btn.disabled = false; btn.textContent = 'Update Password';

  if (!saved) { errEl.textContent = 'Failed to save. Please try again.'; return; }

  closeModal('modal-change-password');
  showToast('Password updated successfully! 🔐', 'success');
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

// ════════════════════════════════════════════════════════════════
// ONBOARDING FLOW (new users after first password set)
// ════════════════════════════════════════════════════════════════
const ONBOARDING_STEPS = 3;
let _onboardStep = 1;
let _onboardData = { goal: '', modules: [] };

function startOnboarding() {
  _onboardStep = 1;
  _onboardData = { goal: '', modules: [] };
  renderOnboardingStep(1);
  showPage('page-onboarding', false);
}

function renderOnboardingStep(step) {
  const container = document.getElementById('onboarding-content');
  const user = APP.currentUser;

  if (step === 1) {
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Step 1 of 3</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:33%;height:100%;background:var(--g4);border-radius:2px"></div>
          </div>
          <div style="font-size:40px;margin-bottom:12px">👋</div>
          <div style="font-family:var(--font-display);font-size:36px;color:var(--g5);line-height:1.1;margin-bottom:8px">
            Welcome,<br>${user?.name?.split(' ')[0] || 'Champion'}!
          </div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:32px;line-height:1.6">
            Let's set you up in 3 quick steps so FitFlow Pro works perfectly for you.
          </div>
          <div style="font-size:14px;font-weight:700;margin-bottom:14px">What's your main fitness goal?</div>
          ${[
            { id:'lose_weight',   emoji:'🔥', label:'Lose Weight',         sub:'Burn fat, cardio focus' },
            { id:'build_muscle',  emoji:'💪', label:'Build Muscle',         sub:'Strength & gym training' },
            { id:'improve_fitness',emoji:'🏃',label:'Improve Fitness',      sub:'Cardio & endurance' },
            { id:'flexibility',   emoji:'🧘', label:'Flexibility & Calm',   sub:'Yoga & stretching' },
            { id:'run_race',      emoji:'🏅', label:'Train for a Race',     sub:'5K, 10K, Half or Full' },
            { id:'general',       emoji:'⚡', label:'General Wellness',     sub:'Mixed approach' },
          ].map(g => `
            <div onclick="selectOnboardGoal('${g.id}',this)"
              id="goal-${g.id}"
              style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;margin-bottom:10px;cursor:pointer;
                border:2px solid var(--border);background:var(--surface);transition:all .2s">
              <span style="font-size:26px;flex-shrink:0">${g.emoji}</span>
              <div>
                <div style="font-weight:700;font-size:15px">${g.label}</div>
                <div style="font-size:12px;color:var(--text3)">${g.sub}</div>
              </div>
            </div>`).join('')}
        </div>
        <button id="ob-next-1" class="btn btn-primary btn-full btn-lg" style="margin-top:20px;opacity:0.4" disabled onclick="goOnboardStep(2)">
          Continue →
        </button>
      </div>`;
  } else if (step === 2) {
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Step 2 of 3</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:66%;height:100%;background:var(--g4);border-radius:2px"></div>
          </div>
          <div style="font-size:40px;margin-bottom:12px">🏋️</div>
          <div style="font-family:var(--font-display);font-size:34px;color:var(--g5);line-height:1.1;margin-bottom:8px">Pick Your Modules</div>
          <div style="font-size:14px;color:var(--text2);margin-bottom:24px;line-height:1.5">Choose the activities you want to do. You can always change these later.</div>
          ${[
            { id:'cardio',     emoji:'🏠', name:'Home Cardio',      sub:'No equipment needed' },
            { id:'gym',        emoji:'🏋️', name:'Gym Workouts',     sub:'Weights & machines' },
            { id:'yoga',       emoji:'🧘', name:'Yoga',             sub:'Mind & body balance' },
            { id:'stretching', emoji:'🤸', name:'Stretching',       sub:'Flexibility & recovery' },
            { id:'running',    emoji:'🏃', name:'Running & Walking',sub:'GPS tracking + plans' },
          ].map(m => `
            <div onclick="toggleOnboardModule('${m.id}',this)"
              id="mod-${m.id}"
              style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:14px;margin-bottom:10px;cursor:pointer;
                border:2px solid var(--border);background:var(--surface);transition:all .2s">
              <span style="font-size:26px;flex-shrink:0">${m.emoji}</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:15px">${m.name}</div>
                <div style="font-size:12px;color:var(--text3)">${m.sub}</div>
              </div>
              <div id="mod-check-${m.id}" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s"></div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-ghost btn-full" onclick="goOnboardStep(1)">← Back</button>
          <button id="ob-next-2" class="btn btn-primary btn-full btn-lg" style="opacity:0.4" disabled onclick="goOnboardStep(3)">Continue →</button>
        </div>
      </div>`;
    // Re-select previously chosen modules
    _onboardData.modules.forEach(id => {
      const el = document.getElementById('mod-'+id);
      if (el) _applyModuleSelect(el, id, true);
    });
  } else if (step === 3) {
    const goalLabels = { lose_weight:'Lose Weight 🔥',build_muscle:'Build Muscle 💪',improve_fitness:'Improve Fitness 🏃',flexibility:'Flexibility & Calm 🧘',run_race:'Train for a Race 🏅',general:'General Wellness ⚡' };
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column;text-align:center">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:72px;margin-bottom:16px">🚀</div>
          <div style="font-family:var(--font-display);font-size:40px;color:var(--g5);margin-bottom:8px">You're All Set!</div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:32px;line-height:1.6">
            Here's your personalised FitFlow Pro setup:
          </div>
          <div class="card" style="text-align:left;margin-bottom:16px">
            <div class="info-row"><span class="lbl">Your Goal</span><span class="val">${goalLabels[_onboardData.goal]||_onboardData.goal}</span></div>
            <div class="info-row"><span class="lbl">Modules</span><span class="val">${_onboardData.modules.length} selected</span></div>
            <div class="info-row" style="border:none"><span class="lbl">Daily Reminder</span><span class="val">6:00 AM 🔔</span></div>
          </div>
          <div class="card card-sm" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.2)">
            <div style="font-size:13px;color:var(--accent)">💡 You can customise everything later from your profile and module settings.</div>
          </div>
        </div>
        <button class="btn btn-accent btn-full btn-lg" style="margin-top:32px" onclick="completeOnboarding()">
          💥 Start My Journey!
        </button>
      </div>`;
  }
}

function selectOnboardGoal(goalId, el) {
  _onboardData.goal = goalId;
  document.querySelectorAll('[id^="goal-"]').forEach(e => {
    e.style.borderColor = 'var(--border)';
    e.style.background  = 'var(--surface)';
  });
  el.style.borderColor = 'var(--g4)';
  el.style.background  = 'rgba(46,125,70,0.12)';
  const btn = document.getElementById('ob-next-1');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
}

function toggleOnboardModule(id, el) {
  const idx = _onboardData.modules.indexOf(id);
  const adding = idx < 0;
  if (adding) _onboardData.modules.push(id);
  else _onboardData.modules.splice(idx, 1);
  _applyModuleSelect(el, id, adding);
  const btn = document.getElementById('ob-next-2');
  if (btn) {
    const hasAny = _onboardData.modules.length > 0;
    btn.disabled = !hasAny;
    btn.style.opacity = hasAny ? '1' : '0.4';
  }
}

function _applyModuleSelect(el, id, selected) {
  el.style.borderColor = selected ? 'var(--g4)' : 'var(--border)';
  el.style.background  = selected ? 'rgba(46,125,70,0.12)' : 'var(--surface)';
  const check = document.getElementById('mod-check-'+id);
  if (check) {
    check.style.background   = selected ? 'var(--g4)' : 'transparent';
    check.style.borderColor  = selected ? 'var(--g4)' : 'var(--border)';
    check.innerHTML          = selected ? '<span style="color:white;font-size:13px;font-weight:700">✓</span>' : '';
  }
}

function goOnboardStep(step) {
  _onboardStep = step;
  renderOnboardingStep(step);
}

function completeOnboarding() {
  // Save goal + module prefs to localStorage
  const user = APP.currentUser;
  Store.set('ff_onboard_' + user.id, { goal: _onboardData.goal, modules: _onboardData.modules, date: todayStr() });

  // Save preferred module order based on selections
  if (_onboardData.modules.length > 0 && typeof saveModuleOrder === 'function') {
    const ALL = ['cardio','gym','yoga','stretching','running'];
    const ordered = [
      ..._onboardData.modules,
      ...ALL.filter(m => !_onboardData.modules.includes(m)),
    ];
    saveModuleOrder(user.id, ordered.map(id => ({ id })));
  }

  // Init push
  if (typeof initPushNotifications === 'function') initPushNotifications();

  showPage('page-quote', false);
  renderQuote();
}
