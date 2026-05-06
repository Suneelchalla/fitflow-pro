// LOCAL date helper
function _ymdLocal(d) {
  if (!d || isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Weekly Report Card v4 (Compact, no-scroll)
// ════════════════════════════════════════════════════════════════

window._weekOffset = 0;

function openWeeklyReport() {
  const jsDay = new Date().getDay();
  window._weekOffset = (jsDay === 1 || jsDay === 2) ? -1 : 0;
  showPage('page-weekly-report');
  _loadAndRender();
}

async function _loadAndRender() {
  const container = document.getElementById('weekly-report-content');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:40px 16px;text-align:center;color:var(--text3)">
      <div class="loader" style="margin:0 auto 12px"></div>
      <div style="font-size:13px">Loading…</div>
    </div>`;
  try {
    const user = APP.currentUser;
    if (user) {
      const [res, rr] = await Promise.all([
        Sheets.get('getUserLogs', { userId: user.id }),
        Sheets.get('getUserRunLogs', { userId: user.id }),
      ]);
      if (res?.success && Array.isArray(res.logs) && res.logs.length) {
        const local = Store.getLogs(); let ch = false;
        const tsToLocal = (ts) => {
          if (!ts) return null;
          const dt = new Date(ts);
          if (isNaN(dt.getTime())) return null;
          return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
        };
        const seen = new Set(local.map(l => (l.userId||'') + '|' + (l.module||'') + '|' + (l.date||'')));
        res.logs.forEach(sl => {
          const correctDate = tsToLocal(sl.timestamp) || sl.date;
          const fixed = { ...sl, date: correctDate };
          const key = (fixed.userId||'') + '|' + (fixed.module||'') + '|' + (fixed.date||'');
          if (!seen.has(key)) { local.push({ ...fixed, id: fixed.id||('log_'+Date.now()+Math.random()) }); seen.add(key); ch = true; }
        });
        if (ch) Store.set('ff_logs', local);
      }
      if (rr?.success && Array.isArray(rr.logs) && rr.logs.length) {
        const lr = Store.getRunLogs(); let ch2 = false;
        rr.logs.forEach(r => {
          if (!lr.find(l => l.id===r.id||(l.userId===r.userId&&l.date===r.date&&Math.abs((l.distance||0)-(r.distance||0))<0.01)))
            { lr.push(r); ch2=true; }
        });
        if (ch2) Store.set('ff_runlogs', lr);
      }
    }
  } catch(e) { console.warn('[WeeklyReport] Sync skipped:', e.message); }
  renderWeeklyReport();
}

function wrNav(dir) {
  const next = window._weekOffset + dir;
  if (next > 0) return;
  window._weekOffset = next;
  renderWeeklyReport();
}

// Safe wrappers for helpers that live in admin.js / dashboard.js
function _wrModuleEmoji(mod) {
  if (typeof getModuleEmoji === 'function') return getModuleEmoji(mod);
  const map = { cardio:'🏠', gym:'🏋️', yoga:'🧘', stretching:'🙆', running:'🏃', calisthenics:'🤸', core:'🔥', custom:'✏️' };
  return map[mod] || '💪';
}
function _wrModuleName(mod) {
  if (typeof getModuleName === 'function') return getModuleName(mod);
  const map = { cardio:'Cardio', gym:'Gym', yoga:'Yoga', stretching:'Stretch', running:'Running', calisthenics:'Calisthenics', core:'Core', custom:'Custom' };
  return map[mod] || mod;
}

function renderWeeklyReport() {
  const container = document.getElementById('weekly-report-content');
  if (!container) return;

  // ── Guard: user must exist ────────────────────────────────────
  const user = APP.currentUser;
  if (!user) { container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text3)">Please log in to view your report.</div>'; return; }

  const allLogs = Store.getUserLogs(user.id);
  const runLogs = Store.getUserRunLogs(user.id);
  const cwLogs  = allLogs.filter(l => l.module.startsWith('custom_'));
  const stdLogs = allLogs.filter(l => !l.module.startsWith('custom_'));

  const offset     = window._weekOffset || 0;
  const monday     = _monday(offset);
  const sunday     = _addDays(monday, 6);
  const prevMon    = _monday(offset - 1);
  const prevSun    = _addDays(prevMon, 6);
  const today      = todayStr();
  const isThisWeek = offset === 0;
  const weekLabel  = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : 'Week of ' + _fmt(monday);

  const wLogs = stdLogs.filter(l => l.date >= monday && l.date <= sunday);
  const wRuns = runLogs.filter(r => r.date >= monday && r.date <= sunday);
  const wCW   = cwLogs.filter(l  => l.date >= monday && l.date <= sunday);
  const pLogs = stdLogs.filter(l => l.date >= prevMon && l.date <= prevSun);
  const pRuns = runLogs.filter(r => r.date >= prevMon && r.date <= prevSun);

  const allWeekDates  = [...wLogs.map(l=>l.date), ...wCW.map(l=>l.date), ...wRuns.map(r=>r.date)];
  const activeDays    = [...new Set(allWeekDates)].length;
  const totalWorkouts = wLogs.length + wCW.length + wRuns.length;
  const totalKm       = wRuns.reduce((a,r) => a+(r.distance||0), 0);
  const totalTime     = wRuns.reduce((a,r) => a+(r.duration||0), 0);
  const streakAsOf    = sunday > today ? today : sunday;
  const streak        = calcStreak(user.id, streakAsOf);

  const prevActiveDays = [...new Set([...pLogs.map(l=>l.date),...pRuns.map(r=>r.date)])].length;
  const prevTotal      = pLogs.length + pRuns.length;

  // Module counts
  const modCounts = {};
  wLogs.forEach(l => { const k = l.module.startsWith('custom_') ? 'custom' : l.module; modCounts[k] = (modCounts[k]||0)+1; });
  if (wRuns.length) modCounts['running'] = (modCounts['running']||0) + wRuns.length;

  // 7-day grid
  const dayGrid = Array.from({ length: 7 }, (_, i) => {
    const d     = _addDays(monday, i);
    const dl    = allLogs.filter(l => l.date === d);
    const dRuns = runLogs.filter(r => r.date === d);
    const count = dl.length + dRuns.length;
    const emoji = dl.length ? _wrModuleEmoji(dl[0].module.startsWith('custom_') ? 'custom' : dl[0].module) : dRuns.length ? '🏃' : '';
    return { d, count, emoji, isToday: d===today, isFuture: d>today };
  });

  // Grade
  const grade = activeDays >= 6 ? { letter:'A+', color:'#43d17a' }
              : activeDays >= 5 ? { letter:'A',  color:'#43d17a' }
              : activeDays >= 4 ? { letter:'B',  color:'#7ed9a0' }
              : activeDays >= 3 ? { letter:'C',  color:'var(--accent)' }
              : activeDays >= 2 ? { letter:'D',  color:'#fb8c00' }
              : activeDays >= 1 ? { letter:'E',  color:'#fb8c00' }
              :                   { letter:'F',  color:'#ef5350' };

  // Top modules (max 3 for compact view)
  const topMods = Object.entries(modCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const dayNames = ['M','T','W','T','F','S','S'];

  container.innerHTML = `
    <!-- Week nav — compact -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px 6px">
      <button onclick="wrNav(-1)"
        style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
        padding:5px 12px;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer">‹ Prev</button>
      <div style="text-align:center">
        <div style="font-size:13px;font-weight:700;color:var(--g5)">${weekLabel}</div>
        <div style="font-size:10px;color:var(--text3)">${_fmt(monday)} – ${_fmt(sunday)}</div>
      </div>
      <button onclick="wrNav(1)" ${isThisWeek ? 'disabled' : ''}
        style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
        padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;
        color:${isThisWeek ? 'var(--text3)' : 'var(--text2)'};opacity:${isThisWeek ? '0.35' : '1'}">Next ›</button>
    </div>

    <!-- TOP ROW: Grade + Key stats side by side -->
    <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;padding:0 12px;margin-bottom:10px">
      <!-- Grade bubble -->
      <div style="background:linear-gradient(135deg,var(--g1),var(--bg2));border:1px solid var(--border);
        border-radius:14px;padding:10px 14px;text-align:center;min-width:72px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-family:var(--font-display);font-size:48px;color:${grade.color};line-height:1">${grade.letter}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${activeDays}/7 days</div>
        <div style="font-size:10px;color:var(--text3)">🔥 ${streak} streak</div>
      </div>

      <!-- Stats 2x2 grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5);line-height:1">${totalWorkouts}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">💪 Workouts</div>
          ${totalWorkouts - prevTotal !== 0 ? `<div style="font-size:9px;color:${totalWorkouts>=prevTotal?'var(--g5)':'#ef9a9a'}">${totalWorkouts>=prevTotal?'↑':'↓'} vs last</div>` : ''}
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5);line-height:1">${activeDays}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">📅 Active Days</div>
          ${activeDays - prevActiveDays !== 0 ? `<div style="font-size:9px;color:${activeDays>=prevActiveDays?'var(--g5)':'#ef9a9a'}">${activeDays>=prevActiveDays?'↑':'↓'} vs last</div>` : ''}
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5);line-height:1">${totalKm > 0 ? totalKm.toFixed(1) : '—'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">🏃 km Run</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 10px;text-align:center">
          <div style="font-family:var(--font-display);font-size:24px;color:var(--g5);line-height:1">${totalTime > 0 ? fmtTime(totalTime) : '—'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">⏱ Run Time</div>
        </div>
      </div>
    </div>

    <!-- 7-day activity strip -->
    <div style="padding:0 12px;margin-bottom:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
          ${dayNames.map(x=>`<div style="text-align:center;font-size:10px;color:var(--text3);font-weight:700">${x}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${dayGrid.map(({d,count,emoji,isToday,isFuture}) => `
            <div style="aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;
              background:${isFuture?'transparent':count>0?'var(--g3)':'rgba(229,57,53,0.15)'};
              border:${isToday?'2px solid var(--accent)':isFuture?'1px dashed var(--border)':'none'};
              font-size:13px;color:${isFuture?'transparent':count>0?'white':'#ef9a9a'}">
              ${isFuture ? '' : count > 0 ? (emoji||'💪') : '✕'}
            </div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;margin-top:6px;font-size:9px;color:var(--text3)">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--g3);margin-right:3px;vertical-align:middle"></span>Active</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:rgba(229,57,53,0.2);margin-right:3px;vertical-align:middle"></span>Missed</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;border:2px solid var(--accent);margin-right:3px;vertical-align:middle"></span>Today</span>
        </div>
      </div>
    </div>

    <!-- Activity breakdown — compact, max 3 modules -->
    <div style="padding:0 12px;margin-bottom:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Activity Breakdown</div>
        ${topMods.length > 0
          ? topMods.map(([mod, cnt]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:16px;width:22px;text-align:center">${_wrModuleEmoji(mod)}</span>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                  <span style="font-size:12px;font-weight:600">${_wrModuleName(mod)}</span>
                  <span style="font-size:11px;color:var(--text3)">${cnt}×</span>
                </div>
                <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:2px">
                  <div style="height:4px;background:var(--g4);border-radius:2px;width:${Math.min(100,cnt/7*100)}%"></div>
                </div>
              </div>
            </div>`).join('')
          : `<div style="text-align:center;padding:8px 0;color:var(--text3);font-size:12px">
              No workouts logged ${isThisWeek ? 'this week yet' : 'this week'}
              ${isThisWeek ? `<br><button onclick="wrNav(-1)" style="margin-top:6px;background:none;border:1px solid var(--border);border-radius:6px;padding:4px 12px;color:var(--text2);font-size:11px;cursor:pointer">‹ Last week</button>` : ''}
            </div>`}
      </div>
    </div>

    <!-- Motivational footer — compact single line -->
    <div style="padding:0 12px;margin-bottom:16px">
      <div style="background:rgba(46,125,70,0.08);border:1px solid rgba(46,125,70,0.2);border-radius:12px;
        padding:10px 14px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">${getMotivationalEmoji(activeDays)}</span>
        <div style="font-size:12px;color:var(--text2);line-height:1.4;font-style:italic">"${getMotivationalMessage(activeDays)}"</div>
      </div>
    </div>
  `;
}

// ── DATE HELPERS ──────────────────────────────────────────────────
function _monday(offset) {
  const off = (typeof offset === 'number' && isFinite(offset)) ? offset : 0;
  const d = new Date(), day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + off * 7);
  return _ymdLocal(d);
}
function _addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return _ymdLocal(d);
}
function _fmt(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}

// Backward compat
function getMonday()     { return _monday(0); }
function getSunday()     { return _addDays(getMonday(), 6); }
function getPrevMonday() { return _monday(-1); }
function getPrevSunday() { return _addDays(getPrevMonday(), 6); }
function getLast7Days()  { return Array.from({ length: 7 }, (_, i) => _addDays(getMonday(), i)); }
function formatDate(s)   { return _fmt(s); }

function statCard(val, label, diff, emoji, diffLabel) {
  const ds = diffLabel != null ? diffLabel
           : (typeof diff === 'number' && diff !== 0)
             ? (diff > 0 ? `+${diff} vs prev` : `${diff} vs prev`) : '';
  const dc = diff > 0 ? 'var(--g5)' : diff < 0 ? '#ef9a9a' : 'var(--text3)';
  return `<div class="stat-card">
    <div style="font-size:18px;margin-bottom:4px">${emoji}</div>
    <div style="font-family:var(--font-display);font-size:32px;color:var(--g5);line-height:1">${val}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:3px">${label}</div>
    ${ds ? `<div style="font-size:11px;color:${dc};margin-top:3px">${ds}</div>` : ''}
  </div>`;
}

function getMotivationalEmoji(days) {
  return days >= 5 ? '🔥' : days >= 3 ? '💪' : days >= 1 ? '👍' : '💡';
}
function getMotivationalMessage(days) {
  const msgs = {
    6: "Elite consistency. Keep this energy going!",
    5: "5 active days — real dedication. You're building something special.",
    4: "4 days puts you ahead of 90% of people. Keep pushing!",
    3: "3 days is a great foundation. Can we hit 4 next week?",
    2: "You showed up twice — every session builds the habit!",
    1: "One session is better than zero. See you tomorrow?",
    0: "New week, fresh start. Let's make this week count! 🚀",
  };
  return msgs[Math.min(days, 6)] || msgs[0];
}
