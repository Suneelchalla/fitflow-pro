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
  var dateLabel = new Date((log.date || todayStr()) + 'T00:00:00').toLocaleDateString(undefined, { weekday:'short', day:'numeric', month:'short' });
  var timeRange = (log.startTime && log.endTime)
    ? _fmt12h(log.startTime) + ' → ' + _fmt12h(log.endTime)
    : '';
  var durationLabel = log.durationMin ? _formatMin(log.durationMin) : '—';
  var kcalLabel     = log.kcal != null ? log.kcal : '—';
  var placeLabel    = (log.place || '').trim();

  container.innerHTML =
    '<div style="padding:0 16px 24px">' +

      '<div id="activity-card-render"' +
        ' style="border-radius:22px;padding:22px 20px 18px;color:#fff;' +
          'background:linear-gradient(135deg,' + act.gradient[0] + ' 0%,' + act.gradient[1] + ' 100%);' +
          'position:relative;overflow:hidden;aspect-ratio:4 / 5;' +
          'display:flex;flex-direction:column;margin-bottom:16px">' +

        '<div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;' +
          'border-radius:50%;background:rgba(255,255,255,0.06);pointer-events:none"></div>' +
        '<div style="position:absolute;bottom:-30px;left:-30px;width:120px;height:120px;' +
          'border-radius:50%;background:rgba(0,0,0,0.10);pointer-events:none"></div>' +

        '<div style="display:flex;justify-content:space-between;align-items:center;' +
          'position:relative;z-index:2">' +
          '<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:0.05em">' +
            '⚡ FITFLOW PRO' +
          '</div>' +
          '<div style="font-size:11px;opacity:0.78">' + dateLabel + '</div>' +
        '</div>' +

        '<div style="text-align:center;padding:18px 0 14px;position:relative;z-index:2;flex:1;' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center">' +
          '<div style="font-size:88px;line-height:1">' + act.emoji + '</div>' +
          '<div style="font-family:var(--font-display,serif);font-size:26px;font-weight:800;' +
            'margin-top:10px;letter-spacing:0.02em">' + act.name + '</div>' +
          (placeLabel ? '<div style="font-size:12px;opacity:0.78;margin-top:6px">📍 ' + _escapeHtml(placeLabel) + '</div>' : '') +
        '</div>' +

        '<div style="background:rgba(0,0,0,0.22);border-radius:14px;padding:12px 8px;' +
          'display:grid;grid-template-columns:1fr 1fr 1fr;position:relative;z-index:2">' +
          '<div style="text-align:center;border-right:1px solid rgba(255,255,255,0.12)">' +
            '<div style="font-family:var(--font-display,serif);font-size:18px;font-weight:800;line-height:1">' + durationLabel + '</div>' +
            '<div style="font-size:9px;opacity:0.7;margin-top:3px;text-transform:uppercase;letter-spacing:0.06em">Duration</div>' +
          '</div>' +
          '<div style="text-align:center;border-right:1px solid rgba(255,255,255,0.12)">' +
            '<div style="font-family:var(--font-display,serif);font-size:18px;font-weight:800;line-height:1">' + kcalLabel + '</div>' +
            '<div style="font-size:9px;opacity:0.7;margin-top:3px;text-transform:uppercase;letter-spacing:0.06em">kcal</div>' +
          '</div>' +
          '<div style="text-align:center">' +
            '<div style="font-size:11px;font-weight:700;padding-top:3px;line-height:1.3">' + (timeRange || dateLabel) + '</div>' +
            '<div style="font-size:9px;opacity:0.7;margin-top:3px;text-transform:uppercase;letter-spacing:0.06em">Time</div>' +
          '</div>' +
        '</div>' +

        '<div style="text-align:center;margin-top:10px;font-size:9px;opacity:0.55;' +
          'position:relative;z-index:2;letter-spacing:0.04em">fitflowpro.in</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
        '<button class="btn btn-outline btn-full" onclick="downloadActivityCard()">' +
          '⬇ Download' +
        '</button>' +
        '<button class="btn btn-primary btn-full" onclick="showPage(\'page-dashboard\');if(typeof refreshDashboard===\'function\')refreshDashboard()">' +
          '✓ Done' +
        '</button>' +
      '</div>' +

      '<div style="text-align:center;margin-top:14px">' +
        '<button onclick="confirmDeleteActivity()"' +
          ' style="background:none;border:none;color:var(--text3);font-size:12px;' +
            'text-decoration:underline;cursor:pointer">' +
          '🗑 Delete this entry' +
        '</button>' +
      '</div>' +

    '</div>';
}

// ── DOWNLOAD CARD AS PNG ────────────────────────────────────────
// Lazy-loads html2canvas from CDN on first use — no upfront cost for
// users who never log a manual activity. Renders the same DOM element
// the user sees onscreen, so what they get matches the preview exactly.
function downloadActivityCard() {
  var node = document.getElementById('activity-card-render');
  if (!node) return;
  if (typeof showToast === 'function') showToast('Preparing your card…', 'info');

  // FIX for white-corner slivers: the on-screen card has border-radius:22px,
  // but PNG export is rectangular. The pixel triangles outside the rounded
  // corners but inside the bounding box render as white in the saved file.
  // Temporarily flatten the radius during capture and restore it after, so
  // the screen preview stays rounded while the downloaded PNG is a clean
  // edge-to-edge portrait rectangle.
  var origRadius = node.style.borderRadius;
  node.style.borderRadius = '0';

  function _restore() { node.style.borderRadius = origRadius; }

  _loadHtml2Canvas().then(function (h2c) {
    h2c(node, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    }).then(function (canvas) {
      _restore();
      try {
        var link = document.createElement('a');
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
