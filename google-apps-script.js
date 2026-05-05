// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Apps Script Backend v7
// Complete file — paste ALL contents into Apps Script editor
// ════════════════════════════════════════════════════════════════
// v7 changes vs v6:
// • getAllUsers returns isGoogleUser + authType
// • handleLogin returns isGoogleUser + authType
// • googleLogin returns isGoogleUser + authType
// ════════════════════════════════════════════════════════════════


// LOCAL date helper (uses script timezone Asia/Calcutta, not UTC)
function _ymdLocal(d) {
  return Utilities.formatDate(d || new Date(), Session.getScriptTimeZone() || 'Asia/Calcutta', 'yyyy-MM-dd');
}

const SHEETS = {
  USERS:           'Users',
  LOGS:            'CompletionLog',
  RUN_LOGS:        'RunningLog',
  HYDRATION_LOGS:  'HydrationLog',
  CONTENT:         'Content',
  FEEDBACK:        'UserFeedback',
  CUSTOM_WORKOUTS: 'CustomWorkouts',
  PUSH_SUBS:       'PushSubscriptions',
  ONBOARDING:      'UserOnboarding',
};

const COL = {
  ID: 0, NAME: 1, EMAIL: 2, PASSWORD: 3, TEMP_PASSWORD: 4,
  IS_FIRST_LOGIN: 5, ROLE: 6, STATUS: 7,
  CREATED_DATE: 8, CREATED_BY: 9, LAST_LOGIN: 10,
};

const RCOL = {
  LOG_ID: 0, USER_ID: 1, USER_EMAIL: 2, DATE: 3,
  DISTANCE: 4, DURATION: 5, PACE: 6, PLAN_TYPE: 7,
  TIMESTAMP: 8, ACTIVITY_TYPE: 9, COORDS_JSON: 10,
};

// ── DATE HELPERS ──────────────────────────────────────────────────
function toYMD(v) {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    const y = v.getFullYear();
    const m = ('0' + (v.getMonth() + 1)).slice(-2);
    const d = ('0' + v.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  const s = v.toString();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const yy = d.getFullYear();
  const mm = ('0' + (d.getMonth() + 1)).slice(-2);
  const dd = ('0' + d.getDate()).slice(-2);
  return yy + '-' + mm + '-' + dd;
}

function toISOStr(v) {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.toISOString();
  }
  return v.toString();
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doGET ─────────────────────────────────────────────────────────
function doGet(e) {
  const p = e.parameter || {};
  let result;
  try {
    switch (p.action) {
      case 'ping':
        result = { success:true, message:'FitFlow Pro API v7 online!', time:new Date().toISOString() };
        break;
      case 'login':
        if (p.pwcodes) {
          const pw = p.pwcodes.split('-').map(c => String.fromCharCode(parseInt(c))).join('');
          result = handleLogin(p.email, pw);
        } else {
          result = handleLogin(p.email, p.password);
        }
        break;
      case 'testConnection':       result = { success:true, message:'FitFlow Pro backend connected!' };  break;
      case 'getAllUsers':           result = { success:true, users:getAllUsers() };                       break;
      case 'getUserLogs':          result = { success:true, logs:getUserLogs(p.userId) };                break;
      case 'getLogs':              result = { success:true, logs:getUserLogs(p.userId) };                break;
      case 'getAllLogs':            result = { success:true, logs:getAllLogs() };                         break;
      case 'getUserRunLogs':       result = { success:true, logs:getUserRunLogs(p.userId) };             break;
      case 'getRunLogs':           result = { success:true, logs:getUserRunLogs(p.userId) };             break;
      case 'getAllRunLogs':         result = { success:true, logs:getAllRunLogs() };                      break;
      case 'deleteRunLog':         result = deleteRunLog(p.logId, p.userId);                             break;
      case 'getActivePlan':        result = getActivePlan(p.userId);                                     break;
      case 'getPlanProgress':      result = getPlanProgress(p.userId, p.planKey);                        break;
      case 'getContent':           result = { success:true, content:getContent(p.key) };                break;
      case 'getAllContent':         result = getAllContent();                                             break;
      case 'getFeedback':          result = getFeedback();                                               break;
      case 'getCustomWorkouts':    result = getCustomWorkouts(p.userId);                                 break;
      case 'getAllCustomWorkouts':  result = getAllCustomWorkouts();                                      break;
      case 'getHydrationLogs':     result = getHydrationLogs(p.userId);                                 break;
      case 'getAnnouncement':      result = { success:true, announcement:getAnnouncement() };            break;
      case 'getOnboarding':        result = getOnboarding(p.userId);                                       break;
      case 'getAllOnboarding':     result = { success:true, onboardings:getAllOnboarding() };              break;
      case 'getAdminPushLog':      result = getAdminPushLog();                                             break;
      case 'getSubscribedDevices': result = getSubscribedDevices();                                        break;
      default:                     result = { success:false, error:'Unknown action: ' + p.action };
    }
  } catch(err) { result = { success:false, error:err.message }; }
  return jsonOut(result);
}

// ── doPOST ────────────────────────────────────────────────────────
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch {}
  let result;
  try {
    switch (body.action) {
      case 'createUser':             result = createUser(body);                           break;
      case 'login':                  result = handleLogin(body.email, body.password);     break;
      case 'googleLogin':            result = googleLogin(body);                          break;
      case 'changePassword':         result = changePassword(body);                       break;
      case 'setTempPassword':        result = setTempPassword(body);                      break;
      case 'updateUserStatus':       result = updateUserStatus(body);                     break;
      case 'toggleUserStatus':       result = updateUserStatus(body);                     break;
      case 'deleteUser':             result = deleteUser(body);                           break;
      case 'logCompletion':          result = logCompletion(body);                        break;
      case 'logRun':                 result = logRun(body);                               break;
      case 'deleteRunLog':           result = deleteRunLog(body.logId, body.userId);      break;
      case 'savePlanRegistration':   result = savePlanRegistration(body);                 break;
      case 'savePlanDayCompletion':  result = savePlanDayCompletion(body);                break;
      case 'clearActivePlan':        result = clearActivePlan(body);                      break;
      case 'saveContent':            result = saveContent(body);                          break;
      case 'submitFeedback':         result = submitFeedback(body);                       break;
      case 'saveCustomWorkout':      result = saveCustomWorkout(body);                    break;
      case 'deleteCustomWorkout':    result = deleteCustomWorkout(body);                  break;
      case 'savePushSubscription':   result = savePushSubscription(body);                 break;
      case 'saveOnboarding':         result = saveOnboarding(body);                       break;
      case 'sendAdminPush':          result = sendCustomPush(body);                       break;
      case 'removePushSubscription': result = removePushSubscription(body);               break;
      case 'saveHydrationLog':       result = saveHydrationLog(body);                     break;
      case 'logHydration':           result = saveHydrationLog(body);                     break;
      case 'saveAnnouncement':       result = saveAnnouncement(body);                     break;
      case 'syncUserData':           result = syncUserData(body);                         break;
      default: result = { success:false, error:'Unknown action: ' + body.action };
    }
  } catch(err) { result = { success:false, error:err.message }; }
  return jsonOut(result);
}

// ════════════════════════════════════════════════════════════════
// SETUP & MIGRATION
// ════════════════════════════════════════════════════════════════
function fixExistingSheet() {
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  const firstCell = (data[0][0] || '').toString().trim().toLowerCase();
  const isHeader  = firstCell === 'userid' || firstCell === 'id';

  if (!isHeader) {
    sh.insertRowBefore(1);
    const headers = ['UserID','Name','Email','Password','TempPassword','IsFirstLogin','Role','Status','CreatedDate','CreatedBy','LastLogin'];
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    styleHeader(sh, headers.length);
    SpreadsheetApp.flush();
  }

  const allData = sh.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row[COL.ROLE]   || !row[COL.ROLE].toString().trim())   sh.getRange(i+1,COL.ROLE+1).setValue('USER');
    if (!row[COL.STATUS] || !row[COL.STATUS].toString().trim()) sh.getRange(i+1,COL.STATUS+1).setValue('ACTIVE');
    if (row[COL.IS_FIRST_LOGIN]===''||row[COL.IS_FIRST_LOGIN]===null) {
      sh.getRange(i+1,COL.IS_FIRST_LOGIN+1).setValue(!row[COL.PASSWORD]);
    }
    if (!row[COL.CREATED_DATE]||!row[COL.CREATED_DATE].toString().trim()) {
      sh.getRange(i+1,COL.CREATED_DATE+1).setValue(_ymdLocal());
    }
  }

  const fresh    = sh.getDataRange().getValues();
  const hasAdmin = fresh.slice(1).some(r => (r[COL.ROLE]||'').toString().toUpperCase()==='ADMIN');
  if (!hasAdmin) {
    sh.appendRow(['u_admin','Admin User','admin@fitflow.com','admin123','',false,'ADMIN','ACTIVE',
      _ymdLocal(),'System','']);
  }
  SpreadsheetApp.flush();
  Logger.log('✅ Sheet fixed! Now run setupSheets() and migrateRunningLog(), then redeploy.');
}


// ════════════════════════════════════════════════════════════════
// CLEANUP — Remove duplicate completion logs
// Run this ONCE from Apps Script editor: select function → run
// ════════════════════════════════════════════════════════════════
function cleanupDuplicateLogs() {
  const sh = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No logs to clean.');
    return;
  }
  const header = data[0];
  const seen = {};
  const keepRows = [header];
  let duplicates = 0;
  let dateFixed = 0;
  for (let i = 1; i < data.length; i++) {
    const r = data[i].slice(); // copy
    // Re-derive date from timestamp if available (fixes UTC bug)
    if (r[6]) {
      const tsDate = new Date(r[6]);
      if (!isNaN(tsDate.getTime())) {
        const localDate = tsDate.getFullYear() + '-' +
          ('0' + (tsDate.getMonth() + 1)).slice(-2) + '-' +
          ('0' + tsDate.getDate()).slice(-2);
        const oldDate = toYMD(r[5]);
        if (oldDate !== localDate) {
          r[5] = localDate;
          dateFixed++;
        }
      }
    }
    // Dedup by userId+module+date (NO day field)
    const key = (r[1]||'') + '|' + (r[3]||'') + '|' + toYMD(r[5]);
    if (seen[key]) {
      duplicates++;
    } else {
      seen[key] = true;
      keepRows.push(r);
    }
  }
  if (duplicates === 0 && dateFixed === 0) {
    Logger.log('No duplicates or date issues found. Already clean.');
    return;
  }
  sh.clearContents();
  sh.getRange(1, 1, keepRows.length, header.length).setValues(keepRows);
  SpreadsheetApp.flush();
  Logger.log('✅ Removed ' + duplicates + ' duplicate(s) and fixed ' + dateFixed + ' date(s). ' + (keepRows.length - 1) + ' unique entries remain.');
}

function cleanupDuplicateRunLogs() {
  const sh = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No run logs to clean.');
    return;
  }
  const header = data[0];
  const seenIds = {};
  const seenNear = {};
  const keepRows = [header];
  let duplicates = 0;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const id = (r[0]||'').toString();
    if (id && seenIds[id]) { duplicates++; continue; }
    // Near-identical: user + date + distance(±0.01) + duration(±5s)
    const userId = (r[1]||'').toString();
    const date   = toYMD(r[3]);
    const dist   = parseFloat(r[4])||0;
    const dur    = parseInt(r[5])||0;
    const nearKey = userId + '|' + date + '|' + dist.toFixed(2) + '|' + Math.round(dur/5);
    if (seenNear[nearKey]) { duplicates++; continue; }
    if (id) seenIds[id] = true;
    seenNear[nearKey] = true;
    keepRows.push(r);
  }
  if (duplicates === 0) {
    Logger.log('No duplicates found in RunningLog. Already clean.');
    return;
  }
  sh.clearContents();
  sh.getRange(1, 1, keepRows.length, header.length).setValues(keepRows);
  SpreadsheetApp.flush();
  Logger.log('✅ Removed ' + duplicates + ' duplicate run log(s). ' + (keepRows.length - 1) + ' unique entries remain.');
}

function setupSheets() {
  const userSh = getSheet(SHEETS.USERS);
  if (userSh.getLastRow()===0) {
    userSh.appendRow(['UserID','Name','Email','Password','TempPassword','IsFirstLogin','Role','Status','CreatedDate','CreatedBy','LastLogin']);
    styleHeader(userSh,11);
    userSh.appendRow(['u_admin','Admin User','admin@fitflow.com','admin123','',false,'ADMIN','ACTIVE',
      _ymdLocal(),'System','']);
  }
  _ensureSheet(SHEETS.LOGS,           ['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
  _ensureSheet(SHEETS.RUN_LOGS,       ['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp','ActivityType','CoordsJSON','Title','Description']);
  _ensureSheet(SHEETS.HYDRATION_LOGS, ['LogID','UserID','UserEmail','Date','GlassesTarget','GlassesDone','Timestamp']);
  _ensureSheet(SHEETS.CONTENT,        ['Key','Value','UpdatedAt']);
  _ensureSheet(SHEETS.FEEDBACK,       ['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp']);
  _ensureSheet(SHEETS.PUSH_SUBS,      ['UserID','Name','Email','Endpoint','P256DH','Auth','SavedAt','Active']);
  _ensureSheet(SHEETS.CUSTOM_WORKOUTS,['WorkoutID','UserID','UserEmail','Name','ExercisesJSON','CreatedDate','UpdatedDate','Active']);
  _ensureSheet('Announcements',       ['ID','Title','Message','StartDate','EndDate','CreatedBy','CreatedAt']);
  Logger.log('✅ All sheets ready!');
}

function _ensureSheet(name, headers) {
  const sh = getSheet(name);
  if (sh.getLastRow()===0) { sh.appendRow(headers); styleHeader(sh,headers.length); }
}

function migrateRunningLog() {
  const sh   = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  if (!data.length) { Logger.log('RunningLog is empty.'); return; }

  const header          = data[0].map(h => (h||'').toString().trim().toLowerCase());
  const hasActivityType = header.includes('activitytype');
  const hasCoordsJson   = header.includes('coordsjson');
  const hasTitle        = header.includes('title');
  const hasDescription  = header.includes('description');

  let colsAdded = 0;
  const addCol = (label, defaultVal) => {
    const nextCol = data[0].length + colsAdded + 1;
    sh.getRange(1, nextCol).setValue(label);
    sh.getRange(1, nextCol).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF');
    for (let i = 2; i <= sh.getLastRow(); i++) sh.getRange(i, nextCol).setValue(defaultVal);
    colsAdded++;
    Logger.log('Added ' + label + ' column');
  };

  if (!hasActivityType) addCol('ActivityType', 'run');
  if (!hasCoordsJson)   addCol('CoordsJSON',   '[]');
  if (!hasTitle)        addCol('Title',         '');
  if (!hasDescription)  addCol('Description',   '');

  if (colsAdded === 0) Logger.log('RunningLog already up to date.');
  SpreadsheetApp.flush();
  Logger.log('✅ Migration complete!');
}

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
function handleLogin(email, password) {
  if (!email||!password) return { success:false, error:'Email and password required.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if ((row[COL.EMAIL]||'').toString().toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    const status = (row[COL.STATUS]||'ACTIVE').toString().toUpperCase().trim();
    if (status==='INACTIVE') return { success:false, error:'Account deactivated. Contact admin.' };
    const storedPass = (row[COL.PASSWORD]||'').toString().trim();
    const tempPass   = (row[COL.TEMP_PASSWORD]||'').toString().trim();
    const entered    = (password||'').toString().trim();
    if (!(storedPass&&storedPass===entered) && !(tempPass&&tempPass===entered))
      return { success:false, error:'Invalid email or password.' };
    const firstLoginRaw = row[COL.IS_FIRST_LOGIN];
    const isFirstLogin  = firstLoginRaw===true||String(firstLoginRaw).toUpperCase().trim()==='TRUE';
    // Update LAST_LOGIN — wrap in try/catch so login never fails over write errors
    try {
      sh.getRange(i+1,COL.LAST_LOGIN+1).setValue(new Date());
      SpreadsheetApp.flush();
    } catch(e) {
      // Don't fail login just because we can't update last-login timestamp
      Logger.log('LAST_LOGIN update skipped: ' + e.message);
    }
    const userId      = (row[COL.ID]        ||'').toString();
    const createdBy   = (row[COL.CREATED_BY] ||'').toString().toLowerCase();
    const isGoogleUser = userId.startsWith('u_g_') || createdBy === 'google';
    return { success:true, user:{
      id:          userId,
      name:        (row[COL.NAME] ||'').toString(),
      email:       (row[COL.EMAIL]||'').toString(),
      role:        (row[COL.ROLE] ||'USER').toString().toUpperCase().trim(),
      status,
      isFirstLogin,
      isGoogleUser,
      authType: isGoogleUser ? 'google' : 'email',
    }};
  }
  return { success:false, error:'Invalid email or password.' };
}

function googleLogin(body) {
  const { email, name, googleId, picture } = body;
  if (!email) return { success:false, error:'Email required.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row       = data[i];
    const rowEmail  = (row[COL.EMAIL] ||'').toString().toLowerCase().trim();
    const rowStatus = (row[COL.STATUS]||'ACTIVE').toString().toUpperCase().trim();
    if (rowEmail !== email.toLowerCase().trim()) continue;
    if (rowStatus === 'INACTIVE') return { success:false, error:'Account deactivated. Contact admin.' };
    try {
      sh.getRange(i+1,COL.LAST_LOGIN+1).setValue(new Date());
      SpreadsheetApp.flush();
    } catch(e) {
      Logger.log('LAST_LOGIN update skipped: ' + e.message);
    }
    const userId    = (row[COL.ID]        ||'').toString();
    const createdBy = (row[COL.CREATED_BY] ||'').toString().toLowerCase();
    return { success:true, user:{
      id:           userId,
      name:         (row[COL.NAME]||'').toString(),
      email:        rowEmail,
      role:         (row[COL.ROLE]||'USER').toString().toUpperCase().trim(),
      status:       rowStatus,
      isFirstLogin: false,
      isGoogleUser: true,
      authType:     'google',
    }};
  }
  // New Google user — create account
  const newId = 'u_g_' + Date.now();
  const displayName = name || email.split('@')[0];
  sh.appendRow([newId, displayName, email.toLowerCase().trim(), '', '', false,
    'USER', 'ACTIVE', _ymdLocal(), 'Google', new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true, user:{
    id:newId, name:displayName, email:email.toLowerCase().trim(),
    role:'USER', status:'ACTIVE', isFirstLogin:false,
    isGoogleUser:true, authType:'google',
  }};
}

function changePassword(body) {
  const { userId, newPassword } = body;
  if (!userId||!newPassword) return { success:false, error:'userId and newPassword required.' };
  if (newPassword.length<6) return { success:false, error:'Password must be at least 6 characters.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString()===userId.toString()) {
      sh.getRange(i+1,COL.PASSWORD+1).setValue(newPassword);
      sh.getRange(i+1,COL.TEMP_PASSWORD+1).setValue('');
      sh.getRange(i+1,COL.IS_FIRST_LOGIN+1).setValue(false);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'User not found.' };
}

function setTempPassword(body) {
  const { userId, tempPassword } = body;
  if (!userId||!tempPassword) return { success:false, error:'userId and tempPassword required.' };
  if (tempPassword.length<6) return { success:false, error:'Temp password must be at least 6 characters.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString()===userId.toString()) {
      sh.getRange(i+1,COL.TEMP_PASSWORD+1).setValue(tempPassword);
      sh.getRange(i+1,COL.IS_FIRST_LOGIN+1).setValue(true);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'User not found.' };
}

// ════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════
function getAllUsers() {
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1).map(r => ({
    id:          (r[COL.ID]          ||'').toString(),
    name:        (r[COL.NAME]        ||'').toString(),
    email:       (r[COL.EMAIL]       ||'').toString(),
    role:        (r[COL.ROLE]        ||'USER').toString().toUpperCase(),
    status:      (r[COL.STATUS]      ||'ACTIVE').toString(),
    isFirstLogin: r[COL.IS_FIRST_LOGIN]===true||r[COL.IS_FIRST_LOGIN]==='TRUE'||r[COL.IS_FIRST_LOGIN]==='true',
    createdDate: (r[COL.CREATED_DATE]||'').toString(),
    createdBy:   (r[COL.CREATED_BY]  ||'').toString(),
    lastLogin:   (r[COL.LAST_LOGIN]  ||'').toString(),
    isGoogleUser: (r[COL.ID]||'').toString().startsWith('u_g_') ||
                  (r[COL.CREATED_BY]||'').toString().toLowerCase() === 'google',
    authType:    ((r[COL.ID]||'').toString().startsWith('u_g_') ||
                  (r[COL.CREATED_BY]||'').toString().toLowerCase() === 'google')
                 ? 'google' : 'email',
  }));
}

function createUser(body) {
  const { name, email, tempPassword, role, createdBy } = body;
  if (!name||!email||!tempPassword) return { success:false, error:'name, email, tempPassword required.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][COL.EMAIL]||'').toString().toLowerCase()===email.toLowerCase().trim())
      return { success:false, error:'A user with this email already exists.' };
  }
  const id = 'u_'+Date.now();
  sh.appendRow([id, name.trim(), email.toLowerCase().trim(), '', tempPassword, true,
    (role||'USER').toUpperCase(), 'ACTIVE', _ymdLocal(), createdBy||'Admin', '']);
  SpreadsheetApp.flush();
  return { success:true, userId:id };
}

function updateUserStatus(body) {
  const { userId, status } = body;
  if (!userId||!status) return { success:false, error:'userId and status required.' };
  const norm = status.toString().toUpperCase().trim();
  if (norm!=='ACTIVE'&&norm!=='INACTIVE') return { success:false, error:'Status must be ACTIVE or INACTIVE.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][COL.ID]||'').toString().trim()!==userId.toString().trim()) continue;
    if ((data[i][COL.ROLE]||'').toString().toUpperCase()==='ADMIN'&&norm==='INACTIVE')
      return { success:false, error:'Admin accounts cannot be disabled.' };
    sh.getRange(i+1,COL.STATUS+1).setValue(norm);
    SpreadsheetApp.flush();
    return { success:true, userId, newStatus:norm };
  }
  return { success:false, error:'User not found.' };
}

function deleteUser(body) {
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][COL.ID]||'').toString()===body.userId.toString()) {
      sh.deleteRow(i+1);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'User not found.' };
}

// ════════════════════════════════════════════════════════════════
// COMPLETION LOGS
// ════════════════════════════════════════════════════════════════
function logCompletion(body) {
  const sh = getSheet(SHEETS.LOGS);
  ensureHeaders(sh,['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
  // Dedupe: don't add if same userId + module + date already exists (NO day - causes false negatives)
  const data = sh.getDataRange().getValues();
  const userId = (body.userId||'').toString();
  const module = (body.module||'').toString();
  const day    = (body.day   ||'').toString();
  const date   = toYMD(body.date) || (body.date||'').toString();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][1]||'').toString() === userId &&
        (data[i][3]||'').toString() === module &&
        toYMD(data[i][5]) === date) {
      return { success:true, duplicate:true };
    }
  }
  sh.appendRow([
    'log_'+Date.now(),
    userId, body.email || '', module, day, date,
    new Date().toISOString(),
  ]);
  SpreadsheetApp.flush();
  return { success:true };
}

function getUserLogs(userId) {
  const sh   = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1)
    .filter(r => (r[1]||'').toString()===userId.toString())
    .map(r => ({ id:r[0], userId:r[1], email:r[2], module:r[3], day:r[4], date:r[5], timestamp:r[6] }));
}

function getAllLogs() {
  const sh   = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1).map(r => ({
    id:        (r[0]||'').toString(),
    userId:    (r[1]||'').toString(),
    email:     (r[2]||'').toString(),
    module:    (r[3]||'').toString(),
    day:       (r[4]||'').toString(),
    date:      toYMD(r[5]),
    timestamp: toISOStr(r[6]),
  }));
}

// ════════════════════════════════════════════════════════════════
// RUN LOGS
// ════════════════════════════════════════════════════════════════
function logRun(body) {
  const sh = getSheet(SHEETS.RUN_LOGS);
  ensureHeaders(sh,['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp','ActivityType','CoordsJSON','Title','Description']);
  // Dedupe: don't append if same LogID already exists (frontend retry safety)
  const data   = sh.getDataRange().getValues();
  const newId  = (body.id || ('run_'+Date.now())).toString();
  const userId = (body.userId||'').toString();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === newId) {
      return { success:true, duplicate:true };
    }
    // Also dedupe near-identical runs: same user + date + distance within 0.01km (covers double-clicks)
    if ((data[i][1]||'').toString() === userId &&
        toYMD(data[i][3]) === toYMD(body.date) &&
        Math.abs((parseFloat(data[i][4])||0) - (parseFloat(body.distance)||0)) < 0.01 &&
        Math.abs((parseInt(data[i][5])||0)   - (parseInt(body.duration)||0))   < 5) {
      return { success:true, duplicate:true };
    }
  }
  let coordsJson = '[]';
  if (Array.isArray(body.coords) && body.coords.length) {
    coordsJson = JSON.stringify(body.coords.map(c => ({ lat:c.lat, lon:c.lon })));
  }
  sh.appendRow([
    newId, userId, body.email || '', toYMD(body.date) || (body.date||''),
    body.distance     || 0,
    body.duration     || 0,
    body.pace         || 0,
    body.planType     || ('Free ' + (body.activityType||'Run').charAt(0).toUpperCase() + (body.activityType||'run').slice(1)),
    new Date().toISOString(),
    body.activityType || 'run',
    coordsJson,
    body.title        || '',
    body.description  || '',
  ]);
  SpreadsheetApp.flush();
  return { success:true };
}

function getUserRunLogs(userId) {
  const sh   = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  const header    = data[0].map(h => (h||'').toString().trim().toLowerCase());
  const actCol    = header.indexOf('activitytype');
  const coordsCol = header.indexOf('coordsjson');
  const titleCol  = header.indexOf('title');
  const descCol   = header.indexOf('description');
  return data.slice(1)
    .filter(r => (r[RCOL.USER_ID]||'').toString() === userId.toString())
    .map(r => {
      let coords = [];
      if (coordsCol >= 0 && r[coordsCol]) { try { coords = JSON.parse(r[coordsCol]); } catch {} }
      return {
        id:           (r[RCOL.LOG_ID]    ||'').toString(),
        userId:       (r[RCOL.USER_ID]   ||'').toString(),
        email:        (r[RCOL.USER_EMAIL]||'').toString(),
        date:         toYMD(r[RCOL.DATE]),
        distance:     parseFloat(r[RCOL.DISTANCE]) || 0,
        duration:     parseInt(r[RCOL.DURATION])   || 0,
        pace:         parseFloat(r[RCOL.PACE])     || 0,
        planType:     (r[RCOL.PLAN_TYPE] ||'Free Run').toString(),
        timestamp:    toISOStr(r[RCOL.TIMESTAMP]),
        activityType: actCol >= 0 ? (r[actCol]||'run').toString() : 'run',
        title:        titleCol >= 0 ? (r[titleCol]||'').toString() : '',
        description:  descCol  >= 0 ? (r[descCol] ||'').toString() : '',
        coords,
      };
    });
}

function getAllRunLogs() {
  const sh   = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  const header    = data[0].map(h => (h||'').toString().trim().toLowerCase());
  const actCol    = header.indexOf('activitytype');
  const coordsCol = header.indexOf('coordsjson');
  const titleCol  = header.indexOf('title');
  const descCol   = header.indexOf('description');
  return data.slice(1).map(r => {
    let coords = [];
    if (coordsCol >= 0 && r[coordsCol]) { try { coords = JSON.parse(r[coordsCol]); } catch {} }
    return {
      id:           (r[0]||'').toString(),
      userId:       (r[1]||'').toString(),
      email:        (r[2]||'').toString(),
      date:         toYMD(r[3]),
      distance:     parseFloat(r[4])||0,
      duration:     parseInt(r[5])||0,
      pace:         parseFloat(r[6])||0,
      planType:     (r[7]||'Free Run').toString(),
      timestamp:    toISOStr(r[8]),
      activityType: actCol >= 0 ? (r[actCol]||'run').toString() : 'run',
      title:        titleCol >= 0 ? (r[titleCol]||'').toString() : '',
      description:  descCol  >= 0 ? (r[descCol] ||'').toString() : '',
      coords,
    };
  });
}

function deleteRunLog(logId, userId) {
  if (!logId) return { success:false, error:'logId required.' };
  const sh   = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowLogId  = (data[i][0]||'').toString().trim();
    const rowUserId = (data[i][1]||'').toString().trim();
    if (rowLogId === logId.toString().trim()) {
      if (userId && rowUserId !== userId.toString().trim())
        return { success:false, error:'Unauthorized.' };
      sh.deleteRow(i+1);
      SpreadsheetApp.flush();
      return { success:true, deleted:logId };
    }
  }
  return { success:false, error:'Log not found.' };
}

// ════════════════════════════════════════════════════════════════
// CUSTOM WORKOUTS
// ════════════════════════════════════════════════════════════════
function getCustomWorkouts(userId) {
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet(SHEETS.CUSTOM_WORKOUTS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, workouts:[] };
  const workouts = data.slice(1)
    .filter(r => {
      const uid    = (r[1]||'').toString();
      const active = r[7];
      return uid === userId.toString() && (active===true||active==='TRUE'||active==='true');
    })
    .map(r => {
      let exercises = [];
      try { exercises = JSON.parse(r[4]||'[]'); } catch {}
      let meta = {};
      try { meta = JSON.parse(r[8]||'{}'); } catch {}
      return {
        id:          (r[0]||'').toString(),
        userId:      (r[1]||'').toString(),
        email:       (r[2]||'').toString(),
        name:        (r[3]||'').toString(),
        exercises,
        createdDate: (r[5]||'').toString(),
        updatedDate: (r[6]||'').toString(),
        category:    meta.category   || 'Strength',
        goal:        meta.goal       || 'General Fitness',
        difficulty:  meta.difficulty || 'Intermediate',
        days:        meta.days       || [],
        notes:       meta.notes      || '',
      };
    });
  return { success:true, workouts };
}

function getAllCustomWorkouts() {
  const sh   = getSheet(SHEETS.CUSTOM_WORKOUTS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, workouts:[] };
  const workouts = data.slice(1)
    .filter(r => {
      const active = r[7];
      return active===true||active==='TRUE'||active==='true';
    })
    .map(r => {
      let exercises = [];
      try { exercises = JSON.parse(r[4]||'[]'); } catch {}
      let meta = {};
      try { meta = JSON.parse(r[8]||'{}'); } catch {}
      return {
        id:          (r[0]||'').toString(),
        userId:      (r[1]||'').toString(),
        email:       (r[2]||'').toString(),
        name:        (r[3]||'').toString(),
        exercises,
        createdDate: (r[5]||'').toString(),
        updatedDate: (r[6]||'').toString(),
        category:    meta.category   || 'Strength',
        goal:        meta.goal       || 'General Fitness',
        difficulty:  meta.difficulty || 'Intermediate',
        days:        meta.days       || [],
        notes:       meta.notes      || '',
      };
    });
  return { success:true, workouts };
}

function saveCustomWorkout(body) {
  const sh   = getSheet(SHEETS.CUSTOM_WORKOUTS);
  ensureHeaders(sh,['WorkoutID','UserID','UserEmail','Name','ExercisesJSON','CreatedDate','UpdatedDate','Active','MetaJSON']);
  // Pack structured fields into a single MetaJSON column for forward compatibility
  const meta = JSON.stringify({
    category:   body.category   || 'Strength',
    goal:       body.goal       || 'General Fitness',
    difficulty: body.difficulty || 'Intermediate',
    days:       body.days       || [],
    notes:      body.notes      || '',
  });
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][0]||'').toString()===body.id.toString() &&
        (data[i][1]||'').toString()===body.userId.toString()) {
      sh.getRange(i+1,1,1,9).setValues([[
        body.id, body.userId, body.email||'', body.name,
        JSON.stringify(body.exercises||[]),
        body.createdDate||'',
        body.updatedDate||_ymdLocal(),
        true,
        meta,
      ]]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow([
    body.id, body.userId, body.email||'', body.name,
    JSON.stringify(body.exercises||[]),
    body.createdDate||_ymdLocal(),
    body.updatedDate||_ymdLocal(),
    true,
    meta,
  ]);
  SpreadsheetApp.flush();
  return { success:true, created:true };
}

function deleteCustomWorkout(body) {
  const sh   = getSheet(SHEETS.CUSTOM_WORKOUTS);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][0]||'').toString()===body.id.toString() &&
        (data[i][1]||'').toString()===body.userId.toString()) {
      sh.getRange(i+1,8).setValue(false);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'Workout not found.' };
}

// ════════════════════════════════════════════════════════════════
// CONTENT
// ════════════════════════════════════════════════════════════════
function getContent(key) {
  const sh   = getSheet(SHEETS.CONTENT);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][0]||'').toString()===key) {
      try { return JSON.parse(data[i][1]); } catch { return null; }
    }
  }
  return null;
}

function getAllContent() {
  const sh   = getSheet(SHEETS.CONTENT);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, content:{} };
  const result = {};
  data.slice(1).forEach(r => {
    const k = (r[0]||'').toString().trim();
    if (!k) return;
    try { result[k] = JSON.parse(r[1]); } catch { result[k] = r[1]; }
  });
  return { success:true, content:result };
}

function saveContent(body) {
  const { key, value } = body;
  if (!key) return { success:false, error:'key required.' };
  const sh   = getSheet(SHEETS.CONTENT);
  ensureHeaders(sh,['Key','Value','UpdatedAt']);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][0]||'').toString()===key) {
      sh.getRange(i+1,2,1,2).setValues([[JSON.stringify(value), new Date().toISOString()]]);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  sh.appendRow([key, JSON.stringify(value), new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true };
}

// ════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════
function getAnnouncement() {
  const sh   = getSheet('Announcements');
  const data = sh.getDataRange().getValues();
  if (data.length<2) return null;
  const today = _ymdLocal();
  for (let i = data.length-1; i >= 1; i--) {
    const r = data[i];
    const startDate = (r[3]||'').toString();
    const endDate   = (r[4]||'').toString();
    if ((!startDate||today>=startDate) && (!endDate||today<=endDate)) {
      return { id:(r[0]||'').toString(), title:(r[1]||'').toString(), message:(r[2]||'').toString() };
    }
  }
  return null;
}

function saveAnnouncement(body) {
  const { title, message, startDate, endDate, createdBy } = body;
  if (!message) return { success:false, error:'message required.' };
  const sh = getSheet('Announcements');
  ensureHeaders(sh,['ID','Title','Message','StartDate','EndDate','CreatedBy','CreatedAt']);
  sh.appendRow(['ann_'+Date.now(), title||'', message, startDate||'', endDate||'',
    createdBy||'Admin', new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true };
}

// ════════════════════════════════════════════════════════════════
// FEEDBACK
// ════════════════════════════════════════════════════════════════
function getFeedback() {
  const sh   = getSheet(SHEETS.FEEDBACK);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, feedback:[] };
  return { success:true, feedback:data.slice(1).reverse()
    .map(r => ({ id:r[0], userId:r[1], name:r[2], email:r[3], category:r[4], rating:r[5], message:r[6], date:r[7] })) };
}

function submitFeedback(body) {
  const sh = getSheet(SHEETS.FEEDBACK);
  ensureHeaders(sh,['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp']);
  sh.appendRow(['fb_'+Date.now(), body.userId||'', body.name||'Anonymous', body.email||'',
    body.category||'General', body.rating||0, body.message||'',
    body.date||'', new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true };
}

// ════════════════════════════════════════════════════════════════
// PUSH SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════
function savePushSubscription(body) {
  const sh   = getSheet(SHEETS.PUSH_SUBS);
  ensureHeaders(sh,['UserID','Name','Email','Endpoint','P256DH','Auth','SavedAt','Active']);
  const data = sh.getDataRange().getValues();
  const row  = [body.userId, body.name||'', body.email||'', body.endpoint,
    body.p256dh||'', body.auth||'', body.savedAt||new Date().toISOString(), true];
  for (let i=1;i<data.length;i++) {
    if (data[i][0]===body.userId && data[i][3]===body.endpoint) {
      sh.getRange(i+1,1,1,8).setValues([row]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow(row);
  SpreadsheetApp.flush();
  return { success:true, created:true };
}

function removePushSubscription(body) {
  const sh   = getSheet(SHEETS.PUSH_SUBS);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if (data[i][0]===body.userId && data[i][3]===body.endpoint) {
      sh.getRange(i+1,8).setValue(false);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'Not found.' };
}

function getAllActiveSubscriptions() {
  const sh   = getSheet(SHEETS.PUSH_SUBS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1)
    .filter(r => r[7]===true||r[7]==='TRUE'||r[7]==='true')
    .map(r => ({ userId:r[0], name:r[1], email:r[2], endpoint:r[3], p256dh:r[4], auth:r[5] }));
}

// ════════════════════════════════════════════════════════════════
// HYDRATION LOGS
// ════════════════════════════════════════════════════════════════
function saveHydrationLog(body) {
  const sh   = getSheet(SHEETS.HYDRATION_LOGS);
  ensureHeaders(sh,['LogID','UserID','UserEmail','Date','GlassesTarget','GlassesDone','Timestamp']);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][1]||'').toString()===body.userId.toString() &&
        (data[i][3]||'').toString()===body.date) {
      sh.getRange(i+1,5,1,3).setValues([[body.glassesTarget||0, body.glassesDone||0, new Date().toISOString()]]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow(['hyd_'+Date.now(), body.userId||'', body.email||'', body.date||'',
    body.glassesTarget||0, body.glassesDone||0, new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true, created:true };
}

function getHydrationLogs(userId) {
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet(SHEETS.HYDRATION_LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, logs:[] };
  const logs = data.slice(1)
    .filter(r => (r[1]||'').toString()===userId.toString())
    .map(r => ({
      id:(r[0]||'').toString(), userId:(r[1]||'').toString(), email:(r[2]||'').toString(),
      date:(r[3]||'').toString(), glassesTarget:parseInt(r[4])||0,
      glassesDone:parseInt(r[5])||0, timestamp:(r[6]||'').toString(),
    }));
  return { success:true, logs };
}

// ════════════════════════════════════════════════════════════════
// PLAN MANAGEMENT
// ════════════════════════════════════════════════════════════════
function getActivePlan(userId) {
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet('PlanProgress');
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, plan:null };
  for (let i=1;i<data.length;i++) {
    const row = data[i];
    if ((row[1]||'').toString()===userId.toString() && (row[11]||'').toString()==='REGISTERED') {
      return { success:true, plan:{
        planKey:      (row[3]||'').toString(),
        startDate:    (row[4]||'').toString(),
        registeredAt: (row[5]||'').toString(),
      }};
    }
  }
  return { success:true, plan:null };
}

function getPlanProgress(userId, planKey) {
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet('PlanProgress');
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, completedDays:[] };
  const days = data.slice(1)
    .filter(r =>
      (r[1]||'').toString()===userId.toString() &&
      (!planKey||(r[3]||'').toString()===planKey) &&
      (r[11]||'').toString()==='DAY_DONE'
    )
    .map(r => ({
      planKey:(r[3]||'').toString(), week:parseInt(r[6])||0, day:parseInt(r[7])||0,
      completedDate:(r[8]||'').toString(), distanceKm:parseFloat(r[9])||0, durationSec:parseInt(r[10])||0,
    }));
  return { success:true, completedDays:days };
}

function savePlanRegistration(body) {
  const { userId, email, planKey, startDate, registeredAt } = body;
  if (!userId||!planKey) return { success:false, error:'userId and planKey required.' };
  const sh   = getSheet('PlanProgress');
  ensureHeaders(sh,['RecordID','UserID','UserEmail','PlanKey','StartDate','RegisteredAt','Week','Day','CompletedDate','DistanceKm','DurationSec','Status','Timestamp']);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][1]||'').toString()===userId.toString()&&(data[i][11]||'').toString()==='REGISTERED') {
      sh.getRange(i+1,1,1,13).setValues([[data[i][0],userId,email||'',planKey,startDate||'',
        registeredAt||new Date().toISOString(),0,0,'',0,0,'REGISTERED',new Date().toISOString()]]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow(['plan_'+Date.now(),userId,email||'',planKey,startDate||'',
    registeredAt||new Date().toISOString(),0,0,'',0,0,'REGISTERED',new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true, created:true };
}

function savePlanDayCompletion(body) {
  const { userId, email, planKey, week, day, completedDate, distanceKm, durationSec } = body;
  if (!userId||!planKey||!week||!day) return { success:false, error:'userId, planKey, week, day required.' };
  const sh   = getSheet('PlanProgress');
  ensureHeaders(sh,['RecordID','UserID','UserEmail','PlanKey','StartDate','RegisteredAt','Week','Day','CompletedDate','DistanceKm','DurationSec','Status','Timestamp']);
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    const row=data[i];
    if ((row[1]||'').toString()===userId.toString() && (row[3]||'').toString()===planKey &&
        parseInt(row[6])===parseInt(week) && parseInt(row[7])===parseInt(day) &&
        (row[11]||'').toString()==='DAY_DONE') {
      sh.getRange(i+1,9,1,5).setValues([[completedDate||'',distanceKm||0,durationSec||0,'DAY_DONE',new Date().toISOString()]]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow(['pd_'+Date.now(),userId,email||'',planKey,'','',week,day,
    completedDate||'',distanceKm||0,durationSec||0,'DAY_DONE',new Date().toISOString()]);
  SpreadsheetApp.flush();
  return { success:true, created:true };
}

function clearActivePlan(body) {
  const { userId } = body;
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet('PlanProgress');
  const data = sh.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if ((data[i][1]||'').toString()===userId.toString()&&(data[i][11]||'').toString()==='REGISTERED') {
      sh.getRange(i+1,12).setValue('UNREGISTERED');
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:true };
}

// ════════════════════════════════════════════════════════════════
// SYNC USER DATA
// ════════════════════════════════════════════════════════════════
function syncUserData(body) {
  const { userId, email, logs, runLogs } = body;
  if (!userId) return { success:false, error:'userId required.' };
  let synced = 0;
  if (Array.isArray(logs)) {
    logs.forEach(log => { logCompletion({ ...log, userId, email }); synced++; });
  }
  if (Array.isArray(runLogs)) {
    runLogs.forEach(log => { logRun({ ...log, userId, email }); synced++; });
  }
  return { success:true, synced };
}



// ════════════════════════════════════════════════════════════════
// USER ONBOARDING — store goal, modules, age, weight, height, etc.
// ════════════════════════════════════════════════════════════════

function saveOnboarding(body) {
  if (!body.userId) return { success:false, error:'userId required' };
  const sh = getSheet(SHEETS.ONBOARDING);
  ensureHeaders(sh, [
    'UserID','Email','Goal','Modules','Age','Weight','Height',
    'Gender','FitnessLevel','SubmittedAt','UpdatedAt'
  ]);

  const data = sh.getDataRange().getValues();
  const userId = body.userId.toString();
  const modulesStr = Array.isArray(body.modules) ? body.modules.join(',') : (body.modules||'');

  // Find existing row for this user
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === userId) { existingRow = i + 1; break; }
  }

  const row = [
    userId,
    body.email || '',
    body.goal || '',
    modulesStr,
    body.age || '',
    body.weight || '',
    body.height || '',
    body.gender || '',
    body.fitnessLevel || '',
    existingRow > 0 ? data[existingRow-1][9] || new Date().toISOString() : new Date().toISOString(),
    new Date().toISOString(),
  ];

  if (existingRow > 0) {
    sh.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  SpreadsheetApp.flush();
  return { success:true };
}

function getOnboarding(userId) {
  const sh = getSheet(SHEETS.ONBOARDING);
  ensureHeaders(sh, [
    'UserID','Email','Goal','Modules','Age','Weight','Height',
    'Gender','FitnessLevel','SubmittedAt','UpdatedAt'
  ]);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === (userId||'').toString()) {
      return {
        success:      true,
        onboarding:  _onboardingRow(data[i]),
      };
    }
  }
  return { success:true, onboarding:null };
}

function getAllOnboarding() {
  const sh = getSheet(SHEETS.ONBOARDING);
  ensureHeaders(sh, [
    'UserID','Email','Goal','Modules','Age','Weight','Height',
    'Gender','FitnessLevel','SubmittedAt','UpdatedAt'
  ]);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(_onboardingRow);
}

function _onboardingRow(r) {
  return {
    userId:       (r[0]||'').toString(),
    email:        (r[1]||'').toString(),
    goal:         (r[2]||'').toString(),
    modules:      (r[3]||'').toString().split(',').map(m => m.trim()).filter(Boolean),
    age:          r[4] || null,
    weight:       r[5] || null,
    height:       r[6] || null,
    gender:       (r[7]||'').toString(),
    fitnessLevel: (r[8]||'').toString(),
    submittedAt:  toISOStr(r[9]) || '',
    updatedAt:    toISOStr(r[10]) || '',
  };
}

// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — OneSignal REST API
//
// SETUP: In Apps Script Project Settings → Script Properties, add:
//   ONESIGNAL_APP_ID       = 5dfd18d7-bde4-4f26-a478-0f522b2f299f
//   ONESIGNAL_REST_API_KEY = <your REST API key from OneSignal Settings>
// ════════════════════════════════════════════════════════════════
var DAILY_MESSAGES = [
  { title: '🌅 Rise & Grind!',          body: "Your muscles called — they're bored. Time to fix that! 💪" },
  { title: '🏆 Good Morning Champion!', body: "The only workout you'll regret is the one you skipped! 🔥" },
  { title: '⏰ Wakey Wakey!',              body: "Your future self is at the gym waiting. Don't keep them waiting! 🏃" },
  { title: '☀️ Morning Motivation!', body: "Coffee is great. But endorphins? Free and hit harder! ☕💪" },
  { title: '🚀 Let\'s GO!',             body: "Your body is a temple. Today we're doing renovations. 🔨💪" },
  { title: '📋 Daily Check-In!',        body: "Cardio? Yoga? Running? Your app is ready when you are! 🎯" },
  { title: '📱 6 AM Wake Up Call!',     body: "The alarm rang. Your excuses are still sleeping. YOU don't have to be! ⚡" },
  { title: '🦁 Morning Legend!',        body: "Lions don't skip leg day. Be the lion. 💪" },
  { title: '✨ Rise & Shine!',             body: "Yesterday you said tomorrow. TODAY IS THAT TOMORROW. GO! 🏃" },
  { title: '🌄 Good Morning!',          body: "Your competition woke up at 5 AM. But you're here now — keep going! 💪" },
  { title: '🕺 Move Your Body!',        body: "Muscles are like WiFi. Use them or the connection gets weak! 📶" },
  { title: '🥇 Morning Champion!',      body: "Progress not perfection. One workout at a time. You've got this! 🌟" },
  { title: '😅 Time to Sweat!',         body: "Sweat is just your fat crying. Make it cry today! 🔥" },
  { title: '💪 New Day, New Gains!',    body: "Yesterday's soreness is today's strength. What are you building? 🏗️" },
  { title: '⚔️ Morning Warrior!',    body: "Warriors don't wait for motivation. They BECOME it. Let's GO! 🔥" },
  { title: '💊 Daily Dose of Awesome!', body: "Side effects: confidence, energy, better sleep, happiness. Worth it! 😁" },
  { title: '💪 Strength Incoming!',     body: "Every rep is a vote for the person you want to become. Vote today! 🗳️" },
  { title: '🚫 No Excuses Today!',      body: "Too tired? Start with 5 minutes. Too busy? You're reading this! 😉" },
  { title: '💥 Midweek Push!',          body: "Halfway through the week. Don't slow down now! 🏁" },
  { title: '🏕️ Weekend Warrior!', body: "No work today? Perfect — more energy for your workout! 💪" },
];

function getTodaysMessage() {
  var day = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return DAILY_MESSAGES[day % DAILY_MESSAGES.length];
}




// Get list of subscription IDs that are currently subscribed (most reliable targeting)


// DEBUG — dump raw player data so we can see what OneSignal actually returns
function debugListAllPlayers() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  var url = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Basic ' + apiKey },
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    Logger.log('HTTP ' + code);
    var body = res.getContentText();
    Logger.log('Raw body length: ' + body.length);
    if (code !== 200) {
      Logger.log('Error response: ' + body.substring(0, 500));
      return;
    }
    var data = JSON.parse(body);
    var players = data.players || [];
    Logger.log('Total players: ' + players.length);
    Logger.log('============================');
    players.forEach(function(p, i) {
      Logger.log('Player #' + (i+1) + ':');
      Logger.log('  id: ' + p.id);
      Logger.log('  device_os: ' + p.device_os);
      Logger.log('  device_model: ' + p.device_model);
      Logger.log('  device_type: ' + p.device_type);
      Logger.log('  notification_types: ' + p.notification_types);
      Logger.log('  invalid_identifier: ' + p.invalid_identifier);
      Logger.log('  identifier (token): ' + (p.identifier ? p.identifier.substring(0, 30) + '...' : 'null'));
      Logger.log('  ALL FIELDS: ' + JSON.stringify(p).substring(0, 800));
      Logger.log('  ---');
    });
  } catch (e) {
    Logger.log('Error: ' + e.message);
  }
}



// Returns list of subscribed devices with user info attached (for admin UI)
function getSubscribedDevices() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { success:false, error:'Missing OneSignal credentials' };

  try {
    var url = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Basic ' + apiKey },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      return { success:false, error:'HTTP ' + res.getResponseCode() };
    }
    var data = JSON.parse(res.getContentText());
    var players = data.players || [];

    // Build user lookup
    var users = getAllUsers() || [];
    var userByExtId = {};
    users.forEach(function(u) {
      if (u.id) userByExtId[u.id] = u;
    });

    // Filter and enrich
    var devices = players
      .filter(function(p) { return p.invalid_identifier !== true && p.identifier; })
      .map(function(p) {
        var u = userByExtId[p.external_user_id] || {};
        // Also try matching by tags (sometimes external_user_id is empty)
        if (!u.email && p.tags && p.tags.email) {
          var byEmail = users.find(function(uu) { return (uu.email||'').toLowerCase() === (p.tags.email||'').toLowerCase(); });
          if (byEmail) u = byEmail;
        }
        return {
          subscriptionId: p.id,
          deviceModel:    p.device_model || 'Unknown',
          deviceOS:       p.device_os || '',
          lastActive:     p.last_active ? new Date(p.last_active * 1000).toISOString() : '',
          name:           u.name || (p.tags && p.tags.name) || '',
          email:          u.email || (p.tags && p.tags.email) || '',
          userId:         p.external_user_id || '',
        };
      });

    return { success:true, count: devices.length, devices: devices };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

function _getSubscribedDeviceIds(userIds) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return [];

  try {
    var url = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Basic ' + apiKey },
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    if (code !== 200) {
      Logger.log('Could not list players: HTTP ' + code);
      return [];
    }
    var data = JSON.parse(res.getContentText());
    var players = data.players || [];

    // Build user-id filter set if provided
    var userIdFilter = null;
    if (userIds && userIds.length) {
      userIdFilter = {};
      userIds.forEach(function(uid) { userIdFilter[uid] = true; });
    }

    var ids = players
      .filter(function(p) {
        if (p.invalid_identifier === true || !p.identifier) return false;
        if (userIdFilter && !userIdFilter[p.external_user_id]) return false;
        return true;
      })
      .map(function(p) { return p.id; });
    Logger.log('Found ' + ids.length + ' subscribed device(s)' + (userIdFilter ? ' (filtered to ' + userIds.length + ' users)' : ' of ' + players.length + ' total'));
    return ids;
  } catch (e) {
    Logger.log('Could not fetch subscribers: ' + e.message);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// DIAGNOSTIC — Check OneSignal subscription status
// Run this manually to see how many subscribers OneSignal has
// ════════════════════════════════════════════════════════════════
function checkOneSignalSubscribers() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    Logger.log('❌ Missing OneSignal credentials in Script Properties');
    return;
  }
  Logger.log('Using App ID: ' + appId);
  Logger.log('API Key length: ' + apiKey.length + ' chars (should be 48+)');
  try {
    var res = UrlFetchApp.fetch('https://api.onesignal.com/apps/' + appId, {
      method: 'get',
      headers: { 'Authorization': 'Basic ' + apiKey },
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    Logger.log('App info HTTP ' + code + ': ' + body.substring(0, 1000));
    if (code === 200) {
      var info = JSON.parse(body);
      Logger.log('========== OneSignal App: ' + info.name + ' ==========');
      Logger.log('  Total subscribers: ' + (info.players || 0));
      Logger.log('  Messageable subscribers: ' + (info.messageable_players || 0));
      Logger.log('  Created: ' + info.created_at);
      if ((info.messageable_players || 0) === 0) {
        Logger.log('⚠️  No messageable subscribers — that is why no push arrives!');
        Logger.log('   Steps to fix:');
        Logger.log('   1. Open https://suneelchalla.github.io/fitflow-pro on your phone');
        Logger.log('   2. Allow notifications when Chrome prompts');
        Logger.log('   3. Toggle the bell icon ON in the app');
        Logger.log('   4. Re-run this function — should show 1+ subscribers');
      }
    }
  } catch (e) {
    Logger.log('Error: ' + e.message);
  }
}

// Sends today's daily reminder to ALL OneSignal subscribers
function sendDailyPushNotifications() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    Logger.log('OneSignal credentials missing. Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in Script Properties.');
    return { success:false, error:'Missing OneSignal credentials' };
  }
  var msg = getTodaysMessage();

  // Direct device targeting (more reliable than segments which can lag)
  var deviceIds = _getSubscribedDeviceIds();
  if (!deviceIds.length) {
    Logger.log('No subscribed devices found — cannot send push');
    return { success:false, error:'No subscribed devices' };
  }

  var payload = {
    app_id:                  appId,
    include_player_ids: deviceIds,
    headings:                { en: msg.title },
    contents:                { en: msg.body  },
    // App URL (works for both browser and installed PWA)
    web_url:           'https://suneelchalla.github.io/fitflow-pro/index.html',
    // Web push icons (Chrome/Edge/Firefox on desktop AND mobile)
    chrome_web_icon:   'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    chrome_web_image:  'https://suneelchalla.github.io/fitflow-pro/icons/icon-512.png',
    chrome_web_badge:  'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    // Action buttons below notification
    web_buttons: [
      { id: 'open',  text: "💪 Let's Go!", icon: 'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png', url: 'https://suneelchalla.github.io/fitflow-pro/index.html' },
      { id: 'later', text: "⏰ Later",        icon: 'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png', url: 'https://suneelchalla.github.io/fitflow-pro/index.html' },
    ],
    priority:          10,
    ttl:               86400,
  };
  try {
    var res = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method:           'post',
      contentType:      'application/json',
      headers:          { 'Authorization': 'Basic ' + apiKey },
      payload:          JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    var parsed = {}; try { parsed = JSON.parse(body); } catch(e) {}
    // Always log the full response body so we can see warnings/errors
    Logger.log('OneSignal HTTP ' + code + ' response: ' + body);
    if (code >= 200 && code < 300) {
      // Check for errors in body even though HTTP was 200
      if (parsed.errors) {
        Logger.log('OneSignal returned errors: ' + JSON.stringify(parsed.errors));
        return { success:false, error:'OneSignal errors', errors:parsed.errors, body:body };
      }
      if (!parsed.id) {
        Logger.log('OneSignal returned no notification ID — likely no recipients');
        return { success:false, error:'No notification created', body:body };
      }
      var recipientCount = (parsed.recipients !== undefined) ? parsed.recipients : '(see Dashboard)';
      Logger.log('✅ OneSignal push CREATED. Targeted devices: ' + deviceIds.length + ' | API recipients field: ' + recipientCount + ' | id: ' + parsed.id);
      Logger.log('   Note: API "recipients" can be 0 even when delivery succeeds. Check OneSignal Dashboard → Delivery → Sent Messages for actual delivery count.');
      return { success:true, recipients:parsed.recipients, id:parsed.id, targeted:deviceIds.length };
    }
    Logger.log('OneSignal push failed (HTTP ' + code + '): ' + body.substring(0, 500));
    return { success:false, error:'HTTP ' + code, body:body.substring(0, 500) };
  } catch (e) {
    Logger.log('OneSignal push error: ' + e.message);
    return { success:false, error:e.message };
  }
}


// Send a CUSTOM admin-composed push to ALL subscribers (separate from daily)
function sendCustomPush(body) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { success:false, error:'Missing OneSignal credentials' };
  if (!body || !body.title || !body.message) return { success:false, error:'title and message required' };

  // Direct device targeting (more reliable than segments which can lag)
  // Accept optional targetUserIds to filter to specific users
  var deviceIds = _getSubscribedDeviceIds(body.targetUserIds);
  if (!deviceIds.length) {
    var errMsg = body.targetUserIds && body.targetUserIds.length
      ? 'None of the selected users have subscribed devices'
      : 'No subscribed devices found. Have any users opted in via the bell toggle?';
    return { success:false, error: errMsg };
  }

  var payload = {
    app_id:                  appId,
    include_player_ids: deviceIds,
    headings:                { en: String(body.title).substring(0, 80) },
    contents:                { en: String(body.message).substring(0, 240) },
    web_url:           'https://suneelchalla.github.io/fitflow-pro/index.html',
    chrome_web_icon:   'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    chrome_web_image:  'https://suneelchalla.github.io/fitflow-pro/icons/icon-512.png',
    chrome_web_badge:  'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    priority:          10,
    ttl:               86400,
  };
  try {
    var res = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method:           'post',
      contentType:      'application/json',
      headers:          { 'Authorization': 'Basic ' + apiKey },
      payload:          JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var resBody = res.getContentText();
    var parsed = {}; try { parsed = JSON.parse(resBody); } catch(e) {}
    Logger.log('OneSignal HTTP ' + code + ' response: ' + resBody);
    if (code >= 200 && code < 300) {
      if (parsed.errors) {
        Logger.log('OneSignal errors: ' + JSON.stringify(parsed.errors));
        return { success:false, error:'OneSignal errors: ' + JSON.stringify(parsed.errors), errors:parsed.errors };
      }
      if (!parsed.id) {
        Logger.log('No notification ID — likely no recipients');
        return { success:false, error:'No notification created — check that there are subscribed users', body:resBody };
      }
      var recipientCount = (parsed.recipients !== undefined) ? parsed.recipients : '(see Dashboard)';
      Logger.log('✅ Custom push CREATED. Targeted devices: ' + deviceIds.length + ' | API recipients field: ' + recipientCount + ' | id: ' + parsed.id);
      try {
        var sh = getSheet('AdminPushLog');
        ensureHeaders(sh, ['SentAt', 'Title', 'Message', 'Recipients', 'NotificationID', 'SentBy']);
        sh.appendRow([new Date(), body.title, body.message, deviceIds.length, parsed.id, body.sentBy || '']);
      } catch(e) { Logger.log('Audit log skipped: ' + e.message); }
      return { success:true, recipients:parsed.recipients, id:parsed.id, targeted:deviceIds.length };
    }
    return { success:false, error:'HTTP ' + code, body:resBody.substring(0, 500) };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

// Get history of admin-sent pushes
function getAdminPushLog() {
  try {
    var sh = getSheet('AdminPushLog');
    ensureHeaders(sh, ['SentAt', 'Title', 'Message', 'Recipients', 'NotificationID', 'SentBy']);
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return { success:true, history:[] };
    return {
      success: true,
      history: data.slice(1).reverse().slice(0, 50).map(function(r) {
        return {
          sentAt:        toISOStr(r[0]) || '',
          title:         (r[1]||'').toString(),
          message:       (r[2]||'').toString(),
          recipients:    r[3] || 0,
          notificationId:(r[4]||'').toString(),
          sentBy:        (r[5]||'').toString(),
        };
      }),
    };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

// Send a push to ONE specific user (by OneSignal subscription id)
function sendPushToUser(subscriptionId, title, body, url) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { success:false, error:'Missing OneSignal credentials' };
  if (!subscriptionId) return { success:false, error:'subscriptionId required' };
  var payload = {
    app_id:                  appId,
    include_player_ids: [subscriptionId],
    headings:                { en: title || 'FitFlow Pro' },
    contents:                { en: body  || 'You have a new update!' },
    web_url:                 url || 'https://suneelchalla.github.io/fitflow-pro/index.html',
    chrome_web_icon:         'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    chrome_web_image:        'https://suneelchalla.github.io/fitflow-pro/icons/icon-512.png',
    chrome_web_badge:        'https://suneelchalla.github.io/fitflow-pro/icons/icon-192.png',
    priority:                10,
  };
  try {
    var res = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method:'post', contentType:'application/json',
      headers:{'Authorization':'Basic '+apiKey},
      payload:JSON.stringify(payload), muteHttpExceptions:true,
    });
    var code = res.getResponseCode();
    if (code>=200 && code<300) return { success:true };
    return { success:false, error:'HTTP '+code, body:res.getContentText().substring(0,200) };
  } catch(e) { return { success:false, error:e.message }; }
}

// Test from Apps Script editor: select this function and Run, then check Logs
function testPushNotification() {
  var result = sendDailyPushNotifications();
  Logger.log('Test result: ' + JSON.stringify(result));
}

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction()==='sendDailyPushNotifications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyPushNotifications').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Daily 6 AM trigger created!');
}

function deleteDailyTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction()==='sendDailyPushNotifications') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Deleted '+n+' trigger(s).');
}

function _getOrigin(url) {
  var m = url.match(/^(https?:\/\/[^\/]+)/);
  return m ? m[1] : url;
}
function _cleanupExpired(endpoints) {
  var sh   = getSheet(SHEETS.PUSH_SUBS);
  var data = sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (endpoints.indexOf(data[i][3])>-1) sh.getRange(i+1,8).setValue(false);
  }
  SpreadsheetApp.flush();
}

function testGoogleLogin() {
  var result = googleLogin({ email:'test@gmail.com', name:'Test User', googleId:'test123' });
  Logger.log('googleLogin test: '+JSON.stringify(result));
}

// ════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════
function ensureHeaders(sh, headers) {
  if (sh.getLastRow()===0) { sh.appendRow(headers); styleHeader(sh,headers.length); }
}

function styleHeader(sh, colCount) {
  sh.getRange(1,1,1,colCount)
    .setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF').setFontSize(11);
  sh.setFrozenRows(1);
}
