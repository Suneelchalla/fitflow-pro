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
  // Default to Dashboard tab
  const dashBtn = document.querySelector('.admin-nav-btn[data-tab="dashboard"]');
  if (dashBtn) switchAdminTab('dashboard', dashBtn);
}

function renderAdminStats() {
  const allLogs     = Store.getLogs();
  const allRunLogs  = Store.getRunLogs();
  const today       = todayStr();
  const todayActive = [...new Set(allLogs.filter(l => l.date === today).map(l => l.userId))].length;
  const stdLogs     = allLogs.filter(l => !l.module.startsWith('custom_'));
  const cwLogs      = allLogs.filter(l => l.module.startsWith('custom_'));
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

  const res = await Sheets.get('getAllUsers');
  if (!res?.success) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div>
      <p>Failed to load users.<br>${res?.error || 'Check your Sheets URL.'}</p></div>`;
    return;
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
            ${isGoogleUser ? '<span style="font-size:10px;background:rgba(66,133,244,0.15);color:#90caf9;border:1px solid rgba(66,133,244,0.3);border-radius:50px;padding:1px 8px;font-weight:600">G Google</span>' : ''}
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
    { id: 'cardio',       name: 'Home Cardio',    emoji: '🏠',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'gym',          name: 'Gym Workouts',   emoji: '🏋️',   hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'yoga',         name: 'Yoga',           emoji: '🧘',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'stretching',   name: 'Stretching',     emoji: '🤸',    hasSections: ['exercises','hydration','diet'] },
    { id: 'running',      name: 'Running',        emoji: '🏃',    hasSections: ['warmup','cooldown','hydration','diet'] },
    { id: 'calisthenics', name: 'Calisthenics',   emoji: '🤸‍♂️', hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
    { id: 'core',         name: 'Core & Abs',     emoji: '🔥',    hasSections: ['exercises','warmup','cooldown','hydration','diet'] },
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
    cardio:       { name: 'Home Cardio',   emoji: '🏠' },
    gym:          { name: 'Gym Workouts',  emoji: '🏋️' },
    yoga:         { name: 'Yoga',          emoji: '🧘' },
    stretching:   { name: 'Stretching',    emoji: '🤸' },
    running:      { name: 'Running',       emoji: '🏃' },
    calisthenics: { name: 'Calisthenics',  emoji: '🤸‍♂️' },
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
    stretching:   ['warmup','cooldown','plans'],
    running:      ['exercises'],
    cardio:       ['plans'],
    gym:          ['plans'],
    yoga:         ['plans'],
    calisthenics: ['plans'],
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
        text:   (_text(el, 'text')   || '').replace(/^"|"$/g, '').trim(),
        author: (_text(el, 'author') || '').replace(/^—\s*/, '').trim(),
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
        <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 4px">Author</div>
        <div class="editable" data-field="author" contenteditable="true"
          style="font-size:13px;color:var(--text3)">— ${q.author || 'Unknown'}</div>
      </div>
    </div>`;
}

function addQuoteRow() {
  const list = document.getElementById('quotes-list');
  const div  = document.createElement('div');
  div.innerHTML = _quoteCard({ text: 'Enter quote here', author: 'Author Name' }, 999);
  activateEditing(div);
  list?.appendChild(div.firstElementChild);
  markDirty();
}

// ════════════════════════════════════════════════════════════════
// HISTORY
// ════════════════════════════════════════════════════════════════
function renderAllHistory() {
  const allLogs = Store.getLogs().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  const allRuns = Store.getRunLogs().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const combined = [
    ...allLogs.map(l => ({ ...l, _type: l.module.startsWith('custom_') ? 'custom' : 'workout' })),
    ...allRuns.map(r => ({ ...r, _type: 'run', module: 'running', day: 'Run', timestamp: r.timestamp || r.date })),
  ].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 80);

  document.getElementById('all-history-list').innerHTML = combined.length
    ? combined.map(l => {
        const isRun    = l._type === 'run';
        const isCustom = l._type === 'custom';
        const emoji    = isCustom ? '✏️' : getModuleEmoji(l.module);
        const name     = isCustom
          ? 'Custom: ' + (l.module.replace('custom_','').substring(0,12))
          : getModuleName(l.module);
        const badge    = isRun ? 'badge-blue' : isCustom ? 'badge-yellow' : 'badge-green';
        const label    = isRun ? '🏃 Run' : isCustom ? '✏️ Custom' : '✓ Done';
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
async function renderFeedbackList() {
  const container = document.getElementById('feedback-list');
  container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text3)">
    <div class="loader" style="margin:0 auto 12px"></div>Loading…</div>`;
  const res = await Sheets.get('getFeedback');
  if (!res?.success || !res.feedback?.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback yet.</p></div>';
    return;
  }
  container.innerHTML = res.feedback.map(f => `
    <div class="card card-sm" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div style="font-weight:700;font-size:14px">${f.name || 'Anonymous'}</div>
          <div style="font-size:12px;color:var(--text3)">${f.email || ''} · ${f.date || ''}</div>
        </div>
        <div>${'⭐'.repeat(Math.min(parseInt(f.rating) || 0, 5))}</div>
      </div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:6px">${f.message || ''}</div>
      ${f.category ? `<span class="badge badge-blue">${f.category}</span>` : ''}
    </div>`).join('');
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
function getModuleEmoji(mod) { return { cardio: '🏠', gym: '🏋️', yoga: '🧘', stretching: '🙆', running: '🏃', calisthenics: '🤸‍♂️', core: '🔥' }[mod] || '💪'; }
function getModuleName(mod)  { return { cardio: 'Home Cardio', gym: 'Gym Workouts', yoga: 'Yoga', stretching: 'Stretching', running: 'Running', calisthenics: 'Calisthenics', core: 'Core & Abs' }[mod] || mod; }

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
      ${_aKpi('📅','This Week', thisWeekLogs.length+' sessions', lastWeekLogs.length?(thisWeekLogs.length>=lastWeekLogs.length?'↑':'↓')+' vs last week':'')}
      ${_aKpi('🏃','Runs This Week', thisWeekRuns.length+' runs', thisWeekRuns.reduce((a,r)=>a+(r.distance||0),0).toFixed(1)+' km total')}
      ${_aKpi('👥','Active (7 days)', activeUserIds.length+' users', 'across all users')}
      ${_aKpi('📍','Today Sessions', todayLogs.length+' done', [...new Set(todayLogs.map(l=>l.userId))].length+' users active')}
    </div>

    <div class="card card-sm" style="margin-bottom:14px">
      <div class="section-title" style="margin-bottom:12px">📈 Activity — Last 14 Days</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:60px">
        ${dayKeys.map((d,i) => {
          const h = Math.max(4, Math.round(dayVals[i]/maxDay*56));
          const isToday = d===today;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center" title="${d}: ${dayVals[i]} sessions">
            <div style="width:100%;background:${isToday?'var(--accent)':'var(--g3)'};height:${h}px;border-radius:3px 3px 0 0;opacity:${isToday?1:0.75}"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
        <span>${dayKeys[0]?.slice(5)}</span><span>Today</span>
      </div>
    </div>

    <div class="card card-sm" style="margin-bottom:14px">
      <div class="section-title" style="margin-bottom:12px">🏆 Module Popularity</div>
      ${topMods.slice(0,6).map(([mod,cnt]) => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:18px;width:24px">${getModuleEmoji(mod)}</span>
          <div style="flex:1">
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
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">Consider sending a motivation push.</div>
      ${dropout.slice(0,5).map(uid=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px">${uid}</span>
          <span style="font-size:12px;color:#ef9a9a">Last: ${userLastActivity[uid]}</span>
        </div>`).join('')}
      ${dropout.length>5?`<div style="font-size:12px;color:var(--text3);margin-top:6px">+${dropout.length-5} more</div>`:''}
    </div>` : `
    <div class="card card-sm" style="border-color:rgba(67,160,90,0.3);background:rgba(67,160,90,0.05)">
      <div style="font-size:13px;color:var(--g5)">✅ All users active in the last 7 days!</div>
    </div>`}
  `;
}

function _aKpi(emoji, label, val, sub) {
  return `<div class="card card-sm" style="text-align:center">
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
  } catch(e) { console.warn('Dashboard fetch:', e.message); }

  _adminDashboardData = { users, allLogs, allRuns, fetchedAt: new Date() };
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
          const safeId = (a.userId||'').replace(/'/g, "\\'");
          return `
            <div class="dash-feed-item dash-clickable" onclick="_drillUser('${safeId}')">
              <div class="dash-feed-icon">${isRun?'🏃':_modIcon(a.module)}</div>
              <div class="dash-feed-info">
                <div class="dash-feed-text"><strong>${u?.name||a.userId||'Unknown'}</strong> completed <strong>${isRun?(a.distance||0).toFixed(2)+' km '+(a.activityType||'run'):_modName(a.module)}</strong></div>
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
          return `<div class="dash-user-row">
            <div class="dash-user-info">
              <div class="dash-user-name">${u?.name||uid}</div>
              <div class="dash-user-email">${u?.email||''}</div>
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
        return `<div class="dash-feed-item">
          <div class="dash-feed-icon">${isRun?'🏃':_modIcon(l.module)}</div>
          <div class="dash-feed-info">
            <div class="dash-feed-text"><strong>${u?.name||l.userId}</strong> · ${isRun?(l.distance||0).toFixed(2)+' km':_modName(l.module)}</div>
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


// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — ADMIN COMPOSE & SEND
// ════════════════════════════════════════════════════════════════

async function renderAdminNotify() {
  const container = document.getElementById('admin-notify-content');
  if (!container) return;

  // Render compose form
  container.innerHTML = `
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
          <div class="notify-templates-label">Quick templates:</div>
          <div class="notify-template-chips">
            <button class="admin-chip" onclick="_applyNotifyTemplate('motivation')">💪 Motivation</button>
            <button class="admin-chip" onclick="_applyNotifyTemplate('reminder')">⏰ Reminder</button>
            <button class="admin-chip" onclick="_applyNotifyTemplate('feature')">✨ New Feature</button>
            <button class="admin-chip" onclick="_applyNotifyTemplate('challenge')">🎯 Challenge</button>
          </div>
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
  motivation: {
    title: 'You got this! 💪',
    message: 'Every workout counts. Take 15 minutes for yourself today and feel amazing afterwards.',
  },
  reminder: {
    title: 'Time to move! ⏰',
    message: "Haven't logged a session today? A short workout is better than none. Open FitFlow now.",
  },
  feature: {
    title: 'New feature unlocked! ✨',
    message: 'Check out the latest update in FitFlow Pro. Open the app to explore.',
  },
  challenge: {
    title: 'Weekly challenge starts now 🎯',
    message: 'Complete 5 workouts this week to earn a special badge. Are you in?',
  },
};

function _applyNotifyTemplate(key) {
  const t = _NOTIFY_TEMPLATES[key];
  if (!t) return;
  const titleEl = document.getElementById('notify-title');
  const msgEl   = document.getElementById('notify-message');
  if (titleEl) titleEl.value = t.title;
  if (msgEl)   msgEl.value   = t.message;
  _updateNotifyPreview();
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

async function _loadNotifyHistory() {
  const list = document.getElementById('notify-history-list');
  if (!list) return;
  try {
    const res = await Sheets.get('getAdminPushLog');
    const history = res?.history || [];
    if (!history.length) {
      list.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:14px;text-align:center">No notifications sent yet</div>';
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
