// ════════════════════════════════════════════════════════════════
// CROSS TRAINING — Module page logic
//
// REDESIGN NOTES (v4):
//   • Today tab REMOVED. It duplicated content already in the Plan tab,
//     broke on date-string parsing ("Week NaN of 8"), and offered a
//     "Complete Session" button users had no way to drill into.
//     Plan is the default tab now. Current day is highlighted there.
//   • Day detail no longer reuses the confirm modal — it's a real page
//     (page-ct-day) with warmup + main exercises + cool-down, per-exercise
//     video links, the optional upgrade variant (description + own video),
//     set checkboxes, and a Complete Session button gated by week.
//   • Per-day completion is now tracked per-week (ff_ctday_<uid>_w<w>_<day>)
//     so completing Monday in Week 1 doesn't mark every Monday done across
//     the 8-week plan. Logs still also flow into ff_logs so global history
//     picks them up like any other module.
//
// LocalStorage keys used:
//   ff_ct_plan_<uid>                       → { startDate:'YYYY-MM-DD', startedAt:ts }
//   ff_ctday_<uid>_w<week>_<DayName>       → { date, timestamp, week, day, dayType, phase }
//   sess_<uid>_crosstraining_w<w>_<day>    → { exIdx:[setIdx, ...] }  (set tracking state)
//   (logs use existing ff_logs with module='crosstraining')
// ════════════════════════════════════════════════════════════════

// ── ENTRY POINT ───────────────────────────────────────────────────
function initCrossTrainingPage() {
  APP.currentModule = 'crosstraining';
  renderCrossTrainingPage();
}

// ── STORAGE KEY HELPERS ───────────────────────────────────────────
function _ctPlanKey(uid)              { return 'ff_ct_plan_' + uid; }
function _ctDayKey(uid, week, day)    { return 'ff_ctday_' + uid + '_w' + week + '_' + day; }
function _ctSessionKey(uid, week, day) { return 'sess_' + uid + '_crosstraining_w' + week + '_' + day; }

// ── PLAN REGISTRATION ─────────────────────────────────────────────
// Cross Training plan registration writes to the same PlanProgress sheet
// that running plans use — keyed by planKey:'crosstraining'. The Apps
// Script dedups on userId + planKey so the running plan and the Cross
// Training plan can coexist as two REGISTERED rows.
function getCtPlan() {
  const u = APP.currentUser;
  return u ? Store.get(_ctPlanKey(u.id)) : null;
}
function registerCtPlan() {
  const u = APP.currentUser;
  if (!u) return;
  const startDate    = todayStr();
  const registeredAt = new Date().toISOString();
  // Local-first so the UI reflects the change immediately, even if offline
  Store.set(_ctPlanKey(u.id), { startDate, startedAt: Date.now() });
  try {
    Sheets.post('savePlanRegistration', {
      userId:       u.id,
      email:        u.email,
      planKey:      'crosstraining',
      startDate,
      registeredAt,
    });
  } catch {}
  showToast('🎯 8-Week Plan started! Today: ' + _ctTodayLabel(), 'success');
  renderCrossTrainingPage();
}
function clearCtPlan() {
  const u = APP.currentUser;
  if (!u) return;
  // Wipe the plan registration
  Store.remove(_ctPlanKey(u.id));
  // Wipe per-week-day completion flags so the next plan starts from a clean grid
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ff_ctday_' + u.id + '_') ||
          k.startsWith('sess_' + u.id + '_crosstraining_')) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
  // Mark the PlanProgress row as UNREGISTERED — only the crosstraining one
  try {
    Sheets.post('clearActivePlan', {
      userId:  u.id,
      planKey: 'crosstraining',
    });
  } catch {}
  showToast('Plan reset. Pick up again when ready.', 'info');
  renderCrossTrainingPage();
}
function confirmClearCtPlan() {
  showConfirm(
    'Reset plan?',
    'You can restart the 8-week plan from week 1 any time. Past completion checks will be cleared from the grid, but your dated workout history stays in the global History page.',
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
  if (!plan?.startDate) return 0;
  // Defensive: a historical bug left some users with startDate as a full
  // JS Date string ("Fri May 15 2026 00:00:00 GMT+0530 …") instead of
  // YYYY-MM-DD. _normalizeDate (declared in app.js) coerces both shapes.
  let startStr = plan.startDate;
  if (typeof _normalizeDate === 'function') {
    const norm = _normalizeDate(startStr);
    if (norm) startStr = norm;
  }
  const start = new Date(startStr + 'T00:00:00');
  if (isNaN(start.getTime())) return 0;
  const today = new Date();
  const diffMs   = today - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(8, Math.floor(diffDays / 7) + 1));
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
// then fall back to the bundled default in data-crosstraining.js.
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

// ── TODAY'S SESSION LABEL (used in toast text only) ───────────────
function _ctTodayLabel() {
  const today = dayName();
  const mod = window.APP_DATA?.modules?.crosstraining;
  const dayType = _ctGetDayType(today);
  if (!dayType) return 'Rest day';
  const meta = mod.dayTypeLabels?.[dayType];
  return meta ? `${meta.emoji} ${meta.name}` : today;
}

// ── DAY-COMPLETION HELPERS ───────────────────────────────────────
function isCtDayDone(week, dayName) {
  const u = APP.currentUser;
  if (!u) return false;
  return !!Store.get(_ctDayKey(u.id, week, dayName));
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

  // Today tab is gone — Plan is the default landing tab now
  const tabs = [
    { id:'plan',     label:'🗓 Plan'     },
    { id:'progress', label:'📊 Progress' },
  ];
  const currentTab = (APP._ctTab && tabs.some(t => t.id === APP._ctTab))
    ? APP._ctTab
    : 'plan';
  APP._ctTab = currentTab;

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

  if (currentTab === 'plan')     renderCtPlanOverview();
  if (currentTab === 'progress') renderCtProgress();
}

function switchCtTab(tab, btn) {
  APP._ctTab = tab;
  document.querySelectorAll('.ct-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('[id^="ct-tab-"]').forEach(el => el.classList.remove('active'));
  document.getElementById('ct-tab-' + tab)?.classList.add('active');
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
          <strong style="color:var(--text)">Mon</strong> — 🦵 Lower body strength<br>
          <strong style="color:var(--text)">Tue</strong> — 🧘 Mobility &amp; activation<br>
          <strong style="color:var(--text)">Thu</strong> — ⚡ Single-leg + plyometrics<br>
          <strong style="color:var(--text)">Sat</strong> — 🔥 Posterior chain + core<br>
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

// ── PLAN OVERVIEW TAB — 8-week calendar grid with legend ─────────
function renderCtPlanOverview() {
  const container = document.getElementById('ct-plan-content');
  if (!container) return;
  const user = APP.currentUser;
  const mod  = window.APP_DATA?.modules?.crosstraining;
  const currentWeek = getCtCurrentWeek();
  const currentDay  = dayName();
  const plan = getCtPlan();
  const phase = _ctGetPhase(currentWeek);

  // Display-friendly start date — if startDate is malformed in storage,
  // still show *something* informative rather than "Invalid Date"
  let startDisplay = '—';
  if (plan?.startDate) {
    const norm = (typeof _normalizeDate === 'function') ? _normalizeDate(plan.startDate) : plan.startDate;
    const d = new Date((norm || plan.startDate) + 'T00:00:00');
    startDisplay = isNaN(d.getTime())
      ? plan.startDate
      : d.toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  }

  const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // ── Status banner: current week + phase + focus ──
  let html = `
    <div style="padding:0 16px 16px">

      <!-- Current status -->
      <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,var(--g1),var(--bg));
        border-color:rgba(67,160,90,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:var(--g5);text-transform:uppercase;letter-spacing:.07em">
            ${phase?.label || 'Phase'}
          </div>
          <div style="font-size:11px;color:var(--text3)">Week ${currentWeek} of 8</div>
        </div>
        <div style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:4px">
          ${phase?.focus || ''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:8px">
          Started ${startDisplay} · Tap any day to open the session
        </div>
      </div>

      <!-- Legend -->
      <div class="card" style="margin-bottom:14px;padding:12px 14px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;
          letter-spacing:.07em;margin-bottom:8px">What the icons mean</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--text2);line-height:1.5">
          <div><span style="font-size:14px">🦵</span> Lower body strength</div>
          <div><span style="font-size:14px">🧘</span> Mobility &amp; activation</div>
          <div><span style="font-size:14px">⚡</span> Single-leg + plyometrics</div>
          <div><span style="font-size:14px">🔥</span> Posterior chain + core</div>
          <div style="grid-column:span 2;color:var(--text3);font-size:11px;margin-top:2px">
            <span style="font-size:14px">·</span> Rest day — easy run or full rest
          </div>
        </div>
      </div>`;

  mod.phases.forEach(phaseDef => {
    html += `
      <div style="font-size:12px;font-weight:700;color:var(--g5);text-transform:uppercase;
        letter-spacing:.08em;margin:18px 0 10px">${phaseDef.label} — Weeks ${phaseDef.weeks[0]}–${phaseDef.weeks[phaseDef.weeks.length-1]}</div>`;

    phaseDef.weeks.forEach(week => {
      const isCurrent  = week === currentWeek;
      const isPast     = week < currentWeek;
      const stateLbl   = isPast ? 'past' : isCurrent ? 'now' : 'upcoming';
      const stateCol   = isPast ? 'var(--text3)' : isCurrent ? 'var(--g5)' : 'var(--text3)';

      html += `
        <div class="card" style="margin-bottom:10px;padding:12px 14px;
          border-color:${isCurrent?'var(--g4)':'var(--border)'};
          background:${isCurrent?'rgba(67,160,90,0.08)':'var(--surface)'}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:${isCurrent?'var(--g5)':'var(--text)'}">
              Week ${week}${isCurrent?' · <span style="font-size:10px">current</span>':''}
            </div>
            <div style="font-size:10px;color:${stateCol}">${stateLbl}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
            ${dayOrder.map(d => {
              const dayType   = _ctGetDayType(d);
              const meta      = dayType ? mod.dayTypeLabels[dayType] : null;
              const isToday   = isCurrent && d === currentDay;
              const done      = dayType ? isCtDayDone(week, d) : false;
              const isWorkout = !!dayType;

              // Background + border based on state. Locks intentionally removed —
              // users can complete any workout day they want, in any order.
              // Past/current/future weeks all look the same except for the
              // "TODAY" pill and the green "done" highlight.
              let bg, border, color;
              if (!isWorkout) {
                bg = 'var(--bg3)'; border = 'none'; color = 'var(--text3)';
              } else if (done) {
                bg = 'rgba(67,160,90,0.28)'; border = '1px solid rgba(67,160,90,0.45)'; color = 'var(--text)';
              } else if (isToday) {
                bg = 'rgba(240,192,64,0.18)'; border = '2px solid var(--accent)'; color = 'var(--text)';
              } else {
                bg = 'var(--surface2)'; border = '1px solid var(--border)'; color = 'var(--text)';
              }

              const handler = isWorkout ? `openCtDayDetail(${week},'${d}')` : '';
              return `
                <div onclick="${handler}"
                  style="aspect-ratio:1;border-radius:10px;background:${bg};border:${border};
                    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
                    cursor:${isWorkout?'pointer':'default'};color:${color};position:relative;
                    transition:transform .15s ease, background .15s ease">
                  <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;opacity:0.7">${d.slice(0,3)}</div>
                  <div style="font-size:18px;line-height:1">${meta?meta.emoji:'·'}</div>
                  ${done ? '<div style="font-size:9px;color:var(--g5);font-weight:700;line-height:1">✓</div>' : ''}
                  ${isToday && !done ? `<div style="position:absolute;top:-6px;right:-4px;background:var(--accent);color:#000;font-size:8px;font-weight:800;padding:1px 5px;border-radius:8px;letter-spacing:.04em">TODAY</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`;
    });
  });

  html += `</div>`;
  container.innerHTML = html;
}

// ── DAY DETAIL PAGE ───────────────────────────────────────────────
// Opens page-ct-day with the full session: warmup → main → cool-down,
// per-exercise demo videos, upgrade variant with its own video,
// set checkboxes, and a Complete Session button gated by week.

function openCtDayDetail(week, day) {
  const dayType = _ctGetDayType(day);
  if (!dayType) return;  // rest day — tap is a no-op
  APP._ctViewWeek = week;
  APP._ctViewDay  = day;
  showPage('page-ct-day');
  _renderCtDayPage();
}

function _renderCtDayPage() {
  const container = document.getElementById('ct-day-content');
  if (!container) return;
  const week = APP._ctViewWeek;
  const day  = APP._ctViewDay;
  if (!week || !day) {
    container.innerHTML = '<div style="padding:24px;color:var(--text3);text-align:center">No session selected.</div>';
    return;
  }
  const mod         = window.APP_DATA?.modules?.crosstraining;
  const phase       = _ctGetPhase(week);
  const dayType     = _ctGetDayType(day);
  const dayTypeMeta = dayType ? mod?.dayTypeLabels?.[dayType] : null;
  const exercises   = _ctGetExercises(week, day);

  if (!dayType || !exercises.length) {
    container.innerHTML = `
      <div style="padding:24px;text-align:center">
        <div style="font-size:48px;margin-bottom:10px">😌</div>
        <div style="font-size:16px;color:var(--text2)">Nothing to do here — that's a rest day.</div>
      </div>`;
    return;
  }

  const done = isCtDayDone(week, day);

  // Header — phase, week, day-type
  let html = `
    <div style="padding:0 16px 24px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <span style="font-size:42px;line-height:1">${dayTypeMeta?.emoji || '💪'}</span>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:var(--g5);text-transform:uppercase;letter-spacing:.07em">${phase?.label || ''}</div>
          <div style="font-size:20px;font-weight:700;color:var(--text);line-height:1.15">Week ${week} · ${day}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:2px">${dayTypeMeta?.name || ''}</div>
        </div>
        ${done ? '<span class="badge badge-green">✓ Done</span>' : ''}
      </div>

      <!-- "What does Upgrade mean?" explainer — collapsed by default -->
      <details style="margin-bottom:14px">
        <summary style="cursor:pointer;list-style:none;padding:10px 12px;border-radius:10px;
          background:rgba(67,160,90,0.08);border:1px dashed rgba(67,160,90,0.35);
          font-size:12px;color:var(--g5);font-weight:600">
          ⬆ What does "Upgrade" mean?
        </summary>
        <div style="padding:10px 12px;font-size:12px;color:var(--text2);line-height:1.55">
          Every exercise lists the <strong>bodyweight version</strong> on top and
          (when it makes sense) an <strong>optional harder variant</strong> below
          it called the Upgrade. The Upgrade usually needs light equipment — a
          dumbbell, a step, a chair — and gives you more strength gain. Do
          whichever you can. The bodyweight version is enough by itself; the
          Upgrade is for the days you have the kit.
        </div>
      </details>

      <div id="ct-day-exercises" style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px"></div>

      <button id="ct-day-complete-btn" class="btn btn-primary btn-full"
        onclick="completeCtDay(${week},'${day}')" style="margin-bottom:14px">
        🎉 Complete Session
      </button>

      <div style="text-align:center;margin-top:8px">
        <button onclick="goBack()"
          style="background:none;border:none;color:var(--text3);font-size:12px;text-decoration:underline;cursor:pointer">
          ← Back to plan
        </button>
      </div>
    </div>`;

  container.innerHTML = html;

  // Render the exercise list (warmup + main + cool-down) into the placeholder
  _ctRenderDayExercises(exercises, week, day);
  _ctUpdateDayCompleteBtn(week, day);
}

// Renders warmup + main + cool-down with set checkboxes, video links,
// and upgrade variants (each with their own video). Mirrors the rich
// exercise-card style used elsewhere in the app.
function _ctRenderDayExercises(exercises, week, day) {
  const container = document.getElementById('ct-day-exercises');
  if (!container) return;
  const user = APP.currentUser;

  const warmups   = window.APP_DATA?.warmups?.crosstraining   || [];
  const cooldowns = window.APP_DATA?.cooldowns?.crosstraining || [];
  const all = [
    ...warmups.map(e   => ({ ...e, _section:'warmup' })),
    ...exercises.map(e => ({ ...e, _section:'main' })),
    ...cooldowns.map(e => ({ ...e, _section:'cooldown' })),
  ];

  const sessionKey  = _ctSessionKey(user.id, week, day);
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
      if (ex._section === 'warmup')   hdr = secHeader('🔥 Warm-Up',  'rgba(30,136,229,0.30)');
      if (ex._section === 'main')     hdr = secHeader('💪 Workout',   'rgba(46,125,70,0.35)');
      if (ex._section === 'cooldown') hdr = secHeader('🧘 Cool-Down', 'rgba(103,58,183,0.35)');
    }

    const checked = sessionData[i] || [];
    const total   = parseInt(ex.sets) || 1;
    const allDone = checked.length >= total;

    const checksHtml = Array.from({ length: total }, (_, s) => {
      const isDone = checked.includes(s);
      return `<div class="set-check ${isDone?'checked':''}" onclick="toggleCtSet(${week},'${day}',${i},${s})">
        <div class="check-box">${isDone?'✓':''}</div>
        <span class="check-label">Set ${s+1} — ${ex.reps||''}</span>
      </div>`;
    }).join('');

    // Optional upgrade variant — its own card under the main exercise.
    // Now shows the upgrade's description AND its demo video link
    // (the previous bare-modal version dropped both).
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
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">${upgrade.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">🎯 ${upgrade.reps || ''}</div>
        ${upgrade.desc ? `<div style="font-size:12px;color:var(--text2);line-height:1.55;margin-bottom:6px">${upgrade.desc}</div>` : ''}
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

function toggleCtSet(week, day, exIdx, setIdx) {
  const user = APP.currentUser;
  const sessionKey = _ctSessionKey(user.id, week, day);
  const sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  const pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  const exercises = _ctGetExercises(week, day);
  _ctRenderDayExercises(exercises, week, day);
  _ctUpdateDayCompleteBtn(week, day);
}

function _ctUpdateDayCompleteBtn(week, day) {
  const btn = document.getElementById('ct-day-complete-btn');
  if (!btn) return;
  if (isCtDayDone(week, day)) {
    btn.textContent = '✓ Session Complete!';
    btn.className   = 'btn btn-outline btn-full';
    btn.disabled    = true;
  } else {
    btn.textContent = '🎉 Complete Session';
    btn.className   = 'btn btn-primary btn-full';
    btn.disabled    = false;
  }
}

// Complete a session. Logs to:
//   1. ff_logs  (module='crosstraining', day, date=today) → global History
//   2. ff_ctday_<uid>_w<week>_<day>                       → per-week-day check
//   3. Sheets logCompletion + savePlanDayCompletion       → server sync
function completeCtDay(week, day) {
  const user = APP.currentUser;
  if (!user) return;
  if (isCtDayDone(week, day)) {
    showToast('Already logged for this session.', 'info');
    return;
  }

  const phase   = _ctGetPhase(week);
  const dayType = _ctGetDayType(day);
  const today   = todayStr();

  // 1. Global log — picked up by global History calendar & module history
  Store.addLog({
    userId:    user.id,
    module:    'crosstraining',
    day,
    date:      today,
    timestamp: new Date().toISOString(),
    week,
    phase:     phase?.id  || '',
    dayType:   dayType    || '',
  });

  // 2. Per-week-day completion flag — drives the Plan grid green checks
  Store.set(_ctDayKey(user.id, week, day), {
    date:      today,
    timestamp: new Date().toISOString(),
    week,
    day,
    dayType:   dayType    || '',
    phase:     phase?.id  || '',
  });

  // 3. Sheet sync (fire & forget — local writes already succeeded)
  try {
    sheetsPost('logCompletion', {
      userId: user.id,
      email:  user.email,
      module: 'crosstraining',
      day,
      date:   today,
    });
  } catch {}
  try {
    sheetsPost('savePlanDayCompletion', {
      userId:        user.id,
      planKey:       'crosstraining',
      week,
      day:           ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(day) + 1,
      completedDate: today,
      distanceKm:    0,
      durationSec:   0,
    });
  } catch {}

  showToast('🎉 Week ' + week + ' ' + day + ' session complete! 💪', 'success');

  setTimeout(() => {
    if (typeof checkAndUnlockWorkoutAchievements === 'function') {
      checkAndUnlockWorkoutAchievements(user.id);
    }
  }, 800);

  _ctUpdateDayCompleteBtn(week, day);
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

  // Per-phase split based on plan calendar weeks
  const mod = window.APP_DATA?.modules?.crosstraining;
  const startStrRaw = plan?.startDate || todayStr();
  const startStr = (typeof _normalizeDate === 'function') ? (_normalizeDate(startStrRaw) || startStrRaw) : startStrRaw;
  const phaseStats = mod.phases.map(p => {
    const startTs = new Date(startStr + 'T00:00:00').getTime();
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

  // Last 7 days heatmap
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
