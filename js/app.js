// ── APP STATE ────────────────────────────────────────────────────
window.APP = {
  currentUser:   null,
  currentPage:   null,
  currentModule: null,
  currentDay:    null,
  runSession:    null,
  runInterval:   null,
  runWatchId:    null,
  gpsCoords:     [],
  pageHistory:   [],
  pendingUser:   null,
};

// ── STORAGE ───────────────────────────────────────────────────────
const Store = {
  get(key, fallback=null) {
    try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } },
  remove(key)   { try { localStorage.removeItem(key); } catch {} },

  saveSession(u)  { this.set('ff_session', u); },
  getSession()    { return this.get('ff_session'); },
  clearSession()  { this.remove('ff_session'); },

  getLogs()       { return this.get('ff_logs', []); },
  addLog(log) {
    const logs = this.getLogs();
    if (logs.find(l => l.userId===log.userId && l.module===log.module && l.day===log.day && l.date===log.date)) return false;
    logs.push({ ...log, id:'log_'+Date.now() });
    this.set('ff_logs', logs);
    return true;
  },
  getUserLogs(uid)           { return this.getLogs().filter(l=>l.userId===uid); },
  getModuleDayLogs(uid, mod) { return this.getLogs().filter(l=>l.userId===uid && l.module===mod); },

  getRunLogs()        { return this.get('ff_runlogs', []); },
  addRunLog(log)      { const logs=this.getRunLogs(); logs.push({...log,id:'run_'+Date.now()}); this.set('ff_runlogs',logs); },
  getUserRunLogs(uid) { return this.getRunLogs().filter(l=>l.userId===uid); },

  getContent(key)       { return this.get('ff_content_'+key); },
  setContent(key, val)  { this.set('ff_content_'+key, val); },

  getSheetsConfig()     { return this.get('ff_sheets_config', { webAppUrl:'' }); },
  setSheetsConfig(cfg)  { this.set('ff_sheets_config', cfg); },

  getHydration(uid, d)      { return this.get(`ff_h_${uid}_${d}`, 0); },
  setHydration(uid, d, ml)  { this.set(`ff_h_${uid}_${d}`, ml); },
};

// ── SHEETS API ────────────────────────────────────────────────────
const Sheets = {
  async get(action, params={}) {
    const cfg = Store.getSheetsConfig();
    if (!cfg.webAppUrl) return null;
    try {
      const qs = new URLSearchParams({ action, ...params }).toString();
      return await (await fetch(`${cfg.webAppUrl}?${qs}`)).json();
    } catch { return null; }
  },
  async post(action, data={}) {
    const cfg = Store.getSheetsConfig();
    if (!cfg.webAppUrl) return null;
    try {
      return await (await fetch(cfg.webAppUrl, {
        method:'POST',
        body: JSON.stringify({ action, ...data }),
        headers:{ 'Content-Type':'text/plain' }
      })).json();
    } catch { return null; }
  }
};
async function sheetsPost(action, data) { return Sheets.post(action, data); }

// ── TOAST ─────────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className='', 2800);
}

// ── PAGE ROUTING WITH BACK STACK ─────────────────────────────────
function showPage(id, addToHistory=true) {
  const prev = APP.currentPage;
  const rootPages = ['page-login','page-dashboard','page-admin','page-quote'];

  if (addToHistory && prev && !rootPages.includes(prev) && prev !== id) {
    APP.pageHistory.push(prev);
    if (APP.pageHistory.length > 15) APP.pageHistory.shift();
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) { pg.classList.add('active'); APP.currentPage = id; pg.scrollTop = 0; }
  window.history.pushState({ page: id }, '', '#' + id);
}

function goBack() {
  if (APP.pageHistory.length > 0) {
    const prev = APP.pageHistory.pop();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById(prev);
    if (pg) { pg.classList.add('active'); APP.currentPage = prev; }
    window.history.pushState({ page: prev }, '', '#' + prev);
    syncNavHighlight(prev);
  } else {
    // Back to home
    const isAdmin = APP.currentUser?.role === 'ADMIN';
    const home = isAdmin ? 'page-admin' : 'page-dashboard';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(home)?.classList.add('active');
    APP.currentPage = home;
    window.history.pushState({ page: home }, '', '#' + home);
    if (!isAdmin) setActiveNav('home');
  }
}

function syncNavHighlight(pageId) {
  if (pageId === 'page-dashboard')       setActiveNav('home');
  else if (pageId === 'page-history-global') setActiveNav('history');
  else if (pageId === 'page-running')    setActiveNav('running');
  else if (pageId === 'page-admin')      setActiveNav('admin');
}

// Android back button / browser back
window.addEventListener('popstate', e => {
  const rootPages = ['page-login','page-dashboard','page-admin'];
  if (rootPages.includes(APP.currentPage)) {
    window.history.pushState({ page: APP.currentPage }, '', '#' + APP.currentPage);
    return;
  }
  goBack();
});

// ── SWIPE RIGHT → GO BACK ─────────────────────────────────────────
(function() {
  let sx=0, sy=0;
  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive:true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = Math.abs(e.changedTouches[0].clientY - sy);
    const rootPages = ['page-login','page-dashboard','page-admin','page-quote'];

    if (dx > 70 && dy < 80 && !rootPages.includes(APP.currentPage)) {
      goBack();
    }
  }, { passive:true });
})();

// ── MODAL ─────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── BOTTOM NAV ────────────────────────────────────────────────────
function setActiveNav(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-nav="${tab}"]`)?.classList.add('active');
}

function navTo(tab) {
  setActiveNav(tab);
  APP.pageHistory = []; // clear stack when using nav
  if (tab === 'home')         { showPage('page-dashboard', false); refreshDashboard(); }
  else if (tab === 'history') { showPage('page-history-global'); renderGlobalHistory(); }
  else if (tab === 'running') { openModule('running'); }
  else if (tab === 'admin')   { showPage('page-admin', false); renderAdminPanel(); }
}

// ── HELPERS ───────────────────────────────────────────────────────
function fmtTime(secs) {
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
             : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function fmtPace(km,secs) {
  if(km<0.05) return '--:--';
  const p=secs/60/km,pm=Math.floor(p),ps=Math.round((p-pm)*60);
  return `${pm}:${String(ps).padStart(2,'0')}`;
}
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function dayName()     { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; }
function getWeekDays() { return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; }
function getGreeting() {
  const h=new Date().getHours();
  return h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening';
}
function calcStreak(uid) {
  const dates=[...new Set(Store.getUserLogs(uid).map(l=>l.date))].sort().reverse();
  if(!dates.length) return 0;
  let streak=0,cur=new Date();
  for(let i=0;i<60;i++){
    const d=cur.toISOString().split('T')[0];
    if(dates.includes(d)){streak++;cur.setDate(cur.getDate()-1);}
    else if(i>0) break;
    else{cur.setDate(cur.getDate()-1);if(!dates.includes(cur.toISOString().split('T')[0]))break;}
  }
  return streak;
}
function haversine(a,b,c,d){
  const R=6371,dA=(c-a)*Math.PI/180,dB=(d-b)*Math.PI/180;
  const e=Math.sin(dA/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dB/2)**2;
  return R*2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e));
}

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('ff_local_users')) {
    localStorage.setItem('ff_local_users', JSON.stringify([
      { id:'u_admin', name:'Admin User', email:'admin@fitflow.com', password:'admin123',
        tempPassword:'', isFirstLogin:false, role:'ADMIN', status:'ACTIVE' }
    ]));
  }

  window.history.replaceState({ page:'page-login' }, '', '#page-login');

  const session = Store.getSession();
  if (session) {
    APP.currentUser = session;
    if (session.role === 'ADMIN') {
      initDashboard();
      showPage('page-admin', false);
      renderAdminPanel();
    } else {
      initDashboard();
      const lastQuote = Store.get('ff_quote_'+session.id);
      if (lastQuote === todayStr()) {
        showPage('page-dashboard', false);
        setActiveNav('home');
      } else {
        renderQuote();
        showPage('page-quote', false);
      }
    }
  } else {
    showPage('page-login', false);
  }

  document.querySelectorAll('.modal-overlay').forEach(mo => {
    mo.addEventListener('click', e => { if(e.target===mo) mo.classList.remove('open'); });
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
});
