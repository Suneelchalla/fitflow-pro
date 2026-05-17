// LOCAL date helper (replaces UTC-based toISOString().split('T')[0])
function _ymdLocal(d) {
  if (!d || isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ── APP STATE ────────────────────────────────────────────────────
// DATA_VERSION is defined in data.js

window.APP = {
  currentUser:      null,
  currentPage:      null,
  currentModule:    null,
  currentDay:       null,
  runSession:       null,
  runInterval:      null,
  runWatchId:       null,
  gpsCoords:        [],
  pageHistory:      [],
  pendingUser:      null,
  selectedPlan:     null,
  selectedPlanWeek: 1,
  editingContent:   null,
  _planRunCtx:      null,
  _myPlanViewWeek:  null,
  currentCaliLevel: 1,
  currentCaliSkill: null,
};

// ── STORAGE ───────────────────────────────────────────────────────
// ── Coerce any date value to YYYY-MM-DD string ───────────────────
// Logs stored before the v52 fix may have Date objects in ff_logs/ff_runlogs.
// This normalizes them on read so all consumers get plain strings.
function _normalizeDate(v) {
  if (!v) return '';
  if (typeof v === 'string') {
    if (v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    // Use LOCAL date components, not UTC (fixes timezone bug)
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // object with date-like values? try parse
  try {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
  } catch(e) {}
  return '';
}
function _normalizeISO(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  return '';
}

const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} },

  saveSession(u)    { this.set('ff_session', u); },
  getSession()      { return this.get('ff_session'); },
  clearSession()    { this.remove('ff_session'); },

  getLogs() {
    return (this.get('ff_logs', []) || []).map(l => ({
      ...l,
      date:      _normalizeDate(l.date),
      timestamp: _normalizeISO(l.timestamp),
    }));
  },
  addLog(log) {
    const logs = this.getLogs();
    if (logs.find(l =>
      l.userId === log.userId && l.module === log.module &&
      l.day    === log.day    && l.date   === log.date
    )) return false;
    logs.push({ ...log, id: 'log_' + Date.now() });
    this.set('ff_logs', logs);
    return true;
  },
  getUserLogs(uid)            { return this.getLogs().filter(l => l.userId === uid); },
  getModuleDayLogs(uid, mod)  { return this.getLogs().filter(l => l.userId === uid && l.module === mod); },

  getRunLogs() {
    return (this.get('ff_runlogs', []) || []).map(l => ({
      ...l,
      date:      _normalizeDate(l.date),
      timestamp: _normalizeISO(l.timestamp),
    }));
  },
  addRunLog(log) {
    const logs = this.getRunLogs();
    // Prevent local duplicates: same user + date + planType + distance within 0.01km
    const exists = logs.find(l =>
      l.userId   === log.userId   &&
      l.date     === log.date     &&
      l.planType === log.planType &&
      Math.abs((l.distance||0) - (log.distance||0)) < 0.01
    );
    if (exists) return false;
    logs.push({ ...log, id: log.id || ('run_' + Date.now()) });
    this.set('ff_runlogs', logs);
    return true;
  },
  getUserRunLogs(uid)         { return this.getRunLogs().filter(l => l.userId === uid); },
  deleteRunLog(uid, logId) {
    const logs    = this.getRunLogs();
    const updated = logs.filter(l => !(l.userId === uid && (l.id === logId || l.timestamp === logId)));
    this.set('ff_runlogs', updated);
    return logs.length !== updated.length; // true if something was removed
  },

  getContent(key)             { return this.get('ff_content_' + key); },
  setContent(key, val)        { this.set('ff_content_' + key, val); },

  // ── SHEETS URL ────────────────────────────────────────────────
  // Hardcoded URL ensures ALL users connect automatically.
  // This always takes priority — localStorage config is ignored
  // to prevent stale/wrong URLs from breaking login.
  _defaultSheetsUrl: 'https://script.google.com/macros/s/AKfycbxIQbKngcobi-f2MmU6iSn2awYyWtK4KjRbKkXhabtV1M7BuRMNG9wwn0nAifM1ik_A/exec',

  getSheetsConfig() {
    // Always use the hardcoded URL — never trust localStorage for this
    return { webAppUrl: this._defaultSheetsUrl };
  },
  setSheetsConfig(cfg) {
    // Keep saving to localStorage for the admin UI display, but getSheetsConfig
    // always returns the hardcoded URL above.
    this.set('ff_sheets_config', cfg);
  },

  getHydration(uid, d)        { return this.get(`ff_h_${uid}_${d}`, 0); },
  setHydration(uid, d, ml)    { this.set(`ff_h_${uid}_${d}`, ml); },
};

// ── SHEETS API ────────────────────────────────────────────────────
const Sheets = {
  async get(action, params = {}) {
    const cfg = Store.getSheetsConfig();
    if (!cfg.webAppUrl) return null;
    try {
      const qs = new URLSearchParams({ action, ...params }).toString();
      const r  = await fetch(`${cfg.webAppUrl}?${qs}`);
      // Guard against HTML error pages from Apps Script
      const text = await r.text();
      try { return JSON.parse(text); }
      catch { console.warn('[Sheets.get '+action+'] non-JSON:', text.substring(0,150)); return null; }
    } catch (e) {
      console.warn('[Sheets.get '+action+'] network:', e.message);
      return null;
    }
  },
  async post(action, data = {}) {
    const cfg = Store.getSheetsConfig();
    if (!cfg.webAppUrl) return null;
    try {
      const r = await fetch(cfg.webAppUrl, {
        method:  'POST',
        body:    JSON.stringify({ action, ...data }),
        headers: { 'Content-Type': 'text/plain' }, // text/plain avoids CORS preflight
      });
      const text = await r.text();
      try { return JSON.parse(text); }
      catch { console.warn('[Sheets.post '+action+'] non-JSON:', text.substring(0,150)); return null; }
    } catch (e) {
      console.warn('[Sheets.post '+action+'] network:', e.message);
      return null;
    }
  },
};
// Alias used across files
async function sheetsPost(action, data) { return Sheets.post(action, data); }

// ── TOAST ─────────────────────────────────────────────────────────
function showConfirm(title, message, confirmLabel, cancelLabel, onConfirm, onCancel, type) {
  // Use the existing confirm modal if it exists, else fall back to native confirm
  const modal = document.getElementById('modal-confirm');
  if (modal) {
    document.getElementById('confirm-title').textContent   = title   || 'Are you sure?';
    document.getElementById('confirm-message').textContent = message || '';
    const confirmBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn  = document.getElementById('confirm-cancel-btn');
    confirmBtn.textContent = confirmLabel || 'Confirm';
    cancelBtn.textContent  = cancelLabel  || 'Cancel';
    confirmBtn.className   = 'btn btn-full' + (type === 'danger' ? ' btn-danger' : '');
    confirmBtn.style.background = type === 'danger' ? 'rgba(229,57,53,.85)' : '';
    confirmBtn.style.borderColor = type === 'danger' ? 'rgba(229,57,53,.6)' : '';
    confirmBtn.onclick = () => { closeModal('modal-confirm'); if (onConfirm) onConfirm(); };
    cancelBtn.onclick  = () => { closeModal('modal-confirm'); if (onCancel)  onCancel();  };
    openModal('modal-confirm');
  } else {
    // Fallback: native browser confirm
    if (window.confirm(title + '\n\n' + message)) { if (onConfirm) onConfirm(); }
    else { if (onCancel) onCancel(); }
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 2800);
}

// ── PAGE ROUTING ─────────────────────────────────────────────────
// ROOT_PAGES: swipe-back and goBack() never fire on these pages.
// page-running is NOT in ROOT_PAGES — instead we check APP.runSession
// at swipe time so idle running page allows swipe-back but active run doesn't.
const ROOT_PAGES = ['page-login', 'page-dashboard', 'page-admin'];

function showPage(id, addToHistory = true) {
  const prev = APP.currentPage;
  if (addToHistory && prev && !ROOT_PAGES.includes(prev) && prev !== id) {
    APP.pageHistory.push(prev);
    if (APP.pageHistory.length > 20) APP.pageHistory.shift();
  }
  // Clear any floating overlays that might block the new page
  document.getElementById('rest-timer-overlay')?.remove();
  document.getElementById('auto-pause-prompt')?.remove();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) {
    pg.classList.add('active');
    APP.currentPage = id;
    pg.scrollTop = 0;
    // .scroll-content (the actual overflow-y:auto element) retains its own
    // scrollTop across page visits — resetting just .page does nothing on
    // those pages. Scroll every nested scroller back to top so opening a
    // tab always starts at the top of the content.
    pg.querySelectorAll('.scroll-content').forEach(s => { s.scrollTop = 0; });
  }
  window.history.pushState({ page: id }, '', '#' + id);
  // Persist last page so refresh restores user to same page
  // Don't persist transient pages that need fresh context
  const _skipPersist = ['page-weekly-report', 'page-quote', 'page-onboarding'];
  if (APP.currentUser && !_skipPersist.includes(id)) {
    Store.set('ff_last_page_' + APP.currentUser.id, id);
  }
  // Keep the global bottom nav in sync with the new page. The nav element has
  // inline `display:none` and _syncNav is the only thing that toggles it, so
  // without this call the nav stays hidden after login / navTo / etc.
  _syncNav(id);
}

// Parent page map — defines where each page goes on swipe-back/goBack
const PAGE_PARENT = {
  'page-quote':           'page-dashboard',
  'page-onboarding':      'page-dashboard',
  'page-history-global':  'page-dashboard',
  'page-running':         'page-dashboard',
  'page-module':          'page-dashboard',
  'page-profile':         'page-dashboard',
  'page-weekly-report':   'page-dashboard',
  'page-custom-workouts': 'page-dashboard',
  'page-calisthenics':    'page-dashboard',
  'page-my-plan':         'page-dashboard',
  'page-cw-editor':       'page-custom-workouts',
  'page-cw-workout':      'page-custom-workouts',
  'page-admin-editor':    'page-admin',
  'page-ct-day':          'page-cross-training',
  'page-manual-log':      'page-dashboard',
  'page-activity-card':   'page-dashboard',
};

function goBack() {
  // Never go back if no user session — stay on login
  if (!APP.currentUser) return;
  // Never go back from root pages (login, dashboard, admin)
  if (ROOT_PAGES.includes(APP.currentPage)) return;

  // ── SUB-VIEW BACK ───────────────────────────────────────────────
  // Pages with in-page state (e.g. manual-log's picker → form swap, or any
  // future flow that uses content swaps instead of separate pages) register
  // a handler on APP.subViewBack. If it returns true the back is consumed —
  // we DON'T navigate to the parent page. The page is responsible for
  // clearing the hook when it's no longer in the sub-view.
  if (typeof APP.subViewBack === 'function') {
    let handled = false;
    try { handled = !!APP.subViewBack(); } catch (e) { console.warn('subViewBack threw:', e); }
    if (handled) return;
  }

  let target = null;

  // Use page history stack first
  if (APP.pageHistory.length > 0) {
    target = APP.pageHistory.pop();
  }
  // Fall back to parent map
  if (!target) {
    target = PAGE_PARENT[APP.currentPage] || 'page-dashboard';
  }
  // Admin users go to admin, not dashboard
  if (target === 'page-dashboard' && APP.currentUser?.role === 'ADMIN') {
    target = 'page-admin';
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(target);
  if (pg) {
    pg.classList.add('active');
    APP.currentPage = target;
    pg.scrollTop = 0;
    pg.querySelectorAll('.scroll-content').forEach(s => { s.scrollTop = 0; });
  }
  window.history.pushState({ page: target }, '', '#' + target);
  _syncNav(target);
}

function _syncNav(pageId) {
  if      (pageId === 'page-dashboard')      setActiveNav('home');
  else if (pageId === 'page-history-global') setActiveNav('history');
  else if (pageId === 'page-running')        setActiveNav('running');
  else if (pageId === 'page-admin')          setActiveNav('admin');
  else if (pageId === 'page-my-plan')        setActiveNav('myplan');

  // Toggle the global bottom-nav. Visible on top-level pages, hidden on
  // auth/onboarding/splash and during full-screen states like active-run.
  const nav = document.getElementById('global-bottom-nav');
  if (nav) {
    const showOn = new Set([
      'page-dashboard',
      'page-running',
      'page-history-global',
      'page-my-plan',
      'page-admin',
      'page-module',
      'page-calisthenics',
      'page-custom-workouts',
      'page-weekly-report',
    ]);
    let visible = showOn.has(pageId);
    // Inside page-running, hide the nav while a run is active / on summary /
    // on the save screen — those are full-screen views.
    if (visible && pageId === 'page-running') {
      const runActive   = document.getElementById('run-active');
      const runSummary  = document.getElementById('run-summary');
      const runSaveSc   = document.getElementById('run-save-screen');
      const activeVisible  = runActive  && !runActive.classList.contains('hidden');
      const summaryVisible = runSummary && !runSummary.classList.contains('hidden');
      const saveVisible    = runSaveSc  && !runSaveSc.classList.contains('hidden');
      if (activeVisible || summaryVisible || saveVisible) visible = false;
    }
    nav.style.display = visible ? 'flex' : 'none';
  }
}

// External hook: call this from running.js after toggling run-idle/run-active
// /run-summary/run-save-screen so the bottom-nav visibility updates immediately
// (without waiting for a fresh showPage call).
window.refreshBottomNav = function () {
  if (typeof _syncNav === 'function') _syncNav(APP.currentPage);
};

window.addEventListener('popstate', e => {
  // If a modal is open, close it instead of navigating back
  const openMod = document.querySelector('.modal-overlay.open');
  if (openMod) {
    openMod.classList.remove('open');
    if (openMod.id === 'modal-run-detail' && typeof _detailMapInst !== 'undefined' && _detailMapInst) {
      _detailMapInst.remove();
      _detailMapInst = null;
    }
    // Push state back so the URL stays correct
    window.history.pushState({ page: APP.currentPage }, '', '#' + APP.currentPage);
    return;
  }
  // Only handle real navigation events, not browser chrome show/hide
  if (!e.state?.page) return;
  // Block back navigation from root pages
  if (ROOT_PAGES.includes(APP.currentPage)) {
    window.history.pushState({ page: APP.currentPage }, '', '#' + APP.currentPage);
    return;
  }
  // For non-root pages, use goBack which uses PAGE_PARENT map
  // This prevents falling through to browser back (which exits the app)
  // Block back navigation from running page during an ACTIVE run
  if (APP.currentPage === 'page-running' && APP.runSession) {
    window.history.pushState({ page: APP.currentPage }, '', '#' + APP.currentPage);
    return;
  }
  goBack();
});

// ── SWIPE-LEFT → BACK ─────────────────────────────────────────────
// Tracks peak vertical movement AND whether touch started inside a
// horizontally-scrollable container (tab-strip, run tabs, etc.).
// If the user is scrolling a scrollable row, we never fire goBack().
(function () {
  let sx = 0, sy = 0, maxDy = 0, maxDx = 0, insideHScroll = false;

  function isHorizontallyScrollable(el) {
    // Walk up the DOM — if any ancestor can actually scroll horizontally, abort swipe-back
    while (el && el !== document.body) {
      const style    = window.getComputedStyle(el);
      const overflow = style.overflowX;
      const canScroll = overflow === 'auto' || overflow === 'scroll';
      if (canScroll && el.scrollWidth > el.clientWidth + 2) return true;
      el = el.parentElement;
    }
    return false;
  }

  document.addEventListener('touchstart', e => {
    sx    = e.touches[0].clientX;
    sy    = e.touches[0].clientY;
    maxDy = 0;
    maxDx = 0;
    // Record whether touch origin is inside a horizontally scrollable element
    insideHScroll = isHorizontallyScrollable(e.target);
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    const dy = Math.abs(e.touches[0].clientY - sy);
    const dx = Math.abs(e.touches[0].clientX - sx);
    if (dy > maxDy) maxDy = dy;
    if (dx > maxDx) maxDx = dx;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);

    // Never fire if touch started inside a horizontally-scrollable container
    // (e.g. tab strips, run tabs, day strips) — user was scrolling those, not navigating back
    if (insideHScroll) return;

    // If finger moved more than 30px vertically at any point → it was a scroll
    if (maxDy > 30) return;

    // Swipe-back: left swipe > 80px, horizontal dominates vertical, not a root page
    // Special case: block swipe on running page ONLY when a run is active
    const runBlocked = APP.currentPage === 'page-running' && APP.runSession;

    // If a modal is open, swipe left closes it — don't navigate away from the page
    const openModal = document.querySelector('.modal-overlay.open');
    if (dx < -80 && dy < 40 && Math.abs(dx) > dy * 2 && openModal) {
      openModal.classList.remove('open');
      // Clean up run detail map if it was open
      if (openModal.id === 'modal-run-detail' && typeof _detailMapInst !== 'undefined' && _detailMapInst) {
        _detailMapInst.remove();
        _detailMapInst = null;
      }
      return;
    }

    if (dx < -80 && dy < 40 && Math.abs(dx) > dy * 2 && !ROOT_PAGES.includes(APP.currentPage) && !runBlocked) {
      goBack();
    }
  }, { passive: true });
})();

// ── MODAL ─────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = '';   // clear any inline display:none
  el.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  // Clean up run detail Leaflet map to free memory
  if (id === 'modal-run-detail' && typeof _detailMapInst !== 'undefined' && _detailMapInst) {
    _detailMapInst.remove();
    _detailMapInst = null;
  }
}

// ── BOTTOM NAV — single definition ───────────────────────────────
function setActiveNav(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-nav="${tab}"]`)?.classList.add('active');
}

function navTo(tab) {
  setActiveNav(tab);
  APP.pageHistory = [];
  if      (tab === 'home')    { showPage('page-dashboard', false); refreshDashboard(); }
  else if (tab === 'history') { showPage('page-history-global'); renderGlobalHistory(); }
  else if (tab === 'running') { openModule('running'); }
  else if (tab === 'myplan')  { if (typeof openMyPlanPage === 'function') openMyPlanPage(); }
  else if (tab === 'admin')   { showPage('page-admin', false); renderAdminPanel(); }
}

// ── HELPERS ───────────────────────────────────────────────────────
function fmtTime(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtPace(km, secs) {
  if (km < 0.05) return '--:--';
  const p = secs / 60 / km, pm = Math.floor(p), ps = Math.round((p - pm) * 60);
  return `${pm}:${String(ps).padStart(2, '0')}`;
}
function todayStr() {
  // Returns LOCAL YYYY-MM-DD (not UTC) — fixes timezone bug where
  // workouts done after 6:30 PM IST were saved with yesterday's date
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function dayName()     { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; }
function getWeekDays() { return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; }
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';  // 9 PM – 5 AM
}

// Refresh greeting every minute so it updates at noon/5pm
setInterval(() => {
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl && APP.currentUser) {
    greetEl.textContent = getGreeting() + ', ' + APP.currentUser.name.split(' ')[0] + '!';
  }
}, 60000);
function getMonday() {
  // Returns LOCAL YYYY-MM-DD for Monday of current week
  const d = new Date(), day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}
function calcStreak(uid, asOfDate) {
  // ── Helper: coerce any value to YYYY-MM-DD string safely ──────
  const toDateStr = v => {
    if (!v) return '';
    if (typeof v === 'string') {
      // Already YYYY-MM-DD or ISO string — strip time portion
      return v.length >= 10 ? v.substring(0, 10) : v;
    }
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return '';
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Number or other — try to parse, fall back to empty
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return '';
    return _ymdLocal(dt);
  };

  // Merge workout dates AND run dates — a run day counts toward streak
  const workoutDates = Store.getUserLogs(uid).map(l => toDateStr(l.date)).filter(Boolean);
  const runDates     = Store.getUserRunLogs(uid).map(r => toDateStr(r.date)).filter(Boolean);
  const dates = [...new Set([...workoutDates, ...runDates])].sort().reverse();
  if (!dates.length) return 0;

  // Start from asOfDate if given (for weekly report), else today
  const ref = toDateStr(asOfDate) || _ymdLocal(new Date());

  // Find most recent active date on or before ref
  const startDate = dates.find(d => d <= ref);
  if (!startDate) return 0;

  // Count consecutive days backwards — use noon UTC to avoid DST issues
  const cur = new Date(startDate + 'T12:00:00');
  if (isNaN(cur.getTime())) return 0; // safety net — should never happen now

  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const d = _ymdLocal(cur);
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Seed local admin fallback (used if Sheets not configured)
  if (!localStorage.getItem('ff_local_users')) {
    localStorage.setItem('ff_local_users', JSON.stringify([
      { id: 'u_admin', name: 'Admin User', email: 'admin@fitflow.com',
        password: 'admin123', tempPassword: '', isFirstLogin: false,
        role: 'ADMIN', status: 'ACTIVE' },
    ]));
  }

  window.history.replaceState({ page: 'page-login' }, '', '#page-login');

  // ── OFFLINE INDICATOR ─────────────────────────────────────────────
  function _updateOnlineStatus() {
    let bar = document.getElementById('offline-bar');
    if (navigator.onLine) {
      if (bar) { bar.style.transform = 'translateY(-100%)'; setTimeout(() => bar?.remove(), 400); }
    } else {
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'offline-bar';
        bar.innerHTML = '📶 No internet — app works offline, sync paused';
        bar.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:99998;
          background:rgba(229,57,53,0.92);color:#fff;font-size:12px;font-weight:600;
          text-align:center;padding:8px 16px;transition:transform .3s ease;
          transform:translateY(0);letter-spacing:.03em`;
        document.body.prepend(bar);
      }
    }
  }
  window.addEventListener('online',  _updateOnlineStatus);
  window.addEventListener('offline', _updateOnlineStatus);
  _updateOnlineStatus();

  // ── PWA INSTALL PROMPT ────────────────────────────────────────────
  // Handled entirely by running.js (uses #install-banner from index.html)
  // No duplicate handler here to avoid creating a blocking overlay

  document.querySelectorAll('.modal-overlay').forEach(mo => {
    mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });
  });

  if ('serviceWorker' in navigator) {
    // NOTE: We do NOT manually register sw.js here.
    // OneSignal's SDK handles the service worker registration in push.js (_ensureInit),
    // using serviceWorkerPath: '/fitflow-pro/sw.js' and scope: '/fitflow-pro/'.
    // Registering it again here would create a second competing registration on the
    // same scope, which causes OneSignal's push events to be swallowed or misdirected.
    // Result: notifications never arrive.
    // The SW is registered once by OneSignal when the user first visits the page.
  }

  // ── BOOT-TIME ORPHAN NOTIFICATION CLEANUP ─────────────────────────
  // Fix for "activity notification stuck on dashboard forever" — the previous
  // guard skipped cleanup whenever ff_active_run existed, but ff_active_run
  // is only ever cleared by _tryRecoverRunSession (running page entry). If
  // the user closes the app mid-run and never opens the running page again,
  // both the stale session AND the orphan notification persist indefinitely.
  //
  // New behaviour:
  //   1. Stale session (>45 min old) → wipe ff_active_run.
  //   2. Always run _killAllActivityNotifications. If there's a real fresh
  //      session, _tryRecoverRunSession restores it as paused (no GPS, no
  //      notification) and the user must tap Resume to re-create it.
  // Runs once on every page load, ~2s after init so the SW has time to settle.
  setTimeout(() => {
    try {
      const saved = Store.get('ff_active_run');
      const isStale = saved && saved.startTime &&
        (Date.now() - saved.startTime > 45 * 60 * 1000);
      if (isStale) {
        Store.remove('ff_active_run');
      }
      if (typeof _killAllActivityNotifications === 'function') {
        _killAllActivityNotifications();
      }
    } catch (e) {}
  }, 2000);

  const session = Store.getSession();
  if (session) {
    APP.currentUser = session;
    // Validate session in background — check if logged in elsewhere
    if (typeof validateCurrentSession === 'function') {
      setTimeout(() => {
        validateCurrentSession();
        if (typeof _startSessionValidation === 'function') _startSessionValidation();
      }, 3000); // Wait 3s for page to load before checking
    }

    // Clear stale last-page values that restore badly
    const _stalePage = Store.get('ff_last_page_' + session.id);
    if (_stalePage === 'page-weekly-report' || _stalePage === 'page-quote') {
      Store.set('ff_last_page_' + session.id, 'page-dashboard');
    }

    // Restore to correct page INSTANTLY before any rendering
    // This prevents the login page flash on pull-down / reload
    const savedLastPage = Store.get('ff_last_page_' + session.id);
    const basePage = session.role === 'ADMIN'
      ? 'page-admin'
      : Store.get('ff_quote_' + session.id) === todayStr()
        ? 'page-dashboard'
        : 'page-quote';

    const restorablePages = ['page-dashboard','page-history-global','page-module',
      'page-profile','page-custom-workouts','page-weekly-report',
      'page-calisthenics','page-my-plan'];
    // page-running is only restorable if there is an active session in storage.
    // Restoring to it without an active session calls initRunningPage() →
    // _tryRecoverRunSession() → GPS + activity notification fires unexpectedly.
    const hasSavedRun = !!Store.get('ff_active_run');
    if (hasSavedRun) restorablePages.push('page-running');
    const targetPage = (savedLastPage && restorablePages.includes(savedLastPage) && session.role !== 'ADMIN')
      ? savedLastPage : basePage;

    // Restore last module so module page re-renders correctly
    const savedModule = Store.get('ff_last_module_' + session.id);
    if (savedModule) APP.currentModule = savedModule;

    // Show target page immediately (no animation, no flash)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetEl = document.getElementById(targetPage);
    if (targetEl) { targetEl.classList.add('active'); APP.currentPage = targetPage; }

    // Sync the global bottom-nav visibility for the restored page. This path
    // bypasses showPage() ("no animation, no flash" — intentional), so we have
    // to call _syncNav manually here or the nav stays display:none.
    _syncNav(targetPage);

    // Render immediately from local data
    initDashboard();

    // Check if user needs onboarding — use multiple signals to avoid false positives
    const onboard      = Store.get('ff_onboard_' + session.id);
    const hasRunLogs   = Store.getUserRunLogs(session.id).length > 0;
    const hasWorkouts  = Store.getUserLogs(session.id).length > 0;
    const hasOnboard   = onboard && (onboard.date || onboard.goal || onboard.modules);
    const isOldUser    = session.isFirstLogin === false || hasRunLogs || hasWorkouts;
    // Only send to onboarding if: no onboarding record AND no logs AND not an old user
    const needsOnboarding = !hasOnboard && !isOldUser;
    if (needsOnboarding && session.role !== 'ADMIN') {
      if (typeof startOnboarding === 'function') {
        setTimeout(() => startOnboarding(), 100);
      }
      return;
    }

    if (session.role === 'ADMIN') {
      renderAdminPanel();
    } else if (targetPage === 'page-quote') {
      renderQuote();
    } else if (targetPage === 'page-module' && APP.currentModule) {
      if (typeof renderModulePage === 'function') renderModulePage(APP.currentModule);
      setActiveNav('home');
    } else if (targetPage === 'page-history-global') {
      if (typeof renderGlobalHistory === 'function') renderGlobalHistory();
      setActiveNav('history');
    } else if (targetPage === 'page-running') {
      if (typeof initRunningPage === 'function') initRunningPage();
      setActiveNav('running');
    } else if (targetPage === 'page-calisthenics') {
      if (typeof initCalisthenicsPage === 'function') initCalisthenicsPage();
      setActiveNav('home');
    } else if (targetPage === 'page-custom-workouts') {
      if (typeof renderCustomWorkoutsList === 'function') renderCustomWorkoutsList();
      setActiveNav('home');
    } else if (targetPage === 'page-weekly-report') {
      // Redirect to dashboard — weekly report needs fresh sync
      const dashEl = document.getElementById('page-dashboard');
      if (dashEl) { dashEl.classList.add('active'); APP.currentPage = 'page-dashboard'; }
      setActiveNav('home');
    } else if (targetPage === 'page-my-plan') {
      if (typeof renderMyPlan === 'function') renderMyPlan();
      if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
      setActiveNav('myplan');
    } else {
      setActiveNav('home');
    }

    // Sync from Sheets THEN re-render so data appears after cache clear
    syncContentFromSheets().then(() => {
      if (typeof refreshDashboard === 'function') refreshDashboard();
      // Always refresh plan nav — plan may be registered but nav not showing
      if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
      // Re-render current page after sync
      if (APP.currentPage === 'page-history-global' && typeof renderGlobalHistory === 'function') {
        renderGlobalHistory();
      }
      if (APP.currentPage === 'page-my-plan' && typeof renderMyPlan === 'function') {
        renderMyPlan();
      }
      if (APP.currentPage === 'page-module' && APP.currentModule) {
        if (typeof renderExercises === 'function') renderExercises(APP.currentModule, APP.currentDay || (new Date()).toLocaleDateString('en-US',{weekday:'long'}));
      }
      // Re-render admin panel after sync so header stats and dashboard use real data
      if (APP.currentUser?.role === 'ADMIN' && APP.currentPage === 'page-admin') {
        if (typeof renderAdminPanel === 'function') renderAdminPanel();
      }
    });

    // Init push for non-admin on session restore (page reload)
    if (session.role !== 'ADMIN' && typeof initPushNotifications === 'function') {
      initPushNotifications();
    }
  } else {
    showPage('page-login', false);
  }
});

// ── PULL TO REFRESH ───────────────────────────────────────────────
// Triggers a full data sync when the user drags DOWN from the top of
// any page and releases past the threshold.
//
// Rules:
//   • Only fires when the active page is already scrolled to the top
//   • Requires a clear downward-dominant drag > 80 px
//   • Does NOT fire on normal scrolls, horizontal swipes, or during runs
//   • Does NOT fire when a modal is open
(function () {
  const THRESHOLD = 80;   // px of pull needed to trigger refresh
  const MAX_PULL  = 105;  // max visual travel of the indicator bubble

  let _ptY     = 0;       // touchstart Y
  let _ptX     = 0;       // touchstart X
  let _ptAlive = false;   // gesture is eligible (started at scroll-top, vertical)
  let _ptReady = false;   // crossed threshold — will trigger on release
  let _ptBusy  = false;   // refresh in progress — block new gesture

  // ── Indicator ──────────────────────────────────────────────────
  function _el() {
    let el = document.getElementById('ptr-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ptr-indicator';
      el.innerHTML = '<span id="ptr-icon" style="font-size:18px;display:block;line-height:1">↓</span>';
      el.style.cssText =
        'position:fixed;top:-64px;left:50%;transform:translateX(-50%);' +
        'width:46px;height:46px;border-radius:50%;' +
        'background:var(--surface,#1a3328);' +
        'border:1.5px solid var(--border,rgba(255,255,255,.15));' +
        'color:var(--text,#e0e0e0);' +
        'display:flex;align-items:center;justify-content:center;' +
        'z-index:9995;pointer-events:none;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.5);' +
        'transition:top .25s ease,opacity .25s ease,background .2s,border-color .2s';
      document.body.appendChild(el);
      // Inject spin keyframe once
      if (!document.getElementById('ptr-kf')) {
        const s  = document.createElement('style');
        s.id     = 'ptr-kf';
        s.textContent = '@keyframes _ptrSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
    }
    return el;
  }

  function _icon() { return document.getElementById('ptr-icon'); }

  function _hide() {
    const el = document.getElementById('ptr-indicator');
    if (!el) return;
    el.style.transition = 'top .3s ease,opacity .3s ease';
    el.style.top        = '-64px';
    el.style.opacity    = '0';
    const ic = _icon();
    if (ic) {
      ic.style.animation = '';
      ic.style.transform = '';
      ic.textContent     = '↓';
    }
    el.style.background  = 'var(--surface,#1a3328)';
    el.style.borderColor = 'var(--border,rgba(255,255,255,.15))';
    el.style.color       = 'var(--text,#e0e0e0)';
  }

  function _scrollTop() {
    // Active page's scroll container
    const pg = document.querySelector('.page.active');
    return pg ? pg.scrollTop : (window.scrollY || 0);
  }

  // ── Touch start ────────────────────────────────────────────────
  document.addEventListener('touchstart', e => {
    _ptAlive = false;
    _ptReady = false;
    if (_ptBusy) return;
    if (typeof APP !== 'undefined' && APP.runSession) return; // never during active run
    if (document.querySelector('.modal-overlay.open'))  return; // never over a modal
    _ptY     = e.touches[0].clientY;
    _ptX     = e.touches[0].clientX;
    // Only eligible when page is already at the very top
    _ptAlive = _scrollTop() <= 1;
  }, { passive: true });

  // ── Touch move ─────────────────────────────────────────────────
  document.addEventListener('touchmove', e => {
    if (!_ptAlive || _ptBusy) return;

    const dy = e.touches[0].clientY - _ptY;
    const dx = Math.abs(e.touches[0].clientX - _ptX);

    // Cancel if not clearly downward-dominant (user is scrolling or swiping sideways)
    if (dy <= 0 || dx > dy * 0.55) {
      _ptAlive = false;
      _hide();
      return;
    }

    const pull = Math.min(dy, MAX_PULL);
    const pct  = Math.min(pull / THRESHOLD, 1);
    _ptReady   = pull >= THRESHOLD;

    // Move indicator — follows finger with a slight ease factor
    const indicator = _el();
    const ic        = _icon();
    indicator.style.transition  = 'none';
    indicator.style.top         = (pull * 0.52 - 28) + 'px';
    indicator.style.opacity     = String(Math.min(pct * 1.4, 1));

    if (_ptReady) {
      // Past threshold → turn green, show ↻
      indicator.style.background  = 'var(--g3,#2e7d46)';
      indicator.style.borderColor = 'var(--g4,#43a05a)';
      indicator.style.color       = '#fff';
      if (ic) { ic.textContent = '↻'; ic.style.transform = 'rotate(180deg)'; }
    } else {
      // Still pulling → rotate arrow proportionally
      indicator.style.background  = 'var(--surface,#1a3328)';
      indicator.style.borderColor = 'var(--border,rgba(255,255,255,.15))';
      indicator.style.color       = 'var(--text,#e0e0e0)';
      if (ic) { ic.textContent = '↓'; ic.style.transform = `rotate(${pct * 155}deg)`; }
    }
  }, { passive: true });

  // ── Touch end ──────────────────────────────────────────────────
  document.addEventListener('touchend', async () => {
    if (!_ptAlive) return;
    _ptAlive = false;

    if (!_ptReady) { _hide(); return; }   // didn't reach threshold — snap back
    _ptReady = false;
    _ptBusy  = true;

    // Pin indicator in spinning state
    const indicator = _el();
    const ic        = _icon();
    indicator.style.transition  = 'top .2s ease';
    indicator.style.top         = '14px';
    indicator.style.opacity     = '1';
    if (ic) {
      ic.textContent     = '↻';
      ic.style.transform = '';
      ic.style.animation = '_ptrSpin .75s linear infinite';
    }

    try {
      // Full data sync from Sheets
      if (typeof syncContentFromSheets === 'function') {
        await syncContentFromSheets();
      }

      // Re-render whichever page is active
      const page = (typeof APP !== 'undefined') ? APP.currentPage : '';
      if (page === 'page-dashboard' && typeof refreshDashboard === 'function') {
        refreshDashboard();
      } else if (page === 'page-history-global' && typeof renderGlobalHistory === 'function') {
        renderGlobalHistory();
      } else if (page === 'page-running' && typeof renderRunHistory === 'function') {
        renderRunHistory();
      } else if (page === 'page-my-plan' && typeof renderMyPlan === 'function') {
        renderMyPlan();
      } else if (page === 'page-module' && typeof renderExercises === 'function'
                 && APP.currentModule && APP.currentDay) {
        renderExercises(APP.currentModule, APP.currentDay);
      } else if (page === 'page-admin' && typeof renderAdminPanel === 'function') {
        renderAdminPanel();
      } else if (page === 'page-calisthenics' && typeof initCalisthenicsPage === 'function') {
        initCalisthenicsPage();
      } else if (page === 'page-custom-workouts' && typeof renderCustomWorkoutsList === 'function') {
        renderCustomWorkoutsList();
      }

      if (typeof showToast === 'function') showToast('✓ Up to date', 'success');
    } catch (err) {
      console.warn('[PTR] refresh failed:', err?.message);
      if (typeof showToast === 'function') showToast('Could not refresh — check connection', 'error');
    }

    // Always hide indicator after a short delay, even on error
    setTimeout(() => { _hide(); _ptBusy = false; }, 500);
  }, { passive: true });
})();
