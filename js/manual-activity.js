// ════════════════════════════════════════════════════════════════
// MANUAL ACTIVITY LOGGING
//
// Picker → form (auto-calc duration + kcal) → log → shareable result card.
// Card is also the history-detail view when a user taps an activity_<id>
// entry from global History — so logging confirmation and history view
// share one page (page-activity-card).
//
// Storage:
//   ff_logs rows with module: 'activity_<id>' and extra fields:
//     activityType, durationMin, kcal, startTime, endTime, place
// ════════════════════════════════════════════════════════════════

// ── In-memory state for the page currently being edited ─────────
var _manualForm = {
  activityId:   null,
  date:         null,      // YYYY-MM-DD
  startTime:    null,      // 'HH:MM'
  endTime:      null,      // 'HH:MM'
  place:        '',
  weight:       null,
};

// ── ENTRY POINT — Picker ─────────────────────────────────────────
function initManualLogPage() {
  // Clear any stale sub-view back hook left over from a previous visit
  if (typeof APP !== 'undefined') APP.subViewBack = null;
  _manualForm = {
    activityId: null,
    date: todayStr(),
    startTime: _defaultStartTime(),
    endTime: _defaultEndTime(),
    place: '',
    weight: _getUserWeight(),
  };
  _renderManualPicker();
}

function _defaultStartTime() {
  var d = new Date(Date.now() - 60 * 60 * 1000);   // 1 h ago
  var m = Math.round(d.getMinutes() / 5) * 5;
  if (m === 60) { d.setHours(d.getHours() + 1); m = 0; }
  return String(d.getHours()).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function _defaultEndTime() {
  var d = new Date();
  var m = Math.round(d.getMinutes() / 5) * 5;
  if (m === 60) { d.setHours(d.getHours() + 1); m = 0; }
  return String(d.getHours()).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function _getUserWeight() {
  var u = APP.currentUser;
  if (!u) return null;
  // PRIMARY: ff_body_profile_<uid> — set by the Body Stats modal and synced
  // to Sheets via saveContent. This is where existing users' weight lives.
  try {
    var bp = Store.get('ff_body_profile_' + u.id);
    if (bp && bp.weight && +bp.weight > 0) return +bp.weight;
  } catch (e) {}
  // FALLBACK: legacy paths from older onboarding versions
  var w = (u.profile && u.profile.weight) || u.weight || null;
  return w && +w > 0 ? +w : null;
}

// Persist weight to the body_profile store (same place Body Stats writes)
// and sync to Sheets so it survives reinstall / appears on other devices.
function _persistUserWeight(kg) {
  var u = APP.currentUser;
  if (!u || !(+kg > 0)) return;
  try {
    var bp = Store.get('ff_body_profile_' + u.id, {}) || {};
    bp.weight    = +kg;
    bp.updatedAt = new Date().toISOString();
    Store.set('ff_body_profile_' + u.id, bp);
    if (typeof sheetsPost === 'function') {
      try { sheetsPost('saveContent', { key: 'body_profile_' + u.id, value: bp }); } catch (e) {}
    }
  } catch (e) {}
}

function _renderManualPicker() {
  var container = document.getElementById('manual-log-content');
  if (!container) return;
  // Picker is the "root" sub-view — no back-hook should be active here.
  // Clears any stale hook so back from picker goes to dashboard normally.
  if (typeof APP !== 'undefined') APP.subViewBack = null;
  var activities = (window.APP_DATA && window.APP_DATA.activities) || [];

  container.innerHTML =
    '<div style="padding:0 16px 24px">' +
      '<div style="margin-bottom:18px">' +
        '<div style="font-family:var(--font-display);font-size:24px;color:var(--g5);line-height:1.15;margin-bottom:4px">Log any activity</div>' +
        '<div style="font-size:13px;color:var(--text2);line-height:1.5">' +
          'Pick a sport, fill in the times — duration and calories calculate automatically.' +
        '</div>' +
      '</div>' +

      '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">' +
        'Choose activity' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px">' +
        activities.map(function (a) {
          return '<div onclick="selectManualActivity(\'' + a.id + '\')"' +
            ' style="aspect-ratio:1;border-radius:14px;' +
              'background:linear-gradient(135deg,' + a.gradient[0] + ',' + a.gradient[1] + ');' +
              'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;' +
              'cursor:pointer;color:#fff;padding:8px;text-align:center;' +
              'user-select:none;-webkit-user-select:none;touch-action:manipulation;' +
              'transition:transform .12s ease"' +
            ' ontouchstart="this.style.transform=\'scale(0.94)\'"' +
            ' ontouchend="this.style.transform=\'\'" ontouchcancel="this.style.transform=\'\'"' +
            ' onmousedown="this.style.transform=\'scale(0.94)\'"' +
            ' onmouseup="this.style.transform=\'\'" onmouseleave="this.style.transform=\'\'">' +
            '<div style="font-size:28px;line-height:1">' + a.emoji + '</div>' +
            '<div style="font-size:11px;font-weight:700;line-height:1.15">' + a.name + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<div style="margin-top:18px;padding:12px 14px;background:rgba(67,160,90,0.06);border:1px dashed rgba(67,160,90,0.30);border-radius:12px;' +
        'font-size:12px;color:var(--text2);line-height:1.5">' +
        '💡 Don\'t see your activity? Pick <strong style="color:var(--g5)">General Workout</strong> — you can add a description in the place field.' +
      '</div>' +
    '</div>';
}

// ── ACTIVITY SELECTED — show the form ────────────────────────────
function selectManualActivity(activityId) {
  _manualForm.activityId = activityId;
  // Push a sub-state into history so the browser/system back gesture has a
  // step to consume between "form" and "picker". Without this, popstate
  // fires with the dashboard's state and goBack jumps straight there.
  try {
    window.history.pushState({ page: 'page-manual-log', subview: 'form' }, '', '#page-manual-log');
  } catch (e) {}
  // Register the back hook so goBack() returns to the picker, not the
  // parent page. Cleared in _renderManualPicker, initManualLogPage,
  // logManualActivity, and on page exit.
  if (typeof APP !== 'undefined') {
    APP.subViewBack = function () {
      APP.subViewBack = null;
      _manualForm.activityId = null;
      _renderManualPicker();
      return true;   // back consumed — don't navigate away
    };
  }
  _renderManualForm();
}

function _renderManualForm() {
  var container = document.getElementById('manual-log-content');
  if (!container) return;
  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(_manualForm.activityId);
  if (!act) return;

  var hasWeight = _manualForm.weight && _manualForm.weight > 0;

  var weightBlock = !hasWeight
    ? '<div style="margin-bottom:14px;padding:12px 14px;background:rgba(240,192,64,0.10);' +
        'border:1px dashed rgba(240,192,64,0.45);border-radius:12px">' +
        '<div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">' +
          '⚠ Add your weight to calculate calories' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<input id="manual-weight-input" type="number" min="20" max="250" placeholder="e.g. 70"' +
            ' oninput="_manualForm.weight=+this.value||null;_recalcManualMetrics()"' +
            ' style="flex:1;background:var(--surface2);border:1px solid var(--border);' +
              'color:var(--text);padding:8px 12px;border-radius:10px;font-size:14px;outline:none" />' +
          '<span style="font-size:13px;color:var(--text3)">kg</span>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:6px;line-height:1.4">' +
          'Saved to your profile so you only enter this once.' +
        '</div>' +
      '</div>'
    : '';

  container.innerHTML =
    '<div style="padding:0 16px 24px">' +

      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;' +
        'padding:14px 16px;border-radius:16px;' +
        'background:linear-gradient(135deg,' + act.gradient[0] + ',' + act.gradient[1] + ');color:#fff">' +
        '<div style="font-size:38px;line-height:1">' + act.emoji + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:11px;opacity:0.75;text-transform:uppercase;letter-spacing:.06em">Logging</div>' +
          '<div style="font-size:18px;font-weight:700;line-height:1.15">' + act.name + '</div>' +
        '</div>' +
        '<button onclick="_renderManualPicker()"' +
          ' style="background:rgba(255,255,255,0.18);border:none;color:#fff;' +
            'font-size:11px;padding:6px 12px;border-radius:12px;cursor:pointer;' +
            'user-select:none;-webkit-user-select:none;touch-action:manipulation;font-weight:600">' +
          'Change' +
        '</button>' +
      '</div>' +

      weightBlock +

      '<div style="margin-bottom:12px">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Date</div>' +
        '<input id="manual-date" type="date" value="' + _manualForm.date + '" max="' + todayStr() + '"' +
          ' oninput="_manualForm.date=this.value;_recalcManualMetrics()"' +
          ' style="width:100%;background:var(--surface2);border:1px solid var(--border);' +
            'color:var(--text);padding:11px 14px;border-radius:12px;font-size:14px;outline:none;' +
            'font-family:inherit" />' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<div>' +
          '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Start</div>' +
          '<input id="manual-start" type="time" value="' + _manualForm.startTime + '"' +
            ' oninput="_manualForm.startTime=this.value;_recalcManualMetrics()"' +
            ' style="width:100%;background:var(--surface2);border:1px solid var(--border);' +
              'color:var(--text);padding:11px 14px;border-radius:12px;font-size:14px;outline:none;' +
              'font-family:inherit" />' +
        '</div>' +
        '<div>' +
          '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">End</div>' +
          '<input id="manual-end" type="time" value="' + _manualForm.endTime + '"' +
            ' oninput="_manualForm.endTime=this.value;_recalcManualMetrics()"' +
            ' style="width:100%;background:var(--surface2);border:1px solid var(--border);' +
              'color:var(--text);padding:11px 14px;border-radius:12px;font-size:14px;outline:none;' +
              'font-family:inherit" />' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<div style="padding:12px 14px;background:rgba(67,160,90,0.10);border:1px solid rgba(67,160,90,0.25);border-radius:12px">' +
          '<div style="font-size:10px;color:var(--g5);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Duration</div>' +
          '<div id="manual-duration-display" style="font-family:var(--font-display);font-size:22px;color:var(--g5);line-height:1">—</div>' +
        '</div>' +
        '<div style="padding:12px 14px;background:rgba(67,160,90,0.10);border:1px solid rgba(67,160,90,0.25);border-radius:12px;position:relative">' +
          '<div style="font-size:10px;color:var(--g5);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:flex;align-items:center;gap:4px">' +
            'Calories' +
            '<span id="manual-kcal-info" onclick="_showManualKcalInfo()"' +
              ' style="cursor:pointer;background:rgba(67,160,90,0.25);width:14px;height:14px;border-radius:50%;' +
                'display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:var(--g5);' +
                'user-select:none">i</span>' +
          '</div>' +
          '<div id="manual-kcal-display" style="font-family:var(--font-display);font-size:22px;color:var(--g5);line-height:1">—</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:18px">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">' +
          'Place <span style="color:var(--text3);font-weight:400;text-transform:none;letter-spacing:0">— optional</span>' +
        '</div>' +
        '<input id="manual-place" type="text" maxlength="60" value="' + _escapeAttr(_manualForm.place) + '"' +
          ' oninput="_manualForm.place=this.value.slice(0,60)"' +
          ' placeholder="e.g. Local Sports Club, Home, Beach…"' +
          ' style="width:100%;background:var(--surface2);border:1px solid var(--border);' +
            'color:var(--text);padding:11px 14px;border-radius:12px;font-size:14px;outline:none;' +
            'font-family:inherit" />' +
      '</div>' +

      '<button id="manual-log-btn" class="btn btn-primary btn-full btn-lg"' +
        ' onclick="logManualActivity()" disabled' +
        ' style="margin-bottom:10px;opacity:0.55">' +
        '🎉 Log Activity' +
      '</button>' +

      '<div style="text-align:center;margin-top:6px">' +
        '<button onclick="goBack()"' +
          ' style="background:none;border:none;color:var(--text3);font-size:12px;' +
            'text-decoration:underline;cursor:pointer">' +
          '← Cancel' +
        '</button>' +
      '</div>' +
    '</div>';

  _recalcManualMetrics();
}

// ── DURATION + CALORIE LIVE CALC ────────────────────────────────
function _recalcManualMetrics() {
  var durEl  = document.getElementById('manual-duration-display');
  var kcalEl = document.getElementById('manual-kcal-display');
  var btn    = document.getElementById('manual-log-btn');
  if (!durEl || !kcalEl) return;

  var mins = _manualDurationMin();
  if (!isFinite(mins) || mins <= 0) {
    durEl.textContent  = '—';
    kcalEl.textContent = '—';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; }
    return;
  }
  durEl.textContent = _formatMin(mins);

  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(_manualForm.activityId);
  var w   = _manualForm.weight;
  if (act && w > 0) {
    var kcal = Math.round(act.met * w * (mins / 60));
    kcalEl.textContent = kcal;
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  } else {
    kcalEl.textContent = w > 0 ? '—' : 'Add wt';
    if (btn) { btn.disabled = !act || !w; btn.style.opacity = (!act || !w) ? '0.55' : '1'; }
  }
}

// Computes duration in minutes — handles end-before-start by adding a
// day's worth (rare: e.g. yoga session across midnight). Returns NaN when
// fields are unfilled or invalid. Refuses durations > 12 h (likely error).
function _manualDurationMin() {
  if (!_manualForm.startTime || !_manualForm.endTime) return NaN;
  var s = _parseHM(_manualForm.startTime);
  var e = _parseHM(_manualForm.endTime);
  if (s === null || e === null) return NaN;
  var diff = e - s;
  if (diff < 0) diff += 24 * 60;
  if (diff > 12 * 60) return NaN;
  return diff;
}
function _parseHM(t) {
  if (typeof t !== 'string') return null;
  var m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  var h = +m[1], mm = +m[2];
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}
function _formatMin(min) {
  min = Math.max(0, Math.round(min));
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (h === 0) return m + ' min';
  if (m === 0) return h + ' h';
  return h + 'h ' + m + 'm';
}

function _showManualKcalInfo() {
  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(_manualForm.activityId);
  var w   = _manualForm.weight || '—';
  var mins = _manualDurationMin();
  var hours = isFinite(mins) ? (mins / 60).toFixed(2) : '—';
  var msg = act
    ? 'Estimated using your weight (' + w + ' kg) × ' + act.name + ' intensity (MET ' + act.met + ', ' + act.intensity + ') × duration (' + hours + ' h). Real burn varies with effort, so treat as a guide.'
    : 'Estimate based on weight × activity intensity × duration.';
  if (typeof showToast === 'function') showToast(msg, 'info', 6000);
  else alert(msg);
}

function _escapeAttr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _fmt12h(hm) {
  var p = _parseHM(hm);
  if (p === null) return hm;
  var h = Math.floor(p / 60), m = p % 60;
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 || 12;
  return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

// ── SAVE THE LOG ────────────────────────────────────────────────
function logManualActivity() {
  var user = APP.currentUser;
  if (!user) return;
  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(_manualForm.activityId);
  if (!act) { if (typeof showToast === 'function') showToast('Pick an activity first.', 'info'); return; }
  var mins = _manualDurationMin();
  if (!isFinite(mins) || mins <= 0) {
    if (typeof showToast === 'function') showToast('End time must be after start time.', 'error');
    return;
  }
  var w = _manualForm.weight;
  if (!w || w <= 0) {
    if (typeof showToast === 'function') showToast('Add your weight to compute calories.', 'info');
    return;
  }

  // Persist weight to body_profile + Sheets on first manual log (no-op if
  // it was already stored there).
  _persistUserWeight(w);

  var kcal = Math.round(act.met * w * (mins / 60));
  var today = _manualForm.date || todayStr();
  var dayWk = _weekdayFromYmd(today);
  var moduleId = 'activity_' + act.id;

  var ts = new Date().toISOString();
  var added = Store.addLog({
    userId:       user.id,
    module:       moduleId,
    day:          dayWk,
    date:         today,
    timestamp:    ts,
    activityType: act.id,
    durationMin:  mins,
    kcal:         kcal,
    startTime:    _manualForm.startTime,
    endTime:      _manualForm.endTime,
    place:        (_manualForm.place || '').trim(),
  });
  if (!added) {
    if (typeof showToast === 'function') showToast('You already logged ' + act.name + ' for that day.', 'info');
    return;
  }

  // Fire-and-forget sheet sync. Apps Script v141+ stores the extras in
  // dedicated columns; older versions silently ignore them.
  try {
    sheetsPost('logCompletion', {
      userId:       user.id,
      email:        user.email,
      module:       moduleId,
      day:          dayWk,
      date:         today,
      activityType: act.id,
      durationMin:  mins,
      kcal:         kcal,
      place:        (_manualForm.place || '').trim(),
    });
  } catch (e) {}

  setTimeout(function () {
    if (typeof checkAndUnlockWorkoutAchievements === 'function') {
      checkAndUnlockWorkoutAchievements(user.id);
    }
  }, 600);

  APP._activityCardLogId = added.id || _findLatestActivityLogId(user.id, moduleId, today);
  // Form is done — clear the sub-view back hook so back from the card goes
  // to the parent page (dashboard) rather than restoring the form/picker.
  if (typeof APP !== 'undefined') APP.subViewBack = null;
  showPage('page-activity-card');
  renderActivityCard();
  if (typeof showToast === 'function') showToast('🎉 ' + act.name + ' logged!', 'success');
}

function _findLatestActivityLogId(userId, moduleId, date) {
  var logs = Store.getUserLogs(userId).filter(function (l) {
    return l.module === moduleId && l.date === date;
  });
  if (logs.length === 0) return null;
  logs.sort(function (a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  return logs[0].id;
}

function _weekdayFromYmd(ymd) {
  var d = new Date(ymd + 'T00:00:00');
  var names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return names[d.getDay()] || 'Monday';
}

// ── WEATHER ─────────────────────────────────────────────────────
// Open-Meteo (https://open-meteo.com) — free, no API key, CORS-friendly.
// Cached in localStorage for 15 min so the card renders instantly on
// repeat opens; first-ever load triggers a background fetch and the
// pill fades in when it resolves.
var _WX_KEY = 'ff_wx_cache';
var _WX_TTL = 15 * 60 * 1000;   // 15 min

function _readCachedWeather() {
  try {
    var raw = localStorage.getItem(_WX_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (!obj || !obj.t || Date.now() - obj.t > _WX_TTL) return null;
    return obj;
  } catch (e) { return null; }
}

// WMO weather codes → emoji (https://open-meteo.com/en/docs)
function _wxEmoji(code) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤️';
}

function _fetchAndUpdateWeather() {
  var pill = document.getElementById('ff-card-wx');
  if (!pill) return;

  // Cache hit fresh — already rendered, nothing to do
  if (_readCachedWeather()) return;

  // Geolocate then fetch. Both are best-effort — if either fails the pill
  // just stays hidden (opacity:0) and the card looks fine without it.
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = pos.coords.latitude.toFixed(3);
    var lon = pos.coords.longitude.toFixed(3);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
      '&longitude=' + lon + '&current=temperature_2m,weather_code';
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var cur = data && data.current;
      if (!cur || cur.temperature_2m == null) return;
      var wx = {
        tempC: Math.round(cur.temperature_2m),
        code:  cur.weather_code,
        emoji: _wxEmoji(cur.weather_code),
        t:     Date.now(),
      };
      try { localStorage.setItem(_WX_KEY, JSON.stringify(wx)); } catch (e) {}
      // Update the pill in place — also live-update if the card is still
      // mounted when the response lands
      var p = document.getElementById('ff-card-wx');
      if (p) {
        p.innerHTML = '<span style="font-size:14px;line-height:1">' + wx.emoji + '</span>' +
                      '<span style="font-variant-numeric:lining-nums tabular-nums">' + wx.tempC + '°C</span>';
        p.style.opacity = '0.95';
      }
    }).catch(function () { /* silent — pill stays hidden */ });
  }, function () { /* permission denied — pill stays hidden */ }, {
    timeout: 5000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false,
  });
}

// ── RESULT CARD ─────────────────────────────────────────────────
// Two entry paths:
//   1. Immediately after logging (APP._activityCardLogId set above).
//   2. From history: openActivityCardFromHistory(logId) sets it too.
function renderActivityCard() {
  var container = document.getElementById('activity-card-content');
  if (!container) return;
  var user = APP.currentUser;
  if (!user) return;

  var logId = APP._activityCardLogId;
  var log = Store.getUserLogs(user.id).find(function (l) { return l.id === logId; });
  if (!log) {
    container.innerHTML =
      '<div style="padding:40px 24px;text-align:center;color:var(--text3)">' +
        '<div style="font-size:48px;margin-bottom:10px">🤷</div>' +
        '<div>That activity entry isn\'t available anymore.</div>' +
        '<button class="btn btn-outline" style="margin-top:18px" onclick="showPage(\'page-dashboard\')">Back to dashboard</button>' +
      '</div>';
    return;
  }

  var actId = log.activityType || (log.module || '').replace(/^activity_/, '');
  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(actId);
  var dateLabel     = new Date((log.date || todayStr()) + 'T00:00:00')
                       .toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short' });
  var startTimeLabel = log.startTime ? _fmt12h(log.startTime) : '';
  var durationLabel  = log.durationMin ? _formatMin(log.durationMin) : '—';
  var kcalLabel      = log.kcal != null ? log.kcal : '—';
  var placeLabel     = (log.place || '').trim();
  var displayName    = user.name || (user.email || '').split('@')[0] || 'You';

  // Per-sport SVG scene (table tennis: table+net+balls, badminton: court+
  // shuttlecocks, yoga: mandala+petals, hiking: mountains+trail, etc.)
  // Built in activity-cards.js. Used as fallback under the user-provided
  // PNG below — if the PNG is missing/404, this scene shows through.
  var sceneBg = (window.FF && window.FF.getActivityBackground)
    ? window.FF.getActivityBackground(actId)
    : '';

  // User-provided full-bleed background image (optional). Convention:
  //   icons/bg/<activityId>.png   — e.g. icons/bg/table_tennis.png
  // When present, this covers the SVG scene; when missing, onerror hides
  // the <img> and the SVG scene below shows. No data-file changes needed
  // — drop the PNG into the folder and refresh. Sized 1080×1920 ideal,
  // any 9:16 image works (object-fit:cover handles other ratios).
  var bgImageLayer =
    '<img src="icons/bg/' + actId + '.png" alt="" ' +
      'onerror="this.style.display=\'none\'" ' +
      'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' +
        'z-index:2;pointer-events:none">';

  // Cached temperature for the weather pill — Open-Meteo (no API key, CORS-
  // friendly). 15-min localStorage TTL. If we have a cached value, render
  // immediately; otherwise the pill stays hidden and fills in async.
  var cachedWx = _readCachedWeather();
  var wxInline = cachedWx
    ? '<span style="font-size:14px;line-height:1">' + cachedWx.emoji + '</span>' +
      '<span style="font-variant-numeric:lining-nums tabular-nums">' + cachedWx.tempC + '°C</span>'
    : '';

  container.innerHTML =
    '<div style="padding:0 16px 24px">' +

      '<div id="activity-card-render"' +
        ' style="border-radius:22px;color:#fff;' +
          'background:linear-gradient(135deg,' + act.gradient[0] + ' 0%,' + act.gradient[1] + ' 100%);' +
          'position:relative;overflow:hidden;aspect-ratio:9 / 16;' +
          'display:flex;flex-direction:column;margin-bottom:16px;' +
          'font-family:Inter,-apple-system,system-ui,sans-serif">' +

        // Sport-specific SVG background art (fallback)
        sceneBg +

        // User-provided PNG background (covers SVG when present, hides
        // itself when 404 so the SVG below shows through)
        bgImageLayer +

        // Soft vignette for depth
        '<div style="position:absolute;inset:0;pointer-events:none;z-index:3;' +
          'background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.35) 100%)"></div>' +

        // ─── TOP BAR ─── 3 columns with vertical dividers. align-items:start
        // so all three columns anchor to the top — the right column then
        // extends downward with stacked time + weather under the date.
        '<div style="position:relative;z-index:5;padding:16px 14px 0;' +
          'display:grid;grid-template-columns:1fr 1.3fr 1fr;align-items:start;' +
          'font-size:11px;font-weight:700;letter-spacing:0.04em">' +

          '<div style="display:flex;align-items:center;gap:5px;padding-top:2px;min-width:0">' +
            '<span style="color:#f5d340;font-size:14px;line-height:1;flex-shrink:0">⚡</span>' +
            '<span style="white-space:nowrap">FITFLOW PRO</span>' +
          '</div>' +

          '<div style="text-align:center;padding:4px 6px;min-width:0;' +
            'border-left:1px solid rgba(255,255,255,0.22);' +
            'border-right:1px solid rgba(255,255,255,0.22);font-weight:600;font-size:12px;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            _escapeHtml(displayName) +
          '</div>' +

          // Right column: date / time / weather all stacked, right-aligned,
          // so they read as a vertical column directly under the date.
          '<div style="text-align:right;line-height:1.35;min-width:0;white-space:nowrap">' +
            '<div>' + dateLabel + '</div>' +
            (startTimeLabel
              ? '<div style="font-size:10.5px;font-weight:500;opacity:0.85;margin-top:4px;' +
                  'font-variant-numeric:lining-nums tabular-nums">' + startTimeLabel + '</div>'
              : '') +
            '<div id="ff-card-wx" style="display:inline-flex;align-items:center;gap:4px;' +
              'font-size:11.5px;font-weight:600;margin-top:4px;' +
              'opacity:' + (cachedWx ? '0.95' : '0') + ';transition:opacity .3s">' +
              wxInline +
            '</div>' +
          '</div>' +

        '</div>' +

        // ─── HERO ─── positioned in upper-third, not vertically centered.
        // 100px emoji + 36px title fit comfortably on one line at typical
        // phone widths (340–400px); whiteSpace:nowrap is a safety net.
        '<div style="position:relative;z-index:5;flex:1;display:flex;flex-direction:column;' +
          'align-items:center;justify-content:flex-start;padding:36px 20px 0;text-align:center">' +

          '<div style="font-size:100px;line-height:1;' +
            'filter:drop-shadow(0 8px 18px rgba(0,0,0,0.42))">' + act.emoji + '</div>' +

          '<div style="font-family:\'Bebas Neue\',\'Anton\',\'Arial Black\',Impact,sans-serif;' +
            'font-size:36px;font-weight:400;margin-top:18px;letter-spacing:0.04em;' +
            'line-height:1;text-transform:uppercase;white-space:nowrap;' +
            'text-shadow:0 3px 12px rgba(0,0,0,0.45)">' +
            _escapeHtml(act.name) +
          '</div>' +

          (placeLabel
            ? '<div style="font-size:13px;opacity:0.92;margin-top:12px;font-weight:500">' +
                '📍 ' + _escapeHtml(placeLabel) +
              '</div>'
            : '') +

        '</div>' +

        // ─── STATS CARD ─── bottom, comfortable margin, proportionally
        // smaller values (26px) and tighter padding to match reference.
        // min-width:0 on each column so neither can overflow and hide the
        // other on narrow screens (the bug from the badminton screenshot).
        '<div style="position:relative;z-index:5;margin:0 14px 16px;' +
          'background:rgba(0,0,0,0.42);border:1px solid rgba(255,255,255,0.14);' +
          'border-radius:18px;padding:14px 12px;' +
          'display:grid;grid-template-columns:1fr 1fr">' +

          '<div style="text-align:center;border-right:1px solid rgba(255,255,255,0.16);padding:0 4px;min-width:0">' +
            '<div style="font-size:18px;color:#7fe28e;margin-bottom:4px;line-height:1">⏱</div>' +
            '<div style="font-family:\'Bebas Neue\',\'Anton\',\'Arial Black\',Impact,sans-serif;' +
              'font-size:26px;font-weight:400;line-height:1;letter-spacing:0.02em;' +
              'font-variant-numeric:lining-nums tabular-nums;text-transform:uppercase">' +
              durationLabel +
            '</div>' +
            '<div style="font-size:9.5px;opacity:0.68;margin-top:5px;' +
              'text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Duration</div>' +
          '</div>' +

          '<div style="text-align:center;padding:0 4px;min-width:0">' +
            '<div style="font-size:18px;color:#ff8c42;margin-bottom:4px;line-height:1">🔥</div>' +
            '<div style="font-family:\'Bebas Neue\',\'Anton\',\'Arial Black\',Impact,sans-serif;' +
              'font-size:26px;font-weight:400;line-height:1;letter-spacing:0.02em;' +
              'font-variant-numeric:lining-nums tabular-nums">' +
              kcalLabel +
            '</div>' +
            '<div style="font-size:9.5px;opacity:0.68;margin-top:5px;' +
              'text-transform:uppercase;letter-spacing:0.12em;font-weight:600">kcal</div>' +
          '</div>' +

        '</div>' +

      // end activity-card-render
      '</div>' +

      // Action buttons — Download / Done
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
        '<button class="btn btn-outline btn-full" onclick="downloadActivityCard()">' +
          '⬇ Download' +
        '</button>' +
        '<button class="btn btn-primary btn-full" onclick="showPage(\'page-dashboard\');if(typeof refreshDashboard===\'function\')refreshDashboard()">' +
          '✓ Done' +
        '</button>' +
      '</div>' +

      // Delete link
      '<div style="text-align:center;margin-top:14px">' +
        '<button onclick="confirmDeleteActivity()"' +
          ' style="background:none;border:none;color:var(--text3);font-size:12px;' +
            'text-decoration:underline;cursor:pointer">' +
          '🗑 Delete this entry' +
        '</button>' +
      '</div>' +

    '</div>';

  // Inline <script> tags inside innerHTML never execute (HTML5 spec), so the
  // weather fetch must be triggered from here, after the DOM is in place.
  // Deferred to the next tick so #ff-card-wx exists when the response lands.
  setTimeout(function () {
    if (typeof _fetchAndUpdateWeather === 'function') _fetchAndUpdateWeather();
  }, 0);
}


// ── DOWNLOAD CARD AS PNG ────────────────────────────────────────
// Lazy-loads html2canvas from CDN on first use — no upfront cost for
// users who never log a manual activity. The on-screen card is rendered
// at the device's pixel width (~330–360 px for most phones); html2canvas's
// `scale` multiplies that, so to hit a 1080×1920 ultra-HD PNG we compute
// the scale dynamically from the live card width.
function downloadActivityCard() {
  var node = document.getElementById('activity-card-render');
  if (!node) return;
  if (typeof showToast === 'function') showToast('Preparing your card…', 'info');

  // Flatten radius so the saved PNG is a clean edge-to-edge rectangle
  // (no white slivers at the corners). Restored in every code path below.
  var origRadius = node.style.borderRadius;
  node.style.borderRadius = '0';
  function _restore() { node.style.borderRadius = origRadius; }

  // Dynamic scale → target 1080 px wide (1920 tall at 9:16 aspect ratio).
  var rect    = node.getBoundingClientRect();
  var liveW   = rect.width || 360;
  var TARGET  = 1080;
  var scale   = Math.max(2, TARGET / liveW);   // never downscale, min 2 for retina

  _loadHtml2Canvas().then(function (h2c) {
    h2c(node, {
      backgroundColor: null,
      scale: scale,
      useCORS: true,
      logging: false,
    }).then(function (canvas) {
      _restore();
      try {
        var link  = document.createElement('a');
        var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = 'fitflow-activity-' + stamp + '.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof showToast === 'function') showToast('✓ Saved to your downloads', 'success');
      } catch (e) {
        console.error('Download failed:', e);
        if (typeof showToast === 'function') showToast('Could not save — try a screenshot instead.', 'error');
      }
    }).catch(function (e) {
      _restore();
      console.error('Render failed:', e);
      if (typeof showToast === 'function') showToast('Could not render — try a screenshot instead.', 'error');
    });
  }).catch(function (e) {
    _restore();
    console.error('html2canvas failed to load:', e);
    if (typeof showToast === 'function') showToast('Need internet to download — try a screenshot instead.', 'error');
  });
}

var _h2cPromise = null;
function _loadHtml2Canvas() {
  if (typeof html2canvas === 'function') return Promise.resolve(html2canvas);
  if (_h2cPromise) return _h2cPromise;
  _h2cPromise = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = function () {
      if (typeof html2canvas === 'function') resolve(html2canvas);
      else reject(new Error('html2canvas global missing after load'));
    };
    s.onerror = function () { _h2cPromise = null; reject(new Error('CDN load failed')); };
    document.head.appendChild(s);
  });
  return _h2cPromise;
}

// ── DELETE AN ACTIVITY ENTRY ────────────────────────────────────
function confirmDeleteActivity() {
  if (typeof showConfirm !== 'function') {
    if (!confirm('Delete this activity?')) return;
    return _doDeleteActivity();
  }
  showConfirm(
    'Delete this activity?',
    'The entry will be removed from your history. This can\'t be undone.',
    'Delete',
    'Keep',
    _doDeleteActivity,
    null,
    'danger'
  );
}
function _doDeleteActivity() {
  var user = APP.currentUser;
  if (!user) return;
  var logId = APP._activityCardLogId;
  if (!logId) return;

  var logs = Store.get('ff_logs', []) || [];
  var keep = logs.filter(function (l) { return l.id !== logId; });
  Store.set('ff_logs', keep);

  try {
    sheetsPost('deleteLog', { userId: user.id, logId: logId });
  } catch (e) {}

  if (typeof showToast === 'function') showToast('Activity deleted.', 'info');
  showPage('page-dashboard');
  if (typeof refreshDashboard === 'function') refreshDashboard();
}

// ── PUBLIC HELPERS ──────────────────────────────────────────────
function getActivityMeta(modId) {
  if (typeof modId !== 'string' || !modId.startsWith('activity_')) return null;
  var act = window.APP_DATA && window.APP_DATA.getActivity && window.APP_DATA.getActivity(modId.replace(/^activity_/, ''));
  return act ? { emoji: act.emoji, name: act.name, gradient: act.gradient } : null;
}

function openActivityCardFromHistory(logId) {
  APP._activityCardLogId = logId;
  showPage('page-activity-card');
  renderActivityCard();
}
