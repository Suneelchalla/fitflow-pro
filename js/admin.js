// ── ADMIN PANEL ───────────────────────────────────────────────────
function renderAdminPanel() {
  const user = APP.currentUser;
  if (user?.role !== 'ADMIN') { showToast('Access denied', 'error'); return; }
  renderAdminUsers();
  renderAdminStats();
}

function renderAdminStats() {
  const allLogs = Store.getLogs();
  const allUsers = Store.getUsers().filter(u => u.role !== 'ADMIN');
  const allRunLogs = Store.getRunLogs();

  document.getElementById('admin-stat-users').textContent = allUsers.length;
  document.getElementById('admin-stat-workouts').textContent = allLogs.length;
  document.getElementById('admin-stat-runs').textContent = allRunLogs.length;

  const today = todayStr();
  const todayActive = [...new Set(allLogs.filter(l => l.date === today).map(l => l.userId))].length;
  document.getElementById('admin-stat-today').textContent = todayActive;
}

function renderAdminUsers() {
  const users = Store.getUsers();
  const container = document.getElementById('admin-users-list');
  const logs = Store.getLogs();

  container.innerHTML = users.map(u => {
    const userLogs = logs.filter(l => l.userId === u.id);
    const lastLog = userLogs.sort((a,b) => b.date?.localeCompare(a.date))[0];
    const isAdmin = u.role === 'ADMIN';
    return `
      <div class="user-row" style="margin-bottom:8px">
        <div class="user-avatar">${u.name?.charAt(0)?.toUpperCase() || '?'}</div>
        <div class="user-info">
          <div class="user-name">${u.name} ${isAdmin ? '👑' : ''}</div>
          <div class="user-email">${u.email}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Last active: ${lastLog?.date || 'Never'} · ${userLogs.length} workouts</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <span class="badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}">${u.status}</span>
          ${!isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="toggleUserStatus('${u.id}')">${u.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function toggleUserStatus(userId) {
  const users = Store.getUsers();
  const u = users.find(u => u.id === userId);
  if (!u) return;
  u.status = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  Store.saveUsers(users);
  showToast(`User ${u.status === 'ACTIVE' ? 'enabled' : 'disabled'}.`, 'info');
  renderAdminUsers();
}

// ── ADD USER MODAL ────────────────────────────────────────────────
function openAddUser() { openModal('modal-add-user'); }

function saveNewUser() {
  const name = document.getElementById('new-user-name').value.trim();
  const email = document.getElementById('new-user-email').value.trim().toLowerCase();
  const pass = document.getElementById('new-user-pass').value.trim();
  const role = document.getElementById('new-user-role').value;
  const errEl = document.getElementById('new-user-error');

  if (!name || !email || !pass) { errEl.textContent = 'All fields required.'; return; }
  if (Store.getUserByEmail(email)) { errEl.textContent = 'Email already exists.'; return; }

  const users = Store.getUsers();
  users.push({
    id: 'u_' + Date.now(),
    name, email, password: pass, role, status: 'ACTIVE',
    createdDate: todayStr()
  });
  Store.saveUsers(users);
  sheetsPost('createUser', { name, email, password: pass, role });

  closeModal('modal-add-user');
  showToast('User created successfully!', 'success');
  document.getElementById('new-user-name').value = '';
  document.getElementById('new-user-email').value = '';
  document.getElementById('new-user-pass').value = '';
  errEl.textContent = '';
  renderAdminUsers();
  renderAdminStats();
}

// ── ALL USERS HISTORY ─────────────────────────────────────────────
function renderAllHistory() {
  const allLogs = Store.getLogs().sort((a,b) => b.timestamp?.localeCompare(a.timestamp || '') || -1);
  const users = Store.getUsers();
  const container = document.getElementById('all-history-list');

  container.innerHTML = allLogs.slice(0, 50).map(l => {
    const u = users.find(u => u.id === l.userId);
    return `
      <div class="user-row" style="margin-bottom:6px">
        <div class="user-avatar" style="font-size:18px">${getModuleEmoji(l.module)}</div>
        <div class="user-info">
          <div class="user-name">${u?.name || l.userId} — ${getModuleName(l.module)}</div>
          <div class="user-email">${l.day} · ${l.date}</div>
        </div>
        <span class="badge badge-green">✓</span>
      </div>`;
  }).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet.</p></div>';
}

// ── CONTENT EDITOR ────────────────────────────────────────────────
function openContentEditor(moduleId, type) {
  APP.editingContent = { moduleId, type };
  const modal = document.getElementById('modal-content-editor');
  const title = document.getElementById('content-editor-title');
  const textarea = document.getElementById('content-editor-text');

  title.textContent = `Edit ${type === 'hydration' ? 'Hydration' : 'Diet'} — ${getModuleName(moduleId)}`;

  const override = Store.getContent(`${type}_${moduleId}`);
  if (override) {
    textarea.value = JSON.stringify(override, null, 2);
  } else {
    const defaults = type === 'hydration' ? APP_DATA.hydration.default : APP_DATA.diet.modules[moduleId] || APP_DATA.diet.modules.cardio;
    textarea.value = JSON.stringify(defaults, null, 2);
  }
  openModal('modal-content-editor');
}

function saveContentEdit() {
  const { moduleId, type } = APP.editingContent || {};
  const raw = document.getElementById('content-editor-text').value;
  try {
    const parsed = JSON.parse(raw);
    Store.setContent(`${type}_${moduleId}`, parsed);
    closeModal('modal-content-editor');
    showToast('Content updated for all users!', 'success');
  } catch {
    showToast('Invalid JSON. Please check and try again.', 'error');
  }
}

// ── SHEETS CONFIG MODAL ───────────────────────────────────────────
function openSheetsConfig() {
  const cfg = Store.getSheetsConfig();
  document.getElementById('sheets-url').value = cfg.webAppUrl || '';
  document.getElementById('sheets-id').value = cfg.spreadsheetId || '';
  openModal('modal-sheets-config');
}

function saveSheetsConfig() {
  const webAppUrl = document.getElementById('sheets-url').value.trim();
  const spreadsheetId = document.getElementById('sheets-id').value.trim();
  Store.setSheetsConfig({ webAppUrl, spreadsheetId });
  closeModal('modal-sheets-config');
  showToast('Google Sheets connected!', 'success');
}

async function testSheetsConnection() {
  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) { showToast('Enter Web App URL first.', 'error'); return; }
  showToast('Testing connection…', 'info');
  const res = await sheetsPost('ping', {});
  if (res) showToast('✓ Connected to Google Sheets!', 'success');
  else showToast('Connection failed. Check the URL.', 'error');
}

// ── ADMIN TABS ────────────────────────────────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('admin-tab-' + tab)?.classList.add('active');
  if (tab === 'history') renderAllHistory();
  if (tab === 'content') renderContentLinks();
}

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
        Connect your Google Sheets for cloud sync. All user data, workout completions, and running logs will sync to your spreadsheet.
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSheetsConfig()">⚙️ Configure Sheets</button>
    </div>`;
}
