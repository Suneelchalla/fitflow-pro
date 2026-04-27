// ── DASHBOARD ─────────────────────────────────────────────────────
function initDashboard() {
  const user = APP.currentUser;
  if (!user) return;
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = user.role === 'ADMIN' ? 'flex' : 'none';
  renderDashboardTiles();
  renderDashboardStats();
}

function renderDashboardStats() {
  const user  = APP.currentUser;
  const logs  = Store.getUserLogs(user.id);
  const today = todayStr();
  const monday = getMonday();

  const streak        = calcStreak(user.id);
  const thisWeekLogs  = logs.filter(l => l.date >= monday);

  const streakEl  = document.getElementById('dash-streak');
  const totalEl   = document.getElementById('dash-total');
  const weekEl    = document.getElementById('dash-week');
  const dayEl     = document.getElementById('dash-today-day');
  const greetEl   = document.getElementById('dash-greeting');

  if (streakEl) streakEl.textContent = streak;
  if (totalEl)  totalEl.textContent  = logs.length;
  if (weekEl)   weekEl.textContent   = thisWeekLogs.length;
  if (dayEl)    dayEl.textContent    = dayName() + ', ' + new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  if (greetEl)  greetEl.textContent  = getGreeting() + ', ' + user.name.split(' ')[0] + '!';

  const weekTarget  = 5 * 6;
  const pct         = Math.min(100, Math.round(thisWeekLogs.length / weekTarget * 100));
  const ring        = document.getElementById('dash-ring');
  const ringPctEl   = document.getElementById('dash-ring-pct');
  if (ring) {
    const circumference = 2 * Math.PI * 30;
    ring.style.strokeDasharray  = circumference;
    ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }
  if (ringPctEl) ringPctEl.textContent = pct + '%';
}

function renderDashboardTiles() {
  const modules = [
    { id: 'cardio',     name: 'Home Cardio',        emoji: '🏠', color: 'grad-cardio',  sub: '6 exercises · 6 days' },
    { id: 'gym',        name: 'Gym Workouts',        emoji: '🏋️', color: 'grad-gym',     sub: '6 exercises · 6 days' },
    { id: 'yoga',       name: 'Yoga',                emoji: '🧘', color: 'grad-yoga',    sub: '6 poses · 6 days' },
    { id: 'running',    name: 'Running & Walking',   emoji: '🏃', color: 'grad-running', sub: 'GPS tracker + plans' },
    { id: 'stretching', name: 'Stretching',          emoji: '🤸', color: 'grad-stretch', sub: '6 stretches · 6 days' },
  ];
  const user     = APP.currentUser;
  const today    = todayStr();
  const todayDay = dayName();
  const monday   = getMonday();

  const grid = document.getElementById('module-grid');
  if (!grid) return;

  grid.innerHTML = modules.map(m => {
    const logs      = Store.getModuleDayLogs(user.id, m.id);
    const todayDone = logs.some(l => l.day === todayDay && l.date === today);
    const weekDone  = getWeekDays().filter(d => logs.some(l => l.day === d && l.date >= monday)).length;

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

  document.getElementById('module-title').textContent        = mod.name;
  document.getElementById('module-emoji-header').textContent = mod.emoji;

  const days    = getWeekDays();
  const today   = dayName();
  const user    = APP.currentUser;
  const logs    = Store.getModuleDayLogs(user.id, moduleId);
  const todayDate = todayStr();

  document.getElementById('day-tab-strip').innerHTML = days.map(d => {
    const isToday = d === today;
    const done    = logs.some(l => l.day === d && l.date === todayDate);
    return `<button class="tab-btn ${isToday ? 'active' : ''}" onclick="selectDay('${d}', this)">${d.slice(0, 3)} ${done ? '✓' : ''}</button>`;
  }).join('');

  // Reset inner tabs to Workout
  document.querySelectorAll('.module-inner-tab').forEach(t => t.classList.remove('active'));
  // Activate first tab button (Workout)
  document.querySelector('.module-inner-tab')?.classList.add('active');
  // Show only workout tab content
  document.querySelectorAll('.module-tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('module-workout-tab')?.classList.add('active');

  // Always set currentDay before rendering
  APP.currentDay = today;
  renderExercises(moduleId, today);
  updateCompleteBtn();
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

// ── RENDER EXERCISES ──────────────────────────────────────────────
function renderExercises(moduleId, day) {
  if (!moduleId || !day) return;
  const mod = APP_DATA.modules[moduleId];

  // Check for admin-saved overrides first, then fall back to built-in data
  const exOverride    = Store.getContent('exercises_' + moduleId);
  const mainExercises = exOverride?.days?.[day] || mod?.days?.[day] || [];

  const warmupKey   = APP_DATA.warmups?.[moduleId]   ? moduleId : 'cardio';
  const cooldownKey = APP_DATA.cooldowns?.[moduleId] ? moduleId : 'cardio';
  const warmups     = Store.getContent('warmup_'    + moduleId) || APP_DATA.warmups?.[warmupKey]    || [];
  const cooldowns   = Store.getContent('cooldown_'  + moduleId) || APP_DATA.cooldowns?.[cooldownKey] || [];

  const allExercises = [
    ...warmups.map(e      => ({ ...e, _section: 'warmup' })),
    ...mainExercises.map(e => ({ ...e, _section: 'main' })),
    ...cooldowns.map(e    => ({ ...e, _section: 'cooldown' })),
  ];

  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_${moduleId}_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});

  function secHeader(label, bg, emoji) {
    return `<div style="display:flex;align-items:center;gap:8px;margin:18px 0 10px;padding:9px 14px;border-radius:10px;background:${bg}">
      <span style="font-size:16px">${emoji}</span>
      <span style="font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em">${label}</span>
    </div>`;
  }

  let prevSection = '';
  const container = document.getElementById('exercises-list');
  if (!container) return;

  container.innerHTML = allExercises.map((ex, i) => {
    let hdr = '';
    if (ex._section !== prevSection) {
      prevSection = ex._section;
      if (ex._section === 'warmup')   hdr = secHeader('Warm-Up', 'rgba(30,136,229,0.35)', '🔥');
      if (ex._section === 'main')     hdr = secHeader('Main Workout', 'rgba(46,125,70,0.4)', '💪');
      if (ex._section === 'cooldown') hdr = secHeader('Cool-Down & Stretches', 'rgba(103,58,183,0.35)', '🧘');
    }

    const checked = sessionData[i] || [];
    const allDone = checked.length >= (parseInt(ex.sets) || 1);
    const thumb   = ex.image
      ? `<img src="${ex.image}" alt="${ex.name}" loading="lazy" onerror="this.style.display='none'">`
      : `<div style="font-size:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;height:100%">💪</div>`;

    const setsHtml = Array.from({ length: parseInt(ex.sets) || 1 }, (_, s) => {
      const isDone = checked.includes(s);
      return `<div class="set-check ${isDone ? 'checked' : ''}" onclick="toggleSet('${moduleId}','${day}',${i},${s})">
        <div class="check-box">${isDone ? '✓' : ''}</div>
        <span class="check-label">Set ${s + 1} — ${ex.reps || ''}</span>
      </div>`;
    }).join('');

    return `${hdr}
      <div class="exercise-card ${allDone ? 'completed' : ''} animate-in animate-in-${Math.min(i % 5 + 1, 5)}" id="exc-card-${i}">
        <div class="exercise-thumb">${thumb}</div>
        <div class="exercise-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div class="exercise-name">${i + 1}. ${ex.name || ''}</div>
            ${allDone ? '<span class="badge badge-green">✓ Done</span>' : ''}
          </div>
          <div class="exercise-meta">
            <span>🔄 ${ex.sets || 1} sets</span>
            <span>💪 ${ex.reps || ''}</span>
          </div>
          <div class="exercise-desc">${ex.desc || ''}</div>
          ${ex.demo ? `<a href="${ex.demo}" target="_blank" rel="noopener" class="demo-link">▶ Watch Demo</a>` : ''}
          <div class="sets-grid">${setsHtml}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleSet(moduleId, day, exIdx, setIdx) {
  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_${moduleId}_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
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
  const mod  = APP.currentModule;
  const day  = APP.currentDay;
  if (!user || !mod || !day) return;

  const sessionKey  = `sess_${user.id}_${mod}_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});

  const exOverride    = Store.getContent('exercises_' + mod);
  const mainExercises = exOverride?.days?.[day] || APP_DATA.modules[mod]?.days?.[day] || [];
  const warmups       = Store.getContent('warmup_'   + mod) || APP_DATA.warmups?.[mod]   || APP_DATA.warmups?.cardio   || [];
  const cooldowns     = Store.getContent('cooldown_' + mod) || APP_DATA.cooldowns?.[mod] || APP_DATA.cooldowns?.cardio || [];
  const all           = [...warmups, ...mainExercises, ...cooldowns];

  if (!all.length) return;

  const totalSets     = all.reduce((a, e) => a + (parseInt(e.sets) || 1), 0);
  const doneSets      = Object.values(sessionData).flat().length;
  const allDone       = all.every((ex, i) => (sessionData[i] || []).length >= (parseInt(ex.sets) || 1));
  const alreadyLogged = Store.getModuleDayLogs(user.id, mod).some(l => l.day === day && l.date === todayStr());

  const btn = document.getElementById('complete-day-btn');
  if (!btn) return;

  if (alreadyLogged) {
    btn.textContent = '✓ Day Complete!';
    btn.className   = 'btn btn-outline btn-full';
    btn.disabled    = true;
  } else {
    btn.textContent = allDone ? '🎉 Complete Day!' : `Mark Day Complete (${doneSets}/${totalSets} sets)`;
    btn.className   = `btn ${allDone ? 'btn-accent' : 'btn-primary'} btn-full`;
    btn.disabled    = false;
  }
}

function completeDay() {
  const user = APP.currentUser;
  const mod  = APP.currentModule;
  const day  = APP.currentDay || dayName();

  const logged = Store.addLog({
    userId:    user.id,
    module:    mod,
    day:       day,
    date:      todayStr(),
    timestamp: new Date().toISOString(),
  });

  if (!logged) { showToast('Already logged today!', 'info'); return; }

  showToast('🎉 ' + day + ' complete! Great work!', 'success');
  updateCompleteBtn();

  // Refresh day tabs to show ✓ — without resetting selected day
  const logs    = Store.getModuleDayLogs(user.id, mod);
  const todayDate = todayStr();
  document.querySelectorAll('#day-tab-strip .tab-btn').forEach((btn, i) => {
    const d    = getWeekDays()[i];
    const done = logs.some(l => l.day === d && l.date === todayDate);
    btn.textContent = d.slice(0, 3) + (done ? ' ✓' : '');
  });

  sheetsPost('logCompletion', { userId: user.id, module: mod, day, date: todayStr() });
}

// ── MODULE INNER TABS ─────────────────────────────────────────────
function switchModuleTab(tabId, btn) {
  document.querySelectorAll('.module-inner-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.module-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('module-' + tabId + '-tab')?.classList.add('active');
  if (tabId === 'hydration') renderHydrationTab(APP.currentModule);
  if (tabId === 'diet')      renderDietTab(APP.currentModule);
  if (tabId === 'history')   renderModuleHistory(APP.currentModule);
}

// ── HYDRATION TAB ─────────────────────────────────────────────────
function renderHydrationTab(moduleId) {
  const container = document.getElementById('hydration-tab-content');
  if (!container) return;

  const override  = Store.getContent('hydration_' + moduleId);
  // Use per-module hydration plan — fall back to default if not found
  const perModule = APP_DATA.hydration?.[moduleId] || APP_DATA.hydration?.default || {};
  const data      = override || perModule;

  // Safe fallbacks for every field
  const title    = data.title    || 'Daily Hydration Plan';
  const targets  = data.targets  || { training: 3.5, rest: 2.5 };
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const tips     = Array.isArray(data.tips)     ? data.tips     : [];

  const user      = APP.currentUser;
  const today     = todayStr();
  const currentMl = Store.getHydration(user.id, today);
  const target    = (targets.training || 3.5) * 1000;
  const pct       = Math.min(100, Math.round(currentMl / target * 100));

  const scheduleHtml = schedule.map(s =>
    `<div class="info-row">
      <span class="lbl">${s.time || ''}</span>
      <span class="val">${s.amount || 0}ml — ${s.label || ''}</span>
    </div>`
  ).join('');

  const tipsHtml = tips.map(t =>
    `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text2);line-height:1.5">💧 ${t}</div>`
  ).join('');

  container.innerHTML = `
    <div style="padding:16px">
      <div class="hydration-ring" style="margin-bottom:20px">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg3)" stroke-width="10"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--g4)" stroke-width="10"
            stroke-dasharray="${2 * Math.PI * 50}"
            stroke-dashoffset="${2 * Math.PI * 50 * (1 - pct / 100)}"
            stroke-linecap="round"
            style="transform:rotate(-90deg);transform-origin:60px 60px;transition:stroke-dashoffset 0.5s"/>
        </svg>
        <div class="ring-text">
          <div class="ring-pct">${pct}%</div>
          <div class="ring-sub">${(currentMl / 1000).toFixed(1)}L / ${targets.training}L</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${[150, 200, 250, 400, 500].map(ml =>
          `<button class="btn btn-outline btn-sm" onclick="logWater(${ml})">+${ml}ml</button>`
        ).join('')}
        <button class="btn btn-ghost btn-sm" onclick="resetWater()">Reset</button>
      </div>

      <div class="section-title">Daily Schedule</div>
      <div class="card card-sm" style="margin-bottom:16px">
        ${scheduleHtml || '<p style="color:var(--text3);font-size:13px">No schedule set.</p>'}
      </div>

      <div class="section-title">Hydration Tips</div>
      <div class="card card-sm">
        ${tipsHtml || '<p style="color:var(--text3);font-size:13px">No tips set.</p>'}
      </div>
    </div>`;
}

function logWater(ml) {
  const user  = APP.currentUser;
  const today = todayStr();
  Store.setHydration(user.id, today, Store.getHydration(user.id, today) + ml);
  showToast(`+${ml}ml logged! 💧`, 'success');
  renderHydrationTab(APP.currentModule);
}
function resetWater() {
  Store.setHydration(APP.currentUser.id, todayStr(), 0);
  renderHydrationTab(APP.currentModule);
}

// ── DIET TAB ──────────────────────────────────────────────────────
function renderDietTab(moduleId) {
  const container = document.getElementById('diet-tab-content');
  if (!container) return;

  const override = Store.getContent('diet_' + moduleId);
  // Use exact module key — all modules now have their own diet plan
  const modKey   = APP_DATA.diet?.modules?.[moduleId] ? moduleId : 'cardio';
  const data     = override || APP_DATA.diet?.modules?.[modKey] || { title: 'Diet Plan', meals: [] };

  const meals    = Array.isArray(data.meals) ? data.meals : [];
  const totalCal = meals.reduce((a, m) => a + (parseInt(m.cal) || 0), 0);

  const mealsHtml = meals.map(m => `
    <div class="card card-sm" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${m.time || ''}</div>
          <div style="font-weight:700;margin-top:2px">${m.name || ''}</div>
        </div>
        <span class="badge badge-green">${m.cal || 0} kcal</span>
      </div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:4px">${m.items || ''}</div>
      ${m.notes ? `<div style="font-size:12px;color:var(--text3);font-style:italic">📌 ${m.notes}</div>` : ''}
    </div>`).join('');

  container.innerHTML = `
    <div style="padding:16px">
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
        <div class="section-title" style="margin-bottom:4px">${data.title || 'Diet Plan'}</div>
        <div style="font-family:var(--font-display);font-size:32px;color:var(--g5)">${totalCal}
          <span style="font-size:16px;color:var(--text2)">total kcal/day</span>
        </div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">Adjust portions based on your goals.</div>
      </div>
      ${mealsHtml}
      <div class="card card-sm" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.2)">
        <div style="font-size:13px;color:var(--accent)">⚠️ General guidelines only. Consult a nutritionist for personalised advice.</div>
      </div>
    </div>`;
}

// ── MODULE HISTORY TAB ────────────────────────────────────────────
function renderModuleHistory(moduleId) {
  const container = document.getElementById('history-tab-content');
  if (!container) return;
  const user = APP.currentUser;
  const logs = Store.getModuleDayLogs(user.id, moduleId).sort((a, b) => b.date.localeCompare(a.date));
  // Ensure all logs carry the module field for calendar emoji rendering
  const logsWithModule = logs.map(l => ({ ...l, module: l.module || moduleId }));

  const logsHtml = logs.length
    ? logs.slice(0, 30).map(l => `
        <div class="user-row" style="margin-bottom:6px">
          <div class="user-avatar" style="font-size:18px">${getModuleEmoji(l.module || moduleId)}</div>
          <div class="user-info">
            <div class="user-name">${l.day}</div>
            <div class="user-email">${l.date}</div>
          </div>
          <span class="badge badge-green">✓ Done</span>
        </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">📅</div><p>No completions yet.<br>Complete your first workout!</p></div>';

  container.innerHTML = `
    <div style="padding:16px">
      <div class="section-title">This Month</div>
      <div class="card" style="margin-bottom:16px">${buildCalendar(logsWithModule, moduleId)}</div>
      <div class="section-title">Recent Log</div>
      <div id="module-history-log">${logsHtml}</div>
    </div>`;
}

// buildCalendar — rich version with emoji, red marks, today ring
// logs: array of { date, module } — all activity logs for this user
// moduleFilter: optional — if set, only show that module's emoji
function buildCalendar(logs, moduleFilter) {
  const now         = new Date();
  const year        = now.getFullYear(), month = now.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayD      = now.getDate();
  const todayStr_   = now.toISOString().split('T')[0];

  // Build a map: dateStr → [emoji, emoji, ...]
  const dateMap = {};
  logs.forEach(l => {
    const d = l.date || '';
    if (!d) return;
    if (!dateMap[d]) dateMap[d] = new Set();
    dateMap[d].add(getModuleEmoji(l.module));
  });

  const headers = ['S','M','T','W','T','F','S']
    .map(d => `<div class="cal-day header">${d}</div>`).join('');

  const offset = firstDay === 0 ? 6 : firstDay - 1;
  let cells = Array(offset).fill('<div class="cal-day" style="background:transparent"></div>').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr_;
    const isFuture = new Date(dateStr) > now && dateStr !== todayStr_;
    const emojis  = dateMap[dateStr] ? [...dateMap[dateStr]] : [];
    const hasActivity = emojis.length > 0;

    // Red mark: past day (not today, not future) with no activity
    const isPast = !isToday && !isFuture;
    const isMissed = isPast && !hasActivity;

    let cellClass = 'cal-day';
    let innerHtml  = '';

    if (isFuture) {
      // Future days — neutral, just show number
      cellClass += ' cal-future';
      innerHtml  = d;
    } else if (isToday && !hasActivity) {
      // Today with no activity — show number with today ring
      cellClass += ' today';
      innerHtml  = d;
    } else if (isToday && hasActivity) {
      // Today with activity — green + emoji
      cellClass += ' completed today';
      innerHtml  = emojis[0]; // show first emoji
    } else if (isMissed) {
      // Past day, no activity — red mark
      cellClass += ' cal-missed';
      innerHtml  = `<span style="font-size:9px;opacity:0.7">${d}</span>`;
    } else if (hasActivity) {
      cellClass += ' completed';
      if (emojis.length === 1) {
        // Single activity — show emoji nicely
        innerHtml = `<span style="font-size:14px;line-height:1">${emojis[0]}</span>`;
      } else if (emojis.length === 2) {
        // Two activities — show both small
        innerHtml = `<span style="font-size:10px;line-height:1">${emojis[0]}${emojis[1]}</span>`;
      } else {
        // 3+ activities — show first emoji + count badge
        innerHtml = `<span style="font-size:10px;line-height:1">${emojis[0]}<sup style="font-size:8px;font-weight:700">+${emojis.length - 1}</sup></span>`;
      }
    } else {
      innerHtml = d;
    }

    // Add tooltip showing all activities done that day
    const tooltip = emojis.length > 0
      ? `${dateStr} — ${emojis.join(' ')}`
      : dateStr;
    cells += `<div class="${cellClass}" title="${tooltip}">${innerHtml}</div>`;
  }

  // Legend
  const legend = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:var(--text3)">
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:var(--g3);margin-right:4px;vertical-align:middle"></span>Activity done</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:rgba(229,57,53,0.5);margin-right:4px;vertical-align:middle"></span>Missed</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:2px solid var(--accent);margin-right:4px;vertical-align:middle"></span>Today</span>
    </div>`;

  return `<div class="cal-grid">${headers}${cells}</div>${legend}`;
}

// ── GLOBAL HISTORY ────────────────────────────────────────────────
function renderGlobalHistory() {
  const user    = APP.currentUser;
  const logs    = Store.getUserLogs(user.id).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  const runLogs = Store.getUserRunLogs(user.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  document.getElementById('history-cal').innerHTML    = buildCalendar(logs); // pass full logs for emoji
  document.getElementById('history-stats').innerHTML  = `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Total Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${calcStreak(user.id)}</div><div class="stat-label">Day Streak 🔥</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.length}</div><div class="stat-label">Runs Logged</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.reduce((a, r) => a + (r.distance || 0), 0).toFixed(1)}</div><div class="stat-label">Total km Run</div></div>
    </div>`;

  // Group logs by date to show multiple activities per day clearly
  const groupedByDate = {};
  logs.forEach(l => {
    if (!groupedByDate[l.date]) groupedByDate[l.date] = [];
    groupedByDate[l.date].push(l);
  });
  const sortedDates = Object.keys(groupedByDate).sort().reverse().slice(0, 20);

  document.getElementById('history-log').innerHTML = sortedDates.length
    ? sortedDates.map(date => {
        const dayLogs  = groupedByDate[date];
        const dayLabel = dayLogs[0]?.day || '';
        const activities = dayLogs.map(l =>
          `<span class="badge badge-green" style="margin-right:4px;margin-bottom:4px">
            ${getModuleEmoji(l.module)} ${getModuleName(l.module)}
          </span>`
        ).join('');
        return `
          <div class="card card-sm" style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div>
                <div style="font-weight:700;font-size:14px">${date}</div>
                <div style="font-size:12px;color:var(--text3)">${dayLabel}</div>
              </div>
              <div style="font-family:var(--font-display);font-size:22px;color:var(--g5)">${dayLogs.length}
                <span style="font-size:12px;color:var(--text3)">activit${dayLogs.length > 1 ? 'ies' : 'y'}</span>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap">${activities}</div>
          </div>`;
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet. Start working out!</p></div>';
}

function getModuleEmoji(mod) { return { cardio: '🏠', gym: '🏋️', yoga: '🧘', stretching: '🤸', running: '🏃' }[mod] || '💪'; }
function getModuleName(mod)  { return { cardio: 'Home Cardio', gym: 'Gym Workouts', yoga: 'Yoga', stretching: 'Stretching', running: 'Running' }[mod] || mod; }
