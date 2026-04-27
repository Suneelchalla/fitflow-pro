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
  USERS:    'Users',
  LOGS:     'CompletionLog',
  RUN_LOGS: 'RunningLog',
  CONTENT:  'Content',
  FEEDBACK: 'UserFeedback',
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
      case 'deleteUser':       result = deleteUser(body);       break;
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

  SpreadsheetApp.getUi().alert(
    '✅ All Sheets Ready!\n\n' +
    'Sheets created/verified:\n' +
    '  ✓ Users\n' +
    '  ✓ CompletionLog\n' +
    '  ✓ RunningLog\n' +
    '  ✓ Content\n' +
    '  ✓ UserFeedback\n\n' +
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

  // Skip row 1 (headers)
  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const rowEmail = (row[COL.EMAIL] || '').toString().toLowerCase().trim();

    if (rowEmail !== email.toLowerCase().trim()) continue;

    if ((row[COL.STATUS] || '').toString().toUpperCase() === 'INACTIVE') {
      return { success: false, error: 'Account deactivated. Contact admin.' };
    }

    const storedPass  = (row[COL.PASSWORD]      || '').toString().trim();
    const tempPass    = (row[COL.TEMP_PASSWORD]  || '').toString().trim();
    const isFirstLogin = row[COL.IS_FIRST_LOGIN] === true
                      || row[COL.IS_FIRST_LOGIN] === 'TRUE'
                      || row[COL.IS_FIRST_LOGIN] === 'true';

    const match = storedPass === password.trim()
               || (isFirstLogin && tempPass === password.trim());

    if (!match) return { success: false, error: 'Invalid email or password.' };

    // Update last login
    sh.getRange(i + 1, COL.LAST_LOGIN + 1).setValue(new Date().toISOString());

    return {
      success: true,
      user: {
        id:           (row[COL.ID]   || '').toString(),
        name:         (row[COL.NAME] || '').toString(),
        email:        (row[COL.EMAIL]|| '').toString(),
        role:         (row[COL.ROLE] || 'USER').toString().toUpperCase(),
        status:       (row[COL.STATUS]|| 'ACTIVE').toString(),
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

  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString() === userId.toString()) {
      sh.getRange(i + 1, COL.STATUS + 1).setValue(status);
      return { success: true };
    }
  }
  return { success: false, error: 'User not found.' };
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
