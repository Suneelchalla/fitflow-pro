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
  // Always show registered plan in bottom nav on every dashboard init
  if (typeof _refreshMyPlanNav === 'function') _refreshMyPlanNav();
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
  // Count both workout completions AND runs toward the weekly ring
  const _weekRuns     = Store.getUserRunLogs(user.id).filter(r => r.date >= monday);
  const thisWeekLogs  = [...logs.filter(l => l.date >= monday), ..._weekRuns];

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

  const weekTarget  = 7; // 7 sessions/week = 100% (1 per day)
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
  { id: 'cardio',       name: 'Home Cardio',      emoji: '🏠',    color: 'grad-cardio',  sub: '8-9 exercises · 6 days' },
  { id: 'gym',          name: 'Gym Workouts',      emoji: '🏋️',   color: 'grad-gym',     sub: '8 exercises · 6 days' },
  { id: 'yoga',         name: 'Yoga',              emoji: '🧘',    color: 'grad-yoga',    sub: '8-12 poses · 6 days' },
  { id: 'running',      name: 'Running & Walking', emoji: '🏃',    color: 'grad-running', sub: 'GPS tracker + plans' },
  { id: 'stretching',   name: 'Stretching',        emoji: '🙆',    color: 'grad-stretch', sub: '6 stretches · 6 days' },
  { id: 'calisthenics', name: 'Calisthenics',      emoji: '🤸‍♂️', color: 'grad-cali',    sub: '3 levels · skill tree' },
  { id: 'core',         name: 'Core & Abs',        emoji: '🔥',    color: 'grad-core',    sub: '6 exercises · 6 days' },
];

function getModuleOrder(userId) {
  const saved   = Store.get('ff_module_order_' + userId);
  const onboard = Store.get('ff_onboard_' + userId);

  // Determine which modules user selected during onboarding
  // If they selected specific modules, only show those (+ any new ones added later)
  const selectedIds = (onboard?.modules && onboard.modules.length > 0)
    ? onboard.modules
    : null;  // null = show all (no onboarding completed or all selected)

  if (saved && Array.isArray(saved) && saved.length > 0) {
    // Restore saved order; add any new modules (e.g. core) not yet in saved list
    let ordered = saved.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);
    const missing = ALL_MODULES.filter(m => !saved.includes(m.id));
    ordered = [...ordered, ...missing];
    // Apply selection filter if onboarding was done
    if (selectedIds) return ordered.filter(m => selectedIds.includes(m.id));
    return ordered;
  }

  // No saved order — use onboarding selection if available
  if (selectedIds) {
    const selected = selectedIds.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);
    const rest     = ALL_MODULES.filter(m => !selectedIds.includes(m.id));
    return [...selected, ...rest].filter(m => selectedIds.includes(m.id));
  }
  return [...ALL_MODULES];
}

function saveModuleOrder(userId, modules) {
  const order = modules.map(m => m.id);
  Store.set('ff_module_order_' + userId, order);
  sheetsPost('saveContent', { key: 'module_order_' + userId, value: order });
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
  _clearRestTimer();
  APP.currentModule = moduleId;
  if (APP.currentUser) Store.set('ff_last_module_' + APP.currentUser.id, moduleId);
  if (moduleId === 'running') { showPage('page-running'); initRunningPage(); return; }
  if (moduleId === 'calisthenics') { showPage('page-calisthenics'); if (typeof initCalisthenicsPage === 'function') initCalisthenicsPage(); return; }
  if (moduleId === 'yoga') { showPage('page-module'); renderYogaProgressivePage(); return; }
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

function renderYogaProgressivePage() {
  const user         = APP.currentUser;
  const baseYogaData = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const savedYoga    = Store.getContent('exercises_yoga');
  const yogaData     = savedYoga
    ? { ...baseYogaData, schedule: savedYoga.schedule || baseYogaData?.schedule }
    : baseYogaData;

  document.getElementById('module-title').textContent = 'Yoga';
  document.getElementById('module-emoji-header').textContent = '🧘';

  const schedule  = yogaData?.schedule || {};
  const allDays   = Object.keys(schedule).sort((a,b) =>
    parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ',''))
  );
  const totalDays = allDays.length;

  // Option 1: Auto-jump to current day
  const yogaProgress  = Store.get('ff_yoga_progress_' + user.id) || {};
  const completedCount = Object.keys(yogaProgress).filter(d => yogaProgress[d]).length;
  const currentDayNum = Math.min(completedCount + 1, totalDays);
  APP.currentDay = 'Day ' + currentDayNum;

  const dayTabStrip = document.getElementById('day-tab-strip');
  if (dayTabStrip) dayTabStrip.style.display = 'none';

  document.querySelectorAll('.module-inner-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.module-inner-tab')?.classList.add('active');
  document.querySelectorAll('.module-tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('module-workout-tab')?.classList.add('active');

  renderYogaDayView('Day ' + currentDayNum, allDays, yogaProgress, yogaData, user);
}

function renderYogaDayView(dayKey, allDays, yogaProgress, yogaData, user) {
  APP.currentDay       = dayKey;
  const dayNum         = parseInt(dayKey.replace('Day ',''));
  const totalDays      = allDays.length;
  const schedule       = yogaData?.schedule || {};
  const dayData        = schedule[dayKey];
  const phases         = yogaData?.phases || [];
  const phase          = phases.find(p => dayNum >= p.from && dayNum <= p.to) || phases[0];
  const isCompleted    = !!(yogaProgress)[dayKey];
  const completedCount = Object.values(yogaProgress).filter(Boolean).length;
  const phaseColor     = phase?.color || '#7b1fa2';

  const moduleWorkoutTab = document.getElementById('module-workout-tab');
  if (!moduleWorkoutTab) return;

  // Top nav: prev | Day X (tap to pick) | next
  const dayTabStrip = document.getElementById('day-tab-strip');
  if (dayTabStrip) {
    dayTabStrip.style.cssText = 'display:flex;gap:8px;padding:10px 16px;align-items:center;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;';
    dayTabStrip.innerHTML = `
      <button onclick="yogaNavigateDay(${dayNum-1})"
        style="background:var(--surface);border:1px solid var(--border);border-radius:50%;width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--text2);flex-shrink:0;
        ${dayNum<=1?'opacity:0.3;pointer-events:none':''}">\u2039</button>
      <button onclick="openYogaDayPicker()" style="flex:1;background:rgba(103,58,183,0.15);
        border:1.5px solid rgba(103,58,183,0.4);border-radius:12px;padding:8px 12px;cursor:pointer;">
        <div style="font-family:var(--font-display);font-size:22px;color:#ce93d8;line-height:1;text-align:center">${dayKey}</div>
        <div style="font-size:10px;color:var(--text3);text-align:center;margin-top:2px">${completedCount}/${totalDays} done &middot; Tap to jump \u25be</div>
      </button>
      <button onclick="yogaNavigateDay(${dayNum+1})"
        style="background:var(--surface);border:1px solid var(--border);border-radius:50%;width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--text2);flex-shrink:0;
        ${dayNum>=totalDays?'opacity:0.3;pointer-events:none':''}">\u203a</button>
    `;
  }

  if (!dayData) {
    moduleWorkoutTab.innerHTML = `<div style="padding:40px 16px;text-align:center;color:var(--text3)">
      <div style="font-size:48px;margin-bottom:12px">\U0001f9d8</div>
      <div style="font-size:15px">Content for this day coming soon.</div></div>`;
    return;
  }

  const poses = dayData.poses || [];

  moduleWorkoutTab.innerHTML = `
    <div style="margin:14px 16px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <div style="display:inline-flex;align-items:center;gap:6px;background:${phaseColor}22;border:1px solid ${phaseColor}55;border-radius:50px;padding:4px 12px;">
        <span style="width:7px;height:7px;border-radius:50%;background:${phaseColor};flex-shrink:0"></span>
        <span style="font-size:11px;font-weight:600;color:${phaseColor}">${phase?.label||'Yoga'}</span>
      </div>
      ${isCompleted ? '<span style="background:rgba(46,125,70,0.2);border:1px solid var(--g3);border-radius:50px;padding:4px 12px;font-size:11px;color:var(--g5);">\u2705 Completed</span>' : ''}
    </div>
    <div style="margin:0 16px 14px;background:linear-gradient(135deg,rgba(103,58,183,0.18),rgba(74,20,140,0.12));border:1px solid rgba(103,58,183,0.3);border-radius:12px;padding:12px 14px;">
      <div style="font-size:10px;color:rgba(179,136,255,0.6);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px">Today's Focus</div>
      <div style="font-size:15px;font-weight:700;color:#ce93d8">${dayData.focus||''}</div>
    </div>
    <div style="margin:0 16px 16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:11px;color:var(--text3)">Journey Progress</span>
        <span style="font-size:11px;font-weight:600;color:#ce93d8">${Math.round(completedCount/totalDays*100)}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${completedCount/totalDays*100}%;background:linear-gradient(90deg,#7b1fa2,#ce93d8)"></div></div>
    </div>
    <div style="padding:0 16px;">
      ${poses.map((pose,i) => `
        <div class="exercise-card animate-in animate-in-${Math.min(i+1,5)}" style="margin-bottom:12px;border-color:rgba(103,58,183,0.25);">
          <div style="background:linear-gradient(135deg,rgba(103,58,183,0.12),rgba(74,20,140,0.08));height:72px;display:flex;align-items:center;justify-content:center;">
            <span style="font-family:var(--font-display);font-size:40px;color:rgba(179,136,255,0.5)">${(pose.name||'').charAt(0)}</span>
          </div>
          <div class="exercise-body">
            <div class="exercise-name" style="margin-bottom:5px">${i+1}. ${pose.name}</div>
            <div class="exercise-meta"><span>\u23f1 ${pose.hold||''}</span></div>
            <div class="exercise-desc">${pose.desc||''}</div>
            ${pose.demo?`<a href="${pose.demo}" target="_blank" rel="noopener" class="demo-link">\u25b6 Watch Demo</a>`:''}
          </div>
        </div>`).join('')}
    </div>
    <div style="padding:16px;padding-bottom:80px;">
      ${isCompleted
        ? `<div style="display:flex;align-items:center;gap:12px;padding:16px;background:rgba(46,125,70,0.12);border:1px solid var(--g3);border-radius:14px;">
            <span style="font-size:24px">\u2705</span>
            <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--g5)">Day ${dayNum} Complete!</div><div style="font-size:11px;color:var(--text3)">Logged to your record</div></div>
            ${dayNum<totalDays?`<button onclick="yogaNavigateDay(${dayNum+1})" style="background:linear-gradient(135deg,var(--g3),var(--g4));color:white;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">Day ${dayNum+1} \u2192</button>`:''}
          </div>`
        : `<button onclick="completeYogaDay('${dayKey}')" id="yoga-complete-btn"
            style="width:100%;padding:18px;background:linear-gradient(135deg,#7b1fa2,#9c27b0);color:white;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(123,31,162,0.35);">
            🧘 Mark Day ${dayNum} Complete
          </button>
          <div style="text-align:center;margin-top:7px;font-size:11px;color:var(--text3)">Logs your session and unlocks Day ${Math.min(dayNum+1,totalDays)}</div>`
      }
    </div>

    <!-- Day Picker Modal -->
    <div id="yoga-day-picker" onclick="if(event.target===this)closeYogaDayPicker()"
      style="display:none;position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);align-items:flex-end;justify-content:center;">
      <div style="width:100%;max-width:480px;background:var(--bg2);border-radius:24px 24px 0 0;border:1px solid var(--border);border-bottom:none;max-height:82vh;display:flex;flex-direction:column;">
        <div style="padding:16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);flex-shrink:0;">
          <div style="font-size:16px;font-weight:700;">Jump to Day</div>
          <button onclick="closeYogaDayPicker()" style="background:var(--surface);border:1px solid var(--border);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:var(--text2);font-size:16px;cursor:pointer;">\u2715</button>
        </div>
        <div style="display:flex;gap:6px;padding:10px 16px;overflow-x:auto;flex-shrink:0;scrollbar-width:none;">
          ${phases.map((p,pi) => `
            <button onclick="yogaPickerPhase(${pi})" id="yoga-phase-tab-${pi}"
              style="flex-shrink:0;padding:6px 14px;border-radius:50px;font-size:12px;font-weight:600;
              border:1.5px solid ${p.color}55;cursor:pointer;white-space:nowrap;transition:all 0.2s;
              ${pi===0?`background:${p.color}33;color:${p.color};border-color:${p.color};`:'background:transparent;color:var(--text3);'}">
              ${p.label.split('\u2014')[1]?.trim()||p.label.replace('Phase '+( pi+1)+' \u2014 ','')||p.label}
            </button>`).join('')}
        </div>
        <div id="yoga-picker-grid" style="overflow-y:auto;padding:0 16px 28px;flex:1;"></div>
      </div>
    </div>
  `;

  // Render default phase grid (phase containing current day)
  const defaultPhaseIdx = phases.findIndex(p => dayNum >= p.from && dayNum <= p.to);
  _renderYogaPickerGrid(Math.max(defaultPhaseIdx,0), phases, allDays, yogaProgress, dayNum);
}

function openYogaDayPicker() {
  const p = document.getElementById('yoga-day-picker');
  if (p) p.style.display = 'flex';
}
function closeYogaDayPicker() {
  const p = document.getElementById('yoga-day-picker');
  if (p) p.style.display = 'none';
}

function yogaPickerPhase(phaseIdx) {
  const user      = APP.currentUser;
  const baseYoga  = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const savedYoga = Store.getContent('exercises_yoga');
  const yogaData  = savedYoga ? { ...baseYoga, schedule: savedYoga.schedule || baseYoga?.schedule } : baseYoga;
  const schedule  = yogaData?.schedule || {};
  const allDays   = Object.keys(schedule).sort((a,b) => parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ','')));
  const phases    = yogaData?.phases || [];
  const progress  = Store.get('ff_yoga_progress_' + user.id) || {};
  const curNum    = parseInt((APP.currentDay||'Day 1').replace('Day ',''));

  phases.forEach((p,i) => {
    const tab = document.getElementById('yoga-phase-tab-'+i);
    if (!tab) return;
    if (i===phaseIdx) { tab.style.background=p.color+'33'; tab.style.color=p.color; tab.style.borderColor=p.color; }
    else { tab.style.background='transparent'; tab.style.color='var(--text3)'; tab.style.borderColor=p.color+'55'; }
  });
  _renderYogaPickerGrid(phaseIdx, phases, allDays, progress, curNum);
}

function _renderYogaPickerGrid(phaseIdx, phases, allDays, progress, currentDayNum) {
  const grid = document.getElementById('yoga-picker-grid');
  if (!grid) return;
  const phase = phases[phaseIdx];
  if (!phase) return;
  const phaseDays = allDays.filter(d => { const n=parseInt(d.replace('Day ','')); return n>=phase.from && n<=phase.to; });
  grid.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:7px;padding-top:6px;">
      ${phaseDays.map(dk => {
        const n=parseInt(dk.replace('Day ','')), done=!!progress[dk], cur=n===currentDayNum;
        return `<button onclick="yogaPickerSelectDay(${n})"
          style="aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;
          justify-content:center;position:relative;cursor:pointer;transition:all 0.15s;
          background:${done?phase.color+'33':cur?'rgba(103,58,183,0.25)':'var(--surface)'};
          border:${cur?'2px solid #ce93d8':done?'1.5px solid '+phase.color+'66':'1px solid var(--border)'};
          ">
          ${done?'<span style="position:absolute;top:2px;right:3px;font-size:8px;color:'+phase.color+'">\u2713</span>':''}
          <span style="font-size:12px;font-weight:700;color:${done?phase.color:cur?'#ce93d8':'var(--text2)'}">${n}</span>
        </button>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text3);">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${phase.color}33;border:1.5px solid ${phase.color}66;margin-right:4px;vertical-align:middle;"></span>Done</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:rgba(103,58,183,0.25);border:2px solid #ce93d8;margin-right:4px;vertical-align:middle;"></span>Current</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--surface);border:1px solid var(--border);margin-right:4px;vertical-align:middle;"></span>Upcoming</span>
    </div>`;
}

function yogaPickerSelectDay(n) {
  closeYogaDayPicker();
  yogaNavigateDay(n);
}

function yogaNavigateDay(dayNum) {
  const user      = APP.currentUser;
  const baseYoga  = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const savedYoga = Store.getContent('exercises_yoga');
  const yogaData  = savedYoga ? { ...baseYoga, schedule: savedYoga.schedule || baseYoga?.schedule } : baseYoga;
  const schedule  = yogaData?.schedule || {};
  const allDays   = Object.keys(schedule).sort((a,b) => parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ','')));
  const totalDays = allDays.length;
  if (dayNum < 1 || dayNum > totalDays) return;
  const progress = Store.get('ff_yoga_progress_' + user.id) || {};
  renderYogaDayView('Day ' + dayNum, allDays, progress, yogaData, user);
  document.querySelector('.scroll-content')?.scrollTo?.(0,0);
}

async function completeYogaDay(dayKey) {
  const user = APP.currentUser;
  const btn  = document.getElementById('yoga-complete-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }

  const yogaProgress   = Store.get('ff_yoga_progress_' + user.id) || {};
  yogaProgress[dayKey] = true;
  Store.set('ff_yoga_progress_' + user.id, yogaProgress);

  const today = todayStr();
  const logResult = Store.addLog({ userId:user.id, email:user.email, module:'yoga', day:dayKey, date:today });
  if (logResult) Sheets.post('logCompletion', { userId:user.id, email:user.email, module:'yoga', day:dayKey, date:today }).catch(()=>{});

  showToast('✅ ' + dayKey + ' complete! Great practice 🧘', 'success');

  const baseYoga  = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const savedYoga = Store.getContent('exercises_yoga');
  const yogaData  = savedYoga ? { ...baseYoga, schedule: savedYoga.schedule || baseYoga?.schedule } : baseYoga;
  const schedule  = yogaData?.schedule || {};
  const allDays   = Object.keys(schedule).sort((a,b) => parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ','')));
  renderYogaDayView(dayKey, allDays, yogaProgress, yogaData, user);
}

// ── RENDER EXERCISES ──────────────────────────────────────────────
// ── REST TIMER ───────────────────────────────────────────────────
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

  // Hold-based modules
  const isHoldBased = moduleId === 'yoga' || moduleId === 'stretching';

  // Gym: show muscle group label for the day
  if (moduleId === 'gym') {
    const savedContent = Store.getContent('exercises_gym');
    const gymBase = window.APP_DATA_DEFAULT?.modules?.gym || window.APP_DATA?.modules?.gym;
    const savedLabels = savedContent?.dayLabels || {};
    const defaultLabels = gymBase?.dayLabels || {};
    const dayLabel = savedLabels[day] || defaultLabels[day] || day + ' — Gym Workout';
    document.getElementById('gym-day-label')?.remove();
    const labelEl = document.createElement('div');
    labelEl.id = 'gym-day-label';
    labelEl.style.cssText = 'background:linear-gradient(135deg,rgba(46,125,70,0.25),rgba(30,100,50,0.15));border:1px solid rgba(46,125,70,0.4);border-radius:12px;padding:12px 16px;margin-bottom:14px;font-size:15px;font-weight:700;color:var(--g5);letter-spacing:0.02em;';
    labelEl.textContent = dayLabel;
    container.parentElement.insertBefore(labelEl, container);
  }

  container.innerHTML = allExercises.map((ex, i) => {
    let hdr = '';
    if (ex._section !== prevSection) {
      prevSection = ex._section;
      if (ex._section === 'warmup')   hdr = secHeader('Warm-Up', 'rgba(30,136,229,0.35)', '🔥');
      if (ex._section === 'main')     hdr = secHeader(moduleId==='yoga' ? 'Practice Sequence' : moduleId==='stretching' ? 'Stretch Sequence' : 'Main Workout', moduleId==='yoga' ? 'rgba(103,58,183,0.4)' : moduleId==='stretching' ? 'rgba(103,58,183,0.25)' : 'rgba(46,125,70,0.4)', moduleId==='yoga' ? '🧘' : moduleId==='stretching' ? '🙆' : '💪');
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

    // Gym: plain text rows. Yoga/Stretching: single hold checkbox. Others: set checkboxes
    const isGymModule = moduleId === 'gym';
    const checksHtml = isGymModule
      ? Array.from({ length: parseInt(ex.sets) || 1 }, (_, s) =>
          `<div class="set-row-gym"><span class="set-row-label">Set ${s + 1}</span><span class="set-row-reps">${ex.reps || ''}</span></div>`
        ).join('')
      : isHoldBased
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

    // Progressive overload: load last logged weight for gym exercises
    const isGym = moduleId === 'gym';
    const plKey = `ff_pl_${user.id}_${moduleId}_${(ex.name||'').replace(/\s+/g,'_')}`;
    const plData = isGym ? Store.get(plKey) : null;
    const lastWeight = plData?.weight || null;

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
           ${isGym ? `<span style="color:var(--g5);font-size:11px;cursor:pointer"
             onclick="logExerciseWeight('${moduleId}','${(ex.name||'').replace(/'/g,"\\'")}',this)">
             ${lastWeight ? `⚖️ ${lastWeight}kg` : '⚖️ Log weight'}</span>` : ''}
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
  const wasChecked = pos >= 0;
  if (wasChecked) sessionData[exIdx].splice(pos, 1);
  else            sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);

  // Haptic feedback
  navigator.vibrate && navigator.vibrate(wasChecked ? 20 : 40);

  // Start rest timer — skip for gym (plain rows) and yoga/stretching
  if (moduleId === 'gym') return;
  if (!wasChecked && moduleId !== 'yoga' && moduleId !== 'stretching') {
    const mod     = (window.APP_DATA_DEFAULT||window.APP_DATA).modules[moduleId];
    const exOv    = Store.getContent('exercises_' + moduleId);
    const day_ex  = exOv?.days?.[day] || mod?.days?.[day] || [];
    const wu      = Store.getContent('warmup_' + moduleId)  || (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.[moduleId]   || [];
    const cd      = Store.getContent('cooldown_' + moduleId)|| (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.[moduleId] || [];
    const all     = [...wu, ...day_ex, ...cd];
    const ex      = all[exIdx];
    const restSec = ex?.rest ? parseInt(ex.rest) : 60;
    // Only show rest timer if this wasn't the last set of the exercise
    const totalSets = parseInt(ex?.sets) || 1;
    const doneCount = (sessionData[exIdx] || []).length;
    if (doneCount < totalSets) _showRestTimer(restSec);
  }

  renderExercises(moduleId, day);
  updateCompleteBtn();
}

// ── REST TIMER ────────────────────────────────────────────────────
let _restTimerInterval = null;

function _showRestTimer(seconds) {
  _clearRestTimer();
  let remaining = seconds;

  const el = document.createElement('div');
  el.id = 'rest-timer-overlay';
  el.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(7,21,16,0.96);border:1px solid var(--g3);border-radius:20px;
    padding:16px 24px;z-index:500;display:flex;align-items:center;gap:16px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:220px;max-width:340px;
    animation:slideUp .25s ease`;
  el.innerHTML = `
    <div style="font-size:28px" id="rest-timer-icon">⏱</div>
    <div style="flex:1">
      <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Rest Timer</div>
      <div id="rest-timer-count" style="font-family:var(--font-display);font-size:32px;color:var(--g5);line-height:1">${remaining}s</div>
      <div style="height:3px;background:var(--bg3);border-radius:2px;margin-top:6px;overflow:hidden">
        <div id="rest-timer-bar" style="height:100%;background:var(--g4);border-radius:2px;width:100%;transition:width .9s linear"></div>
      </div>
    </div>
    <button onclick="_clearRestTimer()" style="background:none;border:none;color:var(--text3);font-size:20px;cursor:pointer;padding:4px">✕</button>`;
  document.body.appendChild(el);

  // Animate bar immediately
  requestAnimationFrame(() => {
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.style.width = '0%';
  });

  _restTimerInterval = setInterval(() => {
    remaining--;
    const countEl = document.getElementById('rest-timer-count');
    if (countEl) {
      countEl.textContent = remaining + 's';
      countEl.style.color = remaining <= 5 ? 'var(--accent)' : 'var(--g5)';
    }
    if (remaining <= 3) navigator.vibrate && navigator.vibrate(30);
    if (remaining <= 0) {
      navigator.vibrate && navigator.vibrate([80, 40, 80]);
      const icon = document.getElementById('rest-timer-icon');
      if (icon) icon.textContent = '💪';
      if (countEl) countEl.textContent = "Go!";
      setTimeout(_clearRestTimer, 1000);
    }
  }, 1000);
}

function logExerciseWeight(moduleId, exName, triggerEl) {
  const user = APP.currentUser;
  const plKey = `ff_pl_${user.id}_${moduleId}_${exName.replace(/\s+/g,'_')}`;
  const plData = Store.get(plKey) || {};
  const current = plData.weight || '';
  const input = prompt(`Weight used for "${exName}" (kg):
Leave blank to clear`, current);
  if (input === null) return; // cancelled
  const kg = parseFloat(input);
  if (isNaN(kg) || kg <= 0) {
    Store.remove(plKey);
    if (triggerEl) triggerEl.textContent = '⚖️ Log weight';
    return;
  }
  // Save with history
  const history = plData.history || [];
  history.push({ date: todayStr(), weight: kg });
  if (history.length > 30) history.splice(0, history.length - 30);
  const plVal = { weight: kg, history, updatedAt: new Date().toISOString() };
  Store.set(plKey, plVal);
  // Sync to Sheets so weight history survives reinstall
  sheetsPost('saveContent', { key: plKey.replace('ff_', ''), value: plVal });
  if (triggerEl) triggerEl.textContent = `⚖️ ${kg}kg`;
  showToast(`Weight logged: ${kg}kg for ${exName} 💪`, 'success');
  navigator.vibrate && navigator.vibrate(30);
}

function _clearRestTimer() {
  if (_restTimerInterval) { clearInterval(_restTimerInterval); _restTimerInterval = null; }
  const el = document.getElementById('rest-timer-overlay');
  if (el) el.remove();
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
  _launchConfetti();
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
  setTimeout(() => checkAndUnlockWorkoutAchievements(user.id), 800);
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
  // Sync to Sheets (250ml ≈ 1 glass, target 8 glasses = 2000ml)
  Sheets.post('saveHydrationLog', {
    userId: user.id, email: user.email, date: today,
    glassesTarget: 8, glassesDone: Math.round(newMl / 250),
  }).catch(() => {});
}
function resetWater() {
  const user  = APP.currentUser;
  const today = todayStr();
  Store.setHydration(user.id, today, 0);
  renderHydrationTab(APP.currentModule);
  Sheets.post('saveHydrationLog', {
    userId: user.id, email: user.email, date: today, glassesTarget: 8, glassesDone: 0,
  }).catch(() => {});
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
function buildCalendar(logs, moduleFilter, year, month, context) {
  const now = new Date();
  if (year  === undefined || year  === null) year  = now.getFullYear();
  if (month === undefined || month === null) month = now.getMonth();
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

  // Headers are Sunday-first: S M T W T F S
  // JS getDay(): 0=Sun, 1=Mon...6=Sat → offset = firstDay directly
  const offset = firstDay;
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
    const isClickable = (context === 'global') && !isFuture;
    const cellOnClick  = isClickable ? `onclick="selectHistoryDay('${dateStr}',this)"` : '';
    const selectedStyle = (context === 'global' && dateStr === _selectedHistoryDate && !isFuture)
      ? 'outline:2px solid var(--accent);outline-offset:2px;' : '';
    cells += `<div class="${cellClass}" title="${tooltip}" ${cellOnClick} style="cursor:${isClickable?'pointer':'default'};${selectedStyle}">${innerHtml}</div>`;
  }

  // Legend
  const legend = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:var(--text3)">
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:var(--g3);margin-right:4px;vertical-align:middle"></span>Activity done</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:rgba(229,57,53,0.5);margin-right:4px;vertical-align:middle"></span>Missed</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:2px solid var(--accent);margin-right:4px;vertical-align:middle"></span>Today</span>
    </div>`;

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--text2);margin-bottom:8px;letter-spacing:.04em">${monthLabel}</div><div class="cal-grid">${headers}${cells}</div>${legend}`;
}

// ── GLOBAL HISTORY ────────────────────────────────────────────────
// Month navigation state
let _historyYear         = new Date().getFullYear();
let _historyMonth        = new Date().getMonth();
let _selectedHistoryDate = todayStr(); // currently selected day in history calendar

function changeHistoryMonth(delta) {
  _historyMonth += delta;
  if (_historyMonth > 11) { _historyMonth = 0;  _historyYear++; }
  if (_historyMonth < 0)  { _historyMonth = 11; _historyYear--; }
  const now = new Date();
  const nextBtn = document.getElementById('history-next-btn');
  if (nextBtn) {
    const atCurrent = _historyYear === now.getFullYear() && _historyMonth >= now.getMonth();
    nextBtn.disabled      = atCurrent;
    nextBtn.style.opacity = atCurrent ? '0.3' : '1';
  }
  _renderHistoryCalendar();
}

function _renderHistoryCalendar() {
  const user = APP.currentUser;
  const now  = new Date();

  // Merge workout logs + run logs into one unified list for calendar + activity display
  const workoutLogs = Store.getUserLogs(user.id);
  const runEntries  = Store.getUserRunLogs(user.id).map(r => ({
    userId:       r.userId,
    module:       'running',
    day:          r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '',
    date:         r.date      || '',
    timestamp:    r.timestamp || r.date || '',
    _isRun:       true,
    _runKm:       r.distance  || 0,
    _runTs:       r.timestamp || '',  // store exact timestamp for matching
    _activityType: r.activityType || 'run',
  }));
  // Combine workout logs + run entries
  // Dedup only if exact same timestamp already exists (avoid double-counting)
  const logs = [...workoutLogs];
  runEntries.forEach(r => {
    const isDuplicate = logs.find(l =>
      l.module === 'running' &&
      l.date === r.date &&
      l.timestamp === r.timestamp  // same timestamp = same log entry
    );
    if (!isDuplicate) logs.push(r);
  });

  const label = document.getElementById('history-month-label');
  const monthName = new Date(_historyYear, _historyMonth, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  if (label) label.textContent = monthName;

  const nextBtn = document.getElementById('history-next-btn');
  if (nextBtn) {
    const atCurrent = _historyYear === now.getFullYear() && _historyMonth >= now.getMonth();
    nextBtn.disabled      = atCurrent;
    nextBtn.style.opacity = atCurrent ? '0.3' : '1';
  }

  document.getElementById('history-cal').innerHTML = buildCalendar(logs, null, _historyYear, _historyMonth, 'global');

  // Show only the SELECTED day's logs (default: today)
  _renderDayActivityLog(logs);
}

// ── SELECT A DAY IN HISTORY CALENDAR ─────────────────────────────
function selectHistoryDay(dateStr, el) {
  _selectedHistoryDate = dateStr;
  // Re-render calendar to update selected highlight
  const user = APP.currentUser;
  const workoutLogs = Store.getUserLogs(user.id);
  const runEntries  = Store.getUserRunLogs(user.id).map(r => ({
    userId: r.userId, module: 'running',
    day:    r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '',
    date:   r.date || '', timestamp: r.timestamp || r.date || '',
    _isRun: true, _runKm: r.distance || 0,
    _runTs: r.timestamp || '', _activityType: r.activityType || 'run',
  }));
  const logs = [...workoutLogs];
  runEntries.forEach(r => {
    const isDuplicate = logs.find(l =>
      l.module === 'running' && l.date === r.date && l.timestamp === r.timestamp
    );
    if (!isDuplicate) logs.push(r);
  });
  document.getElementById('history-cal').innerHTML = buildCalendar(logs, null, _historyYear, _historyMonth, 'global');
  _renderDayActivityLog(logs);
  navigator.vibrate && navigator.vibrate(20);
}

// ── RENDER ACTIVITY LOG FOR SELECTED DAY ─────────────────────────
function _renderDayActivityLog(allLogs) {
  const logTitle  = document.getElementById('history-log-title');
  const logEl     = document.getElementById('history-log');
  if (!logEl) return;

  const dateObj   = new Date(_selectedHistoryDate + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (logTitle) logTitle.textContent = dateLabel;

  const dayLogs = allLogs.filter(l => l.date === _selectedHistoryDate);

  if (!dayLogs.length) {
    const isToday  = _selectedHistoryDate === todayStr();
    const isFuture = _selectedHistoryDate > todayStr();
    logEl.innerHTML = `
      <div style="text-align:center;padding:28px 16px">
        <div style="font-size:40px;margin-bottom:10px">${isFuture ? '🗓️' : isToday ? '💪' : '😴'}</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">
          ${isFuture ? 'Future date' : isToday ? 'No activity yet today' : 'Rest day'}
        </div>
        <div style="font-size:13px;color:var(--text3)">
          ${isFuture ? 'Come back on this date!' : isToday ? 'Get your first workout in!' : 'Recovery is part of progress.'}
        </div>
      </div>`;
    return;
  }

  // Group runs separately for richer display
  const user = APP.currentUser;
  const runLogs = Store.getUserRunLogs(user.id).filter(r => r.date === _selectedHistoryDate);

  logEl.innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:10px">
      ${dayLogs.length} activit${dayLogs.length > 1 ? 'ies' : 'y'} — tap any to view details
    </div>
    ${dayLogs.map((l, idx) => {
      const isRun = l._isRun || l.module === 'running';
      // Match this specific activity card to its exact run log by timestamp
      const allSortedRunLogs = Store.getUserRunLogs(user.id)
        .sort((a,b) => (b.timestamp||b.date||'').localeCompare(a.timestamp||a.date||''));
      let runLog = null;
      let runIdx = -1;
      if (isRun) {
        if (l._runTs) {
          // Match by exact timestamp (most reliable)
          runIdx = allSortedRunLogs.findIndex(r => r.timestamp === l._runTs);
          runLog = runIdx >= 0 ? allSortedRunLogs[runIdx] : null;
        }
        if (!runLog) {
          // Fallback: match by date + distance
          runIdx = allSortedRunLogs.findIndex(r =>
            r.date === _selectedHistoryDate &&
            Math.abs((r.distance||0) - (l._runKm||0)) < 0.01
          );
          runLog = runIdx >= 0 ? allSortedRunLogs[runIdx] : null;
        }
        if (!runLog) {
          // Last resort: first run of the day
          runIdx = allSortedRunLogs.findIndex(r => r.date === _selectedHistoryDate);
          runLog = runIdx >= 0 ? allSortedRunLogs[runIdx] : null;
        }
      }

      return `
        <div class="card history-day-card" style="margin-bottom:10px;cursor:pointer"
          onclick="${isRun && runIdx >= 0 ? '_showHistoryRunDetail(' + runIdx + ')' : '_showHistoryWorkoutDetail(\'' + l.module + '\',\'' + l.date + '\',\'' + (l.day || '') + '\')'}">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:46px;height:46px;border-radius:14px;flex-shrink:0;
              background:${isRun ? 'rgba(67,160,90,0.15)' : 'rgba(46,125,70,0.12)'};
              border:1.5px solid ${isRun ? 'rgba(67,160,90,0.4)' : 'rgba(46,125,70,0.3)'};
              display:flex;align-items:center;justify-content:center;font-size:22px">
              ${getModuleEmoji(l.module)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:15px">${isRun && runLog?.title ? runLog.title : getModuleName(l.module)}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:2px">
                ${l.day || ''}${isRun && l._runKm ? ' · ' + l._runKm.toFixed(2) + ' km' : ''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span class="badge badge-green">✓ Done</span>
              <span style="color:var(--text3);font-size:16px">›</span>
            </div>
          </div>
          ${isRun && runLog ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;
            background:var(--bg3);border-radius:10px;padding:10px">
            <div style="text-align:center">
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${(runLog.distance||0).toFixed(2)}</div>
              <div style="font-size:10px;color:var(--text3)">km</div>
            </div>
            <div style="text-align:center">
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${fmtTime(runLog.duration||0)}</div>
              <div style="font-size:10px;color:var(--text3)">time</div>
            </div>
            <div style="text-align:center">
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${fmtPace(runLog.distance, runLog.duration)}</div>
              <div style="font-size:10px;color:var(--text3)">pace</div>
            </div>
          </div>` : ''}
        </div>`;
    }).join('')}`;
}

// ── HISTORY: RUN DETAIL (reuses modal-run-detail from running.js) ─
function _showHistoryRunDetail(idx) {
  // _showRunDetail lives in running.js — call it directly
  if (typeof _showRunDetail === 'function') {
    _showRunDetail(idx);
  }
}

// ── HISTORY: WORKOUT DETAIL CARD ─────────────────────────────────
function _showHistoryWorkoutDetail(moduleId, date, day) {
  const modData = (window.APP_DATA_DEFAULT||window.APP_DATA).modules[moduleId];
  const modName = getModuleName(moduleId);
  const modEmoji = getModuleEmoji(moduleId);

  // Get the exercises done that day from session data
  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_${moduleId}_${day}_${date}`;
  const sessionData = Store.get(sessionKey, {});

  // Get exercise list for that day
  const exOverride    = Store.getContent('exercises_' + moduleId);
  const dayExercises  = exOverride?.days?.[day] || modData?.days?.[day] || [];
  const warmups       = Store.getContent('warmup_' + moduleId)   || (window.APP_DATA_DEFAULT||window.APP_DATA).warmups?.[moduleId]   || [];
  const cooldowns     = Store.getContent('cooldown_' + moduleId) || (window.APP_DATA_DEFAULT||window.APP_DATA).cooldowns?.[moduleId] || [];
  const allExercises  = [
    ...warmups.map(e => ({...e, _section:'warmup'})),
    ...dayExercises.map(e => ({...e, _section:'main'})),
    ...cooldowns.map(e => ({...e, _section:'cooldown'})),
  ];

  const dateObj  = new Date(date + 'T12:00:00');
  const dateStr  = dateObj.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Count completed sets
  const totalSets = allExercises.reduce((a, ex) => a + (parseInt(ex.sets) || 1), 0);
  const doneSets  = Object.values(sessionData).flat().length;
  const pct       = totalSets > 0 ? Math.round(doneSets / totalSets * 100) : 0;

  const sectionLabels = { warmup: '🔥 Warm-Up', main: '💪 Main Workout', cooldown: '🧘 Cool-Down' };
  let prevSection = '';
  const exerciseRows = allExercises.map((ex, i) => {
    const isDone   = sessionData[i] && sessionData[i].length >= (parseInt(ex.sets) || 1);
    const checkedCount = (sessionData[i] || []).length;
    let sectionHdr = '';
    if (ex._section !== prevSection) {
      prevSection = ex._section;
      sectionHdr = `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;
        letter-spacing:.08em;margin:12px 0 6px;padding:6px 10px;background:var(--bg3);border-radius:8px">
        ${sectionLabels[ex._section] || ex._section}</div>`;
    }
    return `${sectionHdr}
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;
          background:${isDone ? 'var(--g3)' : 'var(--bg3)'};
          display:flex;align-items:center;justify-content:center;font-size:13px;color:${isDone ? '#fff' : 'var(--text3)'}">
          ${isDone ? '✓' : '○'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;${isDone ? '' : 'color:var(--text3)'}">${ex.name || ''}</div>
          <div style="font-size:11px;color:var(--text3)">${ex.sets || 1} sets · ${ex.reps || ''}</div>
        </div>
        <div style="font-size:11px;color:var(--text3);flex-shrink:0">${checkedCount}/${parseInt(ex.sets)||1}</div>
      </div>`;
  }).join('');

  const el = document.getElementById('day-detail-content');
  if (!el) return;

  el.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div style="width:52px;height:52px;border-radius:16px;
        background:rgba(46,125,70,0.15);border:2px solid rgba(46,125,70,0.35);
        display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">
        ${modEmoji}
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">${modName}</div>
        <div style="font-size:13px;color:var(--text3);margin-top:2px">${dateStr}</div>
      </div>
    </div>

    <!-- Completion ring -->
    <div style="background:linear-gradient(135deg,var(--g1),var(--bg3));border-radius:14px;
      padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:14px">
      <div style="position:relative;width:56px;height:56px;flex-shrink:0">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg3)" stroke-width="5"/>
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--g4)" stroke-width="5"
            stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*24}"
            stroke-dashoffset="${2*Math.PI*24*(1-pct/100)}"
            style="transform:rotate(-90deg);transform-origin:28px 28px"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:700;color:var(--g5)">${pct}%</div>
      </div>
      <div>
        <div style="font-weight:700;font-size:15px">
          ${pct === 100 ? '🎉 Full Workout Complete!' : pct > 0 ? '⚡ Partial Workout' : '📋 Logged'}
        </div>
        <div style="font-size:13px;color:var(--text3);margin-top:3px">
          ${doneSets} of ${totalSets} sets completed · Day: ${day}
        </div>
      </div>
    </div>

    <!-- Exercise list -->
    ${allExercises.length > 0 ? `
    <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;
      letter-spacing:.08em;margin-bottom:4px">Exercises</div>
    <div>${exerciseRows}</div>` :
    `<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">
      No exercise data available for this session.</div>`}
  `;

  openModal('modal-day-detail');
}

function renderGlobalHistory() {
  _historyYear         = new Date().getFullYear();
  _historyMonth        = new Date().getMonth();
  _selectedHistoryDate = todayStr();

  // Show loading then sync from Sheets before rendering
  const statsEl = document.getElementById('history-stats');
  if (statsEl) statsEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text3);font-size:13px">Loading…</div>';

  _syncHistoryThenRender();
}

async function _syncHistoryThenRender() {
  try {
    const user = APP.currentUser;
    if (user) {
      // Sync completion logs
      const res = await Sheets.get('getUserLogs', { userId: user.id });
      if (res?.success && Array.isArray(res.logs) && res.logs.length) {
        const local = Store.getLogs();
        let ch = false;
        res.logs.forEach(sl => {
          if (!local.find(l => l.userId===sl.userId && l.module===sl.module && l.day===sl.day && l.date===sl.date)) {
            local.push({ ...sl, id: sl.id||('log_'+Date.now()+Math.random()) });
            ch = true;
          }
        });
        if (ch) Store.set('ff_logs', local);
      }
      // Sync run logs
      const rr = await Sheets.get('getUserRunLogs', { userId: user.id });
      if (rr?.success && Array.isArray(rr.logs) && rr.logs.length) {
        const lr = Store.getRunLogs(); let ch2 = false;
        rr.logs.forEach(r => {
          if (!lr.find(l => l.id===r.id||(l.userId===r.userId&&l.date===r.date&&Math.abs((l.distance||0)-(r.distance||0))<0.01)))
            { lr.push(r); ch2=true; }
        });
        if (ch2) Store.set('ff_runlogs', lr);
      }
    }
  } catch(e) { console.warn('History sync skipped:', e.message); }

  const user    = APP.currentUser;
  const logs    = Store.getUserLogs(user.id);
  const runLogs = Store.getUserRunLogs(user.id);

  document.getElementById('history-stats').innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Total Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${calcStreak(user.id)}🔥</div><div class="stat-label">Day Streak</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.length}</div><div class="stat-label">Activities</div></div>
      <div class="stat-card"><div class="stat-val">${runLogs.reduce((a,r)=>a+(r.distance||0),0).toFixed(1)}</div><div class="stat-label">Total km</div></div>
    </div>`;

  _renderHistoryCalendar();
}

// ── WORKOUT ACHIEVEMENTS ─────────────────────────────────────────
const WORKOUT_ACHIEVEMENTS = [
  { id:'w_first',     emoji:'🌱', name:'First Workout',      desc:'Completed your very first workout',                  check: s => s.total >= 1 },
  { id:'w_10',        emoji:'💪', name:'10 Workouts',         desc:'Completed 10 total workout sessions',                check: s => s.total >= 10 },
  { id:'w_25',        emoji:'🔥', name:'25 Workouts',         desc:'Completed 25 total workout sessions',                check: s => s.total >= 25 },
  { id:'w_50',        emoji:'⭐', name:'50 Workouts',         desc:'Completed 50 total workout sessions',                check: s => s.total >= 50 },
  { id:'w_100',       emoji:'💯', name:'Century Club',        desc:'100 workout sessions — elite dedication',            check: s => s.total >= 100 },
  { id:'w_streak3',   emoji:'📅', name:'3-Day Streak',        desc:'Worked out 3 days in a row (any module)',            check: s => s.streak >= 3 },
  { id:'w_streak7',   emoji:'🗓️', name:'Week Warrior',        desc:'Worked out every day for a full week',               check: s => s.streak >= 7 },
  { id:'w_streak30',  emoji:'🌙', name:'Iron Discipline',     desc:'30-day workout streak — legendary!',                 check: s => s.streak >= 30 },
  { id:'w_allmod',    emoji:'🎯', name:'All-Rounder',         desc:'Trained in all 7 modules at least once',             check: s => s.uniqueMods >= 7 },
  { id:'w_yoga10',    emoji:'🧘', name:'Yoga Enthusiast',     desc:'Completed 10 yoga sessions',                        check: s => (s.modCounts.yoga||0) >= 10 },
  { id:'w_gym10',     emoji:'🏋️', name:'Gym Regular',         desc:'Completed 10 gym sessions',                         check: s => (s.modCounts.gym||0) >= 10 },
  { id:'w_cardio10',  emoji:'🏠', name:'Home Hero',           desc:'Completed 10 home cardio sessions',                  check: s => (s.modCounts.cardio||0) >= 10 },
  { id:'w_core10',    emoji:'🔥', name:'Core Crusher',        desc:'Completed 10 core & abs sessions',                   check: s => (s.modCounts.core||0) >= 10 },
  { id:'w_early',     emoji:'🌅', name:'Early Bird',          desc:'Logged a workout before 7 AM',                       check: s => s.hasEarlyWorkout },
  { id:'w_week_all',  emoji:'🏅', name:'Perfect Week',        desc:'Worked out 6+ days in a single week',                check: s => s.maxWeekDays >= 6 },
];

function _getWorkoutAchievements(userId) { return Store.get('ff_w_achievements_' + userId, {}); }
function _saveWorkoutAchievements(userId, data) {
  Store.set('ff_w_achievements_' + userId, data);
  sheetsPost('saveContent', { key: 'w_achievements_' + userId, value: data });
}

function _buildWorkoutStats(userId) {
  const logs = Store.getUserLogs(userId);
  const runLogs = Store.getUserRunLogs(userId);
  const allDates = [...new Set([...logs.map(l=>l.date), ...runLogs.map(r=>r.date)])].sort().reverse();

  const modCounts = {};
  logs.filter(l=>!l.module?.startsWith('custom_')).forEach(l => {
    modCounts[l.module] = (modCounts[l.module]||0)+1;
  });

  // Max days in any single week
  const weekMap = {};
  allDates.forEach(d => {
    const dt = new Date(d + 'T12:00:00');
    const mon = new Date(dt); mon.setDate(dt.getDate() - ((dt.getDay()+6)%7));
    const wk = mon.toISOString().split('T')[0];
    if (!weekMap[wk]) weekMap[wk] = new Set();
    weekMap[wk].add(d);
  });
  const maxWeekDays = Math.max(0, ...Object.values(weekMap).map(s => s.size));

  // Early workout (before 7am)
  const hasEarlyWorkout = logs.some(l => {
    const ts = l.timestamp || '';
    if (!ts) return false;
    return new Date(ts).getHours() < 7;
  });

  return {
    total:       logs.length,
    streak:      calcStreak(userId),
    uniqueMods:  Object.keys(modCounts).length,
    modCounts,
    maxWeekDays,
    hasEarlyWorkout,
  };
}

function checkAndUnlockWorkoutAchievements(userId) {
  const stats    = _buildWorkoutStats(userId);
  const unlocked = _getWorkoutAchievements(userId);
  const newOnes  = [];
  WORKOUT_ACHIEVEMENTS.forEach(a => {
    if (!unlocked[a.id] && a.check(stats)) {
      unlocked[a.id] = { unlockedAt: new Date().toISOString() };
      newOnes.push(a);
    }
  });
  if (newOnes.length) {
    _saveWorkoutAchievements(userId, unlocked);
    newOnes.forEach(a => {
      setTimeout(() => showToast(`🏅 Achievement unlocked: ${a.emoji} ${a.name}!`, 'success'), 600);
    });
  }
}

// ── CONFETTI ─────────────────────────────────────────────────────
function _launchConfetti() {
  const colors = ['#4caf50','#7ed9a0','#f5c542','#ff7043','#42a5f5','#ce93d8'];
  const count  = 60;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = 6 + Math.random() * 8;
    const x     = Math.random() * window.innerWidth;
    const delay = Math.random() * 0.6;
    const dur   = 1.2 + Math.random() * 0.8;
    el.style.cssText = `position:fixed;left:${x}px;top:-10px;width:${size}px;height:${size}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};background:${color};z-index:9999;
      pointer-events:none;animation:confettiFall ${dur}s ease-in ${delay}s forwards`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + 0.1) * 1000);
  }
  // Inject keyframes once
  if (!document.getElementById('confetti-style')) {
    const s = document.createElement('style');
    s.id = 'confetti-style';
    s.textContent = `@keyframes confettiFall {
      0%   { transform:translateY(0) rotate(0deg);  opacity:1; }
      100% { transform:translateY(${window.innerHeight + 20}px) rotate(${360+Math.random()*360}deg); opacity:0; }
    }`;
    document.head.appendChild(s);
  }
}

function getModuleEmoji(mod) { return { cardio: '🏠', gym: '🏋️', yoga: '🧘', stretching: '🙆', running: '🏃', calisthenics: '🤸‍♂️', core: '🔥' }[mod] || '💪'; }
function getModuleName(mod)  { return { cardio: 'Home Cardio', gym: 'Gym Workouts', yoga: 'Yoga', stretching: 'Stretching', running: 'Running', calisthenics: 'Calisthenics', core: 'Core & Abs' }[mod] || mod; }

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
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  Store.set('ff_body_profile_' + userId, updated);
  // Append to weight history if weight is present
  if (profile.weight) {
    const history = Store.get('ff_weight_history_' + userId, []);
    const today = new Date().toISOString().split('T')[0];
    // Update today's entry or append
    const todayIdx = history.findIndex(e => e.date === today);
    if (todayIdx >= 0) history[todayIdx].weight = profile.weight;
    else history.push({ date: today, weight: profile.weight });
    // Keep last 90 entries
    if (history.length > 90) history.splice(0, history.length - 90);
    Store.set('ff_weight_history_' + userId, history);
  }
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

    <!-- Workout Achievements -->
    <div class="section-title" style="margin-bottom:10px">Workout Achievements</div>
    ${(() => {
      const wUnlocked = _getWorkoutAchievements(user.id);
      const wUnlockedList = WORKOUT_ACHIEVEMENTS.filter(a => wUnlocked[a.id]);
      const wNext = WORKOUT_ACHIEVEMENTS.find(a => !wUnlocked[a.id]);
      if (!wUnlockedList.length) return `
        <div class="card card-sm" style="text-align:center;padding:16px;margin-bottom:16px">
          <div style="font-size:28px;margin-bottom:6px">🏅</div>
          <div style="font-size:13px;color:var(--text2)">Complete your first workout to earn badges!</div>
        </div>`;
      return `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:${wNext?'8':'16'}px">
          ${wUnlockedList.slice(-8).map(a => `
            <div title="${a.name} — ${a.desc}" style="text-align:center;background:rgba(46,125,70,0.1);border:1px solid rgba(46,125,70,0.3);border-radius:10px;padding:8px 4px">
              <div style="font-size:22px">${a.emoji}</div>
              <div style="font-size:9px;color:var(--text3);margin-top:3px;line-height:1.2">${a.name}</div>
            </div>`).join('')}
        </div>
        ${wNext ? `<div style="font-size:12px;color:var(--text3);margin-bottom:16px">Next: ${wNext.emoji} ${wNext.name} — ${wNext.desc}</div>` : ''}`;
    })()}

    <!-- Weight History Chart -->
    ${(() => {
      const wh = Store.get('ff_weight_history_' + user.id, []);
      if (wh.length < 2) return '';
      const recent = wh.slice(-12);
      const minW = Math.min(...recent.map(e=>e.weight)) - 2;
      const maxW = Math.max(...recent.map(e=>e.weight)) + 2;
      const range = maxW - minW || 1;
      const bars = recent.map((e, i) => {
        const pct = ((e.weight - minW) / range) * 100;
        const h   = 20 + (pct / 100) * 44;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px" title="${e.date}: ${e.weight}kg">
          <div style="font-size:9px;color:var(--text3)">${e.weight}</div>
          <div style="width:100%;height:${h}px;background:var(--g3);border-radius:3px 3px 0 0;min-height:4px"></div>
          <div style="font-size:8px;color:var(--text3)">${e.date.slice(5)}</div>
        </div>`;
      }).join('');
      const trend = recent[recent.length-1].weight - recent[0].weight;
      const trendStr = trend > 0 ? `+${trend.toFixed(1)}kg` : trend < 0 ? `${trend.toFixed(1)}kg` : 'stable';
      const trendColor = trend < 0 ? 'var(--g5)' : trend > 0 ? '#ef9a9a' : 'var(--text3)';
      return `
        <div class="section-title" style="margin-bottom:10px">Weight Trend</div>
        <div class="card card-sm" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;color:var(--text2)">Last ${recent.length} entries</div>
            <div style="font-size:13px;font-weight:700;color:${trendColor}">${trendStr}</div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:3px;height:80px">${bars}</div>
        </div>`;
    })()}

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
      <div id="weight-chart-container" style="margin-bottom:12px"></div>
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
  // Render weight chart after DOM is ready
  const wChart = document.getElementById('weight-chart-container');
  if (wChart) _renderWeightChart(user.id, wChart);
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

// ── WEIGHT HISTORY TRACKING ──────────────────────────────────────
function _logWeightEntry(userId, weightKg) {
  const key  = 'ff_weight_log_' + userId;
  const log  = Store.get(key, []);
  const today = todayStr();
  const todayIdx = log.findIndex(e => e.date === today);
  if (todayIdx >= 0) log[todayIdx].weight = weightKg;
  else log.push({ date: today, weight: weightKg });
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const cutStr = cutoff.toISOString().split('T')[0];
  const trimmed = log.filter(e => e.date >= cutStr);
  Store.set(key, trimmed);
  // Sync weight history to Sheets
  sheetsPost('saveContent', { key: 'weight_log_' + userId, value: trimmed });
}

function _renderWeightChart(userId, container) {
  const log = Store.get('ff_weight_log_' + userId, []).sort((a,b)=>a.date.localeCompare(b.date));
  if (log.length < 2) { container.innerHTML = ''; return; }
  const weights = log.map(e => e.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;
  const W = 280, H = 80;
  const pts = weights.map((w, i) => {
    const x = Math.round(i / (weights.length - 1) * (W - 20) + 10);
    const y = Math.round(H - 10 - ((w - minW) / range) * (H - 20));
    return `${x},${y}`;
  }).join(' ');
  const first = log[0], last = log[log.length-1];
  const diff  = last.weight - first.weight;
  const trend = diff < -0.4 ? `↓ ${Math.abs(diff).toFixed(1)}kg` : diff > 0.4 ? `↑ ${diff.toFixed(1)}kg` : '→ Stable';
  const trendColor = diff < -0.4 ? 'var(--g5)' : diff > 0.4 ? '#ef9a9a' : 'var(--text3)';
  container.innerHTML = `
    <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Weight History</div>
      <div style="font-size:12px;color:${trendColor};font-weight:700">${trend} <span style="color:var(--text3);font-weight:400">(${log.length} entries)</span></div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
      <polyline points="${pts}" fill="none" stroke="var(--g4)" stroke-width="2" stroke-linejoin="round"/>
      ${weights.map((w,i)=>{
        const x=Math.round(i/(weights.length-1)*(W-20)+10);
        const y=Math.round(H-10-((w-minW)/range)*(H-20));
        return `<circle cx="${x}" cy="${y}" r="3" fill="var(--g4)"/>`;
      }).join('')}
      <text x="6" y="${H-4}" fill="var(--text3)" font-size="9">${minW.toFixed(1)}</text>
      <text x="6" y="12" fill="var(--text3)" font-size="9">${maxW.toFixed(1)}</text>
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:2px">
      <span>${first.date}</span><span>${last.date}</span>
    </div>`;
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

  const bodyData = { age, weight, height, gender, fitnessLevel };
  saveBodyProfile(user.id, bodyData);
  // Sync body stats to Sheets so it survives cache clear / reinstall
  sheetsPost('saveContent', { key: 'body_profile_' + user.id, value: bodyData });
  // Log weight entry for chart history
  if (weight) _logWeightEntry(user.id, weight);
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
  setTimeout(() => checkAndUnlockWorkoutAchievements(user.id), 800);
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
  sheetsPost('saveContent', { key: 'cali_skill_' + user.id + '_' + skillKey, value: progress });
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
  sheetsPost('saveContent', { key: 'cali_challenge_' + user.id, value: progress });
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
