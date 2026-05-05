// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Custom Workouts
// Users can create, edit, delete their own workout routines
// ════════════════════════════════════════════════════════════════

const CW = {

  // ── STORAGE ────────────────────────────────────────────────────
  getAll(userId) {
    return Store.get('ff_custom_workouts_' + userId, []);
  },
  save(userId, workouts) {
    Store.set('ff_custom_workouts_' + userId, workouts);
  },
  getById(userId, id) {
    return this.getAll(userId).find(w => w.id === id) || null;
  },
  delete(userId, id) {
    const all = this.getAll(userId).filter(w => w.id !== id);
    this.save(userId, all);
    // Also remove completion logs
    const logs = Store.getLogs().filter(l => !(l.userId === userId && l.module === 'custom_' + id));
    Store.set('ff_logs', logs);
  },
  upsert(userId, workout) {
    const all = this.getAll(userId);
    const idx = all.findIndex(w => w.id === workout.id);
    if (idx >= 0) all[idx] = workout;
    else all.push(workout);
    this.save(userId, all);
  },
};

// ── CURRENT EDIT STATE ────────────────────────────────────────────
let _cwEdit = {
  id:        null,   // null = new, else editing existing
  name:      '',
  exercises: [],     // [{name, sets, reps, desc, rest}]
};

// ── OPEN CUSTOM WORKOUTS PAGE ─────────────────────────────────────
function openCustomWorkouts() {
  showPage('page-custom-workouts');
  renderCustomWorkoutsList();
}

function renderCustomWorkoutsList() {
  const user     = APP.currentUser;
  const workouts = CW.getAll(user.id);
  const container = document.getElementById('cw-list');
  const today    = todayStr();
  const todayDay = dayName();

  if (!workouts.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:48px 24px">
        <div style="font-size:56px;margin-bottom:16px">🏋️</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">No custom workouts yet</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:24px;line-height:1.6">
          Create your own workout routine with any exercises, sets and reps you want.
        </div>
        <button class="btn btn-primary" onclick="openCreateWorkout()">+ Create First Workout</button>
      </div>`;
    return;
  }

  const DIFF_COLORS = { Beginner:'#43a05a', Intermediate:'#f0c040', Advanced:'#e53935' };
  const CAT_EMOJIS  = { Strength:'🏋️', Cardio:'🏃', HIIT:'⚡', 'Yoga/Mobility':'🧘', Sports:'⚽', Circuit:'🔄', Custom:'✨' };

  container.innerHTML = workouts.map(w => {
    const logs      = Store.getLogs().filter(l => l.userId === user.id && l.module === 'custom_' + w.id);
    const todayDone = logs.some(l => l.date === today);
    const totalDone = logs.length;
    const lastDone  = logs.sort((a,b) => (b.date||'').localeCompare(a.date||''))[0]?.date || 'Never';
    const diff      = w.difficulty || 'Intermediate';
    const diffColor = DIFF_COLORS[diff] || '#f0c040';
    const catEmoji  = CAT_EMOJIS[w.category] || '💪';
    const hasDays   = w.days && w.days.length > 0;

    return `
      <div class="card" style="margin-bottom:12px;position:relative;border-color:${todayDone?'var(--g3)':'var(--border)'}">

        <!-- Header row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:16px">${catEmoji}</span>
              <div style="font-size:17px;font-weight:700">${w.name}</div>
              ${todayDone?'<span class="badge badge-green" style="font-size:10px">✓ Done</span>':''}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              <!-- Difficulty badge -->
              <span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:50px;
                background:${diffColor}22;color:${diffColor};border:1px solid ${diffColor}44">${diff}</span>
              ${w.category?`<span style="font-size:11px;color:var(--text3);background:var(--bg3);padding:2px 9px;border-radius:50px">${w.category}</span>`:''}
              ${w.goal?`<span style="font-size:11px;color:var(--text3);background:var(--bg3);padding:2px 9px;border-radius:50px">🎯 ${w.goal}</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-shrink:0;margin-left:8px">
            <button class="btn btn-ghost btn-sm" onclick="openEditWorkout('${w.id}')" style="padding:6px 10px">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="confirmDeleteWorkout('${w.id}','${w.name.replace(/'/g,"\\'")}')">🗑️</button>
          </div>
        </div>

        <!-- Scheduled days -->
        ${hasDays?`<div style="display:flex;gap:5px;margin-bottom:8px">
          ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`
            <span style="font-size:10px;font-weight:600;padding:3px 7px;border-radius:6px;
              background:${w.days.includes(d)?'rgba(46,125,70,0.25)':'var(--bg3)'};
              color:${w.days.includes(d)?'var(--g5)':'var(--text3)'};">${d}</span>`).join('')}
        </div>`:''}

        <!-- Exercise pills -->
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
          ${w.exercises.slice(0,4).map(e=>`
            <span style="font-size:11px;background:var(--bg3);color:var(--text2);padding:3px 10px;border-radius:50px">${e.name}</span>`).join('')}
          ${w.exercises.length>4?`<span style="font-size:11px;color:var(--text3);padding:3px 6px">+${w.exercises.length-4} more</span>`:''}
        </div>

        <!-- Notes preview -->
        ${w.notes?`<div style="font-size:12px;color:var(--text3);margin-bottom:10px;padding:8px 10px;background:var(--bg3);border-radius:8px;line-height:1.5">📝 ${w.notes}</div>`:''}

        <!-- Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;gap:10px">
            <span style="font-size:12px;color:var(--text3)">🏆 ${totalDone} sessions</span>
            <span style="font-size:12px;color:var(--text3)">📅 ${lastDone==='Never'?'Not done yet':'Last: '+lastDone}</span>
          </div>
          <button class="btn ${todayDone?'btn-outline':'btn-primary'} btn-sm"
            onclick="startCustomWorkout('${w.id}')" ${todayDone?'disabled':''}>
            ${todayDone?'✓ Done Today':'▶ Start'}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── CREATE / EDIT WORKOUT ─────────────────────────────────────────
function openCreateWorkout() {
  _cwEdit = {
    id: null, name: '', exercises: [],
    category: 'Strength', goal: 'General Fitness',
    difficulty: 'Intermediate', days: [], notes: '',
  };
  _renderWorkoutEditor();
  showPage('page-cw-editor');
}

function openEditWorkout(id) {
  const user = APP.currentUser;
  const w    = CW.getById(user.id, id);
  if (!w) return;
  _cwEdit = JSON.parse(JSON.stringify(w));
  // Ensure new fields exist for old workouts
  _cwEdit.category   = _cwEdit.category   || 'Strength';
  _cwEdit.goal       = _cwEdit.goal       || 'General Fitness';
  _cwEdit.difficulty = _cwEdit.difficulty || 'Intermediate';
  _cwEdit.days       = _cwEdit.days       || [];
  _cwEdit.notes      = _cwEdit.notes      || '';
  _renderWorkoutEditor();
  showPage('page-cw-editor');
}

function _renderWorkoutEditor() {
  const isNew = !_cwEdit.id;
  document.getElementById('cw-editor-title').textContent = isNew ? 'Create Workout' : 'Edit Workout';
  document.getElementById('cw-workout-name').value = _cwEdit.name || '';
  document.getElementById('cw-name-error').textContent = '';

  // Render structured fields section
  const fieldsContainer = document.getElementById('cw-structured-fields');
  if (fieldsContainer) {
    const CATEGORIES   = ['Strength','Cardio','HIIT','Yoga/Mobility','Sports','Circuit','Custom'];
    const GOALS        = ['Muscle Gain','Weight Loss','Endurance','Strength','Flexibility','General Fitness'];
    const DIFFICULTIES = ['Beginner','Intermediate','Advanced'];
    const WEEK_DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    fieldsContainer.innerHTML = `
      <!-- Category -->
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Workout Category</label>
        <div style="display:flex;flex-wrap:wrap;gap:7px">
          ${CATEGORIES.map(c => `
            <button type="button" onclick="cwToggleField('category','${c}',this)"
              class="cw-chip ${_cwEdit.category===c?'cw-chip-active':''}">${c}</button>`).join('')}
        </div>
      </div>

      <!-- Goal -->
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Your Goal</label>
        <div style="display:flex;flex-wrap:wrap;gap:7px">
          ${GOALS.map(g => `
            <button type="button" onclick="cwToggleField('goal','${g}',this)"
              class="cw-chip ${_cwEdit.goal===g?'cw-chip-active':''}">${g}</button>`).join('')}
        </div>
      </div>

      <!-- Difficulty -->
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Difficulty Level</label>
        <div style="display:flex;gap:8px">
          ${DIFFICULTIES.map(d => {
            const color = d==='Beginner'?'#43a05a':d==='Intermediate'?'#f0c040':'#e53935';
            const active = _cwEdit.difficulty===d;
            return `<button type="button" onclick="cwToggleField('difficulty','${d}',this)"
              class="cw-difficulty-btn" style="flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;
              background:${active?color+'22':'var(--surface)'};color:${active?color:'var(--text3)'};
              border:${active?'2px solid '+color:'1.5px solid var(--border)'}">${d}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- Schedule days -->
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Schedule Days <span style="color:var(--text3);font-weight:400;text-transform:none">(optional)</span></label>
        <div style="display:flex;gap:7px">
          ${WEEK_DAYS.map(day => {
            const active = (_cwEdit.days||[]).includes(day);
            return `<button type="button" onclick="cwToggleDayChip('${day}',this)"
              style="flex:1;padding:8px 2px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;
              background:${active?'rgba(46,125,70,0.25)':'var(--surface)'};color:${active?'var(--g5)':'var(--text3)'};
              border:${active?'2px solid var(--g4)':'1.5px solid var(--border)'}">${day}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- Notes -->
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Personal Notes <span style="color:var(--text3);font-weight:400;text-transform:none">(optional)</span></label>
        <textarea id="cw-notes" class="form-input" rows="2"
          placeholder="e.g. Focus on form, increase weight when 12 reps feel easy..."
          style="resize:none">${_cwEdit.notes||''}</textarea>
      </div>
    `;
  }
  _renderExerciseList();
}

function cwToggleField(field, value, btn) {
  _cwEdit[field] = value;
  // Update all sibling buttons
  const parent = btn.closest('div');
  if (!parent) return;
  if (field === 'difficulty') {
    const COLORS = { Beginner:'#43a05a', Intermediate:'#f0c040', Advanced:'#e53935' };
    parent.querySelectorAll('.cw-difficulty-btn').forEach(b => {
      const v = b.textContent.trim();
      const c = COLORS[v];
      const active = v === value;
      b.style.background = active ? c+'22' : 'var(--surface)';
      b.style.color       = active ? c : 'var(--text3)';
      b.style.border      = active ? '2px solid '+c : '1.5px solid var(--border)';
    });
  } else {
    parent.querySelectorAll('.cw-chip').forEach(b => {
      b.className = 'cw-chip' + (b.textContent.trim()===value?' cw-chip-active':'');
    });
  }
}

function cwToggleDayChip(day, btn) {
  const days = _cwEdit.days || [];
  const idx  = days.indexOf(day);
  if (idx >= 0) {
    days.splice(idx, 1);
    btn.style.background = 'var(--surface)'; btn.style.color = 'var(--text3)'; btn.style.border = '1.5px solid var(--border)';
  } else {
    days.push(day);
    btn.style.background = 'rgba(46,125,70,0.25)'; btn.style.color = 'var(--g5)'; btn.style.border = '2px solid var(--g4)';
  }
  _cwEdit.days = days;
}

function _renderExerciseList() {
  const container = document.getElementById('cw-exercises-list');
  const exs = _cwEdit.exercises;

  if (!exs.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--text3);border:1.5px dashed var(--border);border-radius:var(--radius)">
        <div style="font-size:32px;margin-bottom:8px">💪</div>
        <div style="font-size:14px">No exercises yet.<br>Tap "+ Add Exercise" to start.</div>
      </div>`;
    return;
  }

  container.innerHTML = exs.map((ex, i) => `
    <div class="card card-sm" style="margin-bottom:8px;position:relative" id="cw-ex-${i}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px;margin-bottom:6px">${i+1}. ${ex.name||'Unnamed Exercise'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:12px;background:var(--bg3);color:var(--text2);padding:2px 10px;border-radius:50px">🔄 ${ex.sets||3} sets</span>
            <span style="font-size:12px;background:var(--bg3);color:var(--text2);padding:2px 10px;border-radius:50px">💪 ${ex.reps||'10 reps'}</span>
            ${ex.rest ? `<span style="font-size:12px;background:var(--bg3);color:var(--text2);padding:2px 10px;border-radius:50px">⏱ ${ex.rest}s rest</span>` : ''}
          </div>
          ${ex.desc ? `<div style="font-size:13px;color:var(--text2);margin-top:6px">${ex.desc}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          ${i > 0 ? `<button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="moveExercise(${i},-1)">↑</button>` : '<div style="height:28px"></div>'}
          ${i < exs.length-1 ? `<button class="btn btn-ghost btn-sm" style="padding:4px 8px" onclick="moveExercise(${i},1)">↓</button>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-outline btn-sm" onclick="editExerciseInline(${i})">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="removeExercise(${i})">✕ Remove</button>
      </div>
    </div>`).join('');
}

function addExerciseToCW() {
  openExerciseModal(null); // null = new exercise
}

function editExerciseInline(idx) {
  openExerciseModal(idx);
}

function openExerciseModal(idx) {
  const isNew = idx === null;
  const ex    = isNew ? { name:'', sets:3, reps:'10 reps', rest:'', desc:'' } : _cwEdit.exercises[idx];

  document.getElementById('cw-ex-modal-title').textContent = isNew ? 'Add Exercise' : 'Edit Exercise';
  document.getElementById('cw-ex-name').value  = ex.name  || '';
  document.getElementById('cw-ex-sets').value  = ex.sets  || 3;
  document.getElementById('cw-ex-reps').value  = ex.reps  || '10 reps';
  document.getElementById('cw-ex-rest').value  = ex.rest  || '';
  document.getElementById('cw-ex-desc').value  = ex.desc  || '';
  document.getElementById('cw-ex-idx').value   = idx === null ? '' : idx;
  document.getElementById('cw-ex-error').textContent = '';
  openModal('modal-cw-exercise');
}

function saveExerciseModal() {
  const name = document.getElementById('cw-ex-name').value.trim();
  const sets = parseInt(document.getElementById('cw-ex-sets').value) || 3;
  const reps = document.getElementById('cw-ex-reps').value.trim() || '10 reps';
  const rest = document.getElementById('cw-ex-rest').value.trim();
  const desc = document.getElementById('cw-ex-desc').value.trim();
  const idx  = document.getElementById('cw-ex-idx').value;
  const errEl = document.getElementById('cw-ex-error');

  if (!name) { errEl.textContent = 'Exercise name is required.'; return; }

  const ex = { name, sets, reps, rest, desc };

  if (idx === '') {
    _cwEdit.exercises.push(ex);
  } else {
    _cwEdit.exercises[parseInt(idx)] = ex;
  }

  closeModal('modal-cw-exercise');
  _renderExerciseList();
}

function removeExercise(idx) {
  _cwEdit.exercises.splice(idx, 1);
  _renderExerciseList();
}

function moveExercise(idx, dir) {
  const exs  = _cwEdit.exercises;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= exs.length) return;
  [exs[idx], exs[newIdx]] = [exs[newIdx], exs[idx]];
  _renderExerciseList();
}

function saveWorkout() {
  const name  = document.getElementById('cw-workout-name').value.trim();
  const errEl = document.getElementById('cw-name-error');
  errEl.textContent = '';

  if (!name) { errEl.textContent = 'Please enter a workout name.'; return; }
  if (_cwEdit.exercises.length === 0) { errEl.textContent = 'Add at least one exercise.'; return; }

  // Prevent duplicate names (case-insensitive) for new workouts only
  const user = APP.currentUser;
  const isNew = !_cwEdit.id;
  if (isNew) {
    const nameExists = CW.getAll(user.id).some(w => w.name.trim().toLowerCase() === name.toLowerCase());
    if (nameExists) { errEl.textContent = `A workout named "${name}" already exists. Choose a different name.`; return; }
  }
  const workout = {
    id:          _cwEdit.id || 'cw_' + Date.now(),
    name,
    exercises:   _cwEdit.exercises,
    category:    _cwEdit.category   || 'Strength',
    goal:        _cwEdit.goal       || 'General Fitness',
    difficulty:  _cwEdit.difficulty || 'Intermediate',
    days:        _cwEdit.days       || [],
    notes:       document.getElementById('cw-notes')?.value?.trim() || _cwEdit.notes || '',
    createdDate: _cwEdit.createdDate || todayStr(),
    updatedDate: todayStr(),
  };

  CW.upsert(user.id, workout);
  // Sync to Sheets (non-blocking)
  Sheets.post('saveCustomWorkout', {
    ...workout,
    userId: user.id,
    email:  user.email,
  });
  showToast(`"${name}" saved! 💪`, 'success');
  showPage('page-custom-workouts');
  renderCustomWorkoutsList();
}

function confirmDeleteWorkout(id, name) {
  if (confirm(`Delete "${name}"? This cannot be undone.`)) {
    const user = APP.currentUser;
    CW.delete(user.id, id);
    Sheets.post('deleteCustomWorkout', { id, userId: user.id });
    showToast('Workout deleted.', 'info');
    renderCustomWorkoutsList();
    refreshDashboardBadges();
  }
}

// ── DO THE WORKOUT ────────────────────────────────────────────────
function startCustomWorkout(id) {
  const user = APP.currentUser;
  const w    = CW.getById(user.id, id);
  if (!w) return;

  APP.currentModule   = 'custom_' + id;
  APP.currentCustomWO = w;
  APP.currentDay      = dayName();

  showPage('page-cw-workout');
  renderCustomWorkoutPage(w);
}

function renderCustomWorkoutPage(w) {
  document.getElementById('cw-workout-title').textContent    = w.name;
  const DIFF_COLORS2 = { Beginner:'#43a05a', Intermediate:'#f0c040', Advanced:'#e53935' };
  const diff2 = w.difficulty || '';
  const dc2   = DIFF_COLORS2[diff2] || 'var(--text3)';
  document.getElementById('cw-workout-subtitle').innerHTML =
    w.exercises.length + ' exercises' +
    (diff2 ? ` &nbsp;·&nbsp; <span style="color:${dc2};font-weight:600">${diff2}</span>` : '') +
    (w.goal ? ` &nbsp;·&nbsp; 🎯 ${w.goal}` : '');

  // Show notes banner if present
  const notesEl = document.getElementById('cw-workout-notes');
  if (notesEl) {
    notesEl.style.display = w.notes ? 'block' : 'none';
    notesEl.textContent   = w.notes ? '📝 ' + w.notes : '';
  }

  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_custom_${w.id}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});

  const container = document.getElementById('cw-workout-exercises');
  container.innerHTML = w.exercises.map((ex, i) => {
    const checked = sessionData[i] || [];
    const allDone = checked.length >= (parseInt(ex.sets)||1);

    const setsHtml = Array.from({length: parseInt(ex.sets)||1}, (_, s) => {
      const isDone = checked.includes(s);
      return `<div class="set-check ${isDone?'checked':''}"
        onclick="toggleCWSet('${w.id}',${i},${s})">
        <div class="check-box">${isDone?'✓':''}</div>
        <span class="check-label">Set ${s+1} — ${ex.reps||''}</span>
      </div>`;
    }).join('');

    return `
      <div class="exercise-card ${allDone?'completed':''}" style="margin-bottom:14px">
        <div class="exercise-thumb">
          <div style="font-size:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;height:100%">💪</div>
        </div>
        <div class="exercise-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div class="exercise-name">${i+1}. ${ex.name}</div>
            ${allDone?'<span class="badge badge-green">✓ Done</span>':''}
          </div>
          <div class="exercise-meta">
            <span>🔄 ${ex.sets||1} sets</span>
            <span>💪 ${ex.reps||''}</span>
            ${ex.rest?`<span>⏱ ${ex.rest}s rest</span>`:''}
          </div>
          ${ex.desc?`<div class="exercise-desc">${ex.desc}</div>`:''}
          <div class="sets-grid">${setsHtml}</div>
        </div>
      </div>`;
  }).join('');

  updateCWCompleteBtn(w);
}

function toggleCWSet(workoutId, exIdx, setIdx) {
  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_custom_${workoutId}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
  if (!sessionData[exIdx]) sessionData[exIdx] = [];
  const pos = sessionData[exIdx].indexOf(setIdx);
  if (pos >= 0) sessionData[exIdx].splice(pos, 1);
  else sessionData[exIdx].push(setIdx);
  Store.set(sessionKey, sessionData);
  // Re-render workout
  const w = CW.getById(user.id, workoutId);
  if (w) renderCustomWorkoutPage(w);
}

function updateCWCompleteBtn(w) {
  const user       = APP.currentUser;
  const sessionKey = `sess_${user.id}_custom_${w.id}_${todayStr()}`;
  const sessionData = Store.get(sessionKey, {});
  const allDone    = w.exercises.every((ex,i) => (sessionData[i]||[]).length >= (parseInt(ex.sets)||1));
  const logged     = Store.getLogs().some(l => l.userId===user.id && l.module==='custom_'+w.id && l.date===todayStr());
  const btn        = document.getElementById('cw-complete-btn');
  if (!btn) return;
  const done = Object.values(sessionData).flat().length;
  const total = w.exercises.reduce((a,e)=>a+(parseInt(e.sets)||1),0);
  if (logged) {
    btn.textContent = '✓ Completed!'; btn.className='btn btn-outline btn-full'; btn.disabled=true;
  } else {
    btn.textContent = allDone ? '🎉 Complete Workout!' : `Mark Complete (${done}/${total} sets)`;
    btn.className   = `btn ${allDone?'btn-accent':'btn-primary'} btn-full`;
    btn.disabled    = false;
    btn.onclick     = () => completeCWWorkout(w.id);
  }
}

function completeCWWorkout(workoutId) {
  const user = APP.currentUser;
  const w    = CW.getById(user.id, workoutId);
  if (!w) return;
  Store.addLog({ userId: user.id, module: 'custom_' + workoutId, day: dayName(), date: todayStr(), timestamp: new Date().toISOString() });
  // Sync completion to Sheets so it appears in admin history and survives reinstall
  sheetsPost('logCompletion', {
    userId: user.id,
    email:  user.email,
    module: 'custom_' + workoutId,
    day:    dayName(),
    date:   todayStr(),
  });
  showToast('🎉 ' + w.name + ' complete! Great work!', 'success');
  updateCWCompleteBtn(w);
  refreshDashboard();
}
