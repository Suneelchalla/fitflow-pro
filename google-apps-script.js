// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Apps Script Backend v2
// 
// SETUP STEPS:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script → paste this entire file
// 3. Run setupSheets() once (first time only)
// 4. Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the Web App URL → paste in FitFlow Admin Panel
// ════════════════════════════════════════════════════════════════

const SHEETS = {
  USERS:      'Users',
  LOGS:       'CompletionLog',
  RUN_LOGS:   'RunningLog',
  QUOTES:     'Quotes',
  CONTENT:    'Content',
  FEEDBACK:   'UserFeedback',
};

// Column indexes for Users sheet (0-based)
const COL = {
  ID:              0,
  NAME:            1,
  EMAIL:           2,
  PASSWORD:        3,
  TEMP_PASSWORD:   4,
  IS_FIRST_LOGIN:  5,
  ROLE:            6,
  STATUS:          7,
  CREATED_DATE:    8,
  CREATED_BY:      9,
  LAST_LOGIN:      10,
};

// ── SHEET HELPER ─────────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  return sh;
}

function sheetToObjects(sh) {
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ── CORS OUTPUT ───────────────────────────────────────────────────
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
        result = { success: true, message: 'FitFlow Pro API v2 online!', timestamp: new Date().toISOString() };
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
      case 'createUser':
        result = createUser(body);
        break;
      case 'changePassword':
        result = changePassword(body);
        break;
      case 'updateUserStatus':
        result = updateUserStatus(body);
        break;
      case 'logCompletion':
        result = logCompletion(body);
        break;
      case 'logRun':
        result = logRun(body);
        break;
      case 'saveContent':
        result = saveContent(body);
        break;
      case 'submitFeedback':
        result = submitFeedback(body);
        break;
      case 'deleteUser':
        result = deleteUser(body);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return jsonOut(result);
}

// ════════════════════════════════════════════════════════════════
// AUTH FUNCTIONS
// ════════════════════════════════════════════════════════════════

function handleLogin(email, password) {
  if (!email || !password) return { success: false, error: 'Email and password required.' };

  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = (row[COL.EMAIL] || '').toString().toLowerCase().trim();

    if (rowEmail !== email.toLowerCase().trim()) continue;

    // Check status
    if (row[COL.STATUS] === 'INACTIVE') {
      return { success: false, error: 'Your account has been deactivated. Contact admin.' };
    }

    const storedPassword = (row[COL.PASSWORD] || '').toString();
    const tempPassword   = (row[COL.TEMP_PASSWORD] || '').toString();
    const isFirstLogin   = row[COL.IS_FIRST_LOGIN] === true || row[COL.IS_FIRST_LOGIN] === 'TRUE';

    // Check password match (against current password OR temp password if first login)
    const passwordMatch = storedPassword === password || (isFirstLogin && tempPassword === password);

    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Update last login timestamp
    sh.getRange(i + 1, COL.LAST_LOGIN + 1).setValue(new Date().toISOString());

    const user = {
      id:           row[COL.ID],
      name:         row[COL.NAME],
      email:        row[COL.EMAIL],
      role:         row[COL.ROLE],
      status:       row[COL.STATUS],
      isFirstLogin: isFirstLogin,
    };

    return { success: true, user };
  }

  return { success: false, error: 'Invalid email or password.' };
}

function changePassword(body) {
  const { userId, newPassword } = body;
  if (!userId || !newPassword) return { success: false, error: 'userId and newPassword required.' };
  if (newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.ID] == userId) {
      sh.getRange(i + 1, COL.PASSWORD + 1).setValue(newPassword);       // set new password
      sh.getRange(i + 1, COL.TEMP_PASSWORD + 1).setValue('');           // clear temp password
      sh.getRange(i + 1, COL.IS_FIRST_LOGIN + 1).setValue(false);       // no longer first login
      return { success: true, message: 'Password updated successfully.' };
    }
  }

  return { success: false, error: 'User not found.' };
}

// ════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════

function getAllUsers() {
  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];

  return data.slice(1).map(row => ({
    id:           row[COL.ID],
    name:         row[COL.NAME],
    email:        row[COL.EMAIL],
    role:         row[COL.ROLE],
    status:       row[COL.STATUS],
    isFirstLogin: row[COL.IS_FIRST_LOGIN] === true || row[COL.IS_FIRST_LOGIN] === 'TRUE',
    createdDate:  row[COL.CREATED_DATE],
    createdBy:    row[COL.CREATED_BY],
    lastLogin:    row[COL.LAST_LOGIN],
  }));
}

function createUser(body) {
  const { name, email, tempPassword, role, createdBy } = body;
  if (!name || !email || !tempPassword) {
    return { success: false, error: 'name, email, and tempPassword are required.' };
  }

  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  // Check duplicate email
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.EMAIL] || '').toString().toLowerCase() === email.toLowerCase()) {
      return { success: false, error: 'A user with this email already exists.' };
    }
  }

  const id = 'u_' + Date.now();
  const now = new Date().toISOString().split('T')[0];

  // Row order must match COL indexes
  const newRow = [];
  newRow[COL.ID]             = id;
  newRow[COL.NAME]           = name;
  newRow[COL.EMAIL]          = email.toLowerCase().trim();
  newRow[COL.PASSWORD]       = '';           // empty until user sets own password
  newRow[COL.TEMP_PASSWORD]  = tempPassword;
  newRow[COL.IS_FIRST_LOGIN] = true;
  newRow[COL.ROLE]           = role || 'USER';
  newRow[COL.STATUS]         = 'ACTIVE';
  newRow[COL.CREATED_DATE]   = now;
  newRow[COL.CREATED_BY]     = createdBy || 'Admin';
  newRow[COL.LAST_LOGIN]     = '';

  sh.appendRow(newRow);
  return { success: true, userId: id, message: 'User created successfully.' };
}

function updateUserStatus(body) {
  const { userId, status } = body;
  if (!userId || !status) return { success: false, error: 'userId and status required.' };

  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.ID] == userId) {
      sh.getRange(i + 1, COL.STATUS + 1).setValue(status);
      return { success: true };
    }
  }
  return { success: false, error: 'User not found.' };
}

function deleteUser(body) {
  const { userId } = body;
  if (!userId) return { success: false, error: 'userId required.' };

  const sh = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.ID] == userId) {
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
  sh.appendRow([
    'log_' + Date.now(),
    body.userId, body.email || '',
    body.module, body.day, body.date,
    new Date().toISOString()
  ]);
  return { success: true };
}

function getUserLogs(userId) {
  const sh = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(r => r[1] == userId)
    .map(r => ({ id:r[0], userId:r[1], email:r[2], module:r[3], day:r[4], date:r[5], timestamp:r[6] }));
}

function logRun(body) {
  const sh = getSheet(SHEETS.RUN_LOGS);
  ensureHeaders(sh, ['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp']);
  sh.appendRow([
    'run_' + Date.now(),
    body.userId, body.email || '',
    body.date, body.distance, body.duration,
    body.pace, body.planType || 'Free Run',
    new Date().toISOString()
  ]);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
// CONTENT (Admin edits hydration/diet per module)
// ════════════════════════════════════════════════════════════════

function getContent(key) {
  const sh = getSheet(SHEETS.CONTENT);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      try { return JSON.parse(data[i][1]); } catch { return null; }
    }
  }
  return null;
}

function saveContent(body) {
  const { key, value } = body;
  if (!key) return { success: false, error: 'key required.' };
  const sh = getSheet(SHEETS.CONTENT);
  ensureHeaders(sh, ['Key','Value','UpdatedAt']);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[JSON.stringify(value), new Date().toISOString()]]);
      return { success: true };
    }
  }
  sh.appendRow([key, JSON.stringify(value), new Date().toISOString()]);
  return { success: true };
}

// ════════════════════════════════════════════════════════════════
// SETUP — Run this ONCE after pasting this script
// ════════════════════════════════════════════════════════════════

function setupSheets() {
  // Users sheet
  const userSh = getSheet(SHEETS.USERS);
  if (userSh.getLastRow() === 0) {
    const headers = ['UserID','Name','Email','Password','TempPassword','IsFirstLogin','Role','Status','CreatedDate','CreatedBy','LastLogin'];
    userSh.appendRow(headers);
    styleHeader(userSh, headers.length);

    // Seed default admin (pre-set password, not first login)
    userSh.appendRow(['u_admin','Admin User','admin@fitflow.com','admin123','','FALSE','ADMIN','ACTIVE',new Date().toISOString().split('T')[0],'System','']);
    // Seed demo user (temp password, first login forced)
    userSh.appendRow(['u_demo','Demo User','user@fitflow.com','','user123','TRUE','USER','ACTIVE',new Date().toISOString().split('T')[0],'Admin','']);
  }

  // Logs sheet
  const logSh = getSheet(SHEETS.LOGS);
  if (logSh.getLastRow() === 0) {
    logSh.appendRow(['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
    styleHeader(logSh, 7);
  }

  // Run logs sheet
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
    '✅ FitFlow Pro Setup Complete!\n\n' +
    'Sheets created: Users, CompletionLog, RunningLog, Content\n\n' +
    'Default accounts seeded:\n' +
    '  Admin: admin@fitflow.com / admin123\n' +
    '  Demo User: user@fitflow.com / user123 (temp — must change on first login)\n\n' +
    'Next: Deploy → New Deployment → Web App\n' +
    'Execute as: Me | Who has access: Anyone\n' +
    'Copy the URL and paste it in FitFlow Admin Panel → Sheets Config'
  );
}

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
