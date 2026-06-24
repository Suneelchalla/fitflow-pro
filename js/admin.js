// LOCAL date helper (replaces UTC-based toISOString().split('T')[0])
function _ymdLocal(d) {
  if (!d || isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════════

const AdminEdit = {
  isDirty:  false,
  module:   null,
  section:  null,
};

// ── RENDER ADMIN PANEL ────────────────────────────────────────────
function renderAdminPanel() {
  if (APP.currentUser?.role !== 'ADMIN') { showToast('Access denied', 'error'); return; }
  const nameEl = document.getElementById('admin-user-name');
  if (nameEl) nameEl.textContent = '👑 ' + (APP.currentUser.name || 'Admin');
  renderAdminStats();
  refreshFeedbackBadge();
  // Default to Dashboard tab
  const dashBtn = document.querySelector('.admin-nav-btn[data-tab="dashboard"]');
  if (dashBtn) switchAdminTab('dashboard', dashBtn);
}

// ════════════════════════════════════════════════════════════════
// ADMIN DRILL-DOWN SYSTEM
// Every stat / KPI / chart bar / module bar is clickable and opens
// modal-admin-insight with the underlying records. Resolves userIds
// to names so admin sees WHO did WHAT, not just totals.
// ════════════════════════════════════════════════════════════════

// Build a fast userId → display name lookup from the latest fetched users.
// Falls back to the userId itself when no user record exists (e.g. logs from
// deleted users). Cached on demand — call _rebuildUserMap() after fetching.
let _adminUserMap = null;
function _rebuildUserMap() {
  _adminUserMap = {};
  const users = _adminDashboardData?.users || [];
  users.forEach(u => {
    if (u.id) _adminUserMap[u.id] = u.name || u.email || u.id;
  });
}
function _adminUserName(userId, fallbackName, fallbackEmail) {
  if (!_adminUserMap) _rebuildUserMap();
  return _adminUserMap[userId] || fallbackName || fallbackEmail || userId || '—';
}

// Generic drill-down opener. `bodyHtml` is the full inner HTML; usually a
// table built by one of the _drill* functions below.
function _showAdminInsight(emoji, title, subtitle, bodyHtml) {
  const eEl = document.getElementById('admin-insight-emoji');
  const tEl = document.getElementById('admin-insight-title');
  const sEl = document.getElementById('admin-insight-subtitle');
  const bEl = document.getElementById('admin-insight-body');
  if (eEl) eEl.textContent = emoji || '📊';
  if (tEl) tEl.textContent = title || 'Insight';
  if (sEl) sEl.innerHTML   = subtitle || '';
  if (bEl) bEl.innerHTML   = bodyHtml || '<div style="text-align:center;color:var(--text3);padding:24px">No data.</div>';
  openModal('modal-admin-insight');
}

// Shared row + table styles used by every drill-down. The user-name cell
// links to the existing openUserProgress() so admin can dive deeper from
// any row with one tap.
function _drillRow(cells, opts) {
  const userId = opts?.userId;
  const click  = userId ? `onclick="closeModal('modal-admin-insight');openUserProgress('${userId}', ${JSON.stringify(opts.userName||'').replace(/"/g,'&quot;')})"` : '';
  const cursor = userId ? 'cursor:pointer' : '';
  return `<div ${click} style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);${cursor};transition:background .12s"
    ${userId ? `onmouseover="this.style.background='rgba(67,160,90,0.07)'" onmouseout="this.style.background=''"` : ''}>
    ${cells.map(c => `<div style="${c.style||'flex:1;font-size:13px;color:var(--text2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'}">${c.html||c}</div>`).join('')}
  </div>`;
}
function _drillEmpty(msg) {
  return `<div style="text-align:center;color:var(--text3);padding:32px 16px;font-size:13.5px">${msg || 'No records.'}</div>`;
}
function _drillHeader(cells) {
  return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
    background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border);
    font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">
    ${cells.map(c => `<div style="${c.style||'flex:1'}">${c.label||c}</div>`).join('')}
  </div>`;
}

// Build a workout-row list from logs (sorted newest first).
function _drillWorkoutList(logs) {
  if (!logs.length) return _drillEmpty('No workout sessions found.');
  const sorted = [...logs].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const header = _drillHeader([
    { label: 'Date',   style: 'width:88px;flex:none' },
    { label: 'User',   style: 'flex:1.4' },
    { label: 'Module', style: 'flex:1' },
    { label: 'Day',    style: 'width:50px;flex:none;text-align:right' },
  ]);
  const rows = sorted.map(l => {
    const name   = _adminUserName(l.userId, l.name, l.email);
    const modKey = l.module?.startsWith('custom_') ? 'custom' : l.module;
    return _drillRow([
      { html: l.date || '—',                       style: 'width:88px;flex:none;font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums' },
      { html: `<strong style="color:var(--text)">${name}</strong>`, style: 'flex:1.4;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
      { html: `${getModuleEmoji(modKey)} ${getModuleName(modKey)}`, style: 'flex:1;font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
      { html: l.day || '—',                        style: 'width:50px;flex:none;text-align:right;font-size:12px;color:var(--text3)' },
    ], { userId: l.userId, userName: name });
  }).join('');
  return header + rows;
}

// Build a run-row list from run logs (sorted newest first).
function _drillRunList(runs) {
  if (!runs.length) return _drillEmpty('No runs found.');
  const sorted = [...runs].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const header = _drillHeader([
    { label: 'Date',     style: 'width:88px;flex:none' },
    { label: 'User',     style: 'flex:1.3' },
    { label: 'Distance', style: 'width:72px;flex:none;text-align:right' },
    { label: 'Time',     style: 'width:66px;flex:none;text-align:right' },
  ]);
  const rows = sorted.map(r => {
    const name = _adminUserName(r.userId, r.name, r.email);
    const km   = (r.distance || 0).toFixed(2);
    const dur  = r.duration ? fmtTime(r.duration) : '—';
    return _drillRow([
      { html: r.date || '—',                                style: 'width:88px;flex:none;font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums' },
      { html: `<strong style="color:var(--text)">${name}</strong>`, style: 'flex:1.3;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
      { html: `<span style="color:var(--g5);font-weight:600">${km}</span><span style="color:var(--text3);font-size:11px"> km</span>`, style: 'width:72px;flex:none;text-align:right;font-size:13px;font-variant-numeric:tabular-nums' },
      { html: dur,                                          style: 'width:66px;flex:none;text-align:right;font-size:12.5px;color:var(--text2);font-variant-numeric:tabular-nums' },
    ], { userId: r.userId, userName: name });
  }).join('');
  return header + rows;
}

// Build a user-row list (used by Users and Active-7d drills).
function _drillUserList(users, logs, runs) {
  if (!users.length) return _drillEmpty('No users found.');
  // Pre-compute sessions per user from logs + runs
  const counts = {};
  const lastDate = {};
  (logs || []).forEach(l => {
    counts[l.userId] = (counts[l.userId] || 0) + 1;
    if (!lastDate[l.userId] || (l.date||'') > lastDate[l.userId]) lastDate[l.userId] = l.date || '';
  });
  (runs || []).forEach(r => {
    counts[r.userId] = (counts[r.userId] || 0) + 1;
    if (!lastDate[r.userId] || (r.date||'') > lastDate[r.userId]) lastDate[r.userId] = r.date || '';
  });
  const sorted = [...users].sort((a,b) => (counts[b.id]||0) - (counts[a.id]||0));
  const header = _drillHeader([
    { label: 'User',        style: 'flex:1.4' },
    { label: 'Last Active', style: 'width:96px;flex:none' },
    { label: 'Sessions',    style: 'width:70px;flex:none;text-align:right' },
  ]);
  const rows = sorted.map(u => {
    const name = u.name || u.email || u.id;
    const last = lastDate[u.id] || '—';
    const cnt  = counts[u.id] || 0;
    return _drillRow([
      { html: `<strong style="color:var(--text)">${name}</strong><div style="font-size:11px;color:var(--text3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.email||''}</div>`, style: 'flex:1.4;min-width:0' },
      { html: last,                                                   style: 'width:96px;flex:none;font-size:12px;color:var(--text2);font-variant-numeric:tabular-nums' },
      { html: `<span style="color:var(--g5);font-weight:700">${cnt}</span>`, style: 'width:70px;flex:none;text-align:right;font-size:14px' },
    ], { userId: u.id, userName: name });
  }).join('');
  return header + rows;
}

// ── DRILL: top status bar (5 cards) ──
function _drillTopStat(key) {
  const data = _adminDashboardData;
  if (!data) { showToast('Loading…', 'info'); return; }
  _rebuildUserMap();
  const allLogs = data.allLogs || [];
  const allRuns = data.allRuns || [];
  const users   = (data.users || []).filter(u => u.role !== 'ADMIN');
  const today   = todayStr();

  if (key === 'users') {
    _showAdminInsight('👥', 'All Users', `${users.length} total · click a row to see their progress`,
      _drillUserList(users, allLogs, allRuns));
  } else if (key === 'today') {
    const todayLogs = allLogs.filter(l => l.date === today);
    const todayRuns = allRuns.filter(r => r.date === today);
    const activeIds = [...new Set([...todayLogs.map(l=>l.userId), ...todayRuns.map(r=>r.userId)])];
    const activeUsers = users.filter(u => activeIds.includes(u.id));
    _showAdminInsight('📍', 'Active Today', `${activeUsers.length} users active · ${todayLogs.length + todayRuns.length} sessions today`,
      _drillUserList(activeUsers, todayLogs, todayRuns));
  } else if (key === 'workouts') {
    const stdLogs = allLogs.filter(l => !l.module?.startsWith('custom_'));
    _showAdminInsight('💪', 'All Workouts', `${stdLogs.length} sessions logged across all users`,
      _drillWorkoutList(stdLogs));
  } else if (key === 'runs') {
    _showAdminInsight('🏃', 'All Runs', `${allRuns.length} runs · ${allRuns.reduce((a,r)=>a+(r.distance||0),0).toFixed(1)} km total`,
      _drillRunList(allRuns));
  } else if (key === 'custom') {
    const cwLogs = allLogs.filter(l => l.module?.startsWith('custom_'));
    _showAdminInsight('🎯', 'Custom Workout Sessions', `${cwLogs.length} custom-workout completions`,
      _drillWorkoutList(cwLogs));
  }
}

// ── DRILL: Analytics KPI cards (4) ──
function _drillAnalyticsKpi(key) {
  const data = _adminDashboardData;
  if (!data) { showToast('Loading…', 'info'); return; }
  _rebuildUserMap();
  const allLogs = data.allLogs || [];
  const allRuns = data.allRuns || [];
  const users   = (data.users || []).filter(u => u.role !== 'ADMIN');
  const today   = todayStr();
  const monday  = getMonday();

  if (key === 'thisWeek') {
    const wkLogs = allLogs.filter(l => l.date >= monday);
    _showAdminInsight('📅', 'Sessions This Week', `${wkLogs.length} sessions since Monday (${monday})`,
      _drillWorkoutList(wkLogs));
  } else if (key === 'runsThisWeek') {
    const wkRuns = allRuns.filter(r => r.date >= monday);
    const km = wkRuns.reduce((a,r)=>a+(r.distance||0),0).toFixed(1);
    _showAdminInsight('🏃', 'Runs This Week', `${wkRuns.length} runs · ${km} km · since Monday (${monday})`,
      _drillRunList(wkRuns));
  } else if (key === 'active7') {
    const last7 = (() => { const d=new Date(); d.setDate(d.getDate()-7); return _ymdLocal(d); })();
    const activeIds = new Set();
    allLogs.forEach(l => { if ((l.date||'') >= last7) activeIds.add(l.userId); });
    allRuns.forEach(r => { if ((r.date||'') >= last7) activeIds.add(r.userId); });
    const active = users.filter(u => activeIds.has(u.id));
    _showAdminInsight('👥', 'Active in Last 7 Days', `${active.length} users had at least one activity since ${last7}`,
      _drillUserList(active, allLogs.filter(l=>l.date>=last7), allRuns.filter(r=>r.date>=last7)));
  } else if (key === 'today') {
    const tdLogs = allLogs.filter(l => l.date === today);
    const tdRuns = allRuns.filter(r => r.date === today);
    const combined = [..._drillWorkoutList(tdLogs)];
    let body;
    if (!tdLogs.length && !tdRuns.length) {
      body = _drillEmpty('No sessions logged today yet.');
    } else if (!tdRuns.length) {
      body = _drillWorkoutList(tdLogs);
    } else if (!tdLogs.length) {
      body = _drillRunList(tdRuns);
    } else {
      body = `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:4px 12px 6px">Workouts (${tdLogs.length})</div>${_drillWorkoutList(tdLogs)}
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:14px 12px 6px">Runs (${tdRuns.length})</div>${_drillRunList(tdRuns)}`;
    }
    _showAdminInsight('📍', 'Sessions Today', `${tdLogs.length + tdRuns.length} sessions logged today (${today})`, body);
  }
}

// ── DRILL: a single day in the 14-day activity chart ──
function _drillActivityDay(dateStr) {
  const data = _adminDashboardData;
  if (!data) { showToast('Loading…', 'info'); return; }
  _rebuildUserMap();
  const dayLogs = (data.allLogs || []).filter(l => l.date === dateStr);
  const dayRuns = (data.allRuns || []).filter(r => r.date === dateStr);
  const total = dayLogs.length + dayRuns.length;
  let body;
  if (!total) {
    body = _drillEmpty('No sessions on this day.');
  } else if (!dayRuns.length) {
    body = _drillWorkoutList(dayLogs);
  } else if (!dayLogs.length) {
    body = _drillRunList(dayRuns);
  } else {
    body = `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:4px 12px 6px">Workouts (${dayLogs.length})</div>${_drillWorkoutList(dayLogs)}
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:14px 12px 6px">Runs (${dayRuns.length})</div>${_drillRunList(dayRuns)}`;
  }
  _showAdminInsight('📈', dateStr, `${total} session${total===1?'':'s'} logged on ${dateStr}`, body);
}

// ── DRILL: a single module's full session list ──
function _drillModulePopularity(modKey) {
  const data = _adminDashboardData;
  if (!data) { showToast('Loading…', 'info'); return; }
  _rebuildUserMap();
  // 'custom' meta-key matches every log starting with custom_
  const matches = (data.allLogs || []).filter(l => {
    if (modKey === 'custom') return l.module?.startsWith('custom_');
    return l.module === modKey;
  });
  _showAdminInsight(getModuleEmoji(modKey), getModuleName(modKey),
    `${matches.length} session${matches.length===1?'':'s'} logged · click a row to see that user`,
    _drillWorkoutList(matches));
}

function renderAdminStats() {
  // Use cached dashboard data (from Sheets) when available — falls back to localStorage
  // This prevents the header always showing 0 for admin who has no personal logs
  const data       = _adminDashboardData;
  const allLogs    = data?.allLogs    || Store.getLogs();
  const allRunLogs = data?.allRuns    || Store.getRunLogs();
  const today      = todayStr();
  const todayActive = [...new Set(allLogs.filter(l => l.date === today).map(l => l.userId))].length;
  const stdLogs    = allLogs.filter(l => !l.module.startsWith('custom_'));
  const cwLogs     = allLogs.filter(l =>  l.module.startsWith('custom_'));
  const el = id => document.getElementById(id);
  if (el('admin-stat-workouts')) el('admin-stat-workouts').textContent = stdLogs.length;
  if (el('admin-stat-runs'))     el('admin-stat-runs').textContent     = allRunLogs.length;
  if (el('admin-stat-today'))    el('admin-stat-today').textContent    = todayActive;
  if (el('admin-stat-custom'))   el('admin-stat-custom').textContent   = cwLogs.length;
}

// ── ADMIN TABS ────────────────────────────────────────────────────
function switchAdminTab(tab, btn) {
  // Support both new sidebar nav (.admin-nav-btn) and legacy tab buttons (.admin-tab-btn)
  document.querySelectorAll('.admin-tab-btn, .admin-nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
  const tabEl = document.getElementById('admin-tab-' + tab);
  if (tabEl) tabEl.style.display = 'block';
  if (tab === 'dashboard') renderAdminDashboard();
  if (tab === 'users')     loadAdminUsers();
  if (tab === 'analytics') renderAdminAnalytics();
  if (tab === 'history')   renderAllHistory();
  if (tab === 'custom')    renderAdminCustomWorkouts();
  if (tab === 'feedback')  renderFeedbackList();
  if (tab === 'announce')  renderAdminAnnounce();
  if (tab === 'content')   renderContentHome();
  if (tab === 'notify')    renderAdminNotify();
}

// ════════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════════
async function loadAdminUsers() {
  const container = document.getElementById('admin-users-list');
  const statEl    = document.getElementById('admin-stat-users');
  container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">
    <div class="loader" style="margin:0 auto 12px"></div>Loading users…</div>`;
  if (statEl) statEl.textContent = '…';

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) {
    container.innerHTML = `<div class="card" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.25);text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:10px">⚠️</div>
      <div style="font-weight:700;margin-bottom:6px">Google Sheets Not Configured</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Configure Sheets URL to manage users.</div>
      <button class="btn btn-primary" onclick="openSheetsConfig()">⚙️ Configure Now</button></div>`;
    if (statEl) statEl.textContent = '—';
    return;
  }

  // Refresh theme toggle button on admin page load
  if (typeof refreshAdminThemeToggle === 'function') refreshAdminThemeToggle();
  const res = await Sheets.get('getAllUsers');
  if (!res?.success) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>
      <p>Failed to load users.<br>${res?.error || 'Check your Sheets URL.'}</p></div>`;
    return;
  }

  // Also ensure log data is available so workout counts show in user rows.
  // If _adminDashboardData is null (Users tab opened before Dashboard tab),
  // fetch logs now so _userLogsCount() / _userLastActivity() have real data.
  if (!_adminDashboardData) {
    try {
      const [logsRes, runsRes] = await Promise.all([
        Sheets.get('getAllLogs').catch(() => null),
        Sheets.get('getAllRunLogs').catch(() => null),
      ]);
      _adminDashboardData = {
        users:     res.users || [],
        allLogs:   (logsRes?.success && logsRes.logs?.length)  ? logsRes.logs  : Store.getLogs(),
        allRuns:   (runsRes?.success  && runsRes.logs?.length)  ? runsRes.logs  : Store.getRunLogs(),
        fetchedAt: new Date(),
      };
      _rebuildUserMap();   // ensure drill-downs can resolve userId → name immediately
      // Update header KPI cards with real data now that we have it
      renderAdminStats();
    } catch(e) {
      console.warn('[Admin] Could not pre-fetch logs for user list:', e.message);
    }
  }

  const users = res.users || [];
  if (statEl) statEl.textContent = users.filter(u => u.role !== 'ADMIN').length;
  renderUsersList(users);
}

// Cache the latest fetched users so filter can re-render without re-fetching
let _cachedAdminUsers = [];

function renderUsersList(users) {
  _cachedAdminUsers = users || [];
  const container = document.getElementById('admin-users-list');
  if (!container) {
    console.warn('[FitFlow] admin-users-list container not found');
    return;
  }
  console.log('[FitFlow] Rendering ' + _cachedAdminUsers.length + ' users with search bar');
  // Render search bar + filter chips + sort dropdown + CSV export + list
  container.innerHTML = `
    <div class="admin-user-controls">
      <div class="admin-controls-row">
        <input id="admin-user-search" type="text" placeholder="🔍 Search by name or email…"
          oninput="_filterAdminUsers()" class="admin-search-input">
        <div class="admin-controls-actions">
          <select id="admin-user-sort" class="admin-sort-select" onchange="_setAdminUserSort(this.value)">
            <option value="name-asc">Name (A→Z)</option>
            <option value="name-desc">Name (Z→A)</option>
            <option value="created-desc" selected>Newest signup</option>
            <option value="created-asc">Oldest signup</option>
            <option value="active-desc">Most active</option>
            <option value="active-asc">Least active</option>
            <option value="last-desc">Recently active</option>
            <option value="last-asc">Inactive longest</option>
          </select>
          <button class="admin-pill-btn" onclick="_exportUsersCSV()" title="Export users to CSV">📥 CSV</button>
        </div>
      </div>
      <div class="admin-filter-chips">
        <button class="admin-chip active" data-filter="all"      onclick="_setAdminUserFilter('all',this)">All</button>
        <button class="admin-chip"        data-filter="active"   onclick="_setAdminUserFilter('active',this)">Active</button>
        <button class="admin-chip"        data-filter="inactive" onclick="_setAdminUserFilter('inactive',this)">Inactive</button>
        <button class="admin-chip"        data-filter="first"    onclick="_setAdminUserFilter('first',this)">Awaiting login</button>
        <button class="admin-chip"        data-filter="google"   onclick="_setAdminUserFilter('google',this)">Google</button>
      </div>
    </div>
    <div id="admin-users-rows"></div>`;
  _renderAdminUsersFiltered();
}

// Sort state
let _adminUserSort = 'created-desc';

function _setAdminUserSort(sortKey) {
  _adminUserSort = sortKey;
  _renderAdminUsersFiltered();
}

// Helper: get logs count for a user (cached for the session)
function _userLogsCount(userId) {
  const logs = (_adminDashboardData?.allLogs) || Store.getLogs() || [];
  return logs.filter(l => l.userId === userId).length;
}

function _userLastActivity(userId) {
  const logs = (_adminDashboardData?.allLogs) || Store.getLogs() || [];
  const userLogs = logs.filter(l => l.userId === userId);
  if (!userLogs.length) return '';
  return userLogs.map(l => l.date || '').sort().reverse()[0];
}

// Apply sort to users array
function _sortUsers(users) {
  const sorted = [...users];
  sorted.sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aCreated = a.createdDate || '';
    const bCreated = b.createdDate || '';
    const aCount = _userLogsCount(a.id);
    const bCount = _userLogsCount(b.id);
    const aLast = _userLastActivity(a.id);
    const bLast = _userLastActivity(b.id);
    switch (_adminUserSort) {
      case 'name-asc':     return aName.localeCompare(bName);
      case 'name-desc':    return bName.localeCompare(aName);
      case 'created-desc': return bCreated.localeCompare(aCreated);
      case 'created-asc':  return aCreated.localeCompare(bCreated);
      case 'active-desc':  return bCount - aCount;
      case 'active-asc':   return aCount - bCount;
      case 'last-desc':    return bLast.localeCompare(aLast);
      case 'last-asc':     return aLast.localeCompare(bLast);
      default: return 0;
    }
  });
  return sorted;
}

// CSV export
function _exportUsersCSV() {
  if (!_cachedAdminUsers || !_cachedAdminUsers.length) {
    showToast('No users to export', 'info');
    return;
  }
  const rows = [
    ['Name', 'Email', 'Role', 'Status', 'CreatedDate', 'CreatedBy', 'LastLogin', 'Workouts', 'LastActivity', 'IsGoogle']
  ];
  _cachedAdminUsers.forEach(u => {
    const isGoogleUser = (u.id||'').startsWith('u_g_') || (u.createdBy||'').toLowerCase() === 'google';
    rows.push([
      u.name || '',
      u.email || '',
      (u.role || 'USER').toUpperCase(),
      (u.status || 'ACTIVE').toUpperCase(),
      u.createdDate || '',
      u.createdBy || '',
      u.lastLogin || '',
      _userLogsCount(u.id),
      _userLastActivity(u.id),
      isGoogleUser ? 'YES' : 'NO',
    ]);
  });
  _downloadCSV('fitflow-users-' + todayStr() + '.csv', rows);
  showToast('CSV downloaded ✓', 'success');
}

// Generic CSV downloader (reusable for any data array)
function _downloadCSV(filename, rows) {
  const escape = (val) => {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let _adminUserFilter = 'all';

function _setAdminUserFilter(f, btn) {
  _adminUserFilter = f;
  document.querySelectorAll('.admin-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderAdminUsersFiltered();
}

function _filterAdminUsers() {
  _renderAdminUsersFiltered();
}

function _renderAdminUsersFiltered() {
  const rows = document.getElementById('admin-users-rows');
  if (!rows) return;
  const q = (document.getElementById('admin-user-search')?.value || '').trim().toLowerCase();
  const logs = Store.getLogs();

  const matches = _cachedAdminUsers.filter(u => {
    const role     = (u.role   || 'USER').toUpperCase().trim();
    const status   = (u.status || 'ACTIVE').toUpperCase().trim();
    const isFirst  = u.isFirstLogin === true || String(u.isFirstLogin).toUpperCase() === 'TRUE';
    const isGoogleUser = (u.id||'').startsWith('u_g_') || (u.createdBy||'').toLowerCase() === 'google';
    // Filter chip
    if (_adminUserFilter === 'active'   && status !== 'ACTIVE')   return false;
    if (_adminUserFilter === 'inactive' && status !== 'INACTIVE') return false;
    if (_adminUserFilter === 'first'    && !isFirst)              return false;
    if (_adminUserFilter === 'google'   && !isGoogleUser)         return false;
    // Search
    if (q) {
      const haystack = (u.name || '').toLowerCase() + ' ' + (u.email || '').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (!matches.length) {
    rows.innerHTML = `<div class="empty-state" style="padding:32px"><div class="empty-icon">🔍</div>
      <p>No users match this filter.</p></div>`;
    return;
  }

  // Apply current sort
  const sortedMatches = _sortUsers(matches);
  // Use sortedMatches for rendering below
  matches.length = 0;
  matches.push(...sortedMatches);

  rows.innerHTML = `<div class="admin-user-count">${matches.length} ${matches.length === 1 ? 'user' : 'users'}</div>` + matches.map(u => {
    const role     = (u.role   || 'USER').toUpperCase().trim();
    const status   = (u.status || 'ACTIVE').toUpperCase().trim();
    const isAdmin      = role   === 'ADMIN';
    const isActive     = status === 'ACTIVE';
    const isFirst      = u.isFirstLogin === true || String(u.isFirstLogin).toUpperCase() === 'TRUE';
    const isGoogleUser = (u.id||'').startsWith('u_g_') || (u.createdBy||'').toLowerCase() === 'google';
    const userLogs = logs.filter(l => l.userId === u.id);
    const lastLog  = userLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const safeId   = (u.id || '').toString().replace(/'/g, "\\'");
    return `
      <div class="user-row" style="margin-bottom:8px" id="user-row-${safeId}">
        <div class="user-avatar">${(u.name || '?').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name" style="display:flex;align-items:center;gap:6px">
            ${u.name || '—'}${isAdmin ? ' 👑' : ''}
            ${isGoogleUser ? (
              u.hasAppPassword
                ? '<span style="font-size:10px;background:rgba(66,133,244,0.15);color:#90caf9;border:1px solid rgba(66,133,244,0.3);border-radius:50px;padding:1px 8px;font-weight:600" title="Google + App password set">G Google ✓</span>'
                : '<span style="font-size:10px;background:rgba(66,133,244,0.15);color:#90caf9;border:1px solid rgba(66,133,244,0.3);border-radius:50px;padding:1px 8px;font-weight:600" title="Google only — no app password">G Google</span>'
            ) : ''}
          </div>
          <div class="user-email">${u.email || '—'}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${isFirst ? '<span style="color:var(--accent)">🔑 Awaiting first login</span>'
                      : `Last: ${lastLog?.date || u.lastLogin || 'Never'}`}
            · ${userLogs.length} workouts · Created: ${u.createdDate || '—'}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span class="badge ${isActive ? 'badge-green' : 'badge-red'}" id="status-badge-${safeId}">${status}</span>
          ${!isAdmin
            ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                <span style="font-size:11px;color:var(--text3)">${isActive ? 'Active' : 'Inactive'}</span>
                <div id="toggle-btn-${safeId}"
                  onclick="toggleStatus('${safeId}','${isActive ? 'INACTIVE' : 'ACTIVE'}','${safeId}')"
                  style="width:44px;height:24px;border-radius:12px;cursor:pointer;position:relative;
                    background:${isActive ? 'var(--g4)' : 'rgba(255,255,255,0.15)'};
                    transition:background 0.2s;flex-shrink:0">
                  <div style="position:absolute;top:3px;left:${isActive ? '23px' : '3px'};
                    width:18px;height:18px;border-radius:50%;background:white;
                    transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" style="color:var(--accent)"
                onclick="openAdminResetPassword('${safeId}','${(u.name||'').replace(/'/g,"\\'")}',${isGoogleUser})">
                🔑 Reset Pass
              </button>
              <button class="btn btn-ghost btn-sm" style="color:#64b5f6"
                onclick="openUserProgress('${safeId}','${(u.name||'').replace(/'/g,"\\'")}')">
                📊 Progress
              </button>`
            : '<span style="font-size:11px;color:var(--text3)">Admin</span>'}
        </div>
      </div>`;
  }).join('');
}

async function toggleStatus(userId, newStatus, safeId) {
  const toggle = document.getElementById('toggle-btn-' + safeId);
  const badge  = document.getElementById('status-badge-' + safeId);
  if (toggle) toggle.style.opacity = '0.5';

  const res = await Sheets.post('updateUserStatus', { userId, status: newStatus });
  if (res?.success) {
    const active = newStatus === 'ACTIVE';
    if (badge) { badge.textContent = newStatus; badge.className = 'badge ' + (active ? 'badge-green' : 'badge-red'); }
    if (toggle) {
      toggle.style.opacity = '1';
      toggle.style.background = active ? 'var(--g4)' : 'rgba(255,255,255,0.15)';
      const knob = toggle.querySelector('div');
      if (knob) knob.style.left = active ? '23px' : '3px';
      const label = toggle.previousElementSibling;
      if (label) label.textContent = active ? 'Active' : 'Inactive';
      toggle.setAttribute('onclick', "toggleStatus('" + userId + "','" + (active ? 'INACTIVE' : 'ACTIVE') + "','" + safeId + "')");
    }
    showToast('User ' + (active ? 'enabled ✅' : 'disabled 🚫') + '.', 'success');
  } else {
    if (toggle) toggle.style.opacity = '1';
    if (badge)  { badge.textContent = newStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'; }
    showToast(res?.error || 'Failed to update status.', 'error');
  }
}

// ── ADMIN RESET USER PASSWORD ─────────────────────────────────────
function openAdminResetPassword(userId, userName, isGoogle) {
  document.getElementById('arp-user-name').textContent  = userName || 'User';
  document.getElementById('arp-error').textContent      = '';
  document.getElementById('arp-new-pass').value         = '';
  document.getElementById('arp-confirm-pass').value     = '';
  const forceChangeEl = document.getElementById('arp-force-change');
  if (forceChangeEl) forceChangeEl.checked = true;
  document.getElementById('arp-submit-btn').dataset.userId = userId;

  // Google user: show warning banner + update description
  const googleWarn = document.getElementById('arp-google-warning');
  if (googleWarn) googleWarn.style.display = isGoogle ? '' : 'none';
  const arpDesc = document.getElementById('arp-description');
  if (arpDesc) {
    arpDesc.textContent = isGoogle
      ? 'This user signed in with Google and has no app password. Setting a temp password enables email login as a backup. Their Google account is not affected.'
      : 'Set a temporary password. The user will be prompted to change it on next login.';
    arpDesc.style.color = isGoogle ? '#90caf9' : 'var(--text2)';
  }

  openModal('modal-admin-reset-password');
}

async function submitAdminResetPassword() {
  const newPass     = document.getElementById('arp-new-pass').value.trim();
  const confirmPass = document.getElementById('arp-confirm-pass').value.trim();
  const errEl       = document.getElementById('arp-error');
  const btn         = document.getElementById('arp-submit-btn');
  const userId      = btn.dataset.userId;
  // If "force change on login" is checked, set as tempPassword so user must change it
  const forceChangeEl = document.getElementById('arp-force-change');
  const forceChange   = forceChangeEl ? forceChangeEl.checked : false;

  errEl.textContent = '';
  if (!newPass)               { errEl.textContent = 'Please enter a new password.'; return; }
  if (newPass.length < 6)     { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (newPass !== confirmPass) { errEl.textContent = 'Passwords do not match.'; return; }

  btn.disabled = true; btn.textContent = 'Saving…';

  let res;
  if (forceChange) {
    // Set as temp password — user sees "set your own password" prompt on next login
    res = await Sheets.post('setTempPassword', { userId, tempPassword: newPass });
  } else {
    // Set as permanent password directly
    res = await Sheets.post('changePassword', { userId, newPassword: newPass });
  }

  btn.disabled = false; btn.textContent = 'Reset Password';

  if (!res?.success) {
    errEl.textContent = res?.error || 'Failed to reset password. Try again.';
    return;
  }

  closeModal('modal-admin-reset-password');
  showToast(
    forceChange
      ? 'Temp password set! User will be prompted to change it on login. 🔑'
      : 'Password reset successfully! 🔑',
    'success'
  );
}

function openAddUser() {
  ['new-user-name','new-user-email','new-user-pass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('new-user-role').value           = 'USER';
  document.getElementById('new-user-error').textContent    = '';
  openModal('modal-add-user');
}

async function saveNewUser() {
  const name    = document.getElementById('new-user-name').value.trim();
  const email   = document.getElementById('new-user-email').value.trim().toLowerCase();
  const tmpPass = document.getElementById('new-user-pass').value.trim();
  const role    = document.getElementById('new-user-role').value;
  const errEl   = document.getElementById('new-user-error');
  const btn     = document.getElementById('save-user-btn');

  errEl.textContent = '';
  if (!name || !email || !tmpPass) { errEl.textContent = 'All fields are required.'; return; }
  if (tmpPass.length < 4)          { errEl.textContent = 'Temp password must be at least 4 characters.'; return; }
  if (!Store.getSheetsConfig().webAppUrl) { errEl.textContent = 'Configure Google Sheets first (Content → Configure Sheets).'; return; }

  btn.disabled    = true;
  btn.textContent = 'Creating…';
  const res = await Sheets.post('createUser', { name, email, tempPassword: tmpPass, role, createdBy: APP.currentUser?.name || 'Admin' });
  btn.disabled    = false;
  btn.textContent = 'Create User';

  if (!res?.success) { errEl.textContent = res?.error || 'Failed to create user.'; return; }
  closeModal('modal-add-user');
  showToast(`✅ "${name}" created! Temp password: ${tmpPass}`, 'success');
  loadAdminUsers();
  renderAdminStats();
}

// ════════════════════════════════════════════════════════════════
// CONTENT HOME
// ════════════════════════════════════════════════════════════════
function renderContentHome() {
  const container = document.getElementById('content-links-list');
  const connected = !!Store.getSheetsConfig().webAppUrl;
  const modules   = [
    { id: 'cardio',        name: 'Home Cardio',     emoji: '🏠',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'gym',           name: 'Gym Workouts',    emoji: '🏋️',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'yoga',          name: 'Yoga',            emoji: '🧘',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'stretching',    name: 'Stretching',      emoji: '🤸',    hasSections: ['exercises','hydration','diet'] },
    { id: 'running',       name: 'Running',         emoji: '🏃',    hasSections: ['warmup','cooldown','hydration','diet'] },
    { id: 'calisthenics',  name: 'Calisthenics',    emoji: '🤸‍♂️', hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'crosstraining', name: 'Cross Training',  emoji: '💪',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'core',          name: 'Core & Abs',      emoji: '🔥',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
  ];

  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
      <div style="font-weight:700;margin-bottom:4px">🔗 Google Sheets Backend</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
        ${connected
          ? '<span style="color:var(--g5)">✅ Connected — all edits sync to Sheets & all users</span>'
          : '<span style="color:var(--accent)">⚠️ Not configured — edits saved locally only</span>'}
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSheetsConfig()">⚙️ Configure Sheets URL</button>
    </div>

    <div class="card card-sm" style="margin-bottom:8px;cursor:pointer" onclick="openAdminQuotes()">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">💬</span>
        <div><div style="font-weight:700">Motivational Quotes</div>
          <div style="font-size:12px;color:var(--text3)">Edit quotes shown on user daily screen</div></div>
        <span style="margin-left:auto;color:var(--text3)">›</span>
      </div>
    </div>

    <div class="section-title" style="margin-top:16px">Module Content Editor</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
      Tap a module to edit exercises, warmup, cooldown, hydration and diet.
      All fields are editable inline — tap any field to edit.
    </div>
    ${modules.map(m => `
      <div class="card card-sm" style="margin-bottom:8px;cursor:pointer" onclick="openModuleEditor('${m.id}')">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">${m.emoji}</span>
          <div><div style="font-weight:700">${m.name}</div>
            <div style="font-size:12px;color:var(--text3)">Exercises · Warmup · Cooldown · Hydration · Diet</div></div>
          <span style="margin-left:auto;color:var(--text3)">›</span>
        </div>
      </div>`).join('')}`;
}

// ════════════════════════════════════════════════════════════════
// MODULE EDITOR
// ════════════════════════════════════════════════════════════════
function openModuleEditor(moduleId) {
  AdminEdit.module  = moduleId;
  AdminEdit.section = 'exercises';
  AdminEdit.isDirty = false;

  // Always clear stale localStorage cache for this module so APP_DATA shows fresh
  Store.remove('ff_content_exercises_' + moduleId);
  Store.remove('ff_content_warmup_'    + moduleId);
  Store.remove('ff_content_cooldown_'  + moduleId);

  showPage('page-admin-editor');
  renderModuleEditor();
}

function renderModuleEditor() {
  const info = {
    cardio:        { name: 'Home Cardio',    emoji: '🏠' },
    gym:           { name: 'Gym Workouts',   emoji: '🏋️' },
    yoga:          { name: 'Yoga',           emoji: '🧘' },
    stretching:    { name: 'Stretching',     emoji: '🤸' },
    running:       { name: 'Running',        emoji: '🏃' },
    calisthenics:  { name: 'Calisthenics',   emoji: '🤸‍♂️' },
    crosstraining: { name: 'Cross Training', emoji: '💪' },
  }[AdminEdit.module] || { name: AdminEdit.module, emoji: '💪' };

  document.getElementById('editor-module-title').textContent = info.emoji + ' ' + info.name;

  const allSections = [
    { id: 'exercises', label: '💪 Exercises' },
    { id: 'warmup',    label: '🔥 Warm-Up' },
    { id: 'cooldown',  label: '🧘 Cool-Down' },
    { id: 'hydration', label: '💧 Hydration' },
    { id: 'diet',      label: '🥗 Diet' },
    { id: 'plans',     label: '🗓 Plans' },
  ];
  const excludeMap = {
    stretching:    ['warmup','cooldown','plans'],
    running:       ['exercises'],
    cardio:        ['plans'],
    gym:           ['plans'],
    yoga:          ['plans'],
    calisthenics:  ['plans'],
    crosstraining: ['plans'],
  };
  const excluded = excludeMap[AdminEdit.module] || ['plans'];
  const sections = allSections.filter(s => !excluded.includes(s.id));

  document.getElementById('editor-section-tabs').innerHTML = sections.map(s => `
    <button class="tab-btn ${AdminEdit.section === s.id ? 'active' : ''}"
      onclick="switchEditorSection('${s.id}', this)">${s.label}</button>`).join('');

  _resetSaveBtn();
  renderEditorSection();
}

function _resetSaveBtn() {
  const btn = document.getElementById('editor-save-btn');
  if (!btn) return;
  btn.textContent = '💾 Save Changes';
  btn.style.background = 'linear-gradient(135deg,var(--g3),var(--g4))';
  btn.disabled = false;
  btn.onclick = saveEditorChanges;
}

function switchEditorSection(section, btn) {
  if (AdminEdit.isDirty && !confirm('You have unsaved changes. Discard them?')) return;
  AdminEdit.section = section;
  AdminEdit.isDirty = false;
  document.querySelectorAll('#editor-section-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _resetSaveBtn();
  renderEditorSection();
}

function renderEditorSection() {
  const body = document.getElementById('editor-body');
  if (!body) return;
  body.classList.add('admin-edit-mode');
  const { section, module: moduleId } = AdminEdit;
  if (moduleId === 'calisthenics' && section === 'exercises') {
    renderCalisthenicsEditor(body); return;
  }
  if (moduleId === 'crosstraining' && section === 'exercises') {
    renderCrossTrainingEditor(body); return;
  }
  if      (section === 'exercises')  renderExerciseEditor(moduleId, body);
  else if (section === 'warmup')     renderWarmCoolEditor(moduleId, 'warmup', body);
  else if (section === 'cooldown')   renderWarmCoolEditor(moduleId, 'cooldown', body);
  else if (section === 'hydration')  renderHydrationEditor(moduleId, body);
  else if (section === 'diet')       renderDietEditor(moduleId, body);
  else if (section === 'plans')      renderRunningPlansEditor(body);
}

// ── DIRTY FLAG ────────────────────────────────────────────────────
function markDirty() {
  AdminEdit.isDirty = true;
  const btn = document.getElementById('editor-save-btn');
  if (btn) {
    btn.style.background = 'linear-gradient(135deg,var(--accent),#e8a020)';
    btn.textContent      = '💾 Save Changes *';
  }
}

// ── SAVE ──────────────────────────────────────────────────────────
async function saveEditorChanges() {
  const btn = document.getElementById('editor-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    await _collectAndSave();
    if (btn) {
      btn.textContent      = '✅ Saved!';
      btn.style.background = 'linear-gradient(135deg,var(--g3),var(--g4))';
    }
    AdminEdit.isDirty = false;
    showToast('Saved! All users will see changes on next login. ✅', 'success');
    setTimeout(() => { if (btn) btn.textContent = '💾 Save Changes'; }, 3000);
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
    console.error(e);
  }
  if (btn) btn.disabled = false;
}

async function _collectAndSave() {
  const { module: moduleId, section } = AdminEdit;

  if (section === 'exercises') {
    // Yoga: separate save handler
    if (moduleId === 'yoga') { await _collectAndSaveYoga(); return; }

    // ── BODY-PART MODE (stretching) — save under body-part keys ──
    const defaultsRoot = window.APP_DATA_DEFAULT || window.APP_DATA;
    const modDef       = defaultsRoot.modules?.[moduleId];
    if (modDef?.usesBodyParts && Array.isArray(modDef.bodyParts)) {
      const result = {
        days: {},
        usesBodyParts: true,
        bodyParts:     modDef.bodyParts,
      };
      modDef.bodyParts.forEach(part => {
        const dayEl = document.querySelector(`[data-day="${part.id}"]`);
        if (!dayEl) {
          result.days[part.id] = modDef.days?.[part.id] || [];
          return;
        }
        result.days[part.id] = Array.from(dayEl.querySelectorAll('.ex-row')).map(row => ({
          name:   _text(row, 'name'),
          hold:   _text(row, 'hold'),
          rounds: parseInt(_text(row, 'rounds')) || 1,
          desc:   _text(row, 'desc'),
          demo:   _text(row, 'demo'),
          image:  _text(row, 'image'),
        }));
      });
      Store.setContent('exercises_' + moduleId, result);
      if (APP_DATA.modules[moduleId])                            APP_DATA.modules[moduleId].days = result.days;
      if (window.APP_DATA_DEFAULT?.modules?.[moduleId])          window.APP_DATA_DEFAULT.modules[moduleId].days = result.days;
      await Sheets.post('saveContent', { key: 'exercises_' + moduleId, value: result });
      return;
    }

    // ── DAY-OF-WEEK MODE (default — gym, cardio, calisthenics, core) ──
    const days = getWeekDays();
    const gymDayLabels2 = {
      Monday:    'Monday — Chest 🫁',    Tuesday:   'Tuesday — Shoulders 🏋️',
      Wednesday: 'Wednesday — Lats / Back 🦾', Thursday: 'Thursday — Biceps 💪',
      Friday:    'Friday — Triceps 🔱',  Saturday:  'Saturday — Legs / Squats 🦵',
    };
    const result = { days: {} };
    if (moduleId === 'gym') result.dayLabels = gymDayLabels2;
    days.forEach(day => {
      const dayEl = document.querySelector(`[data-day="${day}"]`);
      if (!dayEl) {
        const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
        result.days[day] = _D.modules?.[moduleId]?.days?.[day] || [];
        return;
      }
      result.days[day] = Array.from(dayEl.querySelectorAll('.ex-row')).map(row => {
        const isHoldBased = moduleId === 'stretching';
        if (isHoldBased) {
          const monthVal = _text(row, 'month');
          return {
            name:   _text(row, 'name'),
            hold:   _text(row, 'hold'),
            rounds: parseInt(_text(row, 'rounds')) || 1,
            desc:   _text(row, 'desc'),
            demo:   _text(row, 'demo'),
            image:  _text(row, 'image'),
            ...(monthVal ? { month: monthVal } : {}),
          };
        }
        return {
          name:     _text(row, 'name'),
          sets:     parseInt(_text(row, 'sets')) || 3,
          reps:     _text(row, 'reps'),
          desc:     _text(row, 'desc'),
          demo:     _text(row, 'demo'),
          image:    _text(row, 'image'),
          _section: 'main',
        };
      });
    });
    Store.setContent('exercises_' + moduleId, result);
    if (APP_DATA.modules[moduleId]) APP_DATA.modules[moduleId].days = result.days;
    if (window.APP_DATA_DEFAULT?.modules?.[moduleId]) window.APP_DATA_DEFAULT.modules[moduleId].days = result.days;
    await Sheets.post('saveContent', { key: 'exercises_' + moduleId, value: result });
  }

  else if (section === 'warmup' || section === 'cooldown') {
    const data = Array.from(document.querySelectorAll('.wc-ex-row')).map(row => ({
      name:  _text(row, 'name'),
      sets:  parseInt(_text(row, 'sets')) || 1,
      reps:  _text(row, 'reps'),
      desc:  _text(row, 'desc'),
      image: _text(row, 'image'),
      demo:  _text(row, 'demo'),
      tag:   section,
    }));
    Store.setContent(section + '_' + moduleId, data);
    if (APP_DATA[section + 's']) APP_DATA[section + 's'][moduleId] = data;
    await Sheets.post('saveContent', { key: section + '_' + moduleId, value: data });
  }

  else if (section === 'hydration') {
    const data = {
      title:   _innerText('hydr-title'),
      targets: {
        training: parseFloat(_innerText('hydr-target-train')) || 3.5,
        rest:     parseFloat(_innerText('hydr-target-rest'))  || 2.5,
      },
      schedule: Array.from(document.querySelectorAll('.hydr-slot')).map(el => ({
        time:   _text(el, 'time'),
        label:  _text(el, 'label'),
        amount: parseInt(_text(el, 'amount')) || 0,
      })),
      tips: Array.from(document.querySelectorAll('.hydr-tip')).map(el =>
        (_text(el, 'tip') || '').replace(/^💧\s*/, '').trim()
      ).filter(Boolean),
    };
    Store.setContent('hydration_' + moduleId, data);
    await Sheets.post('saveContent', { key: 'hydration_' + moduleId, value: data });
  }

  else if (section === 'diet') {
    const data = {
      title: _innerText('diet-title'),
      meals: Array.from(document.querySelectorAll('.diet-meal')).map(el => ({
        time:  _text(el, 'time'),
        name:  _text(el, 'name'),
        items: _text(el, 'items'),
        cal:   parseInt(_text(el, 'cal'))   || 0,
        notes: _text(el, 'notes'),
      })),
    };
    Store.setContent('diet_' + moduleId, data);
    await Sheets.post('saveContent', { key: 'diet_' + moduleId, value: data });
  }
}

function _text(el, field)   { return (el.querySelector(`[data-field="${field}"]`)?.innerText || '').trim(); }
function _innerText(id)     { return (document.getElementById(id)?.innerText || '').trim(); }
// ── YOGA PROGRESSIVE EDITOR ───────────────────────────────────────
function renderYogaProgressiveEditor(body) {
  const yogaData = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const saved    = Store.getContent('exercises_yoga') || {};
  const schedule = saved.schedule || yogaData?.schedule || {};
  const phases   = yogaData?.phases || [];
  const allDays  = Object.keys(schedule).sort((a,b) => parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ','')));

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit yoga poses. Changes sync to all users after saving.<br>
      📅 <strong>${allDays.length} progressive days</strong> — beginner to professional.
    </div>
    ${phases.map(phase => {
      const phaseDays = allDays.filter(d => { const n=parseInt(d.replace('Day ','')); return n>=phase.from && n<=phase.to; });
      return `
        <div style="margin-bottom:16px;">
          <div style="padding:12px 16px;background:${phase.color}22;border:1px solid ${phase.color}44;border-radius:10px;margin:0 16px 8px;display:flex;align-items:center;gap:10px">
            <span style="width:10px;height:10px;border-radius:50%;background:${phase.color};flex-shrink:0"></span>
            <span style="font-weight:700;font-size:14px;color:${phase.color}">${phase.label}</span>
            <span style="font-size:12px;color:var(--text3);margin-left:auto">Days ${phase.from}–${phase.to}</span>
          </div>
          <div style="padding:0 16px">
          ${phaseDays.map(dayKey => {
            const dayData = schedule[dayKey] || {};
            const poses   = dayData.poses || [];
            return `
              <div style="margin-bottom:6px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
                <div style="padding:10px 16px;background:rgba(103,58,183,0.15);display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleYogaDayEditor('${dayKey.replace(' ','')}')">
                  <div>
                    <span style="font-weight:700;font-size:13px;color:#ce93d8">${dayKey}</span>
                    <span style="font-size:11px;color:var(--text3);margin-left:8px">${dayData.focus || ''}</span>
                  </div>
                  <span style="font-size:12px;color:var(--text3)">${poses.length} poses ▾</span>
                </div>
                <div id="yoga-day-editor-${dayKey.replace(' ','')}" style="display:none;padding:0 12px 8px">
                  <div style="margin:8px 0 4px;">
                    <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Day Focus</div>
                    <div class="editable" data-yoga-day="${dayKey}" data-field="focus" contenteditable="true" style="font-size:13px;font-weight:600;color:#ce93d8">${dayData.focus || ''}</div>
                  </div>
                  <div data-yoga-poses="${dayKey}">
                    ${poses.map((pose,i) => _yogaPoseCard(pose,i,dayKey)).join('')}
                  </div>
                  <button class="add-exercise-btn" onclick="addYogaPose('${dayKey}')" style="border-color:rgba(103,58,183,0.4);color:#ce93d8">+ Add Pose to ${dayKey}</button>
                </div>
              </div>`;
          }).join('')}
          </div>
        </div>`;
    }).join('')}`;
  activateEditing(body);
}

function toggleYogaDayEditor(dayKeyNoSpace) {
  const el = document.getElementById('yoga-day-editor-' + dayKeyNoSpace);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function _yogaPoseCard(pose, idx, dayKey) {
  return `
    <div class="exercise-card ex-row" data-idx="${idx}" style="margin:8px 0;position:relative;border-color:rgba(103,58,183,0.3)">
      <button class="delete-ex-btn" onclick="this.closest('.ex-row').remove();markDirty()" title="Delete">✕</button>
      <div class="exercise-body" style="padding:12px">
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Pose Name</div>
          <div class="exercise-name editable" data-field="name" contenteditable="true">${pose.name || ''}</div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Hold / Duration</div>
          <div class="editable" data-field="hold" contenteditable="true" style="font-weight:600;color:#ce93d8">${pose.hold || ''}</div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Description</div>
          <div class="editable-block editable" data-field="desc" contenteditable="true" style="font-size:13px;color:var(--text2);line-height:1.6">${pose.desc || ''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Demo Link</div>
          <div class="editable" data-field="demo" contenteditable="true" style="font-size:12px;color:var(--g5);word-break:break-all">${pose.demo || ''}</div>
        </div>
      </div>
    </div>`;
}

function addYogaPose(dayKey) {
  const container = document.querySelector(`[data-yoga-poses="${dayKey}"]`);
  if (!container) return;
  const div = document.createElement('div');
  div.innerHTML = _yogaPoseCard({ name:'New Pose', hold:'60 sec', desc:'Enter description.', demo:'' }, 999, dayKey);
  const card = div.firstElementChild;
  activateEditing(card);
  container.appendChild(card);
  markDirty();
  card.querySelector('[data-field="name"]')?.focus();
}

async function _collectAndSaveYoga() {
  const yogaData = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const result   = { schedule: {}, phases: yogaData?.phases || [] };
  document.querySelectorAll('[data-yoga-poses]').forEach(container => {
    const dayKey  = container.getAttribute('data-yoga-poses');
    if (!dayKey) return;
    const focusEl = document.querySelector(`[data-yoga-day="${dayKey}"][data-field="focus"]`);
    const focus   = (focusEl?.innerText || '').trim();
    const poses   = Array.from(container.querySelectorAll('.ex-row')).map(row => ({
      name: _text(row, 'name'), hold: _text(row, 'hold'),
      desc: _text(row, 'desc'), demo: _text(row, 'demo'),
    }));
    result.schedule[dayKey] = { focus, poses };
  });
  const origSchedule = yogaData?.schedule || {};
  Object.keys(origSchedule).forEach(dayKey => {
    if (!result.schedule[dayKey]) result.schedule[dayKey] = origSchedule[dayKey];
  });
  Store.setContent('exercises_yoga', result);
  if (window.APP_DATA?.modules?.yoga) window.APP_DATA.modules.yoga.schedule = result.schedule;
  if (window.APP_DATA_DEFAULT?.modules?.yoga) window.APP_DATA_DEFAULT.modules.yoga.schedule = result.schedule;
  await Sheets.post('saveContent', { key: 'exercises_yoga', value: result });
}

// ── ACTIVATE INLINE EDITING ───────────────────────────────────────
function activateEditing(container) {
  container.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('input', markDirty);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !el.classList.contains('editable-block')) {
        e.preventDefault(); el.blur();
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
// EXERCISE EDITOR
// ════════════════════════════════════════════════════════════════
function renderExerciseEditor(moduleId, body) {
  // Yoga uses progressive Day 1-90 — special renderer
  if (moduleId === 'yoga') { renderYogaProgressiveEditor(body); return; }

  // ── BODY-PART MODE (stretching) — render body-part sections instead of weekday tabs ──
  const defaultsRoot = window.APP_DATA_DEFAULT || window.APP_DATA;
  const modDef       = defaultsRoot.modules?.[moduleId];
  if (modDef?.usesBodyParts && Array.isArray(modDef.bodyParts)) {
    body.innerHTML = `
      <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
        ✏️ <strong>Tap any field</strong> to edit. Stretches are grouped by body part. Applies to all users after saving.
      </div>
      ${modDef.bodyParts.map(part => {
        const appDefault = modDef.days?.[part.id] || [];
        const saved      = Store.getContent('exercises_' + moduleId);
        const savedPart  = saved?.days?.[part.id] || [];
        const exercises  = savedPart.length > appDefault.length ? savedPart : appDefault;
        return `
          <div style="margin-bottom:8px">
            <div style="padding:10px 16px;background:rgba(103,58,183,0.18);font-weight:700;font-size:14px;
              display:flex;justify-content:space-between;align-items:center;border-radius:10px 10px 0 0">
              <span>${part.emoji || ''} ${part.name}</span>
              <span style="font-size:12px;color:var(--text3)">${exercises.length} stretches</span>
            </div>
            <div data-day="${part.id}" style="padding:0 16px">
              ${exercises.map((ex, i) => _exerciseCard(ex, i, part.id)).join('')}
              <button class="add-exercise-btn" onclick="addExercise('${part.id}')">+ Add Stretch</button>
            </div>
          </div>`;
      }).join('')}`;
    activateEditing(body);
    return;
  }

  // ── DAY-OF-WEEK MODE (default — cardio, gym, calisthenics, core) ──
  const days = getWeekDays();
  const gymDayLabels = {
    Monday:    'Monday — Chest 🫁',
    Tuesday:   'Tuesday — Shoulders 🏋️',
    Wednesday: 'Wednesday — Lats / Back 🦾',
    Thursday:  'Thursday — Biceps 💪',
    Friday:    'Friday — Triceps 🔱',
    Saturday:  'Saturday — Legs / Squats 🦵',
  };
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit. Applies to all users after saving.
    </div>
    ${days.map(day => {
      const defaults   = window.APP_DATA_DEFAULT || window.APP_DATA;
      const appDefault = defaults.modules?.[moduleId]?.days?.[day] || [];
      const saved      = Store.getContent('exercises_' + moduleId);
      const savedDay   = saved?.days?.[day] || [];
      const exercises  = savedDay.length > appDefault.length ? savedDay : appDefault;
      const isGym      = moduleId === 'gym';
      const dayTitle   = isGym ? (gymDayLabels[day] || day) : ('📅 ' + day);
      const dayBg      = isGym
        ? 'linear-gradient(135deg,rgba(46,125,70,0.3),rgba(30,100,50,0.2))'
        : 'rgba(46,125,70,0.15)';
      return `
        <div style="margin-bottom:8px">
          <div style="padding:10px 16px;background:${dayBg};font-weight:700;font-size:14px;
            display:flex;justify-content:space-between;align-items:center;border-radius:10px 10px 0 0">
            <span>${dayTitle}</span>
            <span style="font-size:12px;color:var(--text3)">${exercises.length} exercises</span>
          </div>
          <div data-day="${day}" style="padding:0 16px">
            ${exercises.map((ex, i) => _exerciseCard(ex, i, day)).join('')}
            <button class="add-exercise-btn" onclick="addExercise('${day}')">+ Add Exercise</button>
          </div>
        </div>`;
    }).join('')}`;
  activateEditing(body);
}

function _exerciseCard(ex, idx, day) {
  const mod = AdminEdit.module;
  const isHoldBased = mod === 'yoga' || mod === 'stretching';
  const thumbContent = (isHoldBased && ex.image && ex.image.length <= 4)
    ? `<div style="font-size:48px;display:flex;align-items:center;justify-content:center;height:100%">${ex.image}</div>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(46,125,70,0.15)"><span style="font-size:32px;font-weight:700;color:#4caf50">${(ex.name||'?').charAt(0).toUpperCase()}</span></div>`;

  const metaFields = isHoldBased ? `
        <div style="display:flex;gap:12px;margin-bottom:10px">
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Hold Duration</div>
            <div class="editable" data-field="hold" contenteditable="true" style="font-weight:600">${ex.hold || ''}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Rounds</div>
            <div class="editable" data-field="rounds" contenteditable="true" style="font-weight:600">${ex.rounds || 1}</div>
          </div>
          ${mod === 'yoga' ? `
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Month</div>
            <div class="editable" data-field="month" contenteditable="true" style="font-weight:600">${ex.month || '1-3'}</div>
          </div>` : ''}
        </div>` : `
        <div style="display:flex;gap:12px;margin-bottom:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Sets</div>
            <div class="editable" data-field="sets" contenteditable="true" style="font-weight:600">${ex.sets || 3}</div>
          </div>
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Reps / Duration</div>
            <div class="editable" data-field="reps" contenteditable="true" style="font-weight:600">${ex.reps || ''}</div>
          </div>
        </div>`;

  return `
    <div class="exercise-card ex-row" data-idx="${idx}" style="margin:10px 0;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.ex-row').remove();markDirty()" title="Delete">✕</button>
      <div class="exercise-thumb">${thumbContent}</div>
      <div class="exercise-body">
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${isHoldBased ? (mod==='yoga' ? 'Pose Name (Sanskrit)' : 'Stretch Name') : 'Exercise Name'}</div>
          <div class="exercise-name editable" data-field="name" contenteditable="true">${ex.name || ''}</div>
        </div>
        ${metaFields}
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Description</div>
          <div class="editable-block editable" data-field="desc" contenteditable="true"
            style="font-size:13px;color:var(--text2);line-height:1.6">${ex.desc || ''}</div>
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Demo Link (YouTube URL)</div>
          <div class="editable" data-field="demo" contenteditable="true"
            style="font-size:12px;color:var(--g5);word-break:break-all">${ex.demo || ''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${isHoldBased ? 'Pose Emoji (e.g. 🧘)' : 'Image URL (optional)'}</div>
          <div class="editable" data-field="image" contenteditable="true"
            style="font-size:${isHoldBased ? '28px' : '12px'};color:var(--text3);word-break:break-all">${ex.image || ''}</div>
        </div>
      </div>
    </div>`;
}

function addExercise(day) {
  const container = document.querySelector(`[data-day="${day}"]`);
  if (!container) return;
  const addBtn = container.querySelector('.add-exercise-btn');
  const div    = document.createElement('div');
  const isHoldBased = AdminEdit.module === 'stretching';
  const newEx  = isHoldBased
    ? { name: 'New Stretch', hold: '30 sec', rounds: 1, desc: 'Enter description.', demo: '', image: '🤸' }
    : { name: 'New Exercise', sets: 3, reps: '10 reps', desc: 'Enter description.', demo: '', image: '', _section: 'main' };
  div.innerHTML = _exerciseCard(newEx, 999, day);
  const card = div.firstElementChild;
  activateEditing(card);
  container.insertBefore(card, addBtn);
  markDirty();
  card.querySelector('[data-field="name"]')?.focus();
}

// ════════════════════════════════════════════════════════════════
// WARMUP / COOLDOWN EDITOR
// ════════════════════════════════════════════════════════════════
function renderWarmCoolEditor(moduleId, section, body) {
  const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
  const appDefault = section === 'warmup'
    ? (_D.warmups?.[moduleId]   || _D.warmups?.cardio   || [])
    : (_D.cooldowns?.[moduleId] || _D.cooldowns?.cardio || []);
  const saved = Store.getContent(section + '_' + moduleId) || [];
  const data  = saved.length > appDefault.length ? saved : appDefault;
  const label = section === 'warmup' ? '🔥 Warm-Up' : '🧘 Cool-Down';

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ These exercises appear at the ${section === 'warmup' ? 'start' : 'end'} of every workout day.
    </div>
    <div style="padding:0 16px">
      <div style="font-weight:700;font-size:14px;margin:4px 0 10px">${label} Exercises</div>
      <div id="wc-list">
        ${data.map((ex, i) => _warmCoolCard(ex, i)).join('')}
      </div>
      <button class="add-exercise-btn" onclick="addWarmCoolExercise()">+ Add Exercise</button>
    </div>`;
  activateEditing(body);
}

function _warmCoolCard(ex, idx) {
  return `
    <div class="exercise-card wc-ex-row" data-idx="${idx}" style="margin:10px 0;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.wc-ex-row').remove();markDirty()">✕</button>
      <div class="exercise-body" style="padding:14px">
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Exercise Name</div>
          <div class="exercise-name editable" data-field="name" contenteditable="true">${ex.name || ''}</div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:8px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Sets</div>
            <div class="editable" data-field="sets" contenteditable="true" style="font-weight:600">${ex.sets || 1}</div>
          </div>
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Duration / Reps</div>
            <div class="editable" data-field="reps" contenteditable="true" style="font-weight:600">${ex.reps || ''}</div>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Description</div>
          <div class="editable-block editable" data-field="desc" contenteditable="true"
            style="font-size:13px;color:var(--text2);line-height:1.6">${ex.desc || ''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Demo Link</div>
          <div class="editable" data-field="demo" contenteditable="true"
            style="font-size:12px;color:var(--g5);word-break:break-all">${ex.demo || ''}</div>
        </div>
      </div>
    </div>`;
}

function addWarmCoolExercise() {
  const list = document.getElementById('wc-list');
  if (!list) return;
  const div = document.createElement('div');
  div.innerHTML = _warmCoolCard({ name: 'New Exercise', sets: 1, reps: '30 sec', desc: 'Enter description.', demo: '' }, 999);
  const card = div.firstElementChild;
  activateEditing(card);
  list.appendChild(card);
  markDirty();
}

// ════════════════════════════════════════════════════════════════
// HYDRATION EDITOR
// ════════════════════════════════════════════════════════════════
function renderHydrationEditor(moduleId, body) {
  const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
  const perModule = _D.hydration?.[moduleId] || _D.hydration?.default || {};
  const data      = Store.getContent('hydration_' + moduleId) || perModule;
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const tips     = Array.isArray(data.tips)     ? data.tips     : [];

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit hydration content.
    </div>
    <div style="padding:0 16px">
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Plan Title</div>
        <div class="editable" id="hydr-title" contenteditable="true" style="font-size:17px;font-weight:700">${data.title || 'Daily Hydration Plan'}</div>
        <div style="display:flex;gap:16px;margin-top:12px">
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Training Day (L)</div>
            <div class="editable" id="hydr-target-train" contenteditable="true" style="font-weight:700;font-size:20px;color:var(--g5)">${data.targets?.training || 3.5}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Rest Day (L)</div>
            <div class="editable" id="hydr-target-rest" contenteditable="true" style="font-weight:700;font-size:20px;color:var(--g5)">${data.targets?.rest || 2.5}</div>
          </div>
        </div>
      </div>

      <div style="font-weight:700;margin-bottom:8px">Schedule</div>
      <div id="hydr-schedule">
        ${schedule.map((s, i) => `
          <div class="card card-sm hydr-slot" data-idx="${i}" style="margin-bottom:8px;display:flex;gap:12px;align-items:center">
            <button class="delete-ex-btn" style="position:static;width:24px;height:24px;font-size:12px;flex-shrink:0"
              onclick="this.closest('.hydr-slot').remove();markDirty()">✕</button>
            <div style="flex:1">
              <div class="editable" data-field="time" contenteditable="true" style="font-weight:600;font-size:13px">${s.time || ''}</div>
              <div class="editable" data-field="label" contenteditable="true" style="font-size:12px;color:var(--text3);margin-top:2px">${s.label || ''}</div>
            </div>
            <div style="flex-shrink:0;text-align:right">
              <div class="editable" data-field="amount" contenteditable="true" style="font-weight:700;color:var(--g5)">${s.amount || 0}</div>
              <div style="font-size:11px;color:var(--text3)">ml</div>
            </div>
          </div>`).join('')}
      </div>
      <button class="add-exercise-btn" onclick="addHydrationSlot()" style="margin-bottom:16px">+ Add Time Slot</button>

      <div style="font-weight:700;margin-bottom:8px">Tips</div>
      <div id="hydr-tips">
        ${tips.map((t, i) => `
          <div class="card card-sm hydr-tip" data-idx="${i}" style="margin-bottom:8px;display:flex;gap:10px;align-items:flex-start">
            <button class="delete-ex-btn" style="position:static;width:24px;height:24px;font-size:12px;flex-shrink:0;margin-top:2px"
              onclick="this.closest('.hydr-tip').remove();markDirty()">✕</button>
            <div class="editable-block editable" data-field="tip" contenteditable="true"
              style="flex:1;font-size:13px;color:var(--text2);line-height:1.5">💧 ${t}</div>
          </div>`).join('')}
      </div>
      <button class="add-exercise-btn" onclick="addHydrationTip()">+ Add Tip</button>
    </div>`;
  activateEditing(body);
}

function addHydrationSlot() {
  const list = document.getElementById('hydr-schedule');
  const div  = document.createElement('div');
  div.innerHTML = `<div class="card card-sm hydr-slot" style="margin-bottom:8px;display:flex;gap:12px;align-items:center">
    <button class="delete-ex-btn" style="position:static;width:24px;height:24px;font-size:12px;flex-shrink:0"
      onclick="this.closest('.hydr-slot').remove();markDirty()">✕</button>
    <div style="flex:1">
      <div class="editable" data-field="time" contenteditable="true" style="font-weight:600;font-size:13px">New Time</div>
      <div class="editable" data-field="label" contenteditable="true" style="font-size:12px;color:var(--text3);margin-top:2px">Description</div>
    </div>
    <div style="flex-shrink:0;text-align:right">
      <div class="editable" data-field="amount" contenteditable="true" style="font-weight:700;color:var(--g5)">300</div>
      <div style="font-size:11px;color:var(--text3)">ml</div>
    </div>
  </div>`;
  activateEditing(div);
  list?.appendChild(div.firstElementChild);
  markDirty();
}

function addHydrationTip() {
  const list = document.getElementById('hydr-tips');
  const div  = document.createElement('div');
  div.innerHTML = `<div class="card card-sm hydr-tip" style="margin-bottom:8px;display:flex;gap:10px;align-items:flex-start">
    <button class="delete-ex-btn" style="position:static;width:24px;height:24px;font-size:12px;flex-shrink:0;margin-top:2px"
      onclick="this.closest('.hydr-tip').remove();markDirty()">✕</button>
    <div class="editable-block editable" data-field="tip" contenteditable="true"
      style="flex:1;font-size:13px;color:var(--text2);line-height:1.5">💧 New tip here</div>
  </div>`;
  activateEditing(div);
  list?.appendChild(div.firstElementChild);
  markDirty();
}

// ════════════════════════════════════════════════════════════════
// RUNNING PLANS EDITOR
// ════════════════════════════════════════════════════════════════
function renderRunningPlansEditor(body) {
  const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
  const plans = _D.running?.plans || {};
  const planKeys = Object.keys(plans);
  const activePlan = body.dataset.activePlan || planKeys[0] || '5K';

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      🗓 <strong>View running plans</strong>. Edit descriptions and distances per day/week.
    </div>

    <!-- Plan selector tabs -->
    <div style="display:flex;gap:8px;padding:0 16px 14px;flex-wrap:wrap">
      ${planKeys.map(k => `
        <button onclick="selectAdminPlan('${k}')"
          style="padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid ${plans[k].color};
            background:${activePlan===k ? plans[k].color : 'transparent'};
            color:${activePlan===k ? '#000' : plans[k].color}">
          ${plans[k].emoji} ${k}
        </button>`).join('')}
    </div>

    <!-- Plan info -->
    <div style="padding:0 16px 12px">
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px">
        <div style="font-weight:700;font-size:15px;color:${plans[activePlan]?.color}">${plans[activePlan]?.emoji} ${activePlan} Plan</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">${plans[activePlan]?.weeks} weeks · ${(plans[activePlan]?.schedule||[]).length} daily sessions total</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">${plans[activePlan]?.desc}</div>
      </div>
    </div>

    <!-- Schedule by week -->
    <div id="admin-plan-schedule" style="padding:0 16px">
      ${_renderAdminPlanWeeks(plans[activePlan], activePlan)}
    </div>`;

  body.dataset.activePlan = activePlan;

  // Override save button
  const saveBtn = document.getElementById('editor-save-btn');
  if (saveBtn) {
    saveBtn.textContent = '💾 Save Plan Changes';
    saveBtn.onclick = saveRunningPlanChanges;
  }
}

function selectAdminPlan(planKey) {
  const body = document.getElementById('editor-body');
  if (body) { body.dataset.activePlan = planKey; renderRunningPlansEditor(body); }
}

function _renderAdminPlanWeeks(plan, planKey) {
  if (!plan?.schedule?.length) return '<div style="padding:20px;text-align:center;color:var(--text3)">No schedule data found.</div>';
  const weeks = [...new Set(plan.schedule.map(s => s.week))].sort((a,b)=>a-b);
  const DAY_NAMES = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'];
  return weeks.map(w => {
    const days = plan.schedule.filter(s => s.week === w);
    return `
      <div style="margin-bottom:14px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;overflow:hidden">
        <div style="background:rgba(255,255,255,0.07);padding:10px 14px;font-weight:700;font-size:13px;color:var(--text2)">
          Week ${w}
        </div>
        ${days.map(s => `
          <div style="padding:10px 14px;border-top:1px solid rgba(255,255,255,0.05)"
               data-plan="${planKey}" data-week="${s.week}" data-day="${s.day}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase">${DAY_NAMES[s.day-1]}</span>
              <span style="font-size:11px;color:${plan.color}">${s.dist > 0 ? s.dist+'km' : 'Rest'}</span>
            </div>
            <div contenteditable="true" data-field="type"
              style="font-weight:700;font-size:14px;color:var(--text1);outline:none;border-bottom:1px solid transparent"
              onfocus="this.style.borderBottomColor='var(--g4)';markDirty()"
              onblur="this.style.borderBottomColor='transparent'"
              >${s.type}</div>
            <div contenteditable="true" data-field="desc"
              style="font-size:12px;color:var(--text2);margin-top:3px;outline:none;border-bottom:1px solid transparent;line-height:1.5"
              onfocus="this.style.borderBottomColor='var(--g4)';markDirty()"
              onblur="this.style.borderBottomColor='transparent'"
              >${s.desc}</div>
          </div>`).join('')}
      </div>`;
  }).join('');
}

async function saveRunningPlanChanges() {
  const body    = document.getElementById('editor-body');
  const planKey = body?.dataset.activePlan;
  const _D      = window.APP_DATA_DEFAULT || window.APP_DATA;
  const plan    = _D.running?.plans?.[planKey];
  if (!plan) return;

  // Collect edits from DOM
  const rows = body.querySelectorAll('[data-plan][data-week][data-day]');
  rows.forEach(row => {
    const w    = parseInt(row.dataset.week);
    const d    = parseInt(row.dataset.day);
    const type = row.querySelector('[data-field="type"]')?.innerText.trim();
    const desc = row.querySelector('[data-field="desc"]')?.innerText.trim();
    const entry = plan.schedule.find(s => s.week === w && s.day === d);
    if (entry) {
      if (type) entry.type = type;
      if (desc) entry.desc = desc;
    }
  });

  // Save to Sheets
  const btn = document.getElementById('editor-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  try {
    await Sheets.post('saveContent', { key: 'running_plan_' + planKey, value: plan });
    Store.setContent('running_plan_' + planKey, plan);
    AdminEdit.isDirty = false;
    showToast(`${planKey} plan saved! ✅`, 'success');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Saved!'; setTimeout(() => { if(btn) btn.textContent='💾 Save Plan Changes'; }, 3000); }
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Plan Changes'; }
  }
}

// DIET EDITOR
// ════════════════════════════════════════════════════════════════
function renderDietEditor(moduleId, body) {
  // All 5 modules now have their own diet plan
  const _Dd = window.APP_DATA_DEFAULT || window.APP_DATA;
  const modKey = _Dd.diet?.modules?.[moduleId] ? moduleId : 'cardio';
  const data   = Store.getContent('diet_' + moduleId) || _Dd.diet?.modules?.[modKey] || { title: 'Diet Plan', meals: [] };
  const meals  = Array.isArray(data.meals) ? data.meals : [];

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit diet plan.
    </div>
    <div style="padding:0 16px">
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Plan Title</div>
        <div class="editable" id="diet-title" contenteditable="true" style="font-size:17px;font-weight:700">${data.title || ''}</div>
      </div>
      <div style="font-weight:700;margin-bottom:8px">Meals</div>
      <div id="diet-meals">
        ${meals.map((m, i) => _dietMealCard(m, i)).join('')}
      </div>
      <button class="add-exercise-btn" onclick="addDietMeal()">+ Add Meal</button>
    </div>`;
  activateEditing(body);
}

function _dietMealCard(m, idx) {
  return `
    <div class="card card-sm diet-meal" data-idx="${idx}" style="margin-bottom:10px;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.diet-meal').remove();markDirty()">✕</button>
      <div style="padding-right:32px">
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Time / Label</div>
        <div class="editable" data-field="time" contenteditable="true" style="font-weight:700;font-size:14px;margin-bottom:8px">${m.time || ''}</div>
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Meal Name</div>
        <div class="editable" data-field="name" contenteditable="true" style="font-weight:600;margin-bottom:8px">${m.name || ''}</div>
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Food Items</div>
        <div class="editable-block editable" data-field="items" contenteditable="true"
          style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:8px">${m.items || ''}</div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Calories</div>
            <div class="editable" data-field="cal" contenteditable="true" style="font-weight:700;color:var(--g5)">${m.cal || 0}</div>
          </div>
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Notes</div>
            <div class="editable" data-field="notes" contenteditable="true" style="font-size:12px;color:var(--text3)">${m.notes || ''}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function addDietMeal() {
  const list = document.getElementById('diet-meals');
  const div  = document.createElement('div');
  div.innerHTML = _dietMealCard({ time: 'New Time', name: 'Meal Name', items: 'Food items', cal: 0, notes: '' }, 999);
  activateEditing(div);
  list?.appendChild(div.firstElementChild);
  markDirty();
}

// ════════════════════════════════════════════════════════════════
// QUOTES EDITOR
// ════════════════════════════════════════════════════════════════
function openAdminQuotes() {
  AdminEdit.module  = 'quotes';
  AdminEdit.section = 'quotes';
  AdminEdit.isDirty = false;
  showPage('page-admin-editor');

  document.getElementById('editor-module-title').textContent = '💬 Motivational Quotes';
  document.getElementById('editor-section-tabs').innerHTML   = '';

  const data = Store.getContent('custom_quotes') || APP_DATA.quotes || [];
  const body = document.getElementById('editor-body');
  body.classList.add('admin-edit-mode');

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ These quotes show on the <strong>user daily motivation screen</strong>. Admin skips this screen.
    </div>
    <div style="padding:0 16px">
      <div id="quotes-list">
        ${data.map((q, i) => _quoteCard(q, i)).join('')}
      </div>
      <button class="add-exercise-btn" onclick="addQuoteRow()">+ Add Quote</button>
    </div>`;
  activateEditing(body);

  // Override save button for quotes
  const btn = document.getElementById('editor-save-btn');
  if (btn) {
    btn.textContent      = '💾 Save Quotes';
    btn.style.background = 'linear-gradient(135deg,var(--g3),var(--g4))';
    btn.disabled         = false;
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = 'Saving…';
      const quotes = Array.from(document.querySelectorAll('.quote-row')).map(el => ({
        text: (el.querySelector('[data-field="text"]')?.textContent || '').replace(/^["']|["']$/g, '').trim(),
      })).filter(q => q.text);
      Store.setContent('custom_quotes', quotes);
      APP_DATA.quotes = quotes;
      await Sheets.post('saveContent', { key: 'custom_quotes', value: quotes });
      btn.disabled    = false;
      btn.textContent = '✅ Saved!';
      AdminEdit.isDirty = false;
      showToast('Quotes updated for all users! ✅', 'success');
      setTimeout(() => { btn.textContent = '💾 Save Quotes'; }, 3000);
    };
  }
}

function _quoteCard(q, idx) {
  return `
    <div class="card card-sm quote-row" data-idx="${idx}" style="margin-bottom:10px;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.quote-row').remove();markDirty()">✕</button>
      <div style="padding-right:36px">
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Quote Text</div>
        <div class="editable-block editable" data-field="text" contenteditable="true"
          style="font-size:14px;font-style:italic;line-height:1.5">"${q.text || ''}"</div>
      </div>
    </div>`;
}

function addQuoteRow() {
  const list = document.getElementById('quotes-list');
  const div  = document.createElement('div');
  div.innerHTML = _quoteCard({ text: 'Enter quote here' }, 999);
  activateEditing(div);
  list?.appendChild(div.firstElementChild);
  markDirty();
}

// ════════════════════════════════════════════════════════════════
// HISTORY
// ════════════════════════════════════════════════════════════════
async function renderAllHistory() {
  const container = document.getElementById('all-history-list');
  if (!container) return;

  // Show loading state while we fetch
  container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">
    <div class="loader" style="margin:0 auto 12px"></div>Loading history…</div>`;

  // Use cached dashboard data if available; otherwise fetch from Sheets.
  // Admin's localStorage is empty — must always pull from Sheets for cross-user data.
  let allLogs = _adminDashboardData?.allLogs || null;
  let allRuns = _adminDashboardData?.allRuns || null;

  if (!allLogs || !allRuns) {
    try {
      const [logsRes, runsRes] = await Promise.all([
        Sheets.get('getAllLogs').catch(() => null),
        Sheets.get('getAllRunLogs').catch(() => null),
      ]);
      allLogs = (logsRes?.success && logsRes.logs?.length) ? logsRes.logs : Store.getLogs();
      allRuns = (runsRes?.success  && runsRes.logs?.length) ? runsRes.logs : Store.getRunLogs();
    } catch(e) {
      allLogs = Store.getLogs();
      allRuns = Store.getRunLogs();
    }
  }

  allLogs = allLogs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  allRuns = allRuns.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const combined = [
    ...allLogs.map(l => ({ ...l, _type: l.module.startsWith('custom_') ? 'custom' : 'workout' })),
    ...allRuns.map(r => ({ ...r, _type: 'run', module: 'running', day: 'Run', timestamp: r.timestamp || r.date })),
  ].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 80);

  document.getElementById('all-history-list').innerHTML = combined.length
    ? combined.map(l => {
        const isRun    = l._type === 'run';
        const isCustom = l._type === 'custom';
        const actType  = l.activityType || 'run'; // for GPS sessions only
        const emoji    = isCustom ? '✏️'
                       : isRun   ? _activityIcon(actType)
                       :           getModuleEmoji(l.module);
        const name     = isCustom ? 'Custom: ' + (l.module.replace('custom_','').substring(0,12))
                       : isRun   ? (l.title || _activityName(actType))
                       :           getModuleName(l.module);
        const badge    = isRun ? 'badge-blue' : isCustom ? 'badge-yellow' : 'badge-green';
        const label    = isRun ? _activityLabel(actType) : isCustom ? '✏️ Custom' : '✓ Done';
        const sub      = isRun ? `${(l.distance||0).toFixed(2)}km · ${fmtTime(l.duration||0)}` : (l.day || '—');
        const userLabel = l.email || l.userId || '—';
        return `
          <div class="user-row" style="margin-bottom:6px">
            <div class="user-avatar" style="font-size:18px">${emoji}</div>
            <div class="user-info">
              <div class="user-name">${name}</div>
              <div class="user-email">${userLabel} · ${sub} · ${l.date || '—'}</div>
            </div>
            <span class="badge ${badge}">${label}</span>
          </div>`;
      }).join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet.</p></div>';
}

// ── ADMIN: VIEW ALL CUSTOM WORKOUTS ──────────────────────────────
async function renderAdminCustomWorkouts() {
  const container = document.getElementById('admin-custom-workouts-list');
  if (!container) return;

  // Show loading state
  container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text3)">
    <div class="loader" style="margin:0 auto 12px"></div>Loading custom workouts…</div>`;

  // Fetch from Sheets (authoritative — works across all devices/browsers)
  let allWorkouts = [];
  const allLogs = Store.getLogs().filter(l => l.module.startsWith('custom_'));

  try {
    const res = await Sheets.get('getAllCustomWorkouts');
    if (res?.success && Array.isArray(res.workouts)) {
      allWorkouts = res.workouts;
    } else {
      throw new Error(res?.error || 'No data');
    }
  } catch (e) {
    // Fallback: scan localStorage for this device's data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ff_custom_workouts_')) {
        const userId = key.replace('ff_custom_workouts_', '');
        try {
          const wos = JSON.parse(localStorage.getItem(key) || '[]');
          wos.forEach(w => allWorkouts.push({ ...w, userId }));
        } catch {}
      }
    }
    if (!allWorkouts.length) {
      container.innerHTML = `<div class="card" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.25);text-align:center;padding:20px">
        <div style="font-size:28px;margin-bottom:8px">⚠️</div>
        <div style="font-weight:700;margin-bottom:6px">Could not load from Sheets</div>
        <div style="font-size:13px;color:var(--text2)">Check your Sheets connection. ${e.message}</div>
      </div>`;
      return;
    }
  }

  if (!allWorkouts.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">✏️</div><p>No custom workouts created yet.</p></div>';
    return;
  }

  // Group by user for cleaner display
  const byUser = {};
  allWorkouts.forEach(w => {
    const key = w.userId || 'unknown';
    if (!byUser[key]) byUser[key] = { email: w.email || w.userId, name: '', workouts: [] };
    byUser[key].workouts.push(w);
  });
  try {
    const allUsers = Store.get('ff_admin_users', []);
    allUsers.forEach(u => { if (byUser[u.id]) byUser[u.id].name = u.name || u.email; });
  } catch {}

  const DIFF_COLORS_A = { Beginner:'#43a05a', Intermediate:'#f0c040', Advanced:'#e53935' };
  const CAT_EMOJIS_A  = { Strength:'🏋️', Cardio:'🏃', HIIT:'⚡', 'Yoga/Mobility':'🧘', Sports:'⚽', Circuit:'🔄', Custom:'✨' };
  const totalWorkouts    = allWorkouts.length;
  const totalCompletions = allWorkouts.reduce((s,w) => s + allLogs.filter(l=>l.userId===w.userId&&l.module==='custom_'+w.id).length, 0);
  const uniqueUsers      = Object.keys(byUser).length;
  const catBreakdown     = {};
  allWorkouts.forEach(w => { const c=w.category||'Custom'; catBreakdown[c]=(catBreakdown[c]||0)+1; });

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
      <div class="stat-card"><div class="stat-val">${uniqueUsers}</div><div class="stat-label">Users</div></div>
      <div class="stat-card"><div class="stat-val">${totalWorkouts}</div><div class="stat-label">Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${totalCompletions}</div><div class="stat-label">Sessions</div></div>
    </div>
    <div class="card card-sm" style="margin-bottom:16px">
      <div class="section-title" style="margin-bottom:8px">By Category</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${Object.entries(catBreakdown).map(([cat,count]) => `
          <span style="font-size:12px;padding:4px 12px;border-radius:50px;background:var(--bg3);color:var(--text2)">
            ${CAT_EMOJIS_A[cat]||'💪'} ${cat} <strong style="color:var(--g5)">${count}</strong>
          </span>`).join('')}
      </div>
    </div>
    ${Object.entries(byUser).map(([userId, group]) => {
      const userLogs = allLogs.filter(l => l.userId === userId);
      return `
        <div style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(135deg,rgba(46,125,70,0.15),rgba(30,100,50,0.08));border:1px solid rgba(46,125,70,0.25);border-radius:10px;margin-bottom:8px">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--g2),var(--g4));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0">
              ${(group.email||'?').charAt(0).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--text)">${group.name||group.email}</div>
              <div style="font-size:11px;color:var(--text3)">${group.email} · ${group.workouts.length} workout${group.workouts.length!==1?'s':''} · ${userLogs.length} total sessions</div>
            </div>
            <span class="badge badge-green">${group.workouts.length}</span>
          </div>
          ${group.workouts.map(w => {
            const completions = allLogs.filter(l=>l.userId===w.userId&&l.module==='custom_'+w.id).length;
            const lastLog     = allLogs.filter(l=>l.userId===w.userId&&l.module==='custom_'+w.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
            const diff        = w.difficulty || '';
            const diffColor   = DIFF_COLORS_A[diff] || 'var(--text3)';
            const catEmoji    = CAT_EMOJIS_A[w.category] || '💪';
            const hasDays     = w.days && w.days.length > 0;
            return `
              <div class="card card-sm" style="margin-bottom:8px;margin-left:8px;border-left:3px solid var(--g3)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                      <span style="font-size:15px">${catEmoji}</span>
                      <span style="font-weight:700;font-size:15px">${w.name}</span>
                    </div>
                    <div style="display:flex;gap:5px;flex-wrap:wrap">
                      ${diff?`<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:50px;background:${diffColor}22;color:${diffColor};border:1px solid ${diffColor}44">${diff}</span>`:''}
                      ${w.category?`<span style="font-size:10px;padding:2px 8px;border-radius:50px;background:var(--bg3);color:var(--text3)">${w.category}</span>`:''}
                      ${w.goal?`<span style="font-size:10px;padding:2px 8px;border-radius:50px;background:var(--bg3);color:var(--text3)">🎯 ${w.goal}</span>`:''}
                    </div>
                  </div>
                  <div style="text-align:right;flex-shrink:0">
                    <div style="font-family:var(--font-display);font-size:26px;color:var(--g5);line-height:1">${completions}</div>
                    <div style="font-size:10px;color:var(--text3)">sessions</div>
                  </div>
                </div>
                ${hasDays?`<div style="display:flex;gap:4px;margin-bottom:8px">
                  ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`
                    <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:5px;
                      background:${w.days.includes(d)?'rgba(46,125,70,0.25)':'var(--bg3)'};
                      color:${w.days.includes(d)?'var(--g5)':'var(--text3)'}">${d}</span>`).join('')}
                </div>`:''}
                <div style="margin-bottom:8px">
                  <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">${w.exercises?.length||0} Exercises</div>
                  <div style="display:flex;flex-wrap:wrap;gap:5px">
                    ${(w.exercises||[]).map(e=>`
                      <span style="font-size:11px;background:var(--bg3);color:var(--text2);padding:2px 9px;border-radius:50px">
                        ${e.name}${e.sets?' · '+e.sets+'×'+(e.reps||''):''}
                      </span>`).join('')}
                  </div>
                </div>
                ${w.notes?`<div style="font-size:12px;color:var(--text3);padding:8px 10px;background:var(--bg3);border-radius:8px;margin-bottom:8px;line-height:1.5">📝 ${w.notes}</div>`:''}
                <div style="display:flex;gap:12px;font-size:11px;color:var(--text3)">
                  <span>📅 Created: ${w.createdDate||'—'}</span>
                  ${lastLog?`<span>🏆 Last: ${lastLog.date||'—'}</span>`:'<span>🏆 Never done</span>'}
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('')}
  `;
}

// ════════════════════════════════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════════════════════════════════
async function refreshFeedbackBadge() {
  try {
    const res = await Sheets.get('getFeedbackUnread');
    const count = res?.count || 0;
    const badge = document.getElementById('feedback-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch(e) { /* silent */ }
}

async function renderFeedbackList() {
  const container = document.getElementById('feedback-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text3)">
    <div class="loader" style="margin:0 auto 12px"></div>Loading…</div>`;
  const res = await Sheets.get('getFeedback');
  if (!res?.success || !res.feedback?.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback yet.</p></div>';
    refreshFeedbackBadge();
    return;
  }
  container.innerHTML = res.feedback.map(f => {
    const isRead    = f.adminRead || !!f.adminReply;
    const stars     = '⭐'.repeat(Math.min(parseInt(f.rating) || 0, 5));
    const safeId    = (f.id || '').replace(/'/g, "\'");
    const safeName  = (f.name || 'Anonymous').replace(/</g,'&lt;');
    const safeEmail = (f.email || '').replace(/</g,'&lt;');
    const safeMsg   = (f.message || '').replace(/</g,'&lt;');
    const safeReply = (f.adminReply || '').replace(/</g,'&lt;');
    return `
    <div class="card card-sm" id="fb-card-${safeId}"
      style="margin-bottom:12px;border-left:3px solid ${isRead ? 'var(--border)' : '#e53935'};opacity:${isRead ? '0.75' : '1'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          ${!isRead ? '<span style="width:8px;height:8px;border-radius:50%;background:#e53935;flex-shrink:0;display:inline-block"></span>' : ''}
          <div>
            <div style="font-weight:700;font-size:14px">${safeName}</div>
            <div style="font-size:11px;color:var(--text3)">${safeEmail} · ${f.date || ''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${stars ? `<span style="font-size:12px">${stars}</span>` : ''}
          ${f.category ? `<span class="badge badge-blue" style="font-size:10px">${f.category}</span>` : ''}
          ${isRead ? '<span style="font-size:10px;color:var(--text3);font-weight:600">✓ Done</span>' : ''}
        </div>
      </div>
      <div style="font-size:13px;color:var(--text1);line-height:1.6;margin-bottom:10px;padding:8px 10px;background:var(--bg3);border-radius:8px">${safeMsg}</div>
      ${safeReply ? `
        <div style="font-size:12px;color:var(--g5);background:rgba(46,125,70,0.1);border:1px solid rgba(46,125,70,0.25);border-radius:8px;padding:8px 10px;margin-bottom:10px">
          <span style="font-weight:700">✉️ Your reply:</span> ${safeReply}
        </div>` : ''}
      ${!isRead ? `
        <div id="fb-reply-area-${safeId}" style="margin-top:2px">
          <textarea id="fb-reply-input-${safeId}" rows="2" maxlength="500"
            placeholder="Type a reply to ${safeName}… (optional)"
            style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:13px;resize:none;box-sizing:border-box;margin-bottom:8px"></textarea>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1;font-size:12px;padding:8px"
              onclick="_submitFeedbackReply('${safeId}')">✉️ Reply & Mark Done</button>
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px"
              onclick="_markFeedbackNoted('${safeId}')">✅ Noted</button>
          </div>
        </div>` : ''}
    </div>`;
  }).join('');
  refreshFeedbackBadge();
}

async function _submitFeedbackReply(feedbackId) {
  const input = document.getElementById('fb-reply-input-' + feedbackId);
  const reply = (input?.value || '').trim();
  if (!reply) return _markFeedbackNoted(feedbackId);
  const btn = input?.closest('.card')?.querySelector('button');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  const res = await Sheets.post('replyFeedback', { feedbackId, reply });
  if (res?.success) {
    _markCardDone(feedbackId, reply);
    showToast('Reply saved ✅', 'success');
    refreshFeedbackBadge();
  } else {
    showToast('Failed to save reply. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '✉️ Reply & Mark Done'; }
  }
}

async function _markFeedbackNoted(feedbackId) {
  const res = await Sheets.post('markFeedbackRead', { feedbackId });
  if (res?.success) {
    _markCardDone(feedbackId, null);
    showToast('Marked as noted ✅', 'success');
    refreshFeedbackBadge();
  } else {
    showToast('Failed. Try again.', 'error');
  }
}

function _markCardDone(feedbackId, reply) {
  const card = document.getElementById('fb-card-' + feedbackId);
  if (!card) return;
  card.style.borderLeftColor = 'var(--border)';
  card.style.opacity = '0.75';
  const replyArea = document.getElementById('fb-reply-area-' + feedbackId);
  if (replyArea) {
    if (reply) {
      replyArea.outerHTML = `<div style="font-size:12px;color:var(--g5);background:rgba(46,125,70,0.1);border:1px solid rgba(46,125,70,0.25);border-radius:8px;padding:8px 10px">
        <span style="font-weight:700">✉️ Your reply:</span> ${reply.replace(/</g,'&lt;')}</div>`;
    } else { replyArea.remove(); }
  }
  card.querySelectorAll('span[style*="background:#e53935"]').forEach(el => el.remove());
  const statusArea = card.querySelector('[style*="gap:6px"]');
  if (statusArea && !statusArea.querySelector('.done-label')) {
    const d = document.createElement('span');
    d.className = 'done-label';
    d.style.cssText = 'font-size:10px;color:var(--text3);font-weight:600';
    d.textContent = '✓ Done';
    statusArea.appendChild(d);
  }
}

// ════════════════════════════════════════════════════════════════
// SHEETS CONFIG
// ════════════════════════════════════════════════════════════════
function openSheetsConfig() {
  document.getElementById('sheets-url').value = Store.getSheetsConfig().webAppUrl || '';
  openModal('modal-sheets-config');
}
async function saveSheetsConfig() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Please enter the Web App URL.', 'error'); return; }
  Store.setSheetsConfig({ webAppUrl: url });
  closeModal('modal-sheets-config');
  showToast('Sheets URL saved! ✅', 'success');
  renderContentHome(); // refresh connection status
}
async function testSheetsConnection() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Enter URL first.', 'error'); return; }
  const prev = Store.getSheetsConfig();
  Store.setSheetsConfig({ webAppUrl: url });
  showToast('Testing…', 'info');
  const res = await Sheets.get('ping');
  Store.setSheetsConfig(prev);
  if (res?.success) showToast('✅ Connected to Google Sheets!', 'success');
  else showToast('❌ Connection failed. Check the URL.', 'error');
}

// ── MODULE HELPERS (shared with dashboard) ────────────────────────
function getModuleEmoji(mod) { return { cardio: '🏠', gym: '🏋️', yoga: '🧘', stretching: '🙆', running: '🏃', calisthenics: '🤸‍♂️', crosstraining: '💪', core: '🔥', ironman: '🏅' }[mod] || '💪'; }
function getModuleName(mod)  { return { cardio: 'Home Cardio', gym: 'Gym Workouts', yoga: 'Yoga', stretching: 'Stretching', running: 'Running', calisthenics: 'Calisthenics', crosstraining: 'Cross Training', core: 'Core & Abs', ironman: 'Half Iron Man' }[mod] || mod; }

// ── QUOTES TAB (inline in Admin Panel, not editor page) ───────────

// ════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS DASHBOARD
// ════════════════════════════════════════════════════════════════
async function renderAdminAnalytics() {
  const container = document.getElementById('admin-analytics-content');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3)"><div class="loader" style="margin:0 auto 12px"></div>Loading analytics…</div>`;

  // Fetch all logs from Sheets (authoritative cross-device data)
  let allLogs = Store.getLogs();
  let allRuns = Store.getRunLogs();
  try {
    const [logsRes, runsRes] = await Promise.all([
      Sheets.get('getAllLogs'),
      Sheets.get('getAllRunLogs'),
    ]);
    if (logsRes?.success && logsRes.logs?.length) allLogs = logsRes.logs;
    if (runsRes?.success && runsRes.logs?.length) allRuns = runsRes.logs;
  } catch(e) { /* fall through to local data */ }

  const today  = todayStr();
  const monday = getMonday();
  const prevMon = (() => { const d=new Date(monday); d.setDate(d.getDate()-7); return _ymdLocal(d); })();
  const prevSun = (() => { const d=new Date(monday); d.setDate(d.getDate()-1); return _ymdLocal(d); })();

  const thisWeekLogs = allLogs.filter(l => l.date >= monday);
  const lastWeekLogs = allLogs.filter(l => l.date >= prevMon && l.date <= prevSun);
  const thisWeekRuns = allRuns.filter(r => r.date >= monday);
  const todayLogs    = allLogs.filter(l => l.date === today);

  const last7Str = (() => { const d=new Date(); d.setDate(d.getDate()-7); return _ymdLocal(d); })();
  const activeUserIds = [...new Set(allLogs.filter(l=>l.date>=last7Str).map(l=>l.userId))];

  // Per-day activity last 14 days
  const dayActivity = {};
  for (let i=13;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); dayActivity[_ymdLocal(d)]=0; }
  allLogs.forEach(l => { if (dayActivity[l.date]!==undefined) dayActivity[l.date]++; });
  const dayKeys = Object.keys(dayActivity);
  const dayVals = Object.values(dayActivity);
  const maxDay  = Math.max(...dayVals, 1);

  // Module popularity
  const modCounts = {};
  allLogs.forEach(l => { const m=l.module?.startsWith('custom_')?'custom':l.module; modCounts[m]=(modCounts[m]||0)+1; });
  const topMods = Object.entries(modCounts).sort((a,b)=>b[1]-a[1]);
  const maxMod  = topMods[0]?.[1] || 1;

  // Dropout risk
  const userLastActivity = {};
  allLogs.forEach(l => { if (!userLastActivity[l.userId]||l.date>userLastActivity[l.userId]) userLastActivity[l.userId]=l.date; });
  const dropout = Object.entries(userLastActivity).filter(([,d])=>d<last7Str).map(([uid])=>uid);

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${_aKpi('📅','This Week', thisWeekLogs.length+' sessions', lastWeekLogs.length?(thisWeekLogs.length>=lastWeekLogs.length?'↑':'↓')+' vs last week':'', "_drillAnalyticsKpi('thisWeek')")}
      ${_aKpi('🏃','Runs This Week', thisWeekRuns.length+' runs', thisWeekRuns.reduce((a,r)=>a+(r.distance||0),0).toFixed(1)+' km total', "_drillAnalyticsKpi('runsThisWeek')")}
      ${_aKpi('👥','Active (7 days)', activeUserIds.length+' users', 'across all users', "_drillAnalyticsKpi('active7')")}
      ${_aKpi('📍','Today Sessions', todayLogs.length+' done', [...new Set(todayLogs.map(l=>l.userId))].length+' users active', "_drillAnalyticsKpi('today')")}
    </div>

    <div class="card card-sm" style="margin-bottom:14px">
      <div class="section-title" style="margin-bottom:12px">📈 Activity — Last 14 Days <span style="font-size:11px;color:var(--text3);font-weight:500;margin-left:6px">tap a bar for details</span></div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:60px">
        ${dayKeys.map((d,i) => {
          const h = Math.max(4, Math.round(dayVals[i]/maxDay*56));
          const isToday = d===today;
          const cnt = dayVals[i];
          return `<div onclick="_drillActivityDay('${d}')" role="button" tabindex="0"
            style="flex:1;display:flex;flex-direction:column;align-items:center;cursor:pointer;
              padding:2px 0;border-radius:3px;transition:background .12s"
            onmouseover="this.style.background='rgba(67,160,90,0.10)'"
            onmouseout="this.style.background=''"
            title="${d}: ${cnt} session${cnt===1?'':'s'} — tap for details">
            <div style="width:100%;background:${isToday?'var(--accent)':'var(--g3)'};height:${h}px;border-radius:3px 3px 0 0;opacity:${isToday?1:0.75};pointer-events:none"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
        <span>${dayKeys[0]?.slice(5)}</span><span>Today</span>
      </div>
    </div>

    <div class="card card-sm" style="margin-bottom:14px">
      <div class="section-title" style="margin-bottom:12px">🏆 Module Popularity <span style="font-size:11px;color:var(--text3);font-weight:500;margin-left:6px">tap a row for details</span></div>
      ${topMods.slice(0,6).map(([mod,cnt]) => `
        <div onclick="_drillModulePopularity('${mod}')" role="button" tabindex="0"
          style="display:flex;align-items:center;gap:10px;margin-bottom:8px;
            padding:6px 8px;margin-left:-8px;margin-right:-8px;border-radius:8px;
            cursor:pointer;transition:background .12s"
          onmouseover="this.style.background='rgba(67,160,90,0.06)'"
          onmouseout="this.style.background=''">
          <span style="font-size:18px;width:24px">${getModuleEmoji(mod)}</span>
          <div style="flex:1;pointer-events:none">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:13px;font-weight:600">${getModuleName(mod)}</span>
              <span style="font-size:12px;color:var(--text3)">${cnt}</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(cnt/maxMod*100)}%"></div></div>
          </div>
        </div>`).join('')}
    </div>

    ${dropout.length ? `
    <div class="card card-sm" style="margin-bottom:14px;border-color:rgba(239,154,154,0.3);background:rgba(229,57,53,0.05)">
      <div class="section-title" style="margin-bottom:8px;color:#ef9a9a">⚠️ Inactive 7+ Days (${dropout.length})</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">Consider sending a motivation push. Tap a user to see their full progress.</div>
      ${dropout.slice(0,5).map(uid => {
        const name = _adminUserName(uid);
        return `<div onclick="openUserProgress('${uid}', ${JSON.stringify(name).replace(/"/g,'&quot;')})" role="button" tabindex="0"
          style="display:flex;justify-content:space-between;align-items:center;padding:8px 8px;margin:0 -8px;
            border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px;transition:background .12s"
          onmouseover="this.style.background='rgba(229,57,53,0.08)'"
          onmouseout="this.style.background=''">
          <span style="font-size:13px;color:var(--text);font-weight:600">${name}</span>
          <span style="font-size:12px;color:#ef9a9a">Last: ${userLastActivity[uid]}</span>
        </div>`;
      }).join('')}
      ${dropout.length>5?`<div style="font-size:12px;color:var(--text3);margin-top:6px">+${dropout.length-5} more</div>`:''}
    </div>` : `
    <div class="card card-sm" style="border-color:rgba(67,160,90,0.3);background:rgba(67,160,90,0.05)">
      <div style="font-size:13px;color:var(--g5)">✅ All users active in the last 7 days!</div>
    </div>`}
  `;
}

function _aKpi(emoji, label, val, sub, onclick) {
  const clickable = !!onclick;
  return `<div class="card card-sm"
    ${clickable ? `onclick="${onclick}" role="button" tabindex="0"` : ''}
    style="text-align:center${clickable ? ';cursor:pointer;transition:background .12s,transform .1s,border-color .15s' : ''}"
    ${clickable ? `onmouseover="this.style.background='rgba(67,160,90,0.06)';this.style.borderColor='rgba(67,160,90,0.35)'" onmouseout="this.style.background='';this.style.borderColor=''"` : ''}>
    <div style="font-size:24px">${emoji}</div>
    <div style="font-family:var(--font-display);font-size:26px;color:var(--g5);line-height:1.1;margin:4px 0">${val}</div>
    <div style="font-size:12px;font-weight:700;color:var(--text2)">${label}</div>
    ${sub?`<div style="font-size:11px;color:var(--text3);margin-top:2px">${sub}</div>`:''}
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// PER-USER PROGRESS (Admin)
// ════════════════════════════════════════════════════════════════
async function openUserProgress(userId, userName) {
  // Use the comprehensive _drillUser analytics view (same as Dashboard)
  // Ensure dashboard data is loaded first
  if (!_adminDashboardData) {
    showToast('Loading user data...', 'info');
    let users = [], allLogs = Store.getLogs(), allRuns = Store.getRunLogs();
    try {
      const [usersRes, logsRes, runsRes, onbRes] = await Promise.all([
        Sheets.get('getAllUsers').catch(() => null),
        Sheets.get('getAllLogs').catch(() => null),
        Sheets.get('getAllRunLogs').catch(() => null),
        Sheets.get('getAllOnboarding').catch(() => null),
      ]);
      if (usersRes?.success) users         = usersRes.users || [];
      if (logsRes?.success)  allLogs       = logsRes.logs   || allLogs;
      if (runsRes?.success)  allRuns       = runsRes.logs   || allRuns;
      if (onbRes?.success)   _adminOnboardings = onbRes.onboardings || [];
    } catch(e) {}
    _adminDashboardData = { users, allLogs, allRuns, fetchedAt: new Date() };
  }
  _drillUser(userId);
}

function _calcStreakForUser(userId) {
  // Include both workout dates and run dates
  const wDates = Store.getLogs().filter(l=>l.userId===userId).map(l=>l.date);
  const rDates = Store.getRunLogs().filter(r=>r.userId===userId).map(r=>r.date);
  const dates = [...new Set([...wDates, ...rDates])].sort().reverse();
  if (!dates.length) return 0;
  let streak=0, cur=new Date();
  for (let i=0;i<60;i++) {
    const d=_ymdLocal(cur);
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate()-1); }
    else if (i>0) break;
    else { cur.setDate(cur.getDate()-1); if (!dates.includes(_ymdLocal(cur))) break; }
  }
  return streak;
}

// ════════════════════════════════════════════════════════════════
// ADMIN ANNOUNCEMENT BANNER
// ════════════════════════════════════════════════════════════════
function renderAdminAnnounce() {
  const container = document.getElementById('admin-announce-content');
  if (!container) return;
  const current = Store.getContent('announcement') || { text:'', type:'info', active:false };
  container.innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.6">
      Post a banner that appears at the top of every user's dashboard. Use it for schedule changes, announcements, or motivation messages.
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">Banner Message</label>
      <textarea id="announce-text" class="form-input" rows="3" placeholder="e.g. Gym closed this Saturday. Resume Sunday!">${current.text||''}</textarea>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">Type</label>
      <select id="announce-type" class="form-input">
        <option value="info"    ${(current.type||'info')==='info'   ?'selected':''}>ℹ️ Info (Blue)</option>
        <option value="success" ${current.type==='success'?'selected':''}>✅ Success (Green)</option>
        <option value="warning" ${current.type==='warning'?'selected':''}>⚠️ Warning (Yellow)</option>
        <option value="danger"  ${current.type==='danger' ?'selected':''}>🚨 Urgent (Red)</option>
      </select>
    </div>
    ${current.text && current.active ? `
    <div class="card card-sm" style="margin-bottom:14px;background:rgba(67,160,90,0.08);border-color:rgba(67,160,90,0.2)">
      <div style="font-size:13px;color:var(--g5)">✅ Banner currently active on all dashboards</div>
    </div>` : ''}
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary btn-full" onclick="saveAnnouncement(true)">📣 Publish Banner</button>
      ${current.active ? `<button class="btn btn-ghost btn-full" onclick="saveAnnouncement(false)">🔇 Unpublish</button>` : ''}
    </div>
    <div id="announce-status" style="margin-top:10px;font-size:13px;min-height:16px"></div>
  `;
}

async function saveAnnouncement(active) {
  const text   = document.getElementById('announce-text').value.trim();
  const type   = document.getElementById('announce-type').value;
  const status = document.getElementById('announce-status');
  if (active && !text) { status.style.color='#ef9a9a'; status.textContent='Please enter a message.'; return; }
  const data = { text, type, active, updatedAt: todayStr() };
  Store.setContent('announcement', data);
  await Sheets.post('saveContent', { key:'announcement', value:data });
  status.style.color = 'var(--g5)';
  status.textContent = active ? '✅ Banner published!' : '🔇 Banner unpublished.';
  showToast(active ? 'Announcement published! 📣' : 'Announcement removed.', 'success');
  renderAdminAnnounce();
}

// ════════════════════════════════════════════════════════════════
// CALISTHENICS EXERCISE EDITOR
// ════════════════════════════════════════════════════════════════
function renderCalisthenicsEditor(body) {
  const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
  const caliLevels = _D.modules?.calisthenics?.levels || {};
  const activeLevel = AdminEdit._caliLevel || 1;
  const days = getWeekDays();

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ Edit exercises per level and day. Applies to all users after saving.
    </div>
    <div style="padding:0 16px 12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Level</div>
      <div style="display:flex;gap:8px">
        ${[1,2,3].map(l => `
          <button onclick="selectAdminCaliLevel(${l})"
            style="flex:1;padding:10px;border-radius:12px;border:2px solid ${activeLevel===l?'var(--g4)':'var(--border)'};
              background:${activeLevel===l?'rgba(46,125,70,0.2)':'var(--surface)'};cursor:pointer;font-size:13px;font-weight:700;
              color:${activeLevel===l?'var(--g5)':'var(--text2)'}">
            L${l} ${caliLevels[l]?.name||''}
          </button>`).join('')}
      </div>
    </div>
    ${days.map(day => {
      const appDefault = caliLevels[activeLevel]?.days?.[day] || [];
      const saved = Store.getContent('exercises_calisthenics_l' + activeLevel);
      const savedDay = saved?.days?.[day] || [];
      const exercises = savedDay.length > appDefault.length ? savedDay : appDefault;
      return `
        <div style="margin-bottom:8px">
          <div style="padding:10px 16px;background:rgba(46,125,70,0.15);font-weight:700;font-size:14px;
            display:flex;justify-content:space-between;align-items:center">
            <span>📅 ${day}</span>
            <span style="font-size:12px;color:var(--text3)">${exercises.length} exercises</span>
          </div>
          <div data-day="${day}" data-calilevel="${activeLevel}" style="padding:0 16px">
            ${exercises.map((ex,i) => _caliExCard(ex,i,day)).join('')}
            <button class="add-exercise-btn" onclick="addCaliExercise('${day}')">+ Add Exercise</button>
          </div>
        </div>`;
    }).join('')}`;
  activateEditing(body);

  // Override save for calisthenics
  const btn = document.getElementById('editor-save-btn');
  if (btn) {
    btn.textContent = '💾 Save Calisthenics';
    btn.onclick = saveCalisthenicsEditorChanges;
  }
}

function selectAdminCaliLevel(level) {
  AdminEdit._caliLevel = level;
  renderEditorSection();
}

function _caliExCard(ex, idx, day) {
  return `
    <div class="exercise-card ex-row" data-idx="${idx}" style="margin:10px 0;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.ex-row').remove();markDirty()" title="Delete">✕</button>
      <div class="exercise-body">
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Exercise Name</div>
          <div class="exercise-name editable" data-field="name" contenteditable="true">${ex.name||''}</div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Sets</div>
            <div class="editable" data-field="sets" contenteditable="true" style="font-weight:600">${ex.sets||3}</div>
          </div>
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Reps / Duration</div>
            <div class="editable" data-field="reps" contenteditable="true" style="font-weight:600">${ex.reps||''}</div>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Description</div>
          <div class="editable-block editable" data-field="desc" contenteditable="true" style="font-size:13px;color:var(--text2);line-height:1.6">${ex.desc||''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Demo Link</div>
          <div class="editable" data-field="demo" contenteditable="true" style="font-size:12px;color:var(--g5);word-break:break-all">${ex.demo||''}</div>
        </div>
      </div>
    </div>`;
}

function addCaliExercise(day) {
  const container = document.querySelector(`[data-day="${day}"]`);
  if (!container) return;
  const addBtn = container.querySelector('.add-exercise-btn');
  const div    = document.createElement('div');
  div.innerHTML = _caliExCard({ name:'New Exercise', sets:3, reps:'10 reps', desc:'Enter description.', demo:'' }, 999, day);
  const card = div.firstElementChild;
  activateEditing(card);
  container.insertBefore(card, addBtn);
  markDirty();
  card.querySelector('[data-field="name"]')?.focus();
}

async function saveCalisthenicsEditorChanges() {
  const btn = document.getElementById('editor-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const level = AdminEdit._caliLevel || 1;
    const days  = getWeekDays();
    const result = { days: {} };
    days.forEach(day => {
      const dayEl = document.querySelector(`[data-day="${day}"]`);
      if (!dayEl) {
        result.days[day] = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.calisthenics?.levels?.[level]?.days?.[day] || [];
        return;
      }
      result.days[day] = Array.from(dayEl.querySelectorAll('.ex-row')).map(row => ({
        name:  _text(row, 'name'),
        sets:  parseInt(_text(row, 'sets')) || 3,
        reps:  _text(row, 'reps'),
        desc:  _text(row, 'desc'),
        demo:  _text(row, 'demo'),
        image: '',
      }));
    });
    const key = 'exercises_calisthenics_l' + level;
    Store.setContent(key, result);
    await Sheets.post('saveContent', { key, value: result });
    AdminEdit.isDirty = false;
    showToast('Calisthenics Level ' + level + ' saved! ✅', 'success');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Saved!'; setTimeout(()=>{ if(btn) btn.textContent='💾 Save Calisthenics'; },3000); }
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Calisthenics'; }
  }
}


// ════════════════════════════════════════════════════════════════
// CROSS TRAINING EDITOR (custom — phase × day-type with upgrade variants)
//   Storage keys: exercises_crosstraining_<phase> = { days: { lower:[], mobility:[], singleleg:[], posterior:[] } }
//   Runtime reads via Store.getContent('exercises_crosstraining_' + phase.id)
// ════════════════════════════════════════════════════════════════
function renderCrossTrainingEditor(body) {
  const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
  const mod = _D?.modules?.crosstraining;

  // Phase + day-type metadata is FIXED for this 8-week plan and never
  // changes — base/build/peak × lower/mobility/singleleg/posterior. We
  // hardcode it as a fallback so the editor still renders even if the
  // runtime data tree from data-crosstraining.js failed to populate
  // (e.g. stale cache, file 404). The admin can still add/edit content
  // because exercises are stored under Store.getContent('exercises_
  // crosstraining_<phase>') independently of APP_DATA.
  const FALLBACK_PHASES = [
    { id:'base',  name:'Base',  label:'Phase 1 · Base',  weeks:[1,2,3] },
    { id:'build', name:'Build', label:'Phase 2 · Build', weeks:[4,5,6] },
    { id:'peak',  name:'Peak',  label:'Phase 3 · Peak',  weeks:[7,8]   },
  ];
  const FALLBACK_LABELS = {
    lower:     { emoji:'🦵', name:'Lower Body Strength'        },
    mobility:  { emoji:'🧘', name:'Mobility & Activation'      },
    singleleg: { emoji:'⚡', name:'Single-Leg & Plyometrics'    },
    posterior: { emoji:'🔥', name:'Posterior Chain & Core'     },
  };

  const phases   = (mod?.phases?.length        ? mod.phases        : FALLBACK_PHASES);
  const labels   = (mod?.dayTypeLabels         ? mod.dayTypeLabels : FALLBACK_LABELS);
  const dayTypes = ['lower','mobility','singleleg','posterior'];
  const activePhase = AdminEdit._ctPhase || 'base';

  // Soft warning banner if runtime data is missing — useful diagnostic
  // but does NOT block editing.
  const missingDataBanner = mod ? '' : `
    <div style="margin:0 16px 12px;padding:10px 12px;border-radius:10px;
      background:rgba(240,192,64,0.10);border:1px dashed rgba(240,192,64,0.45);
      font-size:12px;color:var(--accent);line-height:1.5">
      ⚠ Bundled Cross Training defaults didn't load on this device
      (data-crosstraining.js may be 404 on the server, or out-of-date in the
      service-worker cache). The editor still works — your saved entries
      below are read directly from your sheet. To restore the bundled
      defaults: verify <code>js/data-crosstraining.js</code> exists on the
      server, then hard-refresh.
    </div>`;

  body.innerHTML = `
    ${missingDataBanner}
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ Edit Cross Training exercises per phase. Each main exercise can have an optional upgrade variant (chair/wall/dumbbell version) shown below it for users.
    </div>
    <div style="padding:0 16px 12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Phase</div>
      <div style="display:flex;gap:8px">
        ${phases.map(p => `
          <button onclick="selectAdminCtPhase('${p.id}')"
            style="flex:1;padding:10px;border-radius:12px;border:2px solid ${activePhase===p.id?'var(--g4)':'var(--border)'};
              background:${activePhase===p.id?'rgba(46,125,70,0.2)':'var(--surface)'};cursor:pointer;font-size:13px;font-weight:700;
              color:${activePhase===p.id?'var(--g5)':'var(--text2)'}">
            ${p.name}
            <div style="font-size:10px;font-weight:400;color:var(--text3);margin-top:2px">Wk ${p.weeks[0]}–${p.weeks[p.weeks.length-1]}</div>
          </button>`).join('')}
      </div>
    </div>
    ${dayTypes.map(dt => {
      const appDefault = mod?.days?.[activePhase]?.[dt] || [];
      const saved = Store.getContent('exercises_crosstraining_' + activePhase);
      const savedDay = saved?.days?.[dt] || [];
      const exercises = savedDay.length > 0 ? savedDay : appDefault;
      const meta = labels[dt] || { emoji:'💪', name:dt };
      return `
        <div style="margin-bottom:8px">
          <div style="padding:10px 16px;background:rgba(46,125,70,0.15);font-weight:700;font-size:14px;
            display:flex;justify-content:space-between;align-items:center">
            <span>${meta.emoji} ${meta.name}</span>
            <span style="font-size:12px;color:var(--text3)">${exercises.length} exercises</span>
          </div>
          <div data-ctdaytype="${dt}" data-ctphase="${activePhase}" style="padding:0 16px">
            ${exercises.map((ex,i) => _ctExCard(ex,i,dt)).join('')}
            <button class="add-exercise-btn" onclick="addCtExercise('${dt}')">+ Add Exercise</button>
          </div>
        </div>`;
    }).join('')}`;

  activateEditing(body);

  const btn = document.getElementById('editor-save-btn');
  if (btn) {
    btn.textContent = '💾 Save Cross Training';
    btn.onclick = saveCrossTrainingEditorChanges;
  }
}

function selectAdminCtPhase(phaseId) {
  if (AdminEdit.isDirty && !confirm('You have unsaved changes in this phase. Discard them?')) return;
  AdminEdit._ctPhase = phaseId;
  AdminEdit.isDirty = false;
  _resetSaveBtn();
  renderEditorSection();
}

function _ctExCard(ex, idx, dayType) {
  const u = ex.upgrade;
  const hasUpgrade = !!(u && u.name);
  return `
    <div class="exercise-card ex-row" data-idx="${idx}" data-ctday="${dayType}" style="margin:10px 0;position:relative">
      <button class="delete-ex-btn" onclick="this.closest('.ex-row').remove();markDirty()" title="Delete">✕</button>
      <div class="exercise-body">
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Exercise Name</div>
          <div class="exercise-name editable" data-field="name" contenteditable="true">${ex.name||''}</div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:10px">
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Sets</div>
            <div class="editable" data-field="sets" contenteditable="true" style="font-weight:600">${ex.sets||3}</div>
          </div>
          <div style="flex:2">
            <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Reps / Duration</div>
            <div class="editable" data-field="reps" contenteditable="true" style="font-weight:600">${ex.reps||''}</div>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Description</div>
          <div class="editable-block editable" data-field="desc" contenteditable="true" style="font-size:13px;color:var(--text2);line-height:1.6">${ex.desc||''}</div>
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Demo Link</div>
          <div class="editable" data-field="demo" contenteditable="true" style="font-size:12px;color:var(--g5);word-break:break-all">${ex.demo||''}</div>
        </div>

        <!-- Optional upgrade variant -->
        <div class="upgrade-section" data-has-upgrade="${hasUpgrade?'1':'0'}"
          style="padding:10px;border-radius:10px;background:rgba(67,160,90,0.06);border:1px dashed rgba(67,160,90,0.3)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:11px;font-weight:700;color:var(--g5);text-transform:uppercase;letter-spacing:.05em">⬆ Optional Upgrade Variant</span>
            <button onclick="_ctToggleUpgrade(this)"
              style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:11px;padding:3px 10px;cursor:pointer">
              ${hasUpgrade?'Remove':'+ Add'}
            </button>
          </div>
          <div class="upgrade-fields" style="display:${hasUpgrade?'block':'none'}">
            <div style="margin-bottom:8px">
              <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em">Upgrade Name</div>
              <div class="editable" data-upgrade-field="name" contenteditable="true" style="font-weight:600;font-size:13px;color:var(--text)">${u?.name||''}</div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <div style="flex:2">
                <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em">Equipment Label</div>
                <div class="editable" data-upgrade-field="equipment" contenteditable="true" style="font-size:12px;color:var(--text2)">${u?.equipment||''}</div>
              </div>
              <div style="flex:2">
                <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em">Reps</div>
                <div class="editable" data-upgrade-field="reps" contenteditable="true" style="font-size:12px;color:var(--text2)">${u?.reps||''}</div>
              </div>
            </div>
            <div style="margin-bottom:8px">
              <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em">Upgrade Description</div>
              <div class="editable-block editable" data-upgrade-field="desc" contenteditable="true" style="font-size:12px;color:var(--text2);line-height:1.5">${u?.desc||''}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em">Upgrade Demo Link</div>
              <div class="editable" data-upgrade-field="demo" contenteditable="true" style="font-size:11px;color:var(--g5);word-break:break-all">${u?.demo||''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// Toggle the upgrade variant's fields on/off and flip the button label
function _ctToggleUpgrade(btn) {
  const sec     = btn.closest('.upgrade-section');
  const fields  = sec.querySelector('.upgrade-fields');
  const has     = sec.dataset.hasUpgrade === '1';
  if (has) {
    fields.style.display = 'none';
    sec.dataset.hasUpgrade = '0';
    btn.textContent = '+ Add';
  } else {
    fields.style.display = 'block';
    sec.dataset.hasUpgrade = '1';
    btn.textContent = 'Remove';
    activateEditing(sec);
  }
  markDirty();
}

function addCtExercise(dayType) {
  const container = document.querySelector(`[data-ctdaytype="${dayType}"]`);
  if (!container) return;
  const addBtn = container.querySelector('.add-exercise-btn');
  const div    = document.createElement('div');
  div.innerHTML = _ctExCard({ name:'New Exercise', sets:3, reps:'10 reps', desc:'Enter description.', demo:'', upgrade:null }, 999, dayType);
  const card = div.firstElementChild;
  activateEditing(card);
  container.insertBefore(card, addBtn);
  markDirty();
  card.querySelector('[data-field="name"]')?.focus();
}

// Read text from an upgrade-field within a row
function _textUpg(row, field) {
  const el = row.querySelector(`[data-upgrade-field="${field}"]`);
  return el ? el.textContent.trim() : '';
}

async function saveCrossTrainingEditorChanges() {
  const btn = document.getElementById('editor-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    const phase    = AdminEdit._ctPhase || 'base';
    const dayTypes = ['lower','mobility','singleleg','posterior'];
    const result   = { days: {} };

    dayTypes.forEach(dt => {
      const dayEl = document.querySelector(`[data-ctdaytype="${dt}"]`);
      if (!dayEl) {
        // Fallback to built-in if section didn't render (shouldn't happen)
        result.days[dt] = (window.APP_DATA_DEFAULT || window.APP_DATA)
          .modules?.crosstraining?.days?.[phase]?.[dt] || [];
        return;
      }
      result.days[dt] = Array.from(dayEl.querySelectorAll('.ex-row')).map(row => {
        const exercise = {
          name:  _text(row, 'name'),
          sets:  parseInt(_text(row, 'sets')) || 3,
          reps:  _text(row, 'reps'),
          desc:  _text(row, 'desc'),
          demo:  _text(row, 'demo'),
        };
        // Include upgrade only if the section is marked active (Remove button visible)
        const upgSec = row.querySelector('.upgrade-section');
        if (upgSec?.dataset?.hasUpgrade === '1') {
          const u = {
            name:      _textUpg(row, 'name'),
            equipment: _textUpg(row, 'equipment'),
            reps:      _textUpg(row, 'reps'),
            desc:      _textUpg(row, 'desc'),
            demo:      _textUpg(row, 'demo'),
          };
          if (u.name) exercise.upgrade = u;
        }
        return exercise;
      });
    });

    const key = 'exercises_crosstraining_' + phase;
    Store.setContent(key, result);
    // Persist to Google Sheets so all users + devices pick this up
    await Sheets.post('saveContent', { key, value: result });
    AdminEdit.isDirty = false;
    const phaseName = (window.APP_DATA?.modules?.crosstraining?.phases?.find(p=>p.id===phase)?.name) || phase;
    showToast('Cross Training · ' + phaseName + ' saved! ✅', 'success');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ Saved!';
      setTimeout(() => { if (btn) btn.textContent = '💾 Save Cross Training'; }, 3000);
    }
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Cross Training'; }
  }
}


// ════════════════════════════════════════════════════════════════
// LIVE INTERACTIVE ADMIN DASHBOARD
// • Auto-refreshes every 30s
// • Time range filters on every chart (7d / 30d / 90d / 1y)
// • Click any KPI/user/module/day to drill down
// • Click recent activity item to see user's full history
// ════════════════════════════════════════════════════════════════

let _adminOnboardings       = [];
let _adminDashboardInterval = null;
let _adminDashboardData     = null;
let _dashTrendRange         = '30d';   // default for activity trend
let _dashKpiRange           = '7d';    // default for KPI cards

async function renderAdminDashboard() {
  const container = document.getElementById('admin-dashboard-content');
  if (!container) return;

  if (!_adminDashboardData) {
    container.innerHTML = `<div class="dash-grid">${Array(8).fill('<div class="dash-card dash-skeleton"></div>').join('')}</div>`;
  }

  // Quick GS connectivity check — shows banner if unreachable
  const pingRes = await Sheets.get('ping').catch(() => null);
  if (!pingRes?.success) {
    container.innerHTML = `
      <div class="card" style="margin:16px;background:rgba(229,57,53,0.06);border-color:rgba(229,57,53,0.25);padding:28px 20px;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">🔌</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px">Cannot reach Google Sheets backend</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.7">
          The GS web app is not responding. Most likely causes:<br>
          <strong>1.</strong> GS was redeployed → got a new URL. Update <code>_defaultSheetsUrl</code> in <code>app.js</code><br>
          <strong>2.</strong> GS v8 not deployed yet — open Apps Script, paste the new code, click Deploy<br>
          <strong>3.</strong> GS deployment set to "Me only" — must be <strong>Anyone</strong> access
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn btn-primary" onclick="renderAdminDashboard()">🔄 Retry Connection</button>
          <button class="btn btn-ghost" onclick="openSheetsConfig()">⚙️ Update Sheets URL</button>
        </div>
        <div style="font-size:11px;color:var(--text3)">
          Current URL: <code style="font-size:10px;word-break:break-all">${Store.getSheetsConfig().webAppUrl}</code>
        </div>
      </div>`;
    return;
  }

  let users = [], allLogs = Store.getLogs(), allRuns = Store.getRunLogs();
  try {
    const [usersRes, logsRes, runsRes, onbRes] = await Promise.all([
      Sheets.get('getAllUsers').catch(() => null),
      Sheets.get('getAllLogs').catch(() => null),
      Sheets.get('getAllRunLogs').catch(() => null),
      Sheets.get('getAllOnboarding').catch(() => null),
    ]);
    if (usersRes?.success) users         = usersRes.users || [];
    if (logsRes?.success)  allLogs       = logsRes.logs   || allLogs;
    if (runsRes?.success)  allRuns       = runsRes.logs   || allRuns;
    if (onbRes?.success)   _adminOnboardings = onbRes.onboardings || [];

    if (!users.length && allLogs.length) {
      const seen = {};
      allLogs.forEach(l => {
        if (l.userId && !seen[l.userId]) {
          seen[l.userId] = true;
          users.push({ id: l.userId, name: l.name || '', email: l.email || '', role: 'USER' });
        }
      });
    }
  } catch(e) { console.warn('Dashboard fetch:', e.message); }

  _adminDashboardData = { users, allLogs, allRuns, fetchedAt: new Date() };
  _rebuildUserMap();   // ensure drill-downs can resolve userId → name immediately
  renderAdminStats(); // Update header KPI cards now that we have real cross-user data
  _renderDashboardContent();

  const lr = document.getElementById('dash-last-refresh');
  if (lr) lr.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });

  if (_adminDashboardInterval) clearInterval(_adminDashboardInterval);
  _adminDashboardInterval = setInterval(() => {
    const dashTab = document.getElementById('admin-tab-dashboard');
    if (dashTab && dashTab.style.display !== 'none') {
      renderAdminDashboard();
    } else {
      clearInterval(_adminDashboardInterval);
      _adminDashboardInterval = null;
    }
  }, 30000);
}

// ── Date helpers ──
function _dashDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function _dashRangeStart(range) {
  if (range === '7d')   return _dashDaysAgo(7);
  if (range === '30d')  return _dashDaysAgo(30);
  if (range === '90d')  return _dashDaysAgo(90);
  if (range === '1y')   return _dashDaysAgo(365);
  return _dashDaysAgo(30);
}

function _dashRangeLabel(range) {
  return ({ '7d':'Last 7 days', '30d':'Last 30 days', '90d':'Last 90 days', '1y':'Last 365 days' })[range] || 'Last 30 days';
}

// Switch range for activity trend, then re-render
function _setDashTrendRange(range, btn) {
  _dashTrendRange = range;
  document.querySelectorAll('[data-range-group="trend"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderDashboardContent();
}

function _setDashKpiRange(range, btn) {
  _dashKpiRange = range;
  document.querySelectorAll('[data-range-group="kpi"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderDashboardContent();
}

function _renderDashboardContent() {
  const container = document.getElementById('admin-dashboard-content');
  if (!container || !_adminDashboardData) return;

  const { users, allLogs, allRuns } = _adminDashboardData;

  // If GS returned nothing at all, show a clear diagnostic instead of blank screen
  if (!users.length && !allLogs.length && !allRuns.length) {
    container.innerHTML = `
      <div class="card" style="margin:16px;background:rgba(240,192,64,0.06);border-color:rgba(240,192,64,0.25);text-align:center;padding:32px 20px">
        <div style="font-size:40px;margin-bottom:12px">⚠️</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px">No data received from Google Sheets</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.6">
          Possible causes:<br>
          <strong>1.</strong> GS v8 hasn't been deployed yet — paste the new GS code and deploy<br>
          <strong>2.</strong> GS was redeployed as a NEW deployment — update the URL in <code>app.js → _defaultSheetsUrl</code><br>
          <strong>3.</strong> GS has a script error — check Apps Script → Executions for errors
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="renderAdminDashboard()">🔄 Retry</button>
          <button class="btn btn-ghost" onclick="openSheetsConfig()">⚙️ Check Sheets URL</button>
        </div>
        <div style="margin-top:16px;font-size:12px;color:var(--text3)">
          Current GS URL: <code style="font-size:10px;word-break:break-all">${Store.getSheetsConfig().webAppUrl || 'not set'}</code>
        </div>
      </div>`;
    return;
  }

  // Wrap the render in try/catch — the huge template literal can crash silently
  // leaving innerHTML blank if any interpolated function throws
  try {
    _renderDashboardHTML(container, users, allLogs, allRuns);
  } catch(err) {
    console.error('[FitFlow] Dashboard render error:', err);
    container.innerHTML = `
      <div class="card" style="margin:16px;background:rgba(229,57,53,0.06);border-color:rgba(229,57,53,0.25);text-align:center;padding:28px 20px">
        <div style="font-size:36px;margin-bottom:10px">❌</div>
        <div style="font-weight:700;margin-bottom:6px">Dashboard render error</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px;font-family:monospace">${err.message}</div>
        <button class="btn btn-primary" onclick="renderAdminDashboard()">🔄 Retry</button>
      </div>`;
  }
}

// The actual dashboard HTML builder — separated so errors can be caught above
function _renderDashboardHTML(container, users, allLogs, allRuns) {

  const today = todayStr();
  const yesterday = _dashDaysAgo(1);
  const monday = getMonday();
  const last7  = _dashDaysAgo(7);
  const last30 = _dashDaysAgo(30);
  const trendStart = _dashRangeStart(_dashTrendRange);
  const kpiStart   = _dashRangeStart(_dashKpiRange);

  const realUsers     = users.filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');
  const activeUsers   = realUsers.filter(u => (u.status||'ACTIVE').toUpperCase() === 'ACTIVE');
  const newInRange    = realUsers.filter(u => u.createdDate >= kpiStart).length;

  const todayLogs    = allLogs.filter(l => l.date === today);
  const yestLogs     = allLogs.filter(l => l.date === yesterday);
  const rangeKpiLogs = allLogs.filter(l => l.date >= kpiStart);

  // Compare against equal-length previous period for KPI trend
  const kpiDays = (_dashKpiRange === '7d') ? 7 : (_dashKpiRange === '30d') ? 30 : (_dashKpiRange === '90d') ? 90 : 365;
  const prevPeriodStart = _dashDaysAgo(kpiDays * 2);
  const prevPeriodEnd   = _dashDaysAgo(kpiDays + 1);
  const prevKpiLogs = allLogs.filter(l => l.date >= prevPeriodStart && l.date <= prevPeriodEnd);
  const wowSessions = prevKpiLogs.length ? Math.round((rangeKpiLogs.length - prevKpiLogs.length) / prevKpiLogs.length * 100) : null;

  const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
  const activeNow = allLogs.filter(l => l.timestamp && l.timestamp > oneHourAgo);
  const activeNowUserIds = [...new Set(activeNow.map(l => l.userId))];

  const activeIdsKpi = [...new Set(rangeKpiLogs.map(l => l.userId))];
  const engagementRate = realUsers.length ? Math.round(activeIdsKpi.length / realUsers.length * 100) : 0;

  const totalKm   = allRuns.reduce((sum,r) => sum + (r.distance||0), 0);
  const totalKcal = allRuns.reduce((sum,r) => sum + ((r.distance||0) * 60), 0);

  // ── Activity trend (range-based, daily buckets) ──
  const dayActivity = {};
  const trendDays = (_dashTrendRange === '7d') ? 7 : (_dashTrendRange === '30d') ? 30 : (_dashTrendRange === '90d') ? 90 : 365;
  for (let i = trendDays - 1; i >= 0; i--) dayActivity[_dashDaysAgo(i)] = 0;
  allLogs.forEach(l => { if (dayActivity[l.date] !== undefined) dayActivity[l.date]++; });

  // For 90d / 1y, group by week to keep bars readable
  let trendKeys = Object.keys(dayActivity);
  let trendVals = Object.values(dayActivity);
  if (_dashTrendRange === '1y') {
    // Group by month
    const monthly = {};
    trendKeys.forEach((k, i) => {
      const ym = k.substring(0, 7);
      monthly[ym] = (monthly[ym] || 0) + trendVals[i];
    });
    trendKeys = Object.keys(monthly);
    trendVals = Object.values(monthly);
  }

  // Sub-period sums for trend label
  const trendTotal = trendVals.reduce((a,b) => a+b, 0);
  const trendThis  = allLogs.filter(l => l.date >= trendStart).length;
  const trendDaysHalf = Math.floor(trendDays / 2);
  const trendPrevStart = _dashDaysAgo(trendDays * 2);
  const trendPrevEnd   = _dashDaysAgo(trendDays + 1);
  const trendPrev      = allLogs.filter(l => l.date >= trendPrevStart && l.date <= trendPrevEnd).length;
  const trendDelta     = trendPrev ? Math.round((trendThis - trendPrev) / trendPrev * 100) : null;

  // ── Module breakdown (range-aware) ──
  const modCounts = {};
  rangeKpiLogs.forEach(l => {
    const m = (l.module||'').startsWith('custom_') ? 'custom' : (l.module||'unknown');
    modCounts[m] = (modCounts[m]||0) + 1;
  });
  const topMods = Object.entries(modCounts).sort((a,b)=>b[1]-a[1]).slice(0, 6);

  // ── Top users (range-aware) ──
  const userSessionCount = {};
  rangeKpiLogs.forEach(l => { userSessionCount[l.userId] = (userSessionCount[l.userId]||0) + 1; });
  const topUsers = Object.entries(userSessionCount)
    .map(([uid, count]) => {
      const u = realUsers.find(u => u.id === uid);
      return u ? { id: uid, name: u.name||'?', email: u.email, count } : null;
    })
    .filter(Boolean)
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  // ── At-risk users ──
  const userLastActivity = {};
  allLogs.forEach(l => { if (!userLastActivity[l.userId] || l.date > userLastActivity[l.userId]) userLastActivity[l.userId] = l.date; });
  const dropoutUsers = realUsers
    .filter(u => {
      const last = userLastActivity[u.id];
      return !last || last < last7;
    })
    .map(u => ({ ...u, lastActivity: userLastActivity[u.id] || 'Never' }))
    .slice(0, 8);

  // ── Recent activity feed ──
  const recentActivity = [...allLogs, ...allRuns.map(r => ({...r, module:'run', distance:r.distance}))]
    .filter(l => l.timestamp)
    .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''))
    .slice(0, 15);

  container.innerHTML = `
    <!-- LIVE BAR -->
    <div class="dash-live-bar">
      <div class="dash-live-pill">
        <span class="dash-live-dot"></span>
        <strong>${activeNowUserIds.length}</strong> active in last hour
      </div>
      <div class="dash-live-meta">
        ${realUsers.length} total users · ${allLogs.length} workouts · ${allRuns.length} runs · ${totalKm.toFixed(1)} km
      </div>
    </div>

    <!-- KPI RANGE TOGGLE -->
    <div class="dash-range-bar">
      <div class="dash-range-label">📊 KPI period:</div>
      <div class="dash-range-tabs">
        ${['7d','30d','90d','1y'].map(r => `
          <button class="dash-range-tab ${_dashKpiRange===r?'active':''}" data-range-group="kpi" onclick="_setDashKpiRange('${r}', this)">${r==='1y'?'1Y':r.toUpperCase()}</button>
        `).join('')}
      </div>
    </div>

    <!-- TOP ROW: 4 KPI cards (clickable for drill-down) -->
    <div class="dash-grid dash-grid-4">
      <div class="dash-card dash-kpi dash-kpi-green dash-clickable" onclick="_drillKpi('today')">
        <div class="dash-kpi-icon">📅</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val">${todayLogs.length}</div>
          <div class="dash-kpi-label">Today's Sessions</div>
          <div class="dash-kpi-sub">${[...new Set(todayLogs.map(l=>l.userId))].length} users active</div>
        </div>
        ${yestLogs.length ? `<div class="dash-kpi-trend ${todayLogs.length >= yestLogs.length?'up':'down'}">${todayLogs.length >= yestLogs.length?'↑':'↓'} vs yesterday</div>` : ''}
      </div>

      <div class="dash-card dash-kpi dash-kpi-blue dash-clickable" onclick="_drillKpi('range')">
        <div class="dash-kpi-icon">📈</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val">${rangeKpiLogs.length}</div>
          <div class="dash-kpi-label">Sessions ${_dashRangeLabel(_dashKpiRange).toLowerCase()}</div>
          <div class="dash-kpi-sub">${prevKpiLogs.length} previous period</div>
        </div>
        ${wowSessions !== null ? `<div class="dash-kpi-trend ${wowSessions >= 0?'up':'down'}">${wowSessions >= 0?'↑':'↓'} ${Math.abs(wowSessions)}%</div>` : ''}
      </div>

      <div class="dash-card dash-kpi dash-kpi-purple dash-clickable" onclick="_drillKpi('users')">
        <div class="dash-kpi-icon">👥</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val">${activeIdsKpi.length}</div>
          <div class="dash-kpi-label">Active Users (${_dashKpiRange})</div>
          <div class="dash-kpi-sub">${engagementRate}% engagement</div>
        </div>
      </div>

      <div class="dash-card dash-kpi dash-kpi-amber dash-clickable" onclick="_drillKpi('newusers')">
        <div class="dash-kpi-icon">✨</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val">${newInRange}</div>
          <div class="dash-kpi-label">New Users (${_dashKpiRange})</div>
          <div class="dash-kpi-sub">${realUsers.length} total</div>
        </div>
      </div>
    </div>

    <!-- 2-COL: Activity trend + Module breakdown -->
    <div class="dash-grid dash-grid-2">
      <div class="dash-card">
        <div class="dash-card-head">
          <h3 class="dash-card-title">📊 Activity Trend</h3>
          <div class="dash-range-tabs">
            ${['7d','30d','90d','1y'].map(r => `
              <button class="dash-range-tab ${_dashTrendRange===r?'active':''}" data-range-group="trend" onclick="_setDashTrendRange('${r}', this)">${r==='1y'?'1Y':r.toUpperCase()}</button>
            `).join('')}
          </div>
        </div>
        <div class="dash-spark-info">
          <span><strong>${trendTotal}</strong> total · <strong>${trendThis}</strong> last ${trendDays}d ${trendDelta!==null?(trendDelta>=0?'<span style="color:var(--g5)">↑ '+trendDelta+'%</span>':'<span style="color:#ef9a9a">↓ '+Math.abs(trendDelta)+'%</span>'):''}</span>
        </div>
        <div class="dash-spark">
          ${trendKeys.map((k, i) => {
            const max = Math.max(...trendVals, 1);
            const h = Math.max(2, Math.round(trendVals[i] / max * 80));
            const isToday = k === today;
            const safeKey = k.replace(/'/g, "\\'");
            return `<div class="dash-spark-bar-wrap" title="${k}: ${trendVals[i]} sessions"
              onclick="_drillDay('${safeKey}', '${_dashTrendRange}')">
              <div class="dash-spark-bar ${isToday ? 'dash-spark-today' : ''}" style="height:${h}px"></div>
            </div>`;
          }).join('')}
        </div>
        <div class="dash-spark-axis">
          <span>${trendKeys[0] ? _shortDate(trendKeys[0]) : ''}</span>
          <span>${trendKeys[Math.floor(trendKeys.length/2)] ? _shortDate(trendKeys[Math.floor(trendKeys.length/2)]) : ''}</span>
          <span>${trendKeys[trendKeys.length-1] ? _shortDate(trendKeys[trendKeys.length-1]) : ''}</span>
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-head">
          <h3 class="dash-card-title">🏋️ Top Modules</h3>
          <span class="dash-card-sub">${_dashRangeLabel(_dashKpiRange)}</span>
        </div>
        <div class="dash-mod-list">
          ${topMods.length ? topMods.map(([mod, n]) => {
            const pct = Math.round(n / topMods[0][1] * 100);
            const safeMod = mod.replace(/'/g, "\\'");
            return `
              <div class="dash-mod-row dash-clickable" onclick="_drillModule('${safeMod}')">
                <div class="dash-mod-label">${_modIcon(mod)} ${_modName(mod)}</div>
                <div class="dash-mod-bar"><div class="dash-mod-fill" style="width:${pct}%"></div></div>
                <div class="dash-mod-count">${n}</div>
              </div>`;
          }).join('') : '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center">No activity yet</div>'}
        </div>
      </div>
    </div>

    <!-- 2-COL: Top users + At-risk users -->
    <div class="dash-grid dash-grid-2">
      <div class="dash-card">
        <div class="dash-card-head">
          <h3 class="dash-card-title">🏆 Top Users</h3>
          <span class="dash-card-sub">${_dashRangeLabel(_dashKpiRange)}</span>
        </div>
        <div class="dash-user-list">
          ${topUsers.length ? topUsers.map((u,i) => {
            const safeId = (u.id||'').replace(/'/g, "\\'");
            return `
            <div class="dash-user-row dash-clickable" onclick="_drillUser('${safeId}')">
              <div class="dash-user-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
              <div class="dash-user-info">
                <div class="dash-user-name">${u.name}</div>
                <div class="dash-user-email">${u.email||''}</div>
              </div>
              <div class="dash-user-count">${u.count} <span style="font-size:10px;color:var(--text3)">sessions</span></div>
            </div>`;
          }).join('') : '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center">No active users in this period</div>'}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-head">
          <h3 class="dash-card-title">⚠️ At-Risk Users</h3>
          <span class="dash-card-sub">No activity 7+ days</span>
        </div>
        <div class="dash-user-list">
          ${dropoutUsers.length ? dropoutUsers.map(u => {
            const safeId = (u.id||'').replace(/'/g, "\\'");
            return `
            <div class="dash-user-row dash-user-warn dash-clickable" onclick="_drillUser('${safeId}')">
              <div class="dash-user-info">
                <div class="dash-user-name">${u.name||'—'}</div>
                <div class="dash-user-email">${u.email||''}</div>
              </div>
              <div class="dash-user-meta">Last: <strong>${u.lastActivity}</strong></div>
            </div>`;
          }).join('') : '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center">🎉 All users active!</div>'}
        </div>
      </div>
    </div>

    <!-- Onboarding preferences widget -->
    ${_renderOnboardingTrendsCard()}

    <!-- Recent activity feed -->
    <div class="dash-card">
      <div class="dash-card-head">
        <h3 class="dash-card-title">⚡ Recent Activity</h3>
        <span class="dash-card-sub">Click an item to see user history</span>
      </div>
      <div class="dash-feed">
        ${recentActivity.length ? recentActivity.map(a => {
          const u = realUsers.find(u => u.id === a.userId);
          const time = a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : '';
          const isRun = a.module === 'run' || (a.distance !== undefined);
          const actType = a.activityType || 'run';
          const safeId = (a.userId||'').replace(/'/g, "\\'");
          return `
            <div class="dash-feed-item dash-clickable" onclick="_drillUser('${safeId}')">
              <div class="dash-feed-icon">${isRun ? _activityIcon(actType) : _modIcon(a.module)}</div>
              <div class="dash-feed-info">
                <div class="dash-feed-text"><strong>${u?.name||a.userId||'Unknown'}</strong> completed <strong>${isRun?(a.distance||0).toFixed(2)+' km '+_activityName(actType):_modName(a.module)}</strong></div>
                <div class="dash-feed-time">${time}</div>
              </div>
            </div>`;
        }).join('') : '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center">No recent activity</div>'}
      </div>
    </div>

    <!-- Lifetime totals -->
    <div class="dash-grid dash-grid-4 dash-totals">
      <div class="dash-total"><div class="dash-total-icon">🎯</div><div class="dash-total-val">${allLogs.length.toLocaleString()}</div><div class="dash-total-lbl">Total Workouts</div></div>
      <div class="dash-total"><div class="dash-total-icon">🏃</div><div class="dash-total-val">${allRuns.length.toLocaleString()}</div><div class="dash-total-lbl">Total Runs</div></div>
      <div class="dash-total"><div class="dash-total-icon">📍</div><div class="dash-total-val">${totalKm.toFixed(1)}</div><div class="dash-total-lbl">Total km</div></div>
      <div class="dash-total"><div class="dash-total-icon">🔥</div><div class="dash-total-val">${Math.round(totalKcal).toLocaleString()}</div><div class="dash-total-lbl">Total kcal</div></div>
    </div>
  `;
}
function _shortDate(ymd) {
  if (!ymd) return '';
  // For 1y view, ymd is YYYY-MM
  if (ymd.length === 7) {
    const [y, m] = ymd.split('-');
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1] + ' ' + y.slice(2);
  }
  const d = new Date(ymd);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

// ─────────────────────────────────────────────────────────────────
// DRILL-DOWN MODAL
// ─────────────────────────────────────────────────────────────────
function _openDrillModal(title, html) {
  let modal = document.getElementById('modal-dash-drill');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-dash-drill';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-sheet" style="max-width:720px;max-height:88vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;position:sticky;top:0;background:var(--bg2);padding:8px 0 12px;z-index:5">
          <h3 id="dash-drill-title" style="font-size:18px;margin:0;font-weight:700"></h3>
          <button onclick="closeModal('modal-dash-drill')" style="background:transparent;border:none;color:var(--text2);font-size:22px;cursor:pointer;padding:4px 10px">×</button>
        </div>
        <div id="dash-drill-body"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('dash-drill-title').innerHTML = title;
  document.getElementById('dash-drill-body').innerHTML = html;
  openModal('modal-dash-drill');
}

// ── Drill: KPI card clicked ──
function _drillKpi(which) {
  const { users, allLogs } = _adminDashboardData;
  const realUsers = users.filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');
  const today = todayStr();
  const kpiStart = _dashRangeStart(_dashKpiRange);

  if (which === 'today') {
    const list = allLogs.filter(l => l.date === today)
      .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));
    const html = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        ${list.length} session${list.length===1?'':'s'} from ${[...new Set(list.map(l=>l.userId))].length} user${[...new Set(list.map(l=>l.userId))].length===1?'':'s'} today.
      </div>
      ${list.length ? list.map(l => {
        const u = realUsers.find(u => u.id === l.userId);
        const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
        return `<div class="dash-feed-item">
          <div class="dash-feed-icon">${_modIcon(l.module)}</div>
          <div class="dash-feed-info">
            <div class="dash-feed-text"><strong>${u?.name||l.userId}</strong> · ${_modName(l.module)}</div>
            <div class="dash-feed-time">${time}</div>
          </div>
        </div>`;
      }).join('') : '<div style="text-align:center;color:var(--text3);padding:32px">No sessions logged today yet.</div>'}
    `;
    _openDrillModal('📅 Today\'s Sessions', html);
  }

  else if (which === 'range') {
    // Show breakdown by module + by user
    const list = allLogs.filter(l => l.date >= kpiStart);
    const modCounts = {};
    list.forEach(l => {
      const m = (l.module||'').startsWith('custom_') ? 'custom' : (l.module||'unknown');
      modCounts[m] = (modCounts[m]||0)+1;
    });
    const userCounts = {};
    list.forEach(l => { userCounts[l.userId] = (userCounts[l.userId]||0)+1; });
    const sortedUsers = Object.entries(userCounts).sort((a,b)=>b[1]-a[1]);

    const html = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        ${list.length} sessions ${_dashRangeLabel(_dashKpiRange).toLowerCase()}.
      </div>

      <div class="section-title" style="margin-bottom:8px">By Module</div>
      <div class="dash-mod-list" style="margin-bottom:18px">
        ${Object.entries(modCounts).sort((a,b)=>b[1]-a[1]).map(([mod, n]) => {
          const pct = Math.round(n / list.length * 100);
          return `<div class="dash-mod-row">
            <div class="dash-mod-label">${_modIcon(mod)} ${_modName(mod)}</div>
            <div class="dash-mod-bar"><div class="dash-mod-fill" style="width:${pct}%"></div></div>
            <div class="dash-mod-count">${n}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="section-title" style="margin-bottom:8px">By User</div>
      <div class="dash-user-list">
        ${sortedUsers.map(([uid, n]) => {
          const u = realUsers.find(u => u.id === uid);
          const logEntry = list.find(l => l.userId === uid);
          const displayName = u?.name || logEntry?.name || '';
          const displayEmail = u?.email || logEntry?.email || '';
          const label = displayName || displayEmail || (uid.startsWith('u_') ? 'User #' + uid.replace('u_','').slice(-6) : uid);
          return `<div class="dash-user-row">
            <div class="dash-user-info">
              <div class="dash-user-name">${label}</div>
              <div class="dash-user-email">${displayEmail}</div>
            </div>
            <div class="dash-user-count">${n}</div>
          </div>`;
        }).join('') || '<div style="text-align:center;color:var(--text3);padding:24px">No data</div>'}
      </div>
    `;
    _openDrillModal('📈 Sessions ' + _dashRangeLabel(_dashKpiRange), html);
  }

  else if (which === 'users') {
    const list = allLogs.filter(l => l.date >= kpiStart);
    const userCounts = {};
    list.forEach(l => { userCounts[l.userId] = (userCounts[l.userId]||0)+1; });
    const activeUserList = Object.entries(userCounts)
      .map(([uid, n]) => ({ ...realUsers.find(u => u.id === uid), id: uid, sessionCount: n }))
      .filter(u => u.email)
      .sort((a,b) => b.sessionCount - a.sessionCount);
    const html = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        ${activeUserList.length} of ${realUsers.length} users were active ${_dashRangeLabel(_dashKpiRange).toLowerCase()}.
      </div>
      <div class="dash-user-list">
        ${activeUserList.map(u => {
          const safeId = (u.id||'').replace(/'/g, "\\'");
          return `<div class="dash-user-row dash-clickable" onclick="closeModal('modal-dash-drill'); setTimeout(()=>_drillUser('${safeId}'),200)">
            <div class="dash-user-info">
              <div class="dash-user-name">${u.name||'?'}</div>
              <div class="dash-user-email">${u.email||''}</div>
            </div>
            <div class="dash-user-count">${u.sessionCount}</div>
          </div>`;
        }).join('') || '<div style="text-align:center;color:var(--text3);padding:24px">No active users</div>'}
      </div>
    `;
    _openDrillModal('👥 Active Users · ' + _dashRangeLabel(_dashKpiRange), html);
  }

  else if (which === 'newusers') {
    const newList = realUsers.filter(u => u.createdDate >= kpiStart)
      .sort((a,b) => (b.createdDate||'').localeCompare(a.createdDate||''));
    const html = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        ${newList.length} new user${newList.length===1?'':'s'} signed up ${_dashRangeLabel(_dashKpiRange).toLowerCase()}.
      </div>
      <div class="dash-user-list">
        ${newList.length ? newList.map(u => `
          <div class="dash-user-row">
            <div class="dash-user-info">
              <div class="dash-user-name">${u.name||'?'}</div>
              <div class="dash-user-email">${u.email||''}</div>
            </div>
            <div class="dash-user-meta">Joined: <strong>${u.createdDate}</strong></div>
          </div>`).join('') : '<div style="text-align:center;color:var(--text3);padding:24px">No new users in this period</div>'}
      </div>
    `;
    _openDrillModal('✨ New Users · ' + _dashRangeLabel(_dashKpiRange), html);
  }
}

// ── Drill: clicked a day in the sparkline ──
function _drillDay(dateStr, range) {
  const { users, allLogs, allRuns } = _adminDashboardData;
  const realUsers = users.filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');

  let dayLogs = [], dayRuns = [];
  if (range === '1y') {
    // dateStr is YYYY-MM, filter all in that month
    dayLogs = allLogs.filter(l => (l.date||'').startsWith(dateStr));
    dayRuns = allRuns.filter(r => (r.date||'').startsWith(dateStr));
  } else {
    dayLogs = allLogs.filter(l => l.date === dateStr);
    dayRuns = allRuns.filter(r => r.date === dateStr);
  }

  const all = [...dayLogs, ...dayRuns.map(r => ({...r, module:'run', distance:r.distance}))]
    .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));

  const html = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
      ${all.length} activit${all.length===1?'y':'ies'} from ${[...new Set(all.map(l=>l.userId))].length} user${[...new Set(all.map(l=>l.userId))].length===1?'':'s'}.
    </div>
    <div class="dash-feed">
      ${all.length ? all.map(l => {
        const u = realUsers.find(u => u.id === l.userId);
        const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
        const isRun = l.module === 'run';
        const actType = l.activityType || 'run';
        return `<div class="dash-feed-item">
          <div class="dash-feed-icon">${isRun ? _activityIcon(actType) : _modIcon(l.module)}</div>
          <div class="dash-feed-info">
            <div class="dash-feed-text"><strong>${u?.name||l.userId}</strong> · ${isRun?(l.distance||0).toFixed(2)+' km '+_activityName(actType):_modName(l.module)}</div>
            <div class="dash-feed-time">${time}</div>
          </div>
        </div>`;
      }).join('') : '<div style="text-align:center;color:var(--text3);padding:24px">No activity</div>'}
    </div>
  `;
  const titleDate = range === '1y'
    ? _shortDate(dateStr)
    : new Date(dateStr).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  _openDrillModal('📅 ' + titleDate, html);
}

// ── Drill: clicked a module ──
function _drillModule(mod) {
  const { users, allLogs } = _adminDashboardData;
  const realUsers = users.filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');
  const kpiStart = _dashRangeStart(_dashKpiRange);

  const matching = allLogs.filter(l => {
    const m = (l.module||'').startsWith('custom_') ? 'custom' : (l.module||'unknown');
    return m === mod && l.date >= kpiStart;
  });

  // Group by user
  const userCounts = {};
  matching.forEach(l => { userCounts[l.userId] = (userCounts[l.userId]||0)+1; });
  const sortedUsers = Object.entries(userCounts).sort((a,b)=>b[1]-a[1]);

  const html = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
      ${matching.length} sessions across ${sortedUsers.length} user${sortedUsers.length===1?'':'s'} (${_dashRangeLabel(_dashKpiRange).toLowerCase()}).
    </div>
    <div class="dash-user-list">
      ${sortedUsers.map(([uid, n]) => {
        const u = realUsers.find(u => u.id === uid);
        const safeId = uid.replace(/'/g, "\\'");
        return `<div class="dash-user-row dash-clickable" onclick="closeModal('modal-dash-drill');setTimeout(()=>_drillUser('${safeId}'),200)">
          <div class="dash-user-info">
            <div class="dash-user-name">${u?.name||uid}</div>
            <div class="dash-user-email">${u?.email||''}</div>
          </div>
          <div class="dash-user-count">${n}</div>
        </div>`;
      }).join('') || '<div style="text-align:center;color:var(--text3);padding:24px">No usage</div>'}
    </div>
  `;
  _openDrillModal(_modIcon(mod) + ' ' + _modName(mod) + ' · ' + _dashRangeLabel(_dashKpiRange), html);
}


// Returns HTML card showing user's onboarding selections (modules, goal, body stats)

function _renderOnboardingTrendsCard() {
  if (!_adminOnboardings || !_adminOnboardings.length) return '';
  const goalCounts = {};
  const modSelections = {};
  const fitCounts = {};
  _adminOnboardings.forEach(o => {
    if (o.goal) goalCounts[o.goal] = (goalCounts[o.goal]||0)+1;
    if (o.fitnessLevel) fitCounts[o.fitnessLevel] = (fitCounts[o.fitnessLevel]||0)+1;
    (o.modules||[]).forEach(m => { modSelections[m] = (modSelections[m]||0)+1; });
  });
  const total = _adminOnboardings.length;
  const goalLabels = { lose:'Lose Weight', gain:'Gain Muscle', tone:'Tone Body', maintain:'Maintain', endurance:'Endurance' };
  const sortedGoals = Object.entries(goalCounts).sort((a,b)=>b[1]-a[1]);
  const sortedMods  = Object.entries(modSelections).sort((a,b)=>b[1]-a[1]);
  const maxMod = sortedMods[0]?.[1] || 1;
  return `
    <div class="dash-card" style="margin-bottom:14px">
      <div class="dash-card-head">
        <h3 class="dash-card-title">📋 Onboarding Insights</h3>
        <span class="dash-card-sub">${total} user${total===1?'':'s'} onboarded</span>
      </div>
      <div class="dash-grid dash-grid-2" style="gap:14px;margin-bottom:0">
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;font-weight:600">Selected Modules</div>
          <div class="dash-mod-list">
            ${sortedMods.length ? sortedMods.map(([mod, n]) => {
              const pct = Math.round(n / maxMod * 100);
              const userPct = Math.round(n / total * 100);
              return `<div class="dash-mod-row">
                <div class="dash-mod-label">${_modIcon(mod)} ${_modName(mod)}</div>
                <div class="dash-mod-bar"><div class="dash-mod-fill" style="width:${pct}%"></div></div>
                <div class="dash-mod-count">${n} <span style="font-size:10px;color:var(--text3)">${userPct}%</span></div>
              </div>`;
            }).join('') : '<div style="color:var(--text3);font-size:12px;padding:12px;text-align:center">No data</div>'}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;font-weight:600">Goals</div>
          <div class="dash-mod-list">
            ${sortedGoals.length ? sortedGoals.map(([g, n]) => {
              const pct = Math.round(n / total * 100);
              return `<div class="dash-mod-row">
                <div class="dash-mod-label">${goalLabels[g] || g}</div>
                <div class="dash-mod-bar"><div class="dash-mod-fill" style="width:${pct}%"></div></div>
                <div class="dash-mod-count">${n}</div>
              </div>`;
            }).join('') : '<div style="color:var(--text3);font-size:12px;padding:12px;text-align:center">No data</div>'}
          </div>
          ${Object.keys(fitCounts).length ? `
            <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-top:14px;margin-bottom:8px;font-weight:600">Fitness Level</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${Object.entries(fitCounts).sort((a,b)=>b[1]-a[1]).map(([level, n]) => `
                <div style="background:rgba(67,160,90,0.10);border:1px solid rgba(67,160,90,0.25);padding:5px 12px;border-radius:50px;font-size:12px">
                  <span style="font-weight:600">${level}</span>
                  <span style="color:var(--text3);margin-left:6px">${n}</span>
                </div>
              `).join('')}
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

function _renderOnboardingCard(userId) {
  const onb = _adminOnboardings.find(o => o.userId === userId);
  if (!onb) {
    return `<div class="dash-card" style="margin-bottom:14px;background:rgba(240,192,64,0.06);border-color:rgba(240,192,64,0.2)">
      <div style="font-size:12px;color:var(--accent)">📋 Onboarding data not yet recorded for this user.</div>
    </div>`;
  }
  const moduleNames = (onb.modules || []).map(m => _modIcon(m) + ' ' + _modName(m));
  const goalLabel = ({ lose:'Lose Weight', gain:'Gain Muscle', tone:'Tone Body', maintain:'Maintain Fitness', endurance:'Build Endurance' })[onb.goal] || onb.goal || '—';
  return `
    <div class="dash-card" style="margin-bottom:14px;background:rgba(67,160,90,0.04);border-color:rgba(67,160,90,0.2)">
      <div class="dash-card-head" style="margin-bottom:10px">
        <h3 class="dash-card-title">📋 Onboarding Profile</h3>
        <span class="dash-card-sub">${onb.submittedAt ? new Date(onb.submittedAt).toLocaleDateString('en-IN') : ''}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
        <div>
          <div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Goal</div>
          <div style="color:var(--text);font-weight:600">${goalLabel}</div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Fitness Level</div>
          <div style="color:var(--text);font-weight:600">${onb.fitnessLevel || '—'}</div>
        </div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <div style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Selected Modules · ${moduleNames.length}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${moduleNames.length ? moduleNames.map(m => `<span style="background:rgba(67,160,90,0.12);color:var(--g5);border:1px solid rgba(67,160,90,0.3);padding:4px 10px;border-radius:50px;font-size:12px;font-weight:500">${m}</span>`).join('') : '<span style="color:var(--text3);font-size:12px">None selected</span>'}
        </div>
      </div>
      ${onb.age || onb.weight || onb.height ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
          ${onb.age ? `<div><div style="font-size:18px;font-weight:700;color:var(--text)">${onb.age}</div><div style="font-size:10px;color:var(--text3)">Age</div></div>` : ''}
          ${onb.weight ? `<div><div style="font-size:18px;font-weight:700;color:var(--text)">${onb.weight}</div><div style="font-size:10px;color:var(--text3)">Weight kg</div></div>` : ''}
          ${onb.height ? `<div><div style="font-size:18px;font-weight:700;color:var(--text)">${onb.height}</div><div style="font-size:10px;color:var(--text3)">Height cm</div></div>` : ''}
          ${onb.gender ? `<div><div style="font-size:14px;font-weight:600;color:var(--text);text-transform:capitalize">${onb.gender}</div><div style="font-size:10px;color:var(--text3)">Gender</div></div>` : ''}
        </div>` : ''}
    </div>`;
}

// ── Drill: clicked a user — full user-wise KPI analytics ──
let _userDrillRange = '30d';   // separate range for user view
let _userDrillId    = null;    // currently-viewed user

function _drillUser(userId, openInPage) {
  _userDrillId = userId;
  if (!_userDrillRange) _userDrillRange = '30d';

  const data = _adminDashboardData || {};
  if (!data.users || !data.users.length) {
    showToast('Loading user data, please wait…', 'info');
    return;
  }

  const u = data.users.find(u => u.id === userId);
  if (!u) {
    console.warn('[FitFlow] User not found in dashboard data:', userId, '— available:', data.users.map(u => u.id));
    showToast('User not found', 'error');
    return;
  }

  // _renderUserAnalytics() builds the HTML AND opens the modal — don't call _openDrillModal again
  _renderUserAnalytics();
}

function _setUserDrillRange(range, btn) {
  _userDrillRange = range;
  document.querySelectorAll('[data-range-group="user"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderUserAnalytics();
}


// ── Activity Heatmap (admin version, uses _adminDashboardData) ────
function _adminUserHeatmap(userId, weeks) {
  weeks = weeks || 26;
  const { allLogs, allRuns } = _adminDashboardData || { allLogs: [], allRuns: [] };
  const userLogs = (allLogs||[]).filter(l => l.userId === userId);
  const userRuns = (allRuns||[]).filter(r => r.userId === userId);
  const dayCount = {};
  [...userLogs, ...userRuns].forEach(l => {
    if (l.date) dayCount[l.date] = (dayCount[l.date]||0) + 1;
  });
  const max = Math.max(1, ...Object.values(dayCount));

  const today = new Date();
  const totalDays = weeks * 7;
  const cols = [];
  let cursor = new Date(today);
  cursor.setDate(today.getDate() - (totalDays - 1));
  cursor.setDate(cursor.getDate() - cursor.getDay());

  for (let w = 0; w < weeks + 2; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0') + '-' + String(cursor.getDate()).padStart(2,'0');
      const future = cursor > today;
      const count = dayCount[dateStr] || 0;
      const intensity = future ? -1 : (count === 0 ? 0 : Math.min(4, Math.ceil(count / max * 4)));
      week.push({ date: dateStr, count, intensity, future });
      cursor.setDate(cursor.getDate() + 1);
    }
    cols.push(week);
  }

  const monthLabels = [];
  let lastMonth = -1;
  cols.forEach((col, i) => {
    const firstDay = new Date(col[0].date);
    if (!isNaN(firstDay.getTime())) {
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ idx: i, label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] });
        lastMonth = m;
      }
    }
  });

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return `
    <div class="hm-wrapper">
      <div class="hm-months">
        ${monthLabels.map(m => `<div class="hm-month-label" style="left:${m.idx * 14}px">${m.label}</div>`).join('')}
      </div>
      <div class="hm-body">
        <div class="hm-day-labels">
          ${dayLabels.map(d => `<div class="hm-day-label">${d}</div>`).join('')}
        </div>
        <div class="hm-grid">
          ${cols.map(col => `<div class="hm-col">${col.map(day => `<div class="hm-cell hm-cell-${day.future ? 'future' : day.intensity}" title="${day.future ? day.date + ' (future)' : day.date + ': ' + day.count + ' session' + (day.count === 1 ? '' : 's')}"></div>`).join('')}</div>`).join('')}
        </div>
      </div>
    </div>`;
}

function _renderUserAnalytics() {
  if (!_adminDashboardData || !_userDrillId) return;
  const { users, allLogs, allRuns } = _adminDashboardData;
  const u = users.find(u => u.id === _userDrillId);
  if (!u) return;

  const userLogs = allLogs.filter(l => l.userId === u.id);
  const userRuns = allRuns.filter(r => r.userId === u.id);

  const today = todayStr();
  const rangeStart = _dashRangeStart(_userDrillRange);
  const rangeDays = _userDrillRange === '7d' ? 7 : _userDrillRange === '30d' ? 30 : _userDrillRange === '90d' ? 90 : 365;

  // ── Stats in current range ──
  const rangeLogs = userLogs.filter(l => l.date >= rangeStart);
  const rangeRuns = userRuns.filter(r => r.date >= rangeStart);

  // Previous period (equal length)
  const prevStart = _dashDaysAgo(rangeDays * 2);
  const prevEnd   = _dashDaysAgo(rangeDays + 1);
  const prevLogs  = userLogs.filter(l => l.date >= prevStart && l.date <= prevEnd);
  const prevRuns  = userRuns.filter(r => r.date >= prevStart && r.date <= prevEnd);
  const sessionTrend = prevLogs.length ? Math.round((rangeLogs.length - prevLogs.length) / prevLogs.length * 100) : null;

  // ── Engagement metrics ──
  const allDates = new Set(userLogs.map(l => l.date).concat(userRuns.map(r => r.date)).filter(Boolean));
  const daysSinceSignup = u.createdDate ? Math.max(1, Math.floor((Date.now() - new Date(u.createdDate).getTime()) / 86400000)) : 1;
  const lifetimeActiveDays = allDates.size;
  const engagementPct = Math.min(100, Math.round(lifetimeActiveDays / daysSinceSignup * 100));

  const rangeActiveDays = new Set(rangeLogs.map(l => l.date).concat(rangeRuns.map(r => r.date)).filter(Boolean)).size;
  const rangeEngagementPct = Math.round(rangeActiveDays / rangeDays * 100);

  // ── Streak (consecutive days with activity, ending today or yesterday) ──
  let streak = 0;
  let cursor = new Date();
  // If today not active, start from yesterday
  if (!allDates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const dStr = cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0') + '-' + String(cursor.getDate()).padStart(2,'0');
    if (allDates.has(dStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  // ── Total kcal & km in range ──
  const rangeKm   = rangeRuns.reduce((s,r) => s + (r.distance||0), 0);
  const rangeKcal = rangeRuns.reduce((s,r) => s + ((r.distance||0) * 60), 0);
  const lifeKm    = userRuns.reduce((s,r) => s + (r.distance||0), 0);

  // ── Module breakdown (range) ──
  const modCounts = {};
  rangeLogs.forEach(l => {
    const m = (l.module||'').startsWith('custom_') ? 'custom' : (l.module||'unknown');
    modCounts[m] = (modCounts[m]||0) + 1;
  });
  const sortedMods = Object.entries(modCounts).sort((a,b) => b[1] - a[1]);
  const topMod = sortedMods[0] ? `${_modIcon(sortedMods[0][0])} ${_modName(sortedMods[0][0])}` : '—';

  // ── Activity sparkline (range-based) ──
  const dayMap = {};
  for (let i = rangeDays - 1; i >= 0; i--) dayMap[_dashDaysAgo(i)] = 0;
  userLogs.forEach(l => { if (dayMap[l.date]!==undefined) dayMap[l.date]++; });
  userRuns.forEach(r => { if (dayMap[r.date]!==undefined) dayMap[r.date]++; });
  let trendKeys = Object.keys(dayMap);
  let trendVals = Object.values(dayMap);

  if (_userDrillRange === '1y') {
    const monthly = {};
    trendKeys.forEach((k, i) => {
      const ym = k.substring(0, 7);
      monthly[ym] = (monthly[ym] || 0) + trendVals[i];
    });
    trendKeys = Object.keys(monthly);
    trendVals = Object.values(monthly);
  }

  // ── Day-of-week pattern (which weekday they prefer) ──
  const dayOfWeek = [0,0,0,0,0,0,0]; // Sun..Sat
  const dowNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  rangeLogs.forEach(l => {
    if (!l.date) return;
    const d = new Date(l.date);
    if (!isNaN(d.getTime())) dayOfWeek[d.getDay()]++;
  });
  rangeRuns.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date);
    if (!isNaN(d.getTime())) dayOfWeek[d.getDay()]++;
  });
  const maxDow = Math.max(...dayOfWeek, 1);

  // ── Hour-of-day pattern ──
  const hourBuckets = Array(24).fill(0);
  [...userLogs, ...userRuns].forEach(a => {
    if (a.timestamp && a.date >= rangeStart) {
      const d = new Date(a.timestamp);
      if (!isNaN(d.getTime())) hourBuckets[d.getHours()]++;
    }
  });
  const maxHour = Math.max(...hourBuckets, 1);

  // ── Activity feed (chronological) ──
  const feed = [...userLogs, ...userRuns.map(r => ({...r, module:'run'}))]
    .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''))
    .slice(0, 30);

  // ── Status flags ──
  const isAdmin    = (u.role||'USER').toUpperCase() === 'ADMIN';
  const isActive   = (u.status||'ACTIVE').toUpperCase() === 'ACTIVE';
  const isFirst    = u.isFirstLogin === true || String(u.isFirstLogin).toUpperCase() === 'TRUE';
  const safeId     = (u.id||'').replace(/'/g, "\\'");
  const safeName   = (u.name||'').replace(/'/g, "\\'");

  // ── Render ──
  const html = `
    <!-- Profile header -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border)">
      <div class="user-avatar" style="width:54px;height:54px;font-size:22px;flex-shrink:0">${(u.name||'?').charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="font-size:18px;font-weight:700">${u.name||'—'}</div>
          ${isAdmin ? '<span class="badge" style="background:rgba(255,215,0,0.2);color:#ffd700;border:1px solid rgba(255,215,0,0.3)">👑 ADMIN</span>' : ''}
          <span class="badge ${isActive ? 'badge-green' : 'badge-red'}">${(u.status||'ACTIVE').toUpperCase()}</span>
          ${isFirst ? '<span class="badge" style="background:rgba(240,192,64,0.15);color:var(--accent)">Awaiting first login</span>' : ''}
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${u.email||'—'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">
          Joined ${u.createdDate||'—'} · ${daysSinceSignup} days ago · Last login: ${u.lastLogin || 'never'}
        </div>
      </div>
    </div>

    <!-- Onboarding info -->
    ${_renderOnboardingCard(u.id)}

    <!-- Quick action buttons -->
    ${!isAdmin ? `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
      <button class="btn btn-ghost btn-sm" style="color:var(--accent)" onclick="closeModal('modal-dash-drill');setTimeout(()=>openAdminResetPassword('${safeId}','${safeName}',false),200)">🔑 Reset Password</button>
      <button class="btn btn-ghost btn-sm" style="color:#64b5f6" onclick="toggleStatus('${safeId}','${isActive ? 'INACTIVE' : 'ACTIVE'}','${safeId}');setTimeout(()=>_renderUserAnalytics(),500)">${isActive ? '⏸ Deactivate' : '▶ Reactivate'}</button>
    </div>` : ''}

    <!-- Period selector -->
    <div class="dash-range-bar" style="margin-bottom:14px">
      <div class="dash-range-label">Stats period:</div>
      <div class="dash-range-tabs">
        ${['7d','30d','90d','1y'].map(r => `
          <button class="dash-range-tab ${_userDrillRange===r?'active':''}" data-range-group="user" onclick="_setUserDrillRange('${r}', this)">${r==='1y'?'1Y':r.toUpperCase()}</button>
        `).join('')}
      </div>
    </div>

    <!-- KPI grid (range-aware) -->
    <div class="dash-grid dash-grid-4" style="gap:8px;margin-bottom:14px">
      <div class="dash-card dash-kpi dash-kpi-green" style="padding:12px">
        <div class="dash-kpi-icon" style="width:36px;height:36px;font-size:18px">📅</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val" style="font-size:22px">${rangeLogs.length + rangeRuns.length}</div>
          <div class="dash-kpi-label">Sessions</div>
          <div class="dash-kpi-sub">${prevLogs.length + prevRuns.length} previous</div>
        </div>
        ${sessionTrend !== null ? `<div class="dash-kpi-trend ${sessionTrend >= 0 ? 'up' : 'down'}" style="top:10px;right:10px">${sessionTrend >= 0 ? '↑' : '↓'} ${Math.abs(sessionTrend)}%</div>` : ''}
      </div>

      <div class="dash-card dash-kpi dash-kpi-blue" style="padding:12px">
        <div class="dash-kpi-icon" style="width:36px;height:36px;font-size:18px">🎯</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val" style="font-size:22px">${rangeActiveDays}/${rangeDays}</div>
          <div class="dash-kpi-label">Active Days</div>
          <div class="dash-kpi-sub">${rangeEngagementPct}% of period</div>
        </div>
      </div>

      <div class="dash-card dash-kpi dash-kpi-purple" style="padding:12px">
        <div class="dash-kpi-icon" style="width:36px;height:36px;font-size:18px">🔥</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val" style="font-size:22px">${streak}</div>
          <div class="dash-kpi-label">Day Streak</div>
          <div class="dash-kpi-sub">consecutive days</div>
        </div>
      </div>

      <div class="dash-card dash-kpi dash-kpi-amber" style="padding:12px">
        <div class="dash-kpi-icon" style="width:36px;height:36px;font-size:18px">⭐</div>
        <div class="dash-kpi-body">
          <div class="dash-kpi-val" style="font-size:14px;font-weight:600">${topMod}</div>
          <div class="dash-kpi-label">Top Module</div>
          <div class="dash-kpi-sub">${sortedMods[0] ? sortedMods[0][1] + ' sessions' : '—'}</div>
        </div>
      </div>
    </div>

    <!-- Running totals -->
    <div class="dash-grid dash-grid-4" style="gap:8px;margin-bottom:14px">
      <div class="dash-total" style="padding:12px"><div class="dash-total-icon">🏃</div><div class="dash-total-val" style="font-size:20px">${rangeRuns.length}</div><div class="dash-total-lbl">Runs (${_userDrillRange})</div></div>
      <div class="dash-total" style="padding:12px"><div class="dash-total-icon">📍</div><div class="dash-total-val" style="font-size:20px">${rangeKm.toFixed(1)}</div><div class="dash-total-lbl">km (${_userDrillRange})</div></div>
      <div class="dash-total" style="padding:12px"><div class="dash-total-icon">🔥</div><div class="dash-total-val" style="font-size:20px">${Math.round(rangeKcal).toLocaleString()}</div><div class="dash-total-lbl">kcal (${_userDrillRange})</div></div>
      <div class="dash-total" style="padding:12px"><div class="dash-total-icon">📊</div><div class="dash-total-val" style="font-size:20px">${engagementPct}%</div><div class="dash-total-lbl">Lifetime engagement</div></div>
    </div>

    <!-- Activity sparkline -->
    <div class="dash-card" style="margin-bottom:14px">
      <div class="dash-card-head" style="margin-bottom:8px">
        <h3 class="dash-card-title">📈 Activity Trend</h3>
        <span class="dash-card-sub">${_dashRangeLabel(_userDrillRange)}</span>
      </div>
      <div class="dash-spark">
        ${trendKeys.map((k, i) => {
          const max = Math.max(...trendVals, 1);
          const h = Math.max(2, Math.round(trendVals[i] / max * 60));
          const isToday = k === today;
          return `<div class="dash-spark-bar-wrap" title="${k}: ${trendVals[i]} ${trendVals[i]===1?'session':'sessions'}">
            <div class="dash-spark-bar ${isToday ? 'dash-spark-today' : ''}" style="height:${h}px"></div>
          </div>`;
        }).join('')}
      </div>
      <div class="dash-spark-axis">
        <span>${trendKeys[0] ? _shortDate(trendKeys[0]) : ''}</span>
        <span>${trendKeys[trendKeys.length-1] ? _shortDate(trendKeys[trendKeys.length-1]) : ''}</span>
      </div>
    </div>

    <!-- Activity heatmap (6-month view) -->
    <div class="dash-card" style="margin-bottom:14px">
      <div class="dash-card-head" style="margin-bottom:10px">
        <h3 class="dash-card-title">🟩 Activity Heatmap</h3>
        <span class="dash-card-sub">Last 6 months</span>
      </div>
      ${_adminUserHeatmap(u.id, 26)}
    </div>

    <!-- 2-column: Module breakdown + Day-of-week -->
    <div class="dash-grid dash-grid-2" style="margin-bottom:14px">
      <div class="dash-card">
        <div class="dash-card-head" style="margin-bottom:10px">
          <h3 class="dash-card-title">🏋️ Modules</h3>
          <span class="dash-card-sub">${_userDrillRange}</span>
        </div>
        <div class="dash-mod-list">
          ${sortedMods.length ? sortedMods.map(([mod, n]) => {
            const pct = Math.round(n / sortedMods[0][1] * 100);
            return `<div class="dash-mod-row" style="cursor:default">
              <div class="dash-mod-label">${_modIcon(mod)} ${_modName(mod)}</div>
              <div class="dash-mod-bar"><div class="dash-mod-fill" style="width:${pct}%"></div></div>
              <div class="dash-mod-count">${n}</div>
            </div>`;
          }).join('') : '<div style="text-align:center;color:var(--text3);padding:14px;font-size:12px">No activity in period</div>'}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-head" style="margin-bottom:10px">
          <h3 class="dash-card-title">📅 Day Pattern</h3>
          <span class="dash-card-sub">when active</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:80px">
          ${dayOfWeek.map((v, i) => {
            const h = Math.max(2, Math.round(v / maxDow * 64));
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" title="${dowNames[i]}: ${v} sessions">
              <div style="width:100%;background:var(--g4);height:${h}px;border-radius:3px 3px 0 0;opacity:${v>0?0.85:0.3}"></div>
              <div style="font-size:10px;color:var(--text3);font-weight:500">${dowNames[i]}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Hour-of-day pattern -->
    <div class="dash-card" style="margin-bottom:14px">
      <div class="dash-card-head" style="margin-bottom:10px">
        <h3 class="dash-card-title">🕐 Hour of Day</h3>
        <span class="dash-card-sub">when ${u.name?u.name.split(' ')[0]:'this user'} works out</span>
      </div>
      <div style="display:flex;align-items:flex-end;gap:1px;height:60px">
        ${hourBuckets.map((v, i) => {
          const h = Math.max(1, Math.round(v / maxHour * 50));
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center" title="${i}:00 - ${i+1}:00: ${v} sessions">
            <div style="width:100%;background:${v>0?'var(--g4)':'rgba(255,255,255,0.06)'};height:${h}px;border-radius:2px 2px 0 0;opacity:${v>0?0.85:0.4}"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:4px;padding-top:4px;border-top:1px solid var(--border)">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
      </div>
    </div>

    <!-- Recent activity feed -->
    <div class="dash-card">
      <div class="dash-card-head" style="margin-bottom:10px">
        <h3 class="dash-card-title">⚡ All Activity</h3>
        <span class="dash-card-sub">${feed.length === 30 ? 'Last 30' : feed.length} entries</span>
      </div>
      <div class="dash-feed">
        ${feed.length ? feed.map(a => {
          const time = a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : a.date;
          const isRun = a.module === 'run';
          return `<div class="dash-feed-item" style="cursor:default">
            <div class="dash-feed-icon">${isRun?'🏃':_modIcon(a.module)}</div>
            <div class="dash-feed-info">
              <div class="dash-feed-text"><strong>${isRun?(a.distance||0).toFixed(2)+' km '+(a.activityType||'run'):_modName(a.module)}</strong>${a.duration?` · ${typeof fmtTime==='function'?fmtTime(a.duration):a.duration+'s'}`:''}</div>
              <div class="dash-feed-time">${time}</div>
            </div>
          </div>`;
        }).join('') : '<div style="text-align:center;color:var(--text3);padding:24px">No activity yet</div>'}
      </div>
    </div>
  `;

  _openDrillModal('👤 ' + (u.name||'User') + ' · ' + (u.email||''), html);
}



// ── Helpers ──
function _kpiCard(label, value, trend, sub, icon, color) {
  const trendHTML = trend !== null && trend !== undefined ? `
    <div class="dash-kpi-trend ${trend >= 0 ? 'up' : 'down'}">
      ${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%
    </div>` : '';
  return `
    <div class="dash-card dash-kpi dash-kpi-${color}">
      <div class="dash-kpi-icon">${icon}</div>
      <div class="dash-kpi-body">
        <div class="dash-kpi-val">${value}</div>
        <div class="dash-kpi-label">${label}</div>
        <div class="dash-kpi-sub">${sub}</div>
      </div>
      ${trendHTML}
    </div>`;
}

function _renderSparkline(dayActivity) {
  const entries = Object.entries(dayActivity);
  const values  = entries.map(([,v]) => v);
  const max     = Math.max(...values, 1);
  const today   = todayStr();
  return `
    <div class="dash-spark">
      ${entries.map(([d, v]) => {
        const h = Math.max(2, Math.round(v / max * 60));
        const isToday = d === today;
        return `<div class="dash-spark-bar-wrap" title="${d}: ${v} sessions">
          <div class="dash-spark-bar ${isToday ? 'dash-spark-today' : ''}" style="height:${h}px"></div>
        </div>`;
      }).join('')}
    </div>`;
}

function _modName(mod) {
  const map = { calisthenics:'Calisthenics', cardio:'Cardio', yoga:'Yoga', stretch:'Stretching', stretching:'Stretching', custom:'Custom Workouts', running:'Running', run:'Run' };
  return map[mod] || (mod ? mod.charAt(0).toUpperCase() + mod.slice(1) : 'Other');
}

function _modIcon(mod) {
  const map = { calisthenics:'💪', cardio:'❤️', yoga:'🧘', stretch:'🤸', stretching:'🤸', custom:'⭐', running:'🏃', run:'🏃' };
  return map[mod] || '🏋️';
}

// Activity-aware emoji + label for GPS sessions (run / walk / cycle)
function _activityIcon(activityType) {
  return ({ run:'🏃', walk:'🚶', cycle:'🚴' })[activityType] || '🏃';
}
function _activityName(activityType) {
  return ({ run:'Running', walk:'Walking', cycle:'Cycling' })[activityType] || 'Running';
}
function _activityLabel(activityType) {
  return ({ run:'🏃 Run', walk:'🚶 Walk', cycle:'🚴 Cycle' })[activityType] || '🏃 Run';
}


// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — ADMIN COMPOSE & SEND
// ════════════════════════════════════════════════════════════════

async function renderAdminNotify() {
  const container = document.getElementById('admin-notify-content');
  if (!container) return;

  // Read last force-reload timestamp from Sheets content store
  const lastReloadTs = Store.get('ff_force_reload_ts', 0);
  const lastReloadStr = lastReloadTs
    ? new Date(lastReloadTs).toLocaleTimeString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true })
    : 'never';

  // Deployed cache version — read from the active SW registration
  let cacheVersion = 'unknown';
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    // The SW script URL contains the sw.js file; the CACHE const isn't directly
    // readable from here — but we expose it via a message in sw.js if needed.
    // For now surface the SW script URL so admin can see which sw.js is active.
    if (regs.length > 0) {
      const active = regs.find(r => r.active)?.active;
      if (active?.scriptURL) {
        cacheVersion = active.scriptURL.split('/').pop() || 'sw.js';
      }
    }
  } catch(e) {}

  // Render compose form
  container.innerHTML = `

    <!-- ── FORCE APP REFRESH CARD ── -->
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,rgba(46,125,70,0.12),rgba(46,125,70,0.04));border-color:rgba(46,125,70,0.3)">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="font-size:32px;flex-shrink:0">🔄</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">Force App Update for All Users</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.55;margin-bottom:12px">
            After deploying new files to GitHub, click this to silently refresh all users&#39; apps.
            They will see a &quot;Refreshing…&quot; toast and the app reloads automatically — no manual cache clearing needed.
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <button id="force-refresh-btn" class="btn btn-primary"
              style="padding:10px 20px;font-size:13px;font-weight:700"
              onclick="adminForceRefresh()">
              🔄 Force Refresh All Users
            </button>
            <div id="force-refresh-last" style="font-size:12px;color:var(--text3)">Last triggered: ${lastReloadStr}</div>
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text3)">
            Active SW: <code style="font-size:10px;color:var(--text2)">${cacheVersion}</code>
          </div>
        </div>
      </div>
    </div>

    <div class="notify-audience-bar" id="notify-audience-bar">
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;background:var(--g4);border-radius:50%;display:inline-block"></span>
        <span id="notify-audience-text">Loading subscriber count…</span>
      </span>
      <button class="admin-pill-btn" onclick="_refreshAudienceCount()" style="font-size:11px;padding:4px 10px">↻ Refresh</button>
    </div>

    <!-- Audience selector -->
    <div class="notify-audience-selector">
      <div class="notify-audience-label">Send to:</div>
      <div class="notify-audience-options">
        <button class="notify-audience-btn active" data-audience="all"      onclick="_setNotifyAudience('all', this)">👥 All Subscribers</button>
        <button class="notify-audience-btn"        data-audience="active"   onclick="_setNotifyAudience('active', this)">✅ Active Users (7d)</button>
        <button class="notify-audience-btn"        data-audience="atrisk"   onclick="_setNotifyAudience('atrisk', this)">⚠️ At-Risk Users (7+ days inactive)</button>
        <button class="notify-audience-btn"        data-audience="specific" onclick="_setNotifyAudience('specific', this)">🎯 Specific Users…</button>
      </div>
    </div>

    <!-- User picker (only shown when "specific" is selected) -->
    <div id="notify-user-picker" class="notify-user-picker" style="display:none">
      <div class="notify-picker-controls">
        <input id="notify-picker-search" class="admin-search-input" type="text"
          placeholder="🔍 Search users by name or email…" oninput="_filterNotifyUserList()">
        <div class="notify-picker-actions">
          <button class="admin-pill-btn" onclick="_selectAllNotifyUsers(true)" style="font-size:11px;padding:4px 10px">Select All</button>
          <button class="admin-pill-btn" onclick="_selectAllNotifyUsers(false)" style="font-size:11px;padding:4px 10px">Clear</button>
        </div>
      </div>
      <div id="notify-user-list" class="notify-user-list"></div>
    </div>

    <div class="notify-grid">
      <!-- LEFT: Compose form -->
      <div class="notify-compose">
        <div class="notify-section-head">
          <h3>✏️ Compose Notification</h3>
          <span class="notify-help">Sends to selected audience instantly</span>
        </div>

        <label class="notify-label">Title <span class="notify-counter" id="notify-title-counter">0/80</span></label>
        <input id="notify-title" class="notify-input" maxlength="80" placeholder="e.g. New workout plan available! 🎉" oninput="_updateNotifyPreview()">

        <label class="notify-label">Message <span class="notify-counter" id="notify-msg-counter">0/240</span></label>
        <textarea id="notify-message" class="notify-textarea" maxlength="240" rows="4" placeholder="Write a short, motivating message…" oninput="_updateNotifyPreview()"></textarea>

        <div class="notify-templates">
          <div class="notify-templates-label">Message templates: <span style="font-size:11px;color:var(--text3);font-weight:400">Pick category → message → load → edit → send</span></div>
          <div id="notify-tpl-dropdowns">${_renderTemplateDropdowns()}</div>
        </div>

        <div class="notify-actions">
          <button class="btn btn-primary" onclick="_sendAdminNotification()" id="notify-send-btn">
            🚀 Send to All Subscribers
          </button>
          <button class="btn btn-ghost" onclick="_clearNotifyForm()">Clear</button>
        </div>
      </div>

      <!-- RIGHT: Live preview -->
      <div class="notify-preview-col">
        <div class="notify-section-head">
          <h3>👁️ Preview</h3>
          <span class="notify-help">How it appears on a phone</span>
        </div>
        <div class="notify-phone">
          <div class="notify-phone-bar">
            <span style="font-size:10px;font-weight:600">10:30 AM</span>
            <span style="font-size:10px">📶 ●●● 84%</span>
          </div>
          <div class="notify-phone-content">
            <div class="notify-card">
              <div class="notify-card-head">
                <div class="notify-app-icon">💪</div>
                <div style="flex:1">
                  <div style="font-size:11px;color:#999;font-weight:500">FITFLOW PRO · now</div>
                </div>
              </div>
              <div class="notify-card-title" id="notify-prev-title">Title appears here</div>
              <div class="notify-card-body" id="notify-prev-body">Your message body will appear here as you type…</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent send history -->
    <div class="notify-history" id="notify-history">
      <div class="notify-section-head" style="padding:0 0 14px">
        <h3>📜 Recent Sends</h3>
        <span class="notify-help">Audit trail of admin-sent notifications</span>
      </div>
      <div id="notify-history-list">
        <div style="color:var(--text3);font-size:13px;padding:14px;text-align:center">Loading history…</div>
      </div>
    </div>
  `;

  // Load diagnostics + send history + subscriber count
  _loadPushDiagnostics();
  // Load send history + subscriber count
  _loadNotifyHistory();
  _refreshAudienceCount();
}





// Notify audience state
let _notifyAudience = 'all';      // 'all' | 'active' | 'atrisk' | 'specific'
let _notifySelectedUsers = new Set();   // Set of userIds when audience is 'specific'

function _setNotifyAudience(audience, btn) {
  _notifyAudience = audience;
  document.querySelectorAll('.notify-audience-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const picker = document.getElementById('notify-user-picker');
  if (audience === 'specific') {
    picker.style.display = 'block';
    _renderNotifyUserList();
  } else {
    picker.style.display = 'none';
  }
  _updateSendButtonLabel();
}

async function _renderNotifyUserList() {
  const listEl = document.getElementById('notify-user-list');
  if (!listEl) return;
  listEl.innerHTML = '<div style="padding:14px;text-align:center;color:var(--text3);font-size:13px">Loading subscribed users…</div>';

  // Get subscribed devices to know who can receive pushes
  let subscribedUserIds = new Set();
  try {
    const sub = await Sheets.get('getSubscribedDevices');
    if (sub?.success) {
      (sub.devices || []).forEach(d => { if (d.userId) subscribedUserIds.add(d.userId); });
    }
  } catch(e) {}

  // Use cached users from Users tab, or fetch
  let users = _cachedAdminUsers;
  if (!users || !users.length) {
    try {
      const r = await Sheets.get('getAllUsers');
      if (r?.success) users = r.users || [];
    } catch(e) { users = []; }
  }

  const realUsers = users.filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');
  // Sort: subscribed first (alphabetical within each)
  realUsers.sort((a, b) => {
    const aSub = subscribedUserIds.has(a.id) ? 0 : 1;
    const bSub = subscribedUserIds.has(b.id) ? 0 : 1;
    if (aSub !== bSub) return aSub - bSub;
    return (a.name||'').localeCompare(b.name||'');
  });

  listEl.innerHTML = realUsers.map(u => {
    const subscribed = subscribedUserIds.has(u.id);
    const checked = _notifySelectedUsers.has(u.id);
    const safeId = (u.id||'').replace(/'/g, "\\'");
    return `
      <label class="notify-user-row ${subscribed ? '' : 'notify-user-unsub'}" data-name="${(u.name||'').toLowerCase()}" data-email="${(u.email||'').toLowerCase()}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${subscribed ? '' : 'disabled'}
          onchange="_toggleNotifyUser('${safeId}', this.checked)">
        <div class="notify-user-info">
          <div class="notify-user-name">${u.name || '—'}${subscribed ? '' : ' <span style="font-size:10px;color:var(--text3);font-weight:400">(not subscribed)</span>'}</div>
          <div class="notify-user-email">${u.email || ''}</div>
        </div>
        ${subscribed ? '<span class="notify-sub-badge">🔔</span>' : ''}
      </label>
    `;
  }).join('') || '<div style="padding:14px;text-align:center;color:var(--text3);font-size:13px">No users found</div>';

  _updateSendButtonLabel();
}

function _toggleNotifyUser(userId, checked) {
  if (checked) _notifySelectedUsers.add(userId);
  else _notifySelectedUsers.delete(userId);
  _updateSendButtonLabel();
}

function _selectAllNotifyUsers(selectAll) {
  document.querySelectorAll('#notify-user-list input[type="checkbox"]:not(:disabled)').forEach(cb => {
    cb.checked = selectAll;
    const userId = cb.getAttribute('onchange').match(/'([^']+)'/)[1].replace(/\\\\'/g, "'");
    if (selectAll) _notifySelectedUsers.add(userId);
    else _notifySelectedUsers.delete(userId);
  });
  _updateSendButtonLabel();
}

function _filterNotifyUserList() {
  const q = (document.getElementById('notify-picker-search')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.notify-user-row').forEach(row => {
    const name = row.getAttribute('data-name') || '';
    const email = row.getAttribute('data-email') || '';
    row.style.display = (!q || name.includes(q) || email.includes(q)) ? '' : 'none';
  });
}

function _updateSendButtonLabel() {
  const btn = document.getElementById('notify-send-btn');
  if (!btn) return;
  let label = '🚀 Send to All Subscribers';
  if (_notifyAudience === 'active') label = '🚀 Send to Active Users';
  else if (_notifyAudience === 'atrisk') label = '🚀 Send to At-Risk Users';
  else if (_notifyAudience === 'specific') {
    const n = _notifySelectedUsers.size;
    label = n > 0
      ? `🚀 Send to ${n} Selected User${n === 1 ? '' : 's'}`
      : '⚠️ Select at least 1 user';
  }
  btn.innerHTML = label;
}

// Compute target user IDs based on audience selection
function _computeNotifyTargetUserIds() {
  if (_notifyAudience === 'all') return null;  // null = all subscribed
  if (_notifyAudience === 'specific') {
    return Array.from(_notifySelectedUsers);
  }

  // 'active' or 'atrisk' — derive from dashboard data
  const data = _adminDashboardData || {};
  const realUsers = (data.users || []).filter(u => (u.role||'USER').toUpperCase() !== 'ADMIN');
  const allLogs = data.allLogs || [];

  const last7 = (() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  })();

  const userLastActivity = {};
  allLogs.forEach(l => { if (!userLastActivity[l.userId] || l.date > userLastActivity[l.userId]) userLastActivity[l.userId] = l.date; });

  if (_notifyAudience === 'active') {
    return realUsers.filter(u => (userLastActivity[u.id] || '') >= last7).map(u => u.id);
  }
  if (_notifyAudience === 'atrisk') {
    return realUsers.filter(u => !userLastActivity[u.id] || userLastActivity[u.id] < last7).map(u => u.id);
  }
  return null;
}


// Fetches and displays current subscribed-device count
async function _refreshAudienceCount() {
  const el = document.getElementById('notify-audience-text');
  if (el) el.textContent = 'Loading…';
  try {
    const res = await Sheets.get('getSubscribedDevices');
    if (res?.success) {
      const count = res.count || 0;
      const devices = res.devices || [];
      if (count === 0) {
        if (el) el.innerHTML = '<strong style="color:var(--accent)">⚠️ 0 subscribers</strong> — push won\'t reach anyone yet';
      } else {
        const summary = devices.slice(0, 3).map(d => d.name || d.email || (d.deviceModel + ' user')).join(', ');
        const more = count > 3 ? ` and ${count - 3} more` : '';
        if (el) el.innerHTML = `<strong>${count} subscribed device${count === 1 ? '' : 's'}</strong> — ${summary}${more}`;
      }
    } else {
      if (el) el.textContent = 'Could not load subscriber count';
    }
  } catch(e) {
    if (el) el.textContent = 'Error loading count';
  }
}

const _NOTIFY_TEMPLATES = {
  motivation: [
    { title: "💪 You got this!",                  message: 'Every workout counts. Take 15 minutes for yourself today and feel amazing afterwards.' },
    { title: "🔥 Beast mode: ON",                 message: "Your future self is watching. Don't let them down — open FitFlow and crush it today!" },
    { title: "⚡ One rep at a time!",             message: "You don't have to be perfect. You just have to show up. Open FitFlow and start!" },
    { title: "🏆 Champions are made today",       message: "Not in big moments — in the small daily choices. Today's choice: open FitFlow and move!" },
    { title: "🌟 Believe in yourself!",           message: "6 months ago you couldn't do what you can today. Imagine 6 months from now. Keep going! 💪" },
    { title: "🚀 Progress, not perfection",       message: "A 10-min workout beats zero workouts every single time. Open FitFlow — any module, right now!" },
    { title: "🎯 Your goal is waiting!",          message: "It doesn't get easier. YOU get stronger. Open FitFlow and prove it today! 🔥" },
    { title: "😤 Push through!",                  message: "The voice that says 'I can't' is lying. The one that says 'just one more rep' is right. Let's go! 💪" },
    { title: "🌅 New day, fresh start!",          message: "Whatever happened yesterday doesn't matter. Today is a brand new opportunity. Open FitFlow! ✨" },
    { title: "💥 Unlock your potential!",         message: "Your body is capable of so much more than you think. Today, test those limits. FitFlow is ready! 🔥" },
    { title: "🏃 Keep the momentum!",             message: "Consistency beats intensity every time. Even 15 mins today keeps the streak alive. Do it! ⚡" },
    { title: "💎 Diamonds under pressure",        message: "Pressure creates diamonds. That discomfort during a workout? That's you becoming stronger! 💪" },
    { title: "🌊 Ride the wave!",                 message: "Motivation comes in waves. You're feeling one right now — catch it! Open FitFlow immediately! 🏄" },
    { title: "🦁 Unleash the beast!",             message: "There's a stronger version of you waiting to come out. Today's workout is the door. Open it! 🔥" },
    { title: "⭐ You are worth it!",              message: "Investing 20 mins in your health today pays dividends for the rest of your life. You deserve it! 💪" },
    { title: "🎵 Let's get moving!",             message: "Put on your favourite playlist, open FitFlow, and let the music carry you through. Let's GO! 🎶💪" },
    { title: "🤸 Feel-good guaranteed!",          message: "Science fact: you will feel better after this workout than before. 100% guaranteed. Try it! 😁" },
    { title: "🌈 After every storm...",           message: "Tough days make the good days sweeter. Show up today — your future self will thank you! 💪" },
    { title: "⚔️ Warrior mentality!",             message: "Warriors don't skip. They don't make excuses. They just do the work. Open FitFlow now! 🔥" },
    { title: "🏅 Every rep counts!",              message: "One rep is better than zero. One minute is better than none. Just START — FitFlow has you! 💪" },
    { title: "🔑 The secret is consistency",      message: "It's not about being motivated every day. It's about showing up anyway. TODAY is that day! 🔥" },
    { title: "💫 Transform yourself!",            message: "The person you want to be is built one workout at a time. Add one more brick today! 🏗️💪" },
  ],
  reminder: [
    { title: "⏰ Time to move!",                  message: "Haven't logged a session today? A short workout is better than none. Open FitFlow now!" },
    { title: "📋 Daily check-in!",               message: "Your workout for today is still pending. Takes only 15 mins — open FitFlow and check it off! ✅" },
    { title: "🔔 Gentle nudge!",                  message: "Hey! You haven't opened FitFlow today. Your streak needs you — just 10 mins is enough! 💪" },
    { title: "📅 Don't break the chain!",        message: "Every day you work out adds a link to your chain. Don't break it today. Open FitFlow! 🔥" },
    { title: "👀 We noticed...",                  message: "You haven't logged a workout yet today. The day's not over! Open FitFlow and make it count! ⚡" },
    { title: "🏃 Your body is waiting!",          message: "Your muscles are rested, your energy is there — all that's missing is the action. GO! 💪" },
    { title: "⌛ Clock is ticking!",              message: "The best workout window is right now. In an hour you'll be tired. Open FitFlow — NOW! 🔥" },
    { title: "💤 Don't let today be a zero!",   message: "Zero days lead to zero results. 15 mins of anything counts. Open FitFlow right now! ⚡" },
    { title: "🎯 Today's goal pending!",         message: "One task left on your list: today's workout. Everything else is done. Finish strong! 💪" },
    { title: "📊 Streak at risk!",               message: "Your workout streak is on the line. A quick 10-min session is all it takes. Open FitFlow! 🔥" },
    { title: "🧠 Your future self says:",         message: "\"Please work out today. Trust me, you'll be glad you did.\" — Future You. Open FitFlow! 💪" },
    { title: "🌙 Don't sleep on this!",         message: "Tomorrow's energy is built today. A workout now means you wake up feeling GREAT. Do it! ⚡" },
    { title: "🏋️ Equipment is ready!",           message: "FitFlow has your workout queued up. Cardio, yoga, gym, running — pick one. Just start! 💪" },
    { title: "✅ One thing left today!",          message: "You've handled work, meals, and life. One thing remains: YOUR workout. Open FitFlow! 🎯" },
    { title: "🤝 Accountability check!",          message: "You committed to your fitness journey. Today is part of that commitment. Don't break it! 💪" },
    { title: "📱 Quick reminder!",               message: "FitFlow is loaded, your workout is ready, and 15 minutes is all it takes. What are you waiting for? 🔥" },
    { title: "⚡ 15-minute challenge!",           message: "Challenge: Can you complete a 15-min FitFlow workout right now? We think you can. Prove it! 💪" },
    { title: "🎪 Show up for yourself!",          message: "You show up for work. You show up for others. Now show up for YOU. Open FitFlow! 🏆" },
    { title: "🌟 Daily habit building!",          message: "It takes 21 days to build a habit. Every day you log in FitFlow makes it more automatic. Do it! 💪" },
    { title: "💪 Non-negotiable!",               message: "Some things in life are optional. Your health isn't one of them. 15 mins — open FitFlow now! 🔥" },
    { title: "🔁 Routine check!",                message: "Breakfast ✅  Work ✅  Workout... ⬜ Don't end the day with that box unchecked! FitFlow → open! 💪" },
  ],
  feature: [
    { title: "✨ New feature unlocked!",          message: "Check out the latest update in FitFlow Pro. Open the app to explore what's new!" },
    { title: "🚀 FitFlow just got better!",       message: "We've added something awesome. Open FitFlow Pro to see what's new — you'll love it! ✨" },
    { title: "🎉 Update alert!",                  message: "Fresh features just dropped in FitFlow Pro! Open the app to explore the latest additions! 🆕" },
    { title: "🔧 Improved & upgraded!",           message: "We listened to your feedback and made FitFlow even better. See what changed — open the app! 💪" },
    { title: "⚡ Performance boost!",             message: "FitFlow Pro is now faster, smoother, and smarter. Open the app to experience the upgrade! 🚀" },
    { title: "📊 New stats available!",           message: "Your fitness dashboard just got a major upgrade. New insights and data are waiting for you! 📈" },
    { title: "🏃 New running features!",          message: "GPS tracking just got smarter! New pace zones, route maps & more in FitFlow. Go explore! 🗺️" },
    { title: "🧘 New yoga routines added!",       message: "Fresh yoga flows are now in FitFlow Pro. Morning, evening, stress-relief and more! Try them! 🌿" },
    { title: "💪 New workout plans!",             message: "Brand new training plans have landed in FitFlow Pro. Check your Modules tab! 🏋️" },
    { title: "🤸 Calisthenics upgrade!",          message: "The calisthenics module just got new progressions and skill paths. Open FitFlow to explore! 💪" },
    { title: "🎯 Custom workouts improved!",      message: "Building your own workouts is now easier than ever. New tools, new exercises, same FitFlow! ✨" },
    { title: "📱 App experience improved!",       message: "Smoother animations, faster loads, and better navigation — FitFlow feels brand new! Open it! 🚀" },
    { title: "🏅 Achievements updated!",          message: "New milestones and badges are now available in FitFlow Pro. How many can you unlock? 🏆" },
    { title: "💬 Motivational quotes refreshed!", message: "New daily quotes are live in FitFlow Pro! Fresh inspiration every single morning. 🌅" },
    { title: "📋 Weekly report upgraded!",        message: "Your weekly summary just got smarter — more insights, better charts. Check it out! 📊" },
    { title: "🔔 Push notifications improved!",  message: "We've made our notifications smarter and more relevant. Make sure they're enabled! ⚡" },
    { title: "🗺️ Running maps enhanced!",         message: "Route tracking is now sharper with better GPS accuracy. Run and explore! 🏃" },
    { title: "🥗 Nutrition tips added!",          message: "FitFlow Pro now includes diet and hydration guidance. Fuel better, perform better! 🥤💪" },
    { title: "🌐 Offline mode improved!",         message: "FitFlow now works even smoother without internet. Your workouts, anytime, anywhere! 📶💪" },
    { title: "👥 Community features live!",       message: "See how your streaks compare! New leaderboard features are now in FitFlow! 🏆" },
    { title: "🎨 Fresh new look!",                message: "FitFlow Pro has a refreshed design. Same great app, even better experience. Open and see! ✨" },
  ],
  challenge: [
    { title: "🎯 Weekly challenge starts now!",   message: "Complete 5 workouts this week to earn a special badge. Are you in? Open FitFlow to begin! 💪" },
    { title: "🔥 7-Day Streak Challenge!",        message: "Can you log a workout every day this week? 7 days, 7 sessions, massive results. START TODAY! 💪" },
    { title: "🏃 10K Steps Challenge!",           message: "10,000 steps today. Walking, running, or cardio — all count. Track it in FitFlow! 🚶🏃" },
    { title: "🧘 7-Day Yoga Challenge!",          message: "One yoga session every day for a week. Your flexibility and stress levels will THANK you. Begin! 🌿" },
    { title: "💪 30-Day Transformation!",         message: "30 days. One workout per day. Complete transformation guaranteed. Day 1 starts NOW. Open FitFlow! 🔥" },
    { title: "🤸 Morning Workout Challenge!",     message: "Work out before 9 AM every day this week. Early risers build the best habits! Set your alarm! ⏰💪" },
    { title: "🏋️ Strength Week Challenge!",       message: "3 gym sessions this week. Hit chest, back, and legs. FitFlow tracks everything. Let's build! 💪" },
    { title: "🚴 Cardio Blitz Challenge!",        message: "20 mins of cardio every day for 5 days. Burns fat, boosts energy, builds endurance. GO! 🔥" },
    { title: "⚡ 100 Rep Challenge!",             message: "100 total reps today — any exercise. Squats, pushups, crunches — mix it up! FitFlow counts! 💪" },
    { title: "🌅 Rise & Grind Challenge!",        message: "5 AM workout for 3 days this week. The most elite habit you can build. Are you elite? 🦁" },
    { title: "🧗 Calisthenics Challenge!",        message: "Master one new bodyweight skill this week. Handstand? Pull-up? L-sit? FitFlow guides you! 💪" },
    { title: "🏅 No Rest Day Challenge!",         message: "This week: active every single day. Rest days = active recovery (yoga/walk counts!). DO IT! ⚡" },
    { title: "💧 Hydration + Workout Challenge!", message: "3L of water AND a workout every day this week. Hydrate + move = unstoppable combo! 💦💪" },
    { title: "🏃 Run 5K This Week!",             message: "One 5K run before Sunday. Track it in FitFlow. Your GPS is ready. Your legs are ready. GO! 🗺️" },
    { title: "🔥 HIIT Week Challenge!",           message: "3 HIIT sessions this week. High intensity, short duration, massive results. FitFlow has them! ⚡" },
    { title: "📅 Consistency Challenge!",         message: "Log into FitFlow every day this week — even for 10 mins. Consistency > intensity! Build it! 💪" },
    { title: "🌿 Flexibility Challenge!",         message: "Stretch for 10 mins every day this week. Your body will feel 10 years younger by Sunday! 🤸" },
    { title: "🏆 Personal Best Challenge!",       message: "Beat your longest run, most reps, or longest workout this week. Your record is your target! 🎯" },
    { title: "😤 No Excuses Challenge!",          message: "This week: whatever excuse you make, do the workout anyway. Build the discipline muscle! 💪🔥" },
    { title: "🌙 Evening Workout Challenge!",     message: "Work out every evening this week after 6 PM. Great for decompressing and building habits! 🌆💪" },
    { title: "🥇 Core Strength Challenge!",       message: "5 mins of core every single day this week. Plank, crunches, leg raises — mix it! ABS INCOMING! 🔥" },
    { title: "🤝 Buddy Workout Challenge!",       message: "Get a friend to work out with you this week. Share your FitFlow streak and compete! 👥🔥" },
  ],
  streak: [
    { title: "🔥 Protect your streak!",          message: "Your workout streak is one of your most valuable assets. Don't let it end today — open FitFlow! 💪" },
    { title: "📈 Streak milestone incoming!",     message: "You're so close to your next streak milestone! One workout today keeps the fire burning! 🔥" },
    { title: "⚡ Streak alive!",                  message: "Every day you show up, your streak grows stronger. Today is another day to add to your legend! 💪" },
    { title: "🏅 Streak warrior!",               message: "Only consistent people build long streaks. You're one of them. Keep it going — open FitFlow! 🔥" },
    { title: "🌟 Day streak = power!",           message: "Your streak isn't just a number — it's proof of your discipline. Add another day to it! 💪" },
    { title: "😤 Don't break it now!",          message: "You've worked too hard to let your streak end over one lazy day. 10 mins is all it takes! ⚡" },
    { title: "🏆 Streak leaderboard!",           message: "The top streaks on FitFlow belong to people who never give up. Are you one of them? GO! 💪" },
    { title: "🔗 Another link in the chain!",    message: "Each workout adds a link. The chain is only as strong as today's session. Don't break it! 🔥" },
    { title: "📅 Keep the habit alive!",         message: "Habits take 21 days to form and 1 day to break. Don't let today be that day! Open FitFlow! 💪" },
    { title: "🎯 Streak goal: achieved daily!",  message: "Not weekly. Not monthly. DAILY. Your streak depends on today's session. Do it now! ⚡" },
    { title: "💪 Streak = discipline proof!",    message: "Every day on your streak is evidence that you're becoming the person you want to be. Add today! 🔥" },
    { title: "🌅 Start the week right!",         message: "Monday workout = weekly streak secured. Don't start the week with a zero. Open FitFlow! 💪" },
    { title: "🔥 Weekend streak check!",         message: "Weekends are where streaks die. Not yours. Open FitFlow and keep it alive this weekend! ⚡" },
    { title: "🤩 Look at your streak!",          message: "That number didn't happen by accident. It happened because you showed up. Show up again today! 💪" },
    { title: "⭐ Streak = identity!",            message: "You're not someone who skips. You're someone who shows up. Prove it again today! 🔥" },
    { title: "🎊 Streak celebration incoming!",  message: "One more day and you hit your next milestone! Don't stop now — it's RIGHT THERE! Open FitFlow! 💪" },
    { title: "😰 Streak rescue!",                message: "ALERT: Your streak is at risk today! Open FitFlow right now — even 10 mins saves it! 🚨💪" },
    { title: "🛡️ Defend your streak!",           message: "Your streak is under attack — from laziness. Defend it. Open FitFlow in the next 5 mins! 🔥" },
    { title: "🧠 The compound effect!",          message: "Day 1 feels small. Day 30 feels different. Day 100 changes your life. Keep going! 💪" },
    { title: "💥 Unstoppable streak!",           message: "At this point your streak is a part of who you are. Protect it. Open FitFlow now! 🔥" },
    { title: "🏗️ Building something great!",    message: "Streak by streak, workout by workout — you're building the best version of yourself. Don't stop! 💪" },
  ],
  weekend: [
    { title: "🎉 Weekend warrior mode!",         message: "No alarm, no meetings, no excuses! The weekend is the BEST time to crush a workout. Let's go! 💪" },
    { title: "😴 Saturday morning check!",       message: "Coffee ✅  Scrolling phone ✅  Workout... still pending? Open FitFlow — the weekend belongs to you! 🔥" },
    { title: "🌞 Sunday reset!",                 message: "Sunday workout = Monday superpower. Prep your body for an incredible week ahead. Open FitFlow! 💪" },
    { title: "🏖️ Weekend energy!",               message: "You've got time, energy, and no work stress. Perfect storm for the best workout of the week! 🔥" },
    { title: "🌅 Weekend sunrise run!",          message: "Weekend mornings are made for runs. Fresh air, no traffic, GPS ready in FitFlow. Let's go! 🏃" },
    { title: "🍕 Earn your weekend treat!",      message: "Whatever you're eating this weekend — earn it first! A quick FitFlow workout makes it guilt-free! 😋" },
    { title: "🛋️ Couch can wait!",              message: "The binge-watch will still be there after your workout. Your fitness goals won't wait. FitFlow first! 💪" },
    { title: "⏰ No rush this weekend!",         message: "You don't have to be anywhere. Take your time — a long, relaxed workout. FitFlow is ready! 🌿" },
    { title: "🏆 Champions train weekends too!", message: "The difference between good and great? Great people don't take weekends off. Be great! 💪" },
    { title: "🔥 Weekend sweat session!",        message: "Two days, two workouts. That's the weekend warrior formula. Day 1 starts NOW. Open FitFlow! ⚡" },
    { title: "🌿 Yoga Sunday!",                  message: "Start Sunday with 20 mins of yoga. Calm mind, loose body, positive week ahead. FitFlow has it! 🧘" },
    { title: "🏃 Saturday run club!",            message: "Saturdays were made for long runs. Lace up, open FitFlow GPS, and explore! 🗺️🏃" },
    { title: "😌 Active recovery weekend!",      message: "Even rest days can be active! Light yoga, a walk, or stretching counts. Open FitFlow! 🌿" },
    { title: "💪 Set the week's tone!",         message: "A Sunday workout means Monday feels like week 2. Start strong. Open FitFlow now! 🔥" },
    { title: "🎯 Weekend goal check!",           message: "Did you hit your weekly workout target? If not, the weekend is your last chance. FitFlow — NOW! 💪" },
    { title: "🌄 Golden morning!",               message: "Weekend mornings are golden — quiet streets, cool air, no rush. Perfect for a run or yoga! 🌅" },
    { title: "🤸 Weekend flex session!",         message: "No gym pressure on weekends — just you, FitFlow, and a great stretching routine. Ahh... 🧘" },
    { title: "📺 Post-Netflix workout?",         message: "You watched 2 episodes. Now give your body 20 mins. Fair trade! Open FitFlow! 😂💪" },
    { title: "🎊 Celebrate the weekend right!",  message: "The best celebration is the one that makes next week even better. Workout now, party later! 🔥" },
    { title: "🌙 Sunday evening ritual!",        message: "End the weekend with yoga and stretching. Start Monday feeling fresh and prepared! 🧘💪" },
  ],
  diet: [
    { title: "🥗 Fuel your workout!",            message: "Your body needs the right fuel to perform. Hydrate, eat well, and open FitFlow to move! 💪" },
    { title: "💧 Hydration check!",              message: "Did you drink enough water today? Aim for 8 glasses. Hydrated body = better workout! 🚰" },
    { title: "🍌 Pre-workout snack time!",       message: "A banana, handful of nuts, or a light snack 30 mins before a workout = peak performance! ⚡" },
    { title: "🥤 Protein reminder!",             message: "Muscles repair and grow with protein. Don't forget your post-workout nutrition today! 💪" },
    { title: "🌿 Eat clean, train mean!",        message: "80% diet, 20% exercise. You can't out-train a bad diet. Make today's meals count! 🥗" },
    { title: "☕ Skip the extra chai!",          message: "Extra sugar slows you down. Swap it for water and a FitFlow workout — double win! 💪" },
    { title: "🍎 An apple AND a workout!",       message: "Keep the doctor away with both! A healthy snack + 20 mins of FitFlow = unstoppable health! 🔥" },
    { title: "🫙 Meal prep + workout = wins",    message: "Prepped your meals? Now prep your body. Open FitFlow for today's workout! 💪" },
    { title: "🥦 Veggie power!",                 message: "Greens give your body the micronutrients it needs to recover and perform. Eat them AND workout! 🏃" },
    { title: "🍛 Balanced plate today?",         message: "Carbs for energy, protein for muscle, veggies for vitamins. Then burn it all with FitFlow! 🔥" },
    { title: "💦 Water + workout combo!",        message: "Rule: For every workout, drink 500ml extra water. Your muscles will love you for it! 💧💪" },
    { title: "🥗 Eat the rainbow!",              message: "Colorful plates = better nutrition. Eat your veggies today and fuel that FitFlow session! 🌈" },
    { title: "⏰ Don't skip breakfast!",        message: "Morning fuel = morning performance. Eat well, then crush your FitFlow workout! ☀️💪" },
    { title: "🍽️ Mindful eating today!",         message: "Slow down, eat mindfully, and fuel your body right. Then work it off in FitFlow! 🔥" },
    { title: "🥩 Recovery nutrition!",           message: "After a hard workout, your muscles need protein within 30 mins. Don't skip the refuel! 💪" },
    { title: "🚫 Sugar crash warning!",          message: "That sugary snack gives a spike, then a crash. Real energy? 20 mins in FitFlow. Choose wisely! ⚡" },
    { title: "🫀 Heart-healthy choices!",        message: "Every healthy meal and every workout adds years to your life. Double down today! ❤️💪" },
    { title: "🧃 Green smoothie + yoga?",        message: "The ultimate morning combo. Make your smoothie, then open FitFlow's yoga module. Bliss! 🌿" },
    { title: "🍫 Dark chocolate approved!",      message: "One square of dark choc post-workout is actually healthy. Earn it first — open FitFlow! 😋💪" },
    { title: "🥜 Snack smart!",                  message: "Nuts, yogurt, fruit — smart snacks fuel smart workouts. Eat right and open FitFlow! 🔥" },
    { title: "🫗 Electrolytes matter!",          message: "After sweating, replenish with coconut water or a pinch of salt in water. Stay fuelled! 💧💪" },
  ],
};

let _notifyTemplateCategory = 'motivation';
let _notifyTemplateIndex    = 0;

function _renderTemplateDropdowns() {
  const categories = [
    { key: 'motivation', label: '💪 Motivation',   count: _NOTIFY_TEMPLATES.motivation.length },
    { key: 'reminder',   label: '⏰ Reminder',     count: _NOTIFY_TEMPLATES.reminder.length   },
    { key: 'challenge',  label: '🎯 Challenge',    count: _NOTIFY_TEMPLATES.challenge.length  },
    { key: 'streak',     label: '🔥 Streak',       count: _NOTIFY_TEMPLATES.streak.length     },
    { key: 'weekend',    label: '🏖️ Weekend',      count: _NOTIFY_TEMPLATES.weekend.length    },
    { key: 'feature',    label: '✨ New Feature',  count: _NOTIFY_TEMPLATES.feature.length    },
    { key: 'diet',       label: '🥗 Diet & Fuel',  count: _NOTIFY_TEMPLATES.diet.length       },
  ];
  const catOptions = categories.map(c =>
    `<option value="${c.key}" ${c.key === _notifyTemplateCategory ? 'selected' : ''}>${c.label} (${c.count})</option>`
  ).join('');
  const msgs = _NOTIFY_TEMPLATES[_notifyTemplateCategory] || [];
  const msgOptions = msgs.map((m, i) =>
    `<option value="${i}" ${i === _notifyTemplateIndex ? 'selected' : ''}>${i + 1}. ${m.title}</option>`
  ).join('');
  return `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;gap:8px;align-items:center">
        <select id="notify-tpl-cat" onchange="_onTemplateCatChange(this.value)"
          style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:13px;font-weight:600">
          ${catOptions}
        </select>
        <select id="notify-tpl-msg" onchange="_onTemplateMsgChange(+this.value)"
          style="flex:2;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text1);font-size:13px">
          ${msgOptions}
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" style="flex:1;font-size:12px;padding:7px" onclick="_applySelectedTemplate()">
          📋 Load into editor
        </button>
        <button class="btn btn-ghost" style="font-size:12px;padding:7px 10px" onclick="_templatePrev()" title="Previous">◀</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:7px 10px" onclick="_templateNext()" title="Next">▶</button>
      </div>
    </div>`;
}

function _onTemplateCatChange(cat) {
  _notifyTemplateCategory = cat;
  _notifyTemplateIndex    = 0;
  const msgs = _NOTIFY_TEMPLATES[cat] || [];
  const sel  = document.getElementById('notify-tpl-msg');
  if (sel) {
    sel.innerHTML = msgs.map((m, i) =>
      `<option value="${i}">${i + 1}. ${m.title}</option>`
    ).join('');
    sel.value = '0';
  }
}

function _onTemplateMsgChange(idx) { _notifyTemplateIndex = idx; }

function _applySelectedTemplate() {
  const msgs = _NOTIFY_TEMPLATES[_notifyTemplateCategory] || [];
  const t    = msgs[_notifyTemplateIndex];
  if (!t) return;
  const titleEl = document.getElementById('notify-title');
  const msgEl   = document.getElementById('notify-message');
  if (titleEl) titleEl.value = t.title;
  if (msgEl)   msgEl.value   = t.message;
  _updateNotifyPreview();
  showToast('Template loaded — edit freely before sending!', 'info');
}

function _templateNext() {
  const msgs = _NOTIFY_TEMPLATES[_notifyTemplateCategory] || [];
  _notifyTemplateIndex = (_notifyTemplateIndex + 1) % msgs.length;
  const sel = document.getElementById('notify-tpl-msg');
  if (sel) sel.value = String(_notifyTemplateIndex);
  _applySelectedTemplate();
}

function _templatePrev() {
  const msgs = _NOTIFY_TEMPLATES[_notifyTemplateCategory] || [];
  _notifyTemplateIndex = (_notifyTemplateIndex - 1 + msgs.length) % msgs.length;
  const sel = document.getElementById('notify-tpl-msg');
  if (sel) sel.value = String(_notifyTemplateIndex);
  _applySelectedTemplate();
}

function _applyNotifyTemplate(key) {
  _notifyTemplateCategory = key;
  _notifyTemplateIndex    = 0;
  _applySelectedTemplate();
}

function _updateNotifyPreview() {
  const title = (document.getElementById('notify-title')?.value || '').trim();
  const msg   = (document.getElementById('notify-message')?.value || '').trim();
  document.getElementById('notify-prev-title').textContent = title || 'Title appears here';
  document.getElementById('notify-prev-body').textContent  = msg || 'Your message body will appear here as you type…';
  document.getElementById('notify-title-counter').textContent = title.length + '/80';
  document.getElementById('notify-msg-counter').textContent   = msg.length + '/240';
}

function _clearNotifyForm() {
  document.getElementById('notify-title').value = '';
  document.getElementById('notify-message').value = '';
  _updateNotifyPreview();
}

async function _sendAdminNotification() {
  const title = (document.getElementById('notify-title')?.value || '').trim();
  const msg   = (document.getElementById('notify-message')?.value || '').trim();

  if (!title) { showToast('Title is required', 'error'); return; }
  if (!msg)   { showToast('Message is required', 'error'); return; }

  const btn = document.getElementById('notify-send-btn');
  // Build human-readable audience description for confirm
  let audienceDesc = 'all subscribed users';
  if (_notifyAudience === 'active') audienceDesc = 'active users (7d)';
  else if (_notifyAudience === 'atrisk') audienceDesc = 'at-risk users (7+ days inactive)';
  else if (_notifyAudience === 'specific') audienceDesc = _notifySelectedUsers.size + ' selected user' + (_notifySelectedUsers.size === 1 ? '' : 's');
  if (!confirm(`Send this push to ${audienceDesc}?\n\nTitle: ${title}\n\nMessage: ${msg}`)) return;

  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    // Compute target users based on audience selection
    const targetUserIds = _computeNotifyTargetUserIds();

    // If specific selection but nothing chosen, abort
    if (_notifyAudience === 'specific' && (!targetUserIds || !targetUserIds.length)) {
      btn.disabled = false;
      btn.innerHTML = _notifyAudience === 'specific' ? '⚠️ Select at least 1 user' : '🚀 Send';
      showToast('Please select at least one user', 'error');
      return;
    }

    const res = await Sheets.post('sendAdminPush', {
      title,
      message: msg,
      sentBy: APP.currentUser?.email || 'admin',
      targetUserIds: targetUserIds,  // null = all subscribed
    });
    if (res?.success) {
      // res.targeted = devices we sent to (reliable)
      // res.recipients = OneSignal API field (often missing/0, unreliable)
      const targeted = res.targeted || res.recipients || 0;
      const msg = targeted > 0
        ? `✅ Push sent to ${targeted} device${targeted === 1 ? '' : 's'}!`
        : '⚠️ No subscribed devices yet. Have users opted in via the bell?';
      showToast(msg, targeted > 0 ? 'success' : 'info');
      if (targeted > 0) _clearNotifyForm();
      _loadNotifyHistory();
    } else {
      showToast('Failed: ' + (res?.error || 'unknown'), 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 Send to All Users';
  }
}

async function _loadPushDiagnostics() {
  const el = document.getElementById('push-diagnostics-panel');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px">Checking subscription status…</div>';
  try {
    const res = await Sheets.get('getPushDiagnostics');
    if (!res?.success) {
      el.innerHTML = `<div style="color:var(--accent);font-size:12px;padding:8px">⚠️ ${res?.error || 'Could not load diagnostics'}</div>`;
      return;
    }
    const { totalUsers, activeInOS, sheetOnly, notSubscribed, osTotal, osValid, oneSignalError, users } = res;

    // Status summary bar
    let summaryColor = activeInOS === 0 ? 'var(--accent)' : 'var(--g5)';
    let html = `
      <div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:${summaryColor}">
          ${activeInOS === 0 ? '⚠️ No users subscribed in OneSignal' : `✅ ${activeInOS} of ${totalUsers} users active in OneSignal`}
        </div>`;

    if (oneSignalError) {
      html += `<div style="font-size:11px;color:var(--accent);margin-bottom:6px">OneSignal API error: ${oneSignalError}</div>`;
    }

    html += `<div style="font-size:11px;color:var(--text3);display:flex;gap:16px;flex-wrap:wrap">
        <span>Total in OneSignal: <b>${osTotal}</b> (${osValid} valid)</span>
        <span>Sheet-only (stale): <b>${sheetOnly}</b></span>
        <span>Not subscribed: <b>${notSubscribed}</b></span>
      </div>
    </div>`;

    // Per-user table
    if (users && users.length) {
      html += `<div style="font-size:12px;color:var(--text3);margin-bottom:6px">Per-user subscription status:</div>
        <div style="display:flex;flex-direction:column;gap:4px">`;
      users.forEach(u => {
        const icon  = u.status === 'active' ? '🟢' : u.status === 'sheet_only' ? '🟡' : '🔴';
        const label = u.status === 'active'
          ? `Active (last seen: ${u.lastActive || 'unknown'})`
          : u.status === 'sheet_only'
          ? `Sheet only — not in OneSignal`
          : `Not subscribed`;
        html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:6px">
          <span>${icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--text)">${u.name || u.email}</div>
            <div style="font-size:11px;color:var(--text3)">${label}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<div style="color:var(--accent);font-size:12px;padding:8px">Error: ${e.message}</div>`;
  }
}

async function _loadNotifyHistory() {
  const list = document.getElementById('notify-history-list');
  if (!list) return;
  try {
    const res = await Sheets.get('getAdminPushLog');
    // Apps Script already deletes rows older than 3 days — this is a client-side safety filter
    const cutoff  = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const history = (res?.history || []).filter(h => !h.sentAt || new Date(h.sentAt).getTime() >= cutoff);
    if (!history.length) {
      list.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:14px;text-align:center">No notifications sent in the last 3 days</div>';
      return;
    }
    list.innerHTML = history.map(h => {
      const dt = h.sentAt ? new Date(h.sentAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : '';
      return `
        <div class="notify-history-item">
          <div class="notify-history-meta">
            <span class="notify-history-date">${dt}</span>
            <span class="notify-history-recipients">📤 ${h.recipients} recipients</span>
            ${h.sentBy ? `<span class="notify-history-sender">by ${h.sentBy}</span>` : ''}
          </div>
          <div class="notify-history-title">${h.title}</div>
          <div class="notify-history-body">${h.message}</div>
        </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:14px;text-align:center">Could not load history</div>';
  }
}

// ── FORCE APP REFRESH — pushes updates to all users ───────────────
// Writes a timestamp to Sheets. On each user's next sync, auth.js
// detects the new timestamp and reloads their app automatically.
// Use this after deploying new files so users get updates without
// manually clearing cache.
async function adminForceRefresh() {
  const btn = document.getElementById('force-refresh-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    const ts  = Date.now();
    const res = await Sheets.post('saveContent', {
      key:   'force_reload_ts',
      value: ts,
    });

    if (res?.success) {
      const timeStr = new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (btn) {
        btn.textContent    = '✅ Refresh Sent!';
        btn.style.background   = 'rgba(67,160,90,0.25)';
        btn.style.borderColor  = 'var(--g4)';
        btn.style.color        = 'var(--g5)';
      }
      // Update the "last triggered" label
      const lastEl = document.getElementById('force-refresh-last');
      if (lastEl) lastEl.textContent = 'Last triggered: ' + timeStr;
      showToast('✅ All users will refresh automatically on next app open', 'success');
      // Re-enable after 10s
      setTimeout(() => {
        if (btn) {
          btn.disabled       = false;
          btn.textContent    = '🔄 Force Refresh All Users';
          btn.style.background   = '';
          btn.style.borderColor  = '';
          btn.style.color        = '';
        }
      }, 10000);
    } else {
      showToast('Failed to send refresh signal. Try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Force Refresh All Users'; }
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Force Refresh All Users'; }
  }
}
