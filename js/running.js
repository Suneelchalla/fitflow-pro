// ── RUNNING PAGE ──────────────────────────────────────────────────

// ── SESSION PERSISTENCE KEY ───────────────────────────────────────
const RUN_SESSION_KEY = 'ff_active_run';

// ════════════════════════════════════════════════════════════════
// LOCK SCREEN DISPLAY — Media Session API + Silent Audio trick
//
// How it works:
//   1. A silent audio element loops in the background — this makes
//      Android treat the PWA like a "media app", activating the
//      Media Session notification card on the lock screen.
//   2. navigator.mediaSession.metadata is updated every 10 seconds
//      with the live timer + distance as the "title" line.
//   3. Only one visible action is registered ("Open App" via the
//      previoustrack slot). play/pause/stop are registered as
//      no-ops so Android does NOT render those buttons.
//   4. The silent audio is a tiny base64-encoded WAV — no extra
//      file needed, no network request.
// ════════════════════════════════════════════════════════════════

// Smallest valid loopable WAV: 0.1 s, 8-bit, 8000 Hz, mono
const SILENT_WAV_B64 =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

const LockScreen = {
  _audio:        null,
  _metaInterval: null,

  // ── Call when a run starts (must be inside a user-gesture handler) ──
  start() {
    if (!('mediaSession' in navigator)) return;
    this._startSilentAudio();
    this._setActions();
    this._updateMeta();                      // immediate first paint
    if (this._metaInterval) clearInterval(this._metaInterval);
    this._metaInterval = setInterval(() => this._updateMeta(), 10000);
  },

  // ── Call when run stops / saved / discarded ──
  stop() {
    this._stopSilentAudio();
    if (this._metaInterval) { clearInterval(this._metaInterval); this._metaInterval = null; }
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata     = null;
    navigator.mediaSession.playbackState = 'none';
    ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, null); } catch {}
    });
  },

  // ── Force immediate metadata refresh ──
  refresh() {
    if (!('mediaSession' in navigator)) return;
    this._updateMeta();
  },

  // ── PRIVATE ──────────────────────────────────────────────────────
  _startSilentAudio() {
    if (this._audio) return;
    const audio  = new Audio(SILENT_WAV_B64);
    audio.loop   = true;
    audio.volume = 0.001;   // near-silent but NOT muted — muted audio won't activate Media Session
    this._audio  = audio;
    audio.play().catch(() => console.warn('FitFlow: silent audio play blocked'));
  },

  _stopSilentAudio() {
    if (!this._audio) return;
    this._audio.pause();
    this._audio.src = '';
    this._audio     = null;
  },

  _updateMeta() {
    const s = APP.runSession;
    if (!s) return;
    const elapsed = _calcElapsed(s);
    const status  = s.paused ? '⏸ Paused' : '🏃 Running';

    navigator.mediaSession.metadata = new MediaMetadata({
      title:   `${status}  ${fmtTime(elapsed)}  ·  ${s.distance.toFixed(2)} km`,
      artist:  `Pace ${fmtPace(s.distance, elapsed)} /km  ·  ${Math.round(s.distance * 60)} kcal`,
      album:   'FitFlow Pro',
      artwork: [{ src: _lockScreenArtwork(), sizes: '512x512', type: 'image/svg+xml' }],
    });
    navigator.mediaSession.playbackState = s.paused ? 'paused' : 'playing';
  },

  _setActions() {
    // "Open App" — tapping on the notification brings the app to front
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.focus();
        if (APP.currentPage !== 'page-running') openModule('running');
      });
    } catch {}

    // Register play/pause/nexttrack as no-ops so Android does NOT
    // render those control buttons on the lock screen widget.
    ['play', 'pause', 'nexttrack'].forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, () => { /* intentional no-op */ }); } catch {}
    });
  },
};

// Green running-figure artwork shown on the lock screen card
function _lockScreenArtwork() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="80" fill="#1a5c32"/>
    <text y="360" x="256" font-size="280" text-anchor="middle" font-family="serif">🏃</text>
    <text y="470" x="256" font-size="72" text-anchor="middle"
          font-family="sans-serif" fill="#7ed9a0" font-weight="bold">FitFlow</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── SESSION PERSISTENCE ───────────────────────────────────────────
function _saveRunSession() {
  if (!APP.runSession) return;
  Store.set(RUN_SESSION_KEY, {
    startTime:   APP.runSession.startTime,
    pausedAt:    APP.runSession.pausedAt    || null,
    totalPaused: APP.runSession.totalPaused || 0,
    distance:    APP.runSession.distance,
    paused:      APP.runSession.paused,
    coords:      APP.gpsCoords.slice(-200),
  });
}

function _clearRunSession() {
  Store.remove(RUN_SESSION_KEY);
}

// ── WALL-CLOCK ELAPSED (immune to setInterval throttling) ─────────
function _calcElapsed(session) {
  const now        = Date.now();
  const paused     = session.totalPaused || 0;
  const pauseExtra = (session.paused && session.pausedAt)
                     ? (now - session.pausedAt) : 0;
  return Math.floor((now - session.startTime - paused - pauseExtra) / 1000);
}

// ── PAGE INIT ─────────────────────────────────────────────────────
function initRunningPage() {
  APP.currentModule = 'running';

  // ── CRASH RECOVERY: restore session if app was killed mid-run ──
  const saved = Store.get(RUN_SESSION_KEY);
  if (saved && !APP.runSession) {
    APP.runSession = {
      startTime:   saved.startTime,
      pausedAt:    saved.pausedAt    || null,
      totalPaused: saved.totalPaused || 0,
      distance:    saved.distance    || 0,
      paused:      saved.paused      || false,
    };
    APP.gpsCoords = saved.coords || [];

    document.getElementById('run-idle')?.classList.add('hidden');
    document.getElementById('run-active')?.classList.remove('hidden');
    document.getElementById('run-summary')?.classList.add('hidden');

    const pauseBtn = document.getElementById('pause-run-btn');
    if (pauseBtn) pauseBtn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';

    _startRunTimerLoop();
    if (!APP.runSession.paused) startGPS();
    LockScreen.start();

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
  // Guard: don't overwrite an already-active run session
  if (APP.runSession) {
    showToast('A run is already in progress!', 'info'); return;
  }

  APP.runSession = {
    startTime:   Date.now(),
    pausedAt:    null,
    totalPaused: 0,
    distance:    0,
    paused:      false,
  };
  APP.gpsCoords = [];
  _saveRunSession();

  navigator.geolocation.getCurrentPosition(
    () => {
      document.getElementById('run-idle').classList.add('hidden');
      document.getElementById('run-active').classList.remove('hidden');
      _startRunTimerLoop();
      startGPS();
      LockScreen.start();     // inside user-gesture → audio plays fine
    },
    () => {
      document.getElementById('run-idle').classList.add('hidden');
      document.getElementById('run-active').classList.remove('hidden');
      showToast('GPS unavailable — time-only mode', 'info');
      _startRunTimerLoop();
      LockScreen.start();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ── TIMER LOOP ────────────────────────────────────────────────────
function _startRunTimerLoop() {
  if (APP.runInterval) clearInterval(APP.runInterval);

  APP.runInterval = setInterval(() => {
    if (!APP.runSession || APP.runSession.paused) return;
    updateRunDisplay();
    const elapsed = _calcElapsed(APP.runSession);
    if (elapsed % 5  === 0) _saveRunSession();   // persist every 5 s
    if (elapsed % 10 === 0) LockScreen.refresh(); // refresh lock screen every 10 s
  }, 1000);
}

function startGPS() {
  if (APP.runWatchId != null) {
    navigator.geolocation.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  }
  APP.runWatchId = navigator.geolocation.watchPosition(pos => {
    if (!APP.runSession || APP.runSession.paused) return;
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    if (accuracy > 50) return;
    const coords = APP.gpsCoords;
    if (coords.length > 0) {
      const prev = coords[coords.length - 1];
      const d    = haversine(prev.lat, prev.lon, lat, lon);
      if (d > 0.005) {
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

// ── PAUSE / RESUME ────────────────────────────────────────────────
function togglePauseRun() {
  if (!APP.runSession) return;

  if (!APP.runSession.paused) {
    APP.runSession.paused   = true;
    APP.runSession.pausedAt = Date.now();
    navigator.geolocation?.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  } else {
    if (APP.runSession.pausedAt) {
      APP.runSession.totalPaused += (Date.now() - APP.runSession.pausedAt);
    }
    APP.runSession.pausedAt = null;
    APP.runSession.paused   = false;
    startGPS();
  }

  _saveRunSession();
  LockScreen.refresh();   // update lock screen with ⏸ / 🏃 status

  const btn = document.getElementById('pause-run-btn');
  if (btn) btn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';
}

// ── STOP ─────────────────────────────────────────────────────────
function stopRun() {
  clearInterval(APP.runInterval);
  APP.runInterval = null;
  navigator.geolocation?.clearWatch(APP.runWatchId);
  APP.runWatchId = null;
  LockScreen.stop();

  const s       = APP.runSession;
  const elapsed = s ? _calcElapsed(s) : 0;

  if (!s || elapsed < 10) {
    document.getElementById('run-idle').classList.remove('hidden');
    document.getElementById('run-active').classList.add('hidden');
    APP.runSession = null;
    _clearRunSession();
    return;
  }

  s.finalElapsed = elapsed;
  document.getElementById('run-active').classList.add('hidden');
  document.getElementById('run-summary').classList.remove('hidden');
  document.getElementById('sum-dist').textContent = s.distance.toFixed(2) + ' km';
  document.getElementById('sum-time').textContent = fmtTime(elapsed);
  document.getElementById('sum-pace').textContent = fmtPace(s.distance, elapsed) + ' /km';
  document.getElementById('sum-cal').textContent  = Math.round(s.distance * 60) + ' kcal';

  // PB detection
  _renderRunPBBadges(s.distance, elapsed);

  // Route map
  _renderRunRouteMap(APP.gpsCoords);
}

// ── SAVE ─────────────────────────────────────────────────────────
function saveRun() {
  const s       = APP.runSession;
  const user    = APP.currentUser;
  const elapsed = s.finalElapsed || _calcElapsed(s);
  const ctx     = APP._planRunCtx || null;

  const log = {
    userId:    user.id,
    email:     user.email,
    date:      todayStr(),
    distance:  parseFloat(s.distance.toFixed(3)),
    duration:  elapsed,
    pace:      parseFloat((elapsed / 60 / Math.max(s.distance, 0.01)).toFixed(2)),
    planType:  ctx ? `${ctx.planKey} · Wk${ctx.week} D${ctx.day}` : (APP.selectedPlan || 'Free Run'),
    timestamp: new Date().toISOString(),
  };

  Store.addRunLog(log);
  sheetsPost('logRun', log);

  // Auto-complete the plan day this run was started from
  if (ctx) {
    const today = todayStr();
    Store.set(_planDayKey(ctx.planKey, ctx.week, ctx.day), {
      date: today, dist: log.distance, dur: elapsed, ts: Date.now()
    });
    // Sync plan day completion to Sheets
    sheetsPost('savePlanDayCompletion', {
      userId:      user.id,
      email:       user.email,
      planKey:     ctx.planKey,
      week:        ctx.week,
      day:         ctx.day,
      completedDate: today,
      distanceKm:  log.distance,
      durationSec: elapsed,
    });
  }

  _clearRunSession();
  LockScreen.stop();
  showToast('Run saved! Great effort! 🏃', 'success');
  discardRun();

  // Return to My Plan tab if that's where the run was started from
  const fromMyPlan = ctx?.fromMyPlan;
  const ctxCopy = ctx ? { ...ctx } : null;
  APP._planRunCtx = null;
  if (fromMyPlan) {
    navTo('myplan');
  } else {
    renderRunHistory();
  }
  if (ctxCopy) checkPlanCompletion(ctxCopy.planKey, ctxCopy.week);
}

// ── DISCARD ───────────────────────────────────────────────────────
function discardRun() {
  clearInterval(APP.runInterval);
  APP.runInterval = null;
  navigator.geolocation?.clearWatch(APP.runWatchId);
  APP.runWatchId = null;
  APP.runSession = null;
  _clearRunSession();
  LockScreen.stop();
  document.getElementById('run-summary').classList.add('hidden');
  document.getElementById('run-idle').classList.remove('hidden');
}

// ── BACKGROUND / FOREGROUND RECOVERY ─────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!APP.runSession || APP.runSession.paused) return;
  startGPS();           // restart GPS — was killed while screen was off
  updateRunDisplay();   // snap timer to correct wall-clock time instantly
  LockScreen.refresh(); // re-sync lock screen immediately
});

// ── TRAINING PLANS ────────────────────────────────────────────────
APP.selectedPlan     = null;
APP.selectedPlanWeek = 1;

// ── PLAN DAY COMPLETION HELPERS ───────────────────────────────────
function _planDayKey(planKey, week, day) {
  return `ff_pday_${APP.currentUser?.id}_${planKey}_w${week}_d${day}`;
}
function isPlanDayDone(planKey, week, day) {
  return !!Store.get(_planDayKey(planKey, week, day));
}
function _markPlanDayDone(planKey, week, day, distKm, durSecs) {
  const user = APP.currentUser;
  const today = todayStr();
  Store.set(_planDayKey(planKey, week, day), {
    date: today, dist: distKm || 0, dur: durSecs || 0, ts: Date.now()
  });
  // Sync day completion to Sheets
  if (user) {
    sheetsPost('savePlanDayCompletion', {
      userId:      user.id,
      email:       user.email,
      planKey,
      week,
      day,
      completedDate: today,
      distanceKm:  distKm  || 0,
      durationSec: durSecs || 0,
    });
  }
  // Also log as a run entry if there was distance or time
  if (distKm > 0 || durSecs > 0) {
    const log = {
      userId:    user.id,
      email:     user.email,
      date:      today,
      distance:  parseFloat((distKm  || 0).toFixed(3)),
      duration:  durSecs || 0,
      pace:      (durSecs && distKm > 0) ? parseFloat((durSecs / 60 / distKm).toFixed(2)) : 0,
      planType:  `${planKey} · Wk${week} D${day}`,
      timestamp: new Date().toISOString(),
    };
    Store.addRunLog(log);
    sheetsPost('logRun', log);
  }
}
function confirmMarkPlanDone(planKey, week, day, dist, dur) {
  if (isPlanDayDone(planKey, week, day)) return;
  _markPlanDayDone(planKey, week, day, dist, dur);
  showToast('Day marked complete! 🎉', 'success');
  renderRunHistory();
  checkPlanCompletion(planKey, week);
}
function startPlanDayRun(planKey, week, day, targetDist) {
  APP._planRunCtx  = { planKey, week, day, targetDist, fromMyPlan: APP.currentPage === 'page-my-plan' };
  APP.selectedPlan = planKey;
  openModule('running');
  setTimeout(() => {
    renderRunningTabs('log');
    setTimeout(() => startRun(), 150);
  }, 200);
}
function _renderWeekProgress(planKey, week, sessions, color) {
  const runSessions = sessions.filter(s => s.dist > 0 || s.type.includes('RACE'));
  const done  = runSessions.filter(s => isPlanDayDone(planKey, week, s.day)).length;
  const total = runSessions.length || sessions.length;
  const pct   = total > 0 ? Math.round(done / total * 100) : 0;
  return `
    <div style="display:flex;align-items:center;gap:10px">
      <div style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:width .4s"></div>
      </div>
      <span style="font-size:12px;color:var(--text3);flex-shrink:0">${done}/${total} done</span>
    </div>`;
}


function getActivePlanKey() {
  const uid = APP.currentUser?.id;
  return uid ? `ff_activeplan_${uid}` : null;
}
function getActivePlan() {
  const k = getActivePlanKey();
  return k ? Store.get(k) : null;        // { planKey, startDate, startWeek }
}
function setActivePlan(planKey) {
  const k    = getActivePlanKey();
  if (!k) return;
  const data = { planKey, startDate: todayStr(), registeredAt: Date.now() };
  Store.set(k, data);
  _refreshMyPlanNav();
  // Sync to Sheets (non-blocking)
  const user = APP.currentUser;
  if (user) {
    sheetsPost('savePlanRegistration', {
      userId:       user.id,
      email:        user.email,
      planKey,
      startDate:    data.startDate,
      registeredAt: new Date(data.registeredAt).toISOString(),
    });
  }
}
function clearActivePlan() {
  const k = getActivePlanKey();
  if (k) Store.remove(k);
  _refreshMyPlanNav();
  // Sync to Sheets (non-blocking)
  const user = APP.currentUser;
  if (user) sheetsPost('clearActivePlan', { userId: user.id });
}

// Show / hide "My Plan" bottom nav tab based on whether user has registered a plan
function _refreshMyPlanNav() {
  const tab   = document.getElementById('nav-myplan');
  const label = document.getElementById('nav-myplan-label');
  if (!tab) return;
  const active = getActivePlan();
  if (active) {
    const plan  = APP_DATA.running.plans[active.planKey];
    tab.style.display = '';
    if (label) label.textContent = plan ? active.planKey : 'My Plan';
  } else {
    tab.style.display = 'none';
  }
}

// ── REGISTER PLAN ─────────────────────────────────────────────────
function registerPlan(planKey) {
  const existing = getActivePlan();
  if (existing && existing.planKey === planKey) {
    closeModal('modal-choose-plan');
    showToast(`You're already on the ${planKey} plan! 💪`, 'info');
    navTo('myplan');
    return;
  }
  if (existing && existing.planKey !== planKey) {
    if (!confirm(`You're already on the ${existing.planKey} plan. Switch to ${planKey}? Your progress will be kept.`)) return;
  }
  setActivePlan(planKey);
  closeModal('modal-choose-plan');
  showToast(`✅ Registered for ${planKey} plan! Check your new tab.`, 'success');
  navTo('myplan');
}

// Show the choose-plan bottom sheet (from My Plan tab header)
function showChangePlanSheet() {
  const plans     = APP_DATA.running.plans;
  const active    = getActivePlan();
  const container = document.getElementById('choose-plan-list');
  container.innerHTML = Object.entries(plans).map(([key, plan]) => {
    const isActive = active?.planKey === key;
    return `
      <div class="card card-sm" style="cursor:pointer;border-color:${isActive ? plan.color : 'var(--border)'};background:${isActive ? plan.color+'11' : ''}"
           onclick="registerPlan('${key}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:700;font-size:15px">${plan.emoji} ${key}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px">${plan.desc}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px">
            <div style="font-family:var(--font-display);font-size:22px;color:${plan.color}">${plan.weeks}wk</div>
            ${isActive ? `<div style="font-size:10px;color:var(--g5);font-weight:700">ACTIVE</div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
  openModal('modal-choose-plan');
}

// ── MY PLAN PAGE ──────────────────────────────────────────────────
function openMyPlanPage() {
  showPage('page-my-plan', false);
  APP._myPlanViewWeek = null;
  renderMyPlan();
}

function renderMyPlan() {
  const container = document.getElementById('myplan-content');
  const active    = getActivePlan();

  // Update header title
  const titleEl = document.getElementById('myplan-title');

  if (!active) {
    // No plan registered — show picker inline
    if (titleEl) titleEl.textContent = '🎯 Choose a Plan';
    const plans = APP_DATA.running.plans;
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:28px 20px;background:linear-gradient(135deg,var(--bg2),var(--surface));margin-bottom:20px">
        <div style="font-size:48px;margin-bottom:12px">🏃</div>
        <div style="font-weight:700;font-size:18px;margin-bottom:6px">No Plan Registered</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6">Pick a training plan below and it will live right here in this tab — your daily schedule, progress and run launcher all in one place.</div>
      </div>
      <div class="section-title" style="margin-bottom:12px">Choose Your Goal</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${Object.entries(plans).map(([key, plan]) => `
          <div class="card" style="cursor:pointer;border-color:${plan.color}44;background:${plan.color}0a"
               onclick="registerPlan('${key}')">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:700;font-size:16px">${plan.emoji} ${key} Training Plan</div>
                <div style="font-size:13px;color:var(--text2);margin-top:3px">${plan.desc}</div>
                <div style="font-size:12px;color:${plan.color};margin-top:5px;font-weight:600">${plan.weeks} weeks · starts today</div>
              </div>
              <div style="font-family:var(--font-display);font-size:36px;color:${plan.color};margin-left:12px;flex-shrink:0">${plan.weeks}w</div>
            </div>
          </div>`).join('')}
      </div>`;
    return;
  }

  const plan      = APP_DATA.running.plans[active.planKey];
  if (!plan) { clearActivePlan(); renderMyPlan(); return; }

  // Calculate current week based on registration date
  const daysSince  = Math.floor((Date.now() - active.registeredAt) / 86400000);
  const curWeek    = Math.min(plan.weeks, Math.max(1, Math.floor(daysSince / 7) + 1));
  // Allow user to override week view
  if (APP._myPlanViewWeek == null) APP._myPlanViewWeek = curWeek;
  const viewWeek   = APP._myPlanViewWeek;

  if (titleEl) titleEl.textContent = `${plan.emoji} ${active.planKey} Plan`;

  // Build all days for the view week
  const weekSessions = plan.schedule.filter(s => s.week === viewWeek);
  const allDays      = [];
  for (let d = 1; d <= 6; d++) {
    const found = weekSessions.find(s => s.day === d);
    allDays.push(found || { week: viewWeek, day: d, type: 'Rest', dist: 0, dur: 0, desc: 'Rest day — recovery is part of training.' });
  }

  const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const totalWeeks  = plan.weeks;
  // Overall plan completion %
  let doneTotal = 0, sessTotal = 0;
  for (let w = 1; w <= totalWeeks; w++) {
    const wSess = plan.schedule.filter(s => s.week === w && (s.dist > 0 || s.type.includes('RACE')));
    sessTotal += wSess.length || 6;
    wSess.forEach(s => { if (isPlanDayDone(active.planKey, w, s.day)) doneTotal++; });
  }
  const overallPct = sessTotal > 0 ? Math.round(doneTotal / sessTotal * 100) : 0;

  container.innerHTML = `
    <!-- Plan header banner -->
    <div class="card" style="background:linear-gradient(135deg,${plan.color}22,${plan.color}08);border-color:${plan.color}44;margin-bottom:16px;padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-weight:700">Active Plan</div>
          <div style="font-family:var(--font-display);font-size:30px;color:${plan.color};line-height:1;margin-top:4px">${active.planKey}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">${plan.desc}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          <div style="font-family:var(--font-display);font-size:38px;color:${plan.color};line-height:1">${overallPct}%</div>
          <div style="font-size:11px;color:var(--text3)">complete</div>
        </div>
      </div>
      <!-- Overall progress bar -->
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div style="width:${overallPct}%;height:100%;background:${plan.color};border-radius:3px;transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:var(--text3)">Week ${curWeek} of ${totalWeeks} · Started ${active.startDate}</div>
        <button onclick="clearActivePlan();renderMyPlan()" style="background:none;border:none;color:var(--text3);font-size:11px;cursor:pointer;text-decoration:underline">Unregister</button>
      </div>
    </div>

    <!-- Week navigator -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-weight:700;font-size:15px">
        Week ${viewWeek}
        ${viewWeek === curWeek ? `<span style="background:${plan.color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px">CURRENT</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="changeMyPlanWeek(-1)" ${viewWeek<=1?'disabled':''}>‹</button>
        <span style="font-size:12px;color:var(--text3)">${viewWeek}/${totalWeeks}</span>
        <button class="btn btn-ghost btn-sm" onclick="changeMyPlanWeek(1)" ${viewWeek>=totalWeeks?'disabled':''}>›</button>
      </div>
    </div>

    <!-- Week progress bar -->
    <div style="margin-bottom:14px">${_renderWeekProgress(active.planKey, viewWeek, allDays, plan.color)}</div>

    <!-- Day cards -->
    ${allDays.map(s => {
      const isRace   = s.type.includes('RACE');
      const isRest   = s.dist === 0 && !isRace;
      const isDone   = isPlanDayDone(active.planKey, s.week, s.day);
      const doneData = isDone ? Store.get(_planDayKey(active.planKey, s.week, s.day)) : null;

      return `
        <div class="card card-sm" style="margin-bottom:10px;
          ${isDone ? 'border-color:rgba(67,160,90,0.5);background:rgba(67,160,90,0.06)' : ''}
          ${isRace && !isDone ? 'border-color:var(--accent);background:rgba(240,192,64,0.08)' : ''}
        ">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${isDone?'4':'10'}px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${DAY_NAMES[s.day-1]}</span>
                ${isDone ? `<span style="background:rgba(67,160,90,0.85);color:white;font-size:10px;font-weight:700;padding:1px 8px;border-radius:10px">✓ DONE</span>` : ''}
                ${isRace && !isDone ? `<span style="background:var(--accent);color:#000;font-size:10px;font-weight:700;padding:1px 8px;border-radius:10px">🏆 RACE</span>` : ''}
              </div>
              <div style="font-weight:700;margin-top:3px;font-size:15px;${isRace?'color:var(--accent)':''}${isDone?'color:var(--g5)':''}">${s.type}</div>
              <div style="font-size:13px;color:var(--text2);margin-top:4px;line-height:1.5">${s.desc}</div>
              ${isDone && doneData?.dist > 0
                ? `<div style="font-size:12px;color:var(--g5);margin-top:5px">📍 ${doneData.dist.toFixed(2)} km · ${fmtTime(doneData.dur||0)} · ${doneData.date}</div>`
                : isDone
                  ? `<div style="font-size:12px;color:var(--text3);margin-top:4px">Completed ${doneData?.date||'earlier'}</div>`
                  : ''}
            </div>
            ${s.dist > 0
              ? `<div style="text-align:right;flex-shrink:0;margin-left:12px">
                  <div style="font-family:var(--font-display);font-size:28px;color:${isDone?'var(--g5)':plan.color}">${s.dist}</div>
                  <div style="font-size:11px;color:var(--text3)">km</div>
                 </div>`
              : `<div class="badge badge-blue" style="flex-shrink:0;margin-left:8px;align-self:flex-start">Rest</div>`}
          </div>

          ${!isDone ? `
            <div style="display:flex;gap:8px">
              ${!isRest ? `
                <button class="btn btn-primary btn-sm" style="flex:1;background:${plan.color};border-color:${plan.color}"
                  onclick="startPlanDayRun('${active.planKey}',${s.week},${s.day},${s.dist})">
                  ▶ Start Run
                </button>` : ''}
              <button class="btn ${isRest?'btn-primary':'btn-ghost'} btn-sm" style="${isRest?'flex:1;':''}"
                onclick="confirmMarkPlanDone('${active.planKey}',${s.week},${s.day},${s.dist},${s.dur});renderMyPlan()">
                ${isRest ? '✓ Mark Rest Done' : '✓ Log Manually'}
              </button>
            </div>
          ` : `<div style="text-align:center;font-size:12px;color:var(--g5)">✅ Session complete!</div>`}
        </div>`;
    }).join('')}

    <!-- Quick jump to running page for free runs -->
    <div class="card card-sm" style="margin-top:6px;background:rgba(30,136,229,0.06);border-color:rgba(30,136,229,0.2);text-align:center;cursor:pointer" onclick="openModule('running')">
      <div style="font-size:13px;color:#64b5f6">🏃 Want a free run outside the plan? <strong>Open Running →</strong></div>
    </div>

    <!-- ── Hydration & Diet section ── -->
    <div style="margin-top:20px">

      <!-- Pill tabs -->
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button id="myplan-tab-hydration"
          onclick="switchMyPlanInfoTab('hydration')"
          style="flex:1;padding:9px 0;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;
                 background:rgba(30,136,229,0.15);border:1px solid rgba(30,136,229,0.35);color:#64b5f6;
                 transition:all .2s">
          💧 Hydration
        </button>
        <button id="myplan-tab-diet"
          onclick="switchMyPlanInfoTab('diet')"
          style="flex:1;padding:9px 0;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;
                 background:transparent;border:1px solid var(--border);color:var(--text3);
                 transition:all .2s">
          🥗 Diet
        </button>
      </div>

      <!-- Hydration content -->
      <div id="myplan-info-hydration">
        <div class="card" style="background:linear-gradient(135deg,rgba(30,136,229,0.12),rgba(30,136,229,0.04));border-color:rgba(30,136,229,0.25);margin-bottom:12px;padding:16px 16px 12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:28px">💧</span>
            <div>
              <div style="font-weight:700;font-size:15px">Running Day Hydration</div>
              <div style="font-size:12px;color:var(--text3)">Fluid loss increases significantly while running</div>
            </div>
          </div>
        </div>
        ${[
          { phase:'Pre-Run',    icon:'🌅', time:'2 hrs before',   tip:'500ml water + light electrolytes', color:'rgba(30,136,229,0.12)', border:'rgba(30,136,229,0.25)' },
          { phase:'Pre-Run',    icon:'⏱',  time:'15 min before',  tip:'200ml water — top up the tank',    color:'rgba(30,136,229,0.08)', border:'rgba(30,136,229,0.2)'  },
          { phase:'During',     icon:'🏃', time:'< 45 min run',   tip:'150–200ml every 20 min',           color:'rgba(67,160,90,0.1)',   border:'rgba(67,160,90,0.25)'  },
          { phase:'During',     icon:'⚡', time:'> 45 min run',   tip:'Sports drink or water + salt every 20 min', color:'rgba(67,160,90,0.12)', border:'rgba(67,160,90,0.3)' },
          { phase:'Post-Run',   icon:'🔄', time:'Within 30 min',  tip:'500ml + electrolytes',             color:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)' },
          { phase:'Post-Run',   icon:'💤', time:'Next 2 hrs',     tip:'Keep sipping — 1.5L per kg lost',  color:'rgba(240,192,64,0.08)', border:'rgba(240,192,64,0.2)' },
        ].map(h => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;margin-bottom:8px;
                      background:${h.color};border:1px solid ${h.border}">
            <span style="font-size:22px;flex-shrink:0">${h.icon}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3)">${h.phase}</span>
                <span style="font-size:10px;color:var(--text3)">·</span>
                <span style="font-size:11px;color:var(--text2)">${h.time}</span>
              </div>
              <div style="font-size:13px;font-weight:600;color:var(--text);margin-top:2px">${h.tip}</div>
            </div>
          </div>`).join('')}
        <div style="padding:12px 14px;border-radius:12px;background:rgba(240,192,64,0.08);border:1px solid rgba(240,192,64,0.2);margin-top:4px">
          <div style="font-size:12px;color:var(--accent);line-height:1.6">⚡ <strong>Watch for:</strong> dark urine, headache, fatigue, cramping — stop and rehydrate immediately.</div>
        </div>
      </div>

      <!-- Diet content (hidden by default) -->
      <div id="myplan-info-diet" style="display:none">
        <div class="card" style="background:linear-gradient(135deg,rgba(67,160,90,0.12),rgba(67,160,90,0.04));border-color:rgba(67,160,90,0.25);margin-bottom:12px;padding:16px 16px 12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:28px">🥗</span>
            <div>
              <div style="font-weight:700;font-size:15px">Running Day Nutrition</div>
              <div style="font-size:12px;color:var(--text3)">Fuel smart — eat to run, run to fuel</div>
            </div>
          </div>
        </div>
        ${[
          { time:'2–3 hrs before',     emoji:'🍌', name:'Pre-Run Meal',      cal:350, color:'rgba(30,136,229,0.1)',   border:'rgba(30,136,229,0.2)',  items:'Oats + banana + honey  OR  toast + peanut butter + banana',         note:'Easy-to-digest carbs only' },
          { time:'30–60 min before',   emoji:'⚡', name:'Light Top-Up',      cal:120, color:'rgba(30,136,229,0.07)', border:'rgba(30,136,229,0.15)', items:'Banana, 3–4 dates, or an energy bar',                               note:'Quick-release energy boost' },
          { time:'During  > 60 min',   emoji:'🏃', name:'Intra-Run Fuel',    cal:100, color:'rgba(67,160,90,0.1)',   border:'rgba(67,160,90,0.2)',   items:'Energy gel, banana chunk, or dates every 45 min',                   note:'Per serving, repeat as needed' },
          { time:'Within 30 min post', emoji:'🥛', name:'Recovery Window',   cal:300, color:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)', items:'Chocolate milk  OR  protein shake + banana',                        note:'Critical: 3:1 carb-to-protein ratio' },
          { time:'1–2 hrs post',       emoji:'🍚', name:'Recovery Meal',     cal:600, color:'rgba(67,160,90,0.08)', border:'rgba(67,160,90,0.18)',  items:'Rice / pasta + grilled chicken or fish + vegetables',               note:'Replenish glycogen stores' },
        ].map(m => `
          <div style="padding:13px 14px;border-radius:14px;margin-bottom:10px;background:${m.color};border:1px solid ${m.border}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:22px">${m.emoji}</span>
                <div>
                  <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${m.time}</div>
                  <div style="font-weight:700;font-size:14px;color:var(--text)">${m.name}</div>
                </div>
              </div>
              <span style="background:rgba(67,160,90,0.2);color:var(--g5);font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;flex-shrink:0;margin-left:8px">${m.cal} kcal</span>
            </div>
            <div style="font-size:13px;color:var(--text2);margin-bottom:4px;line-height:1.5">${m.items}</div>
            <div style="font-size:11px;color:var(--text3)">📌 ${m.note}</div>
          </div>`).join('')}
      </div>

    </div>
  `;
}

function changeMyPlanWeek(delta) {
  const active = getActivePlan();
  if (!active) return;
  const plan   = APP_DATA.running.plans[active.planKey];
  APP._myPlanViewWeek = Math.max(1, Math.min(plan.weeks, (APP._myPlanViewWeek || 1) + delta));
  renderMyPlan();
}

function switchMyPlanInfoTab(tab) {
  const hydEl  = document.getElementById('myplan-info-hydration');
  const dietEl = document.getElementById('myplan-info-diet');
  const hydBtn = document.getElementById('myplan-tab-hydration');
  const dietBtn= document.getElementById('myplan-tab-diet');
  if (!hydEl || !dietEl) return;

  if (tab === 'hydration') {
    hydEl.style.display  = '';
    dietEl.style.display = 'none';
    hydBtn.style.background  = 'rgba(30,136,229,0.15)';
    hydBtn.style.borderColor = 'rgba(30,136,229,0.35)';
    hydBtn.style.color       = '#64b5f6';
    dietBtn.style.background  = 'transparent';
    dietBtn.style.borderColor = 'var(--border)';
    dietBtn.style.color       = 'var(--text3)';
  } else {
    hydEl.style.display  = 'none';
    dietEl.style.display = '';
    dietBtn.style.background  = 'rgba(67,160,90,0.15)';
    dietBtn.style.borderColor = 'rgba(67,160,90,0.35)';
    dietBtn.style.color       = 'var(--g5)';
    hydBtn.style.background  = 'transparent';
    hydBtn.style.borderColor = 'var(--border)';
    hydBtn.style.color       = 'var(--text3)';
  }
}

function renderTrainingPlans() {
  const plans     = APP_DATA.running.plans;
  const active    = getActivePlan();
  const container = document.getElementById('training-plans-list');
  container.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
      Register a plan to get a dedicated tab in the bottom nav with your daily schedule, progress tracker, and one-tap run starter.
    </div>
    ${Object.entries(plans).map(([key, plan]) => {
      const isActive = active?.planKey === key;
      return `
        <div class="plan-card ${APP.selectedPlan === key ? 'selected' : ''}" onclick="selectPlan('${key}')">
          <div class="plan-header" style="background:${plan.color}22;border-bottom:1px solid ${plan.color}33">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <div class="plan-title">${plan.emoji} ${key}</div>
                ${isActive ? `<span style="background:${plan.color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">ACTIVE</span>` : ''}
              </div>
              <div class="plan-sub">${plan.desc}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;margin-left:10px">
              <div style="font-family:var(--font-display);font-size:24px;color:${plan.color};line-height:1">${plan.weeks}wk</div>
              <button class="btn btn-sm" style="background:${isActive?plan.color:'transparent'};border:1px solid ${plan.color};color:${isActive?'white':plan.color};font-size:11px;padding:4px 10px;font-weight:700"
                onclick="event.stopPropagation();registerPlan('${key}')">
                ${isActive ? '✓ Registered' : '＋ Register'}
              </button>
            </div>
          </div>
        </div>`;
    }).join('')}`;
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
  const weekSessions = plan.schedule.filter(s => s.week === APP.selectedPlanWeek);

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-weight:700;font-size:16px">${plan.emoji} ${key} Plan</div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="changeWeek(-1)" ${APP.selectedPlanWeek<=1?'disabled':''}>‹</button>
          <span style="font-size:13px;font-weight:600">Week ${APP.selectedPlanWeek}</span>
          <button class="btn btn-ghost btn-sm" onclick="changeWeek(1)" ${APP.selectedPlanWeek>=plan.weeks?'disabled':''}>›</button>
        </div>
      </div>
      ${weekSessions.map(s => {
        const isRace = s.type.includes('RACE');
        return `
          <div class="card card-sm" style="margin-bottom:8px;${isRace?'border-color:var(--accent);background:rgba(240,192,64,0.08)':''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Day ${s.day}</div>
                <div style="font-weight:700;margin-top:3px;${isRace?'color:var(--accent)':''}">${s.type}</div>
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
              <div style="font-family:var(--font-display);font-size:26px;color:var(--g5)">${(r.distance||0).toFixed(2)}<span style="font-size:14px;color:var(--text2)"> km</span></div>
              <div style="font-size:12px;color:var(--text3)">${fmtTime(r.duration||0)} · ${fmtPace(r.distance,r.duration)}/km</div>
            </div>
          </div>
        </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">🏃</div><p>No runs logged yet.<br>Start your first run!</p></div>';
}

// ── HYDRATION & DIET ──────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════
// PERSONAL BESTS
// ════════════════════════════════════════════════════════════════
function _getPBs(userId) {
  return Store.get('ff_pbs_' + userId, { distance: 0, pace: 9999, duration: 0 });
}
function _savePBs(userId, pbs) {
  Store.set('ff_pbs_' + userId, pbs);
}

function _renderRunPBBadges(distance, elapsed) {
  const el = document.getElementById('sum-pb-badges');
  if (!el) return;
  const user   = APP.currentUser;
  const pbs    = _getPBs(user.id);
  const pace   = distance > 0 ? elapsed / 60 / distance : 9999;
  const badges = [];
  const newPbs = { ...pbs };

  if (distance > 0 && distance > (pbs.distance || 0)) {
    badges.push(`<span style="background:var(--accent);color:#000;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">🏆 NEW PB — Longest Run!</span>`);
    newPbs.distance = distance;
  }
  if (distance >= 0.5 && pace < (pbs.pace || 9999)) {
    badges.push(`<span style="background:rgba(30,136,229,0.8);color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">⚡ NEW PB — Best Pace!</span>`);
    newPbs.pace = pace;
  }
  if (elapsed > (pbs.duration || 0)) {
    badges.push(`<span style="background:rgba(67,160,90,0.8);color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">⏱ NEW PB — Longest Time!</span>`);
    newPbs.duration = elapsed;
  }

  if (badges.length) {
    _savePBs(user.id, newPbs);
    el.innerHTML = badges.join('');
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════════
// RUN ROUTE MAP (SVG canvas from GPS coords)
// ════════════════════════════════════════════════════════════════
function _renderRunRouteMap(coords) {
  const el = document.getElementById('sum-route-map');
  if (!el) return;

  // Filter valid coords
  const pts = (coords || []).filter(c => c.lat && c.lon);
  if (pts.length < 2) { el.innerHTML = ''; return; }

  // Bounding box
  const lats = pts.map(p => p.lat);
  const lons = pts.map(p => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const padPct = 0.15;
  const latRange = (maxLat - minLat) || 0.001;
  const lonRange = (maxLon - minLon) || 0.001;

  const W = 340, H = 200;
  const toX = lon => ((lon - minLon) / lonRange * (1 - 2*padPct) + padPct) * W;
  const toY = lat => ((1 - (lat - minLat) / latRange) * (1 - 2*padPct) + padPct) * H;

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`).join(' ');
  const start = pts[0], end = pts[pts.length - 1];

  el.innerHTML = `
    <div class="card card-sm" style="padding:12px">
      <div style="font-size:12px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📍 Your Route</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="border-radius:8px;background:var(--bg3)">
        <!-- Grid lines -->
        <line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        <!-- Route shadow -->
        <path d="${pathD}" fill="none" stroke="rgba(46,125,70,0.3)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Route line -->
        <path d="${pathD}" fill="none" stroke="var(--g4)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Start dot -->
        <circle cx="${toX(start.lon).toFixed(1)}" cy="${toY(start.lat).toFixed(1)}" r="6" fill="var(--g5)" stroke="white" stroke-width="2"/>
        <!-- End dot -->
        <circle cx="${toX(end.lon).toFixed(1)}" cy="${toY(end.lat).toFixed(1)}" r="6" fill="var(--accent)" stroke="white" stroke-width="2"/>
      </svg>
      <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--text3)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--g5);margin-right:4px;vertical-align:middle"></span>Start</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin-right:4px;vertical-align:middle"></span>Finish</span>
        <span style="margin-left:auto">${pts.length} GPS points</span>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// PLAN COMPLETION CERTIFICATE
// ════════════════════════════════════════════════════════════════
function checkPlanCompletion(planKey, week) {
  const plan   = APP_DATA.running.plans[planKey];
  if (!plan || week < plan.weeks) return;
  const active = getActivePlan();
  if (!active || active.planKey !== planKey) return;

  // Check all sessions in final week done
  const finalWeek = plan.schedule.filter(s => s.week === plan.weeks);
  const allDone   = finalWeek.every(s => isPlanDayDone(planKey, plan.weeks, s.day));
  if (!allDone) return;

  // Check not already celebrated
  const celebKey = `ff_plan_cert_${APP.currentUser.id}_${planKey}`;
  if (Store.get(celebKey)) return;
  Store.set(celebKey, todayStr());

  setTimeout(() => showPlanCertificate(planKey), 500);
}

function showPlanCertificate(planKey) {
  const plan = APP_DATA.running.plans[planKey];
  const user = APP.currentUser;
  document.getElementById('plan-complete-content').innerHTML = `
    <div style="padding:20px 8px">
      <div style="font-size:64px;margin-bottom:8px">🏆</div>
      <div style="font-family:var(--font-display);font-size:36px;color:var(--accent);margin-bottom:4px">FINISHER!</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">${plan.emoji} ${planKey} Plan Complete</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:16px">
        Congratulations <strong>${user.name.split(' ')[0]}</strong>!<br>
        You completed all ${plan.weeks} weeks of the ${planKey} training plan. That's real dedication! 💪
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:14px;margin-bottom:8px">
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Certificate of Completion</div>
        <div style="font-size:15px;font-weight:700;margin-top:6px">${user.name}</div>
        <div style="font-size:13px;color:var(--text2)">${planKey} Training Programme · ${plan.weeks} Weeks</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">Completed ${todayStr()}</div>
      </div>
    </div>`;
  openModal('modal-plan-complete');
}

function sharePlanCertificate() {
  const active = getActivePlan();
  if (!active) return;
  const plan = APP_DATA.running.plans[active.planKey];
  const text = `🏆 I just completed the ${active.planKey} (${plan.weeks}-week) training plan on FitFlow Pro! 💪 #FitFlowPro #Running #${active.planKey}`;
  if (navigator.share) {
    navigator.share({ title: 'FitFlow Pro — Plan Complete!', text }).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(text).then(()=>showToast('Copied to clipboard!','success'));
  }
}
