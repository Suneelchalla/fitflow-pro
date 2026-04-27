// ── APP STATE ────────────────────────────────────────────────────
window.APP = {
  currentUser: null,
  currentPage: null,
  currentModule: null,
  currentDay: null,
  runSession: null,
  runInterval: null,
  runWatchId: null,
  gpsCoords: [],
  sheetsConfig: null,
};

// ── STORAGE HELPERS ──────────────────────────────────────────────
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} },

  // ── Users ──
  getUsers() { return this.get('ff_users', window.DEFAULT_USERS); },
  saveUsers(users) { this.set('ff_users', users); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); },

  // ── Session ──
  saveSession(user) { this.set('ff_session', user); },
  getSession() { return this.get('ff_session'); },
  clearSession() { this.remove('ff_session'); },

  // ── Completion logs ──
  getLogs() { return this.get('ff_logs', []); },
  addLog(log) {
    const logs = this.getLogs();
    // prevent duplicate
    const dup = logs.find(l => l.userId === log.userId && l.module === log.module && l.day === log.day && l.date === log.date);
    if (dup) return false;
    logs.push({ ...log, id: 'log_' + Date.now() });
    this.set('ff_logs', logs);
    return true;
  },
  getUserLogs(userId) { return this.getLogs().filter(l => l.userId === userId); },
  getModuleDayLogs(userId, module) {
    return this.getLogs().filter(l => l.userId === userId && l.module === module);
  },

  // ── Running logs ──
  getRunLogs() { return this.get('ff_runlogs', []); },
  addRunLog(log) {
    const logs = this.getRunLogs();
    logs.push({ ...log, id: 'run_' + Date.now() });
    this.set('ff_runlogs', logs);
  },
  getUserRunLogs(userId) { return this.getRunLogs().filter(l => l.userId === userId); },

  // ── Content overrides (admin edits) ──
  getContent(key) { return this.get('ff_content_' + key); },
  setContent(key, val) { this.set('ff_content_' + key, val); },

  // ── Sheets config ──
  getSheetsConfig() { return this.get('ff_sheets_config', { webAppUrl: '', spreadsheetId: '' }); },
  setSheetsConfig(cfg) { this.set('ff_sheets_config', cfg); },

  // ── Hydration log ──
  getHydration(userId, date) { return this.get(`ff_hydration_${userId}_${date}`, 0); },
  setHydration(userId, date, ml) { this.set(`ff_hydration_${userId}_${date}`, ml); },
};

// ── TOAST ────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  setTimeout(() => t.className = '', 2800);
}

// ── PAGE ROUTING ─────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) {
    pg.classList.add('active');
    APP.currentPage = id;
    pg.scrollTop = 0;
  }
}

// ── MODAL ────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open')); }

// ── FORMAT HELPERS ───────────────────────────────────────────────
function fmtTime(secs) {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function fmtDist(km) { return km >= 1 ? km.toFixed(2) + ' km' : (km * 1000).toFixed(0) + ' m'; }
function fmtPace(km, secs) {
  if (km < 0.05) return '--:--';
  const pace = secs / 60 / km;
  const pm = Math.floor(pace), ps = Math.round((pace - pm) * 60);
  return `${pm}:${String(ps).padStart(2,'0')}`;
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function dayName() { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; }
function getWeekDays() { return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; }

// ── STREAK CALC ──────────────────────────────────────────────────
function calcStreak(userId) {
  const logs = Store.getUserLogs(userId);
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse();
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

// ── GPS DISTANCE ─────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── GOOGLE SHEETS SYNC (optional) ────────────────────────────────
async function sheetsPost(action, data = {}) {
  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) return null;
  try {
    const res = await fetch(cfg.webAppUrl, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
      headers: { 'Content-Type': 'text/plain' }
    });
    return await res.json();
  } catch { return null; }
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Init users if first time
  if (!localStorage.getItem('ff_users')) {
    Store.saveUsers(window.DEFAULT_USERS);
  }

  // Check session
  const session = Store.getSession();
  if (session) {
    APP.currentUser = session;
    initDashboard();
    showPage('page-quote');
    renderQuote();
  } else {
    showPage('page-login');
  }

  // Close modals on overlay tap
  document.querySelectorAll('.modal-overlay').forEach(mo => {
    mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });
  });
});
