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
  // Default to users tab
  const firstBtn = document.querySelector('.admin-tab-btn');
  if (firstBtn) switchAdminTab('users', firstBtn);
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
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
  const tabEl = document.getElementById('admin-tab-' + tab);
  if (tabEl) tabEl.style.display = 'block';
  if (tab === 'users')     loadAdminUsers();
  if (tab === 'analytics') renderAdminAnalytics();
  if (tab === 'history')   renderAllHistory();
  if (tab === 'custom')    renderAdminCustomWorkouts();
  if (tab === 'feedback')  renderFeedbackList();
  if (tab === 'announce')  renderAdminAnnounce();
  if (tab === 'content')   renderContentHome();
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

function renderUsersList(users) {
  const logs      = Store.getLogs();
  const container = document.getElementById('admin-users-list');
  if (!users.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No users yet.</p></div>`;
    return;
  }
  container.innerHTML = users.map(u => {
    const role     = (u.role   || 'USER').toUpperCase().trim();
    const status   = (u.status || 'ACTIVE').toUpperCase().trim();
    const isAdmin  = role   === 'ADMIN';
    const isActive = status === 'ACTIVE';
    const isFirst  = u.isFirstLogin === true || String(u.isFirstLogin).toUpperCase() === 'TRUE';
    const userLogs = logs.filter(l => l.userId === u.id);
    const lastLog  = userLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    const safeId   = (u.id || '').toString().replace(/'/g, "\\'");
    return `
      <div class="user-row" style="margin-bottom:8px" id="user-row-${safeId}">
        <div class="user-avatar">${(u.name || '?').charAt(0).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${u.name || '—'}${isAdmin ? ' 👑' : ''}</div>
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
                onclick="openAdminResetPassword('${safeId}','${(u.name||'').replace(/'/g,"\\'")}')">
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
function openAdminResetPassword(userId, userName) {
  document.getElementById('arp-user-name').textContent  = userName || 'User';
  document.getElementById('arp-error').textContent      = '';
  document.getElementById('arp-new-pass').value         = '';
  document.getElementById('arp-confirm-pass').value     = '';
  // Default to temp password mode (forces user to change on login)
  const forceChangeEl = document.getElementById('arp-force-change');
  if (forceChangeEl) forceChangeEl.checked = true;
  document.getElementById('arp-submit-btn').dataset.userId = userId;
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
    // Yoga uses progressive Day 1-90 schedule — collect differently
    if (moduleId === 'yoga') {
      await _collectAndSaveYoga();
      return;
    }

    const days   = getWeekDays();
    const result = { days: {} };
    days.forEach(day => {
      const dayEl = document.querySelector(`[data-day="${day}"]`);
      if (!dayEl) {
        // Day not in DOM — always use APP_DATA_DEFAULT as the ground truth
        const _D = window.APP_DATA_DEFAULT || window.APP_DATA;
        result.days[day] = _D.modules?.[moduleId]?.days?.[day] || [];
        return;
      }
      result.days[day] = Array.from(dayEl.querySelectorAll('.ex-row')).map(row => {
        const isHoldBased = moduleId === 'yoga' || moduleId === 'stretching';
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
          name:  _text(row, 'name'),
          sets:  parseInt(_text(row, 'sets')) || 3,
          reps:  _text(row, 'reps'),
          desc:  _text(row, 'desc'),
          demo:  _text(row, 'demo'),
          image: _text(row, 'image'),
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

// ── YOGA PROGRESSIVE SAVE ─────────────────────────────────────────
async function _collectAndSaveYoga() {
  const yogaData = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const result   = { schedule: {}, phases: yogaData?.phases || [] };

  // Collect all day editors that are in the DOM
  document.querySelectorAll('[data-yoga-poses]').forEach(container => {
    const dayKey = container.getAttribute('data-yoga-poses');
    if (!dayKey) return;

    // Get focus for this day
    const focusEl = document.querySelector(`[data-yoga-day="${dayKey}"][data-field="focus"]`);
    const focus   = (focusEl?.innerText || '').trim();

    // Get all poses in this day
    const poses = Array.from(container.querySelectorAll('.ex-row')).map(row => ({
      name: _text(row, 'name'),
      hold: _text(row, 'hold'),
      desc: _text(row, 'desc'),
      demo: _text(row, 'demo'),
    }));

    result.schedule[dayKey] = { focus, poses };
  });

  // For days NOT in DOM, preserve original data
  const origSchedule = yogaData?.schedule || {};
  Object.keys(origSchedule).forEach(dayKey => {
    if (!result.schedule[dayKey]) {
      result.schedule[dayKey] = origSchedule[dayKey];
    }
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
  // Yoga uses progressive Day 1-90 schedule — use special renderer
  if (moduleId === 'yoga') {
    renderYogaProgressiveEditor(body);
    return;
  }
  const days = getWeekDays();
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit. Applies to all users after saving.
    </div>
    ${days.map(day => {
      // Use APP_DATA_DEFAULT (immutable backup from data.js) as ground truth
      // so Sheets sync can never wipe the default exercises
      const defaults   = window.APP_DATA_DEFAULT || window.APP_DATA;
      const appDefault = defaults.modules?.[moduleId]?.days?.[day] || [];
      const saved      = Store.getContent('exercises_' + moduleId);
      const savedDay   = saved?.days?.[day] || [];
      // Only use Sheets saved version if admin explicitly added MORE exercises
      const exercises  = savedDay.length > appDefault.length ? savedDay : appDefault;
      return `
        <div style="margin-bottom:8px">
          <div style="padding:10px 16px;background:rgba(46,125,70,0.15);font-weight:700;font-size:14px;
            display:flex;justify-content:space-between;align-items:center">
            <span>📅 ${day}</span>
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

// ── YOGA PROGRESSIVE EDITOR ───────────────────────────────────────
function renderYogaProgressiveEditor(body) {
  const yogaData = (window.APP_DATA_DEFAULT || window.APP_DATA).modules?.yoga;
  const saved    = Store.getContent('exercises_yoga') || {};
  const schedule = saved.schedule || yogaData?.schedule || {};
  const phases   = yogaData?.phases || [];

  const allDays = Object.keys(schedule).sort((a, b) =>
    parseInt(a.replace('Day ','')) - parseInt(b.replace('Day ',''))
  );

  body.innerHTML = `
    <div style="font-size:13px;color:var(--text2);padding:0 16px 12px;line-height:1.5">
      ✏️ <strong>Tap any field</strong> to edit yoga poses. Changes sync to all users after saving.
      <br>📅 <strong>${allDays.length} progressive days</strong> — beginner to professional.
    </div>
    ${phases.map(phase => {
      const phaseDays = allDays.filter(d => {
        const n = parseInt(d.replace('Day ',''));
        return n >= phase.from && n <= phase.to;
      });
      return `
        <div style="margin-bottom:16px;">
          <div style="padding:12px 16px;background:${phase.color}22;border:1px solid ${phase.color}44;
            border-radius:10px;margin:0 16px 8px;display:flex;align-items:center;gap:10px">
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
                <div style="padding:10px 16px;background:rgba(103,58,183,0.15);
                  display:flex;justify-content:space-between;align-items:center;cursor:pointer"
                  onclick="toggleYogaDayEditor('${dayKey.replace(' ','')}')">
                  <div>
                    <span style="font-weight:700;font-size:13px;color:#ce93d8">${dayKey}</span>
                    <span style="font-size:11px;color:var(--text3);margin-left:8px">${dayData.focus || ''}</span>
                  </div>
                  <span style="font-size:12px;color:var(--text3)">${poses.length} poses ▾</span>
                </div>
                <div id="yoga-day-editor-${dayKey.replace(' ','')}" style="display:none;padding:0 12px 8px">
                  <div style="margin:8px 0 4px;">
                    <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Day Focus</div>
                    <div class="editable" data-yoga-day="${dayKey}" data-field="focus" contenteditable="true"
                      style="font-size:13px;font-weight:600;color:#ce93d8">${dayData.focus || ''}</div>
                  </div>
                  <div data-yoga-poses="${dayKey}">
                    ${poses.map((pose, i) => _yogaPoseCard(pose, i, dayKey)).join('')}
                  </div>
                  <button class="add-exercise-btn" onclick="addYogaPose('${dayKey}')"
                    style="border-color:rgba(103,58,183,0.4);color:#ce93d8">+ Add Pose to ${dayKey}</button>
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
    <div class="exercise-card ex-row" data-idx="${idx}" data-yoga-pose-day="${dayKey}"
      style="margin:8px 0;position:relative;border-color:rgba(103,58,183,0.3)">
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
          <div class="editable-block editable" data-field="desc" contenteditable="true"
            style="font-size:13px;color:var(--text2);line-height:1.6">${pose.desc || ''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;margin-bottom:3px">Demo Link</div>
          <div class="editable" data-field="demo" contenteditable="true"
            style="font-size:12px;color:var(--g5);word-break:break-all">${pose.demo || ''}</div>
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

function addExercise(day) {
  const container = document.querySelector(`[data-day="${day}"]`);
  if (!container) return;
  const addBtn = container.querySelector('.add-exercise-btn');
  const div    = document.createElement('div');
  const isHoldBased = AdminEdit.module === 'yoga' || AdminEdit.module === 'stretching';
  const newEx  = isHoldBased
    ? { name: 'New Pose', hold: '30 sec', rounds: 1, desc: 'Enter description.', demo: '', image: AdminEdit.module === 'yoga' ? '🧘' : '🤸' }
    : { name: 'New Exercise', sets: 3, reps: '10 reps', desc: 'Enter description.', demo: '', image: '' };
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
    if (!byUser[key]) byUser[key] = { email: w.email || w.userId, workouts: [] };
    byUser[key].workouts.push(w);
  });

  container.innerHTML = Object.entries(byUser).map(([userId, group]) => {
    const userHeader = `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:12px 0 6px">${group.email}</div>`;
    const workoutCards = group.workouts.map(w => {
      const completions = allLogs.filter(l => l.userId === w.userId && l.module === 'custom_' + w.id).length;
      return `
        <div class="card card-sm" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-weight:700;font-size:15px">${w.name}</div>
              <div style="font-size:12px;color:var(--text3)">${w.exercises?.length || 0} exercises · Created: ${w.createdDate||'—'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-size:24px;color:var(--g5)">${completions}</div>
              <div style="font-size:11px;color:var(--text3)">sessions</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(w.exercises||[]).slice(0,6).map(e => `<span style="font-size:12px;background:var(--bg3);color:var(--text2);padding:2px 10px;border-radius:50px">${e.name}</span>`).join('')}
            ${(w.exercises||[]).length > 6 ? `<span style="font-size:12px;color:var(--text3);padding:2px 6px">+${w.exercises.length - 6} more</span>` : ''}
          </div>
        </div>`;
    }).join('');
    return userHeader + workoutCards;
  }).join('');
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
  const prevMon = (() => { const d=new Date(monday); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; })();
  const prevSun = (() => { const d=new Date(monday); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();

  const thisWeekLogs = allLogs.filter(l => l.date >= monday);
  const lastWeekLogs = allLogs.filter(l => l.date >= prevMon && l.date <= prevSun);
  const thisWeekRuns = allRuns.filter(r => r.date >= monday);
  const todayLogs    = allLogs.filter(l => l.date === today);

  const last7Str = (() => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; })();
  const activeUserIds = [...new Set(allLogs.filter(l=>l.date>=last7Str).map(l=>l.userId))];

  // Per-day activity last 14 days
  const dayActivity = {};
  for (let i=13;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); dayActivity[d.toISOString().split('T')[0]]=0; }
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
  const container = document.getElementById('user-progress-content');
  container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3)"><div class="loader" style="margin:0 auto 12px"></div>Loading…</div>`;
  openModal('modal-user-progress');

  // Fetch from Sheets for cross-device accuracy, fall back to local
  let logs    = Store.getLogs().filter(l => l.userId === userId);
  let runLogs = Store.getRunLogs().filter(r => r.userId === userId);
  try {
    const [logsRes, runsRes] = await Promise.all([
      Sheets.get('getUserLogs',    { userId }),
      Sheets.get('getUserRunLogs', { userId }),
    ]);
    if (logsRes?.success  && logsRes.logs?.length)  logs    = logsRes.logs;
    if (runsRes?.success  && runsRes.logs?.length)  runLogs = runsRes.logs;
  } catch(e) { /* use local */ }

  const cwLogs   = logs.filter(l => l.module?.startsWith('custom_'));
  const stdLogs  = logs.filter(l => !l.module?.startsWith('custom_'));
  const totalKm  = runLogs.reduce((a,r)=>a+(r.distance||0),0);
  const streak   = _calcStreakForUser(userId);
  const monday   = getMonday();
  const weekLogs = stdLogs.filter(l=>l.date>=monday);

  const modCounts = {};
  stdLogs.forEach(l => { modCounts[l.module]=(modCounts[l.module]||0)+1; });

  const last30 = {};
  for (let i=29;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); last30[d.toISOString().split('T')[0]]=0; }
  logs.forEach(l => { if (last30[l.date]!==undefined) last30[l.date]++; });

  const bestRun = [...runLogs].sort((a,b)=>(b.distance||0)-(a.distance||0))[0];

  container.innerHTML = `
    <div style="text-align:center;padding:20px 16px 12px">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--g2),var(--g3));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin:0 auto 10px">
        ${(userName||'?').charAt(0).toUpperCase()}
      </div>
      <div style="font-weight:700;font-size:18px">${userName}</div>
      <div style="font-size:12px;color:var(--text3)">${userId}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 16px 14px">
      <div class="stat-card"><div class="stat-val">${logs.length}</div><div class="stat-label">Workouts</div></div>
      <div class="stat-card"><div class="stat-val">${streak}🔥</div><div class="stat-label">Day Streak</div></div>
      <div class="stat-card"><div class="stat-val">${totalKm.toFixed(1)}</div><div class="stat-label">km Run</div></div>
    </div>
    <div style="padding:0 16px 14px">
      <div class="card card-sm" style="background:rgba(67,160,90,0.08);border-color:rgba(67,160,90,0.2)">
        <div style="font-size:13px;font-weight:700;color:var(--g5);margin-bottom:6px">This Week</div>
        <div style="font-size:13px;color:var(--text2)">${weekLogs.length} session${weekLogs.length!==1?'s':''} · ${runLogs.filter(r=>r.date>=monday).length} run${runLogs.filter(r=>r.date>=monday).length!==1?'s':''}</div>
      </div>
    </div>
    <div style="padding:0 16px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="section-title" style="margin:0">Last 30 Days</div>
        <div style="font-size:11px;color:var(--text3)">${Object.values(last30).filter(v=>v>0).length} active days</div>
      </div>
      <!-- Activity heatmap -->
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin-bottom:10px">
        ${Object.entries(last30).map(([d,cnt])=>`
          <div title="${d}: ${cnt} session${cnt!==1?'s':''}"
            style="aspect-ratio:1;border-radius:3px;cursor:default;
              background:${cnt>3?'var(--g5)':cnt>2?'var(--g4)':cnt>1?'var(--g3)':cnt>0?'rgba(67,160,90,0.4)':'var(--bg3)'}">
          </div>`).join('')}
      </div>
      <!-- Run distance last 30d bar chart -->
      ${(() => {
        const runByDay = {};
        Object.keys(last30).forEach(d => runByDay[d] = 0);
        runLogs.forEach(r => { if (runByDay[r.date]!==undefined) runByDay[r.date]+=(r.distance||0); });
        const maxKm = Math.max(...Object.values(runByDay), 0.1);
        const hasRuns = Object.values(runByDay).some(v=>v>0);
        if (!hasRuns) return '';
        return `
          <div style="margin-top:8px">
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px">🏃 Daily Distance (km)</div>
            <div style="display:flex;align-items:flex-end;gap:2px;height:40px">
              ${Object.entries(runByDay).map(([d,km])=>`
                <div style="flex:1;display:flex;flex-direction:column;align-items:center" title="${d}: ${km.toFixed(1)}km">
                  <div style="width:100%;background:rgba(30,136,229,0.7);border-radius:2px 2px 0 0;
                    height:${km>0?Math.max(3,Math.round(km/maxKm*36)):0}px"></div>
                </div>`).join('')}
            </div>
          </div>`;
      })()}
      <!-- Module frequency donut-style bars -->
      ${Object.keys(modCounts).length ? `
      <div style="margin-top:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Module Frequency</div>
        ${Object.entries(modCounts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([mod,cnt])=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:14px;width:20px;text-align:center">${getModuleEmoji(mod)}</span>
            <div style="flex:1">
              <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(cnt/Math.max(...Object.values(modCounts))*100)}%;
                  background:var(--g4);border-radius:3px;transition:width .5s ease"></div>
              </div>
            </div>
            <span style="font-size:11px;color:var(--text3);min-width:24px;text-align:right">${cnt}</span>
          </div>`).join('')}
      </div>` : ''}
      <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3)">
        <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:var(--g4);display:inline-block"></span>Active</span>
        <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:var(--bg3);display:inline-block"></span>Rest day</span>
      </div>
    </div>
    ${Object.keys(modCounts).length ? `
    <div style="padding:0 16px 14px">
      <div class="section-title" style="margin-bottom:8px">Favourite Modules</div>
      ${Object.entries(modCounts).sort((a,b)=>b[1]-a[1]).map(([mod,cnt])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:16px">${getModuleEmoji(mod)}</span>
          <span style="flex:1;font-size:13px">${getModuleName(mod)}</span>
          <span class="badge badge-green">${cnt}</span>
        </div>`).join('')}
    </div>` : ''}
    ${bestRun ? `
    <div style="padding:0 16px 14px">
      <div class="card card-sm" style="background:rgba(30,136,229,0.08);border-color:rgba(30,136,229,0.2)">
        <div style="font-size:13px;font-weight:700;color:#64b5f6;margin-bottom:6px">🏅 Best Run</div>
        <div style="font-size:13px;color:var(--text2)">${(bestRun.distance||0).toFixed(2)} km · ${fmtTime(bestRun.duration||0)} · ${bestRun.date}</div>
      </div>
    </div>` : ''}
    <!-- Weekly session bar chart — last 8 weeks -->
    <div style="padding:0 16px 14px">
      <div class="section-title" style="margin-bottom:8px">Weekly Activity (8 weeks)</div>
      <div class="card card-sm">
        ${(() => {
          const weekTotals = [];
          for (let w = 7; w >= 0; w--) {
            const wStart = new Date(); wStart.setDate(wStart.getDate() - wStart.getDay() - w * 7 + 1);
            const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
            const wStartStr = wStart.toISOString().split('T')[0];
            const wEndStr   = wEnd.toISOString().split('T')[0];
            const count = logs.filter(l => l.date >= wStartStr && l.date <= wEndStr).length
                        + runLogs.filter(r => r.date >= wStartStr && r.date <= wEndStr).length;
            weekTotals.push({ label: 'W' + (8-w), count });
          }
          const maxW = Math.max(...weekTotals.map(w=>w.count), 1);
          return '<div style="display:flex;align-items:flex-end;gap:4px;height:60px">' +
            weekTotals.map(w => {
              const h = Math.max(3, Math.round(w.count / maxW * 56));
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px" title="${w.label}: ${w.count} sessions">
                <div style="font-size:9px;color:var(--text3)">${w.count||''}</div>
                <div style="width:100%;height:${h}px;background:${w.count>0?'var(--g3)':'var(--bg3)'};border-radius:3px 3px 0 0"></div>
                <div style="font-size:9px;color:var(--text3)">${w.label}</div>
              </div>`;
            }).join('') + '</div>';
        })()}
      </div>
    </div>
    <!-- Run history for this user -->
    ${runLogs.length ? `
    <div style="padding:0 16px 14px">
      <div class="section-title" style="margin-bottom:8px">Recent Runs</div>
      ${runLogs.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5).map(r=>`
        <div class="card card-sm" style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600">${(r.activityType||'run').charAt(0).toUpperCase()+(r.activityType||'run').slice(1)} · ${(r.distance||0).toFixed(2)} km</div>
            <div style="font-size:11px;color:var(--text3)">${r.date} · ${fmtTime(r.duration||0)}</div>
          </div>
          <span class="badge badge-green">${fmtPace(r.distance||0, r.duration||0)} /km</span>
        </div>`).join('')}
    </div>` : ''}
  `;
}

function _calcStreakForUser(userId) {
  // Include both workout dates and run dates
  const wDates = Store.getLogs().filter(l=>l.userId===userId).map(l=>l.date);
  const rDates = Store.getRunLogs().filter(r=>r.userId===userId).map(r=>r.date);
  const dates = [...new Set([...wDates, ...rDates])].sort().reverse();
  if (!dates.length) return 0;
  let streak=0, cur=new Date();
  for (let i=0;i<60;i++) {
    const d=cur.toISOString().split('T')[0];
    if (dates.includes(d)) { streak++; cur.setDate(cur.getDate()-1); }
    else if (i>0) break;
    else { cur.setDate(cur.getDate()-1); if (!dates.includes(cur.toISOString().split('T')[0])) break; }
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
