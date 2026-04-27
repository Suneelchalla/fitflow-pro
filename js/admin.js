// ════════════════════════════════════════════════════════════════
// ADMIN PANEL — Full management, no user-style view
// ════════════════════════════════════════════════════════════════

function renderAdminPanel() {
  if (APP.currentUser?.role !== 'ADMIN') { showToast('Access denied', 'error'); return; }
  renderAdminStats();
  // Default to users tab
  const firstTab = document.querySelector('.admin-tab-btn');
  if (firstTab) switchAdminTab('users', firstTab);
}

// ── STATS ─────────────────────────────────────────────────────────
function renderAdminStats() {
  const allLogs    = Store.getLogs();
  const allRunLogs = Store.getRunLogs();
  const today      = todayStr();
  const todayActive = [...new Set(allLogs.filter(l=>l.date===today).map(l=>l.userId))].length;

  document.getElementById('admin-stat-workouts').textContent = allLogs.length;
  document.getElementById('admin-stat-runs').textContent     = allRunLogs.length;
  document.getElementById('admin-stat-today').textContent    = todayActive;
}

// ── LOAD USERS FROM SHEETS ────────────────────────────────────────
async function loadAdminUsers() {
  const container = document.getElementById('admin-users-list');
  container.innerHTML = `
    <div style="text-align:center;padding:32px;color:var(--text3)">
      <div class="loader" style="margin:0 auto 12px"></div>
      Loading users from Google Sheets…
    </div>`;
  document.getElementById('admin-stat-users').textContent = '…';

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) {
    container.innerHTML = `
      <div class="card" style="background:rgba(240,192,64,0.08);border-color:rgba(240,192,64,0.25);text-align:center;padding:24px">
        <div style="font-size:32px;margin-bottom:10px">⚠️</div>
        <div style="font-weight:700;margin-bottom:6px">Google Sheets Not Configured</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Configure your Sheets URL to manage users.</div>
        <button class="btn btn-primary" onclick="openSheetsConfig()">⚙️ Configure Now</button>
      </div>`;
    document.getElementById('admin-stat-users').textContent = '—';
    return;
  }

  const res = await Sheets.get('getAllUsers');
  if (!res?.success) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>Failed to load users.<br>${res?.error||'Check your Sheets URL.'}</p></div>`;
    return;
  }

  const users = res.users || [];
  document.getElementById('admin-stat-users').textContent = users.filter(u=>u.role!=='ADMIN').length;
  renderUsersList(users);
}

function renderUsersList(users) {
  const logs = Store.getLogs();
  const container = document.getElementById('admin-users-list');

  if (!users.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No users yet.<br>Add your first user below.</p></div>`;
    return;
  }

  container.innerHTML = users.map(u => {
    const userLogs = logs.filter(l=>l.userId===u.id);
    const lastLog  = userLogs.sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
    const isAdmin  = u.role === 'ADMIN';
    const isFirst  = u.isFirstLogin===true || u.isFirstLogin==='TRUE';
    const statusColor = u.status==='ACTIVE' ? 'badge-green' : 'badge-red';

    return `
      <div class="user-row" style="margin-bottom:8px">
        <div class="user-avatar">${(u.name||'?').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${u.name}${isAdmin ? ' 👑' : ''}</div>
          <div class="user-email">${u.email}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:3px">
            ${isFirst
              ? '<span style="color:var(--accent)">🔑 Awaiting first login · password not yet set</span>'
              : `Last active: ${lastLog?.date || u.lastLogin || 'Never'}`}
          </div>
          <div style="font-size:11px;color:var(--text3)">
            Created: ${u.createdDate||'—'} · ${userLogs.length} workouts
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
          <span class="badge ${statusColor}">${u.status}</span>
          ${!isAdmin ? `
            <button class="btn btn-ghost btn-sm"
              onclick="toggleStatus('${u.id}','${u.status==='ACTIVE'?'INACTIVE':'ACTIVE'}',this)">
              ${u.status==='ACTIVE' ? '🚫 Disable' : '✅ Enable'}
            </button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── TOGGLE STATUS ─────────────────────────────────────────────────
async function toggleStatus(userId, newStatus, btn) {
  btn.disabled = true; btn.textContent = '…';
  const res = await Sheets.post('updateUserStatus', { userId, status: newStatus });
  if (res?.success) { showToast(`User ${newStatus==='ACTIVE'?'enabled':'disabled'}.`,'success'); loadAdminUsers(); }
  else { showToast('Failed to update.','error'); btn.disabled=false; btn.textContent = newStatus==='ACTIVE'?'✅ Enable':'🚫 Disable'; }
}

// ── ADD USER MODAL ────────────────────────────────────────────────
function openAddUser() {
  ['new-user-name','new-user-email','new-user-pass'].forEach(id => document.getElementById(id).value='');
  document.getElementById('new-user-role').value = 'USER';
  document.getElementById('new-user-error').textContent = '';
  openModal('modal-add-user');
}

async function saveNewUser() {
  const name     = document.getElementById('new-user-name').value.trim();
  const email    = document.getElementById('new-user-email').value.trim().toLowerCase();
  const tempPass = document.getElementById('new-user-pass').value.trim();
  const role     = document.getElementById('new-user-role').value;
  const errEl    = document.getElementById('new-user-error');
  const btn      = document.getElementById('save-user-btn');

  errEl.textContent = '';
  if (!name||!email||!tempPass) { errEl.textContent='All fields are required.'; return; }
  if (tempPass.length<4)        { errEl.textContent='Temp password must be at least 4 characters.'; return; }

  const cfg = Store.getSheetsConfig();
  if (!cfg.webAppUrl) { errEl.textContent='Configure Google Sheets first (Content tab → Configure Sheets).'; return; }

  btn.disabled=true; btn.textContent='Creating…';

  const res = await Sheets.post('createUser', {
    name, email, tempPassword: tempPass, role,
    createdBy: APP.currentUser?.name||'Admin'
  });

  btn.disabled=false; btn.textContent='Create User';

  if (!res?.success) { errEl.textContent = res?.error||'Failed to create user.'; return; }

  closeModal('modal-add-user');
  showToast(`✅ "${name}" created! Share temp password: ${tempPass}`, 'success');
  loadAdminUsers();
  renderAdminStats();
}

// ── ALL HISTORY ───────────────────────────────────────────────────
function renderAllHistory() {
  const allLogs = Store.getLogs().sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''));
  const allRuns = Store.getRunLogs().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const container = document.getElementById('all-history-list');

  const combined = [
    ...allLogs.map(l => ({ ...l, _type:'workout' })),
    ...allRuns.map(r => ({ ...r, _type:'run', module:'running', day:'Run', timestamp: r.timestamp||r.date }))
  ].sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||'')).slice(0,60);

  container.innerHTML = combined.length ? combined.map(l => `
    <div class="user-row" style="margin-bottom:6px">
      <div class="user-avatar" style="font-size:18px">${getModuleEmoji(l.module)}</div>
      <div class="user-info">
        <div class="user-name">${l.userId||'—'} — ${getModuleName(l.module)}</div>
        <div class="user-email">${l._type==='run' ? `${(l.distance||0).toFixed(2)}km · ${fmtTime(l.duration||0)}` : l.day} · ${l.date||'—'}</div>
      </div>
      <span class="badge ${l._type==='run'?'badge-blue':'badge-green'}">${l._type==='run'?'🏃 Run':'✓ Done'}</span>
    </div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet.</p></div>';
}

// ── QUOTES MANAGEMENT ─────────────────────────────────────────────
function renderQuotesManager() {
  const container = document.getElementById('quotes-manager');
  const quotes = Store.getContent('custom_quotes') || APP_DATA.quotes;

  container.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
        These quotes appear for <strong>users</strong> on their daily motivational screen.<br>
        Admin login skips the quote page entirely.
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddQuoteModal()" style="margin-bottom:16px">+ Add New Quote</button>
    </div>
    ${quotes.map((q, i) => `
      <div class="card card-sm" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;margin-bottom:3px;line-height:1.4">"${q.text}"</div>
            <div style="font-size:12px;color:var(--text3)">— ${q.author}</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="flex-shrink:0;color:var(--danger)"
            onclick="deleteQuote(${i})">✕</button>
        </div>
      </div>`).join('')}`;
}

function openAddQuoteModal() {
  document.getElementById('new-quote-text').value = '';
  document.getElementById('new-quote-author').value = '';
  openModal('modal-add-quote');
}

function saveNewQuote() {
  const text   = document.getElementById('new-quote-text').value.trim();
  const author = document.getElementById('new-quote-author').value.trim() || 'Unknown';
  if (!text) { showToast('Quote text is required.', 'error'); return; }

  const quotes = Store.getContent('custom_quotes') || [...APP_DATA.quotes];
  quotes.push({ text, author });
  Store.setContent('custom_quotes', quotes);
  // Sync to Sheets
  Sheets.post('saveContent', { key:'custom_quotes', value: quotes });

  closeModal('modal-add-quote');
  showToast('Quote added! Users will see it on next login.', 'success');
  renderQuotesManager();
}

function deleteQuote(index) {
  const quotes = Store.getContent('custom_quotes') || [...APP_DATA.quotes];
  quotes.splice(index, 1);
  Store.setContent('custom_quotes', quotes);
  Sheets.post('saveContent', { key:'custom_quotes', value: quotes });
  renderQuotesManager();
  showToast('Quote removed.', 'info');
}

// ── CONTENT EDITOR ────────────────────────────────────────────────
function renderContentLinks() {
  const container = document.getElementById('content-links-list');
  const modules = ['cardio','gym','yoga','stretching','running'];

  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
      <div style="font-weight:700;margin-bottom:4px">🔗 Google Sheets Backend</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
        Required for user login, creation and data sync.
        ${Store.getSheetsConfig().webAppUrl
          ? '<span style="color:var(--g5)"> ✅ Connected</span>'
          : '<span style="color:var(--accent)"> ⚠️ Not configured</span>'}
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSheetsConfig()">⚙️ Configure Sheets URL</button>
    </div>

    <div class="section-title">Edit Module Content</div>
    ${modules.map(m => `
      <div class="card card-sm" style="margin-bottom:8px">
        <div style="font-weight:700;margin-bottom:10px">${getModuleEmoji(m)} ${getModuleName(m)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','hydration')">💧 Edit Hydration</button>
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','diet')">🥗 Edit Diet</button>
        </div>
      </div>`).join('')}`;
}

function openContentEditor(moduleId, type) {
  APP.editingContent = { moduleId, type };
  document.getElementById('content-editor-title').textContent =
    `Edit ${type==='hydration'?'Hydration':'Diet'} — ${getModuleName(moduleId)}`;
  const override = Store.getContent(`${type}_${moduleId}`);
  const defaults = type==='hydration' ? APP_DATA.hydration.default : (APP_DATA.diet.modules[moduleId]||APP_DATA.diet.modules.cardio);
  document.getElementById('content-editor-text').value = JSON.stringify(override||defaults, null, 2);
  openModal('modal-content-editor');
}

async function saveContentEdit() {
  const { moduleId, type } = APP.editingContent||{};
  try {
    const parsed = JSON.parse(document.getElementById('content-editor-text').value);
    Store.setContent(`${type}_${moduleId}`, parsed);
    await Sheets.post('saveContent', { key:`${type}_${moduleId}`, value:parsed });
    closeModal('modal-content-editor');
    showToast('Content updated for all users!', 'success');
  } catch { showToast('Invalid JSON — check and try again.', 'error'); }
}

// ── SHEETS CONFIG ─────────────────────────────────────────────────
function openSheetsConfig() {
  document.getElementById('sheets-url').value = Store.getSheetsConfig().webAppUrl||'';
  openModal('modal-sheets-config');
}

async function saveSheetsConfig() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Please enter the Web App URL.','error'); return; }
  Store.setSheetsConfig({ webAppUrl: url });
  closeModal('modal-sheets-config');
  showToast('Sheets URL saved! ✅','success');
  renderContentLinks(); // refresh connection status
}

async function testSheetsConnection() {
  const url = document.getElementById('sheets-url').value.trim();
  if (!url) { showToast('Enter the URL first.','error'); return; }
  const prev = Store.getSheetsConfig();
  Store.setSheetsConfig({ webAppUrl: url });
  showToast('Testing…','info');
  const res = await Sheets.get('ping');
  Store.setSheetsConfig(prev);
  if (res?.success) showToast('✅ Connected to Google Sheets!','success');
  else showToast('❌ Connection failed. Check the URL.','error');
}

// ── ADMIN TABS ────────────────────────────────────────────────────
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display='none');
  const el = document.getElementById('admin-tab-'+tab);
  if (el) el.style.display = 'block';

  if (tab==='users')   loadAdminUsers();
  if (tab==='history') renderAllHistory();
  if (tab==='content') renderContentLinks();
  if (tab==='quotes')  renderQuotesManager();
}

// ── MODULE HELPERS ────────────────────────────────────────────────
function getModuleEmoji(mod) {
  return { cardio:'🏠', gym:'🏋️', yoga:'🧘', stretching:'🤸', running:'🏃' }[mod]||'💪';
}
function getModuleName(mod) {
  return { cardio:'Home Cardio', gym:'Gym Workouts', yoga:'Yoga', stretching:'Stretching', running:'Running' }[mod]||mod;
}

// ── FEEDBACK MANAGEMENT ───────────────────────────────────────────
async function renderFeedbackList() {
  const container = document.getElementById('feedback-list');
  container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)"><div class="loader" style="margin:0 auto 12px"></div>Loading feedback…</div>';

  const res = await Sheets.get('getFeedback');
  if (!res?.success || !res.feedback?.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback submitted yet.</p></div>';
    return;
  }

  container.innerHTML = res.feedback.map(f => `
    <div class="card card-sm" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div style="font-weight:700;font-size:14px">${f.name || 'Anonymous'}</div>
          <div style="font-size:12px;color:var(--text3)">${f.email||''} · ${f.date||''}</div>
        </div>
        <div style="display:flex;gap:4px">
          ${'⭐'.repeat(parseInt(f.rating)||0)}
        </div>
      </div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5">${f.message||''}</div>
      ${f.category ? `<div style="margin-top:6px"><span class="badge badge-blue">${f.category}</span></div>` : ''}
    </div>`).join('');
}

// ── CONTENT EDITOR — include warmup/cooldown ──────────────────────
function renderContentLinks() {
  const container = document.getElementById('content-links-list');
  const modules = ['cardio','gym','yoga','stretching','running'];

  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,var(--g1),var(--g2))">
      <div style="font-weight:700;margin-bottom:4px">🔗 Google Sheets Backend</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
        Required for user login, creation and data sync.
        ${Store.getSheetsConfig().webAppUrl
          ? '<span style="color:var(--g5)"> ✅ Connected</span>'
          : '<span style="color:var(--accent)"> ⚠️ Not configured</span>'}
      </div>
      <button class="btn btn-primary btn-sm" onclick="openSheetsConfig()">⚙️ Configure Sheets URL</button>
    </div>

    <div class="section-title">Edit Module Content</div>
    ${modules.map(m => `
      <div class="card card-sm" style="margin-bottom:8px">
        <div style="font-weight:700;margin-bottom:10px">${getModuleEmoji(m)} ${getModuleName(m)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','warmup')">🔥 Warm-Up</button>
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','cooldown')">🧘 Cool-Down</button>
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','hydration')">💧 Hydration</button>
          <button class="btn btn-outline btn-sm" onclick="openContentEditor('${m}','diet')">🥗 Diet</button>
        </div>
      </div>`).join('')}`;
}

function openContentEditor(moduleId, type) {
  APP.editingContent = { moduleId, type };
  const labels = { warmup:'Warm-Up', cooldown:'Cool-Down', hydration:'Hydration', diet:'Diet' };
  document.getElementById('content-editor-title').textContent = `Edit ${labels[type]||type} — ${getModuleName(moduleId)}`;

  let defaults;
  if (type === 'warmup')    defaults = APP_DATA.warmups[moduleId]    || APP_DATA.warmups.cardio    || [];
  else if (type === 'cooldown') defaults = APP_DATA.cooldowns[moduleId] || APP_DATA.cooldowns.cardio || [];
  else if (type === 'hydration') defaults = APP_DATA.hydration.default;
  else defaults = APP_DATA.diet.modules[moduleId] || APP_DATA.diet.modules.cardio;

  const override = Store.getContent(`${type}_${moduleId}`);
  document.getElementById('content-editor-text').value = JSON.stringify(override || defaults, null, 2);
  openModal('modal-content-editor');
}
