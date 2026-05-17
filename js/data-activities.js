// ════════════════════════════════════════════════════════════════════
// MANUAL ACTIVITY CATALOGUE — data-activities.js
//
// Defines the catalogue of activities a user can manually log when they
// did something the app doesn't track natively (no GPS, no module
// session). Each entry carries:
//
//   id       — internal slug ('badminton'). Used in module id as
//              'activity_<id>' inside ff_logs so the same dedupe + history
//              + admin pipes that work for other modules work here too.
//   name     — display label.
//   emoji    — the hero glyph on tiles and on the shareable card.
//   met      — Metabolic Equivalent. kcal = MET × kg × hours.
//   gradient — 2-stop CSS gradient pair for the result card. Picked to
//              match each sport's feel — warm for high-intensity, cool
//              for water/calm, earth for outdoors, etc.
//   desc     — one-line subtitle shown in the picker grid.
//
// Admin override path (future-proof): Store.getContent('activities_catalogue')
// can return a replacement array. The reader function in manual-activity.js
// will prefer that over this bundled default when present.
//
// Loaded AFTER data.js (which sets up window.APP_DATA). This file extends
// APP_DATA.activities — same pattern as data-cali.js and data-crosstraining.js.
// ════════════════════════════════════════════════════════════════════

(function () {
  var D = window.APP_DATA;
  if (!D) {
    console.error('[FitFlow] data.js must load before data-activities.js');
    return;
  }

  D.activities = [
    // ── Racquet & paddle sports ──────────────────────────────────────
    { id:'badminton',     name:'Badminton',       emoji:'🏸', met:5.5, intensity:'moderate',
      gradient:['#5a1442','#c41878'], desc:'Doubles or singles' },
    { id:'table_tennis',  name:'Table Tennis',    emoji:'🏓', met:4.0, intensity:'moderate',
      gradient:['#0d4a3e','#1a8a6c'], desc:'Ping pong' },
    { id:'tennis',        name:'Tennis',          emoji:'🎾', met:7.0, intensity:'vigorous',
      gradient:['#3a4a14','#7ec428'], desc:'Court tennis' },
    { id:'pickleball',    name:'Pickleball',      emoji:'🎯', met:4.5, intensity:'moderate',
      gradient:['#2a4a14','#5fa728'], desc:'Paddle court' },
    { id:'squash',        name:'Squash',          emoji:'🟦', met:7.3, intensity:'vigorous',
      gradient:['#142a4a','#1a5fc4'], desc:'Wall court' },

    // ── Team / field sports ──────────────────────────────────────────
    { id:'cricket',       name:'Cricket',         emoji:'🏏', met:5.0, intensity:'moderate',
      gradient:['#4a2a0e','#a85a14'], desc:'Bat & bowl' },
    { id:'football',      name:'Football',        emoji:'⚽', met:7.5, intensity:'vigorous',
      gradient:['#0e3a14','#28a042'], desc:'Soccer' },
    { id:'volleyball',    name:'Volleyball',      emoji:'🏐', met:4.0, intensity:'moderate',
      gradient:['#4a3a14','#c4a028'], desc:'Indoor or beach' },
    { id:'basketball',    name:'Basketball',      emoji:'🏀', met:6.5, intensity:'vigorous',
      gradient:['#4a1e0a','#e85f1a'], desc:'Half or full court' },

    // ── Studio & functional ──────────────────────────────────────────
    { id:'yoga',          name:'Yoga',            emoji:'🧘', met:3.0, intensity:'light',
      gradient:['#2a0e4a','#7028c4'], desc:'Studio or home flow' },
    { id:'dance',         name:'Dance',           emoji:'💃', met:5.0, intensity:'moderate',
      gradient:['#4a0e3a','#e8287a'], desc:'Zumba, contemporary, free' },
    { id:'weight_train',  name:'Weight Training', emoji:'🏋️', met:5.0, intensity:'moderate',
      gradient:['#2a2a2a','#5a5a5a'], desc:'Gym or home barbell' },
    { id:'workout',       name:'General Workout', emoji:'💪', met:4.5, intensity:'moderate',
      gradient:['#0e2a3a','#1a6ea0'], desc:'Mixed body weight' },
    { id:'hiit',          name:'HIIT',            emoji:'🔥', met:9.0, intensity:'vigorous',
      gradient:['#4a0e14','#c4282e'], desc:'High-intensity interval' },
    { id:'crossfit',      name:'CrossFit',        emoji:'⚡', met:9.0, intensity:'vigorous',
      gradient:['#4a1e0e','#e8521a'], desc:'WOD style' },
    { id:'boxing',        name:'Boxing',          emoji:'🥊', met:9.0, intensity:'vigorous',
      gradient:['#2a0a0e','#a01e2a'], desc:'Bag work or sparring' },

    // ── Outdoor ──────────────────────────────────────────────────────
    { id:'swimming',      name:'Swimming',        emoji:'🏊', met:7.0, intensity:'vigorous',
      gradient:['#0e3a5a','#1888c4'], desc:'Laps or open water' },
    { id:'hiking',        name:'Hiking',          emoji:'🥾', met:5.3, intensity:'moderate',
      gradient:['#3a2a14','#8a5a28'], desc:'Trail or hills' },
    { id:'climbing',      name:'Rock Climbing',   emoji:'🧗', met:8.0, intensity:'vigorous',
      gradient:['#2a2a3a','#5a5a7a'], desc:'Indoor wall or outdoor' },
    { id:'golf',          name:'Golf',            emoji:'⛳', met:4.8, intensity:'moderate',
      gradient:['#1e3a14','#5a8a28'], desc:'Walking 9 or 18' },

    // ── Conditioning ──────────────────────────────────────────────────
    { id:'skipping',      name:'Skipping Rope',   emoji:'🪢', met:11.0, intensity:'vigorous',
      gradient:['#0a3a4a','#1aa0c4'], desc:'Jump rope intervals' },

    // ── Catch-all ────────────────────────────────────────────────────
    { id:'other',         name:'Other',           emoji:'⚡', met:5.0, intensity:'moderate',
      gradient:['#0e2818','#2e7d46'], desc:'Custom — type a name' },
  ];

  // Fallback used when an activity id is unknown (e.g. a legacy log from
  // an older catalogue version, or a corrupted entry). manual-activity.js
  // and dashboard.js call D.getActivity() and rely on this so the UI
  // never breaks on a missing id.
  D.activityFallback = {
    id:'other', name:'Activity', emoji:'💪', met:5.0, intensity:'moderate',
    gradient:['#0e2818','#2e7d46'], desc:'',
  };

  // Resolver — accepts either the bare id ('badminton') OR the prefixed
  // module id ('activity_badminton'). Returns the fallback when missing.
  D.getActivity = function (id) {
    if (!id) return D.activityFallback;
    var clean = String(id).replace(/^activity_/, '');
    var hit   = D.activities.find(function (a) { return a.id === clean; });
    return hit || D.activityFallback;
  };
})();
