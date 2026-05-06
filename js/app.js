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
const ROOT_PAGES = ['page-login', 'page-dashboard', 'page-admin', 'page-quote', 'page-onboarding'];

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
  if (pg) { pg.classList.add('active'); APP.currentPage = id; pg.scrollTop = 0; }
  window.history.pushState({ page: id }, '', '#' + id);
  // Persist last page so refresh restores user to same page
  // Don't persist transient pages that need fresh context
  const _skipPersist = ['page-weekly-report', 'page-quote', 'page-onboarding'];
  if (APP.currentUser && !_skipPersist.includes(id)) {
    Store.set('ff_last_page_' + APP.currentUser.id, id);
  }
}

function goBack() {
  // Never go back if no user session — stay on login
  if (!APP.currentUser) return;
  // Never go back from root pages
  if (ROOT_PAGES.includes(APP.currentPage)) return;

  if (APP.pageHistory.length > 0) {
    const prev = APP.pageHistory.pop();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById(prev);
    if (pg) { pg.classList.add('active'); APP.currentPage = prev; pg.scrollTop = 0; }
    window.history.pushState({ page: prev }, '', '#' + prev);
    _syncNav(prev);
  } else {
    const home = APP.currentUser?.role === 'ADMIN' ? 'page-admin' : 'page-dashboard';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById(home);
    if (pg) { pg.classList.add('active'); APP.currentPage = home; }
    window.history.pushState({ page: home }, '', '#' + home);
    _syncNav(home);
  }
}

function _syncNav(pageId) {
  if      (pageId === 'page-dashboard')      setActiveNav('home');
  else if (pageId === 'page-history-global') setActiveNav('history');
  else if (pageId === 'page-running')        setActiveNav('running');
  else if (pageId === 'page-admin')          setActiveNav('admin');
  else if (pageId === 'page-my-plan')        setActiveNav('myplan');
}

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

// ── CUSTOM PULL-TO-REFRESH ────────────────────────────────────────
// Intercepts the pull gesture and does an in-app refresh
// instead of letting the browser reload the page (which causes login flash)
(function () {
  let startY    = 0;
  let pulling   = false;
  let indicator = null;

  function createIndicator() {
    const el = document.createElement('div');
    el.id = 'ptr-indicator';
    el.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      height: 0; overflow: hidden; transition: height 0.2s;
      background: var(--g2); display: flex; align-items: center;
      justify-content: center; gap: 8px; font-size: 13px;
      color: var(--g5); font-weight: 600;
    `;
    el.innerHTML = '<div class="loader" style="width:18px;height:18px;border-width:2px"></div> Refreshing…';
    document.body.appendChild(el);
    return el;
  }

  document.addEventListener('touchstart', e => {
    // Only on root pages (dashboard, admin) and when scrolled to top
    const rootPages = ['page-dashboard', 'page-admin', 'page-history-global'];
    if (!rootPages.includes(APP.currentPage)) return;
    const scrollEl = document.querySelector('#' + APP.currentPage + ' .scroll-content');
    if (scrollEl && scrollEl.scrollTop > 5) return; // not at top
    startY  = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 60) {
      // Show indicator
      if (!indicator) indicator = createIndicator();
      indicator.style.height = Math.min(dy - 40, 52) + 'px';
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;

    if (dy > 80 && indicator) {
      // User pulled enough — do in-app refresh
      indicator.style.height = '52px';
      _inAppRefresh().then(() => {
        if (indicator) { indicator.style.height = '0'; setTimeout(() => { indicator?.remove(); indicator = null; }, 300); }
      });
    } else {
      // Not enough pull — just hide indicator
      if (indicator) { indicator.style.height = '0'; setTimeout(() => { indicator?.remove(); indicator = null; }, 300); }
    }
  }, { passive: true });

  async function _inAppRefresh() {
    try {
      // Sync latest content + logs from Sheets
      await syncContentFromSheets();
      // Re-render current page
      if (APP.currentPage === 'page-dashboard') {
        refreshDashboard();
      } else if (APP.currentPage === 'page-admin') {
        renderAdminPanel();
      } else if (APP.currentPage === 'page-history-global') {
        renderGlobalHistory();
      }
    } catch (e) {
      showToast('Refresh failed. Check connection.', 'error');
    }
  }
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
    // Register service worker once — do NOT unregister or wipe caches on every load.
    // The old unregister+clear approach was causing a reload on every page visit because:
    //   1. Unregistering then re-registering fires install → activate → clients.claim()
    //   2. clients.claim() with skipWaiting forces all open tabs to reload.
    // Now we simply register (no-op if already registered) and let the SW manage its own
    // cache updates via the standard install/activate lifecycle.
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }

  const session = Store.getSession();
  if (session) {
    APP.currentUser = session;

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
      'page-profile','page-custom-workouts','page-weekly-report','page-running',
      'page-calisthenics','page-my-plan'];
    const targetPage = (savedLastPage && restorablePages.includes(savedLastPage) && session.role !== 'ADMIN')
      ? savedLastPage : basePage;

    // Restore last module so module page re-renders correctly
    const savedModule = Store.get('ff_last_module_' + session.id);
    if (savedModule) APP.currentModule = savedModule;

    // Show target page immediately (no animation, no flash)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetEl = document.getElementById(targetPage);
    if (targetEl) { targetEl.classList.add('active'); APP.currentPage = targetPage; }

    // Render immediately from local data
    initDashboard();

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
    });

    // Init push for non-admin on session restore (page reload)
    if (session.role !== 'ADMIN' && typeof initPushNotifications === 'function') {
      initPushNotifications();
    }
  } else {
    showPage('page-login', false);
  }
});
