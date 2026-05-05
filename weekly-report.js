// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Weekly Report Card v3
// ════════════════════════════════════════════════════════════════

// Which week to display. 0 = this week, -1 = last week, etc.
window._weekOffset = 0;

// Entry point — called when user taps Weekly Report card
function openWeeklyReport() {
  // On Mon(1) or Tue(2) auto-show last week — current week barely started
  const jsDay = new Date().getDay();
  window._weekOffset = (jsDay === 1 || jsDay === 2) ? -1 : 0;
  showPage('page-weekly-report');
  _loadAndRender();
}

// ── STEP 1: Sync logs from Sheets → localStorage, THEN render ────
async function _loadAndRender() {
  const container = document.getElementById('weekly-report-content');
  if (!container) return;

  // Show loading — never leave blank screen
  container.innerHTML = `
    <div style="padding:60px 16px;text-align:center;color:var(--text3)">
      <div class="loader" style="margin:0 auto 16px"></div>
      <div style="font-size:14px">Loading your report…</div>
    </div>`;

  try {
    const user = APP.currentUser;
    if (user) {
      // Fetch completion logs from Sheets
      const res = await Sheets.get('getUserLogs', { userId: user.id });
      if (res?.success && Array.isArray(res.logs) && res.logs.length) {
        const local = Store.getLogs();
        let changed = false;
        res.logs.forEach(sl => {
          const dup = local.find(l =>
            l.userId === sl.userId && l.module === sl.module &&
            l.day    === sl.day    && l.date   === sl.date
          );
          if (!dup) {
            local.push({ ...sl, id: sl.id || ('log_' + Date.now() + Math.random()) });
            changed = true;
          }
        });
        if (changed) Store.set('ff_logs', local);
      }
      // Fetch run logs from Sheets
      const rr = await Sheets.get('getUserRunLogs', { userId: user.id });
      if (rr?.success && Array.isArray(rr.logs) && rr.logs.length) {
        const lr = Store.getRunLogs();
        let ch = false;
        rr.logs.forEach(r => {
          const dup = lr.find(l => l.id === r.id ||
            (l.userId === r.userId && l.date === r.date &&
             Math.abs((l.distance||0) - (r.distance||0)) < 0.01));
          if (!dup) { lr.push(r); ch = true; }
        });
        if (ch) Store.set('ff_runlogs', lr);
      }
    }
  } catch(e) {
    console.warn('[WeeklyReport] Sync skipped:', e.message);
  }

  renderWeeklyReport();
}

// ── STEP 2: Navigate week ─────────────────────────────────────────
function wrNav(dir) {
  const next = window._weekOffset + dir;
  if (next > 0) return; // no future weeks
  window._weekOffset = next;
  renderWeeklyReport();
}

// ── STEP 3: Render ────────────────────────────────────────────────
function renderWeeklyReport() {
  const container = document.getElementById('weekly-report-content');
  if (!container) return;

  const user    = APP.currentUser;
  const allLogs = Store.getUserLogs(user.id);
  const runLogs = Store.getUserRunLogs(user.id);
  const cwLogs  = allLogs.filter(l =>  l.module.startsWith('custom_'));
  const stdLogs = allLogs.filter(l => !l.module.startsWith('custom_'));

  // ── Week dates ─────────────────────────────────────────────────
  const offset  = window._weekOffset || 0;
  const monday  = _monday(offset);
  const sunday  = _addDays(monday, 6);
  const pMon    = _monday(offset - 1);
  const pSun    = _addDays(pMon, 6);
  const today   = todayStr();
  const isThisWeek = offset === 0;
  const weekLabel  = offset === 0  ? 'This Week'
                   : offset === -1 ? 'Last Week'
                   : 'Week of ' + _fmt(monday);

  // ── Filter logs ────────────────────────────────────────────────
  const wLogs = stdLogs.filter(l => l.date >= monday && l.date <= sunday);
  const wRuns = runLogs.filter(r => r.date >= monday && r.date <= sunday);
  const wCW   = cwLogs.filter(l  => l.date >= monday && l.date <= sunday);
  const pLogs = stdLogs.filter(l => l.date >= pMon   && l.date <= pSun);
  const pRuns = runLogs.filter(r => r.date >= pMon   && r.date <= pSun);

  // ── Stats ──────────────────────────────────────────────────────
  const activeDays    = [...new Set(wLogs.map(l => l.date))].length;
  const totalWorkouts = wLogs.length + wCW.length;
  const totalKm       = wRuns.reduce((a,r) => a + (r.distance||0), 0);
  const totalTime     = wRuns.reduce((a,r) => a + (r.duration||0), 0);
  const streak        = calcStreak(user.id);
  const modCounts     = {};
  wLogs.forEach(l => { modCounts[l.module] = (modCounts[l.module]||0) + 1; });
  const wowW  = totalWorkouts - pLogs.length;
  const wowKm = totalKm - pRuns.reduce((a,r) => a + (r.distance||0), 0);

  // ── 7-day grid ─────────────────────────────────────────────────
  const dayGrid = Array.from({length:7}, (_, i) => {
    const d  = _addDays(monday, i);
    const dl = allLogs.filter(l => l.date === d);
    return {
      date:     d,
      count:    dl.length,
      emojis:   [...new Set(dl.map(l => getModuleEmoji(l.module.startsWith('custom_') ? 'custom' : l.module)))],
      isToday:  d === today,
      isFuture: d > today,
    };
  });

  // ── Grade ──────────────────────────────────────────────────────
  const grade = activeDays >= 6 ? { letter:'A+', label:'Outstanding!', color:'var(--g4)'    }
              : activeDays >= 5 ? { letter:'A',  label:'Excellent!',   color:'var(--g4)'    }
              : activeDays >= 4 ? { letter:'B',  label:'Great job!',   color:'#43a05a'       }
              : activeDays >= 3 ? { letter:'C',  label:'Good effort',  color:'var(--accent)' }
              : activeDays >= 2 ? { letter:'D',  label:'Keep going!',  color:'#fb8c00'       }
              :                   { letter:'F',  label:"Let's start!", color:'var(--danger)'  };

  // ── Build HTML ─────────────────────────────────────────────────
  container.innerHTML = `

    <!-- Week navigation -->
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px 4px;gap:8px">
      <button onclick="wrNav(-1)"
        style="flex-shrink:0;background:var(--surface);border:1px solid var(--border);
        border-radius:10px;padding:8px 16px;color:var(--text2);font-size:13px;
        font-weight:600;cursor:pointer;">‹ Prev</button>

      <div style="text-align:center;flex:1">
        <div style="font-size:14px;font-weight:700;color:var(--g5)">${weekLabel}</div>
        <div style="font-size:11px;color:var(--text3)">${_fmt(monday)} – ${_fmt(sunday)}</div>
      </div>

      <button onclick="wrNav(1)" ${isThisWeek ? 'disabled' : ''}
        style="flex-shrink:0;background:var(--surface);border:1px solid var(--border);
        border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;
        color:${isThisWeek ? 'var(--text3)' : 'var(--text2)'};
        opacity:${isThisWeek ? '0.4' : '1'};cursor:${isThisWeek ? 'default' : 'pointer'};">
        Next ›</button>
    </div>

    <!-- Grade card -->
    <div class="card" style="background:linear-gradient(135deg,var(--g1),var(--bg2));
      margin:12px 0 16px;text-align:center;padding:28px 20px">
      <div style="font-size:12px;color:var(--text2);text-transform:uppercase;
        letter-spacing:.08em;margin-bottom:4px">${weekLabel}</div>
      <div style="font-family:var(--font-display);font-size:80px;
        color:${grade.color};line-height:1;margin:8px 0">${grade.letter}</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:4px">${grade.label}</div>
      <div style="font-size:14px;color:var(--text2)">
        ${activeDays} active day${activeDays !== 1 ? 's' : ''} · ${streak} day streak 🔥
      </div>
    </div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${_sc(totalWorkouts,'Workouts', wowW, '💪')}
      ${_sc(activeDays, 'Active Days', activeDays - [...new Set(pLogs.map(l=>l.date))].length, '📅')}
      ${_sc(totalKm.toFixed(1)+'km','Distance Run', null,'🏃',
            wowKm !== 0 ? (wowKm > 0 ? '+'+wowKm.toFixed(1)+'km' : wowKm.toFixed(1)+'km') : null)}
      ${_sc(fmtTime(totalTime),'Time Running', null, '⏱')}
    </div>

    <!-- 7-day activity grid -->
    <div class="card card-sm" style="margin-bottom:16px">
      <div class="section-title" style="margin-bottom:12px">Daily Activity — ${weekLabel}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
        ${['M','T','W','T','F','S','S'].map(x =>
          `<div style="text-align:center;font-size:11px;color:var(--text3);font-weight:600">${x}</div>`
        ).join('')}
        ${dayGrid.map(d => `
          <div title="${d.date}" style="aspect-ratio:1;border-radius:8px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            background:${d.isFuture ? 'transparent' : d.count > 0 ? 'var(--g3)' : 'rgba(229,57,53,0.2)'};
            border:${d.isToday ? '2px solid var(--accent)' : d.isFuture ? '1px dashed var(--border)' : 'none'};
            color:${d.isFuture ? 'var(--text3)' : d.count > 0 ? 'white' : '#ef9a9a'};">
            ${d.isFuture ? ''
              : d.count > 0
                ? `<span style="font-size:14px">${d.emojis[0]||'💪'}</span>${d.count>1?`<span style="font-size:9px">+${d.count-1}</span>`:''}`
                : '<span style="font-size:14px">✕</span>'}
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text3)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;
          background:var(--g3);margin-right:4px;vertical-align:middle"></span>Active</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;
          background:rgba(229,57,53,0.2);margin-right:4px;vertical-align:middle"></span>Missed</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;
          border:2px solid var(--accent);margin-right:4px;vertical-align:middle"></span>Today</span>
      </div>
    </div>

    <!-- Activity breakdown — ALWAYS shown, never hidden -->
    <div class="card card-sm" style="margin-bottom:16px">
      <div class="section-title" style="margin-bottom:12px">Activity Breakdown</div>
      ${Object.keys(modCounts).length > 0
        ? Object.entries(modCounts).map(([mod, cnt]) => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:20px;width:28px;text-align:center">${getModuleEmoji(mod)}</span>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:13px;font-weight:600">${getModuleName(mod)}</span>
                <span style="font-size:13px;color:var(--text3)">${cnt} session${cnt>1?'s':''}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${Math.min(100,cnt/7*100)}%"></div>
              </div>
            </div>
          </div>`).join('')
        : `<div style="text-align:center;padding:20px 0;color:var(--text3)">
            <div style="font-size:36px;margin-bottom:8px">📋</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">
              No workouts logged ${isThisWeek ? 'this week yet' : 'this week'}
            </div>
            <div style="font-size:12px">
              ${isThisWeek
                ? 'Complete a workout — it will appear here!'
                : 'Try checking a different week below'}
            </div>
            ${!isThisWeek ? '' : `<button onclick="wrNav(-1)"
              style="margin-top:12px;background:none;border:1px solid var(--border);
              border-radius:8px;padding:6px 16px;color:var(--text2);font-size:12px;cursor:pointer">
              ‹ View last week
            </button>`}
          </div>`
      }
    </div>

    <!-- Running summary -->
    ${wRuns.length > 0 ? `
    <div class="card card-sm" style="margin-bottom:16px;
      background:linear-gradient(135deg,rgba(67,160,90,0.1),rgba(30,136,229,0.1))">
      <div class="section-title" style="margin-bottom:12px">🏃 Running — ${weekLabel}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--g5)">${wRuns.length}</div>
          <div style="font-size:11px;color:var(--text3)">Runs</div>
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--g5)">${totalKm.toFixed(1)}</div>
          <div style="font-size:11px;color:var(--text3)">km</div>
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--g5)">${fmtTime(totalTime)}</div>
          <div style="font-size:11px;color:var(--text3)">Time</div>
        </div>
      </div>
    </div>` : ''}

    <!-- Motivational message — ALWAYS shown -->
    <div class="card" style="background:rgba(46,125,70,0.1);border-color:rgba(46,125,70,0.25);
      text-align:center;padding:20px;margin-bottom:80px">
      <div style="font-size:24px;margin-bottom:8px">${_emoji(activeDays)}</div>
      <div style="font-size:14px;color:var(--text);line-height:1.6;font-style:italic">
        "${_msg(activeDays)}"
      </div>
    </div>
  `;
}

// ── DATE HELPERS ──────────────────────────────────────────────────

function _monday(offset) {
  const d   = new Date();
  const day = d.getDay(); // 0=Sun
  // Move to this week's Monday
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  // Apply week offset
  d.setDate(d.getDate() + offset * 7);
  return d.toISOString().split('T')[0];
}

function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00'); // noon prevents DST bugs
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function _fmt(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric' });
}

// ── BACKWARD COMPAT (used by app.js calcStreak etc.) ──────────────
function getMonday()     { return _monday(0); }
function getSunday()     { return _addDays(getMonday(), 6); }
function getPrevMonday() { return _monday(-1); }
function getPrevSunday() { return _addDays(getPrevMonday(), 6); }
function getLast7Days()  { return Array.from({length:7}, (_,i) => _addDays(getMonday(), i)); }
function formatDate(dateStr) { return _fmt(dateStr); }

// ── STAT CARD ─────────────────────────────────────────────────────
function _sc(val, label, diff, emoji, diffLabel) {
  const ds = diffLabel != null ? diffLabel
           : diff != null
             ? (diff > 0 ? `+${diff} vs prev` : diff < 0 ? `${diff} vs prev` : 'Same as prev')
             : '';
  const dc = diff > 0 ? 'var(--g5)' : diff < 0 ? '#ef9a9a' : 'var(--text3)';
  return `<div class="stat-card">
    <div style="font-size:18px;margin-bottom:4px">${emoji}</div>
    <div style="font-family:var(--font-display);font-size:32px;color:var(--g5);line-height:1">${val}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:3px">${label}</div>
    ${ds ? `<div style="font-size:11px;color:${dc};margin-top:3px">${ds}</div>` : ''}
  </div>`;
}
function statCard(v,l,d,e,dl) { return _sc(v,l,d,e,dl); }

// ── MOTIVATIONAL ──────────────────────────────────────────────────
function _emoji(days) {
  return days >= 5 ? '🔥' : days >= 3 ? '💪' : days >= 1 ? '👍' : '💡';
}
function _msg(days) {
  const m = {
    6: "You crushed it! Elite consistency. Keep this energy going!",
    5: "Phenomenal! 5 active days shows real dedication. You're building something special.",
    4: "Solid work! 4 days puts you ahead of 90% of people. Keep pushing!",
    3: "Good effort! 3 days is a great foundation. Can we hit 4 next week?",
    2: "You showed up twice — that matters. Every session builds the habit. Keep going!",
    1: "One session is better than zero. The hardest part is starting. See you tomorrow?",
    0: "New week, fresh start. Your body is ready. Let's make this week count! 🚀",
  };
  return m[Math.min(days, 6)] || m[0];
}
function getMotivationalEmoji(d)   { return _emoji(d); }
function getMotivationalMessage(d) { return _msg(d); }
