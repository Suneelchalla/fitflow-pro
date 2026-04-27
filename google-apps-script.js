// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Apps Script Backend
// Deploy this as a Web App: Execute as "Me", Access "Anyone"
// Paste the deployed URL into Admin → Content → Configure Sheets
// ════════════════════════════════════════════════════════════════

// ── SHEET NAMES ──────────────────────────────────────────────────
const SHEET = {
  USERS:          'Users',
  LOGS:           'CompletionLog',
  RUN_LOGS:       'RunningLog',
  QUOTES:         'Quotes',
  HYDRATION_DIET: 'HydrationDiet',
  RUNNING_PLANS:  'RunningPlans',
};

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

// ── CORS HEADERS ─────────────────────────────────────────────────
function addCors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── doGET ─────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || '';
  let result = { success: false, error: 'Unknown action' };

  try {
    if (action === 'ping') {
      result = { success: true, message: 'FitFlow Pro API online!' };

    } else if (action === 'login') {
      const email = (e.parameter.email || '').toLowerCase().trim();
      const password = e.parameter.password || '';
      result = handleLogin(email, password);

    } else if (action === 'getExercises') {
      const module = e.parameter.module;
      const day = e.parameter.day;
      result = { success: true, exercises: getExercises(module, day) };

    } else if (action === 'getQuote') {
      result = { success: true, quote: getRandomQuote() };

    } else if (action === 'getHydrationDiet') {
      const module = e.parameter.module;
      result = { success: true, data: getHydrationDiet(module) };

    } else if (action === 'getRunningPlan') {
      const planType = e.parameter.planType;
      const week = parseInt(e.parameter.week) || 1;
      result = { success: true, plan: getRunningPlan(planType, week) };

    } else if (action === 'getAllUsers') {
      result = { success: true, users: getAllUsers() };

    } else if (action === 'getUserLogs') {
      const userId = e.parameter.userId;
      result = { success: true, logs: getUserLogs(userId) };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return addCors(ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON));
}

// ── doPOST ────────────────────────────────────────────────────────
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch {}

  const action = body.action || '';
  let result = { success: false, error: 'Unknown action' };

  try {
    if (action === 'logCompletion') {
      result = logCompletion(body);
    } else if (action === 'logRun') {
      result = logRun(body);
    } else if (action === 'createUser') {
      result = createUser(body);
    } else if (action === 'updateHydrationDiet') {
      result = updateHydrationDiet(body);
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return addCors(ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON));
}

// ── AUTH ──────────────────────────────────────────────────────────
function handleLogin(email, password) {
  const sh = getSheet(SHEET.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const [id, name, userEmail, pass, role, status] = data[i];
    if (userEmail?.toLowerCase() === email && pass === password) {
      if (status === 'INACTIVE') return { success: false, error: 'Account disabled.' };
      // Update last login
      sh.getRange(i + 1, 8).setValue(new Date().toISOString());
      return { success: true, user: { id, name, email: userEmail, role, status } };
    }
  }
  return { success: false, error: 'Invalid email or password.' };
}

// ── USERS ─────────────────────────────────────────────────────────
function getAllUsers() {
  const sh = getSheet(SHEET.USERS);
  const data = sh.getDataRange().getValues();
  return data.slice(1).map(r => ({
    id: r[0], name: r[1], email: r[2], role: r[4], status: r[5], createdDate: r[6], lastLogin: r[7]
  }));
}

function createUser(body) {
  const sh = getSheet(SHEET.USERS);
  // Ensure headers
  ensureHeaders(sh, ['UserID','Name','Email','Password','Role','Status','CreatedDate','LastLogin']);
  // Check duplicate
  const data = sh.getDataRange().getValues();
  const exists = data.slice(1).some(r => r[2]?.toLowerCase() === body.email?.toLowerCase());
  if (exists) return { success: false, error: 'Email already exists.' };

  const id = 'u_' + Date.now();
  sh.appendRow([id, body.name, body.email, body.password, body.role || 'USER', 'ACTIVE', new Date().toISOString().split('T')[0], '']);
  return { success: true, userId: id };
}

// ── COMPLETION LOG ────────────────────────────────────────────────
function logCompletion(body) {
  const sh = getSheet(SHEET.LOGS);
  ensureHeaders(sh, ['LogID','UserID','Email','Module','Day','Date','Timestamp']);
  const logId = 'log_' + Date.now();
  sh.appendRow([logId, body.userId, body.email, body.module, body.day, body.date, new Date().toISOString()]);
  return { success: true, logId };
}

function getUserLogs(userId) {
  const sh = getSheet(SHEET.LOGS);
  const data = sh.getDataRange().getValues();
  return data.slice(1).filter(r => r[1] === userId).map(r => ({
    id: r[0], userId: r[1], email: r[2], module: r[3], day: r[4], date: r[5], timestamp: r[6]
  }));
}

// ── RUNNING LOG ───────────────────────────────────────────────────
function logRun(body) {
  const sh = getSheet(SHEET.RUN_LOGS);
  ensureHeaders(sh, ['LogID','UserID','Email','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp']);
  const logId = 'run_' + Date.now();
  sh.appendRow([logId, body.userId, body.email, body.date, body.distance, body.duration, body.pace, body.planType || 'Free Run', new Date().toISOString()]);
  return { success: true, logId };
}

// ── QUOTES ────────────────────────────────────────────────────────
function getRandomQuote() {
  const sh = getSheet(SHEET.QUOTES);
  ensureHeaders(sh, ['QuoteID','Quote','Author','Active']);
  const data = sh.getDataRange().getValues().slice(1).filter(r => r[3] !== false && r[3] !== 'FALSE');
  if (!data.length) return { text: 'Push yourself.', author: 'FitFlow Pro' };
  const r = data[Math.floor(Math.random() * data.length)];
  return { text: r[1], author: r[2] };
}

// ── EXERCISES ─────────────────────────────────────────────────────
function getExercises(module, day) {
  const sheetName = 'Exercises_' + module;
  const sh = getSheet(sheetName);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(r => r[2] === day)
    .sort((a,b) => a[3] - b[3])
    .map(r => ({ name:r[4], desc:r[5], sets:r[6], reps:r[7], image:r[8], demo:r[9], notes:r[10] }));
}

// ── HYDRATION & DIET ──────────────────────────────────────────────
function getHydrationDiet(module) {
  const sh = getSheet(SHEET.HYDRATION_DIET);
  ensureHeaders(sh, ['Module','Hydration_Title','Hydration_Content','Diet_Title','Diet_Content','LastUpdated']);
  const data = sh.getDataRange().getValues();
  const row = data.slice(1).find(r => r[0] === module);
  if (!row) return null;
  return { hydration: { title: row[1], content: row[2] }, diet: { title: row[3], content: row[4] } };
}

function updateHydrationDiet(body) {
  const sh = getSheet(SHEET.HYDRATION_DIET);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.module) {
      sh.getRange(i+1, 2, 1, 5).setValues([[body.hydrTitle, body.hydrContent, body.dietTitle, body.dietContent, new Date().toISOString()]]);
      return { success: true };
    }
  }
  sh.appendRow([body.module, body.hydrTitle, body.hydrContent, body.dietTitle, body.dietContent, new Date().toISOString()]);
  return { success: true };
}

// ── RUNNING PLANS ─────────────────────────────────────────────────
function getRunningPlan(planType, week) {
  const sh = getSheet(SHEET.RUNNING_PLANS);
  const data = sh.getDataRange().getValues();
  return data.slice(1)
    .filter(r => r[1] === planType && r[2] === week)
    .map(r => ({ week:r[2], day:r[3], type:r[4], dist:r[5], dur:r[6], desc:r[7] }));
}

// ── UTIL ──────────────────────────────────────────────────────────
function ensureHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF');
  }
}

// ── SETUP: SEED DEFAULT DATA ──────────────────────────────────────
function setupDefaultData() {
  // Default admin user
  const userSh = getSheet(SHEET.USERS);
  ensureHeaders(userSh, ['UserID','Name','Email','Password','Role','Status','CreatedDate','LastLogin']);
  if (userSh.getLastRow() < 2) {
    userSh.appendRow(['u_001','Admin User','admin@fitflow.com','admin123','ADMIN','ACTIVE','2025-01-01','']);
    userSh.appendRow(['u_002','Demo User','user@fitflow.com','user123','USER','ACTIVE','2025-01-01','']);
  }

  // Default quotes
  const qSh = getSheet(SHEET.QUOTES);
  ensureHeaders(qSh, ['QuoteID','Quote','Author','Active']);
  if (qSh.getLastRow() < 2) {
    const quotes = [
      ["q_001","The only bad workout is the one that didn't happen.","Unknown","TRUE"],
      ["q_002","Push yourself because no one else is going to do it for you.","Unknown","TRUE"],
      ["q_003","Your body can stand almost anything. It's your mind that you have to convince.","Unknown","TRUE"],
      ["q_004","Take care of your body. It's the only place you have to live.","Jim Rohn","TRUE"],
      ["q_005","Don't wish for it. Work for it.","Unknown","TRUE"],
    ];
    quotes.forEach(q => qSh.appendRow(q));
  }

  SpreadsheetApp.getUi().alert('FitFlow Pro setup complete! ✅\n\nNow deploy as Web App:\nExtensions → Apps Script → Deploy → New Deployment');
}
