// ── LOGIN ─────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// THEME — Light mode for admin only (with toggle preference)
// ════════════════════════════════════════════════════════════════
function applyAdminTheme() {
  const user = APP.currentUser;
  const html = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  if (user && user.role === 'ADMIN') {
    // Admin: check saved preference, default to LIGHT
    const pref = localStorage.getItem('ff_admin_theme') || 'dark';
    if (pref === 'light') {
      html.classList.add('theme-light');
      if (themeMeta) themeMeta.setAttribute('content', '#f4f7f5');
    } else {
      html.classList.remove('theme-light');
      if (themeMeta) themeMeta.setAttribute('content', '#071510');
    }
  } else {
    // Non-admin: always dark
    html.classList.remove('theme-light');
    if (themeMeta) themeMeta.setAttribute('content', '#071510');
  }

  // Belt-and-suspenders: force-hide the admin Dark Mode toggle for non-admins.
  // This guards against any stale inline `display:flex` left over from a prior
  // admin session in the same browser (e.g. admin logs out, user logs in
  // without a hard refresh).
  const themeToggleBtn = document.getElementById('admin-theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.style.display = (user && user.role === 'ADMIN') ? 'flex' : 'none';
  }
}

function toggleAdminTheme() {
  const user = APP.currentUser;
  if (!user || user.role !== 'ADMIN') return;
  const html = document.documentElement;
  const isLight = html.classList.contains('theme-light');
  const newPref = isLight ? 'dark' : 'light';
  localStorage.setItem('ff_admin_theme', newPref);
  applyAdminTheme();
  if (typeof refreshAdminThemeToggle === 'function') refreshAdminThemeToggle();
  if (typeof showToast === 'function') {
    showToast(newPref === 'light' ? '☀️ Light mode' : '🌙 Dark mode', 'info');
  }
}



// ── SESSION VALIDATION ────────────────────────────────────────────
// Checks if current session is still valid (not logged in elsewhere)
// Called on app load and periodically

async function validateCurrentSession() {
  const session = Store.getSession();
  if (!session || !session.id || !session.sessionToken) return true; // No session to validate

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) return true; // Offline — assume valid

  try {
    const qs = new URLSearchParams({
      action:       'validateSession',
      userId:       session.id,
      sessionToken: session.sessionToken,
    }).toString();
    const r    = await fetch(`${cfg.webAppUrl}?${qs}`);
    const text = await r.text();
    const res  = JSON.parse(text);
    if (res && res.valid === false) {
      // Session invalid — logged in elsewhere
      _handleSessionExpired();
      return false;
    }
    return true;
  } catch (e) {
    return true; // Network error — assume valid, don't log out
  }
}

function _handleSessionExpired() {
  // Clear local session
  Store.clearSession();
  APP.currentUser = null;

  // Show friendly message
  showToast('⚠️ You have been logged in on another device. Please login again.', 'error', 5000);

  // Redirect to login after short delay
  setTimeout(() => {
    showPage('page-login', false);
  }, 2000);
}

// Start periodic session validation every 5 minutes
function _startSessionValidation() {
  if (!Store.getSession()?.sessionToken) return;
  setInterval(async () => {
    await validateCurrentSession();
  }, 5 * 60 * 1000); // every 5 minutes
}

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
      // Map cryptic server errors to user-friendly messages
      let msg = result.error || 'Login failed. Please try again.';
      if (msg.toLowerCase().includes('invalid time') ||
          msg.toLowerCase().includes('typeerror') ||
          msg.toLowerCase().includes('cannot read')) {
        msg = 'Server error. Please try again in a moment.';
      }
      errEl.textContent = '⚠️ ' + msg;
      passIn.value = '';
      return;
    }

    const user = result.user;
    if (user.isFirstLogin) {
      APP.pendingUser = user;
      openSetPasswordModal();
    } else {
      completeLogin(user, result.sessionToken);
    }  });
}

// ── ATTEMPT LOGIN (Sheets → local fallback) ───────────────────────
async function attemptLogin(email, password) {
  const cfg = Store.getSheetsConfig();

  if (cfg.webAppUrl) {
    try {
      // Use GET with pwcodes — Apps Script supports GET with CORS
      // POST with Content-Type:application/json triggers CORS preflight which Apps Script blocks
      const pwCodes = Array.from(password).map(c => c.charCodeAt(0)).join('-');
      const qs = new URLSearchParams({ action: 'login', email: email.trim().toLowerCase(), pwcodes: pwCodes }).toString();
      const r = await fetch(`${cfg.webAppUrl}?${qs}`);

      // Guard against Apps Script returning HTML error page instead of JSON
      const text = await r.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch {
        console.warn('[Login] Non-JSON response:', text.substring(0, 300));
        return { success: false, error: 'Server error. Please try again.' };
      }

      if (res && res.success !== undefined) return res;
      return { success: false, error: res?.error || 'Login failed. Please try again.' };
    } catch (e) {
      console.warn('[Login] Network error:', e.message);
      return { success: false, error: 'Connection failed. Check your internet and try again.' };
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
function completeLogin(user, sessionToken) {
  try {
    // Save session token for single-device validation
    if (sessionToken) user.sessionToken = sessionToken;
    APP.currentUser = user;
    Store.saveSession(user);
    // Sync then re-render so data appears immediately after login (not stale empty state)
    syncContentFromSheets().then(() => {
      if (typeof refreshDashboard === 'function') refreshDashboard();
      if (APP.currentPage === 'page-history-global' && typeof renderGlobalHistory === 'function') renderGlobalHistory();
    });
    _autoSeedIfVersionChanged(user);
    if (typeof _autoDedupOnLogin === 'function') _autoDedupOnLogin();

    if (user.role === 'ADMIN') {
      initDashboard();
      showPage('page-admin');
      renderAdminPanel();
      return;
    }

    if (typeof initPushNotifications === 'function') initPushNotifications();
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
  } catch (err) {
    console.error('[FitFlow] completeLogin error:', err);
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = '⚠️ ' + err.message;
    const btn = document.getElementById('login-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
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
    user ? _syncCustomWorkouts(user.id)  : Promise.resolve(),
    user ? _syncUserProfile(user.id)     : Promise.resolve(),  // body stats, weights, achievements
  ]);
}

// ── SYNC CUSTOM WORKOUTS FROM SHEETS ─────────────────────────────
// Restores user-created custom workouts after reinstall / cache clear.
// Only adds workouts that don't already exist locally — never overwrites.
async function _syncCustomWorkouts(userId) {
  try {
    const res = await Sheets.get('getCustomWorkouts', { userId });
    if (!res?.success || !Array.isArray(res.workouts) || !res.workouts.length) return;
    // CW object is defined in custom-workouts.js — guard in case it loads late
    if (typeof CW === 'undefined') return;
    const local = CW.getAll(userId);
    let changed = false;
    res.workouts.forEach(w => {
      if (!local.find(l => l.id === w.id)) {
        local.push(w);
        changed = true;
      }
    });
    if (changed) {
      CW.save(userId, local);
      // Refresh the custom workouts badge on dashboard if visible
      if (typeof refreshDashboardBadges === 'function') refreshDashboardBadges();
    }
  } catch (e) {
    console.warn('Custom workouts sync skipped:', e.message);
  }
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
  // STRATEGY: Sheet is source of truth. REPLACE local logs entirely with Sheet's copy.
  // This eliminates duplicate accumulation across refreshes.
  try {
    const res = await Sheets.get('getUserLogs', { userId });
    if (!res?.success || !Array.isArray(res.logs)) return;

    // Helper: derive LOCAL date from timestamp (fixes UTC bug for old logs)
    const tsToLocal = (ts) => {
      if (!ts) return null;
      const d = new Date(ts);
      if (isNaN(d.getTime())) return null;
      return d.getFullYear() + '-' +
        String(d.getMonth()+1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0');
    };

    // Normalize each Sheet log: prefer date derived from timestamp
    const fromSheet = res.logs.map(sl => ({
      ...sl,
      date: tsToLocal(sl.timestamp) || sl.date,
      id:   sl.id || ('log_' + Date.now() + Math.random()),
    }));

    // Get all local logs across all users (we only replace THIS user's logs)
    const allLocal = Store.get('ff_logs', []) || [];
    const otherUsers = allLocal.filter(l => l.userId !== userId);

    // Replace this user's logs with Sheet's copy (deduplicated by userId+module+date)
    const seen = new Set();
    const myLogs = [];
    fromSheet.forEach(sl => {
      const key = (sl.userId||'') + '|' + (sl.module||'') + '|' + (sl.date||'');
      if (seen.has(key)) return;
      seen.add(key);
      myLogs.push(sl);
    });

    Store.set('ff_logs', [...otherUsers, ...myLogs]);
  } catch (e) {
    console.warn('Log sync skipped:', e.message);
  }
}

async function _syncUserRunLogs(userId) {
  // REPLACE strategy: Sheet is source of truth.
  try {
    const res = await Sheets.get('getUserRunLogs', { userId });
    if (!res?.success || !Array.isArray(res.logs)) return;

    const tsToLocal = (ts) => {
      if (!ts) return null;
      const d = new Date(ts);
      if (isNaN(d.getTime())) return null;
      return d.getFullYear() + '-' +
        String(d.getMonth()+1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0');
    };

    const fromSheet = res.logs.map(r => ({
      ...r,
      date: tsToLocal(r.timestamp) || r.date,
      id:   r.id || ('run_' + Date.now() + Math.random()),
    }));

    const allLocal = Store.get('ff_runlogs', []) || [];
    const otherUsers = allLocal.filter(l => l.userId !== userId);

    // Dedup by id, then by (userId|date|distance)
    const seenIds = new Set();
    const seenKeys = new Set();
    const myRuns = [];
    fromSheet.forEach(r => {
      if (r.id && seenIds.has(r.id)) return;
      const key = (r.userId||'') + '|' + (r.date||'') + '|' + Math.round((r.distance||0)*100);
      if (seenKeys.has(key)) return;
      if (r.id) seenIds.add(r.id);
      seenKeys.add(key);
      myRuns.push(r);
    });

    Store.set('ff_runlogs', [...otherUsers, ...myRuns]);
  } catch (e) {
    console.warn('Run log sync skipped:', e.message);
  }
}

async function _syncUserProfile(userId) {
  // Restore all user data that was only in localStorage
  // Body stats, weight history, achievements, overload weights,
  // cali skill/challenge progress, module order
  try {
    const res = await Sheets.get('getAllContent');
    if (!res?.success || !res.content) return;
    const c = res.content;

    // Body stats
    const bodyKey = 'body_profile_' + userId;
    if (c[bodyKey]) {
      Store.set('ff_body_profile_' + userId, c[bodyKey]);
    }

    // Weight history
    const wLogKey = 'weight_log_' + userId;
    if (c[wLogKey] && Array.isArray(c[wLogKey])) {
      Store.set('ff_weight_log_' + userId, c[wLogKey]);
    }

    // Workout achievements
    const wAchKey = 'w_achievements_' + userId;
    if (c[wAchKey]) {
      Store.set('ff_w_achievements_' + userId, c[wAchKey]);
    }

    // Running achievements (already synced via achievements_userId key)
    const rAchKey = 'achievements_' + userId;
    if (c[rAchKey]) {
      Store.set('ff_achievements_' + userId, c[rAchKey]);
    }

    // PBs per activity type
    ['run','walk','cycle'].forEach(type => {
      const pbKey = 'pbs_' + userId + '_' + type;
      if (c[pbKey]) Store.set('ff_pbs_' + userId + '_' + type, c[pbKey]);
    });

    // Calisthenics skill progress (all skill keys)
    Object.entries(c).forEach(([key, value]) => {
      if (key.startsWith('cali_skill_' + userId + '_')) {
        const skillKey = key.replace('cali_skill_' + userId + '_', '');
        Store.set('ff_skill_progress_' + userId + '_' + skillKey, value);
      }
      if (key === 'cali_challenge_' + userId) {
        Store.set('ff_cali_challenge_' + userId, value);
      }
      if (key === 'module_order_' + userId) {
        Store.set('ff_module_order_' + userId, value);
      }
      // Progressive overload weights (pl_userId_module_exercise)
      if (key.startsWith('pl_' + userId + '_')) {
        Store.set('ff_' + key, value);
      }
    });
  } catch (e) {
    console.warn('Profile sync skipped:', e.message);
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
    if (exMatch && value?.days) {
      // Only apply if Sheets data has actual exercises (not empty)
      const hasContent = Object.values(value.days).some(d => Array.isArray(d) && d.length > 0);
      if (hasContent && APP_DATA.modules[exMatch[1]]) {
        // Guard: don't overwrite built-in data if Sheets has dramatically fewer exercises
        const sheetTotal   = Object.values(value.days).reduce((s, d) => s + (Array.isArray(d) ? d.length : 0), 0);
        const builtinTotal = Object.values(APP_DATA.modules[exMatch[1]].days || {}).reduce((s, d) => s + (Array.isArray(d) ? d.length : 0), 0);
        if (sheetTotal > 0 && (builtinTotal === 0 || sheetTotal >= builtinTotal * 0.5)) {
          APP_DATA.modules[exMatch[1]].days = value.days;
        }
      }
    }
    const wuMatch = key.match(/^warmup_(.+)$/);
    if (wuMatch && Array.isArray(value) && value.length > 0) {
      APP_DATA.warmups[wuMatch[1]] = value;
    }
    const cdMatch = key.match(/^cooldown_(.+)$/);
    if (cdMatch && Array.isArray(value) && value.length > 0) {
      APP_DATA.cooldowns[cdMatch[1]] = value;
    }
  } catch { /* silently ignore */ }
}

// ── AUTO-SEED DATA VERSION ───────────────────────────────────────
// Runs on every login. If data.js DATA_VERSION is newer than what
// Sheets has, pushes all exercises/warmups/cooldowns to Sheets
// automatically — no manual admin action needed.
async function _autoSeedIfVersionChanged(user) {
  try {
    const currentVersion = (typeof DATA_VERSION !== 'undefined') ? DATA_VERSION : null;
    if (!currentVersion) return;

    const storedVersion = Store.get('ff_data_version');
    if (storedVersion === currentVersion) return;

    // Clear stale localStorage exercise/warmup/cooldown cache before seeding
    ['cardio','gym','yoga','stretching','running','calisthenics'].forEach(mod => {
      Store.remove('ff_content_exercises_' + mod);
      Store.remove('ff_content_warmup_' + mod);
      Store.remove('ff_content_cooldown_' + mod);
    });

    // Version mismatch — push all module data to Sheets
    console.log('[FitFlow] Data version changed to', currentVersion, '— seeding Sheets...');

    const modules = ['cardio', 'gym', 'yoga', 'stretching'];
    const seedPromises = [];

    // Seed exercises for each module
    modules.forEach(mod => {
      const days = APP_DATA.modules?.[mod]?.days;
      if (days && Object.keys(days).length > 0) {
        seedPromises.push(
          Sheets.post('saveContent', { key: 'exercises_' + mod, value: { days } })
            .then(() => {
              Store.setContent('exercises_' + mod, { days });
              console.log('[FitFlow] Seeded exercises_' + mod);
            })
            .catch(e => console.warn('[FitFlow] Seed failed for exercises_' + mod, e.message))
        );
      }
    });

    // Seed calisthenics levels separately
    const caliLevels = APP_DATA.modules?.calisthenics?.levels || {};
    [1,2,3].forEach(lvl => {
      const days = caliLevels[lvl]?.days;
      if (days) {
        const key = 'exercises_calisthenics_l' + lvl;
        seedPromises.push(
          Sheets.post('saveContent', { key, value: { days } })
            .then(() => Store.setContent(key, { days }))
            .catch(() => {})
        );
      }
    });

    // Seed warmups
    const warmupMods = ['cardio','gym','yoga','running','stretching','calisthenics','core'];
    warmupMods.forEach(mod => {
      const wu = APP_DATA.warmups?.[mod];
      if (wu?.length) {
        seedPromises.push(
          Sheets.post('saveContent', { key: 'warmup_' + mod, value: wu })
            .then(() => {
              Store.setContent('warmup_' + mod, wu);
            })
            .catch(() => {})
        );
      }
    });

    // Seed cooldowns
    warmupMods.forEach(mod => {
      const cd = APP_DATA.cooldowns?.[mod];
      if (cd?.length) {
        seedPromises.push(
          Sheets.post('saveContent', { key: 'cooldown_' + mod, value: cd })
            .then(() => {
              Store.setContent('cooldown_' + mod, cd);
            })
            .catch(() => {})
        );
      }
    });

    await Promise.allSettled(seedPromises);

    // Mark version as seeded
    Store.set('ff_data_version', currentVersion);
    console.log('[FitFlow] Auto-seed complete for version', currentVersion);

  } catch (e) {
    console.warn('[FitFlow] Auto-seed error:', e.message);
  }
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
// Rotating emoji + date-based deterministic quote selection
const _QUOTE_EMOJIS = ["💪", "🔥", "⚡", "🏆", "🎯", "🚀", "⭐", "💯", "🌟", "✨", "💥", "🏋️", "🏃", "🤸", "🧘", "☀️", "🌅", "👊", "🦁", "⚔️"];

function renderQuote() {
  const user   = APP.currentUser;
  const quotes = APP_DATA.quotes;
  if (!quotes?.length) return;

  // Date-based deterministic selection — same day shows same quote (across reloads),
  // but quote rotates each day so users don't see repeats
  const today  = new Date();
  const dayKey = today.getFullYear() * 1000 + (today.getMonth() + 1) * 31 + today.getDate();

  // Use a per-user offset so two users on the same day see different quotes
  const userId = user?.id || 'anon';
  let userHash = 0;
  for (let i = 0; i < userId.length; i++) userHash = ((userHash << 5) - userHash + userId.charCodeAt(i)) | 0;

  const quoteIdx  = Math.abs(dayKey + userHash) % quotes.length;
  const emojiIdx  = Math.abs(dayKey + userHash * 7) % _QUOTE_EMOJIS.length;

  const q = quotes[quoteIdx];

  // Update quote text
  const textEl   = document.getElementById('quote-text');
  const authorEl = document.getElementById('quote-author');
  const greetEl  = document.getElementById('quote-greeting');

  if (textEl) textEl.textContent = '"' + q.text + '"';
  // Hide the author element entirely — no longer used
  if (authorEl) authorEl.style.display = 'none';
  if (greetEl) greetEl.textContent = getGreeting() + ', ' + (user?.name?.split(' ')[0] || 'Champion') + ' 👋';

  // Rotate the big emoji above the quote
  const emojiEl = document.querySelector('#page-quote .quote-emoji, #page-quote [data-quote-emoji]');
  if (emojiEl) {
    emojiEl.textContent = _QUOTE_EMOJIS[emojiIdx];
  } else {
    // Fallback: find the inline-styled big emoji div before #quote-text
    const t = textEl;
    if (t) {
      let prev = t.previousElementSibling;
      // The emoji is rendered as a div with font-size:56px right before quote-text
      while (prev) {
        if (prev.tagName === 'DIV' && prev.style && prev.style.fontSize && prev.style.fontSize.indexOf('56') >= 0) {
          prev.textContent = _QUOTE_EMOJIS[emojiIdx];
          break;
        }
        prev = prev.previousElementSibling;
      }
    }
  }
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

  // Detect Google-only user (no password set)
  const user = APP.currentUser;
  const isGoogleUser = user?.id?.startsWith('u_g_') || user?.authType === 'google';
  const currentBlock = document.getElementById('cp-current-block');
  const googleNote   = document.getElementById('cp-google-note');
  const modalSubtitle = document.getElementById('cp-subtitle');

  if (currentBlock) currentBlock.style.display = isGoogleUser ? 'none' : '';
  if (googleNote)   googleNote.style.display   = isGoogleUser ? '' : 'none';
  if (modalSubtitle) {
    modalSubtitle.textContent = isGoogleUser
      ? 'You signed in with Google. Set an app password to also enable email login.'
      : 'Enter your current password to confirm, then set a new one.';
  }
  const submitBtn = document.getElementById('cp-submit-btn');
  if (submitBtn) submitBtn.textContent = isGoogleUser ? 'Set App Password' : 'Update Password';

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

  const user = APP.currentUser;
  const isGoogleUser = user?.id?.startsWith('u_g_') || user?.authType === 'google';

  // Validations
  if (!isGoogleUser && !currentPass) { errEl.textContent = 'Please enter your current password.'; return; }
  if (!newPass)                      { errEl.textContent = 'Please enter a new password.'; return; }
  if (newPass.length < 6)            { errEl.textContent = 'New password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass)       { errEl.textContent = 'New passwords do not match.'; return; }
  if (!isGoogleUser && newPass === currentPass) { errEl.textContent = 'New password must be different from current password.'; return; }

  btn.disabled = true;

  if (!isGoogleUser) {
    // Normal user — verify current password first
    btn.textContent = 'Verifying…';
    const verify = await attemptLogin(user.email, currentPass);
    if (!verify.success) {
      btn.disabled = false; btn.textContent = 'Update Password';
      errEl.textContent = 'Current password is incorrect.';
      return;
    }
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
  if (isGoogleUser) {
    // Update session to reflect they now have a password
    const session = Store.getSession();
    if (session) { session.authType = 'google_with_password'; Store.saveSession(session); }
    if (APP.currentUser) APP.currentUser.authType = 'google_with_password';
    showToast('App password set! You can now also log in with email. 🔐', 'success');
  } else {
    showToast('Password updated successfully! 🔐', 'success');
  }
}

// ── LOGOUT ────────────────────────────────────────────────────────
function logout() {
  // Reset theme to dark on logout
  document.documentElement.classList.remove('theme-light');
  const tm = document.querySelector('meta[name="theme-color"]');
  if (tm) tm.setAttribute('content', '#071510');
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
let _onboardData = { goal: '', modules: [], age: '', weight: '', height: '', gender: '', fitnessLevel: '' };

function startOnboarding() {
  // For Google users — start at step 0 (set username + password)
  // For email users — start at step 1 (already have name + password)
  const isGoogleUser = APP.currentUser?.authType === 'google';
  _onboardStep = isGoogleUser ? 0 : 1;
  _onboardData = {
    name: APP.currentUser?.name || '',
    password: '',
    goal: '', modules: [],
    age: '', weight: '', height: '', gender: '', fitnessLevel: ''
  };
  renderOnboardingStep(_onboardStep);
  showPage('page-onboarding', false);
}

function renderOnboardingStep(step) {
  const container = document.getElementById('onboarding-content');
  const user = APP.currentUser;
  // Helper: dynamic step label based on user type
  const isG = APP.currentUser?.authType === 'google' || APP.currentUser?.authType === 'google_with_password';
  const totalSteps = isG ? 4 : 3;
  const labelStep = function(uiStep) {
    // uiStep is 1, 2, 3 in the original onboarding (without the new step 0)
    // For Google users: uiStep 1 → "Step 2 of 4", uiStep 2 → "Step 3 of 4", uiStep 3 → "Step 4 of 4"
    // For email users: uiStep 1 → "Step 1 of 3", etc.
    const displayStep = isG ? uiStep + 1 : uiStep;
    return 'Step ' + displayStep + ' of ' + totalSteps;
  };
  const stepProgress = function(uiStep) {
    const displayStep = isG ? uiStep + 1 : uiStep;
    return Math.round((displayStep / totalSteps) * 100);
  };

  if (step === 0) {
    // STEP 0 (Google users only) — Set username + app password
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Step 1 of 4</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:25%;height:100%;background:var(--g4);border-radius:2px"></div>
          </div>
          <div style="font-size:40px;margin-bottom:12px">🔐</div>
          <div style="font-family:var(--font-display);font-size:34px;color:var(--g5);line-height:1.1;margin-bottom:8px">Set Up Your Profile</div>
          <div style="font-size:14px;color:var(--text2);margin-bottom:24px;line-height:1.55">
            You signed in with Google. Pick a display name and set an app password — you can also log in with email + password later.
          </div>

          <label style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Display Name</label>
          <input type="text" id="ob-name" placeholder="Your name"
            value="${(user?.name || '').replace(/"/g, '&quot;')}"
            oninput="_validateOb0()"
            style="width:100%;padding:14px 16px;border:2px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;font-size:15px;margin-bottom:18px;outline:none">

          <label style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">App Password</label>
          <input type="password" id="ob-password" placeholder="At least 6 characters"
            oninput="_validateOb0()"
            style="width:100%;padding:14px 16px;border:2px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;font-size:15px;margin-bottom:6px;outline:none">
          <div id="ob-pw-strength" style="font-size:11px;color:var(--text3);margin-bottom:14px;height:14px"></div>

          <label style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Confirm Password</label>
          <input type="password" id="ob-password-confirm" placeholder="Re-enter your password"
            oninput="_validateOb0()"
            style="width:100%;padding:14px 16px;border:2px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;font-size:15px;margin-bottom:6px;outline:none">
          <div id="ob-pw-error" style="font-size:12px;color:#ff7878;margin-bottom:14px;height:16px"></div>

          <div style="font-size:12px;color:var(--text3);background:rgba(67,160,90,0.08);border:1px solid rgba(67,160,90,0.2);padding:12px 14px;border-radius:10px;line-height:1.5">
            💡 Your app password lets you log in with email + password if Google is unavailable. Keep it safe.
          </div>
        </div>
        <button id="ob-next-0" class="btn btn-primary btn-full btn-lg" style="margin-top:20px;opacity:0.4" disabled onclick="_submitOb0()">
          Continue →
        </button>
      </div>`;
    setTimeout(_validateOb0, 100);
  } else if (step === 1) {
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">${labelStep(1)}</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:${stepProgress(1)}%;height:100%;background:var(--g4);border-radius:2px"></div>
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
    // Auto-select all modules and move forward immediately
    const ALL_MOD_IDS = ['cardio','gym','yoga','stretching','running','calisthenics','core'];
    _onboardData.modules = [...ALL_MOD_IDS];
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">${labelStep(2)}</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:${stepProgress(2)}%;height:100%;background:var(--g4);border-radius:2px"></div>
          </div>
          <div style="font-size:40px;margin-bottom:16px">🏋️</div>
          <div style="font-family:var(--font-display);font-size:34px;color:var(--g5);line-height:1.1;margin-bottom:12px">Your Full Fitness Suite</div>
          <div style="font-size:14px;color:var(--text2);margin-bottom:28px;line-height:1.6">
            You get access to <strong>all 7 modules</strong> right from the start. No restrictions, no locked content.
          </div>
          ${[
            { emoji:'🏠',   name:'Home Cardio',       sub:'No equipment needed' },
            { emoji:'🏋️',  name:'Gym Workouts',       sub:'Weights & machines' },
            { emoji:'🧘',   name:'Yoga',               sub:'Mind & body balance' },
            { emoji:'🤸',   name:'Stretching',         sub:'Flexibility & recovery' },
            { emoji:'🏃',   name:'Running & Walking',  sub:'GPS tracking + plans' },
            { emoji:'🤸‍♂️', name:'Calisthenics', sub:'Bodyweight skills & progressions' },
            { emoji:'🔥',   name:'Core & Abs',         sub:'6-day ab workout programme' },
          ].map(m => `
            <div style="display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:14px;margin-bottom:8px;
              border:1.5px solid var(--g4);background:rgba(67,160,90,0.06)">
              <span style="font-size:24px;flex-shrink:0">${m.emoji}</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${m.name}</div>
                <div style="font-size:11px;color:var(--text3)">${m.sub}</div>
              </div>
              <div style="width:20px;height:20px;border-radius:50%;background:var(--g3);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span style="font-size:11px;color:#fff">✓</span>
              </div>
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-ghost btn-full" onclick="goOnboardStep(1)">← Back</button>
          <button class="btn btn-primary btn-full btn-lg" onclick="goOnboardStep(2.5)">Continue →</button>
        </div>
      </div>`;
  } else if (step === 2.5) {
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg));min-height:100vh;padding:48px 24px 32px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">${labelStep(3)}</div>
          <div style="height:4px;background:var(--bg3);border-radius:2px;margin-bottom:32px">
            <div style="width:75%;height:100%;background:var(--g4);border-radius:2px"></div>
          </div>
          <div style="font-size:40px;margin-bottom:12px">📊</div>
          <div style="font-family:var(--font-display);font-size:34px;color:var(--g5);line-height:1.1;margin-bottom:8px">Your Body Stats</div>
          <div style="font-size:14px;color:var(--text2);margin-bottom:24px;line-height:1.5">
            Used to personalise your heart rate zones, calorie estimates and workout intensity. Stored only on your device.
          </div>

          <!-- Age -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">Age <span style="color:var(--text3);font-weight:400">(required for heart rate zones)</span></div>
            <div style="display:flex;align-items:center;gap:12px">
              <input type="range" id="ob-age" min="16" max="75" value="${_onboardData.age || 25}" step="1"
                oninput="document.getElementById('ob-age-val').textContent=this.value;_onboardData.age=+this.value;_checkOb25()"
                style="flex:1">
              <div style="min-width:48px;text-align:center">
                <div id="ob-age-val" style="font-size:24px;font-weight:500;color:var(--g5)">${_onboardData.age || 25}</div>
                <div style="font-size:11px;color:var(--text3)">years</div>
              </div>
            </div>
          </div>

          <!-- Gender -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">Biological sex <span style="color:var(--text3);font-weight:400">(for calorie calculation)</span></div>
            <div style="display:flex;gap:10px">
              ${[['male','Male'],['female','Female'],['other','Prefer not to say']].map(([v,l]) => `
                <div onclick="selectObGender('${v}',this)" id="ob-gender-${v}"
                  style="flex:1;text-align:center;padding:10px 8px;border-radius:12px;border:2px solid var(--border);background:var(--surface);cursor:pointer;font-size:13px;font-weight:500;transition:all .2s">
                  ${l}
                </div>`).join('')}
            </div>
          </div>

          <!-- Weight -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">Current weight</div>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="number" id="ob-weight" placeholder="e.g. 70" min="30" max="200"
                value="${_onboardData.weight || ''}"
                oninput="_onboardData.weight=+this.value;_checkOb25()"
                style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:16px">
              <span style="font-size:14px;color:var(--text3);font-weight:500">kg</span>
            </div>
          </div>

          <!-- Height -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">Height</div>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="number" id="ob-height" placeholder="e.g. 170" min="100" max="250"
                value="${_onboardData.height || ''}"
                oninput="_onboardData.height=+this.value;_checkOb25()"
                style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:16px">
              <span style="font-size:14px;color:var(--text3);font-weight:500">cm</span>
            </div>
          </div>

          <!-- Fitness level -->
          <div style="margin-bottom:16px">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px">Current fitness level</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${[
                ['beginner',     '🐣 Beginner',     'New to exercise or returning after a long break'],
                ['intermediate', '💪 Intermediate',  'Exercise 2–3 times a week regularly'],
                ['advanced',     '🔥 Advanced',      'Train 4+ times a week, strong base fitness'],
              ].map(([v,l,s]) => `
                <div onclick="selectObFitness('${v}',this)" id="ob-fit-${v}"
                  style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:2px solid var(--border);background:var(--surface);cursor:pointer;transition:all .2s">
                  <div style="flex:1">
                    <div style="font-weight:700;font-size:14px">${l}</div>
                    <div style="font-size:12px;color:var(--text3)">${s}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <div style="font-size:11px;color:var(--text3);line-height:1.5;margin-top:4px">
            🔒 All data stored locally on your device only. You can update it anytime in your profile.
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-ghost btn-full" onclick="goOnboardStep(2)">← Back</button>
          <button id="ob-next-25" class="btn btn-primary btn-full btn-lg" style="opacity:0.4" disabled onclick="goOnboardStep(3)">Continue →</button>
        </div>
      </div>`;

    // Restore selections if going back
    if (_onboardData.gender) { const el = document.getElementById('ob-gender-'+_onboardData.gender); if (el) _applyObSelect(el, true); }
    if (_onboardData.fitnessLevel) { const el = document.getElementById('ob-fit-'+_onboardData.fitnessLevel); if (el) _applyObSelect(el, true); }
    // FIX: Age slider always has a value (default 25) — initialize _onboardData.age immediately
    // so the proceed button is enabled from the moment the user lands on this step.
    if (!_onboardData.age) {
      const ageEl = document.getElementById('ob-age');
      if (ageEl) _onboardData.age = +ageEl.value || 25;
    }
    _checkOb25();
    _checkOb25();

  } else if (step === 3) {
    const goalLabels = { lose_weight:'Lose Weight 🔥',build_muscle:'Build Muscle 💪',improve_fitness:'Improve Fitness 🏃',flexibility:'Flexibility & Calm 🧘',run_race:'Train for a Race 🏅',general:'General Wellness ⚡' };
    const mhr = _onboardData.age ? 220 - _onboardData.age : null;
    const bmi = (_onboardData.weight && _onboardData.height) ? (_onboardData.weight / Math.pow(_onboardData.height/100, 2)).toFixed(1) : null;
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
            ${_onboardData.age ? `<div class="info-row"><span class="lbl">Age</span><span class="val">${_onboardData.age} years</span></div>` : ''}
            ${mhr ? `<div class="info-row"><span class="lbl">Max Heart Rate</span><span class="val">${mhr} bpm</span></div>` : ''}
            ${bmi ? `<div class="info-row"><span class="lbl">BMI</span><span class="val">${bmi}</span></div>` : ''}
            <div class="info-row" style="border:none"><span class="lbl">Fitness Level</span><span class="val">${_onboardData.fitnessLevel || 'Not set'}</span></div>
          </div>
          <div class="card card-sm" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.2)">
            <div style="font-size:13px;color:var(--accent)">💡 You can update your profile stats anytime from your profile page.</div>
          </div>
        </div>
        <button class="btn btn-accent btn-full btn-lg" style="margin-top:32px" onclick="completeOnboarding()">
          💥 Start My Journey!
        </button>
      </div>`;
  }
}

function _applyObSelect(el, on) {
  el.style.borderColor = on ? 'var(--g4)' : 'var(--border)';
  el.style.background  = on ? 'rgba(46,125,70,0.12)' : 'var(--surface)';
}

function selectObGender(v, el) {
  _onboardData.gender = v;
  document.querySelectorAll('[id^="ob-gender-"]').forEach(e => _applyObSelect(e, false));
  _applyObSelect(el, true);
  _checkOb25();
}

function selectObFitness(v, el) {
  _onboardData.fitnessLevel = v;
  document.querySelectorAll('[id^="ob-fit-"]').forEach(e => _applyObSelect(e, false));
  _applyObSelect(el, true);
  _checkOb25();
}

function _checkOb25() {
  // Age is required; weight/height/gender/fitness are optional but encouraged
  const age = document.getElementById('ob-age');
  const btn = document.getElementById('ob-next-25');
  if (!btn) return;
  // Age slider always has a value (default 25), so just check it's been set
  if (!_onboardData.age) _onboardData.age = age ? +age.value : 25;
  const ready = _onboardData.age > 0;
  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.4';
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

// Validate step 0 (Google user setup)
function _validateOb0() {
  const name    = (document.getElementById('ob-name')?.value || '').trim();
  const pw      = document.getElementById('ob-password')?.value || '';
  const pw2     = document.getElementById('ob-password-confirm')?.value || '';
  const btn     = document.getElementById('ob-next-0');
  const errEl   = document.getElementById('ob-pw-error');
  const strEl   = document.getElementById('ob-pw-strength');

  // Password strength indicator
  if (strEl) {
    if (!pw) {
      strEl.textContent = '';
    } else if (pw.length < 6) {
      strEl.textContent = '⚠ Too short (min 6 characters)';
      strEl.style.color = '#ff7878';
    } else if (pw.length < 8) {
      strEl.textContent = '✓ OK strength';
      strEl.style.color = '#f0c040';
    } else {
      strEl.textContent = '✓ Strong';
      strEl.style.color = '#6dc880';
    }
  }

  // Confirm password match
  if (errEl) {
    if (pw && pw2 && pw !== pw2) {
      errEl.textContent = 'Passwords do not match';
    } else {
      errEl.textContent = '';
    }
  }

  // Enable button only if all valid
  const valid = name.length >= 2 && pw.length >= 6 && pw === pw2;
  if (btn) {
    btn.disabled = !valid;
    btn.style.opacity = valid ? '1' : '0.4';
  }
}

// Submit step 0 — save name + password, then advance to step 1
async function _submitOb0() {
  const name = (document.getElementById('ob-name')?.value || '').trim();
  const pw   = document.getElementById('ob-password')?.value || '';
  const btn  = document.getElementById('ob-next-0');
  if (!name || pw.length < 6) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; btn.style.opacity = '0.6'; }

  try {
    // Save to backend: updates name in Users sheet AND sets password
    const user = APP.currentUser;
    const res = await Sheets.post('completeGoogleSetup', {
      userId: user.id,
      name:   name,
      password: pw,
    });

    if (res?.success) {
      // Update local user object
      APP.currentUser.name = name;
      const session = Store.getSession();
      if (session) {
        session.name = name;
        session.authType = 'google_with_password';
        Store.saveSession(session);
      }
      _onboardData.name = name;
      _onboardData.password = pw; // not stored, just tracked

      // Move to step 1 (existing flow)
      _onboardStep = 1;
      renderOnboardingStep(1);
      window.scrollTo(0, 0);
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue →'; btn.style.opacity = '1'; }
      alert(res?.error || 'Could not save profile. Please try again.');
    }
  } catch (e) {
    console.error('Onboarding step 0 error:', e);
    if (btn) { btn.disabled = false; btn.textContent = 'Continue →'; btn.style.opacity = '1'; }
    alert('Network error. Please try again.');
  }
}

function completeOnboarding() {
  // Save goal + module prefs to localStorage
  const user = APP.currentUser;
  Store.set('ff_onboard_' + user.id, { goal: _onboardData.goal, modules: _onboardData.modules, date: todayStr() });

  // Also save to Sheet so admin can see (don't await — fire and forget)
  try {
    Sheets.post('saveOnboarding', {
      userId:       user.id,
      email:        user.email,
      goal:         _onboardData.goal,
      modules:      _onboardData.modules,
      age:          _onboardData.age,
      weight:       _onboardData.weight,
      height:       _onboardData.height,
      gender:       _onboardData.gender,
      fitnessLevel: _onboardData.fitnessLevel,
    }).catch(()=>{});
  } catch(e) {}


  // Save body metrics profile
  if (_onboardData.age || _onboardData.weight || _onboardData.height) {
    const profile = {
      age:          _onboardData.age          || null,
      weight:       _onboardData.weight       || null,
      height:       _onboardData.height       || null,
      gender:       _onboardData.gender       || null,
      fitnessLevel: _onboardData.fitnessLevel || null,
      updatedAt:    new Date().toISOString(),
    };
    Store.set('ff_body_profile_' + user.id, profile);
  }

  // Always save all modules — every user gets the full suite
  const ALL_MODS = ['cardio','gym','yoga','stretching','running','calisthenics','core'];
  _onboardData.modules = [...ALL_MODS];
  if (typeof saveModuleOrder === 'function') {
    saveModuleOrder(user.id, ALL_MODS.map(id => ({ id })));
  }

  // Save default calisthenics equipment (no bar = safest default)
  if (_onboardData.modules.includes('calisthenics')) {
    if (!Store.get('ff_cali_equipment_' + user.id)) {
      Store.set('ff_cali_equipment_' + user.id, 'none');
    }
  }

  // Init push
  if (typeof initPushNotifications === 'function') initPushNotifications();

  showPage('page-quote', false);
  renderQuote();
}


// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Sign In (One Tap / GSI Button)
// ════════════════════════════════════════════════════════════════

// Called when user clicks "Sign in with Google" button
function signInWithGoogle() {
  // Trigger the Google Identity Services popup
  google.accounts.id.initialize({
    client_id: '255447439211-c769706kdp6g4vjuagf8t2uenkl5qhr8.apps.googleusercontent.com',
    callback:  handleGoogleLogin,
    ux_mode:   'popup',
  });
  google.accounts.id.prompt();
}

// Called by Google after user selects their account
// credential is a JWT containing name, email, picture, sub (Google ID)
async function handleGoogleLogin(response) {
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.textContent = '';

  try {
    // Decode the JWT payload (base64url middle part)
    const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    const { name, email, sub: googleId, picture } = payload;

    if (!email) {
      if (errEl) errEl.textContent = 'Google login failed — no email returned.';
      return;
    }

    // Show loading state
    const btn = document.getElementById('google-signin-btn');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    // Tell GAS to find or create this user
    const res = await sheetsPost('googleLogin', { name, email, googleId, picture: picture || '' });

    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }

    if (res?.success && res.user) {
      const googleUser = { ...res.user, authType: 'google' };
      // Use the backend's isNew flag (NOT the u_g_ prefix — every Google user has that)
      const isBrandNewUser = res.isNew === true;
      if (isBrandNewUser && googleUser.role !== 'ADMIN') {
        // Brand new user — go through onboarding to set up profile
        APP.currentUser = googleUser;
        Store.saveSession(googleUser);
        if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
        startOnboarding();
      } else {
        // Existing user (or admin) — go straight to dashboard
        await completeLogin(googleUser);
      }
    } else {
      if (errEl) errEl.textContent = res?.error || 'Google login failed. Please try again.';
    }
  } catch(e) {
    console.error('Google login error:', e);
    const btn = document.getElementById('google-signin-btn');
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    if (errEl) errEl.textContent = 'Google login failed. Please try again.';
  }
}
