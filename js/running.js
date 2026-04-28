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
}

// ── SAVE ─────────────────────────────────────────────────────────
function saveRun() {
  const s       = APP.runSession;
  const user    = APP.currentUser;
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
  LockScreen.stop();
  showToast('Run saved! Great effort! 🏃', 'success');
  discardRun();
  renderRunHistory();
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
