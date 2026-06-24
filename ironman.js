// ════════════════════════════════════════════════════════════════
// HALF IRONMAN 70.3 — ironman.js
//
// 24-week triathlon training module:  2km Swim · 90km Bike · 21.1km Run
//
// Pages used:
//   page-ironman         → main module (tabs: Plan · Progress · Nutrition)
//   page-im-day          → day detail (exercises, targets, complete button)
//
// LocalStorage keys:
//   ff_im_plan_<uid>                      → { startDate, startedAt }
//   ff_imday_<uid>_w<week>_<DayName>      → { date, timestamp, week, day, … }
//   sess_<uid>_ironman_w<w>_<day>         → set checkbox state
// ════════════════════════════════════════════════════════════════

// ── ENTRY POINT ──────────────────────────────────────────────────
function initIronManPage() {
  APP.currentModule = 'ironman';
  renderIronManPage();
}

// ── STORAGE KEY HELPERS ──────────────────────────────────────────
function _imPlanKey(uid)               { return 'ff_im_plan_'  + uid; }
function _imDayKey(uid, week, day)     { return 'ff_imday_'    + uid + '_w' + week + '_' + day; }
function _imSessionKey(uid, week, day) { return 'sess_'        + uid + '_ironman_w' + week + '_' + day; }

// ── PLAN REGISTRATION ─────────────────────────────────────────────
function getImPlan() {
  var u = APP.currentUser;
  return u ? Store.get(_imPlanKey(u.id)) : null;
}

function registerImPlan() {
  var u = APP.currentUser;
  if (!u) return;
  var startDate    = todayStr();
  var registeredAt = new Date().toISOString();
  Store.set(_imPlanKey(u.id), { startDate: startDate, startedAt: Date.now() });
  try {
    Sheets.post('savePlanRegistration', {
      userId:       u.id,
      email:        u.email,
      planKey:      'ironman',
      startDate:    startDate,
      registeredAt: registeredAt,
    });
  } catch(e) {}
  showToast('🏅 24-Week Half Ironman Plan started! Let\'s go!', 'success');
  renderIronManPage();
}

function clearImPlan() {
  var u = APP.currentUser;
  if (!u) return;
  Store.remove(_imPlanKey(u.id));
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('ff_imday_' + u.id + '_') ||
          k.startsWith('sess_' + u.id + '_ironman_')) {
        localStorage.removeItem(k);
      }
    });
  } catch(e) {}
  try {
    Sheets.post('clearActivePlan', { userId: u.id, planKey: 'ironman' });
  } catch(e) {}
  showToast('Plan reset. Restart whenever you\'re ready.', 'info');
  renderIronManPage();
}

function confirmClearImPlan() {
  showConfirm(
    'Reset 24-Week Plan?',
    'Your dated workout history stays in global History, but the plan grid will reset to Week 1.',
    'Reset Plan',
    'Keep Plan',
    function() { clearImPlan(); },
    null,
    'danger'
  );
}

// ── WEEK CALCULATOR ───────────────────────────────────────────────
function getImCurrentWeek() {
  var plan = getImPlan();
  if (!plan || !plan.startDate) return 0;
  var startStr = plan.startDate;
  if (typeof _normalizeDate === 'function') {
    var norm = _normalizeDate(startStr);
    if (norm) startStr = norm;
  }
  var start = new Date(startStr + 'T00:00:00');
  if (isNaN(start.getTime())) return 0;
  var diffDays = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(24, Math.floor(diffDays / 7) + 1));
}

// ── PHASE LOOKUP ──────────────────────────────────────────────────
function _imGetPhase(week) {
  var mod = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  if (!mod || !mod.phases) return null;
  for (var i = 0; i < mod.phases.length; i++) {
    if (mod.phases[i].weeks.indexOf(week) !== -1) return mod.phases[i];
  }
  return null;
}

// ── DAY TYPE FROM DAY NAME ────────────────────────────────────────
function _imGetSessionType(dayName) {
  var mod = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  return (mod && mod.schedule && mod.schedule[dayName]) || 'rest';
}

// ── DAY COMPLETION HELPERS ────────────────────────────────────────
function isImDayDone(week, day) {
  var u = APP.currentUser;
  if (!u) return false;
  return !!Store.get(_imDayKey(u.id, week, day));
}

// ── MAIN PAGE RENDER ──────────────────────────────────────────────
function renderIronManPage() {
  var container = document.getElementById('im-page-content');
  if (!container) return;

  var plan = getImPlan();
  if (!plan) {
    container.innerHTML = _imRenderIntro();
    return;
  }

  var tabs = [
    { id: 'plan',      label: '🗓 Plan' },
    { id: 'progress',  label: '📊 Progress' },
    { id: 'nutrition', label: '🥗 Nutrition' },
  ];
  var currentTab = (APP._imTab && tabs.some(function(t) { return t.id === APP._imTab; }))
    ? APP._imTab : 'plan';
  APP._imTab = currentTab;

  container.innerHTML =
    '<div class="tab-strip" style="padding:12px 16px 4px">' +
      tabs.map(function(t) {
        return '<button class="tab-btn im-tab-btn ' + (currentTab === t.id ? 'active' : '') + '" ' +
          'data-tab="' + t.id + '" onclick="switchImTab(\'' + t.id + '\',this)">' + t.label + '</button>';
      }).join('') +
    '</div>' +
    tabs.map(function(t) {
      return '<div id="im-tab-' + t.id + '" class="run-tab-content ' + (currentTab === t.id ? 'active' : '') + '">' +
        '<div id="im-' + t.id + '-content"></div></div>';
    }).join('');

  if (currentTab === 'plan')      renderImPlanOverview();
  if (currentTab === 'progress')  renderImProgress();
  if (currentTab === 'nutrition') renderImNutrition();
}

function switchImTab(tab, btn) {
  APP._imTab = tab;
  document.querySelectorAll('.im-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('[id^="im-tab-"]').forEach(function(el) { el.classList.remove('active'); });
  var tabEl = document.getElementById('im-tab-' + tab);
  if (tabEl) tabEl.classList.add('active');
  if (tab === 'plan')      renderImPlanOverview();
  if (tab === 'progress')  renderImProgress();
  if (tab === 'nutrition') renderImNutrition();
}

// ── INTRO SCREEN ──────────────────────────────────────────────────
function _imRenderIntro() {
  return '<div style="padding:24px 20px">' +
    '<div style="text-align:center;margin-bottom:28px">' +
      '<div style="font-size:64px;margin-bottom:12px">🏅</div>' +
      '<div class="display" style="font-size:28px;color:var(--im-accent);line-height:1.1;margin-bottom:8px">Half Iron Man 70.3</div>' +
      '<div style="font-size:15px;font-weight:600;color:var(--text2);margin-bottom:6px">2 km Swim · 90 km Bike · 21.1 km Run</div>' +
      '<div style="font-size:13px;color:var(--text3);line-height:1.6">24 weeks · 7 sessions/week · Built for first-timers</div>' +
    '</div>' +

    '<div class="card im-card" style="margin-bottom:12px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Your Weekly Schedule</div>' +
      '<div style="font-size:13px;color:var(--text2);line-height:1.9">' +
        '<strong style="color:var(--text)">Mon</strong> — 🏋️ Strength A (Upper body + Core)<br>' +
        '<strong style="color:var(--text)">Tue</strong> — 🏊 Swim + Easy Run<br>' +
        '<strong style="color:var(--text)">Wed</strong> — 🚴 Endurance Bike + Mobility<br>' +
        '<strong style="color:var(--text)">Thu</strong> — 🦵 Strength B + Run Intervals<br>' +
        '<strong style="color:var(--text)">Fri</strong> — 🌊 Swim Focus<br>' +
        '<strong style="color:var(--text)">Sat</strong> — 🔥 Brick: Long Bike → Run<br>' +
        '<strong style="color:var(--text)">Sun</strong> — 🏃 Long Run + Full Mobility' +
      '</div>' +
    '</div>' +

    '<div class="card im-card" style="margin-bottom:12px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">4 Phases</div>' +
      '<div style="font-size:13px;color:var(--text2);line-height:1.8">' +
        '<strong style="color:var(--text)">🌱 Base</strong> (wk 1–6) — Foundation aerobic fitness<br>' +
        '<strong style="color:var(--text)">💪 Build</strong> (wk 7–14) — Volume + brick workouts<br>' +
        '<strong style="color:var(--text)">🔥 Peak</strong> (wk 15–20) — Highest volume · Race pace<br>' +
        '<strong style="color:var(--text)">🎯 Taper</strong> (wk 21–24) — Rest · Arrive fresh' +
      '</div>' +
    '</div>' +

    '<div class="card im-card" style="margin-bottom:20px;background:rgba(30,120,180,0.08);border-color:rgba(30,120,180,0.3)">' +
      '<div style="font-size:13px;color:var(--text2);line-height:1.6">' +
        '<strong style="color:var(--im-accent)">💡 What you\'ll need:</strong> Access to a pool, a bicycle, and a running route. Strength sessions can be done at home (bodyweight) or at a gym. Most exercises have upgrade variants for when you have equipment.' +
      '</div>' +
    '</div>' +

    '<button class="btn btn-full btn-lg" onclick="registerImPlan()" ' +
      'style="background:var(--im-accent);color:#fff;margin-bottom:12px;font-weight:700">🚀 Start the 24-Week Plan</button>' +
    '<div style="text-align:center;font-size:12px;color:var(--text3)">You can reset and restart any time</div>' +
  '</div>';
}

// ── PLAN OVERVIEW TAB ─────────────────────────────────────────────
function renderImPlanOverview() {
  var container = document.getElementById('im-plan-content');
  if (!container) return;
  var mod = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  if (!mod) return;
  var currentWeek = getImCurrentWeek();
  var currentDay  = dayName();
  var plan        = getImPlan();
  var phase       = _imGetPhase(currentWeek);
  var wt          = mod.weekTargets && mod.weekTargets[currentWeek];

  var startDisplay = '—';
  if (plan && plan.startDate) {
    var norm = (typeof _normalizeDate === 'function') ? _normalizeDate(plan.startDate) : plan.startDate;
    var d = new Date((norm || plan.startDate) + 'T00:00:00');
    startDisplay = isNaN(d.getTime())
      ? plan.startDate
      : d.toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  }

  var DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  var html = '<div style="padding:0 16px 24px">';

  // ── Current week status card ──
  html += '<div class="card im-card" style="margin-bottom:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em">' +
        (phase ? phase.label : 'Phase') + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">Week ' + currentWeek + ' of 24</div>' +
    '</div>' +
    '<div style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:10px">' + (phase ? phase.focus : '') + '</div>';

  if (wt) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px">' +
      _imTargetPill('🏊', 'Swim', wt.swim + ' m') +
      _imTargetPill('🚴', 'Bike', wt.bike + ' km') +
      _imTargetPill('🏃', 'Run', wt.run + ' km') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
      _imTargetPill('🔥', 'Brick Bike', wt.brickBike + ' km') +
      _imTargetPill('⚡', 'Brick Run', wt.brickRun + ' km') +
    '</div>';
  }

  if (phase && phase.strengthNote) {
    html += '<div style="font-size:11px;color:var(--text3);margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">💪 ' + phase.strengthNote + '</div>';
  }

  html += '<div style="font-size:11px;color:var(--text3);margin-top:6px">Started ' + startDisplay + ' · Tap any day to open the session</div></div>';

  // ── Legend ──
  html += '<div class="card im-card" style="margin-bottom:14px;padding:12px 14px">' +
    '<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Session Types</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--text2);line-height:1.5">' +
      '<div>🏋️ Strength A</div><div>🏊 Swim + Run</div>' +
      '<div>🚴 Endurance Bike</div><div>🦵 Strength B</div>' +
      '<div>🌊 Swim Focus</div><div>🔥 Brick Workout</div>' +
      '<div style="grid-column:span 2">🏃 Long Run + Mobility</div>' +
    '</div>' +
  '</div>';

  // ── Phase + week grids ──
  mod.phases.forEach(function(phaseDef) {
    html += '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;' +
      'letter-spacing:.08em;margin:18px 0 10px">' + phaseDef.name + ' — Weeks ' +
      phaseDef.weeks[0] + '–' + phaseDef.weeks[phaseDef.weeks.length - 1] + '</div>';

    phaseDef.weeks.forEach(function(week) {
      var isCurrent = week === currentWeek;
      var isPast    = week < currentWeek;
      var stateCol  = isPast ? 'var(--text3)' : isCurrent ? 'var(--im-accent)' : 'var(--text3)';
      var stateLbl  = isPast ? 'done' : isCurrent ? 'now' : 'upcoming';
      var weekWt    = mod.weekTargets && mod.weekTargets[week];

      html += '<div class="card" style="margin-bottom:10px;padding:12px 14px;' +
        'border-color:' + (isCurrent ? 'var(--im-accent)' : 'var(--border)') + ';' +
        'background:' + (isCurrent ? 'rgba(30,120,180,0.1)' : 'var(--surface)') + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<div style="font-size:13px;font-weight:700;color:' + (isCurrent ? 'var(--im-accent)' : 'var(--text)') + '">' +
            'Week ' + week + (isCurrent ? ' <span style="font-size:10px;font-weight:400">· current</span>' : '') +
          '</div>' +
          '<div style="font-size:10px;color:' + stateCol + '">' + stateLbl + '</div>' +
        '</div>';

      if (weekWt) {
        html += '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;font-size:11px;color:var(--text3)">' +
          '<span>🏊 ' + weekWt.swim + 'm</span>' +
          '<span>🚴 ' + weekWt.bike + 'km</span>' +
          '<span>🏃 ' + weekWt.run + 'km</span>' +
          '<span>🔥 ' + weekWt.brickBike + '+' + weekWt.brickRun + 'km</span>' +
        '</div>';
      }

      // 7-day grid
      html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">';
      DAY_ORDER.forEach(function(d) {
        var sessionType = _imGetSessionType(d);
        var sessLabel   = mod.sessionLabels && mod.sessionLabels[sessionType];
        var isRest      = sessionType === 'rest';
        var isToday     = isCurrent && d === currentDay;
        var done        = !isRest && isImDayDone(week, d);

        var bg, border, color;
        if (isRest) {
          bg = 'var(--bg3)'; border = 'none'; color = 'var(--text3)';
        } else if (done) {
          bg = 'rgba(30,120,180,0.35)'; border = '1px solid rgba(30,120,180,0.55)'; color = 'var(--text)';
        } else if (isToday) {
          bg = 'rgba(240,192,64,0.18)'; border = '2px solid var(--accent)'; color = 'var(--text)';
        } else {
          bg = 'var(--surface2)'; border = '1px solid var(--border)'; color = 'var(--text)';
        }

        var handler = !isRest ? 'openImDayDetail(' + week + ',\'' + d + '\')' : '';
        html += '<div onclick="' + handler + '" style="aspect-ratio:1;border-radius:10px;background:' + bg + ';border:' + border + ';' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;' +
          'cursor:' + (isRest ? 'default' : 'pointer') + ';color:' + color + ';position:relative">' +
          '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:0.7">' + d.slice(0,3) + '</div>' +
          '<div style="font-size:16px;line-height:1">' + (sessLabel ? sessLabel.emoji : '·') + '</div>' +
          (done ? '<div style="font-size:9px;color:var(--im-accent);font-weight:700;line-height:1">✓</div>' : '') +
          (isToday && !done ? '<div style="position:absolute;top:-6px;right:-4px;background:var(--accent);color:#000;font-size:8px;font-weight:800;padding:1px 5px;border-radius:8px">TODAY</div>' : '') +
        '</div>';
      });

      html += '</div></div>';
    });
  });

  // ── Reset button ──
  html += '<div style="text-align:center;margin-top:24px">' +
    '<button onclick="confirmClearImPlan()" class="btn btn-outline btn-sm">🔄 Reset Plan</button>' +
  '</div>';

  html += '</div>';
  container.innerHTML = html;
}

function _imTargetPill(emoji, label, value) {
  return '<div style="background:rgba(30,120,180,0.12);border-radius:8px;padding:8px;text-align:center">' +
    '<div style="font-size:15px">' + emoji + '</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-top:2px">' + label + '</div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--im-accent)">' + value + '</div>' +
  '</div>';
}

// ── DAY DETAIL PAGE ───────────────────────────────────────────────
function openImDayDetail(week, day) {
  var sessionType = _imGetSessionType(day);
  if (sessionType === 'rest') return;
  APP._imViewWeek = week;
  APP._imViewDay  = day;
  showPage('page-im-day');
  _renderImDayPage();
}

function _renderImDayPage() {
  var container = document.getElementById('im-day-content');
  if (!container) return;
  var week = APP._imViewWeek;
  var day  = APP._imViewDay;
  if (!week || !day) {
    container.innerHTML = '<div style="padding:24px;color:var(--text3);text-align:center">No session selected.</div>';
    return;
  }

  var mod         = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  var phase       = _imGetPhase(week);
  var sessionType = _imGetSessionType(day);
  var sessLabel   = mod && mod.sessionLabels && mod.sessionLabels[sessionType];
  var wt          = mod && mod.weekTargets && mod.weekTargets[week];
  var done        = isImDayDone(week, day);

  var html = '<div style="padding:0 16px 32px">' +

    // Header
    '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">' +
      '<span style="font-size:44px;line-height:1">' + (sessLabel ? sessLabel.emoji : '💪') + '</span>' +
      '<div style="flex:1">' +
        '<div style="font-size:11px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em">' +
          (phase ? phase.name : '') + ' · Week ' + week + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:var(--text);line-height:1.2">' + day + '</div>' +
        '<div style="font-size:13px;color:var(--text2);margin-top:2px">' + (sessLabel ? sessLabel.name : '') + '</div>' +
        '<div style="font-size:12px;color:var(--text3)">' + (sessLabel ? sessLabel.desc : '') + '</div>' +
      '</div>' +
      (done ? '<span class="badge" style="background:var(--im-accent);color:#fff">✓ Done</span>' : '') +
    '</div>';

  // Week targets for this session
  if (wt) {
    html += '<div class="card im-card" style="margin-bottom:14px;padding:12px">' +
      '<div style="font-size:11px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">This Week\'s Targets</div>';

    if (sessionType === 'strength_a' || sessionType === 'strength_b') {
      html += '<div style="font-size:13px;color:var(--text2)">' + (phase ? phase.strengthNote : 'Follow the exercises below.') + '</div>';
    } else if (sessionType === 'swim_run') {
      html += '<div style="display:flex;gap:10px">' +
        _imTargetPill('🏊', 'Swim', wt.swim + ' m') +
        _imTargetPill('🏃', 'Easy Run', '4–6 km') +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">Swim first. Rest 30 min. Then easy run at Zone 2 pace.</div>';
    } else if (sessionType === 'bike') {
      html += _imTargetPill('🚴', 'Ride Distance', wt.bike + ' km');
      html += '<div style="font-size:11px;color:var(--text3);margin-top:8px">Endurance pace (Zone 2–3). Last 10 min spin easy at 90+ rpm.</div>';
    } else if (sessionType === 'swim') {
      html += _imTargetPill('🌊', 'Swim Distance', wt.swim + ' m') +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">Race-pace sets from Phase 2. Sighting drills from Phase 2. Include 4×100 m fast in Phase 2+.</div>';
    } else if (sessionType === 'brick') {
      html += '<div style="display:flex;gap:8px">' +
        _imTargetPill('🚴', 'Bike', wt.brickBike + ' km') +
        _imTargetPill('⚡', 'T2', '< 3 min') +
        _imTargetPill('🏃', 'Run', wt.brickRun + ' km') +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">Start the run 60 sec/km slower than goal race pace. The dead-leg feeling passes at ~1 km.</div>';
    } else if (sessionType === 'long_run') {
      html += _imTargetPill('🏃', 'Long Run', wt.run + ' km') +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px">Zone 2 throughout. Last 2 km at race pace from Week 8+. Full mobility session after.</div>';
    }

    html += '</div>';
  }

  // Exercises
  html += '<div id="im-day-exercises" style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px"></div>';

  // Complete button
  html += '<button id="im-day-complete-btn" class="btn btn-full" ' +
    'onclick="completeImDay(' + week + ',\'' + day + '\')" ' +
    'style="background:var(--im-accent);color:#fff;font-weight:700;margin-bottom:14px">' +
    '🎉 Complete Session</button>';

  html += '<div style="text-align:center">' +
    '<button onclick="goBack()" style="background:none;border:none;color:var(--text3);font-size:12px;text-decoration:underline;cursor:pointer">← Back to plan</button>' +
  '</div></div>';

  container.innerHTML = html;

  _imRenderDayExercises(week, day, sessionType);
  _imUpdateCompleteBtn(week, day);
}

// ── RENDER EXERCISES FOR A DAY ────────────────────────────────────
function _imRenderDayExercises(week, day, sessionType) {
  var container = document.getElementById('im-day-exercises');
  if (!container) return;
  var mod  = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  var user = APP.currentUser;
  if (!mod || !user) return;

  var sessionKey  = _imSessionKey(user.id, week, day);
  var sessionData = Store.get(sessionKey, {});

  // Pick the exercise list based on session type
  var warmupKey, cooldownKey, mainExercises;
  if (sessionType === 'strength_a') {
    warmupKey    = 'ironman_strength';
    cooldownKey  = 'ironman_strength';
    mainExercises = mod.strength_a || [];
  } else if (sessionType === 'strength_b') {
    warmupKey    = 'ironman_strength';
    cooldownKey  = 'ironman_strength';
    mainExercises = mod.strength_b || [];
  } else if (sessionType === 'swim_run' || sessionType === 'swim') {
    warmupKey    = 'ironman_swim';
    cooldownKey  = 'ironman_run';
    mainExercises = mod.swim_drills || [];
  } else if (sessionType === 'bike') {
    warmupKey    = 'ironman_bike';
    cooldownKey  = 'ironman_bike';
    mainExercises = [];
    // Bike session: just warm-up + target card + cool-down + mobility
  } else if (sessionType === 'brick') {
    warmupKey    = 'ironman_bike';
    cooldownKey  = 'ironman_run';
    mainExercises = mod.brick_structure || [];
  } else if (sessionType === 'long_run') {
    warmupKey    = 'ironman_run';
    cooldownKey  = 'ironman_run';
    mainExercises = mod.long_run_structure || [];
  } else {
    mainExercises = [];
  }

  // Determine mobility for this session type
  var mobilityExercises = [];
  if (sessionType === 'swim_run' || sessionType === 'swim') {
    mobilityExercises = (mod.mobility && mod.mobility.swim) || [];
  } else if (sessionType === 'bike' || sessionType === 'brick') {
    mobilityExercises = (mod.mobility && mod.mobility.bike) || [];
  } else if (sessionType === 'strength_b' || sessionType === 'long_run') {
    mobilityExercises = (mod.mobility && mod.mobility.run) || [];
  } else if (sessionType === 'strength_a') {
    mobilityExercises = (mod.mobility && mod.mobility.swim) || [];
  }

  if (sessionType === 'long_run') {
    mobilityExercises = (mod.mobility && mod.mobility.full) || [];
  }

  var warmups   = (window.APP_DATA.warmups   && window.APP_DATA.warmups[warmupKey])   || [];
  var cooldowns = (window.APP_DATA.cooldowns && window.APP_DATA.cooldowns[cooldownKey]) || [];

  var all = [];
  warmups.forEach(function(e)         { all.push(Object.assign({}, e, { _section: 'warmup'   })); });
  mainExercises.forEach(function(e)   { all.push(Object.assign({}, e, { _section: 'main'     })); });
  if (mobilityExercises.length) {
    mobilityExercises.forEach(function(e) { all.push(Object.assign({}, e, { _section: 'mobility' })); });
  }
  cooldowns.forEach(function(e)       { all.push(Object.assign({}, e, { _section: 'cooldown' })); });

  function sectionHeader(label, bg) {
    return '<div style="display:flex;align-items:center;gap:8px;margin:10px 0 8px;padding:8px 12px;border-radius:10px;background:' + bg + '">' +
      '<span style="font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em">' + label + '</span></div>';
  }

  var prevSec = '';
  container.innerHTML = all.map(function(ex, i) {
    var hdr = '';
    if (ex._section !== prevSec) {
      prevSec = ex._section;
      if (ex._section === 'warmup')   hdr = sectionHeader('🔥 Warm-Up',  'rgba(30,136,229,0.32)');
      if (ex._section === 'main')     hdr = sectionHeader('💪 Session',   'rgba(30,120,180,0.35)');
      if (ex._section === 'mobility') hdr = sectionHeader('🧘 Mobility',  'rgba(103,58,183,0.35)');
      if (ex._section === 'cooldown') hdr = sectionHeader('❄️ Cool-Down', 'rgba(20,100,60,0.35)');
    }

    var checked = sessionData[i] || [];
    var total   = parseInt(ex.sets) || 1;
    var allDone = checked.length >= total;

    // For brick transition/structure cards with type field — special display
    var isBrickCard = ex.type === 'transition' || ex.type === 'bike' || ex.type === 'run';

    var checksHtml = Array.from({ length: total }, function(_, s) {
      var isDone = checked.indexOf(s) !== -1;
      return '<div class="set-check ' + (isDone ? 'checked' : '') + '" onclick="toggleImSet(' + week + ',\'' + day + '\',' + i + ',' + s + ')">' +
        '<div class="check-box">' + (isDone ? '✓' : '') + '</div>' +
        '<span class="check-label">Set ' + (s + 1) + ' — ' + (ex.reps || '') + '</span>' +
      '</div>';
    }).join('');

    var upgrade    = ex.upgrade;
    var upgradeHtml = upgrade ? (
      '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(30,120,180,0.08);border:1px dashed rgba(30,120,180,0.4)">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' +
          '<span style="font-size:10px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.06em">⬆ Optional Upgrade</span>' +
          '<span style="font-size:10px;color:var(--text3)">' + (upgrade.equipment || '') + '</span>' +
        '</div>' +
        '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">' + upgrade.name + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:6px">🎯 ' + (upgrade.reps || '') + '</div>' +
        (upgrade.desc ? '<div style="font-size:12px;color:var(--text2);line-height:1.55;margin-bottom:6px">' + upgrade.desc + '</div>' : '') +
        (upgrade.demo ? '<a href="' + upgrade.demo + '" target="_blank" rel="noopener" class="demo-link" style="font-size:11px">▶ Watch upgrade demo</a>' : '') +
      '</div>'
    ) : '';

    var brickBadge = ex.type === 'transition'
      ? '<div style="display:inline-block;background:rgba(240,192,64,0.25);border:1px solid var(--accent);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">⚡ TRANSITION</div>'
      : ex.type === 'bike'
      ? '<div style="display:inline-block;background:rgba(30,120,180,0.2);border:1px solid var(--im-accent);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--im-accent);margin-bottom:6px">🚴 BIKE SEGMENT</div>'
      : ex.type === 'run'
      ? '<div style="display:inline-block;background:rgba(67,160,90,0.2);border:1px solid var(--g4);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;color:var(--g5);margin-bottom:6px">🏃 RUN SEGMENT</div>'
      : '';

    return hdr +
      '<div class="exercise-card ' + (allDone ? 'completed' : '') + '">' +
        '<div class="exercise-body">' +
          brickBadge +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">' +
            '<div class="exercise-name" style="font-size:15px">' + (i + 1) + '. ' + ex.name + '</div>' +
            (allDone ? '<span class="badge badge-green">✓</span>' : '') +
          '</div>' +
          '<div class="exercise-meta"><span>🔄 ' + (ex.sets || 1) + ' sets</span><span>💪 ' + (ex.reps || '') + '</span></div>' +
          '<div class="exercise-desc">' + (ex.desc || '') + '</div>' +
          (ex.demo ? '<a href="' + ex.demo + '" target="_blank" rel="noopener" class="demo-link">▶ Watch Demo</a>' : '') +
          '<div class="sets-grid">' + checksHtml + '</div>' +
          upgradeHtml +
        '</div>' +
      '</div>';
  }).join('');
}

function toggleImSet(week, day, exIdx, setIdx) {
  var user        = APP.currentUser;
  var sessionKey  = _imSessionKey(user.id, week, day);
  var sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  var pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  var sessionType = _imGetSessionType(day);
  _imRenderDayExercises(week, day, sessionType);
  _imUpdateCompleteBtn(week, day);
}

function _imUpdateCompleteBtn(week, day) {
  var btn = document.getElementById('im-day-complete-btn');
  if (!btn) return;
  if (isImDayDone(week, day)) {
    btn.textContent = '✓ Session Complete!';
    btn.style.background = 'var(--surface2)';
    btn.style.color = 'var(--text3)';
    btn.disabled = true;
  } else {
    btn.textContent = '🎉 Complete Session';
    btn.style.background = 'var(--im-accent)';
    btn.style.color = '#fff';
    btn.disabled = false;
  }
}

// ── COMPLETE A SESSION ────────────────────────────────────────────
function completeImDay(week, day) {
  var user = APP.currentUser;
  if (!user) return;
  if (isImDayDone(week, day)) { showToast('Already logged for this session.', 'info'); return; }

  var phase       = _imGetPhase(week);
  var sessionType = _imGetSessionType(day);
  var today       = todayStr();

  // 1. Global ff_logs (picked up by global History)
  Store.addLog({
    userId:      user.id,
    module:      'ironman',
    day:         day,
    date:        today,
    timestamp:   new Date().toISOString(),
    week:        week,
    phase:       phase ? phase.id : '',
    sessionType: sessionType,
  });

  // 2. Per-week-day completion flag (drives plan grid green checks)
  Store.set(_imDayKey(user.id, week, day), {
    date:        today,
    timestamp:   new Date().toISOString(),
    week:        week,
    day:         day,
    sessionType: sessionType,
    phase:       phase ? phase.id : '',
  });

  // 3. Sheets sync (fire & forget)
  try {
    sheetsPost('logCompletion', {
      userId:      user.id,
      email:       user.email,
      module:      'ironman',
      day:         day,
      date:        today,
      week:        week,
      phase:       phase ? phase.id : '',
      sessionType: sessionType,
    });
  } catch(e) {}
  try {
    sheetsPost('savePlanDayCompletion', {
      userId:        user.id,
      planKey:       'ironman',
      week:          week,
      day:           ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(day) + 1,
      completedDate: today,
      distanceKm:    0,
      durationSec:   0,
    });
  } catch(e) {}

  var sessionLabel = (window.APP_DATA && window.APP_DATA.modules &&
    window.APP_DATA.modules.ironman && window.APP_DATA.modules.ironman.sessionLabels &&
    window.APP_DATA.modules.ironman.sessionLabels[sessionType]);
  var label = sessionLabel ? sessionLabel.emoji + ' ' + sessionLabel.name : day;

  showToast('🎉 Week ' + week + ' ' + label + ' done! 🏅', 'success');

  setTimeout(function() {
    if (typeof checkAndUnlockWorkoutAchievements === 'function') {
      checkAndUnlockWorkoutAchievements(user.id);
    }
  }, 800);

  _imUpdateCompleteBtn(week, day);
}

// ── PROGRESS TAB ──────────────────────────────────────────────────
function renderImProgress() {
  var container = document.getElementById('im-progress-content');
  if (!container) return;
  var user = APP.currentUser;
  var logs = Store.getModuleDayLogs(user.id, 'ironman');
  var currentWeek       = getImCurrentWeek();
  var totalTarget       = 24 * 7;  // 24 weeks × 7 sessions (some are rest but we track completions)
  var completed         = logs.length;
  var pct               = Math.min(100, Math.round((completed / (24 * 6)) * 100)); // 24 weeks × ~6 active sessions

  var mod = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  var plan = getImPlan();
  var startStrRaw = (plan && plan.startDate) ? plan.startDate : todayStr();
  var startStr = (typeof _normalizeDate === 'function') ? (_normalizeDate(startStrRaw) || startStrRaw) : startStrRaw;

  // Phase stats
  var phaseStats = (mod && mod.phases) ? mod.phases.map(function(p) {
    var startTs  = new Date(startStr + 'T00:00:00').getTime();
    var lo = p.weeks[0], hi = p.weeks[p.weeks.length - 1];
    var phaseStart = startTs + (lo - 1) * 7 * 24 * 3600 * 1000;
    var phaseEnd   = startTs + (hi)     * 7 * 24 * 3600 * 1000;
    var phaseLogs  = logs.filter(function(l) {
      var t = new Date(l.timestamp || l.date).getTime();
      return t >= phaseStart && t < phaseEnd;
    });
    var target = p.weeks.length * 6;
    return { phase: p, count: phaseLogs.length, target: target };
  }) : [];

  // Last 7 days heatmap
  var last7 = Array.from({ length: 7 }, function(_, i) {
    var d = new Date(); d.setDate(d.getDate() - (6 - i));
    var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    var done = logs.some(function(l) { return l.date === ymd; });
    return { ymd: ymd, done: done, day: d.toLocaleDateString('en-US', { weekday: 'short' }) };
  });

  // Session type breakdown
  var typeCount = {};
  logs.forEach(function(l) {
    var st = l.sessionType || l.dayType || 'other';
    typeCount[st] = (typeCount[st] || 0) + 1;
  });

  var html = '<div style="padding:0 16px 24px">';

  // Overall progress
  html += '<div class="card im-card" style="margin-bottom:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Overall</div>' +
      '<div style="font-size:11px;color:var(--text3)">Week ' + Math.min(currentWeek, 24) + '/24</div>' +
    '</div>' +
    '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">' +
      '<div style="font-family:var(--font-display);font-size:44px;color:var(--im-accent);line-height:1">' + completed + '</div>' +
      '<div style="font-size:13px;color:var(--text3)">sessions logged · ' + pct + '% complete</div>' +
    '</div>' +
    '<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#1e78b4,#0095c8);border-radius:3px;transition:width .3s"></div>' +
    '</div>' +
  '</div>';

  // Phase breakdown
  html += '<div class="card im-card" style="margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">By Phase</div>';
  phaseStats.forEach(function(ps) {
    var pct2 = Math.min(100, Math.round((ps.count / ps.target) * 100));
    html += '<div style="margin-bottom:12px">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
        '<span style="color:var(--text2);font-weight:600">' + ps.phase.name + '</span>' +
        '<span style="color:var(--text3)">' + ps.count + ' / ' + ps.target + '</span>' +
      '</div>' +
      '<div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">' +
        '<div style="height:100%;width:' + pct2 + '%;background:var(--im-accent);border-radius:2px"></div>' +
      '</div></div>';
  });
  html += '</div>';

  // Last 7 days
  html += '<div class="card im-card" style="margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Last 7 Days</div>' +
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">' +
    last7.map(function(d) {
      return '<div style="text-align:center">' +
        '<div style="font-size:10px;color:var(--text3);margin-bottom:4px">' + d.day + '</div>' +
        '<div style="aspect-ratio:1;border-radius:6px;background:' + (d.done ? 'var(--im-accent)' : 'var(--bg3)') + ';' +
          'display:flex;align-items:center;justify-content:center;font-size:14px;color:' + (d.done ? '#fff' : 'var(--text3)') + '">' +
          (d.done ? '✓' : '·') + '</div>' +
      '</div>';
    }).join('') +
    '</div></div>';

  // Session type breakdown
  var sessionLabels = (mod && mod.sessionLabels) || {};
  html += '<div class="card im-card" style="margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Sessions Completed</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">';
  Object.keys(typeCount).forEach(function(st) {
    var lbl = sessionLabels[st];
    html += '<div style="display:flex;align-items:center;gap:10px">' +
      '<span style="font-size:20px;width:28px">' + (lbl ? lbl.emoji : '💪') + '</span>' +
      '<div style="flex:1">' +
        '<div style="font-size:12px;color:var(--text2)">' + (lbl ? lbl.name : st) + '</div>' +
      '</div>' +
      '<span style="font-size:14px;font-weight:700;color:var(--im-accent)">' + typeCount[st] + '</span>' +
    '</div>';
  });
  if (!Object.keys(typeCount).length) {
    html += '<div style="color:var(--text3);font-size:13px">No sessions logged yet. Start your first session!</div>';
  }
  html += '</div></div>';

  // Peak week preview
  if (mod && mod.peakWeek) {
    html += '<div class="card im-card" style="margin-bottom:14px;background:rgba(30,120,180,0.06);border-color:rgba(30,120,180,0.25)">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">⚡ Peak Week Preview (Week ' + mod.peakWeek.week + ')</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:10px">' + mod.peakWeek.note + '</div>' +
      mod.peakWeek.sessions.map(function(s) {
        return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">' +
          '<div style="min-width:44px;font-size:11px;font-weight:700;color:var(--text2)">' + s.day.slice(0,3).toUpperCase() + '</div>' +
          '<div style="flex:1;font-size:12px;color:var(--text2)">' + s.desc + '</div>' +
          '<div style="font-size:11px;color:var(--text3);white-space:nowrap">' + s.volume + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // Taper guide
  if (mod && mod.taperGuide) {
    html += '<div class="card im-card" style="margin-bottom:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">🎯 Taper Guide</div>' +
      mod.taperGuide.map(function(t) {
        return '<div style="margin-bottom:10px">' +
          '<div style="font-size:13px;font-weight:700;color:var(--text)">' + t.title + '</div>' +
          '<div style="font-size:12px;color:var(--text2);line-height:1.55;margin-top:3px">' + t.desc + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // Reset button
  html += '<div style="text-align:center;margin-top:8px">' +
    '<button onclick="confirmClearImPlan()" class="btn btn-outline btn-sm">🔄 Reset Plan</button>' +
  '</div>';

  html += '</div>';
  container.innerHTML = html;
}

// ── NUTRITION TAB ─────────────────────────────────────────────────
function renderImNutrition() {
  var container = document.getElementById('im-nutrition-content');
  if (!container) return;
  var mod   = window.APP_DATA && window.APP_DATA.modules && window.APP_DATA.modules.ironman;
  var nutr  = mod && mod.nutrition;
  if (!nutr) { container.innerHTML = '<div style="padding:24px;color:var(--text3);text-align:center">Loading…</div>'; return; }

  var currentWeek = getImCurrentWeek();
  var phase       = _imGetPhase(currentWeek);
  var phaseNutrition = phase && nutr.phases && nutr.phases[phase.id]
    ? nutr.phases[phase.id]
    : 'Fuel your training with whole foods, adequate carbohydrates, and consistent hydration.';

  var html = '<div style="padding:0 16px 32px">';

  // Phase-specific note
  html += '<div class="card im-card" style="margin-bottom:14px;background:rgba(30,120,180,0.07);border-color:rgba(30,120,180,0.25)">' +
    '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">' +
      '🍽 ' + (phase ? phase.name + ' Phase' : 'Current Phase') + ' Nutrition' +
    '</div>' +
    '<div style="font-size:13px;color:var(--text2);line-height:1.6">' + phaseNutrition + '</div>' +
  '</div>';

  // Daily macros
  var daily = nutr.daily;
  if (daily) {
    html += '<div class="card im-card" style="margin-bottom:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Daily Macro Split</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">' +
        _imMacroPill('🍚', 'Carbs', daily.carbs.pct + '%', daily.carbs.desc) +
        _imMacroPill('🥩', 'Protein', daily.protein.pct + '%', daily.protein.desc) +
        _imMacroPill('🥑', 'Fat', daily.fat.pct + '%', daily.fat.desc) +
      '</div>' +
      '<div style="font-size:12px;color:var(--text3);line-height:1.55">' + daily.note + '</div>' +
    '</div>';
  }

  // Meal timing
  if (nutr.timing) {
    html += '<div class="card im-card" style="margin-bottom:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Meal Timing</div>';
    nutr.timing.forEach(function(t) {
      html += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<div style="font-size:24px;width:32px;flex-shrink:0">' + t.icon + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:11px;font-weight:700;color:var(--im-accent);margin-bottom:3px">' + t.label + '</div>' +
          '<div style="font-size:12px;color:var(--text2);line-height:1.55">' + t.desc + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // Hydration
  if (nutr.hydration) {
    html += '<div class="card im-card" style="margin-bottom:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">💧 Hydration Rules</div>';
    nutr.hydration.forEach(function(h) {
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span style="color:var(--im-accent);font-size:14px;flex-shrink:0;margin-top:1px">·</span>' +
        '<div style="font-size:13px;color:var(--text2);line-height:1.5">' + h + '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // All phase nutrition notes
  if (nutr.phases) {
    html += '<div class="card im-card" style="margin-bottom:14px">' +
      '<div style="font-size:12px;font-weight:700;color:var(--im-accent);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Phase-by-Phase Nutrition</div>';
    var phaseOrder = ['base','build','peak','taper'];
    var phaseNames = { base:'🌱 Base', build:'💪 Build', peak:'🔥 Peak', taper:'🎯 Taper' };
    phaseOrder.forEach(function(pid) {
      if (nutr.phases[pid]) {
        html += '<div style="margin-bottom:12px">' +
          '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">' + phaseNames[pid] + '</div>' +
          '<div style="font-size:12px;color:var(--text2);line-height:1.6">' + nutr.phases[pid] + '</div>' +
        '</div>';
      }
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function _imMacroPill(emoji, label, pct, desc) {
  return '<div style="background:rgba(30,120,180,0.1);border-radius:10px;padding:10px 8px;text-align:center">' +
    '<div style="font-size:20px">' + emoji + '</div>' +
    '<div style="font-size:11px;color:var(--text3);margin:3px 0">' + label + '</div>' +
    '<div style="font-size:18px;font-weight:700;color:var(--im-accent)">' + pct + '</div>' +
    '<div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.4">' + desc.split('.')[0] + '.</div>' +
  '</div>';
}
