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

  getLogs()         { return this.get('ff_logs', []); },
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

  getRunLogs()                { return this.get('ff_runlogs', []); },
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
    logs.push({ ...log, id: 'run_' + Date.now() });
    this.set('ff_runlogs', logs);
    return true;
  },
  getUserRunLogs(uid)         { return this.getRunLogs().filter(l => l.userId === uid); },

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
      return await r.json();
    } catch { return null; }
  },
  async post(action, data = {}) {
    const cfg = Store.getSheetsConfig();
    if (!cfg.webAppUrl) return null;
    try {
      const r = await fetch(cfg.webAppUrl, {
        method:  'POST',
        body:    JSON.stringify({ action, ...data }),
        headers: { 'Content-Type': 'text/plain' },
      });
      return await r.json();
    } catch { return null; }
  },
};
// Alias used across files
async function sheetsPost(action, data) { return Sheets.post(action, data); }

// ── TOAST ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 2800);
}

// ── PAGE ROUTING ─────────────────────────────────────────────────
// page-running is a ROOT_PAGE so the global swipe-back gesture never
// fires while a run is active — map panning was triggering goBack().
const ROOT_PAGES = ['page-login', 'page-dashboard', 'page-admin', 'page-quote', 'page-onboarding', 'page-my-plan', 'page-running'];

function showPage(id, addToHistory = true) {
  const prev = APP.currentPage;
  if (addToHistory && prev && !ROOT_PAGES.includes(prev) && prev !== id) {
    APP.pageHistory.push(prev);
    if (APP.pageHistory.length > 20) APP.pageHistory.shift();
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) { pg.classList.add('active'); APP.currentPage = id; pg.scrollTop = 0; }
  window.history.pushState({ page: id }, '', '#' + id);
  // Persist last page so refresh can restore it
  if (APP.currentUser) Store.set('ff_last_page_' + APP.currentUser.id, id);
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
}

window.addEventListener('popstate', e => {
  // Only handle real navigation events, not browser chrome show/hide
  if (!e.state?.page) return;
  if (ROOT_PAGES.includes(APP.currentPage)) {
    window.history.pushState({ page: APP.currentPage }, '', '#' + APP.currentPage);
    return;
  }
  goBack();
});

// ── SWIPE-LEFT → BACK ─────────────────────────────────────────────
// Tracks peak vertical movement during the touch to distinguish
// a real horizontal swipe from a finger lifting off after a scroll.
(function () {
  let sx = 0, sy = 0, maxDy = 0;
  document.addEventListener('touchstart', e => {
    sx    = e.touches[0].clientX;
    sy    = e.touches[0].clientY;
    maxDy = 0;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    // Track the highest vertical displacement seen during this gesture
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dy > maxDy) maxDy = dy;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);
    // If the finger traveled more than 30px vertically at ANY point during
    // the gesture, treat it as a scroll — never trigger swipe-back.
    if (maxDy > 30) return;
    // Horizontal swipe must be > 80px, final vertical drift < 40px,
    // and horizontal movement must be at least 2x the vertical movement.
    if (dx < -80 && dy < 40 && Math.abs(dx) > dy * 2 && !ROOT_PAGES.includes(APP.currentPage)) {
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
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
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
function todayStr()    { return new Date().toISOString().split('T')[0]; }
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
  const d = new Date(), day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}
function calcStreak(uid) {
  const dates = [...new Set(Store.getUserLogs(uid).map(l => l.date))].sort().reverse();
  if (!dates.length) return 0;
  let streak = 0, cur = new Date();
  for (let i = 0; i < 60; i++) {
    const d = cur.toISOString().split('T')[0];
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate() - 1); }
    else if (i > 0) break;
    else { cur.setDate(cur.getDate() - 1); if (!dates.includes(cur.toISOString().split('T')[0])) break; }
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

  document.querySelectorAll('.modal-overlay').forEach(mo => {
    mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });
  });

  if ('serviceWorker' in navigator) {
    // Unregister ALL old service workers and clear ALL caches
    // This forces every device to get fresh files immediately
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    // Re-register the fresh service worker
    setTimeout(() => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }, 1000);
  }

  const session = Store.getSession();
  if (session) {
    APP.currentUser = session;

    // Restore to correct page INSTANTLY before any rendering
    // This prevents the login page flash on pull-down / reload
    const savedLastPage = Store.get('ff_last_page_' + session.id);
    const basePage = session.role === 'ADMIN'
      ? 'page-admin'
      : Store.get('ff_quote_' + session.id) === todayStr()
        ? 'page-dashboard'
        : 'page-quote';

    // Use saved page if it's a valid restorable page; otherwise use basePage
    const restorablePages = ['page-dashboard', 'page-history-global', 'page-module',
      'page-profile', 'page-custom-workouts', 'page-weekly-report', 'page-running',
      'page-calisthenics', 'page-my-plan', 'page-admin'];
    const targetPage = (savedLastPage && restorablePages.includes(savedLastPage) && session.role !== 'ADMIN')
      ? savedLastPage
      : basePage;

    // Show target page immediately (no animation, no flash)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetEl = document.getElementById(targetPage);
    if (targetEl) { targetEl.classList.add('active'); APP.currentPage = targetPage; }

    // Restore last module so refresh lands back on the same module page
    const savedModule = Store.get('ff_last_module_' + session.id);
    if (savedModule) APP.currentModule = savedModule;

    // Render immediately from local data, then re-render after sync for accuracy
    initDashboard();

    if (session.role === 'ADMIN') {
      renderAdminPanel();
    } else if (targetPage === 'page-quote') {
      renderQuote();
    } else if (targetPage === 'page-module' && APP.currentModule) {
      // Restore module page content on refresh
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
      if (typeof renderWeeklyReport === 'function') renderWeeklyReport();
      setActiveNav('home');
    } else if (targetPage === 'page-profile') {
      if (typeof renderProfilePage === 'function') renderProfilePage();
      setActiveNav('home');
    } else {
      setActiveNav('home');
    }

    // Sync from Sheets then re-render dashboard stats so ring/streak are accurate
    syncContentFromSheets().then(() => {
      if (typeof refreshDashboard === 'function') refreshDashboard();
      // If on module page, also re-render exercises in case admin updated content
      if (APP.currentPage === 'page-module' && APP.currentModule) {
        if (typeof renderExercises === 'function') renderExercises(APP.currentModule, APP.currentDay || (new Date()).toLocaleDateString('en-US', { weekday: 'long' }));
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
