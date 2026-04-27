// ════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ════════════════════════════════════════════════════════════════

function renderAdminPanel() {
  if (APP.currentUser?.role !== 'ADMIN') { showToast('Access denied', 'error'); return; }
  loadAdminUsers();
  renderAdminStats();
}

// ── STATS ─────────────────────────────────────────────────────────
function renderAdminStats() {
  const allLogs    = Store.getLogs();
  const allRunLogs = Store.getRunLogs();
  const today      = todayStr();
  const todayActive = [...new Set(allLogs.filter(l => l.date === today).map(l => l.userId))].length;

  document.getElementById('admin-stat-workouts').textContent = allLogs.length;
  document.getElementById('admin-stat-runs').textContent     = allRunLogs.length;
  document.getElementById('admin-stat-today').textContent    = todayActive;
}

// ── LOAD USERS from Sheets ────────────────────────────────────────
async function loadAdminUsers() {
  document.getElementById('admin-users-list').innerHTML =
    '<div style="text-align:center;padding:24px;color:var(--text3)"><div class="loader" style="margin:0 auto 8px"></div>Loading users…</div>';
  document.getElementById('admin-stat-users').textContent = '…';

  const cfg = Store.getSheetsConfig();
  let users = [];

  if (cfg.webAppUrl) {
    const res = await Sheets.get('getAllUsers');
    if (res?.success) users = res.users;
    else showToast('Could not load users from Sheets.', 'error');
  } else {
    showToast('⚠️ Configure Google Sheets first!', 'info');
  }

  document.getElementById('admin-stat-users').textContent = users.filter(u => u.role !== 'ADMIN').length;
  renderUsersList(users);
}

function renderUsersList(users) {
  const logs = Store.getLogs();
  const container = document.getElementById('admin-users-list');

  if (!users.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No users yet.<br>Add your first user below.</p></div>';
    return;
  }

  container.innerHTML = users.map(u => {
    const userLogs = logs.filter(l => l.userId === u.id);
    const lastLog  = userLogs.sort((a,b) => (b.date||'').localeCompare(a.date||''))[0];
    const isAdmin  = u.role === 'ADMIN';
    const isFirst  = u.isFirstLogin === true || u.isFirstLogin === 'TRUE';

    return `
      <div class="user-row" style="margin-bottom:8px">
        <div class="user-avatar">${(u.name||'?').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${u.name} ${isAdmin ? '👑' : ''}</div>
          <div class="user-email">${u.email}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${isFirst ? '🔑 Awaiting first login' : `Last active: ${lastLog?.date || u.lastLogin || 'Never'}`}
            · Created: ${u.createdDate || '—'}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span class="badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}">${u.status}</span>
          ${!isAdmin ? `
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="toggleStatus('${u.id}','${u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}',this)">
                ${u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
            </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── TOGGLE USER STATUS ────────────────────────────────────────────
async function toggleStatus(userId, newStatus, btn) {
  btn.disabled = true;
  btn.textContent = '…';

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) { showToast('Sheets not configured.', 'error'); btn.disabled = false; return; }

  const res = await Sheets.post('updateUserStatus', { userId, status: newStatus });
  if (res?.success) {
    showToast(`User ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}.`, 'success');
    loadAdminUsers();
  } else {
    showToast('Failed to update status.', 'error');
    btn.disabled = false;
  }
}

// ── ADD USER MODAL ────────────────────────────────────────────────
function openAddUser() {
  document.getElementById('new-user-name').value  = '';
  document.getElementById('new-user-email').value = '';
  document.getElementById('new-user-pass').value  = '';
  document.getElementById('new-user-role').value  = 'USER';
  document.getElementById('new-user-error').textContent = '';
  openModal('modal-add-user');
}

async function saveNewUser() {
  const name      = document.getElementById('new-user-name').value.trim();
  const email     = document.getElementById('new-user-email').value.trim().toLowerCase();
  const tempPass  = document.getElementById('new-user-pass').value.trim();
  const role      = document.getElementById('new-user-role').value;
  const errEl     = document.getElementById('new-user-error');
  const btn       = document.getElementById('save-user-btn');

  errEl.textContent = '';
  if (!name || !email || !tempPass) { errEl.textContent = 'All fields are required.'; return; }
  if (tempPass.length < 4) { errEl.textContent = 'Temporary password must be at least 4 characters.'; return; }

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) {
    errEl.textContent = 'Google Sheets not configured. Go to Content → Configure Sheets first.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating…';

  const res = await Sheets.post('createUser', {
    name, email, tempPassword: tempPass, role,
    createdBy: APP.currentUser?.name || 'Admin'
  });

  btn.disabled = false;
  btn.textContent = 'Create User';

  if (!res?.success) {
    errEl.textContent = res?.error || 'Failed to create user.';
    return;
  }

  closeModal('modal-add-user');
  showToast(`✅ User "${name}" created! Temp password: ${tempPass}`, 'success');
  loadAdminUsers();
  renderAdminStats();
}

// ── ALL HISTORY ───────────────────────────────────────────────────
function renderAllHistory() {
  const allLogs = Store.getLogs().sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));
  const container = document.getElementById('all-history-list');
  container.innerHTML = allLogs.slice(0,50).map(l => `
    <div class="user-row" style="margin-bottom:6px">
      <div class="user-avatar" style="font-size:18px">${getModuleEmoji(l.module)}</div>
      <div class="user-info">
        <div class="user-name">${l.userId} — ${getModuleName(l.module)}</div>
        <div class="user-email">${l.day} · ${l.date}</div>
      </div>
      <span class="badge badge-green">✓</span>
    </div>`).join('')
    || '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet.</p></div>';
}

// ── CONTENT LINKS ─────────────────────────────────────────────────
function renderContentLinks() {
  const container = document.getElementById('content-links-list');
  const modules = ['cardio','gym','yoga','stretching','running'];

  container.innerHTML = modules.map(m => `
    <div class="card card-sm" style="margin-bottom:8px">
      <div style="font-weight:700;margin-bottom:10px">${getModuleEmoji(m)} ${getModuleName(m)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','hydration')">💧 Edit Hydration</button>
        <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','diet')">🥗 Edit Diet</button>
      </div>
    </div>`).join('');

  container.innerHTML += `
    <div class="card" style="margin-top:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
      <div style="font-weight:700;margin-bottom:8px">🔗 Google Sheets Backend</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.6">
        All user data, logins, and workout completions sync to your Google Sheet.
        <br><strong style="color:var(--accent)">Required</strong> for user creation and login to work.
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSheetsConfig()">⚙️ Configure Sheets URL</button>
    </div>`;
}

// ── CONTENT EDITOR ────────────────────────────────────────────────
function openContentEditor(moduleId, type) {
  APP.editingContent = { moduleId, type };
  document.getElementById('content-editor-title').textContent = `Edit ${type === 'hydration' ? 'Hydration' : 'Diet'} — ${getModuleName(moduleId)}`;
  const override = Store.getContent(`${type}_${moduleId}`);
  const defaults = type === 'hydration' ? APP_DATA.hydration.default : (APP_DATA.diet.modules[moduleId] || APP_DATA.diet.modules.cardio);
  document.getElementById('content-editor-text').value = JSON.stringify(override || defaults, null, 2);
  openModal('modal-content-editor');
}

async function saveContentEdit() {
  const { moduleId, type } = APP.editingContent || {};
  const raw = document.getElementById('content-editor-text').value;
  try {
    const parsed = JSON.parse(raw);
    Store.setContent(`${type}_${moduleId}`, parsed);
    // Sync to Sheets
    await Sheets.post('saveContent', { key: `${type}_${moduleId}`, value: parsed });
    closeModal('modal-content-editor');
    showToast('Content updated!', 'success');
  } catch {
    showToast('Invalid JSON — check and try again.', 'error');
  }
}

// ── SHEETS CONFIG ─────────────────────────────────────────────────
function openSheetsConfig() {
  const cfg = Store.getSheetsConfig();
  document.getElementById('sheets-url').value = cfg.webAppUrl || '';
  openModal('modal-sheets-config');
}

async function saveSheetsConfig() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Please enter the Web App URL.', 'error'); return; }
  Store.setSheetsConfig({ webAppUrl: url });
  closeModal('modal-sheets-config');
  showToast('Sheets URL saved!', 'success');
}

async function testSheetsConnection() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Enter the URL first.', 'error'); return; }
  // Temporarily set to test
  const prev = Store.getSheetsConfig();
  Store.setSheetsConfig({ webAppUrl: url });
  showToast('Testing…', 'info');
  const res = await Sheets.get('ping');
  Store.setSheetsConfig(prev);
  if (res?.success) showToast('✅ Connected to Google Sheets!', 'success');
  else showToast('❌ Connection failed. Check the URL.', 'error');
}

// ── ADMIN TABS ────────────────────────────────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
  const el = document.getElementById('admin-tab-' + tab);
  if (el) el.style.display = 'block';
  if (tab === 'history') renderAllHistory();
  if (tab === 'content') renderContentLinks();
}
