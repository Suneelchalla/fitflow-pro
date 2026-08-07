// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Dashboard Enhancements  (enhancements.js v1)
//
// 1. GLOBAL SEARCH — magnifying glass icon, keyword → navigate
// 2. STREAK DETAILS — tap 🔥 pill → rich streak analytics
// 3. HIDE / SHOW MODULES — dismiss cards, restore from Profile
//
// Loads AFTER dashboard.js. Patches existing functions in a
// non-destructive wrap pattern so no original file edits needed.
//
// Storage:
//   hidden_modules_<uid> — via Store.getContent / setContent so
//   the existing _syncContent pipeline round-trips it to Sheets
//   automatically (key in Content sheet, same as module_order).
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  //  1.  GLOBAL SEARCH
  // ════════════════════════════════════════════════════════════════

  function _buildSearchIndex() {
    var items = [];

    // ── Workout modules ──
    if (typeof ALL_MODULES !== 'undefined') {
      ALL_MODULES.forEach(function (m) {
        items.push({
          id: m.id, name: m.name, emoji: m.emoji,
          sub: m.sub || '', type: 'module',
          keywords: (m.name + ' ' + (m.sub || '') + ' ' + m.id).toLowerCase(),
        });
      });
    }

    // ── Manual-log activities (Badminton, Tennis …) ──
    if (window.APP_DATA && Array.isArray(window.APP_DATA.activities)) {
      window.APP_DATA.activities.forEach(function (a) {
        items.push({
          id: 'activity_' + a.id, name: a.name, emoji: a.emoji,
          sub: a.desc || '', type: 'activity',
          keywords: (a.name + ' ' + (a.desc || '') + ' ' + a.id + ' sport').toLowerCase(),
        });
      });
    }

    // ── Pages ──
    [
      { id:'page-history-global', name:'History',         emoji:'📋', sub:'All past activities',    keywords:'history past log activities' },
      { id:'page-running',        name:'GPS Tracker',     emoji:'📍', sub:'Run, walk, or cycle',   keywords:'gps run walk cycle tracker running' },
      { id:'page-custom-workouts', name:'My Workouts',    emoji:'✏️', sub:'Custom routines',       keywords:'custom workouts routines my' },
      { id:'page-weekly-report',  name:'Weekly Report',   emoji:'📊', sub:'Your week at a glance', keywords:'weekly report summary stats' },
      { id:'page-profile',        name:'Profile',         emoji:'👤', sub:'Stats, badges, settings',keywords:'profile account settings body stats' },
      { id:'page-my-plan',        name:'My Plan',         emoji:'🗓️', sub:'Training plan progress', keywords:'plan training 5k 10k schedule' },
    ].forEach(function (p) {
      items.push({ id:p.id, name:p.name, emoji:p.emoji, sub:p.sub, type:'page', keywords:p.keywords });
    });

    return items;
  }

  /* Navigate to a search result */
  function _openSearchResult(item) {
    _closeGlobalSearch();
    if (item.type === 'module') {
      if (typeof openModule === 'function') openModule(item.id);
    } else if (item.type === 'activity') {
      if (typeof openModule === 'function') openModule('log_activity');
      setTimeout(function () {
        if (typeof selectManualActivity === 'function')
          selectManualActivity(item.id.replace('activity_', ''));
      }, 250);
    } else if (item.type === 'page') {
      if      (item.id === 'page-profile'        && typeof openProfilePage     === 'function') openProfilePage();
      else if (item.id === 'page-history-global'  && typeof renderGlobalHistory === 'function') { showPage(item.id); renderGlobalHistory(); }
      else if (item.id === 'page-weekly-report'   && typeof openWeeklyReport   === 'function') openWeeklyReport();
      else if (item.id === 'page-my-plan'         && typeof openMyPlanPage     === 'function') openMyPlanPage();
      else if (item.id === 'page-running'         && typeof initRunningPage    === 'function') { showPage('page-running'); initRunningPage(); }
      else if (item.id === 'page-custom-workouts' && typeof renderCustomWorkoutsList === 'function') { showPage(item.id); renderCustomWorkoutsList(); }
      else showPage(item.id);
    }
  }
  window._openSearchResult = _openSearchResult;

  /* Render filtered results list */
  function _renderSearchResults(index, query, container) {
    var q = (query || '').toLowerCase().trim();
    var filtered = q
      ? index.filter(function (it) { return it.keywords.indexOf(q) !== -1 || it.name.toLowerCase().indexOf(q) !== -1; })
      : index;

    var uid    = APP.currentUser ? APP.currentUser.id : '';
    var hidden = uid ? (_getHiddenModules(uid)) : [];

    if (!filtered.length) {
      container.innerHTML =
        '<div style="padding:32px 16px;text-align:center;color:var(--text3);font-size:14px">' +
          '🔍 No results for "<strong>' + (query || '').replace(/</g, '&lt;') + '</strong>"' +
        '</div>';
      return;
    }

    container.innerHTML = filtered.map(function (it) {
      var isHidden = hidden.indexOf(it.id) !== -1;
      var opacity  = isHidden ? 'opacity:0.45;' : '';
      var badge    = isHidden ? ' <span style="font-size:10px;color:var(--text3);font-style:italic">(hidden)</span>' : '';
      var typeBadge = '';
      if (it.type === 'activity')
        typeBadge = '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:rgba(240,192,64,0.15);color:var(--accent);margin-left:6px">sport</span>';
      else if (it.type === 'page')
        typeBadge = '<span style="font-size:9px;padding:2px 6px;border-radius:8px;background:rgba(30,136,229,0.15);color:#90caf9;margin-left:6px">page</span>';

      // Serialise the result for the onclick — escape single quotes
      var payload = JSON.stringify(it).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

      return '<div onclick=\'_openSearchResult(' + payload + ')\' ' +
        'style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;' +
        'border-bottom:1px solid var(--border);transition:background .12s;' + opacity + '" ' +
        'onmouseover="this.style.background=\'rgba(67,160,90,0.08)\'" ' +
        'onmouseout="this.style.background=\'\'">' +
        '<span style="font-size:22px;width:32px;text-align:center;flex-shrink:0">' + it.emoji + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600;color:var(--text)">' + it.name + badge + typeBadge + '</div>' +
          '<div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + it.sub + '</div>' +
        '</div>' +
        '<span style="color:var(--text3);font-size:16px;flex-shrink:0">›</span>' +
      '</div>';
    }).join('');
  }

  /* Open */
  function _openGlobalSearch() {
    if (document.getElementById('ff-search-overlay')) return;
    var idx = _buildSearchIndex();

    var ov = document.createElement('div');
    ov.id  = 'ff-search-overlay';
    ov.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9998;' +
      'display:flex;flex-direction:column;align-items:center;padding:0 16px';

    ov.innerHTML =
      '<div style="width:100%;max-width:480px;margin-top:56px">' +
        '<div style="position:relative;margin-bottom:12px">' +
          '<input id="ff-search-input" type="text" placeholder="Search modules, sports, pages…" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
            'style="width:100%;padding:14px 44px 14px 16px;border-radius:16px;border:1.5px solid var(--g3);' +
            'background:var(--bg);color:var(--text);font-size:16px;font-family:var(--font-body);outline:none;' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.4)">' +
          '<button onclick="_closeGlobalSearch()" ' +
            'style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;' +
            'color:var(--text3);font-size:20px;cursor:pointer;padding:4px 8px;line-height:1">✕</button>' +
        '</div>' +
        '<div id="ff-search-results" style="max-height:60vh;overflow-y:auto;border-radius:14px;' +
          'background:var(--bg2);border:1px solid var(--border)"></div>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) _closeGlobalSearch(); });

    var input   = document.getElementById('ff-search-input');
    var results = document.getElementById('ff-search-results');
    input.focus();
    _renderSearchResults(idx, '', results);

    input.addEventListener('input', function () {
      _renderSearchResults(idx, input.value, results);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') _closeGlobalSearch();
    });
  }
  window._openGlobalSearch = _openGlobalSearch;

  /* Close */
  function _closeGlobalSearch() {
    var ov = document.getElementById('ff-search-overlay');
    if (ov) ov.remove();
  }
  window._closeGlobalSearch = _closeGlobalSearch;


  // ════════════════════════════════════════════════════════════════
  //  2.  STREAK DETAILS
  // ════════════════════════════════════════════════════════════════

  var STREAK_MSGS = [
    { min:0,   max:0,    emoji:'🛋️', msg:"Zero days? Your couch has a better streak than you! Let's fix that today." },
    { min:1,   max:1,    emoji:'🌱', msg:"Day 1 — every legend starts here. Don't let this seedling die!" },
    { min:2,   max:3,    emoji:'🔥', msg:"A spark! Keep blowing on it — a bonfire is coming." },
    { min:4,   max:6,    emoji:'💪', msg:"Almost a full week! Your muscles are starting to remember your name." },
    { min:7,   max:13,   emoji:'⚡', msg:"A FULL WEEK! You're now more consistent than most gym memberships." },
    { min:14,  max:29,   emoji:'🏆', msg:"Two weeks strong! Your future self just sent a thank-you note." },
    { min:30,  max:59,   emoji:'👑', msg:"30+ days?! You're not on a streak — you're building a lifestyle." },
    { min:60,  max:99,   emoji:'🦁', msg:"60+ days! Lions skip leg day. You don't. You're beyond lion." },
    { min:100, max:9999, emoji:'🐐', msg:"100+ DAYS! You're the GOAT. Scientists want to study your discipline." },
  ];

  function _getStreakMessage(streak) {
    for (var i = 0; i < STREAK_MSGS.length; i++) {
      if (streak >= STREAK_MSGS[i].min && streak <= STREAK_MSGS[i].max) return STREAK_MSGS[i];
    }
    return STREAK_MSGS[STREAK_MSGS.length - 1];
  }

  function _showStreakDetails() {
    var user = APP.currentUser;
    if (!user) return;

    var streak        = (typeof calcStreak === 'function') ? calcStreak(user.id) : 0;
    var pr            = (typeof _computePersonalRecords === 'function') ? _computePersonalRecords(user.id) : {};
    var longestStreak = pr.longestStreak ? parseInt(pr.longestStreak.value) || streak : streak;
    var sm            = _getStreakMessage(streak);

    // Active-day set for the mini calendar
    var logs = Store.getUserLogs(user.id);
    var runs = Store.getUserRunLogs(user.id);
    var activeDates = {};
    logs.concat(runs).forEach(function (l) { if (l.date) activeDates[l.date] = true; });
    var totalActiveDays = Object.keys(activeDates).length;

    // ── Mini 28-day calendar ──
    var calHtml = '';
    var today   = new Date();
    var dayLabels = ['S','M','T','W','T','F','S'];
    calHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:12px 0 6px;text-align:center">';
    dayLabels.forEach(function (d) { calHtml += '<div style="font-size:10px;color:var(--text3);font-weight:700">' + d + '</div>'; });
    calHtml += '</div>';

    calHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">';
    // Pad the first row so day-of-week alignment is correct
    var first = new Date(today); first.setDate(today.getDate() - 27);
    var pad = first.getDay();  // 0=Sun
    for (var p = 0; p < pad; p++) calHtml += '<div></div>';

    for (var i = 27; i >= 0; i--) {
      var d   = new Date(today); d.setDate(today.getDate() - i);
      var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      var active  = !!activeDates[ymd];
      var isToday = (i === 0);
      var bg      = active ? 'var(--g3)' : 'rgba(255,255,255,0.04)';
      var border  = isToday ? 'border:2px solid var(--accent);' : '';
      var color   = active ? '#fff' : 'var(--text3)';
      calHtml += '<div style="width:100%;aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;' +
        'font-size:11px;font-weight:600;background:' + bg + ';color:' + color + ';' + border + '">' + d.getDate() + '</div>';
    }
    calHtml += '</div>';

    // ── Build modal ──
    var existing = document.getElementById('ff-streak-modal');
    if (existing) existing.remove();

    var ov = document.createElement('div');
    ov.id  = 'ff-streak-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;' +
      'display:flex;align-items:flex-end;justify-content:center';

    ov.innerHTML =
      '<div style="background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 32px;' +
        'width:100%;max-width:480px;max-height:85vh;overflow-y:auto;box-shadow:0 -12px 40px rgba(0,0,0,0.4)">' +

        '<div style="width:36px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 20px"></div>' +

        '<div style="text-align:center;margin-bottom:20px">' +
          '<div style="font-size:64px;line-height:1;margin-bottom:4px">' + sm.emoji + '</div>' +
          '<div style="font-family:var(--font-display);font-size:72px;color:var(--g5);line-height:1">' + streak + '</div>' +
          '<div style="font-size:14px;color:var(--text2);font-weight:600;margin-top:2px">day streak</div>' +
        '</div>' +

        '<div style="background:rgba(240,192,64,0.08);border:1px solid rgba(240,192,64,0.2);border-radius:14px;' +
          'padding:14px 16px;margin-bottom:20px;text-align:center">' +
          '<div style="font-size:14px;color:var(--accent);font-weight:600;line-height:1.5">' + sm.msg + '</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">' +
          '<div class="stat-card"><div class="stat-val" style="font-size:22px">' + streak + '</div><div class="stat-label">Current 🔥</div></div>' +
          '<div class="stat-card"><div class="stat-val" style="font-size:22px">' + longestStreak + '</div><div class="stat-label">Best Ever 🏆</div></div>' +
          '<div class="stat-card"><div class="stat-val" style="font-size:22px">' + totalActiveDays + '</div><div class="stat-label">Total Days 📅</div></div>' +
        '</div>' +

        '<div style="font-size:12px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Last 28 Days</div>' +
        '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:20px">' +
          calHtml +
          '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;justify-content:center">' +
            '<div style="width:12px;height:12px;border-radius:3px;background:var(--g3)"></div>' +
            '<span style="font-size:11px;color:var(--text3)">Active</span>' +
            '<div style="width:12px;height:12px;border-radius:3px;background:rgba(255,255,255,0.04);margin-left:8px"></div>' +
            '<span style="font-size:11px;color:var(--text3)">Rest</span>' +
          '</div>' +
        '</div>' +

        '<button onclick="document.getElementById(\'ff-streak-modal\')?.remove()" ' +
          'class="btn btn-outline btn-full" style="font-size:14px">Close</button>' +
      '</div>';

    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
  }
  window._showStreakDetails = _showStreakDetails;


  // ════════════════════════════════════════════════════════════════
  //  3.  HIDE / SHOW MODULES
  // ════════════════════════════════════════════════════════════════

  // ── Per-module fun confirmation messages ──
  var HIDE_MSGS = {
    cardio:        { t:'🏠 Ditching Home Cardio?',              b:"Your living room was JUST starting to feel like a gym! Remove Home Cardio?" },
    gym:           { t:'🏋️ Leaving the Gym?',                   b:"The dumbbells will miss you… and they're too heavy to chase you. Remove Gym Workouts?" },
    yoga:          { t:'🧘 Namaste… Away?',                     b:"Your chakras are about to file a formal complaint. Really remove Yoga?" },
    running:       { t:'🏃 Outrunning the Run Module?',          b:"Ironic. The running module can't even run after you to stay. Remove it?" },
    stretching:    { t:'🙆 Too Flexible to Stretch?',            b:"Your hamstrings just sighed in relief. But they'll regret it tomorrow. Remove Stretching?" },
    calisthenics:  { t:'🤸 Quitting Calisthenics?',              b:"Gravity just celebrated. It thought you were about to defy it. Remove Calisthenics?" },
    crosstraining: { t:'💪 Cross Training? More Like Cross-Bye?', b:"The 8-week plan was JUST getting good. Sure you want to remove it?" },
    ironman:       { t:'🏅 Abandoning the Iron Man?',            b:"Tony Stark would NEVER. But okay, remove the 24-week triathlon plan?" },
    core:          { t:'🔥 Core & Abs Says Goodbye?',            b:"Your abs were about to show up! They were THIS close. Remove Core & Abs?" },
    log_activity:  { t:'⚡ Hiding Activity Logger?',             b:"Badminton, Tennis, Cricket… they all just got benched. Remove the activity logger?" },
  };
  var DEFAULT_HIDE_MSG = { t:'👋 Remove Module?', b:'This module will be hidden from your dashboard. You can bring it back anytime from Profile → Manage Modules.' };

  // ── Storage helpers — use Content pipeline so Sheets sync works ──
  function _getHiddenModules(uid) {
    // Content pipeline stores under ff_content_hidden_modules_<uid>
    var val = Store.getContent('hidden_modules_' + uid);
    return Array.isArray(val) ? val : [];
  }
  function _setHiddenModules(uid, ids) {
    Store.setContent('hidden_modules_' + uid, ids);
    try { sheetsPost('saveContent', { key: 'hidden_modules_' + uid, value: ids }); } catch (e) {}
  }

  function _hideModule(moduleId) {
    var user = APP.currentUser;
    if (!user) return;
    var msg = HIDE_MSGS[moduleId] || DEFAULT_HIDE_MSG;

    showConfirm(
      msg.t, msg.b,
      '🫣 Yes, Hide It', 'Keep It 💪',
      function () {
        var hidden = _getHiddenModules(user.id);
        if (hidden.indexOf(moduleId) === -1) {
          hidden.push(moduleId);
          _setHiddenModules(user.id, hidden);
        }
        if (typeof refreshDashboard === 'function') refreshDashboard();
        showToast('Hidden! Restore from Profile → Manage Modules 👤', 'info');
      },
      null, 'danger'
    );
  }
  window._hideModule = _hideModule;

  function _showModule(moduleId) {
    var user = APP.currentUser;
    if (!user) return;
    var hidden = _getHiddenModules(user.id);
    var idx = hidden.indexOf(moduleId);
    if (idx !== -1) {
      hidden.splice(idx, 1);
      _setHiddenModules(user.id, hidden);
    }
  }
  window._showModule = _showModule;

  function _restoreModuleFromProfile(moduleId) {
    _showModule(moduleId);
    var container = document.getElementById('ff-manage-modules-list');
    if (container) container.innerHTML = _renderManageModulesInner();
    showToast('✅ Module restored! Check your dashboard.', 'success');
  }
  window._restoreModuleFromProfile = _restoreModuleFromProfile;

  function _renderManageModulesInner() {
    var user = APP.currentUser;
    if (!user) return '';
    var hidden = _getHiddenModules(user.id);
    if (!hidden.length) {
      return '<div style="font-size:13px;color:var(--text3);padding:8px 0">All modules are visible on your dashboard. 👍</div>';
    }
    return '<div style="display:flex;flex-direction:column;gap:8px">' +
      hidden.map(function (id) {
        var mod   = (typeof ALL_MODULES !== 'undefined') ? ALL_MODULES.find(function (m) { return m.id === id; }) : null;
        var name  = mod ? mod.name : id;
        var emoji = mod ? mod.emoji : '💪';
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;' +
          'background:var(--surface);border:1px solid var(--border);border-radius:12px">' +
          '<span style="font-size:22px">' + emoji + '</span>' +
          '<div style="flex:1;font-size:14px;font-weight:600;color:var(--text)">' + name + '</div>' +
          '<button onclick="_restoreModuleFromProfile(\'' + id + '\')" ' +
            'style="padding:6px 14px;border-radius:8px;border:1px solid var(--g4);' +
            'background:rgba(67,160,90,0.12);color:var(--g5);font-size:12px;font-weight:700;cursor:pointer">+ Add Back</button>' +
        '</div>';
      }).join('') +
    '</div>';
  }


  // ════════════════════════════════════════════════════════════════
  //  PATCHES  — wrap existing functions non-destructively
  // ════════════════════════════════════════════════════════════════

  // ── renderDashboardTiles: filter hidden + inject × button ──
  var _origRDT = (typeof renderDashboardTiles === 'function') ? renderDashboardTiles : null;

  window.renderDashboardTiles = function () {
    if (_origRDT) _origRDT();  // render normally first

    var user = APP.currentUser;
    if (!user) return;
    var hidden = _getHiddenModules(user.id);
    var grid   = document.getElementById('module-grid');
    if (!grid) return;

    // Remove hidden cards
    grid.querySelectorAll('.module-card').forEach(function (card) {
      if (hidden.indexOf(card.dataset.module) !== -1) card.remove();
    });

    // Inject × button on each visible card
    grid.querySelectorAll('.module-card').forEach(function (card) {
      var modId = card.dataset.module;
      if (!modId || card.querySelector('.ff-hide-btn')) return;

      var btn = document.createElement('button');
      btn.className = 'ff-hide-btn';
      btn.innerHTML = '×';
      btn.title     = 'Hide module';
      btn.setAttribute('aria-label', 'Hide this module');
      btn.style.cssText =
        'position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;' +
        'background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15);' +
        'color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;z-index:10;' +
        'display:flex;align-items:center;justify-content:center;line-height:1;' +
        'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)';
      btn.onclick = function (e) {
        e.stopPropagation();
        _hideModule(modId);
      };
      card.style.position = 'relative';
      card.appendChild(btn);
    });
  };

  // ── renderProfilePage: inject "Manage Modules" section ──
  var _origRPP = (typeof renderProfilePage === 'function') ? renderProfilePage : null;

  window.renderProfilePage = function () {
    if (_origRPP) _origRPP();

    var container = document.getElementById('profile-content');
    if (!container) return;

    // Find the "Account" section title and insert before it
    var insertBefore = null;
    container.querySelectorAll('.section-title').forEach(function (el) {
      if (el.textContent.trim() === 'Account') insertBefore = el;
    });

    if (insertBefore) {
      var section = document.createElement('div');
      section.id  = 'ff-manage-modules-section';
      section.innerHTML =
        '<div class="section-title" style="margin-bottom:10px">📦 Manage Modules</div>' +
        '<div class="card card-sm" style="margin-bottom:20px;padding:14px">' +
          '<div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">' +
            'Modules you\'ve hidden from the dashboard appear here. Tap <strong style="color:var(--g5)">+ Add Back</strong> to restore.' +
          '</div>' +
          '<div id="ff-manage-modules-list">' + _renderManageModulesInner() + '</div>' +
        '</div>';
      insertBefore.parentNode.insertBefore(section, insertBefore);
    }
  };


  // ════════════════════════════════════════════════════════════════
  //  INJECT SEARCH ICON  +  MAKE STREAK PILL TAPPABLE
  // ════════════════════════════════════════════════════════════════

  function _injectHeaderEnhancements() {
    var streakPill = document.querySelector('.streak-pill');
    if (!streakPill) return;
    var header = streakPill.parentElement;
    if (!header) return;

    // ── Search button ──
    if (!document.getElementById('ff-search-btn')) {
      var sb = document.createElement('button');
      sb.id  = 'ff-search-btn';
      sb.innerHTML = '🔍';
      sb.title = 'Search';
      sb.setAttribute('aria-label', 'Search modules and activities');
      sb.style.cssText =
        'width:36px;height:36px;border-radius:50%;background:var(--surface);' +
        'border:1px solid var(--border);font-size:16px;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
        'transition:background .15s,transform .1s';
      sb.onclick = _openGlobalSearch;
      header.insertBefore(sb, streakPill);
    }

    // ── Make streak pill tappable ──
    if (!streakPill._enhanced) {
      streakPill.style.cursor        = 'pointer';
      streakPill.style.userSelect    = 'none';
      streakPill.style.webkitUserSelect = 'none';
      streakPill.title               = 'Tap for streak details';
      streakPill.addEventListener('click', function () {
        streakPill.style.transform = 'scale(0.94)';
        setTimeout(function () { streakPill.style.transform = ''; }, 120);
        _showStreakDetails();
      });
      streakPill._enhanced = true;
    }
  }

  // ── Hook into existing lifecycle ──
  var _origID = (typeof initDashboard === 'function') ? initDashboard : null;
  if (_origID) {
    window.initDashboard = function () {
      _origID();
      setTimeout(_injectHeaderEnhancements, 60);
    };
  }

  var _origRD = (typeof refreshDashboard === 'function') ? refreshDashboard : null;
  if (_origRD) {
    window.refreshDashboard = function () {
      _origRD();
      setTimeout(_injectHeaderEnhancements, 60);
    };
  }

  // Immediate attempt in case dashboard is already visible
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(_injectHeaderEnhancements, 300);
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_injectHeaderEnhancements, 300); });
  }

})();
