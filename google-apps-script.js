// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Apps Script Backend v3
//
// FIRST TIME SETUP:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script → DELETE old code → paste this
// 3. Run fixExistingSheet() — fixes your current sheet data
// 4. Run setupSheets() — creates all other required sheets
// 5. Deploy → Manage Deployments → Edit → New Version → Deploy
// ════════════════════════════════════════════════════════════════

const SHEETS = {
  USERS:           'Users',
  LOGS:            'CompletionLog',
  RUN_LOGS:        'RunningLog',
  CONTENT:         'Content',
  FEEDBACK:        'UserFeedback',
  CUSTOM_WORKOUTS: 'CustomWorkouts',
};

// Column indexes for Users sheet (0-based)
const COL = {
  ID:             0,   // A
  NAME:           1,   // B
  EMAIL:          2,   // C
  PASSWORD:       3,   // D
  TEMP_PASSWORD:  4,   // E
  IS_FIRST_LOGIN: 5,   // F
  ROLE:           6,   // G
  STATUS:         7,   // H
  CREATED_DATE:   8,   // I
  CREATED_BY:     9,   // J
  LAST_LOGIN:     10,  // K
};

// ── SHEET HELPER ──────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doGET ─────────────────────────────────────────────────────────
function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || '';
  let result;
  try {
    switch (action) {
      case 'ping':
        result = { success: true, message: 'FitFlow Pro API v3 online!', time: new Date().toISOString() };
        break;
      case 'login':
        result = handleLogin(p.email, p.password);
        break;
      case 'getAllUsers':
        result = { success: true, users: getAllUsers() };
        break;
      case 'getUserLogs':
        result = { success: true, logs: getUserLogs(p.userId) };
        break;
      case 'getContent':
        result = { success: true, content: getContent(p.key) };
        break;
      case 'getAllContent':
        result = getAllContent();
        break;
      case 'getFeedback':
        result = getFeedback();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return jsonOut(result);
}

// ── doPOST ────────────────────────────────────────────────────────
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(ex) {}
  const action = body.action || '';
  let result;
  try {
    switch (action) {
      case 'createUser':       result = createUser(body);       break;
      case 'changePassword':   result = changePassword(body);   break;
      case 'updateUserStatus': result = updateUserStatus(body); break;
      case 'logCompletion':    result = logCompletion(body);    break;
      case 'logRun':           result = logRun(body);           break;
      case 'saveContent':      result = saveContent(body);      break;
      case 'submitFeedback':   result = submitFeedback(body);   break;
      case 'deleteUser':            result = deleteUser(body);            break;
      case 'saveCustomWorkout':     result = saveCustomWorkout(body);     break;
      case 'deleteCustomWorkout':   result = deleteCustomWorkout(body);   break;
      case 'savePushSubscription':  result = savePushSubscription(body);  break;
      case 'removePushSubscription':result = removePushSubscription(body);break;
      default: result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return jsonOut(result);
}

// ════════════════════════════════════════════════════════════════
// FIX EXISTING SHEET — Run this FIRST if you already have data
// ════════════════════════════════════════════════════════════════
function fixExistingSheet() {
  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  // Check if row 1 is already a header row
  const firstCell = (data[0][0] || '').toString().trim();
  const isHeader  = firstCell.toLowerCase() === 'userid' || firstCell.toLowerCase() === 'id';

  if (!isHeader) {
    // Row 1 has data (no headers) — insert header row at top
    sh.insertRowBefore(1);
    const headers = ['UserID','Name','Email','Password','TempPassword','IsFirstLogin','Role','Status','CreatedDate','CreatedBy','LastLogin'];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader(sh, headers.length);
    SpreadsheetApp.flush();
    Logger.log('Header row inserted.');
  } else {
    Logger.log('Header row already exists.');
  }

  // Now re-read with headers
  const allData = sh.getDataRange().getValues();

  // Fix each data row
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    let changed = false;

    // If Role column (G = index 6) is empty, set to USER
    if (!row[COL.ROLE] || row[COL.ROLE].toString().trim() === '') {
      sh.getRange(i + 1, COL.ROLE + 1).setValue('USER');
      changed = true;
    }

    // If Status column (H = index 7) is empty, set to ACTIVE
    if (!row[COL.STATUS] || row[COL.STATUS].toString().trim() === '') {
      sh.getRange(i + 1, COL.STATUS + 1).setValue('ACTIVE');
      changed = true;
    }

    // If IsFirstLogin column (F = index 5) is empty, check if Password (D) is empty
    const hasPassword = row[COL.PASSWORD] && row[COL.PASSWORD].toString().trim() !== '';
    const hasTempPass = row[COL.TEMP_PASSWORD] && row[COL.TEMP_PASSWORD].toString().trim() !== '';
    if (row[COL.IS_FIRST_LOGIN] === '' || row[COL.IS_FIRST_LOGIN] === null) {
      sh.getRange(i + 1, COL.IS_FIRST_LOGIN + 1).setValue(!hasPassword);
      changed = true;
    }

    // If created date is empty, fill it
    if (!row[COL.CREATED_DATE] || row[COL.CREATED_DATE].toString().trim() === '') {
      sh.getRange(i + 1, COL.CREATED_DATE + 1).setValue(new Date().toISOString().split('T')[0]);
      changed = true;
    }
  }

  // ── Now check if admin account exists ──
  const freshData = sh.getDataRange().getValues();
  const hasAdmin = freshData.slice(1).some(r =>
    (r[COL.ROLE] || '').toString().toUpperCase() === 'ADMIN'
  );

  if (!hasAdmin) {
    // Add admin account
    const adminRow = new Array(11).fill('');
    adminRow[COL.ID]             = 'u_admin';
    adminRow[COL.NAME]           = 'Admin User';
    adminRow[COL.EMAIL]          = 'admin@fitflow.com';
    adminRow[COL.PASSWORD]       = 'admin123';
    adminRow[COL.TEMP_PASSWORD]  = '';
    adminRow[COL.IS_FIRST_LOGIN] = false;
    adminRow[COL.ROLE]           = 'ADMIN';
    adminRow[COL.STATUS]         = 'ACTIVE';
    adminRow[COL.CREATED_DATE]   = new Date().toISOString().split('T')[0];
    adminRow[COL.CREATED_BY]     = 'System';
    adminRow[COL.LAST_LOGIN]     = '';
    sh.appendRow(adminRow);
    Logger.log('Admin account created.');
  } else {
    Logger.log('Admin account already exists.');
  }

  SpreadsheetApp.flush();

  // Show summary
  const finalData = sh.getDataRange().getValues();
  const userCount = finalData.length - 1;
  SpreadsheetApp.getUi().alert(
    '✅ Sheet Fixed Successfully!\n\n' +
    'Total users in sheet: ' + userCount + '\n\n' +
    'Admin credentials:\n' +
    '  Email:    admin@fitflow.com\n' +
    '  Password: admin123\n\n' +
    'Now run setupSheets() to create other required sheets.\n' +
    'Then redeploy as New Version.'
  );
}

// ════════════════════════════════════════════════════════════════
// SETUP — Run AFTER fixExistingSheet()
// ════════════════════════════════════════════════════════════════
function setupSheets() {
  // Users sheet — only add headers if completely empty
  const userSh = getSheet(SHEETS.USERS);
  if (userSh.getLastRow() === 0) {
    const headers = ['UserID','Name','Email','Password','TempPassword','IsFirstLogin','Role','Status','CreatedDate','CreatedBy','LastLogin'];
    userSh.appendRow(headers);
    styleHeader(userSh, headers.length);
    userSh.appendRow(['u_admin','Admin User','admin@fitflow.com','admin123','',false,'ADMIN','ACTIVE',new Date().toISOString().split('T')[0],'System','']);
  }

  // CompletionLog sheet
  const logSh = getSheet(SHEETS.LOGS);
  if (logSh.getLastRow() === 0) {
    logSh.appendRow(['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
    styleHeader(logSh, 7);
  }

  // RunningLog sheet
  const runSh = getSheet(SHEETS.RUN_LOGS);
  if (runSh.getLastRow() === 0) {
    runSh.appendRow(['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp']);
    styleHeader(runSh, 9);
  }

  // Content sheet
  const contentSh = getSheet(SHEETS.CONTENT);
  if (contentSh.getLastRow() === 0) {
    contentSh.appendRow(['Key','Value','UpdatedAt']);
    styleHeader(contentSh, 3);
  }

  // Feedback sheet
  const fbSh = getSheet(SHEETS.FEEDBACK);
  if (fbSh.getLastRow() === 0) {
    fbSh.appendRow(['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp']);
    styleHeader(fbSh, 9);
  }

  // PushSubscriptions sheet
  const pushSh = getSheet('PushSubscriptions');
  if (pushSh.getLastRow() === 0) {
    pushSh.appendRow(['UserID','Name','Email','Endpoint','P256DH','Auth','SavedAt','Active']);
    styleHeader(pushSh, 8);
  }


  // CustomWorkouts sheet
  const cwSh = getSheet(SHEETS.CUSTOM_WORKOUTS);
  if (cwSh.getLastRow() === 0) {
    cwSh.appendRow(['WorkoutID','UserID','UserEmail','Name','ExercisesJSON','CreatedDate','UpdatedDate','Active']);
    styleHeader(cwSh, 8);
  }

  SpreadsheetApp.getUi().alert(
    '✅ All Sheets Ready!\n\n' +
    'Sheets created/verified:\n' +
    '  ✓ Users\n' +
    '  ✓ CompletionLog\n' +
    '  ✓ RunningLog\n' +
    '  ✓ Content\n' +
    '  ✓ UserFeedback\n' +
    '  ✓ PushSubscriptions\n' +
    '  ✓ CustomWorkouts\n\n' +
    'Next Steps:\n' +
    '1. Deploy → Manage Deployments\n' +
    '2. Edit → New Version → Deploy\n' +
    '3. Copy URL → paste in App Admin Panel'
  );
}

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
function handleLogin(email, password) {
  if (!email || !password) return { success: false, error: 'Email and password required.' };

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const rowEmail = (row[COL.EMAIL] || '').toString().toLowerCase().trim();

    if (rowEmail !== email.toLowerCase().trim()) continue;

    // Check status
    const status = (row[COL.STATUS] || 'ACTIVE').toString().toUpperCase().trim();
    if (status === 'INACTIVE') {
      return { success: false, error: 'Account deactivated. Contact admin.' };
    }

    const storedPass = (row[COL.PASSWORD]     || '').toString().trim();
    const tempPass   = (row[COL.TEMP_PASSWORD]|| '').toString().trim();

    // Robust isFirstLogin check — handles boolean true, string "TRUE", "true", "1", yes
    const firstLoginRaw = row[COL.IS_FIRST_LOGIN];
    const isFirstLogin  = firstLoginRaw === true
                       || String(firstLoginRaw).toUpperCase().trim() === 'TRUE'
                       || String(firstLoginRaw).trim() === '1';

    const enteredPass = (password || '').toString().trim();

    // Password can match: stored password OR temp password (always, not just first login)
    // This makes it more robust — if user hasn't set password yet, temp always works
    const matchStored = storedPass !== '' && storedPass === enteredPass;
    const matchTemp   = tempPass   !== '' && tempPass   === enteredPass;
    const match       = matchStored || matchTemp;

    if (!match) {
      Logger.log('Login failed for: ' + rowEmail + 
        ' | storedPass empty: ' + (storedPass==='') + 
        ' | tempPass empty: ' + (tempPass==='') + 
        ' | isFirstLogin: ' + isFirstLogin);
      return { success: false, error: 'Invalid email or password.' };
    }

    // Update last login timestamp
    sh.getRange(i + 1, COL.LAST_LOGIN + 1).setValue(new Date().toISOString());
    SpreadsheetApp.flush();

    return {
      success: true,
      user: {
        id:           (row[COL.ID]   || '').toString(),
        name:         (row[COL.NAME] || '').toString(),
        email:        (row[COL.EMAIL]|| '').toString(),
        role:         (row[COL.ROLE] || 'USER').toString().toUpperCase().trim(),
        status:       status,
        isFirstLogin: isFirstLogin,
      }
    };
  }

  return { success: false, error: 'Invalid email or password.' };
}

function changePassword(body) {
  const { userId, newPassword } = body;
  if (!userId || !newPassword) return { success: false, error: 'userId and newPassword required.' };
  if (newPassword.length < 6)  return { success: false, error: 'Password must be at least 6 characters.' };

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID] || '').toString() === userId.toString()) {
      sh.getRange(i + 1, COL.PASSWORD       + 1).setValue(newPassword);
      sh.getRange(i + 1, COL.TEMP_PASSWORD  + 1).setValue('');
      sh.getRange(i + 1, COL.IS_FIRST_LOGIN + 1).setValue(false);
      return { success: true };
    }
  }
  return { success: false, error: 'User not found.' };
}

// ════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════
function getAllUsers() {
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  return data.slice(1).map(row => ({
    id:           (row[COL.ID]           || '').toString(),
    name:         (row[COL.NAME]         || '').toString(),
    email:        (row[COL.EMAIL]        || '').toString(),
    role:         (row[COL.ROLE]         || 'USER').toString().toUpperCase(),
    status:       (row[COL.STATUS]       || 'ACTIVE').toString(),
    isFirstLogin: row[COL.IS_FIRST_LOGIN] === true || row[COL.IS_FIRST_LOGIN] === 'TRUE' || row[COL.IS_FIRST_LOGIN] === 'true',
    createdDate:  (row[COL.CREATED_DATE] || '').toString(),
    createdBy:    (row[COL.CREATED_BY]   || '').toString(),
    lastLogin:    (row[COL.LAST_LOGIN]   || '').toString(),
  }));
}

function createUser(body) {
  const { name, email, tempPassword, role, createdBy } = body;
  if (!name || !email || !tempPassword)
    return { success: false, error: 'name, email, and tempPassword are required.' };

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.EMAIL]||'').toString().toLowerCase() === email.toLowerCase().trim())
      return { success: false, error: 'A user with this email already exists.' };
  }

  const newRow = new Array(11).fill('');
  newRow[COL.ID]             = 'u_' + Date.now();
  newRow[COL.NAME]           = name.trim();
  newRow[COL.EMAIL]          = email.toLowerCase().trim();
  newRow[COL.PASSWORD]       = '';
  newRow[COL.TEMP_PASSWORD]  = tempPassword;
  newRow[COL.IS_FIRST_LOGIN] = true;
  newRow[COL.ROLE]           = (role || 'USER').toUpperCase();
  newRow[COL.STATUS]         = 'ACTIVE';
  newRow[COL.CREATED_DATE]   = new Date().toISOString().split('T')[0];
  newRow[COL.CREATED_BY]     = createdBy || 'Admin';
  newRow[COL.LAST_LOGIN]     = '';

  sh.appendRow(newRow);
  return { success: true, userId: newRow[COL.ID] };
}

function updateUserStatus(body) {
  const { userId, status } = body;
  if (!userId || !status) return { success: false, error: 'userId and status required.' };

  // Validate status value
  const normalStatus = status.toString().toUpperCase().trim();
  if (normalStatus !== 'ACTIVE' && normalStatus !== 'INACTIVE') {
    return { success: false, error: 'Status must be ACTIVE or INACTIVE.' };
  }

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowId   = (data[i][COL.ID]  || '').toString().trim();
    const rowRole = (data[i][COL.ROLE]|| '').toString().toUpperCase().trim();

    if (rowId !== userId.toString().trim()) continue;

    // Never allow disabling an ADMIN account
    if (rowRole === 'ADMIN' && normalStatus === 'INACTIVE') {
      return { success: false, error: 'Admin accounts cannot be disabled.' };
    }

    sh.getRange(i + 1, COL.STATUS + 1).setValue(normalStatus);
    SpreadsheetApp.flush(); // force immediate write
    Logger.log('Status updated: ' + rowId + ' → ' + normalStatus);
    return { success: true, userId: rowId, newStatus: normalStatus };
  }

  return { success: false, error: 'User not found. ID: ' + userId };
}

function deleteUser(body) {
  const { userId } = body;
  if (!userId) return { success: false, error: 'userId required.' };

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString() === userId.toString()) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'User not found.' };
}

// ════════════════════════════════════════════════════════════════
// WORKOUT LOGS
// ════════════════════════════════════════════════════════════════
function logCompletion(body) {
  const sh = getSheet(SHEETS.LOGS);
  ensureHeaders(sh, ['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
  sh.appendRow(['log_'+Date.now(), body.userId||'', body.email||'', body.module||'', body.day||'', body.date||'', new Date().toISOString()]);
  return { success: true };
}

function getUserLogs(userId) {
  const sh   = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(r => (r[1]||'').toString() === userId.toString())
    .map(r => ({ id:r[0], userId:r[1], email:r[2], module:r[3], day:r[4], date:r[5], timestamp:r[6] }));
}

function logRun(body) {
  const sh = getSheet(SHEETS.RUN_LOGS);
  ensureHeaders(sh, ['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp']);
  sh.appendRow(['run_'+Date.now(), body.userId||'', body.email||'', body.date||'', body.distance||0, body.duration||0, body.pace||0, body.planType||'Free Run', new Date().toISOString()]);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
// CONTENT
// ════════════════════════════════════════════════════════════════
function getContent(key) {
  const sh   = getSheet(SHEETS.CONTENT);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === key) {
      try { return JSON.parse(data[i][1]); } catch { return null; }
    }
  }
  return null;
}

// Returns ALL saved content keys in one call — used by app on login sync
function getAllContent() {
  const sh   = getSheet(SHEETS.CONTENT);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { success: true, content: {} };

  const result = {};
  data.slice(1).forEach(row => {
    const key = (row[0]||'').toString().trim();
    if (!key) return;
    try { result[key] = JSON.parse(row[1]); }
    catch { result[key] = row[1]; }
  });
  return { success: true, content: result };
}

function saveContent(body) {
  const { key, value } = body;
  if (!key) return { success: false, error: 'key required.' };
  const sh   = getSheet(SHEETS.CONTENT);
  ensureHeaders(sh, ['Key','Value','UpdatedAt']);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === key) {
      sh.getRange(i+1, 2, 1, 2).setValues([[JSON.stringify(value), new Date().toISOString()]]);
      return { success: true };
    }
  }
  sh.appendRow([key, JSON.stringify(value), new Date().toISOString()]);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════════════════════════════════
function getFeedback() {
  const sh   = getSheet(SHEETS.FEEDBACK);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { success: true, feedback: [] };
  return {
    success: true,
    feedback: data.slice(1).reverse().map(r => ({
      id: r[0], userId: r[1], name: r[2], email: r[3],
      category: r[4], rating: r[5], message: r[6], date: r[7]
    }))
  };
}

function submitFeedback(body) {
  const sh = getSheet(SHEETS.FEEDBACK);
  ensureHeaders(sh, ['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp']);
  sh.appendRow(['fb_'+Date.now(), body.userId||'', body.name||'Anonymous', body.email||'', body.category||'General', body.rating||0, body.message||'', body.date||'', new Date().toISOString()]);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
// CUSTOM WORKOUTS
// ════════════════════════════════════════════════════════════════

function saveCustomWorkout(body) {
  const sh = getSheet(SHEETS.CUSTOM_WORKOUTS);
  ensureHeaders(sh, ['WorkoutID','UserID','UserEmail','Name','ExercisesJSON','CreatedDate','UpdatedDate','Active']);
  const data = sh.getDataRange().getValues();

  // Check if already exists — update it
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === body.id.toString() &&
        (data[i][1]||'').toString() === body.userId.toString()) {
      sh.getRange(i+1, 1, 1, 8).setValues([[
        body.id, body.userId, body.email||'',
        body.name, JSON.stringify(body.exercises||[]),
        body.createdDate||'', body.updatedDate||new Date().toISOString().split('T')[0], true
      ]]);
      return { success: true, updated: true };
    }
  }

  // New workout
  sh.appendRow([
    body.id, body.userId, body.email||'',
    body.name, JSON.stringify(body.exercises||[]),
    body.createdDate||new Date().toISOString().split('T')[0],
    body.updatedDate||new Date().toISOString().split('T')[0], true
  ]);
  return { success: true, created: true };
}

function deleteCustomWorkout(body) {
  const sh = getSheet(SHEETS.CUSTOM_WORKOUTS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === body.id.toString() &&
        (data[i][1]||'').toString() === body.userId.toString()) {
      sh.getRange(i+1, 8).setValue(false); // mark inactive
      return { success: true };
    }
  }
  return { success: false, error: 'Workout not found.' };
}

function getCustomWorkouts(userId) {
  const sh = getSheet(SHEETS.CUSTOM_WORKOUTS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { success: true, workouts: [] };

  const filter = userId ? (r => (r[1]||'').toString() === userId.toString() && r[7] !== false) : (r => r[7] !== false);
  const workouts = data.slice(1).filter(filter).map(r => {
    let exercises = [];
    try { exercises = JSON.parse(r[4]||'[]'); } catch {}
    return {
      id:          (r[0]||'').toString(),
      userId:      (r[1]||'').toString(),
      email:       (r[2]||'').toString(),
      name:        (r[3]||'').toString(),
      exercises,
      createdDate: (r[5]||'').toString(),
      updatedDate: (r[6]||'').toString(),
    };
  });
  return { success: true, workouts };
}

// ════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════
function ensureHeaders(sh, headers) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    styleHeader(sh, headers.length);
  }
}

function styleHeader(sh, colCount) {
  sh.getRange(1, 1, 1, colCount)
    .setFontWeight('bold')
    .setBackground('#1B5E20')
    .setFontColor('#FFFFFF')
    .setFontSize(11);
  sh.setFrozenRows(1);
}


// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — FCM v1 API (Modern approach)
// Uses Service Account — no legacy server key needed
// ════════════════════════════════════════════════════════════════

// ── FCM CONFIG — REPLACE THIS ────────────────────────────────────
// Your Firebase Project ID — found in Firebase Console → Project Settings → General
var FIREBASE_PROJECT_ID = 'fitflow-pro-5c13f';
// e.g. 'fitflow-pro-5c13f' (shown in your Firebase project URL)

// Service Account JSON — paste the ENTIRE content of your service account JSON here
// How to get it:
//   Firebase Console → Project Settings → Service Accounts tab
//   → Click "Generate new private key" → Download JSON
//   → Copy the ENTIRE JSON content and paste it below as a string
var SERVICE_ACCOUNT_JSON = '{"type":"service_account","project_id":"fitflow-pro-5c13f","private_key_id":"bd5db792820ff659acb4ad71f7554c01e522b2ec","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDzihsc70tqfMZY\nYTbvu3z3+W9yo4lh8hRFQ9ssQCJfXaM9xL44jSV317JkPjaEmK3XDumLwp8qgK56\ngTSwjBlM00IqLzuRlvwBpWClFdVosx6pessWFMLjmqUbS1At5zx4agAo7QRDaCs+\n6nDRRLTFRadnZ+Yys4QorbT/SpLzQ1jDwx/JSnJfdZvHQVlxOp673eeys1VUJc0S\n0zkkb2hN1i2tVyw7H9SlpSV6rs7Ojd6OMO93SL+xPBAobKFiIgWKLfurAWMml+Tx\nIweFJ8V9kQgK5YDfVRbOdM9v4oqZks8o7vDh8ZqVanToTZ6+mZs0nbZoCR9HYtfJ\nGTyHblJ9AgMBAAECggEAEKuptvWUtz2YHdPLvPsbxGVX5mRA4so9bnoFCPamk69s\ncu2NKtWolKyYZWm9IB72ZAlSiHKs+VhqeRrFO/eJwiXs5R0rafLIndE6TW/yQN2P\n/KsZ4ealFODl/+QMIT7vTKZ5i9Og7in1hIlA6eZBgdvGfYV8bwiK7vY9tJhKzlQc\nkodcIgskjOOSY6SN6xPWeU34mYEKRmXmJCoa26/1Sh+WpCoUS3Ljb7QqHCnh27Li\nzru8VPf2m02zJnTksvFPCdBROinaOdsoGW8yNHSud7q786vsprcP3NMWYx7/RQDX\np9A+p4gPbx5r/SL7mg8sSAhs4Pfw2yAdkLTsCYo+UQKBgQD6IX9ki/AwSiFYrsTL\n0qfVGNioMhzoHaMMgOrj92NLsJXGzxIxYG2SmwCQ6IcjKiZ5816VHHNwjP3njzSg\nLpgNufctsWPyGZR1F39sXqE1s2SH4z1/lVH8Wh+PEIYkgOr46fyM+2fwA3s0qgPc\nFAPho0PZWvBPEsM1Cxp5DrMdUQKBgQD5QQPJAec7lx9C0mT7UfBi3Qt7sEu4vNtC\nJIv3ZDFEdJvlUy8OC7DVSLNSx5P+WpSlPR9loLnp2X5TlC4ltDiNFHBwMuAkn6eD\nDCYbSqeMwY9I4NJJTDJs1HtDkNak0hVIsiOT4apaOd81ncY9Wr++W+lqnNTDa0xw\nEtGdnZunbQKBgExzdpuFxhkMX1rauB3QOioA2R+3iWxMuqw0rxaUY44b3/uPCPF8\nlqELrUWdPMi7tlzpzMvokUQiY+ylsaEP/LudTnZx1KmHtf9/+htmZQGj3iNGimJ3\ngkKOTT0OAOIhYTBJXD6/DMqoVb0IBfv7RiBuJWvGxtJ0WqPYy/OaUZaxAoGAAKOS\nBuniVdzFT76KU7qaCybV6LNC/m49gaXmVfQDzFEgNS5JaJfPFDzjeMraLkS9LM9D\nTVdkIp1UHZK7q40SuAndX+xBdtaR71wQnPFMDKhSXbV11IpFdtH0nu+4HSQMuer6\n/F4Pubt8Pv7wiye4ZhyGNKfCQ936jC8AKo9E3uECgYA369svesWCN8/Fb+tamiTy\n+vNAjHVfo2yX8IvDStXMb69aJ55qUWGVRdXMLrOhaup2VvYwpe3OegV1lFjvy+yd\nNiPx6Y5PEUgrB88HgExMBsBqW19G6Iglt/g08Aymfct4pW7TJJH1KcYgxALJY7F9\nX92nsYeKW7pANjjCwQtZyQ==\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@fitflow-pro-5c13f.iam.gserviceaccount.com","client_id":"109773573307538782514","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40fitflow-pro-5c13f.iam.gserviceaccount.com","universe_domain":"googleapis.com"}';

// ── SHEET NAME ────────────────────────────────────────────────────
var PUSH_SUBS_SHEET = 'PushSubscriptions';

// ── DAILY MESSAGES (30 rotating) ─────────────────────────────────
var DAILY_MESSAGES = [
  { title: "Rise & Grind! 🌅",          body: "Your muscles called — they're bored. Time to fix that! 💪" },
  { title: "Good Morning Champion! 🏆",  body: "The only workout you'll regret is the one you skipped! 😤" },
  { title: "Wakey Wakey! ⏰",            body: "Your future self is at the gym waiting. Don't keep them waiting! 🏃" },
  { title: "FitFlow Pro says... 🔥",     body: "Somewhere someone is warming up with your max. Let's change that! 💥" },
  { title: "Morning Motivation! ☀️",     body: "Coffee is great. But endorphins? Free and hit harder! 😂" },
  { title: "Let's GO! 🚀",               body: "Your body is a temple. Today we're doing renovations. 🔨💪" },
  { title: "Daily Check-In! 📋",         body: "Cardio? Yoga? Running? Your app is ready when you are! 🎯" },
  { title: "6 AM Wake Up Call! 📱",      body: "The alarm rang. Your excuses are still sleeping. YOU don't have to be! 🌟" },
  { title: "FitFlow Pro 💚",             body: "30 min workout = 2% of your day. You literally have no excuse! 😏" },
  { title: "Morning Legend! 🦁",         body: "Lions don't skip leg day. Be the lion. 🦁💪" },
  { title: "Rise & Shine! ✨",           body: "Yesterday you said tomorrow. TODAY IS THAT TOMORROW. GO! 🏃‍♂️" },
  { title: "Hydrate & Dominate! 💧",     body: "Drink water. Do workout. Eat well. Repeat. Legendary results! 🏆" },
  { title: "Good Morning! 🌄",           body: "Your competition woke up at 5 AM. But you're here now — keep going! 💪" },
  { title: "FitFlow Daily! 🎯",          body: "Today's workout: Show up. That's it. The rest takes care of itself! 🙌" },
  { title: "Move Your Body! 🕺",         body: "Muscles are like WiFi. Use them or the connection gets weak! 📶💪" },
  { title: "Morning Champion! 🥇",       body: "Progress not perfection. One workout at a time. You've got this! 🌟" },
  { title: "Time to Sweat! 😅",          body: "Sweat is just your fat crying. Make it cry today! 😂🔥" },
  { title: "FitFlow Reminder! ⚡",        body: "Your goals don't care about your mood. But you'll LOVE yourself after! 😊" },
  { title: "New Day, New Gains! 💪",     body: "Yesterday's soreness is today's strength. What are you building? 🏗️" },
  { title: "Morning Warrior! ⚔️",        body: "Warriors don't wait for motivation. They BECOME it. Let's GO! 🔥" },
  { title: "FitFlow Pro Says Hi! 👋",    body: "Your workout clothes are right there. They look lonely. 👀👟" },
  { title: "Daily Dose of Awesome! 💊",  body: "Side effects: confidence, energy, better sleep, happiness. Worth it! 😁" },
  { title: "It's Workout O'Clock! 🕕",   body: "6 AM: The time champions are made. You're already awake. Be legendary! 🦅" },
  { title: "FitFlow Morning! 🌺",        body: "Your body has been fasting all night. Wake it up with movement! 🥗" },
  { title: "Strength Incoming! 💪",      body: "Every rep is a vote for the person you want to become. Vote today! 🗳️" },
  { title: "No Excuses Today! 🚫",       body: "Too tired? Start with 5 minutes. Too busy? You're reading this! 😉" },
  { title: "Monday Motivation! 📅",      body: "New week, fresh start. You didn't come this far to stop now! 🚀" },
  { title: "Midweek Push! 💥",           body: "Halfway through the week. Don't slow down now! 🏁" },
  { title: "Friday Feeling! 🎉",         body: "End the week strong! Weekend warriors start training NOW! 🏃‍♀️" },
  { title: "Weekend Warrior! 🏕️",        body: "No work today? Perfect — more energy for your workout! 💪" },
];

function getTodaysMessage() {
  var dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];
}

// ── SAVE SUBSCRIPTION ─────────────────────────────────────────────
function savePushSubscription(body) {
  var sh = getSheet(PUSH_SUBS_SHEET);
  ensureHeaders(sh, ['UserID','Name','Email','Endpoint','P256DH','Auth','SavedAt','Active']);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.userId && data[i][3] === body.endpoint) {
      sh.getRange(i+1,1,1,8).setValues([[body.userId,body.name||'',body.email||'',body.endpoint,body.p256dh||'',body.auth||'',body.savedAt||new Date().toISOString(),true]]);
      return { success: true, updated: true };
    }
  }
  sh.appendRow([body.userId,body.name||'',body.email||'',body.endpoint,body.p256dh||'',body.auth||'',body.savedAt||new Date().toISOString(),true]);
  return { success: true, created: true };
}

function removePushSubscription(body) {
  var sh = getSheet(PUSH_SUBS_SHEET);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.userId && data[i][3] === body.endpoint) {
      sh.getRange(i+1, 8).setValue(false);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found.' };
}

function getAllActiveSubscriptions() {
  var sh = getSheet(PUSH_SUBS_SHEET);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).filter(function(r) { return r[7]===true||r[7]==='TRUE'; })
    .map(function(r) { return { userId:r[0],name:r[1],email:r[2],endpoint:r[3],p256dh:r[4],auth:r[5] }; });
}

// ── DAILY SENDER (runs at 6 AM via trigger) ───────────────────────
function sendDailyPushNotifications() {
  if (FIREBASE_PROJECT_ID === 'fitflow-pro-5c13f' ||
      SERVICE_ACCOUNT_JSON === '{"type":"service_account","project_id":"fitflow-pro-5c13f","private_key_id":"bd5db792820ff659acb4ad71f7554c01e522b2ec","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDzihsc70tqfMZY\nYTbvu3z3+W9yo4lh8hRFQ9ssQCJfXaM9xL44jSV317JkPjaEmK3XDumLwp8qgK56\ngTSwjBlM00IqLzuRlvwBpWClFdVosx6pessWFMLjmqUbS1At5zx4agAo7QRDaCs+\n6nDRRLTFRadnZ+Yys4QorbT/SpLzQ1jDwx/JSnJfdZvHQVlxOp673eeys1VUJc0S\n0zkkb2hN1i2tVyw7H9SlpSV6rs7Ojd6OMO93SL+xPBAobKFiIgWKLfurAWMml+Tx\nIweFJ8V9kQgK5YDfVRbOdM9v4oqZks8o7vDh8ZqVanToTZ6+mZs0nbZoCR9HYtfJ\nGTyHblJ9AgMBAAECggEAEKuptvWUtz2YHdPLvPsbxGVX5mRA4so9bnoFCPamk69s\ncu2NKtWolKyYZWm9IB72ZAlSiHKs+VhqeRrFO/eJwiXs5R0rafLIndE6TW/yQN2P\n/KsZ4ealFODl/+QMIT7vTKZ5i9Og7in1hIlA6eZBgdvGfYV8bwiK7vY9tJhKzlQc\nkodcIgskjOOSY6SN6xPWeU34mYEKRmXmJCoa26/1Sh+WpCoUS3Ljb7QqHCnh27Li\nzru8VPf2m02zJnTksvFPCdBROinaOdsoGW8yNHSud7q786vsprcP3NMWYx7/RQDX\np9A+p4gPbx5r/SL7mg8sSAhs4Pfw2yAdkLTsCYo+UQKBgQD6IX9ki/AwSiFYrsTL\n0qfVGNioMhzoHaMMgOrj92NLsJXGzxIxYG2SmwCQ6IcjKiZ5816VHHNwjP3njzSg\nLpgNufctsWPyGZR1F39sXqE1s2SH4z1/lVH8Wh+PEIYkgOr46fyM+2fwA3s0qgPc\nFAPho0PZWvBPEsM1Cxp5DrMdUQKBgQD5QQPJAec7lx9C0mT7UfBi3Qt7sEu4vNtC\nJIv3ZDFEdJvlUy8OC7DVSLNSx5P+WpSlPR9loLnp2X5TlC4ltDiNFHBwMuAkn6eD\nDCYbSqeMwY9I4NJJTDJs1HtDkNak0hVIsiOT4apaOd81ncY9Wr++W+lqnNTDa0xw\nEtGdnZunbQKBgExzdpuFxhkMX1rauB3QOioA2R+3iWxMuqw0rxaUY44b3/uPCPF8\nlqELrUWdPMi7tlzpzMvokUQiY+ylsaEP/LudTnZx1KmHtf9/+htmZQGj3iNGimJ3\ngkKOTT0OAOIhYTBJXD6/DMqoVb0IBfv7RiBuJWvGxtJ0WqPYy/OaUZaxAoGAAKOS\nBuniVdzFT76KU7qaCybV6LNC/m49gaXmVfQDzFEgNS5JaJfPFDzjeMraLkS9LM9D\nTVdkIp1UHZK7q40SuAndX+xBdtaR71wQnPFMDKhSXbV11IpFdtH0nu+4HSQMuer6\n/F4Pubt8Pv7wiye4ZhyGNKfCQ936jC8AKo9E3uECgYA369svesWCN8/Fb+tamiTy\n+vNAjHVfo2yX8IvDStXMb69aJ55qUWGVRdXMLrOhaup2VvYwpe3OegV1lFjvy+yd\nNiPx6Y5PEUgrB88HgExMBsBqW19G6Iglt/g08Aymfct4pW7TJJH1KcYgxALJY7F9\nX92nsYeKW7pANjjCwQtZyQ==\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@fitflow-pro-5c13f.iam.gserviceaccount.com","client_id":"109773573307538782514","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40fitflow-pro-5c13f.iam.gserviceaccount.com","universe_domain":"googleapis.com"}') {
    Logger.log('Firebase not configured. Add PROJECT_ID and SERVICE_ACCOUNT_JSON.'); return;
  }
  var subs = getAllActiveSubscriptions();
  if (!subs.length) { Logger.log('No subscribers.'); return; }
  var msg = getTodaysMessage();
  var success = 0, fail = 0, expired = [];
  subs.forEach(function(sub) {
    var result = sendWebPush(sub, msg);
    if (result.success) { success++; }
    else { fail++; if (result.expired) expired.push(sub.endpoint); }
  });
  if (expired.length) cleanupExpired(expired);
  Logger.log('Push sent: ' + success + ' ok, ' + fail + ' failed.');
}

// ── GET OAUTH2 ACCESS TOKEN from Service Account ─────────────────
function getAccessToken() {
  var sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  var now = Math.floor(Date.now() / 1000);

  // Build JWT header + claim
  var header  = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claim   = Utilities.base64EncodeWebSafe(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  var toSign    = header + '.' + claim;
  var signature = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(toSign, sa.private_key)
  );
  var jwt = toSign + '.' + signature;

  // Exchange JWT for access token
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    contentType: 'application/x-www-form-urlencoded',
    payload: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Failed to get access token: ' + res.getContentText());
  }
  return JSON.parse(res.getContentText()).access_token;
}

// ── SEND PUSH VIA FCM v1 API ──────────────────────────────────────
function sendWebPush(sub, msg) {
  try {
    var token = getAccessToken();

    // FCM v1 endpoint
    var url = 'https://fcm.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/messages:send';

    var message = {
      message: {
        webpush: {
          notification: {
            title:    msg.title,
            body:     msg.body,
            tag:      'fitflow-daily',
            renotify: true,
            vibrate:  [200, 100, 200],
            actions: [
              { action: 'open',    title: "Let's Go! 💪" },
              { action: 'dismiss', title: 'Later' },
            ],
          },
          fcm_options: { link: '/' },
        },
        // Web Push subscription token
        token: sub.fcmToken || sub.endpoint,
      }
    };

    // For raw web push subscriptions (non-FCM tokens), use webpush protocol
    if (!sub.fcmToken) {
      // Use the endpoint directly as the target
      message.message.webpush.headers = {
        'Urgency': 'normal',
        'TTL':     '86400',
      };
      delete message.message.token;
      message.message.raw_data = sub.endpoint;
    }

    var res = UrlFetchApp.fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json',
      },
      payload:            JSON.stringify(message),
      muteHttpExceptions: true,
    });

    var code = res.getResponseCode();
    var body = '';
    try { body = JSON.parse(res.getContentText()); } catch(e) { body = res.getContentText(); }

    if (code === 200) return { success: true };
    if (code === 404 || code === 410) return { success: false, expired: true, error: 'Endpoint expired' };
    return { success: false, error: 'HTTP ' + code + ': ' + JSON.stringify(body) };

  } catch(e) {
    return { success: false, error: e.message };
  }
}

function cleanupExpired(endpoints) {
  var sh = getSheet(PUSH_SUBS_SHEET), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (endpoints.indexOf(data[i][3]) > -1) sh.getRange(i+1,8).setValue(false);
  }
}

// ── TRIGGER MANAGEMENT ────────────────────────────────────────────
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyPushNotifications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyPushNotifications').timeBased().everyDays(1).atHour(6).create();
  SpreadsheetApp.getUi().alert('✅ Daily 6 AM push trigger created!\n\nTo test immediately: run testPushNotification()\nTo change timezone: File → Settings → Time zone');
}

function deleteDailyTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction()==='sendDailyPushNotifications') { ScriptApp.deleteTrigger(t); n++; }
  });
  SpreadsheetApp.getUi().alert('Deleted ' + n + ' trigger(s).');
}

function testPushNotification() {
  // Config check
  if (FIREBASE_PROJECT_ID === 'fitflow-pro-5c13f') {
    SpreadsheetApp.getUi().alert('❌ Setup not complete!\n\nSteps to complete:\n1. Set FIREBASE_PROJECT_ID (found in Firebase Console → Project Settings → General)\n2. Set SERVICE_ACCOUNT_JSON (Firebase Console → Project Settings → Service Accounts → Generate new private key)');
    return;
  }
  var subs = getAllActiveSubscriptions();
  if (!subs.length) {
    SpreadsheetApp.getUi().alert('No subscribers yet.\n\nAsk a user to:\n1. Open the app on Android\n2. Login → tap "Enable 🔔" on the banner\n3. Allow notifications when prompted\n\nThen try this test again.');
    return;
  }
  Logger.log('Testing push to: ' + subs[0].email);
  var result = sendWebPush(subs[0], {
    title: '🧪 FitFlow Test!',
    body:  'Push notifications are working! 🎉 You will get daily workout reminders at 6 AM.'
  });
  SpreadsheetApp.getUi().alert(
    result.success
      ? '✅ Test push sent to ' + subs[0].email + '!\nCheck your phone — notification should appear within seconds.'
      : '❌ Push failed: ' + result.error + '\n\nCheck the Logs (View → Logs) for details.'
  );
}
