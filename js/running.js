// LOCAL date helper (replaces UTC-based toISOString().split('T')[0])
function _ymdLocal(d) {
  if (!d || isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

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

// ── MAP TILE STYLES ────────────────────────────────────────────────
var _mapStyle = 'dark'; // 'dark' | 'light' | 'satellite'

const MAP_TILES = {
  dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light:     'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function _getTileLayer(style) {
  return MAP_TILES[style] || MAP_TILES.dark;
}

var _liveMapTileLayer = null;

function switchMapStyle(style, btn) {
  _mapStyle = style;
  // Update button styles
  document.querySelectorAll('.map-style-btn').forEach(b => {
    b.style.background = 'rgba(7,21,16,0.88)';
    b.style.color      = '#fff';
    b.style.borderColor = 'rgba(255,255,255,0.2)';
  });
  if (btn) {
    btn.style.background  = 'rgba(67,209,122,0.25)';
    btn.style.borderColor = '#43d17a';
    btn.style.color       = '#43d17a';
  }
  // Update live map tile layer
  if (_liveMap && _liveMapTileLayer) {
    _liveMap.removeLayer(_liveMapTileLayer);
    _liveMapTileLayer = L.tileLayer(_getTileLayer(style), { maxZoom: 19 });
    _liveMapTileLayer.addTo(_liveMap);
  }
}



// ── PWA INSTALL PROMPT (Fix 12) ───────────────────────────────────
let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  // Show install banner after 60s ONLY when on dashboard, not during a run
  setTimeout(() => {
    if (!_deferredInstallPrompt) return;
    if (Store.get('ff_install_dismissed')) return;
    if (APP.currentPage !== 'page-dashboard') return; // never show on other pages
    const banner = document.getElementById('install-banner');
    if (banner) { banner.classList.remove('hidden'); banner.style.display = 'block'; }
  }, 60000);
});

function triggerInstallPrompt() {
  const banner = document.getElementById('install-banner');
  if (banner) { banner.classList.add('hidden'); banner.style.display = 'none'; }
  if (_deferredInstallPrompt) {
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(r => {
      if (r.outcome === 'accepted') showToast('FitFlow Pro installed! 🎉', 'success');
      _deferredInstallPrompt = null;
    });
  }
}

function dismissInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) { banner.classList.add('hidden'); banner.style.display = 'none'; }
  Store.set('ff_install_dismissed', true);
}

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const banner = document.getElementById('install-banner');
  if (banner) { banner.classList.add('hidden'); banner.style.display = 'none'; }
  showToast('FitFlow Pro is now installed! 🎉', 'success');
});

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
let _mapBearing   = 0;       // current map rotation angle in degrees (0 = north up)
let _bearingHistory = [];    // rolling window of recent bearings for smoothing
let _rotationEnabled = true; // false when user has manually panned (disables auto-rotate)

// ── BEARING HELPERS ───────────────────────────────────────────────
// Calculate bearing in degrees (0=N, 90=E, 180=S, 270=W) between two coords
function _calcBearing(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const dLon  = toRad(lon2 - lon1);
  const y     = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x     = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
              - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Smooth bearing using circular mean over last N readings (avoids 359→1 wrap issues)
function _smoothBearing(newBearing) {
  _bearingHistory.push(newBearing);
  if (_bearingHistory.length > 6) _bearingHistory.shift();
  // Circular mean
  let sinSum = 0, cosSum = 0;
  _bearingHistory.forEach(b => {
    sinSum += Math.sin(b * Math.PI / 180);
    cosSum += Math.cos(b * Math.PI / 180);
  });
  return ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;
}

// Apply bearing rotation to live map — rotates tiles+polyline, counter-rotates marker
function _applyMapRotation(bearing) {
  if (!_liveMap || !_rotationEnabled || _userPanned) return;
  _mapBearing = bearing;

  // Rotate the entire map pane (tiles + polyline) around the centre
  const pane = _liveMap.getPanes().mapPane;
  if (pane) {
    // Get map container centre so rotation is around the user dot
    const size = _liveMap.getSize();
    pane.style.transformOrigin = size.x / 2 + 'px ' + size.y / 2 + 'px';
    pane.style.transform = 'rotate(' + (-bearing) + 'deg)';
    pane.style.willChange = 'transform';
  }

  // Counter-rotate marker so the arrow always points in direction of travel (up on screen)
  if (_liveMarker && _liveMarker._icon) {
    _liveMarker._icon.style.transform =
      (_liveMarker._icon.style.transform || '').replace(/\s*rotate\([^)]*\)/g, '')
      + ' rotate(' + bearing + 'deg)';
  }
}

// Reset map rotation to north-up
function _resetMapRotation() {
  _mapBearing = 0;
  _bearingHistory = [];
  const pane = _liveMap?.getPanes()?.mapPane;
  if (pane) {
    pane.style.transform = '';
    pane.style.transformOrigin = '';
  }
}

// ── SCREEN WAKE LOCK + GPS KEEP-ALIVE (multi-layer) ───────────────
// Android Chrome throttles GPS when screen locks. We use 4 strategies:
// 1. Screen Wake Lock API (prevents CPU sleep — best when granted)
// 2. Silent looping audio (tricks OS into keeping app "active")
// 3. Periodic no-op geolocation query (keeps GPS subsystem warm)
// 4. Re-request wake lock + restart GPS on visibilitychange→visible

let _wakeLock       = null;
let _gpsKeepAlive   = null;   // setInterval handle for GPS ping

async function _requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => {
        // Re-request immediately if released while run is active
        if (APP.runSession && !APP.runSession.paused) {
          setTimeout(_requestWakeLock, 200);
        }
      });
    } catch (e) {
      console.warn('Wake lock denied:', e.message);
    }
  }
  _startGpsKeepAlive();
}

function _releaseWakeLock() {
  if (_wakeLock) {
    _wakeLock.release().catch(() => {});
    _wakeLock = null;
  }
  _stopGpsKeepAlive();
}

// Strategy 3: Ping GPS every 10s to prevent OS from suspending the location subsystem
function _startGpsKeepAlive() {
  _stopGpsKeepAlive();
  _gpsKeepAlive = setInterval(() => {
    if (!APP.runSession || APP.runSession.paused) return;
    // A 0-timeout getCurrentPosition keeps the GPS subsystem warm on Android
    // without interfering with the main watchPosition accuracy
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 5000 }
    );
  }, 10000);
}

function _stopGpsKeepAlive() {
  if (_gpsKeepAlive) { clearInterval(_gpsKeepAlive); _gpsKeepAlive = null; }
}

// ════════════════════════════════════════════════════════════════
// LOCK SCREEN DISPLAY — Media Session API + Silent Audio trick
// ════════════════════════════════════════════════════════════════
// Proper 0.5s 8kHz mono 16-bit silent WAV — long enough for Android Chrome to loop
// (0-duration WAV gets rejected by Chrome's autoplay policy on some Android versions)
const SILENT_WAV_B64 = (() => {
  // Build a 0.5s 8000Hz mono PCM WAV programmatically
  const sampleRate = 8000;
  const duration   = 0.5;
  const numSamples = Math.floor(sampleRate * duration);
  const buf        = new ArrayBuffer(44 + numSamples * 2);
  const view       = new DataView(buf);
  const write      = (o, s) => { for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); };
  write(0,'RIFF'); view.setUint32(4, 36+numSamples*2, true);
  write(8,'WAVE'); write(12,'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate*2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36,'data'); view.setUint32(40, numSamples*2, true);
  // Samples are already zero (ArrayBuffer initialized to 0)
  const bytes = new Uint8Array(buf);
  let b64 = '';
  for (let i=0;i<bytes.length;i+=3) {
    const chunk = [bytes[i],bytes[i+1]||0,bytes[i+2]||0];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    b64 += chars[(chunk[0]>>2)] + chars[((chunk[0]&3)<<4)|(chunk[1]>>4)] +
           (i+1<bytes.length ? chars[((chunk[1]&15)<<2)|(chunk[2]>>6)] : '=') +
           (i+2<bytes.length ? chars[chunk[2]&63] : '=');
  }
  return 'data:audio/wav;base64,' + b64;
})();


// ════════════════════════════════════════════════════════════════
// LIVE ACTIVITY NOTIFICATION (via Service Worker)
// Shows persistent notification on lock screen + notification bar
// Updates every 3 seconds with real distance/time/pace/kcal
// ════════════════════════════════════════════════════════════════

var _activityNotifInterval = null;

function _swPost(data) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage(data);
}

function _activityNotifPayload(type) {
  const s    = APP.runSession;
  if (!s) return null;
  const elapsed = _calcElapsed(s);
  const meta    = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  return {
    type,
    emoji:    meta.emoji,
    label:    meta.label,
    distance: s.distance.toFixed(2),
    time:     fmtTime(elapsed),
    pace:     fmtPace(s.distance, elapsed),
    kcal:     Math.round(s.distance * meta.kcalPerKm),
    paused:   !!s.paused,
  };
}

function startActivityNotification() {
  // Request notification permission if not granted
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;

  // Send initial notification immediately
  const payload = _activityNotifPayload('ACTIVITY_START');
  if (payload) _swPost(payload);

  // Update every 3 seconds
  if (_activityNotifInterval) clearInterval(_activityNotifInterval);
  _activityNotifInterval = setInterval(() => {
    const p = _activityNotifPayload('ACTIVITY_UPDATE');
    if (p) _swPost(p);
  }, 3000);

  // Listen for SW pause toggle commands
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SW_TOGGLE_PAUSE') togglePauseRun();
  });
}

function stopActivityNotification() {
  if (_activityNotifInterval) {
    clearInterval(_activityNotifInterval);
    _activityNotifInterval = null;
  }
  _swPost({ type: 'ACTIVITY_STOP' });
}

function refreshActivityNotification() {
  if (!_activityNotifInterval) return;
  const p = _activityNotifPayload('ACTIVITY_UPDATE');
  if (p) _swPost(p);
}

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
    this._stopSilentAudioCtx?.();
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
    // Primary: HTML Audio loop — keeps app "audible" so OS won't throttle it
    const audio  = new Audio(SILENT_WAV_B64);
    audio.loop   = true;
    audio.volume = 0.001;
    this._audio  = audio;
    audio.play().catch(() => {
      // Fallback: Web Audio API oscillator at inaudible frequency
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;  // essentially silent
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        this._audioCtx = ctx;
        this._osc = osc;
      } catch {}
    });
  },

  _stopSilentAudioCtx() {
    if (this._osc)      { try { this._osc.stop(); } catch {} this._osc = null; }
    if (this._audioCtx) { try { this._audioCtx.close(); } catch {} this._audioCtx = null; }
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
    const elapsed  = _calcElapsed(s);
    const meta     = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
    // Use actual activity emoji + label — not hardcoded "🏃 Running"
    const statusIcon = s.paused ? '⏸' : meta.emoji;
    const statusText = s.paused ? 'Paused' : meta.label;  // "Walk", "Run", "Cycle"
    navigator.mediaSession.metadata = new MediaMetadata({
      title:   `${statusIcon} ${statusText}  ${fmtTime(elapsed)}  ·  ${s.distance.toFixed(2)} km`,
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

// ── TWO-FINGER MAP ROTATION GESTURE ──────────────────────────────
// Intercepts two-touch events on the map container to let user manually rotate
var _gestureStartAngle = null;
var _gestureStartBearing = 0;

function _attachMapRotationGesture(container) {
  function _getTouchAngle(t1, t2) {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;
  }

  container.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      _gestureStartAngle  = _getTouchAngle(e.touches[0], e.touches[1]);
      _gestureStartBearing = _mapBearing;
    }
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && _gestureStartAngle !== null) {
      const currentAngle = _getTouchAngle(e.touches[0], e.touches[1]);
      const delta        = _gestureStartAngle - currentAngle;
      const newBearing   = ((_gestureStartBearing + delta) + 360) % 360;
      _mapBearing        = newBearing;
      // Apply rotation directly without smoothing (user is controlling it)
      const pane = _liveMap?.getPanes()?.mapPane;
      if (pane) {
        const size = _liveMap.getSize();
        pane.style.transformOrigin = size.x / 2 + 'px ' + size.y / 2 + 'px';
        pane.style.transform = 'rotate(' + (-newBearing) + 'deg)';
      }
      if (_liveMarker && _liveMarker._icon) {
        _liveMarker._icon.style.transform =
          (_liveMarker._icon.style.transform || '').replace(/\s*rotate\([^)]*\)/g, '')
          + ' rotate(' + newBearing + 'deg)';
      }
    }
  }, { passive: true });

  container.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      _gestureStartAngle = null;
    }
  }, { passive: true });
}

// ── LIVE MAP (during active run) ──────────────────────────────────
function _initLiveMap() {
  _loadLeaflet(() => {
    const container = document.getElementById('run-live-map');
    if (!container) return;

    if (_liveMap) { _liveMap.remove(); _liveMap = null; _livePolyline = null; _liveMarker = null; }
    _userPanned = false;  // always reset pan lock so auto-center works from first fix

    // Use last known GPS coord if available, otherwise placeholder until real fix arrives
    const lastCoord = APP.gpsCoords.length > 0
      ? [APP.gpsCoords[APP.gpsCoords.length - 1].lat, APP.gpsCoords[APP.gpsCoords.length - 1].lon]
      : null;

    // Start map at last known coord or placeholder — will fly to real location immediately
    const startCoord = lastCoord || [0, 0];

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

    // Detect when user manually pans — stop auto-recentering AND rotation
    _liveMap.on('dragstart', () => {
      _userPanned      = true;
      _rotationEnabled = false;
      _resetMapRotation();   // snap back to north-up when user takes control
    });
    // After 8s of no pan, re-enable auto-center (rotation re-enables on next GPS fix)
    _liveMap.on('dragend', () => {
      clearTimeout(_liveMap._recenterTimer);
      _liveMap._recenterTimer = setTimeout(() => {
        _userPanned      = false;
        _rotationEnabled = true;
      }, 8000);
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
        _userPanned      = false;
        _rotationEnabled = true;
        _bearingHistory  = [];  // reset smoothing so rotation snaps back cleanly
        if (_gpsLastGoodFix) {
          _liveMap.setView([_gpsLastGoodFix.lat, _gpsLastGoodFix.lon], _liveMap.getZoom(), { animate: true });
        }
      });
      L.DomEvent.disableClickPropagation(btn);
      return btn;
    };
    recenterBtn.addTo(_liveMap);

    // Map style toggle control
    const styleCtrl = L.control({ position: 'topright' });
    styleCtrl.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
      const styles = [
        { key: 'dark',      label: '🌙' },
        { key: 'light',     label: '☀️' },
        { key: 'satellite', label: '🛰' },
      ];
      styles.forEach(s => {
        const btn = L.DomUtil.create('button', 'map-style-btn', div);
        btn.innerHTML = s.label;
        btn.title     = s.key.charAt(0).toUpperCase() + s.key.slice(1);
        btn.style.cssText = `
          width:34px;height:34px;border-radius:8px;
          background:rgba(7,21,16,0.88);border:1px solid rgba(255,255,255,0.2);
          color:#fff;font-size:14px;cursor:pointer;display:flex;
          align-items:center;justify-content:center;backdrop-filter:blur(8px);
          touch-action:manipulation;
        `;
        if (s.key === _mapStyle) {
          btn.style.background  = 'rgba(67,209,122,0.25)';
          btn.style.borderColor = '#43d17a';
          btn.style.color       = '#43d17a';
        }
        L.DomEvent.on(btn, 'click', () => switchMapStyle(s.key, btn));
        L.DomEvent.disableClickPropagation(btn);
      });
      return div;
    };
    styleCtrl.addTo(_liveMap);

    _liveMapTileLayer = L.tileLayer(_getTileLayer(_mapStyle), { maxZoom: 19 });
    _liveMapTileLayer.addTo(_liveMap);

    _livePolyline = L.polyline([], {
      color:   '#2d9e5a',
      weight:  4,
      opacity: 1.0,
      lineCap: 'round',
      lineJoin:'round',
    }).addTo(_liveMap);

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:#2d9e5a;border:3px solid #fff;
        box-shadow:0 0 0 3px rgba(45,158,90,0.35);
      "></div>`,
      iconSize:   [14, 14],
      iconAnchor: [7, 7],
    });
    _liveMarker = L.marker(startCoord[0] !== 0 ? startCoord : [0,0], { icon, zIndexOffset: 1000, interactive: false }).addTo(_liveMap);

    if (APP.gpsCoords.length > 0) _redrawLivePolyline();

    // Attach two-finger rotation gesture to map container
    _attachMapRotationGesture(container);

    // Always get real current position to centre map correctly on start
    // Even if we have cached coords (resumed session), re-centre to latest location
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        if (_liveMap) {
          _liveMap.setView([lat, lon], 17, { animate: false });
          if (_liveMarker) _liveMarker.setLatLng([lat, lon]);
          _userPanned = false;  // ensure auto-center re-engages after map set
        }
      },
      () => {
        // GPS unavailable — if we have a known coord use it, else fallback view
        if (_liveMap) {
          if (lastCoord) {
            _liveMap.setView(lastCoord, 17, { animate: false });
          }
          // If no coord at all, watchPosition will centre once it gets a fix
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
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

  // Calculate bearing from previous fix and apply map rotation
  const coords = APP.gpsCoords;
  if (coords.length >= 2 && !_userPanned) {
    const prev = coords[coords.length - 2];
    const rawBearing = _calcBearing(prev.lat, prev.lon, lat, lon);
    // Only update bearing if we actually moved (avoids jitter when stationary)
    const distMoved = haversine(prev.lat, prev.lon, lat, lon);
    if (distMoved > 0.003) {  // only rotate after moving 3m+
      const smoothed = _smoothBearing(rawBearing);
      _applyMapRotation(smoothed);
    }
  }

  // Update marker position
  if (_liveMarker) _liveMarker.setLatLng(pos);

  // Auto-center: keep user dot in lower-third of screen (like Google Maps / Strava)
  // offset centre point slightly below middle so more road ahead is visible
  if (!_userPanned) {
    if (_rotationEnabled) {
      // In rotation mode: use panTo with offset so user dot sits at 65% down screen
      const size    = _liveMap.getSize();
      const mapCentre = _liveMap.project(pos, _liveMap.getZoom());
      // Shift centre point up by 15% of map height so user dot is lower on screen
      const offsetCentre = _liveMap.unproject(
        [mapCentre.x, mapCentre.y + size.y * 0.15],
        _liveMap.getZoom()
      );
      _liveMap.setView(offsetCentre, _liveMap.getZoom(), { animate: true, duration: 0.5, noMoveStart: true });
    } else {
      _liveMap.setView(pos, _liveMap.getZoom(), { animate: true, duration: 0.6 });
    }
  }

  if (_livePolyline) _livePolyline.addLatLng(pos);
}

function _destroyLiveMap() {
  if (_liveMap) { _liveMap.remove(); _liveMap = null; }
  _livePolyline    = null;
  _liveMarker      = null;
  _mapBearing      = 0;
  _bearingHistory  = [];
  _rotationEnabled = true;
}

// ── GPS BADGE UPDATE ──────────────────────────────────────────────
function _setGpsBadge(ok) {
  const el = document.getElementById('run-gps-badge');
  if (!el) return;
  el.textContent        = ok ? 'GPS ●' : 'GPS ○';
  el.style.background   = ok ? 'rgba(67,160,90,0.85)' : 'rgba(229,57,53,0.75)';
}

// ── KALMAN FILTER ────────────────────────────────────────────────
// Smooths GPS noise while preserving real turns and curves.
// Same technique used by Strava, Nike Run Club, Google Maps.
//
// How it works:
//   Each GPS fix has measurement noise (3-8m random error).
//   The filter maintains a state estimate (predicted position)
//   and blends it with each new GPS reading weighted by accuracy.
//   Random jumps contradict the prediction → mostly filtered out.
//   Real turns confirm across multiple fixes → fully preserved.

class GpsKalmanFilter {
  constructor() {
    this.reset();
  }

  reset() {
    this.lat       = null;
    this.lon       = null;
    this.variance  = -1;   // negative = not initialised
    this.lastTs    = 0;
    // Process noise: how much we expect position to change per second
    // Higher = trusts GPS more (wiggly), Lower = smoother (slower to react)
    // 1.5 m²/s: smooth enough to remove jitter, fast enough for real turns
    this.Q_METRES_PER_SECOND = 1.5;
  }

  // Returns smoothed { lat, lon } or null if not ready
  process(lat, lon, accuracy, timestampMs) {
    const minAccuracy = Math.max(accuracy, 1);

    if (this.variance < 0) {
      // First fix — initialise with this position
      this.lat      = lat;
      this.lon      = lon;
      this.variance = minAccuracy * minAccuracy;
      this.lastTs   = timestampMs;
      return { lat, lon };
    }

    // Time since last fix in seconds
    const dtSec = Math.max((timestampMs - this.lastTs) / 1000, 0.001);
    this.lastTs = timestampMs;

    // Predict: position uncertainty grows with time (we're moving)
    const Q = this.Q_METRES_PER_SECOND * dtSec;
    this.variance += Q * Q;

    // Update: blend prediction with GPS measurement
    // K = Kalman gain: how much we trust GPS vs our prediction
    const K = this.variance / (this.variance + minAccuracy * minAccuracy);

    // Blend position (lat/lon are small enough that linear blend works)
    this.lat     += K * (lat - this.lat);
    this.lon     += K * (lon - this.lon);
    this.variance = (1 - K) * this.variance;

    return { lat: this.lat, lon: this.lon };
  }
}

// Single filter instance — reset on each new run/resume
const _kalman = new GpsKalmanFilter();

// ── GPS RUN TRACKER ───────────────────────────────────────────────

// FIX #2: GPS warm-up state — skip first N fixes while device acquires lock
const GPS_WARMUP_FIXES    = 6;    // discard first 6 positions (device triangulating)
const GPS_MIN_ACCURACY_M  = 40;   // reject if worse than 40 m — urban multi-path rejection
const GPS_MIN_DISTANCE_KM = 0.004; // ignore movement < 4 m (standing still jitter)

let _gpsWarmupCount  = 0;          // counts received fixes during warmup phase
let _gpsLastGoodFix  = null;       // last confirmed-accurate position
let _stillSince      = null;       // timestamp when user stopped moving (for auto-pause)
let _currentGpsSpeed = null;       // real-time speed from GPS (km/h), null if unavailable
const AUTO_PAUSE_STILL_MS = 60000; // suggest auto-pause after 60s of no movement

// ── LOCK SCREEN AUTO-PAUSE ───────────────────────────────────────
// When screen locks, GPS stops — we auto-pause the timer so no fake
// time accumulates. On unlock, timer and GPS resume automatically.
let _lockedWhileRunning = false; // true if we auto-paused due to screen lock

function _checkLocationPermission(onGranted) {
  // Check if permission is already "always" or "granted"
  if (!navigator.permissions) { onGranted(); return; }
  navigator.permissions.query({ name: 'geolocation' }).then(result => {
    if (result.state === 'granted') {
      // Permission granted — but may still be "while using" only at OS level
      // Show background GPS reminder once per install
      if (!Store.get('ff_gps_reminder_shown')) {
        _showBackgroundGPSReminder(onGranted);
      } else {
        onGranted();
      }
    } else if (result.state === 'denied') {
      _showGPSDeniedModal();
    } else {
      // 'prompt' — will ask user
      _showBackgroundGPSReminder(onGranted);
    }
  }).catch(() => onGranted());
}

function _showBackgroundGPSReminder(onContinue) {
  // Remove existing if any
  document.getElementById('gps-reminder-modal')?.remove();

  const el = document.createElement('div');
  el.id = 'gps-reminder-modal';
  el.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;
    display:flex;align-items:flex-end;justify-content:center;
    backdrop-filter:blur(6px);
  `;
  el.innerHTML = `
    <div style="
      background:#071510;border-radius:20px 20px 0 0;
      padding:24px 20px 36px;width:100%;max-width:480px;
      border:1px solid rgba(67,160,90,0.3);border-bottom:none;
    ">
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:52px;margin-bottom:10px">📍</div>
        <div style="font-size:19px;font-weight:700;margin-bottom:8px">Allow Background Location</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.65">
          For GPS to keep tracking when your <strong>screen is locked</strong> or you
          <strong>switch apps</strong>, you must set location permission to
          <strong style="color:#7ed9a0">"Allow all the time"</strong> in Android settings.
        </div>
      </div>

      <div style="
        background:rgba(67,160,90,0.1);border:1px solid rgba(67,160,90,0.3);
        border-radius:14px;padding:14px 16px;margin-bottom:18px;
      ">
        <div style="font-size:12px;font-weight:700;color:#7ed9a0;text-transform:uppercase;
          letter-spacing:.07em;margin-bottom:10px">How to fix it</div>
        ${[
          '1. Open <strong>Android Settings</strong>',
          '2. Go to <strong>Apps → Chrome</strong> (or FitFlow)',
          '3. Tap <strong>Permissions → Location</strong>',
          '4. Select <strong>"Allow all the time"</strong>',
        ].map(s => `<div style="font-size:13px;color:rgba(255,255,255,0.75);
          padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.07);
          line-height:1.5">${s}</div>`).join('')}
      </div>

      <div style="font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:16px">
        Without this, GPS pauses whenever the screen locks.
      </div>

      <div style="display:flex;gap:10px">
        <button id="gps-reminder-skip"
          style="flex:1;padding:13px;border-radius:14px;
            border:1px solid rgba(255,255,255,0.15);background:transparent;
            color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer">
          Skip for now
        </button>
        <button id="gps-reminder-ok"
          style="flex:2;padding:13px;border-radius:14px;border:none;
            background:linear-gradient(135deg,#2e7d46,#43a05a);
            color:#fff;font-size:14px;font-weight:700;cursor:pointer">
          Got it — Start ${ACTIVITY_META[_activityType]?.label || 'Run'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(el);

  document.getElementById('gps-reminder-ok').addEventListener('click', () => {
    Store.set('ff_gps_reminder_shown', true);
    el.remove();
    onContinue();
  });
  document.getElementById('gps-reminder-skip').addEventListener('click', () => {
    el.remove();
    onContinue(); // still start, just without reminder
  });
}

function _showGPSDeniedModal() {
  document.getElementById('gps-reminder-modal')?.remove();
  const el = document.createElement('div');
  el.id = 'gps-reminder-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  el.innerHTML = `
    <div style="background:#071510;border-radius:20px;padding:28px 22px;max-width:380px;text-align:center;border:1px solid rgba(239,83,80,0.3)">
      <div style="font-size:48px;margin-bottom:12px">🚫</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Location Blocked</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:20px">
        Location access is blocked for this app. GPS tracking won't work.<br><br>
        Go to <strong>Settings → Apps → Chrome → Permissions → Location</strong> and allow it.
      </div>
      <button onclick="document.getElementById('gps-reminder-modal').remove()"
        style="width:100%;padding:13px;border-radius:14px;border:none;
          background:rgba(239,83,80,0.2);color:#ef5350;font-size:14px;font-weight:700;cursor:pointer">
        Close
      </button>
    </div>`;
  document.body.appendChild(el);
}

function startRun() {
  if (!navigator.geolocation) {
    showToast('GPS not available on this device.', 'error');
    return;
  }
  if (APP.runSession) {
    showToast('A run is already in progress!', 'info');
    return;
  }

  // Check location permission and show background GPS reminder if needed
  _checkLocationPermission(_doStartRun);
}

function _doStartRun() {
  const meta = ACTIVITY_META[_activityType] || ACTIVITY_META.run;

  APP.runSession = {
    startTime:    Date.now(),
    pausedAt:     null,
    totalPaused:  0,
    distance:     0,
    paused:       false,
    activityType: _activityType,
  };
  APP.gpsCoords    = [];
  _gpsWarmupCount  = 0;
  _gpsLastGoodFix  = null;
  _currentGpsSpeed = null;
  _userPanned      = false;  // reset pan lock so map auto-centers from first GPS fix
  _rotationEnabled = true;   // re-enable rotation for new activity
  _mapBearing      = 0;
  _bearingHistory  = [];     // clear bearing history so rotation starts fresh
  _kalman.reset();   // fresh Kalman state for new run
  _saveRunSession();

  // Update active run header label with activity type
  const labelEl = document.getElementById('run-active-label');
  if (labelEl) labelEl.textContent = meta.emoji + ' ' + meta.label;

  // Single shared function to transition idle → active and begin tracking
  function _activateRunUI() {
    document.getElementById('run-idle').style.display = 'none';
    document.getElementById('run-active').classList.remove('hidden');
    _startRunTimerLoop();
    _initLiveMap();
    startGPS();          // always start watchPosition — GPS may warm up after UI shows
    _requestWakeLock();
    LockScreen.start();
  }

  navigator.geolocation.getCurrentPosition(
    () => { _activateRunUI(); },
    () => {
      // Timeout / denied on first fix — still activate and let watchPosition keep trying
      showToast('Searching for GPS… 📡', 'info');
      _activateRunUI();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    if (elapsed % 10 === 0) { LockScreen.refresh(); refreshActivityNotification(); }
  }, 1000);
}

// ── FIX #2 + #5: GPS watch with warm-up filter and error handler ──
function _showAutoPausePrompt() {
  if (document.getElementById('auto-pause-prompt')) return; // already showing
  const el = document.createElement('div');
  el.id = 'auto-pause-prompt';
  el.style.cssText = `position:fixed;bottom:160px;left:50%;transform:translateX(-50%);
    background:rgba(7,21,16,0.97);border:1px solid var(--accent);border-radius:20px;
    padding:16px 20px;z-index:500;min-width:260px;max-width:340px;
    box-shadow:0 8px 32px rgba(0,0,0,0.6);text-align:center;animation:slideUp .25s ease`;
  el.innerHTML = `
    <div style="font-size:24px;margin-bottom:8px">🛑</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:4px">You've been still for 1 min</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:14px">Timer is still running. Auto-pause?</div>
    <div style="display:flex;gap:10px">
      <button onclick="document.getElementById('auto-pause-prompt')?.remove()"
        style="flex:1;padding:10px;border-radius:12px;border:1px solid var(--border);
          background:var(--surface);color:var(--text);cursor:pointer;font-size:13px">Keep Going</button>
      <button onclick="togglePauseRun();document.getElementById('auto-pause-prompt')?.remove()"
        style="flex:1;padding:10px;border-radius:12px;border:none;
          background:var(--accent);color:#fff;cursor:pointer;font-size:13px;font-weight:700">⏸ Pause</button>
    </div>`;
  document.body.appendChild(el);
  navigator.vibrate && navigator.vibrate([100, 50, 100]);
  // Auto-dismiss after 15s if no action taken
  setTimeout(() => document.getElementById('auto-pause-prompt')?.remove(), 15000);
}

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

      const { latitude: rawLat, longitude: rawLon, accuracy } = pos.coords;
      const nowTs = Date.now();

      // FIX #2a: Reject inaccurate fixes
      if (accuracy > GPS_MIN_ACCURACY_M) return;

      _setGpsBadge(true);

      // Apply Kalman filter to smooth GPS noise
      // Real turns/curves are preserved — random 3-8m jumps are removed
      const smoothed = _kalman.process(rawLat, rawLon, accuracy, nowTs);
      const lat = smoothed.lat;
      const lon = smoothed.lon;

      // FIX #2b: Warmup — skip first N fixes for distance calc, but still record coords for the route map
      if (_gpsWarmupCount < GPS_WARMUP_FIXES) {
        _gpsWarmupCount++;
        _gpsLastGoodFix = { lat, lon, ts: nowTs };
        APP.gpsCoords.push({ lat, lon, ts: nowTs }); // record for route map
        _updateLiveMap(lat, lon);
        return;
      }

      // FIX #2c: Compute distance from last GOOD fix (using smoothed coords)
      if (_gpsLastGoodFix) {
        const d = haversine(_gpsLastGoodFix.lat, _gpsLastGoodFix.lon, lat, lon);
        if (d >= GPS_MIN_DISTANCE_KM) {
          APP.runSession.distance += d;
          updateRunDisplay();
          _saveRunSession();
          _gpsLastGoodFix = { lat, lon, ts: nowTs };
        }
      } else {
        _gpsLastGoodFix = { lat, lon, ts: nowTs };
      }

      // Track real-time GPS speed for live display
      const _speedNow = pos.coords.speed != null ? pos.coords.speed * 3.6 : null;
      if (_speedNow !== null && _speedNow >= 0) _currentGpsSpeed = _speedNow;

      // Auto-pause detection: if speed < 0.5 km/h for AUTO_PAUSE_STILL_MS, prompt user
      if (_speedNow !== null && _speedNow < 0.5) {
        if (!_stillSince) _stillSince = nowTs;
        else if (nowTs - _stillSince > AUTO_PAUSE_STILL_MS && !APP.runSession.paused) {
          _stillSince = null;
          _showAutoPausePrompt();
        }
      } else {
        _stillSince = null;
      }

      // Store smoothed coord and update live map
      APP.gpsCoords.push({ lat, lon, ts: nowTs });
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

    { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
  );
}

function updateRunDisplay() {
  const s = APP.runSession;
  if (!s) return;
  const elapsed  = _calcElapsed(s);
  const meta     = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  const avgSpeedKph  = elapsed > 0 ? (s.distance / elapsed * 3600) : 0;
  // Use real-time GPS speed if available — much more accurate than average
  // especially for cycling where speed varies a lot
  const displaySpeed = (_currentGpsSpeed !== null) ? _currentGpsSpeed : avgSpeedKph;

  const timerEl = document.getElementById('run-timer');
  const distEl  = document.getElementById('run-dist');
  const paceEl  = document.getElementById('run-pace');
  const speedEl = document.getElementById('run-speed');
  const calEl   = document.getElementById('run-kcal-stat');

  if (timerEl) timerEl.textContent = fmtTime(elapsed);
  if (distEl)  distEl.textContent  = s.distance.toFixed(2);
  if (paceEl)  paceEl.textContent  = fmtPace(s.distance, elapsed);
  if (speedEl) speedEl.textContent = displaySpeed.toFixed(1);
  if (calEl)   calEl.textContent   = Math.round(s.distance * meta.kcalPerKm);
}

// ── PAUSE / RESUME ────────────────────────────────────────────────
function togglePauseRun() {
  _stillSince = null; // reset auto-pause detector on manual pause/resume
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
    _gpsWarmupCount  = 0;
    _gpsLastGoodFix  = null;
    _currentGpsSpeed = null;
    _kalman.reset();   // fresh filter state after pause — GPS may have drifted
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
  // Render km splits in summary
  const splitsEl = document.getElementById('sum-km-splits');
  if (splitsEl) {
    const meta = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
    splitsEl.innerHTML = _renderKmSplits(APP.gpsCoords, s.distance, meta.color);
  }
  _renderRunRouteMap(APP.gpsCoords);
  // Transition to save screen after map loads
  setTimeout(() => showSaveActivity(), 400);
}

// ── SAVE ──────────────────────────────────────────────────────────
// ── ACTIVITY TITLE GENERATOR ─────────────────────────────────────
function _getDefaultActivityTitle(activityType) {
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 12 ? 'Morning'
                  : hour >= 12 && hour < 17 ? 'Afternoon'
                  : hour >= 17 && hour < 21 ? 'Evening'
                  : 'Night';
  const meta = ACTIVITY_META[activityType] || ACTIVITY_META.run;
  return timeOfDay + ' ' + meta.label;
}

function showSaveActivity() {
  const s = APP.runSession;
  if (!s) return;
  const meta    = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  const elapsed = s.finalElapsed || _calcElapsed(s);
  const title   = _getDefaultActivityTitle(s.activityType || _activityType);

  const titleInput = document.getElementById('save-activity-title');
  const descInput  = document.getElementById('save-activity-desc');
  if (titleInput) { titleInput.value = title; setTimeout(() => { titleInput.focus(); titleInput.select(); }, 350); }
  if (descInput)  descInput.value = '';

  const typeEmoji = document.getElementById('save-type-emoji');
  const typeLabel = document.getElementById('save-type-label');
  if (typeEmoji) typeEmoji.textContent = meta.emoji;
  if (typeLabel) typeLabel.textContent = meta.label;

  const strip = document.getElementById('save-stats-strip');
  if (strip) {
    const kcal = Math.round(s.distance * meta.kcalPerKm);
    strip.innerHTML = [
      { label:'Distance', val: s.distance.toFixed(2)+' km', color: meta.color },
      { label:'Time',     val: fmtTime(elapsed),            color: 'var(--text)' },
      { label:'Calories', val: kcal+' kcal',                color: 'var(--text)' },
    ].map(st => `<div style="background:var(--surface);border-radius:12px;padding:12px;
        border:1px solid var(--border);text-align:center">
        <div style="font-size:18px;font-weight:700;color:${st.color}">${st.val}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${st.label}</div>
      </div>`).join('');
  }

  document.getElementById('run-summary').classList.add('hidden');
  document.getElementById('run-save-screen').classList.remove('hidden');
}

function saveRun() {
  const s       = APP.runSession;
  const user    = APP.currentUser;
  const elapsed = s.finalElapsed || _calcElapsed(s);
  const ctx     = APP._planRunCtx || null;
  const meta    = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;

  const titleEl = document.getElementById('save-activity-title');
  const descEl  = document.getElementById('save-activity-desc');
  const activityTitle = (titleEl?.value?.trim()) || _getDefaultActivityTitle(s.activityType || _activityType);
  const activityDesc  = descEl?.value?.trim() || '';

  // Generate one shared ID used in BOTH localStorage AND Google Sheets
  const runLogId = 'run_' + Date.now();

  const log = {
    id:           runLogId,
    userId:       user.id,
    email:        user.email,
    date:         todayStr(),
    distance:     parseFloat(s.distance.toFixed(3)),
    duration:     elapsed,
    pace:         parseFloat((elapsed / 60 / Math.max(s.distance, 0.01)).toFixed(2)),
    activityType: s.activityType || _activityType,
    planType:     activityTitle,
    title:        activityTitle,
    description:  activityDesc,
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
  stopActivityNotification();
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
  _gpsWarmupCount      = 0;
  _gpsLastGoodFix      = null;
  _currentGpsSpeed     = null;
  _lockedWhileRunning  = false;
  _kalman.reset();
  _clearRunSession();
  LockScreen.stop();
  _releaseWakeLock();
  _destroyLiveMap();

  // Destroy summary map too to free memory
  if (_sumMap) { _sumMap.remove(); _sumMap = null; }

  // Reset activity type to 'run' so next session doesn't inherit previous selection
  _activityType = 'run';
  document.querySelectorAll('.activity-pill').forEach(p => p.classList.remove('active'));
  const runPill = document.querySelector('.activity-pill[data-type="run"]');
  if (runPill) runPill.classList.add('active');
  const emojiEl = document.getElementById('run-idle-emoji');
  const labelEl = document.getElementById('run-idle-label');
  if (emojiEl) emojiEl.textContent = '🏃';
  if (labelEl) labelEl.textContent = 'START A RUN';

  document.getElementById('run-summary')?.classList.add('hidden');
  document.getElementById('run-save-screen')?.classList.add('hidden');
  document.getElementById('run-active')?.classList.add('hidden');
  document.getElementById('run-idle').style.display = 'flex';
}

// ── BACKGROUND / FOREGROUND RECOVERY ─────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (APP.runSession && !APP.runSession.paused) {
      // Auto-pause when screen locks so timer doesn't run without GPS
      _lockedWhileRunning = true;
      APP.runSession.paused   = true;
      APP.runSession.pausedAt = Date.now();
      _saveRunSession();
      // Update pause button UI if visible
      const btn = document.getElementById('pause-run-btn');
      if (btn) btn.textContent = '▶ Resume';
    }
    return;
  }

  // Screen unlocked
  if (!APP.runSession) return;

  if (_lockedWhileRunning && APP.runSession.paused) {
    // Auto-resume — undo the auto-pause we applied on lock
    _lockedWhileRunning = false;
    if (APP.runSession.pausedAt) {
      APP.runSession.totalPaused += (Date.now() - APP.runSession.pausedAt);
    }
    APP.runSession.pausedAt = null;
    APP.runSession.paused   = false;
    _saveRunSession();
    const btn = document.getElementById('pause-run-btn');
    if (btn) btn.textContent = '⏸ Pause';
    showToast('GPS resumed 📍', 'success');
  }

  if (APP.runSession.paused) return; // user manually paused — don't restart GPS

  _requestWakeLock();
  _gpsWarmupCount = 0;
  _gpsLastGoodFix = null;
  _currentGpsSpeed = null;
  _kalman.reset();   // GPS may have drifted while screen was locked
  _setGpsBadge(false);
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

function togglePlanDay(planKey, week, day, dist, dur) {
  if (isPlanDayDone(planKey, week, day)) {
    // Unmark — remove the completion record
    const key = _planDayKey(planKey, week, day);
    Store.remove(key);
    showToast('Day unmarked.', 'info');
    renderMyPlan();
  } else {
    // Mark done
    _markPlanDayDone(planKey, week, day, dist, dur);
    showToast('Day marked complete! 🎉', 'success');
    renderMyPlan();
    checkPlanCompletion(planKey, week);
  }
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
  // Run tab ALWAYS visible — never hide it
  if (runTab) runTab.style.display = '';
  if (active) {
    const plan = (window.APP_DATA_DEFAULT||window.APP_DATA).running.plans[active.planKey];
    tab.style.display = '';
    if (label) label.textContent = plan ? (active.planKey + ' Plan') : 'My Plan';
    // Show plan emoji in nav icon
    const icon = document.getElementById('nav-myplan-icon');
    if (icon && plan) icon.textContent = plan.emoji || '🎯';
  } else {
    tab.style.display = 'none';
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
          <!-- Toggle to mark done/undone -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
            <div style="font-size:13px;color:${isDone ? 'var(--g5)' : 'var(--text3)'}">
              ${isDone ? '✅ Completed' : isRest ? 'Mark rest day done' : 'Mark as completed'}
            </div>
            <div onclick="togglePlanDay('${active.planKey}',${s.week},${s.day},${s.dist},${s.dur})"
              style="
                width:52px;height:28px;border-radius:14px;cursor:pointer;
                background:${isDone ? plan.color : 'var(--bg3)'};
                border:1.5px solid ${isDone ? plan.color : 'var(--border)'};
                position:relative;transition:all .25s;flex-shrink:0;
              ">
              <div style="
                width:22px;height:22px;border-radius:50%;
                background:${isDone ? '#fff' : 'var(--text3)'};
                position:absolute;top:2px;
                left:${isDone ? '26px' : '2px'};
                transition:left .25s;
                box-shadow:0 1px 4px rgba(0,0,0,0.3);
              "></div>
            </div>
          </div>
        </div>`;
    }).join('')}

    <div style="display:flex;gap:10px;margin-top:10px">
      <div class="card card-sm" style="flex:1;background:rgba(67,160,90,0.06);border-color:rgba(67,160,90,0.2);text-align:center;cursor:pointer;padding:12px" onclick="navTo('running')">
        <div style="font-size:20px;margin-bottom:4px">🏃</div>
        <div style="font-size:12px;color:var(--g5);font-weight:700">Start a Run</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">GPS tracking</div>
      </div>
      <div class="card card-sm" style="flex:1;background:rgba(30,136,229,0.06);border-color:rgba(30,136,229,0.2);text-align:center;cursor:pointer;padding:12px" onclick="navTo('running');setTimeout(()=>renderRunningTabs('history'),300)">
        <div style="font-size:20px;margin-bottom:4px">📊</div>
        <div style="font-size:12px;color:#64b5f6;font-weight:700">Run History</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">View past runs</div>
      </div>
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


// Coerce any date value (Date object, string, number) to YYYY-MM-DD string
function _toYMD(v) {
  if (!v) return '';
  if (typeof v === 'string') {
    if (v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return _ymdLocal(d);
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

// Calendar state for running history
let _runHistoryYear  = new Date().getFullYear();
let _runHistoryMonth = new Date().getMonth();
let _selectedRunDate = todayStr();

function changeRunMonth(delta) {
  _runHistoryMonth += delta;
  if (_runHistoryMonth > 11) { _runHistoryMonth = 0;  _runHistoryYear++; }
  if (_runHistoryMonth < 0)  { _runHistoryMonth = 11; _runHistoryYear--; }
  const now = new Date();
  const nextBtn = document.getElementById('run-next-btn');
  if (nextBtn) {
    const atCurrent = _runHistoryYear === now.getFullYear() && _runHistoryMonth >= now.getMonth();
    nextBtn.disabled      = atCurrent;
    nextBtn.style.opacity = atCurrent ? '0.3' : '1';
  }
  renderRunHistory();
}

function selectRunDate(dateStr) {
  _selectedRunDate = dateStr;
  renderRunHistory();
  navigator.vibrate && navigator.vibrate(20);
}

function renderRunHistory() {
  const user      = APP.currentUser;
  // Normalize each log's date to YYYY-MM-DD so grouping/calendar works
  const allLogs   = Store.getUserRunLogs(user.id)
    .map(r => ({
      ...r,
      date:      _toYMD(r.date),
      timestamp: typeof r.timestamp === 'string'
        ? r.timestamp
        : (r.timestamp instanceof Date && !isNaN(r.timestamp.getTime()) ? r.timestamp.toISOString() : ''),
    }))
    .sort((a, b) => (b.timestamp||b.date||'').localeCompare(a.timestamp||a.date||''));

  const container = document.getElementById('run-history-list');
  const statsEl   = document.getElementById('run-stats-row');

  // ── Summary stats ─────────────────────────────────────────────
  const totalKm   = allLogs.reduce((a, r) => a + (r.distance || 0), 0);
  const totalRuns = allLogs.length;
  const totalTime = allLogs.reduce((a, r) => a + (r.duration || 0), 0);
  const totalKcal = allLogs.reduce((a, r) => {
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

  // ── Calendar ──────────────────────────────────────────────────
  const calEl     = document.getElementById('run-cal');
  const monthLbl  = document.getElementById('run-month-label');
  if (monthLbl) {
    monthLbl.textContent = new Date(_runHistoryYear, _runHistoryMonth, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (calEl) {
    calEl.innerHTML = _buildRunCalendar(allLogs, _runHistoryYear, _runHistoryMonth);
  }

  // ── Day log title ─────────────────────────────────────────────
  const logTitleEl = document.getElementById('run-log-title');
  if (logTitleEl) {
    const isToday = _selectedRunDate === todayStr();
    if (isToday) {
      logTitleEl.textContent = 'Today\'s Activities';
    } else {
      const d = new Date(_selectedRunDate + 'T12:00:00');
      logTitleEl.textContent = isNaN(d.getTime())
        ? 'Activity Log'
        : d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    }
  }

  if (!container) return;
  if (!allLogs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏃</div><p>No activities logged yet.<br>Start your first one!</p></div>';
    return;
  }

  // ── Filter to selected day's runs ─────────────────────────────
  const dayRuns = allLogs
    .map((r, gi) => ({ ...r, _globalIdx: gi }))
    .filter(r => r.date === _selectedRunDate);

  if (!dayRuns.length) {
    const isFuture = _selectedRunDate > todayStr();
    const isToday  = _selectedRunDate === todayStr();
    container.innerHTML = `
      <div style="text-align:center;padding:28px 16px">
        <div style="font-size:40px;margin-bottom:10px">${isFuture ? '🗓️' : isToday ? '🏃' : '😴'}</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">
          ${isFuture ? 'Future date' : isToday ? 'No activity yet today' : 'No activity'}
        </div>
        <div style="font-size:13px;color:var(--text3)">
          ${isFuture ? 'Come back on this date!' : isToday ? 'Start a run to log it here.' : 'Recovery day.'}
        </div>
      </div>`;
    return;
  }

  // ── Day's runs ────────────────────────────────────────────────
  container.innerHTML = `
    <div style="font-size:13px;color:var(--text3);margin-bottom:10px">
      ${dayRuns.length} activit${dayRuns.length > 1 ? 'ies' : 'y'} on this day
    </div>
    ${dayRuns.map(r => {
      const type     = r.activityType || 'run';
      const meta     = ACTIVITY_META[type] || ACTIVITY_META.run;
      const kcal     = Math.round((r.distance || 0) * meta.kcalPerKm);
      const timeStr  = r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
        : '';
      const hasMap   = r.coords && r.coords.length >= 2;
      const idx      = r._globalIdx;
      return `
        <div class="card run-history-card" style="margin-bottom:8px;cursor:pointer"
          onclick="_showRunDetail(${idx})">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:38px;height:38px;border-radius:10px;
                background:${meta.color}22;border:1.5px solid ${meta.color}55;
                display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                ${meta.emoji}
              </div>
              <div>
                <div style="font-weight:700;font-size:14px">${meta.label} · ${r.planType || 'Free Activity'}</div>
                ${timeStr ? `<div style="font-size:11px;color:var(--text3)">${timeStr}</div>` : ''}
              </div>
            </div>
            <div style="font-size:12px;color:var(--text3)">${hasMap ? '🗺 ' : ''}›</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;
            background:var(--bg3);border-radius:10px;padding:10px;text-align:center">
            <div>
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${(r.distance||0).toFixed(2)}</div>
              <div style="font-size:10px;color:var(--text3)">km</div>
            </div>
            <div>
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${fmtTime(r.duration||0)}</div>
              <div style="font-size:10px;color:var(--text3)">time</div>
            </div>
            <div>
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${fmtPace(r.distance, r.duration)}</div>
              <div style="font-size:10px;color:var(--text3)">pace</div>
            </div>
            <div>
              <div style="font-family:var(--font-display);font-size:18px;color:var(--g5)">${kcal}</div>
              <div style="font-size:10px;color:var(--text3)">kcal</div>
            </div>
          </div>
        </div>`;
    }).join('')}
  `;
}

// Build calendar grid for running history
function _buildRunCalendar(logs, year, month) {
  const now = new Date();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // LOCAL date (not UTC) — fixes timezone bug
  const todayStr_   = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  // Map: date → number of activities + total km
  const dayMap = {};
  logs.forEach(l => {
    const d = l.date || '';
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { count: 0, km: 0, emoji: null };
    dayMap[d].count++;
    dayMap[d].km += (l.distance || 0);
    if (!dayMap[d].emoji) {
      const meta = ACTIVITY_META[l.activityType || 'run'] || ACTIVITY_META.run;
      dayMap[d].emoji = meta.emoji;
    }
  });

  const headers = ['S','M','T','W','T','F','S']
    .map(d => `<div class="cal-day header">${d}</div>`).join('');

  let cells = Array(firstDay).fill('<div class="cal-day" style="background:transparent"></div>').join('');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = dateStr === todayStr_;
    const isFuture = new Date(dateStr + 'T12:00:00') > now && !isToday;
    const data     = dayMap[dateStr];
    const hasActivity = !!data;
    const isSelected  = dateStr === _selectedRunDate;

    let cellClass = 'cal-day';
    let innerHtml = d;

    if (isFuture) {
      cellClass += ' cal-future';
    } else if (hasActivity) {
      cellClass += ' completed';
      if (isToday) cellClass += ' today';
      innerHtml = `<span style="font-size:14px">${data.emoji || '🏃'}</span>`;
    } else if (isToday) {
      cellClass += ' today';
    }

    const sel = isSelected && !isFuture
      ? 'outline:2px solid var(--accent);outline-offset:2px;' : '';
    const cursor = isFuture ? 'default' : 'pointer';
    const click  = isFuture ? '' : `onclick="selectRunDate('${dateStr}')"`;

    cells += `<div class="${cellClass}" ${click} style="cursor:${cursor};${sel}" title="${dateStr}${data?` — ${data.count} run${data.count>1?'s':''} · ${data.km.toFixed(1)}km`:''}">${innerHtml}</div>`;
  }

  return `<div class="cal-grid">${headers}${cells}</div>
    <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text3);justify-content:center">
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:var(--g3);margin-right:4px;vertical-align:middle"></span>Activity</span>
      <span><span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:2px solid var(--accent);margin-right:4px;vertical-align:middle"></span>Today</span>
    </div>`;
}

// ── KM SPLITS ────────────────────────────────────────────────────
function _calcKmSplits(coords, totalDistance) {
  if (!coords || coords.length < 2) return [];

  const splits  = [];
  let distAcc   = 0;       // accumulated distance in km
  let kmMark    = 1;       // next km boundary to cross
  let kmStart   = coords[0].ts; // timestamp when this km started

  for (let i = 1; i < coords.length; i++) {
    const c    = coords[i];
    const prev = coords[i - 1];
    if (!c.ts || !prev.ts) continue;

    const d = haversine(prev.lat, prev.lon, c.lat, c.lon);
    if (d <= 0 || d > 0.5) continue; // skip bad points

    distAcc += d;

    // Crossed a km boundary?
    if (distAcc >= kmMark) {
      const kmEndTs   = c.ts;
      const kmTimeSec = Math.round((kmEndTs - kmStart) / 1000);
      splits.push({
        km:      kmMark,
        timeSec: kmTimeSec,
        pace:    kmTimeSec > 0 ? fmtPace(1, kmTimeSec) : '--:--',
      });
      kmMark++;
      kmStart = c.ts;
    }
  }

  // Last partial km (if > 0.1km remaining)
  const lastKmDist = distAcc - (kmMark - 1);
  if (lastKmDist >= 0.1 && coords.length > 0) {
    const lastTs    = coords[coords.length - 1].ts;
    const kmTimeSec = Math.round((lastTs - kmStart) / 1000);
    // Extrapolate pace for a full km
    const extrapolatedSec = lastKmDist > 0 ? Math.round(kmTimeSec / lastKmDist) : 0;
    splits.push({
      km:       kmMark,
      timeSec:  kmTimeSec,
      pace:     extrapolatedSec > 0 ? fmtPace(1, extrapolatedSec) : '--:--',
      partial:  true,
      partialKm: parseFloat(lastKmDist.toFixed(2)),
    });
  }

  return splits;
}

function _renderKmSplits(coords, totalDistance, color) {
  const splits = _calcKmSplits(coords, totalDistance);
  if (!splits || splits.length < 2) return ''; // need at least 2 splits to show

  // Find fastest and slowest for bar scaling
  const paces    = splits.map(s => s.timeSec / (s.partial ? s.partialKm : 1));
  const maxPace  = Math.max(...paces);
  const minPace  = Math.min(...paces);
  const paceRange = maxPace - minPace || 1;

  const accentColor = color || 'var(--g4)';

  const rows = splits.map(s => {
    const paceSec = s.timeSec / (s.partial ? s.partialKm : 1);
    // Bar width: fastest pace = 100%, slowest = 30%
    const barPct  = Math.round(30 + ((maxPace - paceSec) / paceRange) * 70);
    const isBest  = paceSec === minPace;
    const isWorst = paceSec === maxPace && splits.length > 2;
    const label   = s.partial ? `${s.km} *` : `${s.km}`;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 0;
        border-bottom:1px solid rgba(255,255,255,0.05)">
        <!-- Km number -->
        <div style="width:24px;text-align:right;font-size:13px;font-weight:700;
          color:${isBest ? accentColor : 'var(--text3)'};flex-shrink:0">${label}</div>
        <!-- Pace -->
        <div style="width:52px;font-size:13px;font-weight:700;
          color:${isBest ? accentColor : isWorst ? '#ef9a9a' : 'var(--text)'};
          flex-shrink:0">${s.pace}</div>
        <!-- Bar -->
        <div style="flex:1;height:10px;background:var(--bg3);border-radius:5px;overflow:hidden">
          <div style="
            height:100%;width:${barPct}%;border-radius:5px;
            background:${isBest ? accentColor : isWorst ? 'rgba(239,154,154,0.6)' : 'rgba(255,255,255,0.2)'};
            transition:width .4s ease;
          "></div>
        </div>
        <!-- Time for this km -->
        <div style="width:44px;text-align:right;font-size:11px;color:var(--text3);
          flex-shrink:0">${fmtTime(s.timeSec)}</div>
      </div>`;
  }).join('');

  return `
    <div style="margin-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:var(--text)">📏 Km Splits</div>
        ${splits.some(s => s.partial) ? '<div style="font-size:11px;color:var(--text3)">* partial km</div>' : ''}
      </div>
      <!-- Header row -->
      <div style="display:flex;align-items:center;gap:10px;padding:0 0 6px;
        border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:2px">
        <div style="width:24px;text-align:right;font-size:10px;color:var(--text3);font-weight:700;flex-shrink:0">KM</div>
        <div style="width:52px;font-size:10px;color:var(--text3);font-weight:700;flex-shrink:0">PACE</div>
        <div style="flex:1;font-size:10px;color:var(--text3);font-weight:700"></div>
        <div style="width:44px;text-align:right;font-size:10px;color:var(--text3);font-weight:700;flex-shrink:0">TIME</div>
      </div>
      ${rows}
    </div>`;
}

// ── DELETE RUN LOG ───────────────────────────────────────────────
function confirmDeleteRunLog() {
  // Get ID from _currentDetailRunId, or fall back to the full log object
  const logId = _currentDetailRunId
    || window._currentRunDetailLog?.id
    || window._currentRunDetailLog?.timestamp
    || null;
  if (!logId) {
    showToast('Could not identify activity to delete', 'error');
    return;
  }
  // Keep _currentDetailRunId in sync
  _currentDetailRunId = logId;
  showConfirm(
    '🗑️ Delete Activity',
    'This will permanently delete this activity from your history and cloud backup. This cannot be undone.',
    'Delete',
    'Cancel',
    () => _deleteRunLog(logId),
    null,
    'danger'
  );
}

async function _deleteRunLog(logId) {
  const user = APP.currentUser;
  if (!user || !logId) return;

  // 1. Delete from localStorage immediately
  const removed = Store.deleteRunLog(user.id, logId);

  // 2. Close modal
  closeModal('modal-run-detail');

  // 3. Refresh all history views everywhere
  if (typeof renderRunHistory === 'function')       renderRunHistory();
  if (typeof renderGlobalHistory === 'function')    renderGlobalHistory();
  if (typeof renderDashboardStats === 'function')   renderDashboardStats();
  if (typeof renderDashboardTiles === 'function')   renderDashboardTiles();
  // Re-render day log if currently viewing history
  if (typeof _selectedHistoryDate === 'string' && _selectedHistoryDate) {
    if (typeof selectHistoryDay === 'function') selectHistoryDay(_selectedHistoryDate);
  }

  showToast('Activity deleted.', 'success');

  // 4. Delete from Google Sheets in background
  try {
    const res = await sheetsPost('deleteRunLog', { logId, userId: user.id });
    if (!res?.success) {
      console.warn('GAS delete failed:', res?.error);
    }
  } catch(e) {
    console.warn('GAS delete error:', e);
    // Local delete already done — not critical if sheets fails
  }

  _currentDetailRunId = null;
}

// ── RUN DETAIL MODAL ──────────────────────────────────────────────
let _detailMapInst      = null;
let _currentDetailRunId = null; // ID of run currently shown in detail modal

// ── HISTORY RUN PB INFO ───────────────────────────────────────────
// Shows PB badges and motivation for any historical run (not just post-run)
function _renderHistoryRunPBInfo(r) {
  const el = document.getElementById('run-detail-pb-badges');
  if (!el) return;

  const user    = APP.currentUser;
  const actType = r.activityType || 'run';
  const meta    = ACTIVITY_META[actType] || ACTIVITY_META.run;
  const distance = r.distance || 0;
  const elapsed  = r.duration || 0;
  const pace     = distance > 0 ? elapsed / 60 / distance : 9999;

  // Get ALL run logs for this activity type sorted by date
  const allLogs = Store.getUserRunLogs(user.id)
    .filter(l => (l.activityType || 'run') === actType)
    .sort((a,b) => (a.timestamp||a.date||'').localeCompare(b.timestamp||b.date||''));

  // Find index of this run in history
  const thisIdx = allLogs.findIndex(l =>
    l.date === r.date &&
    Math.abs((l.distance||0) - distance) < 0.01 &&
    Math.abs((l.duration||0) - elapsed) < 10
  );

  let html = '';

  // Check milestones hit during this run
  const milestones = ACTIVITY_MILESTONES[actType] || ACTIVITY_MILESTONES.run;
  // Find best distance from runs BEFORE this one
  const prevBest = thisIdx > 0
    ? Math.max(...allLogs.slice(0, thisIdx).map(l => l.distance || 0), 0)
    : 0;
  const hitMilestone = milestones.find(m => m.dist <= distance && m.dist > prevBest);

  if (hitMilestone) {
    html += `
      <div style="background:linear-gradient(135deg,${meta.color}22,${meta.color}08);
        border:1px solid ${meta.color}44;border-radius:14px;padding:14px;text-align:center;margin-bottom:8px">
        <div style="font-size:28px;margin-bottom:6px">🏅</div>
        <div style="font-size:15px;font-weight:700;color:${meta.color};margin-bottom:4px">${hitMilestone.label}</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.5">${hitMilestone.msg}</div>
      </div>`;
  }

  // Check PBs this run set (vs runs before it)
  if (thisIdx > 0) {
    const prevRuns   = allLogs.slice(0, thisIdx);
    const prevDist   = Math.max(...prevRuns.map(l => l.distance||0), 0);
    const prevDur    = Math.max(...prevRuns.map(l => l.duration||0), 0);
    const prevPaces  = prevRuns.filter(l=>(l.distance||0)>=0.1).map(l=> l.duration/60/(l.distance||1));
    const prevPace   = prevPaces.length ? Math.min(...prevPaces) : 9999;

    const pbCards = [];
    // Only show PBs if the previous best was also a meaningful session
    if (distance >= 0.1 && distance > prevDist && prevDist >= 0.1)
      pbCards.push({ icon:'📏', label:'Longest '+meta.label, val: distance.toFixed(2)+' km', prev: prevDist.toFixed(2)+' km', color: meta.color });
    if (elapsed >= 60 && elapsed > prevDur && prevDur >= 60)
      pbCards.push({ icon:'⏱', label:'Longest Time', val: fmtTime(elapsed), prev: fmtTime(prevDur), color:'#43a05a' });
    if (distance >= 0.1 && pace < prevPace && pace < 9999 && prevDist >= 0.1)
      pbCards.push({ icon:'⚡', label:'Fastest Pace', val: fmtPace(distance,elapsed)+' /km', prev: prevPaces.length?fmtPace(1,prevPace*60)+' /km':'--:--', color:'#1e88e5' });

    pbCards.forEach(pb => {
      html += `
        <div style="background:linear-gradient(135deg,${pb.color}20,${pb.color}08);
          border:1px solid ${pb.color}40;border-radius:14px;padding:12px 14px;
          display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="font-size:26px;flex-shrink:0">${pb.icon}</div>
          <div style="flex:1">
            <div style="font-size:10px;font-weight:700;color:${pb.color};text-transform:uppercase;letter-spacing:.08em">Personal Best</div>
            <div style="font-size:14px;font-weight:700;color:var(--text);margin:2px 0">${pb.label}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:16px;font-weight:700;color:${pb.color}">${pb.val}</span>
              <span style="font-size:11px;color:var(--text3)">prev ${pb.prev}</span>
            </div>
          </div>
          <div style="font-size:20px">🏅</div>
        </div>`;
    });
  } else if (thisIdx === 0) {
    // First ever run of this type
    const msg = FIRST_ACTIVITY_MSG[actType] || FIRST_ACTIVITY_MSG.run;
    html += `
      <div style="background:linear-gradient(135deg,${meta.color}22,${meta.color}11);
        border:1px solid ${meta.color}55;border-radius:14px;padding:14px;text-align:center;margin-bottom:8px">
        <div style="font-size:28px;margin-bottom:6px">${msg.emoji}</div>
        <div style="font-size:14px;font-weight:700;color:${meta.color};margin-bottom:4px">First ${meta.label}!</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.5">${msg.msg}</div>
      </div>`;
  }

  // Motivational encouragement if no PBs
  if (!html) {
    const encouragements = [
      'Every session builds strength. Keep going! 💪',
      'Consistency is the key to improvement. 📈',
      'Your future self thanks you for this one. 🙌',
      'Progress happens one session at a time. 🌟',
    ];
    const enc = encouragements[Math.floor(Math.random() * encouragements.length)];
    html = `
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);
        border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:13px;color:var(--text2);line-height:1.5">${enc}</div>
      </div>`;
  }

  el.innerHTML = html;
}


function openHistoryCardFromDetail() {
  // Use the stored full log object directly — no ID lookup needed
  const log = window._currentRunDetailLog;
  if (!log) {
    showToast('Activity data not found', 'error');
    return;
  }
  closeModal('modal-run-detail');
  // Store log for HCM editor, reset photo, then show the photo-selection modal
  _hcmLog      = log;
  _hcmPhotoImg = null;
  // Use the history card modal so user can optionally add a photo before opening editor
  setTimeout(() => openHistoryCardModal(log), 300);
}

function _showRunDetail(idx) {
  const user = APP.currentUser;
  const logs = Store.getUserRunLogs(user.id)
    .sort((a, b) => (b.timestamp||b.date||'').localeCompare(a.timestamp||a.date||''));
  const r    = logs[idx];
  if (!r) return;
  // Track which run is open so delete knows which one to remove
  _currentDetailRunId = r.id || r.timestamp || r.date + '_' + (r.distance||0) || null;

  // Store full log for card generation
  window._currentRunDetailId  = r.id;
  window._currentRunDetailLog = r;  // Store full log object

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

      <!-- Km splits -->
      ${r.coords && r.coords.length >= 2 ? _renderKmSplits(r.coords, r.distance, meta.color) : ''}

      <!-- PB & motivation for this run -->
      <div id="run-detail-pb-badges" style="margin-top:8px"></div>

    </div>`;

  openModal('modal-run-detail');
  // Show PB info for this historical run
  _renderHistoryRunPBInfo(r);

  // Render Leaflet map inside modal after it opens
  if (hasMap) {
    setTimeout(() => {
      _loadLeaflet(() => {
        const mapEl = document.getElementById('run-detail-map');
        if (!mapEl) return;
        if (_detailMapInst) { _detailMapInst.remove(); _detailMapInst = null; }

        // Apply display smoothing to history coords too
        const smoothedCoords = _smoothCoordsForDisplay(r.coords);
        const latlngs = smoothedCoords.map(c => [c.lat, c.lon]);
        _detailMapInst = L.map(mapEl, {
          zoomControl:     false,
          attributionControl: false,
          dragging:        true,
          scrollWheelZoom: false,
          tap:             false,
          touchZoom:       true,
          doubleClickZoom: false,
        });

        L.tileLayer(_getTileLayer(_mapStyle), { maxZoom: 19 }).addTo(_detailMapInst);

        L.polyline(latlngs, {
          color:   '#2d9e5a',
          weight:  4,
          opacity: 1.0,
          lineCap: 'round',
        }).addTo(_detailMapInst);

        // Start marker — green
        L.circleMarker(latlngs[0], {
          radius: 6, fillColor: '#2d9e5a', color: '#fff', weight: 2, fillOpacity: 1,
        }).addTo(_detailMapInst);

        // Finish marker — green
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 6, fillColor: '#2d9e5a', color: '#fff', weight: 2, fillOpacity: 1,
        }).addTo(_detailMapInst);

        _detailMapInst.fitBounds(L.latLngBounds(latlngs).pad(0.15));
      });
    }, 250); // wait for modal animation to complete before sizing map
  }
}

// ── DELETE RUN ACTIVITY ──────────────────────────────────────────
async function deleteRunActivity(logId) {
  const user = APP.currentUser;
  if (!user || !logId) return;

  if (!confirm('Delete this activity?\n\nThis will permanently remove it from your history and cloud backup. This cannot be undone.')) return;

  // 1. Delete from localStorage immediately
  Store.deleteRunLog(user.id, logId);

  // 2. Close the detail modal
  closeModal('modal-run-detail');

  // 3. Refresh all history views right away
  if (typeof renderGlobalHistory === 'function') renderGlobalHistory();
  if (typeof renderRunHistory    === 'function') renderRunHistory();
  if (typeof refreshDashboard    === 'function') refreshDashboard();

  showToast('Activity deleted.', 'info');

  // 4. Delete from Google Sheets in background (non-blocking)
  try {
    await sheetsPost('deleteRunLog', { userId: user.id, logId });
  } catch(e) {
    console.warn('Sheets delete failed — removed locally:', e);
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
// Keys: ff_pbs_{userId}_{activityType}  e.g. ff_pbs_u123_run
function _getPBs(userId, activityType) {
  const type = activityType || 'run';
  return Store.get('ff_pbs_' + userId + '_' + type, { distance: 0, pace: 9999, duration: 0, count: 0 });
}
function _savePBs(userId, pbs, activityType) {
  const type = activityType || 'run';
  Store.set('ff_pbs_' + userId + '_' + type, pbs);
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
    const d = _ymdLocal(cur);
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate()-1); }
    else if (i > 0) break;
    else { cur.setDate(cur.getDate()-1); if (!dates.includes(_ymdLocal(cur))) break; }
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
    // CRITICAL FIX: Save ALL baseline stats on first session, not just count
    // Without this, pbs.distance=0 and pbs.duration=0 after first session,
    // making every subsequent session trigger false "NEW PB" badges
    newPbs.distance = distance;
    newPbs.pace     = pace < 9999 ? pace : 9999;
    newPbs.duration = elapsed;
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
  // Minimum thresholds: distance must be meaningful to qualify as a PB
  // (avoids 0.02km "test walks" beating 1km genuine sessions)
  const MIN_PB_DISTANCE = 0.1;   // at least 100m to earn a distance/pace PB
  const MIN_PB_DURATION = 60;    // at least 60 seconds to earn a time PB
  // Previous session must ALSO be meaningful to count as a real baseline
  // This prevents: "0.02km test walk → 1.52km real walk = NEW PB" false positives
  const prevDistMeaningful = (pbs.distance || 0) >= MIN_PB_DISTANCE;
  const prevDurMeaningful  = (pbs.duration || 0) >= MIN_PB_DURATION;

  if (distance >= MIN_PB_DISTANCE && distance > (pbs.distance || 0)) {
    newPbs.distance = distance;
  }
  if (distance >= MIN_PB_DISTANCE && pace < (pbs.pace || 9999)) {
    newPbs.pace = pace;
  }
  if (elapsed >= MIN_PB_DURATION && elapsed > (pbs.duration || 0)) {
    newPbs.duration = elapsed;
  }

  // Only show PB badge if the previous baseline was also a real session
  if (newPbs.distance > (pbs.distance || 0) && prevDistMeaningful) {
    pbBadges.push({ type: 'distance', label: `Longest ${meta.label}`, value: `${distance.toFixed(2)} km`, prev: `${(pbs.distance||0).toFixed(2)} km`, color: meta.color, icon: '📏' });
  }
  if (newPbs.pace < (pbs.pace || 9999) && distance >= MIN_PB_DISTANCE && prevDistMeaningful) {
    pbBadges.push({ type: 'pace', label: 'Fastest Pace', value: fmtPace(distance, elapsed) + ' /km', prev: pbs.pace < 9999 ? fmtPace(1, pbs.pace * 60) + ' /km' : '--:--', color: '#1e88e5', icon: '⚡' });
  }
  if (newPbs.duration > (pbs.duration || 0) && prevDurMeaningful) {
    pbBadges.push({ type: 'time', label: 'Longest Time', value: fmtTime(elapsed), prev: fmtTime(pbs.duration || 0), color: '#43a05a', icon: '⏱' });
  }

  if (pbBadges.length) {
    html += pbBadges.map(pb => `
      <div style="background:linear-gradient(135deg,${pb.color}20,${pb.color}08);
        border:1px solid ${pb.color}40;border-radius:14px;padding:14px 16px;
        display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <div style="font-size:28px;flex-shrink:0">${pb.icon}</div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:${pb.color};text-transform:uppercase;
            letter-spacing:.08em;margin-bottom:2px">NEW PERSONAL BEST</div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${pb.label}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span style="font-size:18px;font-weight:700;color:${pb.color}">${pb.value}</span>
            <span style="font-size:11px;color:var(--text3)">prev ${pb.prev}</span>
          </div>
        </div>
        <div style="font-size:22px">🏅</div>
      </div>`).join('');
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
// Apply post-processing smoothing to stored coords for display
// Uses Douglas-Peucker simplification to remove redundant points
// then a light moving-average pass to reduce any remaining jitter
// ── Ramer-Douglas-Peucker line simplification ─────────────────────
// Removes redundant points while preserving all real shape changes.
// epsilon is in degrees — 0.00003 ≈ 3m which eliminates GPS jitter
// but preserves corners/turns cleanly.
function _rdpSimplify(coords, epsilon) {
  if (coords.length < 3) return coords;
  // Find the point farthest from the line between start and end
  let maxDist = 0, maxIdx = 0;
  const s = coords[0], e = coords[coords.length - 1];
  for (let i = 1; i < coords.length - 1; i++) {
    const d = _perpendicularDist(coords[i], s, e);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left  = _rdpSimplify(coords.slice(0, maxIdx + 1), epsilon);
    const right = _rdpSimplify(coords.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [s, e];
}

function _perpendicularDist(p, a, b) {
  const dx = b.lon - a.lon, dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) {
    return Math.sqrt((p.lon - a.lon) ** 2 + (p.lat - a.lat) ** 2);
  }
  const t = ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.sqrt((p.lon - a.lon - tc * dx) ** 2 + (p.lat - a.lat - tc * dy) ** 2);
}

function _smoothCoordsForDisplay(coords) {
  if (!coords || coords.length < 3) return coords || [];

  // Step 1: Gaussian-weighted moving average to remove micro-jitter
  // Uses a 5-point kernel [0.1, 0.2, 0.4, 0.2, 0.1] for smooth curves
  const n = coords.length;
  const w = [0.1, 0.2, 0.4, 0.2, 0.1];
  const gSmoothed = [coords[0]];
  for (let i = 1; i < n - 1; i++) {
    let lat = 0, lon = 0, wSum = 0;
    for (let j = -2; j <= 2; j++) {
      const idx = Math.max(0, Math.min(n - 1, i + j));
      const wt  = w[j + 2];
      lat  += coords[idx].lat * wt;
      lon  += coords[idx].lon * wt;
      wSum += wt;
    }
    gSmoothed.push({ lat: lat / wSum, lon: lon / wSum, ts: coords[i].ts });
  }
  gSmoothed.push(coords[n - 1]);

  // Step 2: RDP simplification — remove redundant intermediate points
  // 0.000025 degrees ≈ 2.5m — removes noise while keeping all real turns
  const simplified = _rdpSimplify(gSmoothed, 0.000025);

  return simplified;
}

function _renderRunRouteMap(coords) {
  const el = document.getElementById('sum-route-map');
  if (!el) return;

  // Destroy any previous summary map
  if (_sumMap) { _sumMap.remove(); _sumMap = null; }

  // Filter and deduplicate coords
  const seen = new Set();
  const pts  = _smoothCoordsForDisplay(
    (coords || []).filter(c => {
      if (!c.lat || !c.lon) return false;
      const key = `${c.lat.toFixed(5)},${c.lon.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  );

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
      zoomControl:        false,
      attributionControl: false,
      dragging:           true,
      scrollWheelZoom:    false,
      tap:                false,
      touchZoom:          true,
      doubleClickZoom:    false,
    });

    L.tileLayer(_getTileLayer(_mapStyle), { maxZoom: 19 }).addTo(_sumMap);

    // Route line — always FitFlow green to match activity card
    L.polyline(latlngs, {
      color:   '#2d9e5a',
      weight:  4,
      opacity: 1.0,
      lineCap: 'round',
    }).addTo(_sumMap);

    // Start marker — green
    L.circleMarker(latlngs[0], {
      radius: 6, fillColor: '#2d9e5a', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(_sumMap);

    // Finish marker — green
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 6, fillColor: '#2d9e5a', color: '#fff', weight: 2, fillOpacity: 1,
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

// ── SHARE RUN ─────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
// ACTIVITY CARD GENERATOR
// ════════════════════════════════════════════════════════════════

var _cardTheme   = 'dark';
var _cardPhotoImg    = null;
var _historyRunLogs  = {};  // Store run logs by ID for card generation

var _CARD_THEMES = {
  dark:   { bg:'#0d1a10', overlay:'rgba(10,26,14,VV)',   accent:'#43d17a', text:'#e0ffe0', sub:'#7dcf8e', dim:'rgba(255,255,255,0.10)', route:'#43d17a' },
  light:  { bg:'#f0f9f2', overlay:'rgba(235,248,238,VV)', accent:'#1a5c28', text:'#0a2010', sub:'#2d7a3a', dim:'rgba(0,0,0,0.07)',      route:'#1a5c28' },
  night:  { bg:'#0a0a1e', overlay:'rgba(10,10,30,VV)',   accent:'#7eb8f7', text:'#e8f0ff', sub:'#9ec8ff', dim:'rgba(255,255,255,0.10)', route:'#7eb8f7' },
  sunset: { bg:'#2d1a00', overlay:'rgba(45,26,0,VV)',    accent:'#f7a940', text:'#fff0d0', sub:'#f7c97a', dim:'rgba(255,255,255,0.10)', route:'#f7a940' },
};

function _toggleCardGen() {
  const body    = document.getElementById('card-gen-body');
  const chevron = document.getElementById('card-gen-chevron');
  if (!body) return;
  const open = body.style.display === 'block';
  body.style.display   = open ? 'none' : 'block';
  chevron.style.transform = open ? '' : 'rotate(90deg)';
}

function _setCardTheme(t, btn) {
  _cardTheme = t;
  document.querySelectorAll('#card-fmt-row button').forEach(b => {
    b.style.border = '1px solid var(--border)';
    b.style.color  = 'var(--text2)';
  });
  if (btn) { btn.style.border = '2px solid var(--g4)'; btn.style.color = 'var(--g4)'; }
  const cv = document.getElementById('activity-card-canvas');
  if (cv && cv.style.display !== 'none') _generateActivityCard();
}

function _onCardPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _cardPhotoImg = new Image();
    _cardPhotoImg.onload = () => {
      const preview = document.getElementById('card-photo-preview');
      if (preview) {
        preview.innerHTML = '';
        preview.style.border = '2px solid var(--g4)';
        preview.style.padding = '0';
        preview.style.overflow = 'hidden';
        const thumb = document.createElement('img');
        thumb.src = ev.target.result;
        thumb.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px';
        preview.appendChild(thumb);
      }
    };
    _cardPhotoImg.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function _cardRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

function _drawRouteOnCanvas(ctx, coords, x, y, w, h, color) {
  if (!coords || coords.length < 2) return;

  // Apply display smoothing to card route as well
  const smoothed = _smoothCoordsForDisplay(coords);
  const lats = smoothed.map(c => c.lat);
  const lons = smoothed.map(c => c.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);

  // Preserve aspect ratio so the route doesn't get stretched
  const latRange = maxLat - minLat || 0.0001;
  const lonRange = maxLon - minLon || 0.0001;
  const latAspect = latRange, lonAspect = lonRange;
  const dataAspect = lonAspect / latAspect;
  const boxAspect  = w / h;
  let drawW = w, drawH = h;
  if (dataAspect > boxAspect) { drawH = w / dataAspect; }
  else                         { drawW = h * dataAspect; }
  const offX = x + (w - drawW) / 2;
  const offY = y + (h - drawH) / 2;

  const pad = 0.10;
  const toX = lon => offX + (drawW * pad) + ((lon - minLon) / lonRange) * (drawW * (1 - pad * 2));
  const toY = lat => offY + (drawH * pad) + ((maxLat - lat) / latRange) * (drawH * (1 - pad * 2));

  const pts = smoothed.map(c => ({ px: toX(c.lon), py: toY(c.lat) }));
  const n   = pts.length;
  const dotR = Math.max(5, Math.round(Math.min(w, h) * 0.03));

  ctx.save();

  // Glow pass — thick blurred line beneath route for depth
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(6, Math.round(Math.min(w, h) * 0.025));
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.globalAlpha = 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur  = Math.round(Math.min(w, h) * 0.06);
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
  ctx.stroke();

  // Main route line — catmull-rom via bezier for smooth curves
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.lineWidth   = Math.max(4, Math.round(Math.min(w, h) * 0.016));
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].px, pts[1].py);
  } else {
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.px + (p2.px - p0.px) / 6;
      const cp1y = p1.py + (p2.py - p0.py) / 6;
      const cp2x = p2.px - (p3.px - p1.px) / 6;
      const cp2y = p2.py - (p3.py - p1.py) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.px, p2.py);
    }
  }
  ctx.strokeStyle = color;
  ctx.stroke();

  // Start dot — filled circle with white ring
  ctx.shadowBlur  = dotR * 1.5;
  ctx.shadowColor = '#2d9e5a';
  ctx.fillStyle   = '#2d9e5a';
  ctx.beginPath(); ctx.arc(pts[0].px, pts[0].py, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, dotR * 0.4); ctx.stroke();

  // End dot — red with white ring
  ctx.shadowBlur  = dotR * 1.5;
  ctx.shadowColor = '#ef5350';
  ctx.fillStyle   = '#ef5350';
  ctx.beginPath(); ctx.arc(pts[n-1].px, pts[n-1].py, dotR, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, dotR * 0.4); ctx.stroke();

  ctx.restore();
}
// _generateActivityCard moved to card editor below

function _downloadActivityCard() {
  const cv = document.getElementById('activity-card-canvas');
  if (!cv) return;
  const s    = APP.runSession;
  const meta = ACTIVITY_META[s?.activityType || 'run'] || ACTIVITY_META.run;
  const name = 'fitflow-' + (meta.label || 'activity').toLowerCase().replace(/\s+/g,'-') + '-' + Date.now() + '.png';

  cv.toBlob(blob => {
    if (!blob) { showToast('Could not generate image', 'error'); return; }
    _saveOrShareBlob(blob, name);
  }, 'image/png', 0.95);
}

// Universal save/share for mobile and desktop
function _saveOrShareBlob(blob, name) {
  const file = new File([blob], name, { type: 'image/png' });

  // Android/iOS — use Web Share API which allows saving to Gallery
  if (navigator.share && navigator.canShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'FitFlow Pro Activity Card', files: [file] })
          .then(() => showToast('Card saved/shared! 📸', 'success'))
          .catch(err => {
            if (err.name !== 'AbortError') _triggerBlobDownload(blob, name);
          });
        return;
      }
    } catch(e) {}
  }

  // Desktop / fallback — blob URL download
  _triggerBlobDownload(blob, name);
}

function _triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after short delay
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  showToast('Card saved! Check your Downloads 📸', 'success');
}

function _shareActivityCard() {
  const cv = document.getElementById('activity-card-canvas');
  if (!cv) return;
  cv.toBlob(blob => {
    const file = new File([blob], 'fitflow-activity.png', { type:'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
      navigator.share({
        title:  'My FitFlow Pro Activity',
        files:  [file],
      }).catch(() => _downloadActivityCard());
    } else {
      _downloadActivityCard();
    }
  }, 'image/png');
}


// ════════════════════════════════════════════════════════════════
// HISTORY ACTIVITY CARD GENERATOR
// Allows generating a card from any past activity in History page
// Supports photo upload, camera capture, and card sharing
// ════════════════════════════════════════════════════════════════

var _hcmLog      = null;  // Current history log being used for card
var _hcmPhotoImg = null;  // Uploaded photo for history card
var _hcmTheme    = 'dark';


// Store run log for card generation (avoids HTML attribute JSON issues)
function _registerRunLogForCard(id, log) {
  _historyRunLogs[id] = log;
}
function openHistoryCardById(id) {
  const log = _historyRunLogs[id];
  if (!log) { showToast('Activity data not found', 'error'); return; }
  openHistoryCardModal(log);
}

function openHistoryCardModal(log) {
  _hcmLog      = log;
  _hcmPhotoImg = null;
  _hcmTheme    = 'dark';

  // Reset modal state
  const btn = document.querySelector('#history-card-modal button[onclick*="hcm-photo-input"]');
  if (btn) {
    btn.innerHTML = `
      <span style="font-size:18px">🖼</span>
      <div>
        <div style="color:var(--text);font-size:13px;font-weight:700">Add Background Photo</div>
        <div style="color:var(--text3);font-size:11px;margin-top:1px">Gallery</div>
      </div>`;
  }
  const canvas = document.getElementById('hcm-card-canvas');
  if (canvas) { canvas.style.display = 'none'; }
  const dlRow = document.getElementById('hcm-dl-row');
  if (dlRow) { dlRow.style.display = 'none'; }

  // Reset theme buttons
  document.querySelectorAll('#hcm-fmt-row button').forEach((b, i) => {
    b.style.border = i === 0 ? '2px solid var(--g4)' : '1px solid var(--border)';
    b.style.color  = i === 0 ? 'var(--g4)' : 'var(--text2)';
  });

  // Fill activity info
  const info = document.getElementById('hcm-activity-info');
  if (info && log) {
    const meta    = ACTIVITY_META[log.activityType || 'run'] || ACTIVITY_META.run;
    const elapsed = log.duration || 0;
    const pace    = log.distance > 0 ? fmtPace(log.distance, elapsed) : '--:--';
    const kcal    = Math.round((log.distance || 0) * meta.kcalPerKm);
    const dateStr = new Date(log.date || log.timestamp).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:28px">${meta.emoji}</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text)">${log.title || meta.label}</div>
          <div style="font-size:12px;color:var(--text3)">${dateStr}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--g5)">${(log.distance||0).toFixed(2)}</div>
          <div style="font-size:10px;color:var(--text3)">km</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--text)">${fmtTime(elapsed)}</div>
          <div style="font-size:10px;color:var(--text3)">Duration</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--text)">${pace}</div>
          <div style="font-size:10px;color:var(--text3)">Pace/km</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--text)">${kcal}</div>
          <div style="font-size:10px;color:var(--text3)">kcal</div>
        </div>
      </div>
    `;
  }

  // Show modal
  openModal('history-card-modal');
}

function closeHistoryCardModal() {
  closeModal('history-card-modal');
  _hcmLog      = null;
  _hcmPhotoImg = null;
}

function _onHcmPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _hcmPhotoImg = new Image();
    _hcmPhotoImg.onload = () => {
      // Update button to show photo name as confirmation
      const btn = document.querySelector('#history-card-modal button[onclick*="hcm-photo-input"]');
      if (btn) {
        btn.innerHTML = `
          <span style="font-size:18px">✅</span>
          <div>
            <div style="color:var(--g5);font-size:13px;font-weight:700">Photo Selected</div>
            <div style="color:var(--text3);font-size:11px;margin-top:1px">${file.name.length > 28 ? file.name.substring(0,28)+'…' : file.name}</div>
          </div>`;
      }
      // Auto-regenerate if card already shown
      const canvas = document.getElementById('hcm-card-canvas');
      if (canvas && canvas.style.display !== 'none') _generateHcmCard();
    };
    _hcmPhotoImg.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function _setHcmTheme(t, btn) {
  _hcmTheme = t;
  document.querySelectorAll('#hcm-fmt-row button').forEach(b => {
    b.style.border = '1px solid var(--border)';
    b.style.color  = 'var(--text2)';
  });
  if (btn) { btn.style.border = '2px solid var(--g4)'; btn.style.color = 'var(--g4)'; }
  const canvas = document.getElementById('hcm-card-canvas');
  if (canvas && canvas.style.display !== 'none') _generateHcmCard();
}


function _generateHcmCard() {
  const log   = _hcmLog;       // capture before closeHistoryCardModal() nulls it
  const photo = _hcmPhotoImg;  // capture photo before modal close nulls it
  closeHistoryCardModal();
  setTimeout(() => _initCardEditorFromLogWithPhoto(log, photo), 200);
}

function _generateHcmCardDirect() {
  const log  = _hcmLog;
  const user = APP.currentUser;
  if (!log || !user) return;

  const cv  = document.getElementById('hcm-card-canvas');
  const dlr = document.getElementById('hcm-dl-row');
  if (!cv) return;

  const meta    = ACTIVITY_META[log.activityType || 'run'] || ACTIVITY_META.run;
  const routeColor = '#43d17a';  // always FitFlow green
  const elapsed = log.duration || 0;
  const dist    = (log.distance || 0).toFixed(2);
  const kcal    = Math.round((log.distance || 0) * meta.kcalPerKm);
  const pace    = log.distance > 0 ? fmtPace(log.distance, elapsed) : '--:--';
  const coords  = (log.coords || []).filter(c => c.lat && c.lon);
  const drawCoords = coords.length > 300
    ? coords.filter((_, i) => i % Math.ceil(coords.length / 300) === 0)
    : coords;

  // Canvas size matches photo ratio
  let W = 1080, H = 1080;
  if (_hcmPhotoImg) {
    const pW = _hcmPhotoImg.naturalWidth  || _hcmPhotoImg.width;
    const pH = _hcmPhotoImg.naturalHeight || _hcmPhotoImg.height;
    if (pW && pH) {
      const r = pW / pH;
      if (r > 1) { W = 1080; H = Math.max(Math.round(1080/r), 900); }
      else        { H = 1080; W = Math.max(Math.round(1080*r), 720); }
    }
  }
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // 1 — dark background
  ctx.fillStyle = '#0d1a10';
  ctx.fillRect(0, 0, W, H);

  // 2 — photo fills entire canvas
  if (_hcmPhotoImg) {
    ctx.drawImage(_hcmPhotoImg, 0, 0, W, H);
    const grad = ctx.createLinearGradient(0, H*0.45, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // 3 — route map
  if (drawCoords.length >= 2) {
    const mapH = _hcmPhotoImg ? Math.round(H * 0.52) : Math.round(H * 0.48);
    if (!_hcmPhotoImg) {
      const mapGrad = ctx.createLinearGradient(0, 0, 0, mapH);
      mapGrad.addColorStop(0, 'rgba(13,26,16,1)');
      mapGrad.addColorStop(1, 'rgba(13,26,16,0.6)');
      ctx.fillStyle = mapGrad;
      ctx.fillRect(0, 0, W, mapH);
    }
    _drawRouteOnCanvas(ctx, drawCoords, 40, 40, W-80, mapH - 80, routeColor);
  }

  // 4 — Strava-style transparent stats overlay
  const statsY = _hcmPhotoImg ? Math.round(H * 0.52) : Math.round(H * 0.5);

  // Big distance
  ctx.fillStyle  = '#ffffff';
  ctx.font       = 'bold 96px -apple-system, Arial, sans-serif';
  ctx.textAlign  = 'left';
  ctx.fillText(dist, 60, statsY + 100);

  ctx.fillStyle  = 'rgba(255,255,255,0.7)';
  ctx.font       = 'bold 32px -apple-system, Arial, sans-serif';
  ctx.fillText('KM', 60 + ctx.measureText(dist).width + 12, statsY + 78);

  // Activity type
  ctx.fillStyle  = routeColor;
  ctx.font       = 'bold 24px -apple-system, Arial, sans-serif';
  ctx.fillText(meta.emoji + ' ' + (log.title || meta.label).toUpperCase(), 60, statsY + 136);

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(60, statsY + 152);
  ctx.lineTo(W - 60, statsY + 152);
  ctx.stroke();

  // Stats row
  const stats = [
    { val: fmtTime(elapsed), lbl: 'TIME'    },
    { val: pace,             lbl: 'PACE/KM' },
    { val: kcal + '',        lbl: 'KCAL'    },
  ];
  const cw = (W - 120) / 3;
  stats.forEach((st, i) => {
    const cx = 60 + i * cw;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, statsY + 162);
      ctx.lineTo(cx, statsY + 240);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 30px -apple-system, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(st.val, cx + (i > 0 ? 16 : 0), statsY + 198);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font      = '16px -apple-system, Arial, sans-serif';
    ctx.fillText(st.lbl, cx + (i > 0 ? 16 : 0), statsY + 220);
  });

  // Date
  const dateStr = new Date(log.date || log.timestamp).toLocaleDateString('en-IN', {
    weekday:'short', day:'numeric', month:'short', year:'numeric'
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font      = '18px -apple-system, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(dateStr, 60, statsY + 258);

  // Branding
  ctx.fillStyle = routeColor;
  ctx.font      = 'bold 22px -apple-system, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('⚡ FitFlow Pro', W - 60, H - 36);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font      = '18px -apple-system, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(user.name, 60, H - 36);

  cv.style.display = 'block';
  if (dlr) { dlr.style.display = 'flex'; }
  showToast('Activity card ready! 🎴', 'success');
}
function _downloadHcmCard() {
  const cv  = document.getElementById('hcm-card-canvas');
  if (!cv) return;
  const log  = _hcmLog;
  const meta = ACTIVITY_META[log?.activityType || 'run'] || ACTIVITY_META.run;
  const name = 'fitflow-' + (meta.label||'activity').toLowerCase().replace(/\s+/g,'-') + '-' + Date.now() + '.png';
  cv.toBlob(blob => {
    if (!blob) return;
    _saveOrShareBlob(blob, name);
  }, 'image/png', 0.95);
}

function _shareHcmCard() {
  const cv = document.getElementById('hcm-card-canvas');
  if (!cv) return;
  cv.toBlob(blob => {
    const file = new File([blob], 'fitflow-activity.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ title: 'My FitFlow Pro Activity', files: [file] })
        .catch(() => _downloadHcmCard());
    } else {
      _downloadHcmCard();
    }
  }, 'image/png');
}

function shareRun() {
  const s       = APP.runSession;
  if (!s) return;
  const elapsed = s.finalElapsed || 0;
  const meta    = ACTIVITY_META[s.activityType || 'run'] || ACTIVITY_META.run;
  const pace    = fmtPace(s.distance, elapsed);
  const cal     = Math.round(s.distance * meta.kcalPerKm);

  const lines = [
    `${meta.emoji} ${meta.label} Complete! — FitFlow Pro`,
    `📏 Distance: ${s.distance.toFixed(2)} km`,
    `⏱ Time: ${fmtTime(elapsed)}`,
    `⚡ Pace: ${pace} /km`,
    `🔥 Calories: ${cal} kcal`,
    `💪 Tracked with FitFlow Pro`,
  ];
  const text = lines.join('\n');

  if (navigator.share) {
    navigator.share({ title: `FitFlow Pro — ${meta.label} Complete!`, text }).catch(() => {});
  } else {
    // Clipboard fallback
    navigator.clipboard?.writeText(text).then(() => {
      showToast('Activity stats copied to clipboard! 📋', 'success');
    }).catch(() => {
      showToast(text.split('\n').join(' | '), 'info');
    });
  }
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


// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Interactive Card Editor
// Drag-and-drop + pinch-resize card elements like Instagram Stories
// Two draggable elements: Route map + Stats overlay
// ════════════════════════════════════════════════════════════════

var _cardEditor = {
  active:      false,
  session:     null,    // APP.runSession or history log
  photoImg:    null,    // uploaded photo
  routeCoords: [],      // GPS coords
  meta:        null,    // ACTIVITY_META
  // Element states — x/y are 0-1 fractions, scale multiplier, rot degrees
  route: { x: 0.05, y: 0.05, w: 0.4, h: 0.4, scale: 1, rot: 0 },
  stats: { x: 0.04, y: 0.62, w: 0.88, h: 0.26, scale: 1, rot: 0 },
  logo:  { x: 0.52, y: 0.88, w: 0.60, h: 0.07, scale: 1, rot: 0 },
  selected: 'stats',
  // Canvas dimensions
  bgW: 0, bgH: 0,
  displayW: 0, displayH: 0,
  ratio: 1,
};

var _ceIsDragging    = false;
var _ceDragEl        = null;
var _ceDragStartX    = 0;
var _ceDragStartY    = 0;
var _ceDragElStartX  = 0;
var _ceDragElStartY  = 0;
var _ceIsResizing    = false;
var _ceResizeEl      = null;
var _ceResizeStartW  = 0;
var _ceResizeStartH  = 0;
var _ceResizeStartX  = 0;
var _ceResizeStartY  = 0;
var _cePinchStartDist = 0;
var _cePinchStartScale = 1;

function _initCardEditor() {
  const s    = APP.runSession;
  const user = APP.currentUser;
  if (!s || !user) { showToast('No activity data', 'error'); return; }

  const meta = ACTIVITY_META[s.activityType || _activityType] || ACTIVITY_META.run;
  const coords = (APP.gpsCoords || []).filter(c => c.lat && c.lon);
  const drawCoords = coords.length > 300
    ? coords.filter((_, i) => i % Math.ceil(coords.length / 300) === 0)
    : coords;

  _cardEditor.session     = s;
  _cardEditor.photoImg    = _cardPhotoImg;
  _cardEditor.routeCoords = drawCoords;
  _cardEditor.meta        = meta;

  _openCardEditorModal(s, meta, drawCoords, _cardPhotoImg);
}

function _initCardEditorFromLog(log) {
  _initCardEditorFromLogWithPhoto(log, _hcmPhotoImg);
}

function _initCardEditorFromLogWithPhoto(log, photo) {
  const user = APP.currentUser;
  if (!log || !user) return;
  const meta = ACTIVITY_META[log.activityType || 'run'] || ACTIVITY_META.run;
  const coords = (log.coords || []).filter(c => c.lat && c.lon);
  const drawCoords = coords.length > 300
    ? coords.filter((_, i) => i % Math.ceil(coords.length / 300) === 0)
    : coords;

  _cardEditor.session     = log;
  _cardEditor.photoImg    = photo || null;
  _cardEditor.routeCoords = drawCoords;
  _cardEditor.meta        = meta;

  _openCardEditorModal(log, meta, drawCoords, photo || null);
}

function _openCardEditorModal(session, meta, drawCoords, photoImg) {
  const modal = document.getElementById('card-editor-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  _cardEditor.active   = true;
  _cardEditor.selected = 'stats';
  _cardEditor.session  = session;
  _cardEditor.meta     = meta;
  _cardEditor.routeCoords = drawCoords || [];
  _cardEditor.photoImg = photoImg || null;
  // Always reset element positions/scale/rotation on every open
  _cardEditor.route = { x: 0.04, y: 0.04, w: 0.42, h: 0.42, scale: 1, rot: 0 };
  _cardEditor.stats = { x: 0.04, y: 0.62, w: 0.88, h: 0.26, scale: 1, rot: 0 };
  _cardEditor.logo  = { x: 0.35, y: 0.04, w: 0.60, h: 0.06, scale: 1, rot: 0 };

  // Compute display size from window — no layout dependency
  const dpr   = window.devicePixelRatio || 1;
  const maxW   = window.innerWidth  - 28;
  const maxH   = window.innerHeight - 220;
  const aspRat = photoImg
    ? ((photoImg.naturalWidth || photoImg.width || 1) / (photoImg.naturalHeight || photoImg.height || 1))
    : 1;
  let dW = maxW, dH = Math.round(maxW / aspRat);
  if (dH > maxH) { dH = maxH; dW = Math.round(maxH * aspRat); }
  dW = Math.max(200, dW);
  dH = Math.max(200, dH);

  // Store logical (CSS) dimensions
  _cardEditor.bgW      = Math.round(dW * dpr);  // actual canvas pixels
  _cardEditor.bgH      = Math.round(dH * dpr);
  _cardEditor.dispW    = dW;   // CSS size
  _cardEditor.dispH    = dH;
  _cardEditor.dpr      = dpr;

  // Single canvas — bg + elements drawn together
  const cv = document.getElementById('card-editor-main-canvas');
  if (!cv) { console.error('card-editor-main-canvas not found'); return; }
  cv.width  = _cardEditor.bgW;
  cv.height = _cardEditor.bgH;
  cv.style.width  = dW + 'px';
  cv.style.height = dH + 'px';

  _cardEditorRedraw();
  _attachCardEditorHandlers(cv);
  _selectCardEl('stats');
}

function _cardEditorRedraw() {
  const cv = document.getElementById('card-editor-main-canvas');
  if (!cv) return;
  const W = _cardEditor.bgW, H = _cardEditor.bgH;
  if (!W || !H) return;
  cv.width  = W;  // also clears canvas
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background
  ctx.fillStyle = '#0d1a10';
  ctx.fillRect(0, 0, W, H);
  if (_cardEditor.photoImg) {
    ctx.drawImage(_cardEditor.photoImg, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);
  }

  // Username bottom-left + Logo bottom-right — same size, same style
  {
    const u    = APP.currentUser;
    const fPx  = Math.round(W * 0.032);
    ctx.font        = fPx + 'px -apple-system,Arial,sans-serif';
    ctx.fillStyle   = 'rgba(255,255,255,0.65)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    const baseY = H - Math.round(H * 0.028);
    if (u) {
      ctx.textAlign = 'left';
      ctx.fillText(u.name, Math.round(W * 0.035), baseY);
    }
    // Logo same size, same colour, right-aligned
    ctx.textAlign = 'right';
    ctx.fillText('\u26a1 FitFlow Pro', W - Math.round(W * 0.035), baseY);
    ctx.shadowBlur = 0;
  }

  // Draw each element (logo is now fixed text, not a draggable element)
  for (const key of ['route', 'stats']) {
    const st  = _cardEditor[key];
    const elW = Math.max(1, Math.round(W * st.w * st.scale));
    const elH = Math.max(1, Math.round(H * st.h * st.scale));

    // Draw to temp canvas then composite with rotation
    const tmp   = document.createElement('canvas');
    tmp.width   = elW; tmp.height = elH;
    const tc    = tmp.getContext('2d');
    if (key === 'route') _drawRouteEl(tc, elW, elH);
    else if (key === 'stats') _drawStatsEl(tc, elW, elH, _cardEditor.session, _cardEditor.meta);
    else if (key === 'logo')  _drawLogoEl(tc, elW, elH);

    const cx  = (st.x + st.w * st.scale / 2) * W;
    const cy  = (st.y + st.h * st.scale / 2) * H;
    const rot = (st.rot || 0) * Math.PI / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.drawImage(tmp, -elW / 2, -elH / 2);
    ctx.restore();
  }
}

// Element draw helpers — called by both editor and export
function _drawRouteEl(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (_cardEditor.routeCoords && _cardEditor.routeCoords.length >= 2) {
    _drawRouteOnCanvas(ctx, _cardEditor.routeCoords, 0, 0, W, H, '#2d9e5a');
  }
}

function _drawLogoEl(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const fS = Math.round(H * 0.75);
  ctx.font        = 'bold ' + fS + 'px -apple-system,Arial,sans-serif';
  ctx.fillStyle   = '#43d17a';  // always FitFlow green
  ctx.textAlign   = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
  ctx.fillText('⚡ FitFlow Pro', 4, fS);
  ctx.shadowBlur = 0;
}

// Stats draw helper — premium iOS-level design
function _drawStatsEl(ctx, elW, elH, session, meta) {
  if (!session) session = _cardEditor.session;
  if (!meta)    meta    = _cardEditor.meta;
  ctx.clearRect(0, 0, elW, elH);

  const elapsed = session.finalElapsed || session.duration || (_calcElapsed ? _calcElapsed(session) : 0) || 0;
  const dist    = (session.distance || 0).toFixed(2);
  const kcal    = Math.round((session.distance || 0) * meta.kcalPerKm);
  const pace    = session.distance > 0 ? fmtPace(session.distance, elapsed) : '--:--';
  const speedKph = elapsed > 0 ? ((session.distance || 0) / elapsed * 3600).toFixed(1) : '0.0';
  const pad      = Math.round(elW * 0.05);
  const r        = Math.round(elW * 0.04);  // corner radius

  // Glassmorphism background panel
  ctx.save();
  _cardRoundRect(ctx, 0, 0, elW, elH, r);
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fill();
  // Subtle border
  _cardRoundRect(ctx, 0, 0, elW, elH, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();

  // Helper: text with drop shadow
  function tx(text, x, y, font, color, align, blur) {
    ctx.save();
    ctx.font        = font;
    ctx.fillStyle   = color;
    ctx.textAlign   = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur  = blur || 6;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  const accentColor = meta.color || '#43d17a';
  const titleH  = Math.round(elH * 0.30);
  const bodyY   = titleH + Math.round(elH * 0.04);
  const bodyH   = Math.round(elH * 0.40);
  const footerY = bodyY + bodyH + Math.round(elH * 0.04);

  // ── HEADER: activity icon + name + date ─────────────────────────
  const titleF = Math.round(elH * 0.13);
  const dateF  = Math.round(elH * 0.075);
  tx(meta.emoji + '  ' + (session.title || meta.label).toUpperCase(),
     pad, Math.round(titleH * 0.58),
     'bold ' + titleF + 'px -apple-system,SF Pro Display,Arial,sans-serif',
     '#ffffff', 'left', 10);

  try {
    const ds = new Date(session.date || session.timestamp).toLocaleDateString('en-IN',
      { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    tx(ds, pad, Math.round(titleH * 0.92),
       dateF + 'px -apple-system,SF Pro Text,Arial,sans-serif',
       'rgba(255,255,255,0.65)', 'left', 4);
  } catch(e) {}

  // Thin separator line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(pad, titleH); ctx.lineTo(elW - pad, titleH);
  ctx.stroke();
  ctx.restore();

  // ── BODY: big distance left | time + pace right ──────────────────
  const halfW = Math.round(elW * 0.50);
  const bigF  = Math.round(bodyH * 0.60);
  const unitF = Math.round(bodyH * 0.22);
  const lblF  = Math.round(bodyH * 0.17);
  const valF  = Math.round(bodyH * 0.28);

  // Distance label
  tx('DISTANCE', pad, bodyY + Math.round(bodyH * 0.18),
     lblF + 'px -apple-system,SF Pro Text,Arial,sans-serif',
     'rgba(255,255,255,0.55)', 'left', 3);

  // Big distance number
  ctx.save();
  ctx.font = 'bold ' + bigF + 'px -apple-system,SF Pro Display,Arial,sans-serif';
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14;
  ctx.fillText(dist, pad, bodyY + Math.round(bodyH * 0.76));
  const dw = ctx.measureText(dist).width;
  ctx.restore();

  // "km" unit in accent colour
  tx('km', pad + dw + Math.round(elW * 0.015), bodyY + Math.round(bodyH * 0.65),
     'bold ' + unitF + 'px -apple-system,SF Pro Display,Arial,sans-serif',
     accentColor, 'left', 8);

  // Vertical divider
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(halfW, bodyY + Math.round(bodyH * 0.06));
  ctx.lineTo(halfW, bodyY + Math.round(bodyH * 0.95));
  ctx.stroke();
  ctx.restore();

  // Right column: TIME + PACE
  const rx = halfW + Math.round(elW * 0.06);
  const halfH = Math.round(bodyH * 0.48);
  [
    { val: fmtTime(elapsed), lbl: 'TIME',    oy: 0 },
    { val: pace,             lbl: 'PACE/KM', oy: halfH },
  ].forEach(({ val, lbl, oy }) => {
    tx(lbl, rx, bodyY + oy + Math.round(halfH * 0.24),
       lblF + 'px -apple-system,SF Pro Text,Arial,sans-serif',
       'rgba(255,255,255,0.55)', 'left', 3);
    tx(val, rx, bodyY + oy + Math.round(halfH * 0.82),
       'bold ' + valF + 'px -apple-system,SF Pro Display,Arial,sans-serif',
       '#ffffff', 'left', 10);
    if (oy > 0) return;
    // Horizontal divider between time and pace
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rx, bodyY + halfH - 2);
    ctx.lineTo(elW - pad, bodyY + halfH - 2);
    ctx.stroke();
    ctx.restore();
  });

  // ── FOOTER: calories + speed ─────────────────────────────────────
  // Full-width separator
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY); ctx.lineTo(elW - pad, footerY);
  ctx.stroke();
  ctx.restore();

  const fF  = Math.round(elH * 0.075);
  const fVF = Math.round(elH * 0.09);
  const footerCols = [
    { val: kcal + ' kcal', lbl: 'CALORIES', x: pad },
    { val: speedKph + ' km/h', lbl: 'AVG SPEED', x: Math.round(elW * 0.52) },
  ];
  footerCols.forEach(({ val, lbl, x }) => {
    tx(lbl, x, footerY + Math.round(elH * 0.065),
       fF + 'px -apple-system,SF Pro Text,Arial,sans-serif',
       'rgba(255,255,255,0.50)', 'left', 3);
    tx(val, x, footerY + Math.round(elH * 0.135),
       'bold ' + fVF + 'px -apple-system,SF Pro Display,Arial,sans-serif',
       '#ffffff', 'left', 6);
  });
}

// Stubs kept for compatibility (all now call _cardEditorRedraw)
function _renderRouteElement()              { _cardEditorRedraw(); }
function _renderStatsElement(s, m)          { _cardEditorRedraw(); }
function _renderLogoElement()               { _cardEditorRedraw(); }
function _positionElements()                { _cardEditorRedraw(); }

function _selectCardEl(key) {
  _cardEditor.selected = key;
  ['route', 'stats', 'logo'].forEach(k => {
    const btn = document.getElementById('card-sel-' + k + '-btn');
    if (!btn) return;
    const isLogo = k === 'logo';
    const ac = isLogo ? '#f0c040' : '#43d17a';
    if (k === key) {
      btn.style.border     = '2px solid ' + ac;
      btn.style.background = isLogo ? 'rgba(240,192,64,0.2)' : 'rgba(67,160,90,0.2)';
      btn.style.color      = ac;
    } else {
      btn.style.border     = '1px solid #555';
      btn.style.background = 'none';
      btn.style.color      = '#aaa';
    }
  });
  _cardEditorRedraw();
}

function _resetCardElPositions() {
  _cardEditor.route = { x: 0.04, y: 0.04, w: 0.42, h: 0.42, scale: 1, rot: 0 };
  _cardEditor.stats = { x: 0.04, y: 0.62, w: 0.88, h: 0.26, scale: 1, rot: 0 };
  _cardEditor.logo  = { x: 0.35, y: 0.04, w: 0.60, h: 0.06, scale: 1, rot: 0 };
  _cardEditorRedraw();
}

let _ceAbortCtrl = null;  // AbortController for current editor session listeners

function _attachCardEditorHandlers(cv) {
  // Cancel any previous session's listeners before adding new ones
  if (_ceAbortCtrl) _ceAbortCtrl.abort();
  _ceAbortCtrl = new AbortController();
  const sig = { signal: _ceAbortCtrl.signal };

  let drag = null, pinch = null;

  function xyFromTouch(touch) {
    const r   = cv.getBoundingClientRect();
    // Map CSS pixels → canvas pixels (accounts for DPR scaling)
    const scX = _cardEditor.bgW / r.width;
    const scY = _cardEditor.bgH / r.height;
    return [
      (touch.clientX - r.left) * scX,
      (touch.clientY - r.top)  * scY,
    ];
  }

  function hitTest(mx, my) {
    const W = _cardEditor.bgW, H = _cardEditor.bgH;
    for (const key of ['logo', 'stats', 'route']) {
      const st = _cardEditor[key];
      const cx = (st.x + st.w * st.scale / 2) * W;
      const cy = (st.y + st.h * st.scale / 2) * H;
      const dx = mx - cx, dy = my - cy;
      const r  = -(st.rot || 0) * Math.PI / 180;
      const lx = dx * Math.cos(r) - dy * Math.sin(r) + st.w * st.scale * W / 2;
      const ly = dx * Math.sin(r) + dy * Math.cos(r) + st.h * st.scale * H / 2;
      if (lx >= 0 && lx <= st.w * st.scale * W && ly >= 0 && ly <= st.h * st.scale * H) return key;
    }
    return null;
  }

  function pinchDist(touches) {
    const r  = cv.getBoundingClientRect();
    const sx = _cardEditor.bgW / r.width, sy = _cardEditor.bgH / r.height;
    const dx = (touches[0].clientX - touches[1].clientX) * sx;
    const dy = (touches[0].clientY - touches[1].clientY) * sy;
    return Math.sqrt(dx*dx + dy*dy) || 1;
  }

  function pinchAngle(touches) {
    const r  = cv.getBoundingClientRect();
    const sx = _cardEditor.bgW / r.width, sy = _cardEditor.bgH / r.height;
    return Math.atan2(
      (touches[0].clientY - touches[1].clientY) * sy,
      (touches[0].clientX - touches[1].clientX) * sx
    ) * 180 / Math.PI;
  }

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const [mx, my] = xyFromTouch(e.touches[0]);
      const key = hitTest(mx, my);
      drag  = key ? { key, smx: mx, smy: my, sx: _cardEditor[key].x, sy: _cardEditor[key].y } : null;
      pinch = null;
      if (key) _selectCardEl(key);
    } else if (e.touches.length === 2) {
      const key = _cardEditor.selected;
      drag  = null;
      pinch = key ? {
        key,
        sd: pinchDist(e.touches), ss: _cardEditor[key].scale,
        sa: pinchAngle(e.touches), sr: _cardEditor[key].rot || 0,
      } : null;
    }
  }, { passive: false, ...sig });

  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && drag) {
      const [mx, my] = xyFromTouch(e.touches[0]);
      _cardEditor[drag.key].x = drag.sx + (mx - drag.smx) / _cardEditor.bgW;
      _cardEditor[drag.key].y = drag.sy + (my - drag.smy) / _cardEditor.bgH;
      _cardEditorRedraw();
    } else if (e.touches.length === 2 && pinch) {
      _cardEditor[pinch.key].scale = Math.max(0.1, Math.min(4, pinch.ss * (pinchDist(e.touches) / pinch.sd)));
      _cardEditor[pinch.key].rot   = pinch.sr + (pinchAngle(e.touches) - pinch.sa);
      _cardEditorRedraw();
    }
  }, { passive: false, ...sig });

  cv.addEventListener('touchend', e => {
    if (e.touches.length < 2) pinch = null;
    if (e.touches.length === 0) drag = null;
  }, { passive: true, ...sig });

  // Mouse (desktop)
  cv.addEventListener('mousedown', e => {
    const r = cv.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width  * _cardEditor.bgW;
    const my = (e.clientY - r.top)  / r.height * _cardEditor.bgH;
    const key = hitTest(mx, my);
    drag = key ? { key, smx: mx, smy: my, sx: _cardEditor[key].x, sy: _cardEditor[key].y } : null;
    if (key) _selectCardEl(key);
    e.preventDefault();
  }, { ...sig });

  window.addEventListener('mousemove', e => {
    if (!drag) return;
    const r  = cv.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width  * _cardEditor.bgW;
    const my = (e.clientY - r.top)  / r.height * _cardEditor.bgH;
    _cardEditor[drag.key].x = drag.sx + (mx - drag.smx) / _cardEditor.bgW;
    _cardEditor[drag.key].y = drag.sy + (my - drag.smy) / _cardEditor.bgH;
    _cardEditorRedraw();
  }, { ...sig });

  window.addEventListener('mouseup', () => { drag = null; }, { ...sig });
}

function _closeCardEditor() {
  const modal = document.getElementById('card-editor-modal');
  if (modal) modal.style.display = 'none';
  _cardEditor.active = false;
}

function _exportCardFromEditor(mode) {
  // mode: 'save' = direct download/gallery, 'share' = share sheet (default)
  // Export at minimum 1080px on the long edge, always at 2× display resolution for retina quality
  const dispW  = _cardEditor.dispW  || _cardEditor.bgW;
  const dispH  = _cardEditor.dispH  || _cardEditor.bgH;
  const aspRat = dispW / dispH;
  const minEdge = 1080;
  let EW, EH;
  if (aspRat >= 1) { EW = Math.max(minEdge, dispW * 2); EH = Math.round(EW / aspRat); }
  else             { EH = Math.max(minEdge, dispH * 2); EW = Math.round(EH * aspRat); }

  const cv  = document.getElementById('activity-card-canvas');
  if (!cv) { showToast('Canvas not found', 'error'); return; }
  cv.width  = EW; cv.height = EH;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background
  ctx.fillStyle = '#0d1a10'; ctx.fillRect(0, 0, EW, EH);
  if (_cardEditor.photoImg) {
    ctx.drawImage(_cardEditor.photoImg, 0, 0, EW, EH);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(0, 0, EW, EH);
  }

  // Draw elements (route + stats only — logo is fixed text below)
  ['route', 'stats'].forEach(key => {
    const st  = _cardEditor[key];
    const elW = Math.max(1, Math.round(EW * st.w * st.scale));
    const elH = Math.max(1, Math.round(EH * st.h * st.scale));
    const tmp = document.createElement('canvas');
    tmp.width = elW; tmp.height = elH;
    const tc  = tmp.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = 'high';
    if (key === 'route') _drawRouteEl(tc, elW, elH);
    else _drawStatsEl(tc, elW, elH, _cardEditor.session, _cardEditor.meta);
    const cx  = (st.x + st.w * st.scale / 2) * EW;
    const cy  = (st.y + st.h * st.scale / 2) * EH;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((st.rot || 0) * Math.PI / 180);
    ctx.drawImage(tmp, -elW / 2, -elH / 2);
    ctx.restore();
  });

  // Username bottom-left + Logo bottom-right — fixed, same size, same colour
  {
    const u   = APP.currentUser;
    const fPx = Math.round(EW * 0.032);
    ctx.font        = fPx + 'px -apple-system,Arial,sans-serif';
    ctx.fillStyle   = 'rgba(255,255,255,0.65)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10;
    const baseY = EH - Math.round(EH * 0.028);
    if (u) { ctx.textAlign = 'left';  ctx.fillText(u.name, Math.round(EW * 0.035), baseY); }
    ctx.textAlign = 'right';
    ctx.fillText('⚡ FitFlow Pro', EW - Math.round(EW * 0.035), baseY);
    ctx.shadowBlur = 0;
  }

  _closeCardEditor();
  const fname = 'fitflow-activity-' + Date.now() + '.png';
  cv.toBlob(blob => {
    if (!blob) { showToast('Export failed', 'error'); return; }
    if (mode === 'save') {
      // Direct save — bypass share sheet entirely
      _triggerBlobDownload(blob, fname);
    } else {
      // Share sheet — falls back to download if share not supported
      _saveOrShareBlob(blob, fname);
    }
  }, 'image/png', 1.0);
}

// ── Also update _generateActivityCard to open editor ──────────────
function _generateActivityCard() {
  _initCardEditor();
}
