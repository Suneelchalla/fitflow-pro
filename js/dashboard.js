// ── DASHBOARD ─────────────────────────────────────────────────────
function initDashboard() {
  const user = APP.currentUser;
  if (!user) return;

  // Show/hide admin nav
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = user.role === 'ADMIN' ? 'flex' : 'none';

  // Render module tiles
  renderDashboardTiles();
  renderDashboardStats();
}

function renderDashboardStats() {
  const user = APP.currentUser;
  const streak = calcStreak(user.id);
  const logs = Store.getUserLogs(user.id);
  const today = todayStr();
  const thisWeekLogs = logs.filter(l => {
    const d = new Date(l.date), now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    return d >= startOfWeek;
  });

  document.getElementById('dash-streak').textContent = streak;
  document.getElementById('dash-total').textContent = logs.length;
  document.getElementById('dash-week').textContent = thisWeekLogs.length;
  document.getElementById('dash-today-day').textContent = dayName() + ', ' + new Date().toLocaleDateString('en-IN', { month:'short', day:'numeric' });
  document.getElementById('dash-greeting').textContent = getGreeting() + ', ' + user.name.split(' ')[0] + '!';

  // Weekly ring
  const weekTarget = 5 * 6; // 5 modules × 6 days
  const pct = Math.min(100, Math.round(thisWeekLogs.length / weekTarget * 100));
  const ring = document.getElementById('dash-ring');
  if (ring) {
    const circumference = 2 * Math.PI * 30;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }
  const ringPct = document.getElementById('dash-ring-pct');
  if (ringPct) ringPct.textContent = pct + '%';
}

function renderDashboardTiles() {
  const modules = [
    { id:'cardio', name:'Home Cardio', emoji:'🏠', color:'grad-cardio', sub:'6 exercises · 6 days' },
    { id:'gym', name:'Gym Workouts', emoji:'🏋️', color:'grad-gym', sub:'6 exercises · 6 days' },
    { id:'yoga', name:'Yoga', emoji:'🧘', color:'grad-yoga', sub:'6 poses · 6 days' },
    { id:'running', name:'Running & Walking', emoji:'🏃', color:'grad-running', sub:'GPS tracker + plans' },
    { id:'stretching', name:'Stretching', emoji:'🤸', color:'grad-stretch', sub:'6 stretches · 6 days' },
  ];
  const user = APP.currentUser;
  const today = todayStr();
  const todayDay = dayName();

  const grid = document.getElementById('module-grid');
  grid.innerHTML = modules.map(m => {
    const logs = Store.getModuleDayLogs(user.id, m.id);
    const todayDone = logs.some(l => l.day === todayDay && l.date === today);
    const weekDone = getWeekDays().filter(d => logs.some(l => l.day === d && l.date >= getMonday())).length;

    return `
      <div class="module-card ${m.color} animate-in" onclick="openModule('${m.id}')">
        <div>
          <div class="module-emoji">${m.emoji}</div>
          <div class="module-name">${m.name}</div>
          <div class="module-sub">${m.sub}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <span class="badge ${todayDone ? 'badge-green' : 'badge-yellow'}">${todayDone ? '✓ Today Done' : 'Today: ' + todayDay}</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.55)">${weekDone}/6 wk</span>
        </div>
        <div class="module-bg">${m.emoji}</div>
      </div>`;
  }).join('');
}

function getMonday() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ── BOTTOM NAV ────────────────────────────────────────────────────
function navTo(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-nav="${tab}"]`)?.classList.add('active');
  if (tab === 'home') { showPage('page-dashboard'); refreshDashboard(); }
  else if (tab === 'history') { showPage('page-history-global'); renderGlobalHistory(); }
  else if (tab === 'running') { openModule('running'); }
  else if (tab === 'admin') { showPage('page-admin'); renderAdminPanel(); }
}

function refreshDashboard() {
  renderDashboardStats();
  renderDashboardTiles();
}

// ── OPEN MODULE ───────────────────────────────────────────────────
function openModule(moduleId) {
  APP.currentModule = moduleId;
  if (moduleId === 'running') {
    showPage('page-running');
    initRunningPage();
    return;
  }
  showPage('page-module');
  renderModulePage(moduleId);
}

// ── MODULE PAGE ───────────────────────────────────────────────────
function renderModulePage(moduleId) {
  const mod = APP_DATA.modules[moduleId];
  if (!mod) return;

  // Header
  document.getElementById('module-title').textContent = mod.name;
  document.getElementById('module-emoji-header').textContent = mod.emoji;

  // Day tabs
  const days = getWeekDays();
  const today = dayName();
  const user = APP.currentUser;
  const logs = Store.getModuleDayLogs(user.id, moduleId);

  const dayStrip = document.getElementById('day-tab-strip');
  dayStrip.innerHTML = days.map(d => {
    const isToday = d === today;
    const done = logs.some(l => l.day === d && l.date === todayStr());
    return `<button class="tab-btn ${isToday ? 'active' : ''}" onclick="selectDay('${d}', this)">${d.slice(0,3)} ${done ? '✓' : ''}</button>`;
  }).join('');

  // Module inner tabs
  const tabs = document.querySelectorAll('.module-inner-tab');
  tabs.forEach(t => t.classList.remove('active'));
  document.getElementById('tab-workout')?.classList.add('active');
  document.querySelectorAll('.module-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('module-workout-tab')?.classList.add('active');

  // Render today's exercises
  selectDay(today, null);
}

function selectDay(day, btn) {
  APP.currentDay = day;
  if (btn) {
    document.querySelectorAll('#day-tab-strip .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderExercises(APP.currentModule, day);
  updateCompleteBtn();
}

function renderExercises(moduleId, day) {
  const mod = APP_DATA.modules[moduleId];
  const exercises = mod?.days[day];
  if (!exercises) return;

  const user = APP.currentUser;
  const sessionKey = `sess_${user.id}_${moduleId}_${day}_${todayStr()}`;
  let sessionData = Store.get(sessionKey, {});

  const container = document.getElementById('exercises-list');
  container.innerHTML = exercises.map((ex, i) => {
    const checked = sessionData[i] || [];
    const allDone = checked.length >= ex.sets;
    const imgHtml = ex.image
      ? `<img src="${ex.image}" alt="${ex.name}" onerror="this.parentElement.innerHTML='<div style=font-size:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;height:100%>💪</div>'">`
      : `<div style="font-size:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;height:100%">💪</div>`;

    const setsHtml = Array.from({length: ex.sets}, (_, s) => {
      const isDone = checked.includes(s);
      return `<div class="set-check ${isDone ? 'checked' : ''}" onclick="toggleSet('${moduleId}','${day}',${i},${s})">
        <div class="check-box">${isDone ? '✓' : ''}</div>
        <span class="check-label">Set ${s+1} — ${ex.reps}</span>
      </div>`;
    }).join('');

    return `
      <div class="exercise-card ${allDone ? 'completed' : ''} animate-in animate-in-${Math.min(i+1,5)}" id="exc-card-${i}">
        <div class="exercise-thumb">${imgHtml}</div>
        <div class="exercise-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div class="exercise-name">${i+1}. ${ex.name}</div>
            ${allDone ? '<span class="badge badge-green">✓ Done</span>' : ''}
          </div>
          <div class="exercise-meta">
            <span>🔄 ${ex.sets} sets</span>
            <span>💪 ${ex.reps}</span>
          </div>
          <div class="exercise-desc">${ex.desc}</div>
          ${ex.demo ? `<a href="${ex.demo}" target="_blank" class="demo-link">▶ Watch Demo</a>` : ''}
          <div class="sets-grid">${setsHtml}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleSet(moduleId, day, exIdx, setIdx) {
  const user = APP.currentUser;
  const sessionKey = `sess_${user.id}_${moduleId}_${day}_${todayStr()}`;
  let sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  const pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  renderExercises(moduleId, day);
  updateCompleteBtn();
}

function updateCompleteBtn() {
  const user = APP.currentUser;
  const mod = APP.currentModule;
  const day = APP.currentDay;
  const sessionKey = `sess_${user.id}_${mod}_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
  const exercises = APP_DATA.modules[mod]?.days[day];
  if (!exercises) return;

  const allDone = exercises.every((ex, i) => (sessionData[i] || []).length >= ex.sets);
  const alreadyLogged = Store.getModuleDayLogs(user.id, mod).some(l => l.day === day && l.date === todayStr());
  const btn = document.getElementById('complete-day-btn');
  if (!btn) return;
  if (alreadyLogged) {
    btn.textContent = '✓ Day Complete!';
    btn.className = 'btn btn-outline btn-full';
    btn.disabled = true;
  } else {
    btn.textContent = allDone ? '🎉 Complete Day!' : `Mark Day Complete (${Object.values(sessionData).flat().length} sets done)`;
    btn.className = `btn ${allDone ? 'btn-accent' : 'btn-primary'} btn-full`;
    btn.disabled = false;
  }
}

function completeDay() {
  const user = APP.currentUser;
  const mod = APP.currentModule;
  const day = APP.currentDay || dayName();
  const logged = Store.addLog({ userId: user.id, module: mod, day, date: todayStr(), timestamp: new Date().toISOString() });
  if (!logged) { showToast('Already logged today!', 'info'); return; }
  showToast('🎉 ' + day + ' complete! Great work!', 'success');
  updateCompleteBtn();
  // Re-render day tabs to show checkmark
  renderModulePage(mod);
  // Sync to Sheets if configured
  sheetsPost('logCompletion', { userId: user.id, module: mod, day, date: todayStr() });
}

// ── MODULE INNER TABS ─────────────────────────────────────────────
function switchModuleTab(tabId, btn) {
  document.querySelectorAll('.module-inner-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.module-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('module-' + tabId + '-tab')?.classList.add('active');
  if (tabId === 'hydration') renderHydrationTab(APP.currentModule);
  if (tabId === 'diet') renderDietTab(APP.currentModule);
  if (tabId === 'history') renderModuleHistory(APP.currentModule);
}

// ── HYDRATION TAB ─────────────────────────────────────────────────
function renderHydrationTab(moduleId) {
  const container = document.getElementById('hydration-tab-content');
  const override = Store.getContent('hydration_' + moduleId);
  const data = override || APP_DATA.hydration.default;
  const user = APP.currentUser;
  const today = todayStr();
  let currentMl = Store.getHydration(user.id, today);
  const target = data.targets.training * 1000;
  const pct = Math.min(100, Math.round(currentMl / target * 100));

  const scheduleHtml = data.schedule.map(s =>
    `<div class="info-row"><span class="lbl">${s.time}</span><span class="val">${s.amount}ml — ${s.label}</span></div>`
  ).join('');

  const tipsHtml = data.tips.map(t => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text2);line-height:1.5">💧 ${t}</div>`).join('');

  container.innerHTML = `
    <div style="padding:16px">
      <div class="hydration-ring" style="margin-bottom:20px">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg3)" stroke-width="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--g4)" stroke-width="10"
            stroke-dasharray="${2*Math.PI*50}" stroke-dashoffset="${2*Math.PI*50 * (1 - pct/100)}"
            stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:60px 60px;transition:stroke-dashoffset 0.5s"/>
        </svg>
        <div class="ring-text">
          <div class="ring-pct">${pct}%</div>
          <div class="ring-sub">${(currentMl/1000).toFixed(1)}L / ${data.targets.training}L</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${[150,200,250,400,500].map(ml => `
          <button class="btn btn-outline btn-sm" onclick="logWater(${ml})">+${ml}ml</button>
        `).join('')}
        <button class="btn btn-ghost btn-sm" onclick="resetWater()">Reset</button>
      </div>

      <div class="section-title">Daily Schedule</div>
      <div class="card card-sm" style="margin-bottom:16px">${scheduleHtml}</div>

      <div class="section-title">Hydration Tips</div>
      <div class="card card-sm">${tipsHtml}</div>
    </div>`;
}

function logWater(ml) {
  const user = APP.currentUser;
  const today = todayStr();
  let cur = Store.getHydration(user.id, today);
  Store.setHydration(user.id, today, cur + ml);
  showToast(`+${ml}ml logged! 💧`, 'success');
  renderHydrationTab(APP.currentModule);
}

function resetWater() {
  const user = APP.currentUser;
  Store.setHydration(user.id, todayStr(), 0);
  renderHydrationTab(APP.currentModule);
}

// ── DIET TAB ──────────────────────────────────────────────────────
function renderDietTab(moduleId) {
  const container = document.getElementById('diet-tab-content');
  const override = Store.getContent('diet_' + moduleId);
  const modKey = moduleId === 'cardio' ? 'cardio' : moduleId === 'gym' ? 'gym' : moduleId === 'yoga' ? 'yoga' : 'stretching';
  const data = override || APP_DATA.diet.modules[modKey] || APP_DATA.diet.modules.cardio;

  const mealsHtml = data.meals.map(m => `
    <div class="card card-sm" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${m.time}</div>
          <div style="font-weight:700;margin-top:2px">${m.name}</div>
        </div>
        <span class="badge badge-green">${m.cal} kcal</span>
      </div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:4px">${m.items}</div>
      ${m.notes ? `<div style="font-size:12px;color:var(--text3);font-style:italic">📌 ${m.notes}</div>` : ''}
    </div>`).join('');

  const totalCal = data.meals.reduce((a,m) => a + m.cal, 0);

  container.innerHTML = `
    <div style="padding:16px">
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
        <div class="section-title" style="margin-bottom:4px">${data.title}</div>
        <div style="font-family:var(--font-display);font-size:32px;color:var(--g5)">${totalCal} <span style="font-size:16px;color:var(--text2)">total kcal/day</span></div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">Adjust portions based on body weight and goals.</div>
      </div>
      ${mealsHtml}
      <div class="card card-sm" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.2)">
        <div style="font-size:13px;color:var(--accent)">⚠️ These are general guidelines. Consult a registered nutritionist for personalised advice.</div>
      </div>
    </div>`;
}

// ── MODULE HISTORY TAB ────────────────────────────────────────────
function renderModuleHistory(moduleId) {
  const container = document.getElementById('history-tab-content');
  const user = APP.currentUser;
  const logs = Store.getModuleDayLogs(user.id, moduleId).sort((a,b) => b.date.localeCompare(a.date));

  // Calendar
  const cal = buildCalendar(logs.map(l => l.date));

  const logsHtml = logs.length ? logs.slice(0,20).map(l =>
    `<div class="info-row"><span class="lbl">${l.date}</span><span class="val">${l.day} ✓</span></div>`
  ).join('') : '<div class="empty-state"><div class="empty-icon">📅</div><p>No completions yet.<br>Complete your first workout!</p></div>';

  container.innerHTML = `
    <div style="padding:16px">
      <div class="section-title">This Month</div>
      <div class="card" style="margin-bottom:16px">${cal}</div>
      <div class="section-title">Recent Log</div>
      <div class="card card-sm">${logsHtml}</div>
    </div>`;
}

function buildCalendar(completedDates) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayD = now.getDate();

  const headers = ['S','M','T','W','T','F','S'].map(d =>
    `<div class="cal-day header">${d}</div>`).join('');

  let cells = Array(firstDay === 0 ? 6 : firstDay - 1).fill('<div class="cal-day" style="background:transparent"></div>').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isDone = completedDates.includes(dateStr);
    const isToday = d === todayD;
    cells += `<div class="cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}">${d}</div>`;
  }

  return `<div class="cal-grid">${headers}${cells}</div>`;
}

// ── GLOBAL HISTORY ────────────────────────────────────────────────
function renderGlobalHistory() {
  const user = APP.currentUser;
  const logs = Store.getUserLogs(user.id).sort((a,b) => b.timestamp?.localeCompare(a.timestamp || '') || -1);
  const runLogs = Store.getUserRunLogs(user.id).sort((a,b) => b.date?.localeCompare(a.date));

  const completedDates = [...new Set(logs.map(l => l.date))];

  document.getElementById('history-cal').innerHTML = buildCalendar(completedDates);

  document.getElementById('history-stats').innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Total Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${calcStreak(user.id)}</div><div class="stat-label">Day Streak 🔥</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.length}</div><div class="stat-label">Runs Logged</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.reduce((a,r) => a+(r.distance||0), 0).toFixed(1)}</div><div class="stat-label">Total km Run</div></div>
    </div>`;

  const logHtml = logs.length ? logs.slice(0,30).map(l =>
    `<div class="user-row" style="margin-bottom:6px">
      <div class="user-avatar" style="font-size:18px">${getModuleEmoji(l.module)}</div>
      <div class="user-info">
        <div class="user-name">${getModuleName(l.module)} — ${l.day}</div>
        <div class="user-email">${l.date}</div>
      </div>
      <span class="badge badge-green">✓ Done</span>
    </div>`) .join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet. Start working out!</p></div>';

  document.getElementById('history-log').innerHTML = logHtml;
}

function getModuleEmoji(mod) {
  return { cardio:'🏠', gym:'🏋️', yoga:'🧘', stretching:'🤸', running:'🏃' }[mod] || '💪';
}
function getModuleName(mod) {
  return { cardio:'Home Cardio', gym:'Gym Workouts', yoga:'Yoga', stretching:'Stretching', running:'Running' }[mod] || mod;
}
