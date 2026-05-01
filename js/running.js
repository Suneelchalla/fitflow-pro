// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — running.js  (fully fixed)
// Bugs fixed:
//  1. haversine was missing — now confirmed available from app.js
//  2. Zig-zag GPS lines — GPS warm-up period + rolling accuracy filter
//  3. Data lost on bg/close — save on every GPS point + pagehide event
//  4. Session not restored on dashboard load — global recovery hook
//  5. Silent GPS error handler — replaced null with proper callback
//  6. fmtTime / fmtPace — confirmed in app.js, load order safe
//  7. Silent discard <10 s — toast added
//  8. Route map distortion for tiny movements — better padding/scaling
//  9. 200-coord cap — raised to 2000, thinned for memory
// 10. Calorie formula — corrected to 70 kcal/km
// ════════════════════════════════════════════════════════════════

// ── SESSION PERSISTENCE KEY ───────────────────────────────────────
const RUN_SESSION_KEY = 'ff_active_run';

// ── ACTIVITY TYPE ─────────────────────────────────────────────────
// 'run' | 'walk' | 'cycle'
// Calorie multipliers (kcal/km): run=70, walk=50, cycle=40
const ACTIVITY_META = {
  run:   { emoji: '🏃', label: 'Run',   kcalPerKm: 70, color: '#43a05a' },
  walk:  { emoji: '🚶', label: 'Walk',  kcalPerKm: 50, color: '#1e88e5' },
  cycle: { emoji: '🚴', label: 'Cycle', kcalPerKm: 40, color: '#f0c040' },
};
let _activityType = 'run';   // selected on idle screen, saved with run

function selectActivityType(type, el) {
  _activityType = type;
  document.querySelectorAll('.activity-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const meta = ACTIVITY_META[type];
  const emojiEl = document.getElementById('run-idle-emoji');
  const labelEl = document.getElementById('run-idle-label');
  if (emojiEl) emojiEl.textContent = meta.emoji;
  if (labelEl) labelEl.textContent = 'START A ' + meta.label.toUpperCase();
}

// ── LEAFLET MAP INSTANCES ─────────────────────────────────────────
let _liveMap      = null;
let _livePolyline = null;
let _liveMarker   = null;
let _sumMap       = null;
let _userPanned   = false;   // true when user has manually panned — stops auto-recentering

// ── SCREEN WAKE LOCK — keeps GPS alive when screen locks ──────────
let _wakeLock = null;

async function _requestWakeLock() {
  // Screen Wake Lock API — prevents CPU throttling of GPS on Android
  if ('wakeLock' in navigator) {
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => {
        // Re-request if released unexpectedly (e.g. tab hidden then restored)
        if (APP.runSession && !APP.runSession.paused) {
          setTimeout(_requestWakeLock, 500);
        }
      });
    } catch (e) {
      // Wake lock denied — fall through to audio keepalive only
      console.warn('Wake lock denied:', e.message);
    }
  }
}

function _releaseWakeLock() {
  if (_wakeLock) {
    _wakeLock.release().catch(() => {});
    _wakeLock = null;
  }
}

// ════════════════════════════════════════════════════════════════
// LOCK SCREEN DISPLAY — Media Session API + Silent Audio trick
// ════════════════════════════════════════════════════════════════
const SILENT_WAV_B64 =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

const LockScreen = {
  _audio:        null,
  _metaInterval: null,

  start() {
    if (!('mediaSession' in navigator)) return;
    this._startSilentAudio();
    this._setActions();
    this._updateMeta();
    if (this._metaInterval) clearInterval(this._metaInterval);
    this._metaInterval = setInterval(() => this._updateMeta(), 10000);
  },

  stop() {
    this._stopSilentAudio();
    if (this._metaInterval) { clearInterval(this._metaInterval); this._metaInterval = null; }
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata      = null;
    navigator.mediaSession.playbackState = 'none';
    ['play','pause','previoustrack','nexttrack'].forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, null); } catch {}
    });
  },

  refresh() {
    if (!('mediaSession' in navigator)) return;
    this._updateMeta();
  },

  _startSilentAudio() {
    if (this._audio) return;
    const audio  = new Audio(SILENT_WAV_B64);
    audio.loop   = true;
    audio.volume = 0.001;
    this._audio  = audio;
    audio.play().catch(() => {});
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
    const meta    = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   `${status}  ${fmtTime(elapsed)}  ·  ${s.distance.toFixed(2)} km`,
      artist:  `Pace ${fmtPace(s.distance, elapsed)} /km  ·  ${Math.round(s.distance * meta.kcalPerKm)} kcal`,
      album:   'FitFlow Pro',
      artwork: [{ src: _lockScreenArtwork(), sizes: '512x512', type: 'image/svg+xml' }],
    });
    navigator.mediaSession.playbackState = s.paused ? 'paused' : 'playing';
  },

  _setActions() {
    try {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.focus();
        if (APP.currentPage !== 'page-running') openModule('running');
      });
    } catch {}
    ['play','pause','nexttrack'].forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, () => {}); } catch {}
    });
  },
};

function _lockScreenArtwork() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="80" fill="#0a3d1f"/>
    <polygon points="290,60 180,280 255,280 220,452 340,220 265,220" fill="#4caf50"/>
    <polygon points="290,60 180,280 255,280 220,452 340,220 265,220" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── SESSION PERSISTENCE ───────────────────────────────────────────
function _saveRunSession() {
  if (!APP.runSession) return;
  let coordsToSave = APP.gpsCoords;
  if (coordsToSave.length > 2000) {
    coordsToSave = coordsToSave.filter((_, i) => i % 2 === 0);
  }
  Store.set(RUN_SESSION_KEY, {
    startTime:    APP.runSession.startTime,
    pausedAt:     APP.runSession.pausedAt    || null,
    totalPaused:  APP.runSession.totalPaused || 0,
    distance:     APP.runSession.distance,
    paused:       APP.runSession.paused,
    activityType: APP.runSession.activityType || _activityType,
    coords:       coordsToSave,
  });
}

function _clearRunSession() {
  Store.remove(RUN_SESSION_KEY);
}

// ── WALL-CLOCK ELAPSED ────────────────────────────────────────────
function _calcElapsed(session) {
  const now        = Date.now();
  const paused     = session.totalPaused || 0;
  const pauseExtra = (session.paused && session.pausedAt)
                     ? (now - session.pausedAt) : 0;
  return Math.floor((now - session.startTime - paused - pauseExtra) / 1000);
}

// ── FIX #3: Save on pagehide (fires reliably on Android before kill) ──
window.addEventListener('pagehide', () => {
  if (APP.runSession) _saveRunSession();
});
// Also save whenever page becomes hidden (screen off, app switch)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && APP.runSession) {
    _saveRunSession();
  }
});

// ── FIX #4: Global session recovery — runs wherever the app starts ──
// Called from DOMContentLoaded in app.js AFTER login, but we also
// call it whenever initRunningPage fires. Belt-and-suspenders.
function _tryRecoverRunSession() {
  const saved = Store.get(RUN_SESSION_KEY);
  if (!saved || APP.runSession) return;

  APP.runSession = {
    startTime:    saved.startTime,
    pausedAt:     saved.pausedAt    || null,
    totalPaused:  saved.totalPaused || 0,
    distance:     saved.distance    || 0,
    paused:       saved.paused      || false,
    activityType: saved.activityType || 'run',
  };
  APP.gpsCoords  = saved.coords || [];
  _activityType  = APP.runSession.activityType;

  _startRunTimerLoop();
  if (!APP.runSession.paused) startGPS();
  LockScreen.start();
  showToast('Run restored — still tracking! 🏃', 'success');
}

// ── PAGE INIT ─────────────────────────────────────────────────────
function initRunningPage() {
  APP.currentModule = 'running';

  _tryRecoverRunSession();

  if (APP.runSession) {
    // Show active run UI (hides idle, shows full-screen map state)
    document.getElementById('run-idle')?.style.setProperty('display','none');
    document.getElementById('run-active')?.classList.remove('hidden');
    document.getElementById('run-summary')?.classList.add('hidden');
    const pauseBtn = document.getElementById('pause-run-btn');
    if (pauseBtn) pauseBtn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';
    // Re-init live map with existing coords
    _initLiveMap();
    if (APP.gpsCoords.length > 1) _redrawLivePolyline();
  } else {
    document.getElementById('run-idle')?.style.setProperty('display','flex');
    document.getElementById('run-active')?.classList.add('hidden');
    document.getElementById('run-summary')?.classList.add('hidden');
  }

  renderRunningTabs('log');
  renderRunHistory();
}

function renderRunningTabs(tab) {
  document.querySelectorAll('.run-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.run-tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.run-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('run-tab-' + tab)?.classList.add('active');
  if (tab === 'plans')        renderTrainingPlans();
  if (tab === 'history')      renderRunHistory();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'hydration')    renderHydrationRunning();
  if (tab === 'diet')         renderDietRunning();
}

// ── LEAFLET LOADER ────────────────────────────────────────────────
// Loads Leaflet JS from CDN once, then calls the callback
function _loadLeaflet(cb) {
  if (window.L) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

// ── ZOOM HELPER (called by +/− buttons) ───────────────────────────
function _liveMapZoom(delta) {
  if (!_liveMap) return;
  if (delta > 0) _liveMap.zoomIn(); else _liveMap.zoomOut();
}

// ── LIVE MAP (during active run) ──────────────────────────────────
function _initLiveMap() {
  _loadLeaflet(() => {
    const container = document.getElementById('run-live-map');
    if (!container) return;

    if (_liveMap) { _liveMap.remove(); _liveMap = null; _livePolyline = null; _liveMarker = null; }
    _userPanned = false;

    const startCoord = APP.gpsCoords.length > 0
      ? [APP.gpsCoords[APP.gpsCoords.length - 1].lat, APP.gpsCoords[APP.gpsCoords.length - 1].lon]
      : [20.5937, 78.9629];

    _liveMap = L.map(container, {
      zoomControl:        false,
      attributionControl: false,
      dragging:           true,
      scrollWheelZoom:    false,
      tap:                false,   // prevent Leaflet tap hijacking button taps
      touchZoom:          true,    // pinch to zoom
      doubleClickZoom:    false,
      bounceAtZoomLimits: false,
    }).setView(startCoord, 17);

    // Detect when user manually pans — stop auto-recentering
    _liveMap.on('dragstart', () => { _userPanned = true; });
    // After 8s of no pan, re-enable auto-center
    _liveMap.on('dragend', () => {
      clearTimeout(_liveMap._recenterTimer);
      _liveMap._recenterTimer = setTimeout(() => { _userPanned = false; }, 8000);
    });

    // Re-center button (shown when user has panned away)
    const recenterBtn = L.control({ position: 'bottomleft' });
    recenterBtn.onAdd = () => {
      const btn = L.DomUtil.create('button', '');
      btn.innerHTML   = '⊙';
      btn.title       = 'Re-center on my location';
      btn.style.cssText = `
        width:36px;height:36px;border-radius:10px;
        background:rgba(7,21,16,0.88);border:1px solid rgba(255,255,255,0.2);
        color:#fff;font-size:18px;cursor:pointer;display:flex;
        align-items:center;justify-content:center;backdrop-filter:blur(8px);
        touch-action:manipulation;
      `;
      L.DomEvent.on(btn, 'click', () => {
        _userPanned = false;
        if (_gpsLastGoodFix) {
          _liveMap.setView([_gpsLastGoodFix.lat, _gpsLastGoodFix.lon], _liveMap.getZoom(), { animate: true });
        }
      });
      L.DomEvent.disableClickPropagation(btn);
      return btn;
    };
    recenterBtn.addTo(_liveMap);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(_liveMap);

    _livePolyline = L.polyline([], {
      color:   '#ff6b35',
      weight:  5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin:'round',
    }).addTo(_liveMap);

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#4285f4;border:3px solid #fff;
        box-shadow:0 0 0 6px rgba(66,133,244,0.25);
      "></div>`,
      iconSize:   [18, 18],
      iconAnchor: [9, 9],
    });
    _liveMarker = L.marker(startCoord, { icon, zIndexOffset: 1000, interactive: false }).addTo(_liveMap);

    if (APP.gpsCoords.length > 0) _redrawLivePolyline();
  });
}

function _redrawLivePolyline() {
  if (!_liveMap || !_livePolyline) return;
  const latlngs = APP.gpsCoords.map(c => [c.lat, c.lon]);
  _livePolyline.setLatLngs(latlngs);
}

function _updateLiveMap(lat, lon) {
  if (!_liveMap) return;
  const pos = [lat, lon];
  if (_liveMarker) _liveMarker.setLatLng(pos);
  // Only auto-center if user hasn't manually panned away
  if (!_userPanned) {
    _liveMap.setView(pos, _liveMap.getZoom(), { animate: true, duration: 0.6 });
  }
  if (_livePolyline) _livePolyline.addLatLng(pos);
}

function _destroyLiveMap() {
  if (_liveMap) { _liveMap.remove(); _liveMap = null; }
  _livePolyline = null;
  _liveMarker   = null;
}

// ── GPS BADGE UPDATE ──────────────────────────────────────────────
function _setGpsBadge(ok) {
  const el = document.getElementById('run-gps-badge');
  if (!el) return;
  el.textContent        = ok ? 'GPS ●' : 'GPS ○';
  el.style.background   = ok ? 'rgba(67,160,90,0.85)' : 'rgba(229,57,53,0.75)';
}

// ── GPS RUN TRACKER ───────────────────────────────────────────────

// FIX #2: GPS warm-up state — skip first N fixes while device acquires lock
const GPS_WARMUP_FIXES    = 5;    // discard first 5 positions (device triangulating)
const GPS_MIN_ACCURACY_M  = 40;   // reject if worse than 40 m
const GPS_MIN_DISTANCE_KM = 0.005; // ignore movement < 5 m (standing still jitter)

let _gpsWarmupCount = 0;          // counts received fixes during warmup phase
let _gpsLastGoodFix = null;       // last confirmed-accurate position

function startRun() {
  if (!navigator.geolocation) {
    showToast('GPS not available on this device.', 'error');
    return;
  }
  if (APP.runSession) {
    showToast('A run is already in progress!', 'info');
    return;
  }

  const meta = ACTIVITY_META[_activityType] || ACTIVITY_META.run;

  APP.runSession = {
    startTime:    Date.now(),
    pausedAt:     null,
    totalPaused:  0,
    distance:     0,
    paused:       false,
    activityType: _activityType,
  };
  APP.gpsCoords   = [];
  _gpsWarmupCount = 0;
  _gpsLastGoodFix = null;
  _saveRunSession();

  // Update active run header label with activity type
  const labelEl = document.getElementById('run-active-label');
  if (labelEl) labelEl.textContent = meta.emoji + ' ' + meta.label;

  navigator.geolocation.getCurrentPosition(
    () => {
      document.getElementById('run-idle').style.display = 'none';
      document.getElementById('run-active').classList.remove('hidden');
      _startRunTimerLoop();
      _initLiveMap();
      startGPS();
      _requestWakeLock();   // keep GPS alive when screen locks
      LockScreen.start();
    },
    () => {
      document.getElementById('run-idle').style.display = 'none';
      document.getElementById('run-active').classList.remove('hidden');
      showToast('GPS unavailable — time-only mode 🕐', 'info');
      _initLiveMap();
      _startRunTimerLoop();
      _requestWakeLock();
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
    // FIX #3: save every 3 s (was 5 s — more reliable on throttled bg timers)
    if (elapsed % 3  === 0) _saveRunSession();
    if (elapsed % 10 === 0) LockScreen.refresh();
  }, 1000);
}

// ── FIX #2 + #5: GPS watch with warm-up filter and error handler ──
function startGPS() {
  if (APP.runWatchId != null) {
    navigator.geolocation.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  }

  _gpsWarmupCount = 0;   // reset warmup whenever we (re)start GPS

  APP.runWatchId = navigator.geolocation.watchPosition(
    // ── Success callback ─────────────────────────────────────────
    pos => {
      if (!APP.runSession || APP.runSession.paused) return;

      const { latitude: lat, longitude: lon, accuracy } = pos.coords;

      // FIX #2a: Reject inaccurate fixes
      if (accuracy > GPS_MIN_ACCURACY_M) return;

      _setGpsBadge(true);

      // FIX #2b: Warmup — skip first N accurate fixes while GPS stabilises
      if (_gpsWarmupCount < GPS_WARMUP_FIXES) {
        _gpsWarmupCount++;
        _gpsLastGoodFix = { lat, lon, ts: Date.now() };
        // Still update map position during warmup so user sees their dot
        _updateLiveMap(lat, lon);
        return;
      }

      // FIX #2c: Compute distance from last GOOD fix
      if (_gpsLastGoodFix) {
        const d = haversine(_gpsLastGoodFix.lat, _gpsLastGoodFix.lon, lat, lon);
        if (d >= GPS_MIN_DISTANCE_KM) {
          APP.runSession.distance += d;
          updateRunDisplay();
          _saveRunSession();
        }
        if (d >= GPS_MIN_DISTANCE_KM) {
          _gpsLastGoodFix = { lat, lon, ts: Date.now() };
        }
      } else {
        _gpsLastGoodFix = { lat, lon, ts: Date.now() };
      }

      // Store coord and update live map
      APP.gpsCoords.push({ lat, lon, ts: Date.now() });
      _updateLiveMap(lat, lon);
    },

    // ── FIX #5: Error callback ────────────────────────────────────
    err => {
      if (!APP.runSession || APP.runSession.paused) return;
      _setGpsBadge(false);
      let msg = 'GPS signal lost.';
      if (err.code === 1) msg = 'Location access denied. Running in time-only mode.';
      else if (err.code === 3) msg = 'GPS timeout — retrying…';
      showToast(msg, 'info');
      if (err.code === 3) {
        setTimeout(() => {
          if (APP.runSession && !APP.runSession.paused) startGPS();
        }, 5000);
      }
    },

    { enableHighAccuracy: true, maximumAge: 1500, timeout: 15000 }
  );
}

function updateRunDisplay() {
  const s = APP.runSession;
  if (!s) return;
  const elapsed  = _calcElapsed(s);
  const meta     = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  const speedKph = elapsed > 0 ? (s.distance / elapsed * 3600) : 0;

  const timerEl = document.getElementById('run-timer');
  const distEl  = document.getElementById('run-dist');
  const paceEl  = document.getElementById('run-pace');
  const speedEl = document.getElementById('run-speed');
  const calEl   = document.getElementById('run-cal');

  if (timerEl) timerEl.textContent = fmtTime(elapsed);
  if (distEl)  distEl.textContent  = s.distance.toFixed(2);
  if (paceEl)  paceEl.textContent  = fmtPace(s.distance, elapsed);
  if (speedEl) speedEl.textContent = speedKph.toFixed(1);
  if (calEl)   calEl.textContent   = Math.round(s.distance * meta.kcalPerKm);
}

// ── PAUSE / RESUME ────────────────────────────────────────────────
function togglePauseRun() {
  if (!APP.runSession) return;

  if (!APP.runSession.paused) {
    APP.runSession.paused   = true;
    APP.runSession.pausedAt = Date.now();
    if (APP.runWatchId != null) {
      navigator.geolocation.clearWatch(APP.runWatchId);
      APP.runWatchId = null;
    }
    _setGpsBadge(false);
  } else {
    if (APP.runSession.pausedAt) {
      APP.runSession.totalPaused += (Date.now() - APP.runSession.pausedAt);
    }
    APP.runSession.pausedAt = null;
    APP.runSession.paused   = false;
    _gpsWarmupCount = 0;
    _gpsLastGoodFix = null;
    startGPS();
  }

  _saveRunSession();
  LockScreen.refresh();

  const btn = document.getElementById('pause-run-btn');
  if (btn) btn.textContent = APP.runSession.paused ? '▶ Resume' : '⏸ Pause';
}

// ── STOP ──────────────────────────────────────────────────────────
function stopRun() {
  clearInterval(APP.runInterval);
  APP.runInterval = null;
  if (APP.runWatchId != null) {
    navigator.geolocation.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  }
  LockScreen.stop();
  _releaseWakeLock();
  _destroyLiveMap();

  const s       = APP.runSession;
  const elapsed = s ? _calcElapsed(s) : 0;

  if (!s || elapsed < 10) {
    document.getElementById('run-idle').style.display = 'flex';
    document.getElementById('run-active').classList.add('hidden');
    APP.runSession = null;
    _clearRunSession();
    if (elapsed > 0) showToast('Run was too short — not saved.', 'info');
    return;
  }

  const meta     = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  const speedKph = elapsed > 0 ? (s.distance / elapsed * 3600) : 0;
  s.finalElapsed = elapsed;

  // Switch active → summary
  document.getElementById('run-active').classList.add('hidden');
  document.getElementById('run-summary').classList.remove('hidden');

  // Update summary header label
  const sumLabel = document.getElementById('sum-activity-label');
  if (sumLabel) sumLabel.textContent = meta.emoji + ' ' + meta.label + ' Complete!';

  // Fill stats
  document.getElementById('sum-dist').textContent  = s.distance.toFixed(2) + ' km';
  document.getElementById('sum-time').textContent  = fmtTime(elapsed);
  document.getElementById('sum-pace').textContent  = fmtPace(s.distance, elapsed);
  document.getElementById('sum-speed').textContent = speedKph.toFixed(1) + ' km/h';
  document.getElementById('sum-cal').textContent   = Math.round(s.distance * meta.kcalPerKm) + ' kcal';

  _renderRunPBBadges(s.distance, elapsed);
  _renderRunRouteMap(APP.gpsCoords);
}

// ── SAVE ──────────────────────────────────────────────────────────
function saveRun() {
  const s       = APP.runSession;
  const user    = APP.currentUser;
  const elapsed = s.finalElapsed || _calcElapsed(s);
  const ctx     = APP._planRunCtx || null;
  const meta    = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;

  const log = {
    userId:       user.id,
    email:        user.email,
    date:         todayStr(),
    distance:     parseFloat(s.distance.toFixed(3)),
    duration:     elapsed,
    pace:         parseFloat((elapsed / 60 / Math.max(s.distance, 0.01)).toFixed(2)),
    activityType: s.activityType || _activityType,
    planType:     ctx ? `${ctx.planKey} · Wk${ctx.week} D${ctx.day}` : (APP.selectedPlan || ('Free ' + meta.label)),
    timestamp:    new Date().toISOString(),
    // Save coords for history detail map (thin to max 500 points to keep storage small)
    coords:       APP.gpsCoords.length > 500
                    ? APP.gpsCoords.filter((_, i) => i % Math.ceil(APP.gpsCoords.length / 500) === 0)
                    : APP.gpsCoords.slice(),
  };

  Store.addRunLog(log);
  sheetsPost('logRun', log);
  setTimeout(() => checkAndUnlockAchievements(user.id), 800);

  if (ctx) {
    const today = todayStr();
    Store.set(_planDayKey(ctx.planKey, ctx.week, ctx.day), {
      date: today, dist: log.distance, dur: elapsed, ts: Date.now()
    });
    sheetsPost('savePlanDayCompletion', {
      userId:        user.id,
      email:         user.email,
      planKey:       ctx.planKey,
      week:          ctx.week,
      day:           ctx.day,
      completedDate: today,
      distanceKm:    log.distance,
      durationSec:   elapsed,
    });
  }

  _clearRunSession();
  LockScreen.stop();
  showToast('Run saved! Great effort! 🏃', 'success');
  discardRun();

  const fromMyPlan = ctx?.fromMyPlan;
  const ctxCopy    = ctx ? { ...ctx } : null;
  APP._planRunCtx  = null;
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
  if (APP.runWatchId != null) {
    navigator.geolocation.clearWatch(APP.runWatchId);
    APP.runWatchId = null;
  }
  APP.runSession  = null;
  _gpsWarmupCount = 0;
  _gpsLastGoodFix = null;
  _clearRunSession();
  LockScreen.stop();
  _releaseWakeLock();
  _destroyLiveMap();

  // Destroy summary map too to free memory
  if (_sumMap) { _sumMap.remove(); _sumMap = null; }

  document.getElementById('run-summary')?.classList.add('hidden');
  document.getElementById('run-active')?.classList.add('hidden');
  document.getElementById('run-idle').style.display = 'flex';
}

// ── BACKGROUND / FOREGROUND RECOVERY ─────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!APP.runSession || APP.runSession.paused) return;
  _gpsWarmupCount = 0;
  _gpsLastGoodFix = null;
  _setGpsBadge(false);   // will turn green when GPS lock re-acquired
  startGPS();
  updateRunDisplay();
  LockScreen.refresh();
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
  const user  = APP.currentUser;
  const today = todayStr();
  Store.set(_planDayKey(planKey, week, day), {
    date: today, dist: distKm || 0, dur: durSecs || 0, ts: Date.now()
  });
  if (user) {
    sheetsPost('savePlanDayCompletion', {
      userId:        user.id,
      email:         user.email,
      planKey, week, day,
      completedDate: today,
      distanceKm:    distKm  || 0,
      durationSec:   durSecs || 0,
    });
  }
  if (distKm > 0 || durSecs > 0) {
    const log = {
      userId:       user.id,
      email:        user.email,
      date:         today,
      distance:     parseFloat((distKm  || 0).toFixed(3)),
      duration:     durSecs || 0,
      pace:         (durSecs && distKm > 0) ? parseFloat((durSecs / 60 / distKm).toFixed(2)) : 0,
      planType:     `${planKey} · Wk${week} D${day}`,
      timestamp:    new Date().toISOString(),
      activityType: 'run',  // manual plan entries are always runs
      coords:       [],     // no GPS data for manual entries
    };
    Store.addRunLog(log);
    sheetsPost('logRun', log);
    setTimeout(() => checkAndUnlockAchievements(user.id), 800);
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
  return k ? Store.get(k) : null;
}
function setActivePlan(planKey) {
  const k    = getActivePlanKey();
  if (!k) return;
  const data = { planKey, startDate: todayStr(), registeredAt: Date.now() };
  Store.set(k, data);
  _refreshMyPlanNav();
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
  const user = APP.currentUser;
  if (user) sheetsPost('clearActivePlan', { userId: user.id });
}
function confirmUnregisterPlan(planKey) {
  const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[planKey];
  if (!confirm(`Unregister from the ${planKey} plan?\n\nYour completed sessions and run logs are saved and will not be deleted. You can re-register anytime.`)) return;
  clearActivePlan();
  showToast(`Unregistered from ${planKey} plan. Your progress is saved.`, 'info');
  renderMyPlan();
  renderTrainingPlans();
}

function _refreshMyPlanNav() {
  const tab    = document.getElementById('nav-myplan');
  const label  = document.getElementById('nav-myplan-label');
  const runTab = document.querySelector('.nav-item[data-nav="running"]');
  if (!tab) return;
  const active = getActivePlan();
  if (active) {
    const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey];
    tab.style.display = '';
    if (label) label.textContent = plan ? active.planKey : 'My Plan';
    if (runTab) runTab.style.display = 'none';
  } else {
    tab.style.display = 'none';
    if (runTab) runTab.style.display = '';
  }
}

function registerPlan(planKey) {
  const existing = getActivePlan();
  if (existing && existing.planKey === planKey) {
    showToast(`You are already on the ${planKey} plan! 💪`, 'info');
    navTo('myplan');
    return;
  }
  if (existing && existing.planKey !== planKey) {
    showToast(`You are currently on the ${existing.planKey} plan. Please unregister it first before joining ${planKey}.`, 'warn');
    navTo('myplan');
    renderTrainingPlans();
    return;
  }
  setActivePlan(planKey);
  showToast(`✅ Registered for ${planKey} plan! Your daily schedule is ready.`, 'success');
  navTo('myplan');
}

function showChangePlanSheet() {
  const plans     = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans;
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
  const titleEl   = document.getElementById('myplan-title');

  if (active && (!(window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey] || !active.registeredAt)) {
    clearActivePlan();
    showToast('Your previous plan was reset — please register again.', 'info');
    renderMyPlan();
    return;
  }

  if (!active) {
    if (titleEl) titleEl.textContent = '🎯 Choose a Plan';
    const plans = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans;
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:28px 20px;background:linear-gradient(135deg,var(--bg2),var(--surface));margin-bottom:20px">
        <div style="font-size:48px;margin-bottom:12px">🏃</div>
        <div style="font-weight:700;font-size:18px;margin-bottom:6px">No Plan Registered</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6">Pick a training plan below and it will live right here in this tab — your daily schedule, progress and run launcher all in one place.</div>
      </div>
      <div class="section-title" style="margin-bottom:12px">Choose Your Goal</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${Object.entries(plans).map(([key, plan]) => `
          <div class="card" style="border-color:${plan.color}44;background:${plan.color}0a">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="flex:1">
                <div style="font-weight:700;font-size:16px">${plan.emoji} ${key} Training Plan</div>
                <div style="font-size:13px;color:var(--text2);margin-top:3px">${plan.desc}</div>
                <div style="font-size:12px;color:${plan.color};margin-top:5px;font-weight:600">${plan.weeks} weeks · starts today</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:12px;flex-shrink:0">
                <div style="font-family:var(--font-display);font-size:32px;color:${plan.color};line-height:1">${plan.weeks}w</div>
                <button class="btn btn-sm" style="background:${plan.color};border:none;color:white;font-size:12px;font-weight:700;padding:6px 16px;border-radius:20px"
                  onclick="registerPlan('${key}')">
                  ＋ Register
                </button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
    return;
  }

  const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey];
  if (!plan) { clearActivePlan(); renderMyPlan(); return; }

  const daysSince = Math.floor((Date.now() - active.registeredAt) / 86400000);
  const curWeek   = Math.min(plan.weeks, Math.max(1, Math.floor(daysSince / 7) + 1));
  if (APP._myPlanViewWeek == null) APP._myPlanViewWeek = curWeek;
  const viewWeek  = APP._myPlanViewWeek;

  if (titleEl) titleEl.textContent = `${plan.emoji} ${active.planKey} Plan`;

  const weekSessions = plan.schedule.filter(s => s.week === viewWeek);
  const allDays      = [];
  for (let d = 1; d <= 6; d++) {
    const found = weekSessions.find(s => s.day === d);
    allDays.push(found || { week: viewWeek, day: d, type: 'Rest', dist: 0, dur: 0, desc: 'Rest day — recovery is part of training.' });
  }

  const DAY_NAMES  = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const totalWeeks = plan.weeks;
  let doneTotal = 0, sessTotal = 0;
  for (let w = 1; w <= totalWeeks; w++) {
    const wSess = plan.schedule.filter(s => s.week === w && (s.dist > 0 || s.type.includes('RACE')));
    sessTotal += wSess.length || 6;
    wSess.forEach(s => { if (isPlanDayDone(active.planKey, w, s.day)) doneTotal++; });
  }
  const overallPct = sessTotal > 0 ? Math.round(doneTotal / sessTotal * 100) : 0;

  container.innerHTML = `
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
      <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:10px">
        <div style="width:${overallPct}%;height:100%;background:${plan.color};border-radius:3px;transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:var(--text3)">Week ${curWeek} of ${totalWeeks} · Started ${active.startDate}</div>
        <button onclick="confirmUnregisterPlan('${active.planKey}')"
          style="background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.4);color:#ef5350;
            font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;cursor:pointer">
          ✕ Unregister
        </button>
      </div>
    </div>

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

    <div style="margin-bottom:14px">${_renderWeekProgress(active.planKey, viewWeek, allDays, plan.color)}</div>

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

    <div class="card card-sm" style="margin-top:6px;background:rgba(30,136,229,0.06);border-color:rgba(30,136,229,0.2);text-align:center;cursor:pointer" onclick="openModule('running')">
      <div style="font-size:13px;color:#64b5f6">🏃 Want a free run outside the plan? <strong>Open Running →</strong></div>
    </div>

    <div style="margin-top:20px">
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button id="myplan-tab-hydration"
          onclick="switchMyPlanInfoTab('hydration')"
          style="flex:1;padding:9px 0;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;
                 background:rgba(30,136,229,0.15);border:1px solid rgba(30,136,229,0.35);color:#64b5f6;transition:all .2s">
          💧 Hydration
        </button>
        <button id="myplan-tab-diet"
          onclick="switchMyPlanInfoTab('diet')"
          style="flex:1;padding:9px 0;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;
                 background:transparent;border:1px solid var(--border);color:var(--text3);transition:all .2s">
          🥗 Diet
        </button>
      </div>

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
          { phase:'Pre-Run',  icon:'🌅', time:'2 hrs before',  tip:'500ml water + light electrolytes', color:'rgba(30,136,229,0.12)', border:'rgba(30,136,229,0.25)' },
          { phase:'Pre-Run',  icon:'⏱',  time:'15 min before', tip:'200ml water — top up the tank',   color:'rgba(30,136,229,0.08)', border:'rgba(30,136,229,0.2)'  },
          { phase:'During',   icon:'🏃', time:'< 45 min run',  tip:'150–200ml every 20 min',          color:'rgba(67,160,90,0.1)',   border:'rgba(67,160,90,0.25)'  },
          { phase:'During',   icon:'⚡', time:'> 45 min run',  tip:'Sports drink or water + salt every 20 min', color:'rgba(67,160,90,0.12)', border:'rgba(67,160,90,0.3)' },
          { phase:'Post-Run', icon:'🔄', time:'Within 30 min', tip:'500ml + electrolytes',            color:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)' },
          { phase:'Post-Run', icon:'💤', time:'Next 2 hrs',    tip:'Keep sipping — 1.5L per kg lost', color:'rgba(240,192,64,0.08)', border:'rgba(240,192,64,0.2)' },
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
          { time:'2–3 hrs before',     emoji:'🍌', name:'Pre-Run Meal',    cal:350, color:'rgba(30,136,229,0.1)',   border:'rgba(30,136,229,0.2)',  items:'Oats + banana + honey  OR  toast + peanut butter + banana',   note:'Easy-to-digest carbs only' },
          { time:'30–60 min before',   emoji:'⚡', name:'Light Top-Up',    cal:120, color:'rgba(30,136,229,0.07)', border:'rgba(30,136,229,0.15)', items:'Banana, 3–4 dates, or an energy bar',                         note:'Quick-release energy boost' },
          { time:'During  > 60 min',   emoji:'🏃', name:'Intra-Run Fuel',  cal:100, color:'rgba(67,160,90,0.1)',   border:'rgba(67,160,90,0.2)',   items:'Energy gel, banana chunk, or dates every 45 min',             note:'Per serving, repeat as needed' },
          { time:'Within 30 min post', emoji:'🥛', name:'Recovery Window', cal:300, color:'rgba(240,192,64,0.1)', border:'rgba(240,192,64,0.25)', items:'Chocolate milk  OR  protein shake + banana',                  note:'Critical: 3:1 carb-to-protein ratio' },
          { time:'1–2 hrs post',       emoji:'🍚', name:'Recovery Meal',   cal:600, color:'rgba(67,160,90,0.08)', border:'rgba(67,160,90,0.18)', items:'Rice / pasta + grilled chicken or fish + vegetables',          note:'Replenish glycogen stores' },
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
  const plan  = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey];
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
    hydBtn.style.background   = 'transparent';
    hydBtn.style.borderColor  = 'var(--border)';
    hydBtn.style.color        = 'var(--text3)';
  }
}

function renderTrainingPlans() {
  const plans     = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans;
  const active    = getActivePlan();
  const container = document.getElementById('training-plans-list');
  container.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
      ${active
        ? `You are registered on the <strong style="color:${plans[active.planKey]?.color}">${active.planKey} plan</strong>. Unregister it first to switch to a different plan.`
        : 'Choose a plan below to get your daily schedule, progress tracker and one-tap run starter.'}
    </div>
    ${Object.entries(plans).map(([key, plan]) => {
      const isActive  = active?.planKey === key;
      const isBlocked = active && !isActive;
      return `
        <div class="plan-card ${APP.selectedPlan === key ? 'selected' : ''}" onclick="selectPlan('${key}')">
          <div class="plan-header" style="background:${plan.color}22;border-bottom:1px solid ${plan.color}33">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <div class="plan-title">${plan.emoji} ${key}</div>
                ${isActive  ? `<span style="background:${plan.color};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px">● ACTIVE</span>` : ''}
                ${isBlocked ? `<span style="background:rgba(255,255,255,0.1);color:var(--text3);font-size:10px;padding:2px 8px;border-radius:10px">Locked</span>` : ''}
              </div>
              <div class="plan-sub">${plan.desc}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;margin-left:10px">
              <div style="font-family:var(--font-display);font-size:24px;color:${isBlocked ? 'var(--text3)' : plan.color};line-height:1">${plan.weeks}wk</div>
              ${isActive
                ? `<button class="btn btn-sm" style="background:rgba(239,83,80,0.15);border:1px solid #ef5350;color:#ef5350;font-size:11px;padding:4px 10px;font-weight:700"
                    onclick="event.stopPropagation();confirmUnregisterPlan('${key}')">
                    ✕ Unregister
                  </button>`
                : `<button class="btn btn-sm" style="background:transparent;border:1px solid ${isBlocked ? 'var(--border)' : plan.color};color:${isBlocked ? 'var(--text3)' : plan.color};font-size:11px;padding:4px 10px;font-weight:700;${isBlocked ? 'opacity:0.4;cursor:not-allowed' : ''}"
                    onclick="event.stopPropagation();${isBlocked ? "showToast('Unregister your current plan first.','warn')" : `registerPlan('${key}')`}">
                    ＋ Register
                  </button>`}
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
  const plan      = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[key];
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
  const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[APP.selectedPlan];
  APP.selectedPlanWeek = Math.max(1, Math.min(plan.weeks, APP.selectedPlanWeek + delta));
  renderPlanDetail(APP.selectedPlan);
}

// ── RUN HISTORY ───────────────────────────────────────────────────
function renderAchievements() {
  const user      = APP.currentUser;
  const unlocked  = _getAchievements(user.id);
  const stats     = _buildRunStats(user.id);
  const container = document.getElementById('run-achievements-content');
  if (!container) return;

  const unlockedCount = Object.keys(unlocked).length;
  const totalCount    = ACHIEVEMENTS.length;
  const pct           = Math.round(unlockedCount / totalCount * 100);

  const categories = [
    { label: '👟 Runs Completed',  ids: ['first_run','runs_5','runs_10','runs_25','runs_50','runs_100'] },
    { label: '📏 Total Distance',  ids: ['dist_1k','dist_5k','dist_10k','dist_21k','dist_42k','dist_100k','dist_500k'] },
    { label: '🎯 Single Run',      ids: ['single_5k','single_10k','single_hm','single_fm'] },
    { label: '⚡ Speed',           ids: ['pace_7','pace_6','pace_5','pace_4'] },
    { label: '🔥 Streaks',         ids: ['streak_3','streak_7','streak_14','streak_30'] },
    { label: '🏆 Plans Completed', ids: ['plan_5k','plan_10k','plan_hm','plan_fm'] },
    { label: '✨ Special',         ids: ['early_bird','night_runner','rain_runner'] },
  ];

  container.innerHTML = `
    <div style="padding:16px;background:linear-gradient(135deg,var(--g1),var(--g2));margin-bottom:16px;border-radius:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-family:var(--font-display);font-size:32px;color:var(--g5);line-height:1">${unlockedCount}</div>
          <div style="font-size:12px;color:var(--text3)">of ${totalCount} badges unlocked</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:36px">🏅</div>
          <div style="font-size:12px;color:var(--g5);font-weight:700">${pct}%</div>
        </div>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:3px;transition:width .6s"></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
      <div class="stat-card"><div class="stat-val">${stats.totalRuns}</div><div class="stat-label">Runs</div></div>
      <div class="stat-card"><div class="stat-val">${stats.totalKm.toFixed(1)}</div><div class="stat-label">Total km</div></div>
      <div class="stat-card"><div class="stat-val">${stats.runStreak}🔥</div><div class="stat-label">Streak</div></div>
    </div>

    ${categories.map(cat => {
      const catAchievements = ACHIEVEMENTS.filter(a => cat.ids.includes(a.id));
      const catUnlocked = catAchievements.filter(a => unlocked[a.id]).length;
      return `
        <div style="margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:var(--text1)">${cat.label}</div>
            <div style="font-size:11px;color:var(--text3)">${catUnlocked}/${catAchievements.length}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${catAchievements.map(a => {
              const isUnlocked = !!unlocked[a.id];
              const unlockedAt = unlocked[a.id]?.unlockedAt;
              const dateStr = unlockedAt ? new Date(unlockedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '';
              return `
                <div style="background:${isUnlocked ? 'rgba(46,125,70,0.15)' : 'var(--bg2)'};
                  border:1px solid ${isUnlocked ? 'rgba(46,125,70,0.4)' : 'var(--border)'};
                  border-radius:12px;padding:10px 8px;text-align:center;
                  transition:all .2s;${isUnlocked ? '' : 'opacity:0.45'}">
                  <div style="font-size:28px;margin-bottom:4px;${isUnlocked ? '' : 'filter:grayscale(1)'}">${a.emoji}</div>
                  <div style="font-size:11px;font-weight:700;color:var(--text1);line-height:1.3;margin-bottom:2px">${a.name}</div>
                  <div style="font-size:10px;color:var(--text3);line-height:1.3">${isUnlocked ? ('✓ ' + dateStr) : a.desc}</div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('')}

    ${(() => {
      const next = ACHIEVEMENTS.find(a => !unlocked[a.id]);
      return next ? `
        <div class="card" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.3);margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Next to unlock</div>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:32px">${next.emoji}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${next.name}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:2px">${next.desc}</div>
            </div>
          </div>
        </div>` : '<div style="text-align:center;padding:20px;font-size:24px">🎉 All badges unlocked!</div>';
    })()}
  `;
}

function renderRunHistory() {
  const user      = APP.currentUser;
  const logs      = Store.getUserRunLogs(user.id).sort((a, b) => (b.timestamp||b.date||'').localeCompare(a.timestamp||a.date||'')).slice(0, 30);
  const container = document.getElementById('run-history-list');
  const statsEl   = document.getElementById('run-stats-row');

  // ── Summary stats ─────────────────────────────────────────────
  const totalKm   = logs.reduce((a, r) => a + (r.distance || 0), 0);
  const totalRuns = logs.length;
  const totalTime = logs.reduce((a, r) => a + (r.duration || 0), 0);
  const totalKcal = logs.reduce((a, r) => {
    const meta = ACTIVITY_META[r.activityType || 'run'] || ACTIVITY_META.run;
    return a + Math.round((r.distance || 0) * meta.kcalPerKm);
  }, 0);

  if (statsEl) statsEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px">
      <div class="stat-card"><div class="stat-val">${totalRuns}</div><div class="stat-label">Activities</div></div>
      <div class="stat-card"><div class="stat-val">${totalKm.toFixed(1)}</div><div class="stat-label">Total km</div></div>
      <div class="stat-card"><div class="stat-val">${fmtTime(totalTime)}</div><div class="stat-label">Total Time</div></div>
      <div class="stat-card"><div class="stat-val">${totalKcal}</div><div class="stat-label">Total kcal</div></div>
    </div>`;

  if (!container) return;
  if (!logs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏃</div><p>No activities logged yet.<br>Start your first one!</p></div>';
    return;
  }

  container.innerHTML = logs.map((r, idx) => {
    const type     = r.activityType || 'run';
    const meta     = ACTIVITY_META[type] || ACTIVITY_META.run;
    const speedKph = r.duration > 0 ? (r.distance / r.duration * 3600) : 0;
    const kcal     = Math.round((r.distance || 0) * meta.kcalPerKm);
    const dateObj  = r.timestamp ? new Date(r.timestamp) : new Date(r.date);
    const dateStr  = dateObj.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const timeStr  = r.timestamp ? dateObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
    const hasMap   = r.coords && r.coords.length >= 2;

    return `
      <div class="card" style="margin-bottom:12px;cursor:pointer;transition:transform .15s,box-shadow .15s"
        onclick="_showRunDetail(${idx})"
        onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform=''"
        ontouchstart="this.style.transform='scale(0.98)'" ontouchend="this.style.transform=''">

        <!-- Activity header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;border-radius:12px;
              background:${meta.color}22;border:1.5px solid ${meta.color}55;
              display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              ${meta.emoji}
            </div>
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text)">${meta.label} · ${r.planType || 'Free Activity'}</div>
              <div style="font-size:12px;color:var(--text3);margin-top:1px">${dateStr}${timeStr ? ' · ' + timeStr : ''}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text3)">${hasMap ? '🗺' : ''} ›</div>
        </div>

        <!-- Key stats row -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;
          background:var(--bg3);border-radius:12px;padding:12px 8px">
          <div style="text-align:center">
            <div style="font-family:var(--font-display);font-size:22px;color:${meta.color};line-height:1">${(r.distance||0).toFixed(2)}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;text-transform:uppercase">km</div>
          </div>
          <div style="text-align:center">
            <div style="font-family:var(--font-display);font-size:22px;color:var(--g5);line-height:1">${fmtTime(r.duration||0)}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;text-transform:uppercase">time</div>
          </div>
          <div style="text-align:center">
            <div style="font-family:var(--font-display);font-size:22px;color:var(--g5);line-height:1">${fmtPace(r.distance, r.duration)}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;text-transform:uppercase">pace</div>
          </div>
          <div style="text-align:center">
            <div style="font-family:var(--font-display);font-size:22px;color:var(--g5);line-height:1">${kcal}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;text-transform:uppercase">kcal</div>
          </div>
        </div>

      </div>`;
  }).join('');
}

// ── RUN DETAIL MODAL ──────────────────────────────────────────────
let _detailMapInst = null;

function _showRunDetail(idx) {
  const user = APP.currentUser;
  const logs = Store.getUserRunLogs(user.id)
    .sort((a, b) => (b.timestamp||b.date||'').localeCompare(a.timestamp||a.date||''));
  const r    = logs[idx];
  if (!r) return;

  const type     = r.activityType || 'run';
  const meta     = ACTIVITY_META[type] || ACTIVITY_META.run;
  const speedKph = r.duration > 0 ? (r.distance / r.duration * 3600) : 0;
  const kcal     = Math.round((r.distance || 0) * meta.kcalPerKm);
  const dateObj  = r.timestamp ? new Date(r.timestamp) : new Date(r.date);
  const dateStr  = dateObj.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const timeStr  = r.timestamp ? dateObj.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
  const hasMap   = r.coords && r.coords.length >= 2;

  const el = document.getElementById('run-detail-content');
  el.innerHTML = `

    <!-- Map section -->
    <div id="run-detail-map" style="height:${hasMap ? '240px' : '0'};background:var(--bg3);position:relative;overflow:hidden"></div>

    <!-- Content body -->
    <div style="padding:20px 16px 8px">

      <!-- Activity type + title -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="width:48px;height:48px;border-radius:14px;
          background:${meta.color}22;border:2px solid ${meta.color}55;
          display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">
          ${meta.emoji}
        </div>
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--text)">${meta.label}</div>
          <div style="font-size:13px;color:var(--text3)">${r.planType || 'Free Activity'}</div>
        </div>
      </div>

      <!-- Date + time -->
      <div style="font-size:13px;color:var(--text3);margin-bottom:18px">${dateStr}${timeStr ? ' at ' + timeStr : ''}</div>

      <!-- Stats grid — Strava-style 2 column -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">
        ${[
          { label: 'Distance',   val: (r.distance||0).toFixed(2) + ' km',   color: meta.color },
          { label: 'Time',       val: fmtTime(r.duration||0),               color: 'var(--g5)' },
          { label: 'Avg Pace',   val: fmtPace(r.distance, r.duration) + '/km', color: 'var(--g5)' },
          { label: 'Avg Speed',  val: speedKph.toFixed(1) + ' km/h',        color: 'var(--g5)' },
          { label: 'Calories',   val: kcal + ' kcal',                       color: 'var(--g5)' },
          { label: 'Activity',   val: meta.label,                           color: meta.color  },
        ].map(s => `
          <div style="background:var(--surface);padding:14px 16px">
            <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${s.label}</div>
            <div style="font-size:18px;font-weight:700;color:${s.color}">${s.val}</div>
          </div>`).join('')}
      </div>

      ${!hasMap ? `<div style="text-align:center;font-size:13px;color:var(--text3);padding:8px 0">No GPS route for this activity</div>` : ''}
    </div>`;

  openModal('modal-run-detail');

  // Render Leaflet map inside modal after it opens
  if (hasMap) {
    setTimeout(() => {
      _loadLeaflet(() => {
        const mapEl = document.getElementById('run-detail-map');
        if (!mapEl) return;
        if (_detailMapInst) { _detailMapInst.remove(); _detailMapInst = null; }

        const latlngs = r.coords.map(c => [c.lat, c.lon]);
        _detailMapInst = L.map(mapEl, {
          zoomControl:     true,
          attributionControl: false,
          dragging:        true,
          scrollWheelZoom: false,
          tap:             false,
          touchZoom:       true,
          doubleClickZoom: false,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(_detailMapInst);

        L.polyline(latlngs, {
          color:   meta.color,
          weight:  5,
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(_detailMapInst);

        // Start marker
        L.circleMarker(latlngs[0], {
          radius: 7, fillColor: '#43a05a', color: '#fff', weight: 2, fillOpacity: 1,
        }).addTo(_detailMapInst);

        // Finish marker
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 7, fillColor: meta.color, color: '#fff', weight: 2, fillOpacity: 1,
        }).addTo(_detailMapInst);

        _detailMapInst.fitBounds(L.latLngBounds(latlngs).pad(0.15));
      });
    }, 250); // wait for modal animation to complete before sizing map
  }
}

// ── HYDRATION & DIET ──────────────────────────────────────────────
function renderHydrationRunning() {
  document.getElementById('run-hydration-content').innerHTML = `
    <div style="padding:16px">
      <div class="card" style="background:linear-gradient(135deg,var(--g1),var(--g2));margin-bottom:16px">
        <div class="section-title">Running Day Hydration</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.7">Running significantly increases fluid loss. Proper hydration is critical for performance and safety.</div>
      </div>
      ${[
        ['Pre-Run (2hr before)',   '500ml water + light electrolytes'],
        ['Pre-Run (15min before)', '200ml water'],
        ['During Run (<45min)',    'Every 20 min: 150-200ml water'],
        ['During Run (>45min)',    'Sports drink or water + salt every 20 min'],
        ['Post-Run (30min)',       '500ml + electrolytes to replace losses'],
        ['Post-Run (2hrs)',        'Continue sipping — 1.5L per kg lost'],
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
        { time:'2-3 hrs before',     name:'Main Pre-Run Meal', items:'Oats + banana + honey OR toast + peanut butter + banana', cal:350, note:'Easy to digest carbs' },
        { time:'30-60 min before',   name:'Light Top-Up',      items:'Banana or 3-4 dates or energy bar',                      cal:120, note:'Quick-release energy' },
        { time:'During run >60 min', name:'Intra-Run Fuel',    items:'Energy gel, banana chunk, or dates every 45 min',         cal:100, note:'Per serving, as needed' },
        { time:'Within 30 min post', name:'Recovery Window',   items:'Chocolate milk OR protein shake + banana',                cal:300, note:'Critical: 3:1 carb:protein ratio' },
        { time:'1-2 hrs post',       name:'Recovery Meal',     items:'Rice/pasta + grilled chicken/fish + vegetables',          cal:600, note:'Replenish glycogen stores' },
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

// ── PERSONAL BESTS — per activity type ───────────────────────────
// Stored in BOTH localStorage (fast) and Sheets Content (persistent across reinstalls).
// On reinstall: localStorage is empty, so _getPBs falls back to Store.getContent
// which is populated by syncContentFromSheets() on login.
function _getPBs(userId, activityType) {
  const type     = activityType || 'run';
  const localKey = 'ff_pbs_' + userId + '_' + type;
  const local    = Store.get(localKey);
  if (local) return local;
  // Fallback: try Sheets-synced content (populated after login sync)
  const fromSheets = Store.getContent('pbs_' + userId + '_' + type);
  if (fromSheets) {
    // Restore to localStorage for fast future access
    Store.set(localKey, fromSheets);
    return fromSheets;
  }
  return { distance: 0, pace: 9999, duration: 0, count: 0 };
}
function _savePBs(userId, pbs, activityType) {
  const type = activityType || 'run';
  // Save to both localStorage and content cache so getContent finds it too
  Store.set('ff_pbs_' + userId + '_' + type, pbs);
  Store.setContent('pbs_' + userId + '_' + type, pbs);
}

// ── ACHIEVEMENT BADGES ────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first_run',   emoji:'👟', name:'First Step',        desc:'Completed your very first run',             check: s => s.totalRuns >= 1 },
  { id:'runs_5',      emoji:'🥾', name:'Getting Moving',    desc:'Completed 5 runs',                          check: s => s.totalRuns >= 5 },
  { id:'runs_10',     emoji:'🏃', name:'10 Run Club',       desc:'Completed 10 runs',                         check: s => s.totalRuns >= 10 },
  { id:'runs_25',     emoji:'🌟', name:'Consistent Runner', desc:'Completed 25 runs',                         check: s => s.totalRuns >= 25 },
  { id:'runs_50',     emoji:'🔥', name:'50 Run Legend',     desc:'Completed 50 runs',                         check: s => s.totalRuns >= 50 },
  { id:'runs_100',    emoji:'💯', name:'Century Runner',    desc:'Completed 100 runs',                        check: s => s.totalRuns >= 100 },
  { id:'dist_1k',     emoji:'🐣', name:'First Kilometre',   desc:'Ran your first kilometre',                  check: s => s.totalKm >= 1 },
  { id:'dist_5k',     emoji:'🏅', name:'5K Runner',         desc:'Ran a total of 5km',                        check: s => s.totalKm >= 5 },
  { id:'dist_10k',    emoji:'🥈', name:'10K Runner',        desc:'Ran a total of 10km',                       check: s => s.totalKm >= 10 },
  { id:'dist_21k',    emoji:'🥇', name:'Half Marathoner',   desc:'Ran a total of 21km',                       check: s => s.totalKm >= 21 },
  { id:'dist_42k',    emoji:'🏆', name:'Marathoner',        desc:'Ran a total of 42km',                       check: s => s.totalKm >= 42 },
  { id:'dist_100k',   emoji:'🌍', name:'Century Club',      desc:'Ran a total of 100km',                      check: s => s.totalKm >= 100 },
  { id:'dist_500k',   emoji:'🚀', name:'500km Legend',      desc:'Ran a total of 500km',                      check: s => s.totalKm >= 500 },
  { id:'single_5k',   emoji:'🎯', name:'5K in One Go',      desc:'Ran 5km in a single run',                   check: s => s.bestDistance >= 5 },
  { id:'single_10k',  emoji:'⚡', name:'10K in One Go',     desc:'Ran 10km in a single run',                  check: s => s.bestDistance >= 10 },
  { id:'single_hm',   emoji:'🌈', name:'Half in One Go',    desc:'Ran 21km in a single run',                  check: s => s.bestDistance >= 21 },
  { id:'single_fm',   emoji:'👑', name:'Full in One Go',    desc:'Ran 42km in a single run',                  check: s => s.bestDistance >= 42 },
  { id:'pace_7',      emoji:'🐢', name:'Sub-7 Pace',        desc:'Ran at under 7 min/km',                     check: s => s.bestPace > 0 && s.bestPace < 7 },
  { id:'pace_6',      emoji:'🦊', name:'Sub-6 Pace',        desc:'Ran at under 6 min/km',                     check: s => s.bestPace > 0 && s.bestPace < 6 },
  { id:'pace_5',      emoji:'🐆', name:'Sub-5 Pace',        desc:'Ran at under 5 min/km',                     check: s => s.bestPace > 0 && s.bestPace < 5 },
  { id:'pace_4',      emoji:'🦅', name:'Sub-4 Pace',        desc:'Ran at under 4 min/km — elite speed!',      check: s => s.bestPace > 0 && s.bestPace < 4 },
  { id:'streak_3',    emoji:'📅', name:'3-Day Streak',      desc:'Ran 3 days in a row',                       check: s => s.runStreak >= 3 },
  { id:'streak_7',    emoji:'🗓️',name:'Week Warrior',       desc:'Ran 7 days in a row',                       check: s => s.runStreak >= 7 },
  { id:'streak_14',   emoji:'💪', name:'Two Week Runner',   desc:'Ran 14 days in a row',                      check: s => s.runStreak >= 14 },
  { id:'streak_30',   emoji:'🌙', name:'Month of Running',  desc:'Ran 30 days in a row',                      check: s => s.runStreak >= 30 },
  { id:'plan_5k',     emoji:'🎽', name:'5K Plan Complete',  desc:'Completed the full 5K training plan',       check: s => s.plansCompleted?.includes('5K') },
  { id:'plan_10k',    emoji:'🎖️',name:'10K Plan Complete',  desc:'Completed the full 10K training plan',      check: s => s.plansCompleted?.includes('10K') },
  { id:'plan_hm',     emoji:'🏵️',name:'Half Marathon Pro',  desc:'Completed the Half Marathon training plan', check: s => s.plansCompleted?.includes('HM') },
  { id:'plan_fm',     emoji:'🏆', name:'Marathon Master',   desc:'Completed the Full Marathon training plan', check: s => s.plansCompleted?.includes('FM') },
  { id:'early_bird',  emoji:'🌅', name:'Early Bird',        desc:'Logged a run before 7 AM',                  check: s => s.hasEarlyRun },
  { id:'night_runner',emoji:'🌃', name:'Night Runner',      desc:'Logged a run after 8 PM',                   check: s => s.hasNightRun },
  { id:'rain_runner', emoji:'☔', name:'All-Weather Runner', desc:'Ran on 10 different calendar days',         check: s => s.uniqueDays >= 10 },
];

function _getAchievements(userId)           { return Store.get('ff_achievements_' + userId, {}); }
function _saveAchievements(userId, data)    { Store.set('ff_achievements_' + userId, data); }

function _buildRunStats(userId) {
  const logs    = Store.getUserRunLogs(userId).sort((a,b) => (a.date||'').localeCompare(b.date||''));
  const totalKm = logs.reduce((a,r) => a + (r.distance||0), 0);
  const bestRun = [...logs].sort((a,b) => (b.distance||0)-(a.distance||0))[0];
  const fastRun = logs.filter(r => (r.distance||0) >= 1).sort((a,b) => (a.pace||999)-(b.pace||999))[0];

  const dates = [...new Set(logs.map(r => r.date))].sort().reverse();
  let streak = 0;
  let cur = new Date();
  for (let i = 0; i < 90; i++) {
    const d = cur.toISOString().split('T')[0];
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate()-1); }
    else if (i > 0) break;
    else { cur.setDate(cur.getDate()-1); if (!dates.includes(cur.toISOString().split('T')[0])) break; }
  }

  const planDays = (window.APP_DATA_DEFAULT||window.APP_DATA).running?.plans || {};
  const plansCompleted = [];
  Object.entries(planDays).forEach(([key, plan]) => {
    const totalDays = (plan.schedule||[]).filter(d => d.dist > 0).length;
    if (totalDays === 0) return;
    let done = 0;
    (plan.schedule||[]).forEach(s => {
      if (s.dist > 0) {
        const k = `ff_pday_${userId}_${key}_w${s.week}_d${s.day}`;
        if (Store.get(k)) done++;
      }
    });
    if (done >= totalDays * 0.8) plansCompleted.push(key);
  });

  const runHours = logs.map(r => {
    const ts = r.timestamp || '';
    if (ts) { const d = new Date(ts); return d.getHours(); }
    return -1;
  }).filter(h => h >= 0);

  return {
    totalRuns:    logs.length,
    totalKm,
    bestDistance: bestRun?.distance || 0,
    bestPace:     fastRun?.pace || 9999,
    runStreak:    streak,
    plansCompleted,
    hasEarlyRun:  runHours.some(h => h < 7),
    hasNightRun:  runHours.some(h => h >= 20),
    uniqueDays:   dates.length,
  };
}

function checkAndUnlockAchievements(userId) {
  const stats      = _buildRunStats(userId);
  const unlocked   = _getAchievements(userId);
  const newUnlocks = [];

  ACHIEVEMENTS.forEach(a => {
    if (!unlocked[a.id]) {
      try {
        if (a.check(stats)) {
          unlocked[a.id] = { unlockedAt: new Date().toISOString() };
          newUnlocks.push(a);
        }
      } catch {}
    }
  });

  if (newUnlocks.length) {
    _saveAchievements(userId, unlocked);
    // Persist to Sheets so achievements survive cache clears / reinstalls
    sheetsPost('saveContent', {
      key:   'achievements_' + userId,
      value: unlocked,
    });
    newUnlocks.forEach((a, i) => {
      setTimeout(() => showToast(`${a.emoji} Achievement unlocked: ${a.name}!`, 'success'), i * 1800);
    });
  }
  return newUnlocks;
}

// ── ENCOURAGING MESSAGES & PB DISPLAY ────────────────────────────
const ACTIVITY_MILESTONES = {
  run: [
    { dist: 42.195, label: 'Full Marathon! 🏆', msg: "You just ran a FULL MARATHON. That\'s legendary. The world bows to you! 🦅" },
    { dist: 21.1,   label: 'Half Marathon! 🏅', msg: "21km done! Half marathon complete. You\'re in the top 1% of runners! 🔥" },
    { dist: 10,     label: '10K! 🎖️',           msg: "10 kilometres! You\'ve crossed the double-digit barrier. Keep pushing! 💪" },
    { dist: 5,      label: '5K! 🥇',             msg: "5K complete! Parkrun territory. You\'re officially a runner now! 🏃" },
    { dist: 3,      label: '3K! 🌟',             msg: "3km strong! You\'re building serious endurance. Next stop: 5K! 🎯" },
    { dist: 1,      label: '1K! 👟',             msg: "First kilometre done! Every marathon starts with 1km. You\'re on your way! 🚀" },
  ],
  walk: [
    { dist: 10, label: '10K Walk! 🏆', msg: "10 kilometres on foot! That\'s serious dedication. Your legs are iron! 💪" },
    { dist: 5,  label: '5K Walk! 🥇',  msg: "5km walk complete! That\'s over 6,500 steps. Movement is medicine! 🌿" },
    { dist: 3,  label: '3K Walk! 🌟',  msg: "3km walked! You\'re building the habit. Every step counts! 🦶" },
    { dist: 1,  label: '1K Walk! 👟',  msg: "First kilometre walked! The journey of a thousand miles begins with a single step. 🛤️" },
  ],
  cycle: [
    { dist: 50, label: '50K Ride! 🏆', msg: "50 kilometres on the saddle! That\'s a serious ride. You\'re a cyclist! 🚴" },
    { dist: 20, label: '20K Ride! 🥇', msg: "20km cycled! You\'re covering ground fast. Keep rolling! ⚡" },
    { dist: 10, label: '10K Ride! 🌟', msg: "10km ride! Legs are turning, heart is pumping. Great work! 💚" },
    { dist: 5,  label: '5K Ride! 👟',  msg: "5km ride complete! Every pedal stroke builds strength! 🚲" },
  ],
};

const FIRST_ACTIVITY_MSG = {
  run:   { emoji: '🎉', msg: "Your first run is logged! Every legend starts somewhere. This is your starting line!" },
  walk:  { emoji: '🎉', msg: "First walk logged! Walking is one of the best things you can do for your health. Keep it up!" },
  cycle: { emoji: '🎉', msg: "First ride logged! The open road is yours. Keep pedalling and see where it takes you!" },
};

const NEXT_TARGET_MSG = {
  run:   [
    { dist: 1,    msg: "Next target: Run 1km without stopping. You\'re almost there! 🎯" },
    { dist: 3,    msg: "Next target: 3km! Add just 1 more km each session. 📈" },
    { dist: 5,    msg: "Next target: 5K! The classic distance. You can do it! 🏃" },
    { dist: 10,   msg: "Next target: 10K! Double digits await. Keep training! 💪" },
    { dist: 21.1, msg: "Next target: Half marathon! You\'re in real runner territory now! 🔥" },
    { dist: 42.2, msg: "Next target: Full marathon! Dream big, train hard! 🏆" },
  ],
  walk: [
    { dist: 1,  msg: "Next target: Walk 1km. Just 10-12 minutes. You\'ve got this! 🎯" },
    { dist: 3,  msg: "Next target: 3km walk. Add a few more streets tomorrow! 🗺️" },
    { dist: 5,  msg: "Next target: 5km walk — the classic daily goal! 🌿" },
    { dist: 10, msg: "Next target: 10km walk. That\'s a real achievement! 💪" },
  ],
  cycle: [
    { dist: 5,  msg: "Next target: 5km ride. Build those legs! 🚲" },
    { dist: 10, msg: "Next target: 10km! A solid training ride awaits! ⚡" },
    { dist: 20, msg: "Next target: 20km! Explore further, ride stronger! 🌏" },
    { dist: 50, msg: "Next target: 50km! Real cyclist territory! 🏆" },
  ],
};

function _getNextTarget(type, distance) {
  const targets = NEXT_TARGET_MSG[type] || NEXT_TARGET_MSG.run;
  return targets.find(t => t.dist > distance) || targets[targets.length - 1];
}

function _renderRunPBBadges(distance, elapsed) {
  const el = document.getElementById('sum-pb-badges');
  if (!el) return;
  const user        = APP.currentUser;
  const actType     = APP.runSession?.activityType || _activityType;
  const meta        = ACTIVITY_META[actType] || ACTIVITY_META.run;
  const pbs         = _getPBs(user.id, actType);
  const pace        = distance > 0 ? elapsed / 60 / distance : 9999;
  const isFirstEver = (pbs.count || 0) === 0;
  const newPbs      = { ...pbs, count: (pbs.count || 0) + 1 };
  let html          = '';

  if (isFirstEver) {
    const msg = FIRST_ACTIVITY_MSG[actType] || FIRST_ACTIVITY_MSG.run;
    html += `
      <div style="background:linear-gradient(135deg,${meta.color}22,${meta.color}11);
        border:1px solid ${meta.color}55;border-radius:14px;padding:16px;text-align:center;margin-bottom:10px">
        <div style="font-size:32px;margin-bottom:6px">${msg.emoji}</div>
        <div style="font-size:15px;font-weight:700;color:${meta.color};margin-bottom:4px">First ${meta.label} Complete!</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.5">${msg.msg}</div>
      </div>`;
    const next = _getNextTarget(actType, distance);
    if (next) {
      html += `
        <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);
          border-radius:12px;padding:12px 14px;text-align:center;margin-bottom:10px">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">💡 Next Goal</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.5">${next.msg}</div>
        </div>`;
    }
    _savePBs(user.id, newPbs, actType);
    sheetsPost('saveContent', { key: 'pbs_' + user.id + '_' + actType, value: newPbs });
    el.innerHTML = html;
    return;
  }

  const milestones   = ACTIVITY_MILESTONES[actType] || ACTIVITY_MILESTONES.run;
  const prevBest     = pbs.distance || 0;
  const hitMilestone = milestones.find(m => m.dist <= distance && m.dist > prevBest);

  if (hitMilestone) {
    html += `
      <div style="background:linear-gradient(135deg,${meta.color}22,${meta.color}08);
        border:1px solid ${meta.color}44;border-radius:14px;padding:16px;text-align:center;margin-bottom:10px">
        <div style="font-size:28px;margin-bottom:6px">🏅</div>
        <div style="font-size:15px;font-weight:700;color:${meta.color};margin-bottom:4px">${hitMilestone.label}</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.5">${hitMilestone.msg}</div>
      </div>`;
  }

  const pbBadges = [];
  if (distance > 0 && distance > (pbs.distance || 0)) {
    pbBadges.push(`<div style="background:${meta.color};color:white;font-size:12px;font-weight:700;
      padding:6px 14px;border-radius:20px">🏆 NEW PB — Longest ${meta.label}!</div>`);
    newPbs.distance = distance;
  }
  if (distance >= 0.5 && pace < (pbs.pace || 9999)) {
    pbBadges.push(`<div style="background:rgba(30,136,229,0.85);color:white;font-size:12px;font-weight:700;
      padding:6px 14px;border-radius:20px">⚡ NEW PB — Fastest Pace!</div>`);
    newPbs.pace = pace;
  }
  if (elapsed > (pbs.duration || 0)) {
    pbBadges.push(`<div style="background:rgba(67,160,90,0.85);color:white;font-size:12px;font-weight:700;
      padding:6px 14px;border-radius:20px">⏱ NEW PB — Longest Time!</div>`);
    newPbs.duration = elapsed;
  }
  if (pbBadges.length) {
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:10px">${pbBadges.join('')}</div>`;
  }

  if (!pbBadges.length && !hitMilestone) {
    const encouragements = [
      "Great " + meta.label.toLowerCase() + "! Consistency is the key to improvement. 💚",
      "Well done! Every session makes you stronger than yesterday. 💪",
      "Solid effort! Keep showing up — results compound over time. 📈",
      "Good " + meta.label.toLowerCase() + "! Your future self thanks you for this. 🙌",
    ];
    const enc  = encouragements[newPbs.count % encouragements.length];
    const next = _getNextTarget(actType, distance);
    html += `
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);
        border-radius:12px;padding:14px;text-align:center;margin-bottom:10px">
        <div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:${next?'8':'0'}px">${enc}</div>
        ${next ? '<div style="font-size:12px;color:var(--text3)">🎯 ' + next.msg + '</div>' : ''}
      </div>`;
  }

  _savePBs(user.id, newPbs, actType);
  sheetsPost('saveContent', { key: 'pbs_' + user.id + '_' + actType, value: newPbs });
  el.innerHTML = html;
}

// ── POST-RUN ROUTE MAP on real tiles (Leaflet) ────────────────────
function _renderRunRouteMap(coords) {
  const el = document.getElementById('sum-route-map');
  if (!el) return;

  // Destroy any previous summary map
  if (_sumMap) { _sumMap.remove(); _sumMap = null; }

  // Filter and deduplicate coords
  const seen = new Set();
  const pts  = (coords || []).filter(c => {
    if (!c.lat || !c.lon) return false;
    const key = `${c.lat.toFixed(5)},${c.lon.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const meta = ACTIVITY_META[APP.runSession?.activityType || _activityType] || ACTIVITY_META.run;

  if (pts.length < 2) {
    // No route — show placeholder inside the map div
    el.style.background = 'var(--bg3)';
    el.innerHTML = (el.innerHTML || '') +
      `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text3);z-index:1">No GPS route recorded</div>`;
    return;
  }

  // Clear any placeholder content
  const label = el.querySelector('[data-keep]');
  // Keep the activity label overlay div — clear only Leaflet contents
  _loadLeaflet(() => {
    const latlngs = pts.map(p => [p.lat, p.lon]);

    _sumMap = L.map(el, {
      zoomControl:        true,
      attributionControl: false,
      dragging:           true,
      scrollWheelZoom:    false,
      tap:                false,
      touchZoom:          true,
      doubleClickZoom:    false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(_sumMap);

    // Route line — activity color
    L.polyline(latlngs, {
      color:   meta.color,
      weight:  5,
      opacity: 0.95,
      lineCap: 'round',
    }).addTo(_sumMap);

    // Start marker — green dot
    L.circleMarker(latlngs[0], {
      radius: 7, fillColor: '#43a05a', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(_sumMap);

    // Finish marker — activity color
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 7, fillColor: meta.color, color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(_sumMap);

    _sumMap.fitBounds(L.latLngBounds(latlngs).pad(0.15));

    // GPS count label
    const countCtrl = L.control({ position: 'bottomright' });
    countCtrl.onAdd = () => {
      const d = L.DomUtil.create('div');
      d.style.cssText = 'background:rgba(7,21,16,0.75);color:rgba(255,255,255,0.6);font-size:10px;padding:3px 8px;border-radius:8px;pointer-events:none';
      d.textContent   = pts.length + ' GPS points';
      return d;
    };
    countCtrl.addTo(_sumMap);
  });
}

// ── PLAN COMPLETION CERTIFICATE ───────────────────────────────────
function checkPlanCompletion(planKey, week) {
  const plan   = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[planKey];
  if (!plan || week < plan.weeks) return;
  const active = getActivePlan();
  if (!active || active.planKey !== planKey) return;

  const finalWeek = plan.schedule.filter(s => s.week === plan.weeks);
  const allDone   = finalWeek.every(s => isPlanDayDone(planKey, plan.weeks, s.day));
  if (!allDone) return;

  const celebKey = `ff_plan_cert_${APP.currentUser.id}_${planKey}`;
  if (Store.get(celebKey)) return;
  Store.set(celebKey, todayStr());
  setTimeout(() => showPlanCertificate(planKey), 500);
}

function showPlanCertificate(planKey) {
  const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[planKey];
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
  const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey];
  const text = `🏆 I just completed the ${active.planKey} (${plan.weeks}-week) training plan on FitFlow Pro! 💪 #FitFlowPro #Running #${active.planKey}`;
  if (navigator.share) {
    navigator.share({ title: 'FitFlow Pro — Plan Complete!', text }).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard!', 'success'));
  }
}
