// ── DASHBOARD ─────────────────────────────────────────────────────
function initDashboard() {
  const user = APP.currentUser;
  if (!user) return;
  const adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = user.role === 'ADMIN' ? 'flex' : 'none';
  renderDashboardTiles();
  renderDashboardStats();
  refreshDashboardBadges();
  renderAnnouncementBanner();
}

function refreshDashboardBadges() {
  const user = APP.currentUser;
  if (!user) return;

  // Custom workouts badge
  const cwBadge = document.getElementById('cw-count-badge');
  if (cwBadge && typeof CW !== 'undefined') {
    const count = CW.getAll(user.id).length;
    cwBadge.innerHTML = count > 0
      ? `<span class="badge badge-blue">${count} workout${count>1?'s':''}</span>`
      : `<span style="font-size:11px;color:rgba(255,255,255,0.4)">None yet — create one!</span>`;
  }

  // Weekly report streak badge
  const wrBadge = document.getElementById('wr-streak-badge');
  if (wrBadge) {
    const streak = calcStreak(user.id);
    const monday = getMonday();
    const weekCount = Store.getUserLogs(user.id).filter(l => l.date >= monday).length;
    wrBadge.innerHTML = weekCount > 0
      ? `<span class="badge badge-yellow">🔥 ${streak} day streak</span>`
      : `<span style="font-size:11px;color:rgba(255,255,255,0.4)">Start this week!</span>`;
  }
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

// ── MODULE ORDER STORAGE ─────────────────────────────────────────
const ALL_MODULES = [
  { id: 'cardio',        name: 'Home Cardio',      emoji: '🏠',    color: 'grad-cardio',  sub: '8-9 exercises · 6 days' },
  { id: 'gym',           name: 'Gym Workouts',      emoji: '🏋️',   color: 'grad-gym',     sub: '8 exercises · 6 days' },
  { id: 'yoga',          name: 'Yoga',              emoji: '🧘',    color: 'grad-yoga',    sub: '8-12 poses · 6 days' },
  { id: 'running',       name: 'Running & Walking', emoji: '🏃',    color: 'grad-running', sub: 'GPS tracker + plans' },
  { id: 'stretching',    name: 'Stretching',        emoji: '🤸',    color: 'grad-stretch', sub: '6 stretches · 6 days' },
  { id: 'calisthenics',  name: 'Calisthenics',      emoji: '🤸‍♂️', color: 'grad-cali',    sub: '3 levels · skill tree' },
];

function getModuleOrder(userId) {
  const saved = Store.get('ff_module_order_' + userId);
  if (saved && Array.isArray(saved) && saved.length >= 5) {
    // Return modules in saved order, add any new modules not in saved order
    const ordered = saved.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);
    const missing = ALL_MODULES.filter(m => !saved.includes(m.id));
    return [...ordered, ...missing];
  }
  return [...ALL_MODULES];
}

function saveModuleOrder(userId, modules) {
  Store.set('ff_module_order_' + userId, modules.map(m => m.id));
}

function renderDashboardTiles() {
  const user     = APP.currentUser;
  const today    = todayStr();
  const todayDay = dayName();
  const monday   = getMonday();
  const modules  = getModuleOrder(user.id);

  const grid = document.getElementById('module-grid');
  if (!grid) return;

  grid.innerHTML = modules.map(m => {
    const logs      = Store.getModuleDayLogs(user.id, m.id);
    const todayDone = logs.some(l => l.day === todayDay && l.date === today);
    const weekDone  = getWeekDays().filter(d => logs.some(l => l.day === d && l.date >= monday)).length;

    return `
      <div class="module-card ${m.color} animate-in"
        data-module="${m.id}"
        draggable="true"
        onclick="openModule('${m.id}')"
        ontouchstart="tileTouchStart(event,this)"
        ontouchmove="tileTouchMove(event,this)"
        ontouchend="tileTouchEnd(event,this)">
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
        <!-- Drag handle hint -->
        <div class="drag-hint">⠿</div>
      </div>`;
  }).join('');

  // Attach desktop drag events after render
  initTileDragDrop();
}

// ── DESKTOP DRAG & DROP ───────────────────────────────────────────
let _dragSrc = null;

function initTileDragDrop() {
  const grid  = document.getElementById('module-grid');
  if (!grid) return;

  grid.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragSrc = card;
      card.style.opacity = '0.5';
      card.style.transform = 'scale(0.95)';
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', e => {
      card.style.opacity = '';
      card.style.transform = '';
      grid.querySelectorAll('.module-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (card !== _dragSrc) {
        grid.querySelectorAll('.module-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (_dragSrc && _dragSrc !== card) {
        _swapTiles(_dragSrc, card);
      }
    });
  });
}

function _swapTiles(src, target) {
  const grid  = document.getElementById('module-grid');
  const cards = [...grid.querySelectorAll('.module-card')];
  const srcIdx = cards.indexOf(src);
  const tgtIdx = cards.indexOf(target);

  // Insert src before or after target depending on position
  if (srcIdx < tgtIdx) {
    grid.insertBefore(src, target.nextSibling);
  } else {
    grid.insertBefore(src, target);
  }

  target.classList.remove('drag-over');
  _persistOrder();
}

function _persistOrder() {
  const grid    = document.getElementById('module-grid');
  if (!grid) return;
  const ordered = [...grid.querySelectorAll('.module-card')].map(c => c.dataset.module);
  saveModuleOrder(APP.currentUser.id, ordered.map(id => ALL_MODULES.find(m => m.id === id)));
  showToast('Order saved! ✅', 'success');
}

// ── MOBILE TOUCH DRAG & DROP ──────────────────────────────────────
let _touch = { active: false, card: null, clone: null, startX: 0, startY: 0, lastOver: null };

function tileTouchStart(e, card) {
  // Only activate on long press (300ms) to not conflict with tap-to-open
  _touch.timer = setTimeout(() => {
    _touch.active = true;
    _touch.card   = card;
    _touch.startX = e.touches[0].clientX;
    _touch.startY = e.touches[0].clientY;

    // Create floating clone
    const rect  = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none; opacity:0.85;
      width:${rect.width}px; height:${rect.height}px;
      left:${rect.left}px; top:${rect.top}px;
      transform:scale(1.05); transition:none;
      border:2px solid var(--accent); border-radius:var(--radius-lg);
      box-shadow:0 16px 48px rgba(0,0,0,0.6);
    `;
    document.body.appendChild(clone);
    _touch.clone   = clone;
    card.style.opacity = '0.3';
    navigator.vibrate && navigator.vibrate(50); // haptic feedback
  }, 300);
}

function tileTouchMove(e, card) {
  clearTimeout(_touch.timer);
  if (!_touch.active || !_touch.clone) return;
  e.preventDefault();

  const touch = e.touches[0];
  const dx    = touch.clientX - _touch.startX;
  const dy    = touch.clientY - _touch.startY;
  const rect  = _touch.card.getBoundingClientRect();

  // Move clone with finger
  _touch.clone.style.left = (rect.left + dx) + 'px';
  _touch.clone.style.top  = (rect.top  + dy) + 'px';

  // Find card under finger
  _touch.clone.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  _touch.clone.style.display = '';

  const over = el?.closest('.module-card');
  if (over && over !== _touch.card) {
    if (over !== _touch.lastOver) {
      document.querySelectorAll('.module-card').forEach(c => c.classList.remove('drag-over'));
      over.classList.add('drag-over');
      _touch.lastOver = over;
    }
  }
}

function tileTouchEnd(e, card) {
  clearTimeout(_touch.timer);
  if (!_touch.active) return;

  // Clean up clone
  if (_touch.clone) { _touch.clone.remove(); _touch.clone = null; }
  card.style.opacity = '';
  document.querySelectorAll('.module-card').forEach(c => c.classList.remove('drag-over'));

  // Drop on target
  if (_touch.lastOver && _touch.lastOver !== card) {
    _swapTiles(card, _touch.lastOver);
  }

  _touch = { active: false, card: null, clone: null, startX: 0, startY: 0, lastOver: null };
}

function refreshDashboard() {
  renderDashboardStats();
  renderDashboardTiles();
  refreshDashboardBadges();
  renderAnnouncementBanner();
}

function renderAnnouncementBanner() {
  const el   = document.getElementById('dash-announcement');
  if (!el) return;
  const data = Store.getContent('announcement');
  if (!data?.active || !data?.text) { el.style.display='none'; return; }
  const colors = {
    info:    { bg:'rgba(30,136,229,0.12)', border:'rgba(30,136,229,0.3)', color:'#90caf9', icon:'ℹ️' },
    success: { bg:'rgba(67,160,90,0.12)',  border:'rgba(67,160,90,0.3)',  color:'var(--g5)', icon:'✅' },
    warning: { bg:'rgba(240,192,64,0.12)', border:'rgba(240,192,64,0.3)', color:'var(--accent)', icon:'⚠️' },
    danger:  { bg:'rgba(229,57,53,0.12)',  border:'rgba(229,57,53,0.3)',  color:'#ef9a9a', icon:'🚨' },
  };
  const c = colors[data.type] || colors.info;
  el.style.display = '';
  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:14px;
      background:${c.bg};border:1px solid ${c.border}">
      <span style="font-size:18px;flex-shrink:0">${c.icon}</span>
      <div style="flex:1;font-size:13px;color:${c.color};line-height:1.5;font-weight:500">${data.text}</div>
      <button onclick="this.closest('[style]').style.display='none'" 
        style="background:none;border:none;color:${c.color};font-size:16px;cursor:pointer;flex-shrink:0;opacity:0.6">✕</button>
    </div>`;
}

// ── OPEN MODULE ───────────────────────────────────────────────────
function openModule(moduleId) {
  APP.currentModule = moduleId;
  if (moduleId === 'running') {
    showPage('page-running');
    initRunningPage();
    return;
  }
  if (moduleId === 'calisthenics') {
    showPage('page-calisthenics');
    if (typeof initCalisthenicsPage === 'function') initCalisthenicsPage();
    return;
  }
  showPage('page-module');
  renderModulePage(moduleId);
}

function openRunningModule() {
  openModule('running');
  setTimeout(() => renderRunningTabs('achievements'), 300);
}

// ── MODULE PAGE ───────────────────────────────────────────────────
function renderModulePage(moduleId) {
  const mod = (window.APP_DATA_DEFAULT||window.APP_DATA).modules[moduleId];
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
  const mod = (window.APP_DATA_DEFAULT||window.APP_DATA).modules[moduleId];

  // Check for admin-saved overrides first, then fall back to built-in data
  const exOverride    = Store.getContent('exercises_' + moduleId);
  const mainExercises = exOverride?.days?.[day] || mod?.days?.[day] || [];

  const warmupKey   = (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.[moduleId]   ? moduleId : 'cardio';
  const cooldownKey = (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.[moduleId] ? moduleId : 'cardio';
  const warmups     = Store.getContent('warmup_'    + moduleId) || (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.[warmupKey]    || [];
  const cooldowns   = Store.getContent('cooldown_'  + moduleId) || (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.[cooldownKey] || [];

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

  // Hold-based modules (yoga + stretching) — one checkbox per pose/stretch, no set repetitions
  const isHoldBased = moduleId === 'yoga' || moduleId === 'stretching';

  container.innerHTML = allExercises.map((ex, i) => {
    let hdr = '';
    if (ex._section !== prevSection) {
      prevSection = ex._section;
      if (ex._section === 'warmup')   hdr = secHeader('Warm-Up', 'rgba(30,136,229,0.35)', '🔥');
      if (ex._section === 'main')     hdr = secHeader(moduleId==='yoga' ? 'Practice Sequence' : moduleId==='stretching' ? 'Stretch Sequence' : 'Main Workout', moduleId==='yoga' ? 'rgba(103,58,183,0.4)' : moduleId==='stretching' ? 'rgba(103,58,183,0.25)' : 'rgba(46,125,70,0.4)', moduleId==='yoga' ? '🧘' : moduleId==='stretching' ? '🤸' : '💪');
      if (ex._section === 'cooldown') hdr = secHeader(isHoldBased ? 'Closing Practice' : 'Cool-Down & Stretches', 'rgba(103,58,183,0.35)', isHoldBased ? '✨' : '🧘');
    }

    const checked = sessionData[i] || [];
    // For yoga: one checkbox per pose (hold it once = done), not multiple sets
    const totalChecks = isHoldBased ? 1 : (parseInt(ex.sets) || 1);
    const allDone = checked.length >= totalChecks;

    // Thumbnail: emoji for yoga/stretch, image if set, else colored letter avatar
    const _tc = ['#2e7d46','#1565c0','#6a1b9a','#bf360c','#00695c','#558b2f','#4527a0','#ad1457'];
    const _bg = _tc[(ex.name||'').charCodeAt(0) % _tc.length];
    const _lt = (ex.name||'?').charAt(0).toUpperCase();
    const thumb = isHoldBased && ex.image
      ? `<div style="font-size:52px;display:flex;align-items:center;justify-content:center;height:100%">${ex.image}</div>`
      : ex.image && !isHoldBased
        ? `<img src="${ex.image}" alt="${ex.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${_bg}33"><span style="font-size:36px;font-weight:700;color:${_bg}">${_lt}</span></div>`;

    // For yoga: single hold checkbox. For others: set-by-set checkboxes
    const checksHtml = isHoldBased
      ? `<div class="set-check ${checked.includes(0) ? 'checked' : ''}"
           onclick="toggleSet('${moduleId}','${day}',${i},0)"
           style="padding:12px 14px;border-radius:10px">
           <div class="check-box">${checked.includes(0) ? '✓' : ''}</div>
           <span class="check-label" style="font-size:13px">
             ${ex.rounds && ex.rounds > 1 ? `${ex.rounds} rounds` : ''} ${ex.hold || ''}
           </span>
         </div>`
      : Array.from({ length: parseInt(ex.sets) || 1 }, (_, s) => {
          const isDone = checked.includes(s);
          return `<div class="set-check ${isDone ? 'checked' : ''}" onclick="toggleSet('${moduleId}','${day}',${i},${s})">
            <div class="check-box">${isDone ? '✓' : ''}</div>
            <span class="check-label">Set ${s + 1} — ${ex.reps || ''}</span>
          </div>`;
        }).join('');

    // Meta line differs for yoga vs others
    const metaHtml = isHoldBased
      ? `<div class="exercise-meta">
           ${ex.rounds && ex.rounds > 1 ? `<span>🔄 ${ex.rounds} rounds</span>` : ''}
           <span>⏱ ${ex.hold || ''}</span>
           ${ex.month ? `<span style="opacity:0.6;font-size:10px">Month ${ex.month}</span>` : ''}
         </div>`
      : `<div class="exercise-meta">
           <span>🔄 ${ex.sets || 1} sets</span>
           <span>💪 ${ex.reps || ''}</span>
         </div>`;

    return `${hdr}
      <div class="exercise-card ${allDone ? 'completed' : ''} animate-in animate-in-${Math.min(i % 5 + 1, 5)}" id="exc-card-${i}">
        <div class="exercise-thumb">${thumb}</div>
        <div class="exercise-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div class="exercise-name">${i + 1}. ${ex.name || ''}</div>
            ${allDone ? '<span class="badge badge-green">✓ Done</span>' : ''}
          </div>
          ${metaHtml}
          <div class="exercise-desc">${ex.desc || ''}</div>
          ${ex.demo ? `<a href="${ex.demo}" target="_blank" rel="noopener" class="demo-link">▶ Watch Demo</a>` : ''}
          <div class="sets-grid">${checksHtml}</div>
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
  const mainExercises = exOverride?.days?.[day] || (window.APP_DATA_DEFAULT||window.APP_DATA).modules[mod]?.days?.[day] || [];
  const warmups       = Store.getContent('warmup_'   + mod) || (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.[mod]   || (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.cardio   || [];
  const cooldowns     = Store.getContent('cooldown_' + mod) || (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.[mod] || (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.cardio || [];
  const all           = [...warmups, ...mainExercises, ...cooldowns];

  if (!all.length) return;

  const isHoldBased    = mod === 'yoga' || mod === 'stretching';
  const totalSets = isHoldBased
    ? all.length
    : all.reduce((a, e) => a + (parseInt(e.sets) || 1), 0);
  const doneSets  = isHoldBased
    ? all.filter((_, i) => (sessionData[i] || []).length >= 1).length
    : Object.values(sessionData).flat().length;
  const allDone   = isHoldBased
    ? all.every((_, i) => (sessionData[i] || []).length >= 1)
    : all.every((ex, i) => (sessionData[i] || []).length >= (parseInt(ex.sets) || 1));
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

  sheetsPost('logCompletion', { userId: user.id, email: user.email, module: mod, day, date: todayStr() });
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
  const perModule = (window.APP_DATA_DEFAULT||window.APP_DATA).hydration?.[moduleId] || (window.APP_DATA_DEFAULT||window.APP_DATA).hydration?.default || {};
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
  const newMl = Store.getHydration(user.id, today) + ml;
  Store.setHydration(user.id, today, newMl);
  showToast(`+${ml}ml logged! 💧`, 'success');
  renderHydrationTab(APP.currentModule);
  // Sync to Sheets — store glasses done as ml value, target from module data
  const override = Store.getContent('hydration_' + APP.currentModule);
  const data     = override || (window.APP_DATA_DEFAULT||window.APP_DATA).hydration?.[APP.currentModule] || {};
  const targets  = data.targets || { training: 3.5 };
  const targetMl = (targets.training || 3.5) * 1000;
  sheetsPost('saveHydrationLog', {
    userId:        user.id,
    email:         user.email,
    date:          today,
    glassesTarget: Math.round(targetMl),
    glassesDone:   Math.round(newMl),
  });
}

function resetWater() {
  const user  = APP.currentUser;
  const today = todayStr();
  Store.setHydration(user.id, today, 0);
  renderHydrationTab(APP.currentModule);
  sheetsPost('saveHydrationLog', {
    userId:      user.id,
    email:       user.email,
    date:        today,
    glassesTarget: 3500,
    glassesDone:   0,
  });
}

// ── DIET TAB ──────────────────────────────────────────────────────
function renderDietTab(moduleId) {
  const container = document.getElementById('diet-tab-content');
  if (!container) return;

  const override = Store.getContent('diet_' + moduleId);
  // Use exact module key — all modules now have their own diet plan
  const modKey   = (window.APP_DATA_DEFAULT||window.APP_DATA).diet?.modules?.[moduleId] ? moduleId : 'cardio';
  const data     = override || (window.APP_DATA_DEFAULT||window.APP_DATA).diet?.modules?.[modKey] || { title: 'Diet Plan', meals: [] };

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
  const logsWithModule = logs.map(l => ({ ...l, module: l.module || moduleId }));

  const now = new Date();
  // Use a module-specific month state
  if (!APP._moduleCalMonth) APP._moduleCalMonth = {};
  if (!APP._moduleCalMonth[moduleId]) APP._moduleCalMonth[moduleId] = { y: now.getFullYear(), m: now.getMonth() };
  const { y, m } = APP._moduleCalMonth[moduleId];

  const monthLabel = new Date(y, m, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();

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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button class="btn btn-ghost btn-sm" onclick="changeModuleCalMonth('${moduleId}',-1)" style="font-size:18px;padding:6px 14px">‹</button>
        <div style="font-weight:700;font-size:14px">${monthLabel}</div>
        <button class="btn btn-ghost btn-sm" onclick="changeModuleCalMonth('${moduleId}',1)"
          style="font-size:18px;padding:6px 14px" ${isCurrentMonth?'disabled':''}>›</button>
      </div>
      <div class="card" style="margin-bottom:16px">${buildCalendar(logsWithModule, moduleId, y, m, 'module')}</div>
      <div class="section-title" style="margin-bottom:8px">Recent Log</div>
      <div id="module-history-log">${logsHtml}</div>
    </div>`;
}

function changeModuleCalMonth(moduleId, delta) {
  if (!APP._moduleCalMonth) APP._moduleCalMonth = {};
  if (!APP._moduleCalMonth[moduleId]) {
    const n = new Date();
    APP._moduleCalMonth[moduleId] = { y: n.getFullYear(), m: n.getMonth() };
  }
  let { y, m } = APP._moduleCalMonth[moduleId];
  m += delta;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  APP._moduleCalMonth[moduleId] = { y, m };
  renderModuleHistory(moduleId);
}

// buildCalendar — month-navigable, tappable cells
// year/month: 0-based month. context: 'global'|'module' for onclick routing.
// logs: [{date, module}], moduleFilter: optional string
function buildCalendar(logs, moduleFilter, year, month, context) {
  const now      = new Date();
  if (year  === undefined) year  = now.getFullYear();
  if (month === undefined) month = now.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr_   = now.toISOString().split('T')[0];
  const ctx         = context || 'global';

  // Build date → emoji set map
  const dateMap = {};
  logs.forEach(l => {
    const d = l.date || '';
    if (!d) return;
    const [ly, lm] = d.split('-').map(Number);
    if (ly !== year || lm !== month + 1) return;  // only current month's dots
    if (!dateMap[d]) dateMap[d] = new Set();
    const emoji = l.module === 'running'
      ? (l.activityType === 'walk' ? '🚶' : l.activityType === 'cycle' ? '🚴' : '🏃')
      : getModuleEmoji(l.module);
    dateMap[d].add(emoji);
  });

  const headers = ['S','M','T','W','T','F','S']
    .map(d => `<div class="cal-day header">${d}</div>`).join('');

  const offset = firstDay === 0 ? 6 : firstDay - 1;
  let cells = Array(offset).fill('<div class="cal-day" style="background:transparent;border:none"></div>').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = dateStr === todayStr_;
    const isFuture = dateStr > todayStr_;
    const emojis   = dateMap[dateStr] ? [...dateMap[dateStr]] : [];
    const hasActivity = emojis.length > 0;
    const isPast   = !isToday && !isFuture;
    const isMissed = isPast && !hasActivity;

    let cellClass = 'cal-day';
    let inner = '';

    if (isFuture) {
      cellClass += ' cal-future';
      inner = d;
    } else if (isToday && !hasActivity) {
      cellClass += ' today';
      inner = d;
    } else if (isToday && hasActivity) {
      cellClass += ' completed today';
      inner = `<span style="font-size:14px;line-height:1">${emojis[0]}</span>`;
    } else if (isMissed) {
      cellClass += ' cal-missed';
      inner = `<span style="font-size:9px;opacity:0.7">${d}</span>`;
    } else if (hasActivity) {
      cellClass += ' completed';
      if (emojis.length === 1) {
        inner = `<span style="font-size:14px;line-height:1">${emojis[0]}</span>`;
      } else if (emojis.length === 2) {
        inner = `<span style="font-size:10px;line-height:1">${emojis[0]}${emojis[1]}</span>`;
      } else {
        inner = `<span style="font-size:10px;line-height:1">${emojis[0]}<sup style="font-size:8px;font-weight:700">+${emojis.length-1}</sup></span>`;
      }
    } else {
      inner = d;
    }

    // Tappable — opens day detail for past/today; noop for future
    const clickable = !isFuture;
    const onclick   = clickable ? `onclick="showDayDetail('${dateStr}','${ctx}','${moduleFilter||''}')"` : '';
    const cursor    = clickable ? 'cursor:pointer;' : '';

    cells += `<div class="${cellClass}" style="${cursor}" ${onclick} title="${dateStr}">${inner}</div>`;
  }

  const legend = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:var(--text3)">
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:var(--g3);margin-right:4px;vertical-align:middle"></span>Active</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:rgba(229,57,53,0.5);margin-right:4px;vertical-align:middle"></span>Missed</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:2px solid var(--accent);margin-right:4px;vertical-align:middle"></span>Today</span>
      <span style="margin-left:auto;font-size:10px">Tap any day for details</span>
    </div>`;

  return `<div class="cal-grid">${headers}${cells}</div>${legend}`;
}
    const isToday = dateStr === todayStr_;

// ── GLOBAL HISTORY ────────────────────────────────────────────────
// Month navigation state
let _historyYear  = null;
let _historyMonth = null;

function changeHistoryMonth(delta) {
  if (_historyYear === null) {
    const n = new Date();
    _historyYear  = n.getFullYear();
    _historyMonth = n.getMonth();
  }
  _historyMonth += delta;
  if (_historyMonth < 0)  { _historyMonth = 11; _historyYear--; }
  if (_historyMonth > 11) { _historyMonth = 0;  _historyYear++; }
  renderGlobalHistory();
}

function renderGlobalHistory() {
  const user    = APP.currentUser;
  const allLogs = Store.getUserLogs(user.id);
  const runLogs = Store.getUserRunLogs(user.id);

  const now = new Date();
  if (_historyYear  === null) _historyYear  = now.getFullYear();
  if (_historyMonth === null) _historyMonth = now.getMonth();
  const isCurrentMonth = _historyYear === now.getFullYear() && _historyMonth === now.getMonth();

  const monthLabel = new Date(_historyYear, _historyMonth, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const labelEl = document.getElementById('history-month-label');
  if (labelEl) labelEl.textContent = monthLabel;
  const nextBtn = document.getElementById('history-next-btn');
  if (nextBtn) nextBtn.disabled = isCurrentMonth;

  const totalKm = runLogs.reduce((a, r) => a + (r.distance || 0), 0);
  document.getElementById('history-stats').innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-val">${allLogs.length}</div><div class="stat-label">Total Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${calcStreak(user.id)}🔥</div><div class="stat-label">Day Streak</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.length}</div><div class="stat-label">Activities</div></div>
      <div class="stat-card"><div class="stat-val">${totalKm.toFixed(1)}</div><div class="stat-label">Total km</div></div>
    </div>`;

  const combinedForCal = [
    ...allLogs,
    ...runLogs.map(r => ({ date: r.date, module: 'running', activityType: r.activityType || 'run' })),
  ];
  document.getElementById('history-cal').innerHTML =
    buildCalendar(combinedForCal, null, _historyYear, _historyMonth, 'global');

  const monthStr      = `${_historyYear}-${String(_historyMonth+1).padStart(2,'0')}`;
  const monthWorkouts = allLogs.filter(l => (l.date || '').startsWith(monthStr));
  const monthRuns     = runLogs.filter(r => (r.date || '').startsWith(monthStr));

  const groupedByDate = {};
  monthWorkouts.forEach(l => {
    if (!groupedByDate[l.date]) groupedByDate[l.date] = { workouts: [], runs: [] };
    groupedByDate[l.date].workouts.push(l);
  });
  monthRuns.forEach(r => {
    if (!groupedByDate[r.date]) groupedByDate[r.date] = { workouts: [], runs: [] };
    groupedByDate[r.date].runs.push(r);
  });

  const sortedDates  = Object.keys(groupedByDate).sort().reverse();
  const logTitleEl   = document.getElementById('history-log-title');
  if (logTitleEl) logTitleEl.textContent = monthLabel + ' — Activity Log';

  const AMETA = { run:{emoji:'🏃',label:'Run',color:'#43a05a'}, walk:{emoji:'🚶',label:'Walk',color:'#1e88e5'}, cycle:{emoji:'🚴',label:'Cycle',color:'#f0c040'} };

  document.getElementById('history-log').innerHTML = sortedDates.length
    ? sortedDates.map(date => {
        const { workouts, runs } = groupedByDate[date];
        const dateLabel = new Date(date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
        const totalCount = workouts.length + runs.length;
        const items = [
          ...workouts.map(l => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:20px;width:28px;text-align:center">${getModuleEmoji(l.module)}</span>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${getModuleName(l.module)}</div>
                <div style="font-size:11px;color:var(--text3)">${l.day || 'Workout'}</div>
              </div>
              <span class="badge badge-green" style="font-size:10px">✓ Done</span>
            </div>`),
          ...runs.map(r => {
            const m = AMETA[r.activityType||'run'] || AMETA.run;
            return `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:20px;width:28px;text-align:center">${m.emoji}</span>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${m.label} · ${r.planType || 'Free ' + m.label}</div>
                <div style="font-size:11px;color:var(--text3)">${(r.distance||0).toFixed(2)} km · ${fmtTime(r.duration||0)} · ${fmtPace(r.distance,r.duration)}/km</div>
              </div>
              <span class="badge badge-blue" style="font-size:10px">${(r.distance||0).toFixed(2)} km</span>
            </div>`;
          }),
        ].join('');
        return `
          <div class="card card-sm" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-weight:700;font-size:14px">${dateLabel}</div>
              <div style="font-size:12px;color:var(--text3)">${totalCount} activit${totalCount>1?'ies':'y'}</div>
            </div>
            ${items}
          </div>`;
      }).join('')
    : `<div class="empty-state"><div class="empty-icon">📋</div><p>No activity in ${monthLabel}.<br>Keep going!</p></div>`;
}

// ── DAY DETAIL MODAL ──────────────────────────────────────────────
function showDayDetail(dateStr, context, moduleFilter) {
  const user     = APP.currentUser;
  const workouts = Store.getUserLogs(user.id).filter(l => l.date === dateStr);
  const runs     = Store.getUserRunLogs(user.id).filter(r => r.date === dateStr);
  const dateObj  = new Date(dateStr);
  const dateLabel = dateObj.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const AMETA = {
    run:   { emoji:'🏃', label:'Run',   color:'#43a05a' },
    walk:  { emoji:'🚶', label:'Walk',  color:'#1e88e5' },
    cycle: { emoji:'🚴', label:'Cycle', color:'#f0c040' },
  };

  const total = workouts.length + runs.length;
  if (total === 0) {
    const today = new Date().toISOString().split('T')[0];
    const msg = dateStr > today ? 'Future date — nothing logged yet.' : 'No activity logged on this day.';
    document.getElementById('day-detail-content').innerHTML = `
      <div style="text-align:center;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">${dateLabel}</div>
        <div class="empty-icon">📋</div>
        <p style="color:var(--text3);font-size:13px">${msg}</p>
      </div>`;
    openModal('modal-day-detail');
    return;
  }

  const items = [
    ...workouts.map(l => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;
        background:var(--bg3);border-radius:12px;margin-bottom:8px">
        <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);
          display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
          ${getModuleEmoji(l.module)}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${getModuleName(l.module)}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${l.day || 'Workout'} · Completed</div>
        </div>
        <span class="badge badge-green">✓ Done</span>
      </div>`),
    ...runs.map(r => {
      const m = AMETA[r.activityType||'run'] || AMETA.run;
      const speedKph = r.duration > 0 ? (r.distance / r.duration * 3600) : 0;
      const kcalRates = { run:70, walk:50, cycle:40 };
      const kcal = Math.round((r.distance||0) * (kcalRates[r.activityType||'run'] || 70));
      return `
        <div style="border-radius:14px;overflow:hidden;margin-bottom:8px;border:1px solid ${m.color}33">
          <div style="background:${m.color}18;padding:12px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:44px;height:44px;border-radius:12px;background:${m.color}22;
              display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
              ${m.emoji}
            </div>
            <div>
              <div style="font-weight:700;font-size:14px;color:var(--text)">${m.label} · ${r.planType || 'Free '+m.label}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:2px">
                ${r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : ''}
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)">
            ${[
              ['Distance',  (r.distance||0).toFixed(2)+' km'],
              ['Time',      fmtTime(r.duration||0)],
              ['Avg Pace',  fmtPace(r.distance,r.duration)+'/km'],
              ['Avg Speed', speedKph.toFixed(1)+' km/h'],
              ['Calories',  kcal+' kcal'],
              ['Activity',  m.label],
            ].map(([lbl,val]) => `
              <div style="background:var(--surface);padding:10px 12px">
                <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${lbl}</div>
                <div style="font-size:15px;font-weight:700;color:var(--text)">${val}</div>
              </div>`).join('')}
          </div>
        </div>`;
    }),
  ].join('');

  document.getElementById('day-detail-content').innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:14px;font-weight:600">${dateLabel}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px">${total} activit${total>1?'ies':'y'}</div>
    ${items}`;

  openModal('modal-day-detail');
}

function getModuleEmoji(mod) { return { cardio:'🏠', gym:'🏋️', yoga:'🧘', stretching:'🤸', running:'🏃', calisthenics:'🤸‍♂️' }[mod] || '💪'; }
function getModuleName(mod)  { return { cardio:'Home Cardio', gym:'Gym Workouts', yoga:'Yoga', stretching:'Stretching', running:'Running', calisthenics:'Calisthenics' }[mod] || mod; }

// ════════════════════════════════════════════════════════════════
// USER PROFILE PAGE
// ════════════════════════════════════════════════════════════════
function openProfilePage() {
  document.getElementById('profile-menu').style.display = 'none';
  renderProfilePage();
  showPage('page-profile');
}

function getBodyProfile(userId) {
  return Store.get('ff_body_profile_' + userId, {});
}

function saveBodyProfile(userId, profile) {
  Store.set('ff_body_profile_' + userId, { ...profile, updatedAt: new Date().toISOString() });
}

function renderProfilePage() {
  const user    = APP.currentUser;
  const logs    = Store.getUserLogs(user.id);
  const runLogs = Store.getUserRunLogs(user.id);
  const streak  = calcStreak(user.id);
  const monday  = getMonday();
  const body    = getBodyProfile(user.id);

  const totalKm      = runLogs.reduce((a,r)=>a+(r.distance||0),0);
  const totalRuns    = runLogs.length;
  const thisWeek     = logs.filter(l=>l.date>=monday).length;
  const activeDays   = [...new Set(logs.map(l=>l.date))].length;
  const memberSince  = logs.length ? [...logs].sort((a,b)=>a.date.localeCompare(b.date))[0].date : todayStr();

  // Best run
  const bestRun = [...runLogs].sort((a,b)=>(b.distance||0)-(a.distance||0))[0];

  // Favourite module
  const modCounts = {};
  logs.filter(l=>!l.module.startsWith('custom_')).forEach(l=>{ modCounts[l.module]=(modCounts[l.module]||0)+1; });
  const favMod = Object.entries(modCounts).sort((a,b)=>b[1]-a[1])[0];

  const container = document.getElementById('profile-content');
  container.innerHTML = `
    <!-- Avatar + name -->
    <div style="text-align:center;padding:20px 0 24px">
      <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--g2),var(--g4));
        display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;
        margin:0 auto 14px;border:3px solid var(--g3)">
        ${user.name.charAt(0).toUpperCase()}
      </div>
      <div style="font-family:var(--font-display);font-size:28px;color:var(--g5)">${user.name.toUpperCase()}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:4px">${user.email}</div>
      <div style="margin-top:10px">
        <span class="badge badge-green">🔥 ${streak} day streak</span>
        ${user.role==='ADMIN'?'<span class="badge badge-yellow" style="margin-left:6px">👑 Admin</span>':''}
      </div>
    </div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${activeDays}</div><div class="stat-label">Active Days</div></div>
      <div class="stat-card"><div class="stat-val">${thisWeek}</div><div class="stat-label">This Week</div></div>
      <div class="stat-card"><div class="stat-val">${totalRuns}</div><div class="stat-label">Total Runs</div></div>
      <div class="stat-card"><div class="stat-val">${totalKm.toFixed(1)}</div><div class="stat-label">km Run</div></div>
      <div class="stat-card"><div class="stat-val">${favMod ? favMod[1] : 0}</div><div class="stat-label">${favMod ? getModuleName(favMod[0]).split(' ')[0] + ' Sessions' : 'Sessions'}</div></div>
    </div>

    <!-- Highlights -->
    <div class="section-title" style="margin-bottom:10px">Highlights</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      ${bestRun ? `
      <div class="card card-sm" style="display:flex;align-items:center;gap:12px;background:rgba(30,136,229,0.08);border-color:rgba(30,136,229,0.2)">
        <span style="font-size:28px">🏅</span>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase">Best Run</div>
          <div style="font-weight:700;font-size:15px">${(bestRun.distance||0).toFixed(2)} km</div>
          <div style="font-size:12px;color:var(--text3)">${fmtTime(bestRun.duration||0)} · ${bestRun.date}</div>
        </div>
      </div>` : ''}
      ${favMod ? `
      <div class="card card-sm" style="display:flex;align-items:center;gap:12px;background:rgba(67,160,90,0.08);border-color:rgba(67,160,90,0.2)">
        <span style="font-size:28px">${getModuleEmoji(favMod[0])}</span>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase">Favourite Module</div>
          <div style="font-weight:700;font-size:15px">${getModuleName(favMod[0])}</div>
          <div style="font-size:12px;color:var(--text3)">${favMod[1]} sessions logged</div>
        </div>
      </div>` : ''}
      <div class="card card-sm" style="display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">📅</span>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase">Member Since</div>
          <div style="font-weight:700;font-size:15px">${memberSince}</div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="section-title" style="margin-bottom:10px">Achievements</div>
    ${(() => {
      const unlocked = typeof _getAchievements === 'function' ? _getAchievements(user.id) : {};
      const unlockedList = Object.keys(unlocked);
      if (!unlockedList.length) return `
        <div class="card card-sm" style="text-align:center;padding:20px;margin-bottom:20px">
          <div style="font-size:32px;margin-bottom:8px">🏅</div>
          <div style="font-size:13px;color:var(--text2)">No badges yet — complete your first run!</div>
        </div>`;
      const recentBadges = typeof ACHIEVEMENTS !== 'undefined'
        ? ACHIEVEMENTS.filter(a => unlocked[a.id]).slice(-6).reverse()
        : [];
      return `
        <div style="margin-bottom:20px">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
            ${recentBadges.map(a => `
              <div style="text-align:center;background:rgba(46,125,70,0.1);border:1px solid rgba(46,125,70,0.3);border-radius:10px;padding:8px 4px" title="${a.name} — ${a.desc}">
                <div style="font-size:26px">${a.emoji}</div>
                <div style="font-size:9px;color:var(--text3);margin-top:3px;line-height:1.2">${a.name}</div>
              </div>`).join('')}
          </div>
          <div style="font-size:12px;color:var(--text3);text-align:center">${unlockedList.length} badges unlocked · <span style="color:var(--g5);cursor:pointer" onclick="openRunningModule()">See all →</span></div>
        </div>`;
    })()}
    <div class="section-title" style="margin-bottom:10px">Body Stats</div>
    <div class="card" style="margin-bottom:20px">
      ${body.age ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5)">${body.age}</div>
          <div style="font-size:11px;color:var(--text3)">Age</div>
        </div>
        ${(body.weight && body.height) ? `
        <div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5)">${(body.weight / Math.pow(body.height/100, 2)).toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text3)">BMI</div>
        </div>` : ''}
        ${body.age ? `
        <div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5)">${220 - body.age}</div>
          <div style="font-size:11px;color:var(--text3)">Max HR (bpm)</div>
        </div>` : ''}
        <div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5)">${body.weight || '—'}</div>
          <div style="font-size:11px;color:var(--text3)">Weight (kg)</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">
        Zone 2 (easy run): ${Math.round((220 - body.age) * 0.6)}–${Math.round((220 - body.age) * 0.7)} bpm &nbsp;·&nbsp;
        Tempo: ${Math.round((220 - body.age) * 0.7)}–${Math.round((220 - body.age) * 0.8)} bpm
      </div>` : `
      <div style="font-size:13px;color:var(--text3);text-align:center;padding:12px 0">
        No body stats set. Tap below to add your age and metrics.
      </div>`}
      <button class="btn btn-ghost btn-full" onclick="openEditBodyStats()">
        ✏️ ${body.age ? 'Update' : 'Add'} Body Stats
      </button>
    </div>

    <div class="section-title" style="margin-bottom:10px">Account</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
      <button class="btn btn-ghost btn-full" style="text-align:left;justify-content:flex-start;gap:12px"
        onclick="openChangePasswordModal()">🔑 Change Password</button>
      <button class="btn btn-ghost btn-full" style="text-align:left;justify-content:flex-start;gap:12px"
        onclick="openFeedbackModal()">💬 Send Feedback</button>
      <button class="btn btn-ghost btn-full" style="text-align:left;justify-content:flex-start;gap:12px;color:#ef9a9a"
        onclick="logout()">🚪 Sign Out</button>
    </div>
  `;
}

// ── PROFILE MENU ──────────────────────────────────────────────────
function toggleProfileMenu() {
  const menu = document.getElementById('profile-menu');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
  // Update profile name/email in menu
  if (!isOpen && APP.currentUser) {
    const el = document.getElementById('profile-menu-name');
    const em = document.getElementById('profile-menu-email');
    if (el) el.textContent = APP.currentUser.name;
    if (em) em.textContent = APP.currentUser.email;
  }
  // Close menu when clicking outside
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        const menu = document.getElementById('profile-menu');
        const btn  = document.getElementById('profile-btn');
        if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', handler);
        }
      });
    }, 10);
  }
}

function openEditBodyStats() {
  const user = APP.currentUser;
  const body = getBodyProfile(user.id);

  const overlay = document.createElement('div');
  overlay.id = 'body-stats-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--bg);border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto">
      <div style="font-weight:700;font-size:18px;margin-bottom:4px">Body Stats</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Used for heart rate zones and calorie estimates</div>

      <div style="margin-bottom:16px">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px">Age: <span id="es-age-val">${body.age || 25}</span> years</label>
        <input type="range" id="es-age" min="16" max="75" value="${body.age || 25}" step="1"
          oninput="document.getElementById('es-age-val').textContent=this.value"
          style="width:100%">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <label style="font-size:13px;font-weight:700;display:block;margin-bottom:6px">Weight (kg)</label>
          <input type="number" id="es-weight" value="${body.weight || ''}" placeholder="e.g. 70" min="30" max="200"
            style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:15px">
        </div>
        <div>
          <label style="font-size:13px;font-weight:700;display:block;margin-bottom:6px">Height (cm)</label>
          <input type="number" id="es-height" value="${body.height || ''}" placeholder="e.g. 170" min="100" max="250"
            style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:15px">
        </div>
      </div>

      <div style="margin-bottom:16px">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px">Biological sex</label>
        <div style="display:flex;gap:8px">
          ${[['male','Male'],['female','Female'],['other','Other']].map(([v,l]) => `
            <button id="es-gender-${v}" onclick="document.querySelectorAll('[id^=es-gender-]').forEach(b=>b.style.background='var(--surface)');this.style.background='var(--g3)'"
              style="flex:1;padding:8px;border-radius:10px;border:1px solid var(--border);background:${body.gender===v?'var(--g3)':'var(--surface)'};color:var(--text1);cursor:pointer;font-size:13px;font-weight:500">
              ${l}
            </button>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:20px">
        <label style="font-size:13px;font-weight:700;display:block;margin-bottom:8px">Fitness level</label>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[['beginner','🐣 Beginner'],['intermediate','💪 Intermediate'],['advanced','🔥 Advanced']].map(([v,l]) => `
            <button id="es-fit-${v}" onclick="document.querySelectorAll('[id^=es-fit-]').forEach(b=>b.style.background='var(--surface)');this.style.background='var(--g3)'"
              style="padding:10px;border-radius:10px;border:1px solid var(--border);background:${body.fitnessLevel===v?'var(--g3)':'var(--surface)'};color:var(--text1);cursor:pointer;font-size:13px;font-weight:500;text-align:left">
              ${l}
            </button>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost btn-full" onclick="document.getElementById('body-stats-modal').remove()">Cancel</button>
        <button class="btn btn-primary btn-full" onclick="saveBodyStatsFromModal()">Save Stats</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function saveBodyStatsFromModal() {
  const user   = APP.currentUser;
  const age    = +document.getElementById('es-age')?.value || null;
  const weight = +document.getElementById('es-weight')?.value || null;
  const height = +document.getElementById('es-height')?.value || null;
  const gender = ['male','female','other'].find(v => {
    const el = document.getElementById('es-gender-'+v);
    return el && el.style.background !== 'var(--surface)' && el.style.background !== '';
  }) || null;
  const fitnessLevel = ['beginner','intermediate','advanced'].find(v => {
    const el = document.getElementById('es-fit-'+v);
    return el && el.style.background !== 'var(--surface)' && el.style.background !== '';
  }) || null;

  saveBodyProfile(user.id, { age, weight, height, gender, fitnessLevel });
  document.getElementById('body-stats-modal')?.remove();
  showToast('Body stats saved! ✅', 'success');
  renderProfilePage();
}

function openFeedbackModal() {
  const menu = document.getElementById('profile-menu');
  if (menu) menu.style.display = 'none';
  openModal('modal-feedback');
}

function toggleNotificationSetting() {
  const menu = document.getElementById('profile-menu');
  if (menu) menu.style.display = 'none';
  if (typeof PUSH !== 'undefined' && PUSH.isSupported()) {
    PUSH.isSubscribed().then(subscribed => {
      if (subscribed) {
        PUSH.unsubscribe();
        showToast('Daily reminders disabled', 'info');
      } else {
        acceptPushNotifications();
      }
    });
  } else {
    showToast('Push notifications not supported on this device', 'error');
  }
}

// ── CUSTOM WORKOUTS & WEEKLY REPORT RELAY ────────────────────────
// These ensure the pages work even if their scripts load after the click
function openMyPlanPage() {
  // Relay to running.js — ensures My Plan tab always works
  showPage('page-my-plan', false);
  if (typeof renderMyPlan === 'function') {
    renderMyPlan();
  } else {
    setTimeout(() => { if (typeof renderMyPlan === 'function') renderMyPlan(); }, 300);
  }
}

function openCustomWorkouts() {
  showPage('page-custom-workouts');
  // Try immediately, then retry after scripts load
  if (typeof renderCustomWorkoutsList === 'function') {
    renderCustomWorkoutsList();
  } else {
    setTimeout(() => {
      if (typeof renderCustomWorkoutsList === 'function') renderCustomWorkoutsList();
    }, 300);
  }
}

function openCreateWorkout() {
  if (typeof _cwEdit !== 'undefined') {
    // custom-workouts.js is loaded - use its function
    window._cwEdit = { id: null, name: '', exercises: [] };
    if (typeof _renderWorkoutEditor === 'function') _renderWorkoutEditor();
    showPage('page-cw-editor');
  } else {
    // Fallback - just show the editor page
    showPage('page-cw-editor');
  }
}

function openWeeklyReport() {
  showPage('page-weekly-report');
  if (typeof renderWeeklyReport === 'function') {
    renderWeeklyReport();
  } else {
    setTimeout(() => {
      if (typeof renderWeeklyReport === 'function') renderWeeklyReport();
    }, 300);
  }
}

// ════════════════════════════════════════════════════════════════
// CALISTHENICS MODULE
// ════════════════════════════════════════════════════════════════
function initCalisthenicsPage() {
  APP.currentCaliLevel = Store.get('ff_cali_level_' + APP.currentUser?.id, 1);
  APP.currentCaliSkill = Store.get('ff_cali_skill_' + APP.currentUser?.id, null);
  renderCalisthenicsPage();
}

function renderCalisthenicsPage() {
  const container = document.getElementById('cali-page-content');
  if (!container) return;

  const tabs = [
    { id:'workout',   label:'💪 Workout' },
    { id:'skills',    label:'🎯 Skill Tree' },
    { id:'challenge', label:'⚡ 21 Days' },
    { id:'progress',  label:'📊 Progress' },
  ];

  const currentTab = APP._caliTab || 'workout';
  container.innerHTML = `
    <div class="tab-strip" style="padding:12px 16px 4px">
      ${tabs.map(t => `
        <button class="tab-btn cali-tab-btn ${currentTab===t.id?'active':''}" data-tab="${t.id}"
          onclick="switchCaliTab('${t.id}',this)">${t.label}</button>`).join('')}
    </div>
    ${tabs.map(t => `
      <div id="cali-tab-${t.id}" class="run-tab-content ${currentTab===t.id?'active':''}">
        <div id="cali-${t.id}-content"></div>
      </div>`).join('')}`;

  if (currentTab === 'workout')   renderCaliWorkout();
  if (currentTab === 'skills')    renderCaliSkillTree();
  if (currentTab === 'challenge') renderCaliChallenge();
  if (currentTab === 'progress')  renderCaliProgress();
}

function switchCaliTab(tab, btn) {
  APP._caliTab = tab;
  document.querySelectorAll('.cali-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="cali-tab-"]').forEach(el => el.classList.remove('active'));
  document.getElementById('cali-tab-' + tab)?.classList.add('active');
  if (tab === 'workout')   renderCaliWorkout();
  if (tab === 'skills')    renderCaliSkillTree();
  if (tab === 'challenge') renderCaliChallenge();
  if (tab === 'progress')  renderCaliProgress();
}

function renderCaliWorkout() {
  const container = document.getElementById('cali-workout-content');
  if (!container) return;
  const user   = APP.currentUser;
  const level  = APP.currentCaliLevel;
  const levels = (window.APP_DATA_DEFAULT||window.APP_DATA).modules?.calisthenics?.levels || {};
  const lvlData = levels[level];
  if (!lvlData) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <div style="font-weight:700;margin-bottom:8px">Calisthenics data not loaded</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Your browser has cached an old version. Please clear cache and reload.</div>
        <button class="btn btn-primary" onclick="caches.keys().then(k=>k.forEach(n=>caches.delete(n)));navigator.serviceWorker.getRegistrations().then(r=>r.forEach(reg=>reg.unregister()));location.reload(true)">
          🔄 Clear Cache & Reload
        </button>
      </div>`;
    return;
  }

  const days = getWeekDays();
  const today = dayName();
  const logs  = Store.getModuleDayLogs(user.id, 'calisthenics');
  const todayDate = todayStr();

  container.innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- Level selector -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${[1,2,3].map(l => {
          const ld = levels[l];
          const isActive = level === l;
          return `<button onclick="selectCaliLevel(${l})"
            style="flex:1;padding:10px 8px;border-radius:12px;border:2px solid ${isActive?'var(--g4)':'var(--border)'};
              background:${isActive?'rgba(46,125,70,0.2)':'var(--surface)'};cursor:pointer;min-width:80px">
            <div style="font-size:11px;font-weight:700;color:${isActive?'var(--g5)':'var(--text3)'}">L${l}</div>
            <div style="font-size:12px;font-weight:600;color:${isActive?'var(--text)':'var(--text2)'}">${ld?.name||''}</div>
          </button>`;
        }).join('')}
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:16px">${lvlData.desc}</div>

      <!-- Day strip -->
      <div class="tab-strip" style="margin-bottom:16px">
        ${days.map(d => {
          const done = logs.some(l => l.day === d && l.date === todayDate);
          const isToday = d === today;
          return `<button class="tab-btn ${isToday?'active':''}" onclick="selectCaliDay('${d}',this)">
            ${d.slice(0,3)} ${done?'✓':''}</button>`;
        }).join('')}
      </div>

      <div id="cali-exercises-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px"></div>
      <button id="cali-complete-btn" class="btn btn-primary btn-full" onclick="completeCaliDay()" style="margin-bottom:20px">
        Mark Day Complete
      </button>
    </div>`;

  APP.currentDay = today;
  renderCaliExercises();
  updateCaliCompleteBtn();
}

function selectCaliLevel(level) {
  APP.currentCaliLevel = level;
  Store.set('ff_cali_level_' + APP.currentUser.id, level);
  renderCaliWorkout();
}

function selectCaliDay(day, btn) {
  APP.currentDay = day;
  document.querySelectorAll('#cali-workout-content .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCaliExercises();
  updateCaliCompleteBtn();
}

function renderCaliExercises() {
  const container = document.getElementById('cali-exercises-list');
  if (!container) return;
  const level   = APP.currentCaliLevel;
  const day     = APP.currentDay || dayName();
  const user    = APP.currentUser;
  const levels  = (window.APP_DATA_DEFAULT||window.APP_DATA).modules?.calisthenics?.levels || {};
  const lvlDays = levels[level]?.days || {};

  const override = Store.getContent('exercises_calisthenics_l' + level);
  const exercises = override?.days?.[day] || lvlDays[day] || [];

  const warmups   = (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.calisthenics  || [];
  const cooldowns = (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.calisthenics || [];
  const all = [
    ...warmups.map(e => ({ ...e, _section:'warmup' })),
    ...exercises.map(e => ({ ...e, _section:'main' })),
    ...cooldowns.map(e => ({ ...e, _section:'cooldown' })),
  ];

  const sessionKey  = `sess_${user.id}_calisthenics_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});

  function secHeader(label, bg) {
    return `<div style="display:flex;align-items:center;gap:8px;margin:10px 0 8px;padding:8px 12px;border-radius:10px;background:${bg}">
      <span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em">${label}</span>
    </div>`;
  }

  let prevSec = '';
  container.innerHTML = all.map((ex, i) => {
    let hdr = '';
    if (ex._section !== prevSec) {
      prevSec = ex._section;
      if (ex._section === 'warmup')   hdr = secHeader('🔥 Warm-Up',   'rgba(30,136,229,0.3)');
      if (ex._section === 'main')     hdr = secHeader('💪 Workout',    'rgba(46,125,70,0.35)');
      if (ex._section === 'cooldown') hdr = secHeader('🧘 Cool-Down',  'rgba(103,58,183,0.35)');
    }
    const checked = sessionData[i] || [];
    const total   = parseInt(ex.sets) || 1;
    const allDone = checked.length >= total;

    const checksHtml = Array.from({ length: total }, (_, s) => {
      const isDone = checked.includes(s);
      return `<div class="set-check ${isDone?'checked':''}" onclick="toggleCaliSet(${i},${s})">
        <div class="check-box">${isDone?'✓':''}</div>
        <span class="check-label">Set ${s+1} — ${ex.reps||''}</span>
      </div>`;
    }).join('');

    return `${hdr}
      <div class="exercise-card ${allDone?'completed':''}">
        <div class="exercise-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div class="exercise-name" style="font-size:15px">${i+1}. ${ex.name}</div>
            ${allDone?'<span class="badge badge-green">✓</span>':''}
          </div>
          <div class="exercise-meta"><span>🔄 ${ex.sets||1} sets</span><span>💪 ${ex.reps||''}</span></div>
          <div class="exercise-desc">${ex.desc||''}</div>
          ${ex.demo?`<a href="${ex.demo}" target="_blank" rel="noopener" class="demo-link">▶ Watch Demo</a>`:''}
          <div class="sets-grid">${checksHtml}</div>
        </div>
      </div>`;
  }).join('');
}

function toggleCaliSet(exIdx, setIdx) {
  const user       = APP.currentUser;
  const day        = APP.currentDay || dayName();
  const sessionKey = `sess_${user.id}_calisthenics_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  const pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  renderCaliExercises();
  updateCaliCompleteBtn();
}

function updateCaliCompleteBtn() {
  const btn = document.getElementById('cali-complete-btn');
  if (!btn) return;
  const user = APP.currentUser;
  const day  = APP.currentDay || dayName();
  const alreadyLogged = Store.getModuleDayLogs(user.id, 'calisthenics').some(l => l.day === day && l.date === todayStr());
  if (alreadyLogged) {
    btn.textContent = '✓ Day Complete!';
    btn.className   = 'btn btn-outline btn-full';
    btn.disabled    = true;
  } else {
    btn.textContent = '🎉 Complete Day!';
    btn.className   = 'btn btn-primary btn-full';
    btn.disabled    = false;
  }
}

function completeCaliDay() {
  const user = APP.currentUser;
  const day  = APP.currentDay || dayName();
  const logged = Store.addLog({
    userId: user.id, module: 'calisthenics', day, date: todayStr(), timestamp: new Date().toISOString()
  });
  if (!logged) { showToast('Already logged today!', 'info'); return; }
  showToast('🎉 ' + day + ' calisthenics complete! 💪', 'success');
  sheetsPost('logCompletion', { userId: user.id, email: user.email, module: 'calisthenics', day, date: todayStr() });
  updateCaliCompleteBtn();
}

function renderCaliSkillTree() {
  const container = document.getElementById('cali-skills-content');
  if (!container) return;
  const user   = APP.currentUser;
  const skills = (window.APP_DATA_DEFAULT||window.APP_DATA).calisthenicsSkills || {};
  const savedSkill = Store.get('ff_cali_skill_' + user.id);

  container.innerHTML = `
    <div style="padding:16px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.6">
        Pick ONE skill to focus on. Chase it for 3–6 months. Complete each step before the next.
      </div>
      ${Object.entries(skills).map(([key, skill]) => {
        const progress = Store.get('ff_skill_progress_' + user.id + '_' + key, {});
        const done = Object.values(progress).filter(Boolean).length;
        const total = skill.steps.length;
        const pct   = Math.round(done / total * 100);
        const isActive = savedSkill === key;
        return `
          <div class="card" style="margin-bottom:12px;border:2px solid ${isActive?'var(--g4)':'var(--border)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:28px">${skill.emoji}</span>
                <div>
                  <div style="font-weight:700;font-size:15px">${skill.name}</div>
                  <div style="font-size:12px;color:var(--text3)">${skill.desc}</div>
                </div>
              </div>
              ${isActive
                ? `<span class="badge badge-green">Active Goal</span>`
                : `<button class="btn btn-outline btn-sm" onclick="setCaliSkill('${key}')">Set Goal</button>`}
            </div>
            <div class="progress-bar" style="margin-bottom:8px">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${done}/${total} steps · ${pct}% complete</div>
            ${skill.steps.map(step => {
              const isDone = progress[step.id] === true;
              return `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                  <div onclick="toggleSkillStep('${key}',${step.id})"
                    style="width:22px;height:22px;border-radius:50%;border:2px solid ${isDone?'var(--g4)':'var(--border)'};
                      background:${isDone?'var(--g4)':'transparent'};flex-shrink:0;margin-top:2px;cursor:pointer;
                      display:flex;align-items:center;justify-content:center;color:white;font-size:12px">
                    ${isDone?'✓':''}
                  </div>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:600;${isDone?'color:var(--text3);text-decoration:line-through':''}">${step.id}. ${step.name}</div>
                    <div style="font-size:12px;color:var(--text3);margin-top:2px">${step.desc}</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">Equipment: ${step.req}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>`;
      }).join('')}
    </div>`;
}

function setCaliSkill(skillKey) {
  const user = APP.currentUser;
  Store.set('ff_cali_skill_' + user.id, skillKey);
  APP.currentCaliSkill = skillKey;
  showToast('Skill goal set! Now work through each step. 🎯', 'success');
  renderCaliSkillTree();
}

function toggleSkillStep(skillKey, stepId) {
  const user = APP.currentUser;
  const key  = 'ff_skill_progress_' + user.id + '_' + skillKey;
  const progress = Store.get(key, {});
  progress[stepId] = !progress[stepId];
  Store.set(key, progress);
  if (progress[stepId]) showToast('Step completed! Great progress! 💪', 'success');
  renderCaliSkillTree();
}

function renderCaliChallenge() {
  const container = document.getElementById('cali-challenge-content');
  if (!container) return;
  const user      = APP.currentUser;
  const challenge = (window.APP_DATA_DEFAULT||window.APP_DATA).calisthenicsChallenge || [];
  const progress  = Store.get('ff_cali_challenge_' + user.id, {});
  const doneCount = Object.values(progress).filter(Boolean).length;

  container.innerHTML = `
    <div style="padding:16px">
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--bg2))">
        <div style="font-family:var(--font-display);font-size:28px;color:var(--g5)">${doneCount}/21 <span style="font-size:16px;color:var(--text2)">days complete</span></div>
        <div class="progress-bar" style="margin:8px 0">
          <div class="progress-fill" style="width:${Math.round(doneCount/21*100)}%"></div>
        </div>
        <div style="font-size:13px;color:var(--text2)">Complete all 21 days to build your calisthenics habit!</div>
      </div>
      ${challenge.map(day => {
        const isDone = progress[day.day] === true;
        return `
          <div class="card card-sm" style="margin-bottom:8px;border:1px solid ${isDone?'var(--g3)':'var(--border)'}">
            <div style="display:flex;align-items:center;gap:12px">
              <div onclick="toggleChallengeDay(${day.day})"
                style="width:32px;height:32px;border-radius:50%;border:2px solid ${isDone?'var(--g4)':'var(--border)'};
                  background:${isDone?'var(--g4)':'transparent'};flex-shrink:0;cursor:pointer;
                  display:flex;align-items:center;justify-content:center;color:white;font-size:16px">
                ${isDone?'✓':day.day}
              </div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px${isDone?';color:var(--text3);text-decoration:line-through':''}">${day.name}</div>
                <div style="font-size:11px;color:var(--text3)">${day.exercises?.map(e=>e.name).join(' · ')||''}</div>
              </div>
              ${isDone?'<span class="badge badge-green">Done</span>':''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function toggleChallengeDay(dayNum) {
  const user     = APP.currentUser;
  const key      = 'ff_cali_challenge_' + user.id;
  const progress = Store.get(key, {});
  progress[dayNum] = !progress[dayNum];
  Store.set(key, progress);
  if (progress[dayNum]) showToast(`Day ${dayNum} complete! 🔥`, 'success');
  renderCaliChallenge();
}

function renderCaliProgress() {
  const container = document.getElementById('cali-progress-content');
  if (!container) return;
  const user  = APP.currentUser;
  const logs  = Store.getModuleDayLogs(user.id, 'calisthenics');
  const level = APP.currentCaliLevel;
  const levels = (window.APP_DATA_DEFAULT||window.APP_DATA).modules?.calisthenics?.levels || {};
  const equipment = Store.get('ff_cali_equipment_' + user.id, 'none');
  const equip_labels = { none: 'No Equipment', bar: 'Pull-up Bar', bars: 'Parallel Bars' };
  const challenge = Store.get('ff_cali_challenge_' + user.id, {});
  const challengeDone = Object.values(challenge).filter(Boolean).length;

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Sessions Done</div></div>
        <div class="stat-card"><div class="stat-val">L${level}</div><div class="stat-label">${levels[level]?.name||''}</div></div>
        <div class="stat-card"><div class="stat-val">${challengeDone}</div><div class="stat-label">21-Day Progress</div></div>
        <div class="stat-card"><div class="stat-val">${[...new Set(logs.map(l=>l.date))].length}</div><div class="stat-label">Active Days</div></div>
      </div>

      <div class="section-title" style="margin-bottom:10px">Equipment Setup</div>
      <div class="card card-sm" style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--text2);margin-bottom:12px">
          Your equipment affects which exercises appear. Current: <strong style="color:var(--g5)">${equip_labels[equipment]||equipment}</strong>
        </div>
        <div style="display:flex;gap:8px">
          ${[['none','No Equipment 🧑'],['bar','Pull-up Bar 🔝'],['bars','Parallel Bars 🏅']].map(([v,l]) => `
            <button onclick="setCaliEquipment('${v}')"
              style="flex:1;padding:8px;border-radius:10px;border:2px solid ${equipment===v?'var(--g4)':'var(--border)'};
                background:${equipment===v?'rgba(46,125,70,0.2)':'var(--surface)'};cursor:pointer;font-size:11px;font-weight:600;color:${equipment===v?'var(--g5)':'var(--text2)'}">
              ${l}
            </button>`).join('')}
        </div>
      </div>

      <div class="section-title" style="margin-bottom:10px">Recent Sessions</div>
      ${logs.length
        ? logs.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(l => `
          <div class="card card-sm" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:600;font-size:13px">${l.day}</div>
              <div style="font-size:12px;color:var(--text3)">${l.date}</div>
            </div>
            <span class="badge badge-green">✓ Done</span>
          </div>`).join('')
        : '<div class="empty-state" style="padding:24px"><p>No sessions yet.<br>Start your first workout!</p></div>'}
    </div>`;
}

function setCaliEquipment(eq) {
  Store.set('ff_cali_equipment_' + APP.currentUser.id, eq);
  showToast('Equipment updated! ✅', 'success');
  renderCaliProgress();
}
