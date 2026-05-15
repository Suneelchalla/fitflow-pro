// ════════════════════════════════════════════════════════════════
// CROSS TRAINING — Module page logic
// Renders page-cross-training, handles plan registration, per-day
// exercises with bodyweight + upgrade variants, set tracking, history.
//
// LocalStorage keys used:
//   ff_ct_plan_<uid>          → { startDate:'YYYY-MM-DD', startedAt:ts }
//   sess_<uid>_crosstraining_<day>_<date>  → { exIdx:[setIdx, ...] }
//   (logs use existing ff_logs with module='crosstraining')
// ════════════════════════════════════════════════════════════════

// ── ENTRY POINT ───────────────────────────────────────────────────
function initCrossTrainingPage() {
  APP.currentModule = 'crosstraining';
  renderCrossTrainingPage();
}

// ── PLAN REGISTRATION ─────────────────────────────────────────────
function _ctPlanKey(uid) { return 'ff_ct_plan_' + uid; }
function getCtPlan() {
  const u = APP.currentUser;
  return u ? Store.get(_ctPlanKey(u.id)) : null;
}
function registerCtPlan() {
  const u = APP.currentUser;
  if (!u) return;
  Store.set(_ctPlanKey(u.id), {
    startDate: todayStr(),
    startedAt: Date.now(),
  });
  // Best-effort sync to sheets (uses generic saveContent — admin can see it)
  try {
    Sheets.post('saveContent', {
      key: 'ct_plan_' + u.id,
      value: { startDate: todayStr(), startedAt: Date.now() },
    });
  } catch {}
  showToast('🎯 8-Week Plan started! Today: ' + _ctTodayLabel(), 'success');
  renderCrossTrainingPage();
}
function clearCtPlan() {
  const u = APP.currentUser;
  if (!u) return;
  Store.remove(_ctPlanKey(u.id));
  try {
    Sheets.post('saveContent', { key: 'ct_plan_' + u.id, value: null });
  } catch {}
  showToast('Plan reset. Pick up again when ready.', 'info');
  renderCrossTrainingPage();
}
function confirmClearCtPlan() {
  showConfirm(
    'Reset plan?',
    'You can restart the 8-week plan from week 1 any time. Past session logs stay in your history.',
    'Reset plan',
    'Keep',
    () => clearCtPlan(),
    null,
    'danger'
  );
}

// ── COMPUTE CURRENT WEEK FROM START DATE ──────────────────────────
function getCtCurrentWeek() {
  const plan = getCtPlan();
  if (!plan?.startDate) return 0;   // not registered
  const start = new Date(plan.startDate + 'T00:00:00');
  const today = new Date();
  const diffMs   = today - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(8, Math.floor(diffDays / 7) + 1);
}

// ── PHASE LOOKUP FROM WEEK NUMBER ─────────────────────────────────
function _ctGetPhase(week) {
  const mod = window.APP_DATA?.modules?.crosstraining;
  if (!mod?.phases) return null;
  return mod.phases.find(p => p.weeks.includes(week)) || null;
}

// ── DAY-TYPE FROM DAY-OF-WEEK ────────────────────────────────────
function _ctGetDayType(dayName) {
  const mod = window.APP_DATA?.modules?.crosstraining;
  return mod?.schedule?.[dayName] || null;
}

// ── EXERCISE LIST FOR A SPECIFIC WEEK + DAY ───────────────────────
// Admin can override the per-phase exercise list via the admin editor.
// Override is stored at `exercises_crosstraining_<phase>` and synced down
// to every device via Sheets `getAllContent`. We check the override first,
// then fall back to the bundled default in data-crosstraining.js. Same
// pattern as Calisthenics ('exercises_calisthenics_l<level>').
function _ctGetExercises(week, dayName) {
  const mod = window.APP_DATA?.modules?.crosstraining;
  if (!mod) return [];
  const phase   = _ctGetPhase(week);
  const dayType = _ctGetDayType(dayName);
  if (!phase || !dayType) return [];
  const override   = Store.getContent('exercises_crosstraining_' + phase.id);
  const overridden = override?.days?.[dayType];
  if (Array.isArray(overridden) && overridden.length > 0) return overridden;
  return mod.days?.[phase.id]?.[dayType] || [];
}

// ── TODAY'S SESSION LABEL ────────────────────────────────────────
function _ctTodayLabel() {
  const today = dayName();
  const mod = window.APP_DATA?.modules?.crosstraining;
  const dayType = _ctGetDayType(today);
  if (!dayType) return 'Rest day';
  const meta = mod.dayTypeLabels?.[dayType];
  return meta ? `${meta.emoji} ${meta.name}` : today;
}

// ── PAGE RENDER — outer shell with tabs ──────────────────────────
function renderCrossTrainingPage() {
  const container = document.getElementById('ct-page-content');
  if (!container) return;

  const plan = getCtPlan();
  if (!plan) {
    // No plan registered yet — show intro / start screen
    container.innerHTML = _ctRenderIntro();
    return;
  }

  const tabs = [
    { id:'today',    label:'📅 Today' },
    { id:'plan',     label:'🗓 Plan'   },
    { id:'progress', label:'📊 Progress' },
  ];
  const currentTab = APP._ctTab || 'today';

  container.innerHTML = `
    <div class="tab-strip" style="padding:12px 16px 4px">
      ${tabs.map(t => `
        <button class="tab-btn ct-tab-btn ${currentTab===t.id?'active':''}"
          data-tab="${t.id}" onclick="switchCtTab('${t.id}',this)">${t.label}</button>`).join('')}
    </div>
    ${tabs.map(t => `
      <div id="ct-tab-${t.id}" class="run-tab-content ${currentTab===t.id?'active':''}">
        <div id="ct-${t.id}-content"></div>
      </div>`).join('')}`;

  if (currentTab === 'today')    renderCtToday();
  if (currentTab === 'plan')     renderCtPlanOverview();
  if (currentTab === 'progress') renderCtProgress();
}

function switchCtTab(tab, btn) {
  APP._ctTab = tab;
  document.querySelectorAll('.ct-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('[id^="ct-tab-"]').forEach(el => el.classList.remove('active'));
  document.getElementById('ct-tab-' + tab)?.classList.add('active');
  if (tab === 'today')    renderCtToday();
  if (tab === 'plan')     renderCtPlanOverview();
  if (tab === 'progress') renderCtProgress();
}

// ── INTRO SCREEN (no plan registered) ────────────────────────────
function _ctRenderIntro() {
  return `
    <div style="padding:24px 20px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:60px;margin-bottom:12px">💪</div>
        <div class="display" style="font-size:30px;color:var(--g5);line-height:1.1;margin-bottom:8px">
          8-Week Run Strength Plan
        </div>
        <div style="font-size:14px;color:var(--text2);line-height:1.6">
          4 sessions per week · ~25 min each · No gym required
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;color:var(--g5);margin-bottom:10px;
          text-transform:uppercase;letter-spacing:.07em">What you'll do</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.7">
          <strong style="color:var(--text)">Mon</strong> — Lower body strength<br>
          <strong style="color:var(--text)">Tue</strong> — Mobility & activation<br>
          <strong style="color:var(--text)">Thu</strong> — Single-leg + plyometrics<br>
          <strong style="color:var(--text)">Sat</strong> — Posterior chain + core<br>
          <span style="color:var(--text3)">Wed / Fri / Sun — Rest or easy run</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;color:var(--g5);margin-bottom:10px;
          text-transform:uppercase;letter-spacing:.07em">3 phases</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.7">
          <strong style="color:var(--text)">Base</strong> (weeks 1–3) — Foundation. No plyometrics yet.<br>
          <strong style="color:var(--text)">Build</strong> (weeks 4–6) — Intensity. Plyometrics added.<br>
          <strong style="color:var(--text)">Peak</strong> (weeks 7–8) — Power. Hardest variations.
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;background:rgba(46,125,70,0.08);border-color:rgba(46,125,70,0.3)">
        <div style="font-size:13px;color:var(--text2);line-height:1.6">
          <strong style="color:var(--g5)">💡 No equipment needed.</strong>
          Every exercise has a bodyweight version. If you have a dumbbell or chair,
          you'll see an optional "upgrade" variant below it — do whichever you can.
        </div>
      </div>

      <button class="btn btn-primary btn-full btn-lg" onclick="registerCtPlan()"
        style="margin-bottom:12px">
        🚀 Start the 8-Week Plan
      </button>
      <div style="text-align:center;font-size:12px;color:var(--text3)">
        You can reset and restart any time
      </div>
    </div>`;
}

// ── TODAY TAB ─────────────────────────────────────────────────────
function renderCtToday() {
  const container = document.getElementById('ct-today-content');
  if (!container) return;
  const user  = APP.currentUser;
  const today = dayName();
  const todayDate = todayStr();
  const week  = getCtCurrentWeek();
  const phase = _ctGetPhase(week);
  const dayType = _ctGetDayType(today);

  // Plan complete?
  if (week > 8) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center">
        <div style="font-size:64px;margin-bottom:12px">🏆</div>
        <div class="display" style="font-size:28px;color:var(--g5);margin-bottom:8px">Plan complete!</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.6;margin-bottom:20px">
          You finished 8 weeks of run-strength training. Your legs are bulletproof now.<br>
          Take a recovery week, then restart from week 1 with heavier weights.
        </div>
        <button class="btn btn-primary btn-full" onclick="confirmClearCtPlan()" style="margin-bottom:8px">
          🔄 Restart from Week 1
        </button>
      </div>`;
    return;
  }

  const mod = window.APP_DATA?.modules?.crosstraining;
  const dayTypeMeta = mod?.dayTypeLabels?.[dayType];
  const exercises   = _ctGetExercises(week, today);
  const todayLogged = Store.getModuleDayLogs(user.id, 'crosstraining')
    .some(l => l.day === today && l.date === todayDate);

  // Header — phase + week + today's session
  let html = `
    <div style="padding:0 16px 16px">
      <!-- Phase banner -->
      <div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,var(--g1),var(--bg));
        border-color:rgba(67,160,90,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:var(--g5);text-transform:uppercase;letter-spacing:.07em">
            ${phase?.label || 'Phase'}
          </div>
          <div style="font-size:11px;color:var(--text3)">Week ${week} of 8</div>
        </div>
        <div style="font-size:13px;color:var(--text2);line-height:1.55">${phase?.focus || ''}</div>
      </div>`;

  if (!dayType) {
    // Rest day — show next session preview
    const nextDay = _ctNextWorkoutDay(today);
    const nextMeta = nextDay ? mod.dayTypeLabels?.[_ctGetDayType(nextDay)] : null;
    html += `
      <div class="card" style="text-align:center;padding:28px 20px">
        <div style="font-size:48px;margin-bottom:10px">😌</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:6px">Rest day</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:16px">
          Light run or full rest. Recovery is when adaptation happens.
        </div>
        ${nextDay && nextMeta ? `
          <div style="font-size:12px;color:var(--text3);padding-top:12px;border-top:1px solid var(--border)">
            Next session — <strong style="color:var(--g5)">${nextDay}</strong>: ${nextMeta.emoji} ${nextMeta.name}
          </div>
        ` : ''}
      </div>`;
  } else {
    // Workout day — render session
    html += `
      <!-- Today's session header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:32px">${dayTypeMeta?.emoji || '💪'}</span>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;font-weight:700">Today · ${today}</div>
          <div style="font-size:18px;font-weight:700;color:var(--text)">${dayTypeMeta?.name || 'Session'}</div>
        </div>
        ${todayLogged ? '<span class="badge badge-green">✓ Done</span>' : ''}
      </div>

      <div id="ct-exercises-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px"></div>

      <button id="ct-complete-btn" class="btn btn-primary btn-full"
        onclick="completeCtDay()" style="margin-bottom:14px">
        🎉 Complete Session
      </button>`;
  }

  // Footer — small "Reset plan" link
  html += `
      <div style="text-align:center;margin-top:20px">
        <button onclick="confirmClearCtPlan()"
          style="background:none;border:none;color:var(--text3);font-size:12px;text-decoration:underline;cursor:pointer">
          Reset plan
        </button>
      </div>
    </div>`;

  container.innerHTML = html;

  // Render exercises if it's a workout day
  if (dayType && exercises.length) {
    _ctRenderExercises(exercises, today);
    _ctUpdateCompleteBtn();
  }
}

// Find the next scheduled workout day starting from today
function _ctNextWorkoutDay(fromDay) {
  const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const idx = order.indexOf(fromDay);
  if (idx < 0) return null;
  for (let i = 1; i <= 7; i++) {
    const d = order[(idx + i) % 7];
    if (_ctGetDayType(d)) return d;
  }
  return null;
}

// ── EXERCISE LIST RENDER (with bodyweight + upgrade variants) ────
function _ctRenderExercises(exercises, day) {
  const container = document.getElementById('ct-exercises-list');
  if (!container) return;
  const user = APP.currentUser;
  const mod  = window.APP_DATA?.modules?.crosstraining;

  // Build warmup + main + cooldown list
  const warmups   = window.APP_DATA?.warmups?.crosstraining   || [];
  const cooldowns = window.APP_DATA?.cooldowns?.crosstraining || [];
  const all = [
    ...warmups.map(e => ({ ...e, _section:'warmup' })),
    ...exercises.map(e => ({ ...e, _section:'main' })),
    ...cooldowns.map(e => ({ ...e, _section:'cooldown' })),
  ];

  const sessionKey  = `sess_${user.id}_crosstraining_${day}_${todayStr()}`;
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
      return `<div class="set-check ${isDone?'checked':''}" onclick="toggleCtSet(${i},${s})">
        <div class="check-box">${isDone?'✓':''}</div>
        <span class="check-label">Set ${s+1} — ${ex.reps||''}</span>
      </div>`;
    }).join('');

    // Optional upgrade variant — rendered as a sub-card below the main exercise
    const upgrade = ex.upgrade;
    const upgradeHtml = upgrade ? `
      <div style="margin-top:10px;padding:10px 12px;border-radius:10px;
        background:rgba(67,160,90,0.08);border:1px dashed rgba(67,160,90,0.35)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;color:var(--g5);text-transform:uppercase;letter-spacing:.06em">
            ⬆ Optional Upgrade
          </span>
          <span style="font-size:10px;color:var(--text3)">${upgrade.equipment || ''}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${upgrade.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">🎯 ${upgrade.reps || ''}</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.55;margin-bottom:6px">${upgrade.desc || ''}</div>
        ${upgrade.demo ? `<a href="${upgrade.demo}" target="_blank" rel="noopener" class="demo-link" style="font-size:11px">▶ Watch upgrade demo</a>` : ''}
      </div>` : '';

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
          ${upgradeHtml}
        </div>
      </div>`;
  }).join('');
}

function toggleCtSet(exIdx, setIdx) {
  const user = APP.currentUser;
  const day  = dayName();
  const sessionKey = `sess_${user.id}_crosstraining_${day}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  const pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  const exercises = _ctGetExercises(getCtCurrentWeek(), day);
  _ctRenderExercises(exercises, day);
  _ctUpdateCompleteBtn();
}

function _ctUpdateCompleteBtn() {
  const btn = document.getElementById('ct-complete-btn');
  if (!btn) return;
  const user = APP.currentUser;
  const day  = dayName();
  const alreadyLogged = Store.getModuleDayLogs(user.id, 'crosstraining')
    .some(l => l.day === day && l.date === todayStr());
  if (alreadyLogged) {
    btn.textContent = '✓ Session Complete!';
    btn.className   = 'btn btn-outline btn-full';
    btn.disabled    = true;
  } else {
    btn.textContent = '🎉 Complete Session';
    btn.className   = 'btn btn-primary btn-full';
    btn.disabled    = false;
  }
}

function completeCtDay() {
  const user = APP.currentUser;
  const day  = dayName();
  const logged = Store.addLog({
    userId: user.id,
    module: 'crosstraining',
    day,
    date: todayStr(),
    timestamp: new Date().toISOString(),
  });
  if (!logged) { showToast('Already logged today!', 'info'); return; }
  showToast('🎉 ' + day + ' session complete! 💪', 'success');
  sheetsPost('logCompletion', {
    userId: user.id,
    email:  user.email,
    module: 'crosstraining',
    day,
    date:   todayStr(),
  });
  setTimeout(() => {
    if (typeof checkAndUnlockWorkoutAchievements === 'function') {
      checkAndUnlockWorkoutAchievements(user.id);
    }
  }, 800);
  _ctUpdateCompleteBtn();
}

// ── PLAN OVERVIEW TAB — 8-week calendar grid ─────────────────────
function renderCtPlanOverview() {
  const container = document.getElementById('ct-plan-content');
  if (!container) return;
  const user = APP.currentUser;
  const mod  = window.APP_DATA?.modules?.crosstraining;
  const currentWeek = getCtCurrentWeek();
  const logs = Store.getModuleDayLogs(user.id, 'crosstraining');
  const plan = getCtPlan();

  // Iterate weeks 1–8, days Mon–Sun
  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  let html = `
    <div style="padding:0 16px 16px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.6">
        Started <strong style="color:var(--text2)">${plan.startDate}</strong>.
        Tap any day to see the session.
      </div>`;

  mod.phases.forEach(phase => {
    html += `
      <div style="font-size:12px;font-weight:700;color:var(--g5);text-transform:uppercase;
        letter-spacing:.08em;margin:18px 0 10px">${phase.label} — Weeks ${phase.weeks[0]}–${phase.weeks[phase.weeks.length-1]}</div>`;

    phase.weeks.forEach(week => {
      const isCurrent = week === currentWeek;
      const isPast    = week < currentWeek;
      const weekLabel = `Week ${week}`;

      html += `
        <div class="card" style="margin-bottom:10px;padding:12px 14px;
          border-color:${isCurrent?'var(--g4)':'var(--border)'};
          background:${isCurrent?'rgba(67,160,90,0.08)':'var(--surface)'}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:${isCurrent?'var(--g5)':'var(--text)'}">
              ${weekLabel} ${isCurrent?'· <span style="font-size:10px">current</span>':''}
            </div>
            <div style="font-size:10px;color:var(--text3)">${isPast?'past':isCurrent?'now':'upcoming'}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
            ${dayOrder.map(d => {
              const dayType = _ctGetDayType(d);
              const meta    = dayType ? mod.dayTypeLabels[dayType] : null;
              const done    = logs.some(l => l.day === d);  // any past completion on this weekday
              const bg = !dayType ? 'var(--bg3)' : done ? 'rgba(67,160,90,0.25)' : 'var(--surface2)';
              const col = !dayType ? 'var(--text3)' : 'var(--text)';
              return `
                <div onclick="${dayType?`_ctShowDayDetail(${week},'${d}')`:''}"
                  style="aspect-ratio:1;border-radius:8px;background:${bg};
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    cursor:${dayType?'pointer':'default'};color:${col};
                    border:${isCurrent && d===dayName()?'2px solid var(--accent)':'none'}">
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:0.7">${d.slice(0,3)}</div>
                  <div style="font-size:16px;line-height:1">${meta?meta.emoji:'·'}</div>
                  ${done?'<div style="font-size:9px;color:var(--g5)">✓</div>':''}
                </div>`;
            }).join('')}
          </div>
        </div>`;
    });
  });

  html += `</div>`;
  container.innerHTML = html;
}

// Show modal-style detail for a clicked day
function _ctShowDayDetail(week, day) {
  const mod = window.APP_DATA?.modules?.crosstraining;
  const dayType = _ctGetDayType(day);
  const phase = _ctGetPhase(week);
  const exercises = _ctGetExercises(week, day);
  const meta = mod?.dayTypeLabels?.[dayType];
  if (!exercises.length) return;

  const html = `
    <div style="padding:0 16px 24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <span style="font-size:32px">${meta?.emoji||'💪'}</span>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">${phase?.label||''}</div>
          <div style="font-size:18px;font-weight:700">Week ${week} · ${day}</div>
          <div style="font-size:13px;color:var(--text2)">${meta?.name||''}</div>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
        ${exercises.map((ex, i) => `
          <div style="padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface)">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">${i+1}. ${ex.name}</div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:6px">🔄 ${ex.sets||1} sets · 💪 ${ex.reps||''}</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.55">${ex.desc||''}</div>
            ${ex.upgrade ? `
              <div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(67,160,90,0.08);border:1px dashed rgba(67,160,90,0.3)">
                <div style="font-size:10px;font-weight:700;color:var(--g5);margin-bottom:2px">⬆ Upgrade — ${ex.upgrade.equipment||''}</div>
                <div style="font-size:12px;color:var(--text2)"><strong>${ex.upgrade.name}</strong> · ${ex.upgrade.reps||''}</div>
              </div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;

  // Reuse the existing confirm modal as a generic content viewer.
  // Easier than introducing a new modal element.
  const titleEl = document.getElementById('confirm-title');
  const msgEl   = document.getElementById('confirm-message');
  const okBtn   = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  if (titleEl) titleEl.textContent = '';
  if (msgEl)   { msgEl.innerHTML = html; msgEl.style.textAlign = 'left'; }
  if (okBtn)   { okBtn.textContent = 'Close'; okBtn.onclick = () => closeModal('modal-confirm'); }
  if (cancelBtn) cancelBtn.style.display = 'none';
  openModal('modal-confirm');
  // Restore cancel button visibility on close so other confirms work normally
  setTimeout(() => {
    const m = document.getElementById('modal-confirm');
    if (m) {
      m.addEventListener('transitionend', () => {
        if (cancelBtn) cancelBtn.style.display = '';
      }, { once: true });
    }
  }, 0);
}

// ── PROGRESS TAB ─────────────────────────────────────────────────
function renderCtProgress() {
  const container = document.getElementById('ct-progress-content');
  if (!container) return;
  const user = APP.currentUser;
  const logs = Store.getModuleDayLogs(user.id, 'crosstraining');
  const currentWeek = getCtCurrentWeek();
  const plan = getCtPlan();
  const totalSessionsTarget = 8 * 4;  // 8 weeks × 4 sessions
  const completed = logs.length;
  const pct = Math.min(100, Math.round((completed / totalSessionsTarget) * 100));

  // Weekly streak — count consecutive completed weeks (4 sessions each)
  // Simpler: just total + per-phase split
  const mod = window.APP_DATA?.modules?.crosstraining;
  const phaseStats = mod.phases.map(p => {
    const weekDates = [];   // Note: we don't have per-week tracking yet; this is "logs done so far in this phase's calendar weeks"
    // Calculate which logs fall within phase's weeks based on plan startDate
    const startTs = new Date((plan?.startDate || todayStr()) + 'T00:00:00').getTime();
    const lo = p.weeks[0];
    const hi = p.weeks[p.weeks.length - 1];
    const phaseStart = startTs + (lo - 1) * 7 * 24 * 3600 * 1000;
    const phaseEnd   = startTs + (hi)     * 7 * 24 * 3600 * 1000;
    const phaseLogs  = logs.filter(l => {
      const t = new Date(l.timestamp || l.date).getTime();
      return t >= phaseStart && t < phaseEnd;
    });
    const target = p.weeks.length * 4;
    return { phase: p, count: phaseLogs.length, target };
  });

  // Last 7 days for the heatmap row
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const done = logs.some(l => l.date === ymd);
    return { ymd, done, day: d.toLocaleDateString('en-US',{ weekday:'short' }) };
  });

  container.innerHTML = `
    <div style="padding:0 16px 16px">
      <!-- Overall progress -->
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Overall</div>
          <div style="font-size:11px;color:var(--text3)">Week ${Math.min(currentWeek,8)}/8</div>
        </div>
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
          <div style="font-family:var(--font-display);font-size:40px;color:var(--g5);line-height:1">${completed}</div>
          <div style="font-size:13px;color:var(--text3)">of ${totalSessionsTarget} sessions · ${pct}%</div>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--g3),var(--g4));border-radius:3px;transition:width .3s"></div>
        </div>
      </div>

      <!-- Per-phase progress -->
      <div class="card" style="margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">By Phase</div>
        ${phaseStats.map(ps => {
          const pct2 = Math.min(100, Math.round((ps.count / ps.target) * 100));
          return `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="color:var(--text2);font-weight:600">${ps.phase.name}</span>
                <span style="color:var(--text3)">${ps.count} / ${ps.target}</span>
              </div>
              <div style="height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${pct2}%;background:var(--g4);border-radius:2px"></div>
              </div>
            </div>`;
        }).join('')}
      </div>

      <!-- Last 7 days -->
      <div class="card" style="margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Last 7 Days</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${last7.map(d => `
            <div style="text-align:center">
              <div style="font-size:10px;color:var(--text3);margin-bottom:4px">${d.day}</div>
              <div style="aspect-ratio:1;border-radius:6px;background:${d.done?'var(--g3)':'var(--bg3)'};
                display:flex;align-items:center;justify-content:center;font-size:14px;color:${d.done?'#fff':'var(--text3)'}">
                ${d.done?'✓':'·'}
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Reset -->
      <div style="text-align:center;margin-top:24px">
        <button onclick="confirmClearCtPlan()" class="btn btn-outline btn-sm">
          🔄 Reset Plan
        </button>
      </div>
    </div>`;
}
