// ── RUNNING PAGE ──────────────────────────────────────────────────

// ── SESSION PERSISTENCE KEY ───────────────────────────────────────
const RUN_SESSION_KEY = 'ff_active_run';

// Persist run session to localStorage so it survives page reload / app kill
function _saveRunSession() {
  if (!APP.runSession) return;
  Store.set(RUN_SESSION_KEY, {
    startTime:    APP.runSession.startTime,
    pausedAt:     APP.runSession.pausedAt   || null,
    totalPaused:  APP.runSession.totalPaused || 0,
    distance:     APP.runSession.distance,
    paused:       APP.runSession.paused,
    coords:       APP.gpsCoords.slice(-200), // keep last 200 pts to stay lean
  });
}

// Clear persisted session
function _clearRunSession() {
  Store.remove(RUN_SESSION_KEY);
}

// ── WALL-CLOCK ELAPSED (immune to setInterval throttling) ─────────
// elapsed = (now - startTime) - totalPausedMs
function _calcElapsed(session) {
  const now         = Date.now();
  const paused      = session.totalPaused || 0;
  const pauseExtra  = (session.paused && session.pausedAt)
                      ? (now - session.pausedAt)   // currently paused — don't count ongoing pause
                      : 0;
  return Math.floor((now - session.startTime - paused - pauseExtra) / 1000);
}

function initRunningPage() {
  APP.currentModule = 'running';

  // ── CRASH RECOVERY: restore an active run if app was killed mid-run ──
  const saved = Store.get(RUN_SESSION_KEY);
  if (saved && !APP.runSession) {
    APP.runSession = {
      startTime:   saved.startTime,
      pausedAt:    saved.pausedAt   || null,
      totalPaused: saved.totalPaused || 0,
      distance:    saved.distance   || 0,
      paused:      saved.paused     || false,
    };
    APP.gpsCoords = saved.coords || [];

    // Show active UI immediately
    document.getElementById('run-idle')?.classList.add('hidden');
    document.getElementById('run-active')?.classList.remove('hidden');
    document.getElementById('run-summary')?.classList.add('hidden');

    const pauseBtn = document.getElementById('pause-run-btn');
    if (pauseBtn) pauseBtn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';

    // Restart timer and GPS (if not paused)
    _startRunTimerLoop();
    if (!APP.runSession.paused) startGPS();

    showToast('Run restored — still tracking! 🏃', 'success');
  }

  renderRunningTabs('log');
  renderRunHistory();
}

function renderRunningTabs(tab) {
  document.querySelectorAll('.run-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.run-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.run-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('run-tab-' + tab)?.classList.add('active');
  if (tab === 'plans')     renderTrainingPlans();
  if (tab === 'history')   renderRunHistory();
  if (tab === 'hydration') renderHydrationRunning();
  if (tab === 'diet')      renderDietRunning();
}

// ── GPS RUN TRACKER ───────────────────────────────────────────────
function startRun() {
  if (!navigator.geolocation) {
    showToast('GPS not available on this device.', 'error'); return;
  }

  // Wall-clock start: record the real timestamp, not a counter
  APP.runSession = {
    startTime:   Date.now(),
    pausedAt:    null,
    totalPaused: 0,
    distance:    0,
    paused:      false,
  };
  APP.gpsCoords = [];
  _saveRunSession();

  navigator.geolocation.getCurrentPosition(() => {
    document.getElementById('run-idle').classList.add('hidden');
    document.getElementById('run-active').classList.remove('hidden');
    _startRunTimerLoop();
    startGPS();
  }, () => {
    // GPS denied — time-only mode
    document.getElementById('run-idle').classList.add('hidden');
    document.getElementById('run-active').classList.remove('hidden');
    showToast('GPS unavailable — time-only mode', 'info');
    _startRunTimerLoop();
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// ── TIMER LOOP (wall-clock based, survives throttling) ────────────
function _startRunTimerLoop() {
  // Clear any existing interval first
  if (APP.runInterval) clearInterval(APP.runInterval);

  APP.runInterval = setInterval(() => {
    if (!APP.runSession || APP.runSession.paused) return;
    updateRunDisplay();
    // Auto-persist every 5 seconds to survive kill
    if (_calcElapsed(APP.runSession) % 5 === 0) _saveRunSession();
  }, 1000);
}

function startGPS() {
  // Clear any stale watcher first
  if (APP.runWatchId != null) {
    navigator.geolocation.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  }

  APP.runWatchId = navigator.geolocation.watchPosition(pos => {
    if (!APP.runSession || APP.runSession.paused) return;
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    if (accuracy > 50) return; // ignore low-accuracy fixes

    const coords = APP.gpsCoords;
    if (coords.length > 0) {
      const prev = coords[coords.length - 1];
      const d    = haversine(prev.lat, prev.lon, lat, lon);
      if (d > 0.005) { // min 5 m to reduce GPS noise
        APP.runSession.distance += d;
        updateRunDisplay();
      }
    }
    coords.push({ lat, lon, ts: Date.now() });
  }, null, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}

function updateRunDisplay() {
  const s = APP.runSession;
  if (!s) return;

  // Use wall-clock elapsed — accurate even after phone lock / tab throttle
  const elapsed = _calcElapsed(s);

  const timerEl = document.getElementById('run-timer');
  const distEl  = document.getElementById('run-dist');
  const paceEl  = document.getElementById('run-pace');
  const calEl   = document.getElementById('run-cal');

  if (timerEl) timerEl.textContent = fmtTime(elapsed);
  if (distEl)  distEl.textContent  = s.distance.toFixed(2);
  if (paceEl)  paceEl.textContent  = fmtPace(s.distance, elapsed);
  if (calEl)   calEl.textContent   = Math.round(s.distance * 60);
}

function togglePauseRun() {
  if (!APP.runSession) return;

  if (!APP.runSession.paused) {
    // ── PAUSING ──
    APP.runSession.paused   = true;
    APP.runSession.pausedAt = Date.now();
    navigator.geolocation?.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  } else {
    // ── RESUMING ──
    // Accumulate how long we were paused
    if (APP.runSession.pausedAt) {
      APP.runSession.totalPaused += (Date.now() - APP.runSession.pausedAt);
    }
    APP.runSession.pausedAt = null;
    APP.runSession.paused   = false;
    startGPS();
  }

  _saveRunSession(); // persist pause state

  const btn = document.getElementById('pause-run-btn');
  if (btn) btn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';
}

function stopRun() {
  clearInterval(APP.runInterval);
  APP.runInterval = null;
  navigator.geolocation?.clearWatch(APP.runWatchId);
  APP.runWatchId = null;

  const s = APP.runSession;
  const elapsed = s ? _calcElapsed(s) : 0;

  if (!s || elapsed < 10) {
    document.getElementById('run-idle').classList.remove('hidden');
    document.getElementById('run-active').classList.add('hidden');
    APP.runSession = null;
    _clearRunSession();
    return;
  }

  // Freeze the final elapsed into the session so saveRun uses it
  s.finalElapsed = elapsed;

  // Show summary
  document.getElementById('run-active').classList.add('hidden');
  document.getElementById('run-summary').classList.remove('hidden');
  document.getElementById('sum-dist').textContent = s.distance.toFixed(2) + ' km';
  document.getElementById('sum-time').textContent = fmtTime(elapsed);
  document.getElementById('sum-pace').textContent = fmtPace(s.distance, elapsed) + ' /km';
  document.getElementById('sum-cal').textContent  = Math.round(s.distance * 60) + ' kcal';
}

function saveRun() {
  const s    = APP.runSession;
  const user = APP.currentUser;
  const elapsed = s.finalElapsed || _calcElapsed(s);

  const log = {
    userId:    user.id,
    email:     user.email,
    date:      todayStr(),
    distance:  parseFloat(s.distance.toFixed(3)),
    duration:  elapsed,
    pace:      parseFloat((elapsed / 60 / Math.max(s.distance, 0.01)).toFixed(2)),
    planType:  APP.selectedPlan || 'Free Run',
    timestamp: new Date().toISOString(),
  };

  Store.addRunLog(log);
  sheetsPost('logRun', log);
  _clearRunSession();
  showToast('Run saved! Great effort! 🏃', 'success');
  discardRun();
  renderRunHistory();
}

function discardRun() {
  clearInterval(APP.runInterval);
  APP.runInterval = null;
  navigator.geolocation?.clearWatch(APP.runWatchId);
  APP.runWatchId = null;
  APP.runSession = null;
  _clearRunSession();
  document.getElementById('run-summary').classList.add('hidden');
  document.getElementById('run-idle').classList.remove('hidden');
}

// ── BACKGROUND / FOREGROUND RECOVERY ─────────────────────────────
// When the user returns from phone lock or switches back to the app,
// restart GPS (it gets killed by Android when backgrounded)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!APP.runSession || APP.runSession.paused) return;

  // Restart GPS watcher — it was likely killed while screen was off
  startGPS();

  // Force immediate display refresh so timer shows correct time instantly
  updateRunDisplay();
});

// ── TRAINING PLANS ────────────────────────────────────────────────
APP.selectedPlan = null;
APP.selectedPlanWeek = 1;

function renderTrainingPlans() {
  const plans     = APP_DATA.running.plans;
  const container = document.getElementById('training-plans-list');

  container.innerHTML = Object.entries(plans).map(([key, plan]) => `
    <div class="plan-card ${APP.selectedPlan === key ? 'selected' : ''}" onclick="selectPlan('${key}')">
      <div class="plan-header" style="background:${plan.color}22;border-bottom:1px solid ${plan.color}33">
        <div>
          <div class="plan-title">${plan.emoji} ${key}</div>
          <div class="plan-sub">${plan.desc}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:24px;color:${plan.color}">${plan.weeks}wk</div>
          <div style="font-size:11px;color:var(--text3)">programme</div>
        </div>
      </div>
    </div>`).join('');

  if (APP.selectedPlan) renderPlanDetail(APP.selectedPlan);
}

function selectPlan(key) {
  APP.selectedPlan     = key;
  APP.selectedPlanWeek = 1;
  renderTrainingPlans();
}

function renderPlanDetail(key) {
  const plan      = APP_DATA.running.plans[key];
  const container = document.getElementById('plan-detail');
  container.style.display = 'block';

  const schedule     = plan.schedule;
  const currentWeek  = APP.selectedPlanWeek;
  const weekSessions = schedule.filter(s => s.week === currentWeek);

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-weight:700;font-size:16px">${plan.emoji} ${key} Plan</div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="changeWeek(-1)" ${currentWeek<=1?'disabled':''}>‹</button>
          <span style="font-size:13px;font-weight:600">Week ${currentWeek}</span>
          <button class="btn btn-ghost btn-sm" onclick="changeWeek(1)" ${currentWeek>=plan.weeks?'disabled':''}>›</button>
        </div>
      </div>
      ${weekSessions.map(s => {
        const isRace = s.type.includes('RACE');
        return `
          <div class="card card-sm" style="margin-bottom:8px;${isRace ? 'border-color:var(--accent);background:rgba(240,192,64,0.08)' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Day ${s.day}</div>
                <div style="font-weight:700;margin-top:3px;${isRace ? 'color:var(--accent)' : ''}">${s.type}</div>
                <div style="font-size:13px;color:var(--text2);margin-top:4px;line-height:1.5">${s.desc}</div>
              </div>
              ${s.dist > 0
                ? `<div style="text-align:right;flex-shrink:0;margin-left:12px">
                    <div style="font-family:var(--font-display);font-size:28px;color:${plan.color}">${s.dist}</div>
                    <div style="font-size:11px;color:var(--text3)">km</div>
                   </div>`
                : `<div class="badge badge-blue">Rest</div>`}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function changeWeek(delta) {
  const plan = APP_DATA.running.plans[APP.selectedPlan];
  APP.selectedPlanWeek = Math.max(1, Math.min(plan.weeks, APP.selectedPlanWeek + delta));
  renderPlanDetail(APP.selectedPlan);
}

// ── RUN HISTORY ───────────────────────────────────────────────────
function renderRunHistory() {
  const user      = APP.currentUser;
  const logs      = Store.getUserRunLogs(user.id).sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 20);
  const container = document.getElementById('run-history-list');
  const statsEl   = document.getElementById('run-stats-row');

  const totalKm   = logs.reduce((a, r) => a + (r.distance || 0), 0);
  const totalRuns = logs.length;
  const avgPace   = logs.length ? logs.reduce((a, r) => a + (r.pace || 0), 0) / logs.length : 0;

  if (statsEl) statsEl.innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="stat-val">${totalRuns}</div><div class="stat-label">Total Runs</div></div>
      <div class="stat-card"><div class="stat-val">${totalKm.toFixed(1)}</div><div class="stat-label">Total km</div></div>
      <div class="stat-card"><div class="stat-val">${avgPace > 0 ? avgPace.toFixed(1) : '--'}</div><div class="stat-label">Avg Pace (min/km)</div></div>
      <div class="stat-card"><div class="stat-val">${Math.round(totalKm * 60)}</div><div class="stat-label">Total kcal</div></div>
    </div>`;

  if (!container) return;
  container.innerHTML = logs.length
    ? logs.map(r => `
        <div class="card card-sm" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:15px">🏃 ${r.planType || 'Free Run'}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:2px">${r.date}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-size:26px;color:var(--g5)">${(r.distance || 0).toFixed(2)}<span style="font-size:14px;color:var(--text2)"> km</span></div>
              <div style="font-size:12px;color:var(--text3)">${fmtTime(r.duration || 0)} · ${fmtPace(r.distance, r.duration)}/km</div>
            </div>
          </div>
        </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">🏃</div><p>No runs logged yet.<br>Start your first run!</p></div>';
}

function renderHydrationRunning() {
  document.getElementById('run-hydration-content').innerHTML = `
    <div style="padding:16px">
      <div class="card" style="background:linear-gradient(135deg,var(--g1),var(--g2));margin-bottom:16px">
        <div class="section-title">Running Day Hydration</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.7">
          Running significantly increases fluid loss. Proper hydration is critical for performance and safety.
        </div>
      </div>
      ${[
        ['Pre-Run (2hr before)',  '500ml water + light electrolytes'],
        ['Pre-Run (15min before)','200ml water'],
        ['During Run (<45min)',   'Every 20 min: 150-200ml water'],
        ['During Run (>45min)',   'Sports drink or water + salt every 20 min'],
        ['Post-Run (30min)',      '500ml + electrolytes to replace losses'],
        ['Post-Run (2hrs)',       'Continue sipping — 1.5L per kg lost'],
      ].map(([t, v]) => `<div class="info-row"><span class="lbl">${t}</span><span class="val" style="font-size:12px;text-align:right;max-width:55%">${v}</span></div>`).join('')}
      <div class="card card-sm" style="margin-top:16px;background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.2)">
        <div style="font-size:13px;color:var(--accent)">⚡ Signs of dehydration: dark urine, headache, fatigue, cramping. Stop and rehydrate immediately.</div>
      </div>
    </div>`;
}

function renderDietRunning() {
  document.getElementById('run-diet-content').innerHTML = `
    <div style="padding:16px">
      <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,var(--g1),var(--g2))">
        <div class="section-title">Running Day Nutrition</div>
        <div style="font-size:13px;color:var(--text2)">Fuel smart. Eat to run, run to fuel.</div>
      </div>
      ${[
        { time:'2-3 hrs before',    name:'Main Pre-Run Meal',  items:'Oats + banana + honey OR toast + peanut butter + banana', cal:350, note:'Easy to digest carbs' },
        { time:'30-60 min before',  name:'Light Top-Up',       items:'Banana or 3-4 dates or energy bar',                      cal:120, note:'Quick-release energy' },
        { time:'During run >60 min',name:'Intra-Run Fuel',     items:'Energy gel, banana chunk, or dates every 45 min',         cal:100, note:'Per serving, as needed' },
        { time:'Within 30 min post',name:'Recovery Window',    items:'Chocolate milk OR protein shake + banana',                cal:300, note:'Critical: 3:1 carb:protein ratio' },
        { time:'1-2 hrs post',      name:'Recovery Meal',      items:'Rice/pasta + grilled chicken/fish + vegetables',          cal:600, note:'Replenish glycogen stores' },
      ].map(m => `
        <div class="card card-sm" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <div>
              <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase">${m.time}</div>
              <div style="font-weight:700;font-size:14px;margin-top:2px">${m.name}</div>
            </div>
            <span class="badge badge-green">${m.cal} kcal</span>
          </div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:3px">${m.items}</div>
          <div style="font-size:12px;color:var(--text3)">📌 ${m.note}</div>
        </div>`).join('')}
    </div>`;
}
