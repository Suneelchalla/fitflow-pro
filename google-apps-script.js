// ════════════════════════════════════════════════════════════════
// FITFLOW PRO — Google Apps Script Backend v9
// Complete file — paste ALL contents into Apps Script editor
// ════════════════════════════════════════════════════════════════
// v9 changes vs v8:
// • Passwords now hashed with SHA-256 before storing in Sheets
// • Backward compatible — plain text passwords still work during transition
// • On successful plain text login, password is auto-upgraded to hash
// v8 changes vs v7:
// • Fixed broken submitFeedback (duplicate sh declaration + split appendRow)
// • Fixed getFeedback dead code after return statement
// • Fixed duplicate testEveningPushNotification definition
// • Fixed duplicate sendEveningPushNotifications definition
// • Added getFeedbackUnread, replyFeedback, markFeedbackRead
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
  SESSIONS:        'Sessions',   // single-device session enforcement (one row per userId)
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

// ── PASSWORD HASHING ──────────────────────────────────────────────
// Uses SHA-256 via Utilities.computeDigest (built into Google Apps Script)
// Hashed passwords stored as hex strings prefixed with "sha256:"
// Plain text passwords still work for backward compatibility
// On successful plain text login, password is auto-upgraded to hash

function _hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password.toString(),
    Utilities.Charset.UTF_8
  );
  var hex = bytes.map(function(b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  return 'sha256:' + hex;
}

function _isHashed(password) {
  return password && password.toString().startsWith('sha256:');
}

function _passwordMatches(entered, stored) {
  if (!entered || !stored) return false;
  var enteredStr = entered.toString().trim();
  var storedStr  = stored.toString().trim();
  if (_isHashed(storedStr)) {
    return _hashPassword(enteredStr) === storedStr;
  } else {
    return enteredStr === storedStr;
  }
}

// ── SESSION TOKEN HELPERS ─────────────────────────────────────────
// Each successful login issues a 32-char hex token, written to the Sessions
// sheet (one row per user — new logins overwrite the previous row). The
// frontend stores the token and pings validateSession every 5 minutes; if
// another device logged in since, the previous token is gone and the
// frontend logs that device out gracefully.

function _generateSessionToken() {
  // 16 random bytes → 32 hex chars. Apps Script has no crypto.getRandomValues,
  // so we use a combination of timestamp + Math.random across multiple draws
  // to make collisions astronomically unlikely (effective ~128 bits entropy).
  var hex = '';
  for (var i = 0; i < 16; i++) {
    var byte = Math.floor(Math.random() * 256);
    hex += ('0' + byte.toString(16)).slice(-2);
  }
  return hex + Date.now().toString(16); // appended timestamp guarantees uniqueness
}

function _issueSessionToken(userId, deviceInfo) {
  if (!userId) return '';
  try {
    var token = _generateSessionToken();
    var sh    = getSheet(SHEETS.SESSIONS);
    var data  = sh.getDataRange().getValues();
    var nowIso = new Date().toISOString();
    var devStr = (deviceInfo || '').toString().substring(0, 200);
    // Update existing row for this user (one row per userId), else append
    for (var i = 1; i < data.length; i++) {
      if ((data[i][0] || '').toString() === userId.toString()) {
        sh.getRange(i + 1, 2).setValue(token);
        sh.getRange(i + 1, 3).setValue(nowIso);
        sh.getRange(i + 1, 4).setValue(nowIso);
        sh.getRange(i + 1, 5).setValue(devStr);
        SpreadsheetApp.flush();
        return token;
      }
    }
    sh.appendRow([userId, token, nowIso, nowIso, devStr]);
    SpreadsheetApp.flush();
    return token;
  } catch (err) {
    Logger.log('_issueSessionToken failed: ' + err.message);
    return '';   // soft-fail — login still succeeds without token
  }
}

function validateSession(userId, sessionToken) {
  if (!userId || !sessionToken) return { valid: false, reason: 'missing-params' };
  try {
    var sh   = getSheet(SHEETS.SESSIONS);
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if ((data[i][0] || '').toString() === userId.toString()) {
        var storedToken = (data[i][1] || '').toString();
        if (storedToken === sessionToken.toString()) {
          // Bump LastSeenAt — useful for admin "active users" reports
          try {
            sh.getRange(i + 1, 4).setValue(new Date().toISOString());
            SpreadsheetApp.flush();
          } catch (e) {}
          return { valid: true };
        }
        // User has a row but the token doesn't match → another device took over
        return { valid: false, reason: 'replaced' };
      }
    }
    // No row exists — legacy user from before this feature shipped, OR a user
    // whose session was never written. Treat as VALID to avoid kicking people
    // out unexpectedly. Their next login will create a Sessions row and the
    // feature begins working for them from then on.
    return { valid: true, reason: 'legacy' };
  } catch (err) {
    Logger.log('validateSession failed: ' + err.message);
    return { valid: true, reason: 'error' };   // network/server hiccup — never log user out
  }
}

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
        result = { success:true, message:'FitFlow Pro API v8 online!', time:new Date().toISOString() };
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
      case 'getActivePlan':        result = getActivePlan(p.userId, p.planKey);                          break;
      case 'getPlanProgress':      result = getPlanProgress(p.userId, p.planKey);                        break;
      case 'getContent':           result = { success:true, content:getContent(p.key) };                 break;
      case 'getAllContent':         result = getAllContent();                                              break;
      case 'getFeedback':          result = getFeedback(p.userId);                                       break;
      case 'getFeedbackUnread':    result = getFeedbackUnread();                                         break;
      case 'getCustomWorkouts':    result = getCustomWorkouts(p.userId);                                 break;
      case 'getAllCustomWorkouts':  result = getAllCustomWorkouts();                                      break;
      case 'getHydrationLogs':     result = getHydrationLogs(p.userId);                                 break;
      case 'getAnnouncement':      result = { success:true, announcement:getAnnouncement() };            break;
      case 'getOnboarding':        result = getOnboarding(p.userId);                                     break;
      case 'getAllOnboarding':      result = { success:true, onboardings:getAllOnboarding() };            break;
      case 'getAdminPushLog':      result = getAdminPushLog();                                           break;
      case 'getSubscribedDevices': result = getSubscribedDevices();                                      break;
      case 'validateSession':      result = validateSession(p.userId, p.sessionToken);                   break;
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
      case 'completeGoogleSetup':    result = completeGoogleSetup(body);                  break;
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
      case 'replyFeedback':          result = replyFeedback(body);                        break;
      case 'markFeedbackRead':       result = markFeedbackRead(body);                     break;
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
// ════════════════════════════════════════════════════════════════
function cleanupDuplicateLogs() {
  const sh = getSheet(SHEETS.LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) { Logger.log('No logs to clean.'); return; }
  const header = data[0];
  const seen = {};
  const keepRows = [header];
  let duplicates = 0;
  let dateFixed = 0;
  for (let i = 1; i < data.length; i++) {
    const r = data[i].slice();
    if (r[6]) {
      const tsDate = new Date(r[6]);
      if (!isNaN(tsDate.getTime())) {
        const localDate = tsDate.getFullYear() + '-' +
          ('0' + (tsDate.getMonth() + 1)).slice(-2) + '-' +
          ('0' + tsDate.getDate()).slice(-2);
        const oldDate = toYMD(r[5]);
        if (oldDate !== localDate) { r[5] = localDate; dateFixed++; }
      }
    }
    const key = (r[1]||'') + '|' + (r[3]||'') + '|' + toYMD(r[5]);
    if (seen[key]) { duplicates++; } else { seen[key] = true; keepRows.push(r); }
  }
  if (duplicates === 0 && dateFixed === 0) {
    Logger.log('No duplicates or date issues found. Already clean.'); return;
  }
  sh.clearContents();
  sh.getRange(1, 1, keepRows.length, header.length).setValues(keepRows);
  SpreadsheetApp.flush();
  Logger.log('✅ Removed ' + duplicates + ' duplicate(s) and fixed ' + dateFixed + ' date(s). ' + (keepRows.length - 1) + ' unique entries remain.');
}

function cleanupDuplicateRunLogs() {
  const sh = getSheet(SHEETS.RUN_LOGS);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) { Logger.log('No run logs to clean.'); return; }
  const header = data[0];
  const seenIds = {};
  const seenNear = {};
  const keepRows = [header];
  let duplicates = 0;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const id = (r[0]||'').toString();
    if (id && seenIds[id]) { duplicates++; continue; }
    const userId  = (r[1]||'').toString();
    const date    = toYMD(r[3]);
    const dist    = parseFloat(r[4])||0;
    const dur     = parseInt(r[5])||0;
    const nearKey = userId + '|' + date + '|' + dist.toFixed(2) + '|' + Math.round(dur/5);
    if (seenNear[nearKey]) { duplicates++; continue; }
    if (id) seenIds[id] = true;
    seenNear[nearKey] = true;
    keepRows.push(r);
  }
  if (duplicates === 0) { Logger.log('No duplicates found in RunningLog. Already clean.'); return; }
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
  _ensureSheet(SHEETS.LOGS,            ['LogID','UserID','UserEmail','Module','Day','Date','Timestamp']);
  _ensureSheet(SHEETS.RUN_LOGS,        ['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp','ActivityType','CoordsJSON','Title','Description','LocationName']);
  _ensureSheet(SHEETS.HYDRATION_LOGS,  ['LogID','UserID','UserEmail','Date','GlassesTarget','GlassesDone','Timestamp']);
  _ensureSheet(SHEETS.CONTENT,         ['Key','Value','UpdatedAt']);
  _ensureSheet(SHEETS.FEEDBACK,        ['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp','AdminReply','AdminReplyAt','AdminRead']);
  _ensureSheet(SHEETS.PUSH_SUBS,       ['UserID','Name','Email','Endpoint','P256DH','Auth','SavedAt','Active']);
  _ensureSheet(SHEETS.CUSTOM_WORKOUTS, ['WorkoutID','UserID','UserEmail','Name','ExercisesJSON','CreatedDate','UpdatedDate','Active']);
  _ensureSheet(SHEETS.SESSIONS,        ['UserID','SessionToken','IssuedAt','LastSeenAt','DeviceInfo']);
  _ensureSheet('Announcements',        ['ID','Title','Message','StartDate','EndDate','CreatedBy','CreatedAt']);
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
  const hasLocationName = header.includes('locationname');
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
  if (!hasLocationName) addCol('LocationName',  '');
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
    const mainMatch  = storedPass && _passwordMatches(entered, storedPass);
    const tempMatch  = tempPass   && _passwordMatches(entered, tempPass);
    if (!mainMatch && !tempMatch)
      return { success:false, error:'Invalid email or password.' };
    // Auto-upgrade plain text password to hash on successful login
    if (mainMatch && !_isHashed(storedPass)) {
      try {
        sh.getRange(i+1, COL.PASSWORD+1).setValue(_hashPassword(entered));
        SpreadsheetApp.flush();
      } catch(e) { Logger.log('Password upgrade skipped: ' + e.message); }
    }
    const firstLoginRaw = row[COL.IS_FIRST_LOGIN];
    const isFirstLogin  = firstLoginRaw===true||String(firstLoginRaw).toUpperCase().trim()==='TRUE';
    try {
      sh.getRange(i+1,COL.LAST_LOGIN+1).setValue(new Date());
      SpreadsheetApp.flush();
    } catch(e) { Logger.log('LAST_LOGIN update skipped: ' + e.message); }
    const userId      = (row[COL.ID]        ||'').toString();
    const createdBy   = (row[COL.CREATED_BY] ||'').toString().toLowerCase();
    const isGoogleUser = userId.startsWith('u_g_') || createdBy === 'google';
    // Issue a fresh session token — invalidates any previous device's session.
    // Soft-fails to empty string if Sessions sheet write errors; login still succeeds.
    const sessionToken = _issueSessionToken(userId, 'email-login');
    return { success:true, sessionToken, user:{
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
    } catch(e) { Logger.log('LAST_LOGIN update skipped: ' + e.message); }
    const userId    = (row[COL.ID]        ||'').toString();
    const createdBy = (row[COL.CREATED_BY] ||'').toString().toLowerCase();
    // Issue a fresh session token — invalidates any previous device's session.
    const sessionToken = _issueSessionToken(userId, 'google-login');
    return { success:true, isNew:false, sessionToken, user:{
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
  // Issue session token for the freshly-created user
  const newSessionToken = _issueSessionToken(newId, 'google-signup');
  return { success:true, isNew:true, sessionToken: newSessionToken, user:{
    id:newId, name:displayName, email:email.toLowerCase().trim(),
    role:'USER', status:'ACTIVE', isFirstLogin:false,
    isGoogleUser:true, authType:'google',
  }};
}

function completeGoogleSetup(body) {
  const { userId, name, password } = body;
  if (!userId)       return { success:false, error:'userId required.' };
  if (!name || name.trim().length < 2) return { success:false, error:'Name must be at least 2 characters.' };
  if (!password || password.length < 6) return { success:false, error:'Password must be at least 6 characters.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString() !== userId.toString()) continue;
    sh.getRange(i+1, COL.NAME+1).setValue(name.trim());
    sh.getRange(i+1, COL.PASSWORD+1).setValue(_hashPassword(password));
    sh.getRange(i+1, COL.IS_FIRST_LOGIN+1).setValue(false);
    SpreadsheetApp.flush();
    return { success:true };
  }
  return { success:false, error:'User not found.' };
}

function changePassword(body) {
  const { userId, newPassword } = body;
  if (!userId||!newPassword) return { success:false, error:'userId and newPassword required.' };
  if (newPassword.length<6) return { success:false, error:'Password must be at least 6 characters.' };
  const sh   = getSheet(SHEETS.USERS);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL.ID]||'').toString()===userId.toString()) {
      sh.getRange(i+1,COL.PASSWORD+1).setValue(_hashPassword(newPassword));
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
      sh.getRange(i+1,COL.TEMP_PASSWORD+1).setValue(_hashPassword(tempPassword));
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
  return data.slice(1).map(r => {
    const idStr      = (r[COL.ID]||'').toString();
    const createdBy  = (r[COL.CREATED_BY]||'').toString().toLowerCase();
    const isGoogle   = idStr.startsWith('u_g_') || createdBy === 'google';
    const hasPw      = !!(r[COL.PASSWORD] && r[COL.PASSWORD].toString().trim().length > 0);
    return {
      id:             idStr,
      name:           (r[COL.NAME]||'').toString(),
      email:          (r[COL.EMAIL]||'').toString(),
      role:           (r[COL.ROLE]||'USER').toString().toUpperCase(),
      status:         (r[COL.STATUS]||'ACTIVE').toString(),
      isFirstLogin:   r[COL.IS_FIRST_LOGIN]===true||r[COL.IS_FIRST_LOGIN]==='TRUE'||r[COL.IS_FIRST_LOGIN]==='true',
      createdDate:    (r[COL.CREATED_DATE]||'').toString(),
      createdBy:      (r[COL.CREATED_BY]||'').toString(),
      lastLogin:      (r[COL.LAST_LOGIN]||'').toString(),
      isGoogleUser:   isGoogle,
      authType:       isGoogle ? (hasPw ? 'google_with_password' : 'google') : 'email',
      hasAppPassword: hasPw,
    };
  });
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
  // Header schema extended (v136+) — Week/Phase/DayType columns carry the
  // cross-training plan metadata so the global-history detail viewer can
  // look up the right exercise list cross-device. _ensureLogCtCols backfills
  // headers on legacy sheets that pre-date this change.
  ensureHeaders(sh,['LogID','UserID','UserEmail','Module','Day','Date','Timestamp','Week','Phase','DayType']);
  _ensureLogCtCols(sh);
  const data   = sh.getDataRange().getValues();
  const userId = (body.userId||'').toString();
  const module = (body.module||'').toString();
  const day    = (body.day   ||'').toString();
  const date   = toYMD(body.date) || (body.date||'').toString();
  // Dedup on userId+module+day+date (matches frontend Store.addLog).
  // Including `day` is required for body-part modules (stretching) where a user
  // can complete multiple body parts on the same date — each is a separate log.
  // For other modules the day value is a weekday name; users only ever log
  // today, so this also prevents the same weekday-date pair from duplicating.
  for (let i = 1; i < data.length; i++) {
    if ((data[i][1]||'').toString() === userId &&
        (data[i][3]||'').toString() === module &&
        (data[i][4]||'').toString() === day &&
        toYMD(data[i][5]) === date) {
      return { success:true, duplicate:true };
    }
  }
  sh.appendRow([
    'log_'+Date.now(),
    userId,
    body.email||'',
    module,
    day,
    date,
    new Date().toISOString(),
    body.week    || '',   // crosstraining only; other modules pass empty
    body.phase   || '',
    body.dayType || '',
  ]);
  SpreadsheetApp.flush();
  return { success:true };
}

function getUserLogs(userId) {
  const sh   = getSheet(SHEETS.LOGS);
  _ensureLogCtCols(sh);   // backfill so r[7..9] exist on legacy sheets
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1)
    .filter(r => (r[1]||'').toString()===userId.toString())
    .map(r => {
      const log = { id:r[0], userId:r[1], email:r[2], module:r[3], day:r[4], date:r[5], timestamp:r[6] };
      // Only attach cross-training fields when actually present, so other
      // modules' logs stay clean (and so optional-chaining checks downstream
      // remain `if (log.phase)` rather than `if (log.phase !== '')`).
      if (r[7] !== '' && r[7] != null) log.week    = parseInt(r[7]) || r[7];
      if (r[8])                        log.phase   = (r[8]||'').toString();
      if (r[9])                        log.dayType = (r[9]||'').toString();
      return log;
    });
}

function getAllLogs() {
  const sh   = getSheet(SHEETS.LOGS);
  _ensureLogCtCols(sh);
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  return data.slice(1).map(r => {
    const log = {
      id:        (r[0]||'').toString(),
      userId:    (r[1]||'').toString(),
      email:     (r[2]||'').toString(),
      module:    (r[3]||'').toString(),
      day:       (r[4]||'').toString(),
      date:      toYMD(r[5]),
      timestamp: toISOStr(r[6]),
    };
    if (r[7] !== '' && r[7] != null) log.week    = parseInt(r[7]) || r[7];
    if (r[8])                        log.phase   = (r[8]||'').toString();
    if (r[9])                        log.dayType = (r[9]||'').toString();
    return log;
  });
}

// ════════════════════════════════════════════════════════════════
// RUN LOGS
// ════════════════════════════════════════════════════════════════
function logRun(body) {
  const sh = getSheet(SHEETS.RUN_LOGS);
  ensureHeaders(sh,['LogID','UserID','UserEmail','Date','Distance_km','Duration_sec','Pace_min_km','PlanType','Timestamp','ActivityType','CoordsJSON','Title','Description','LocationName']);
  _ensureLocationNameCol(sh);   // backfill the header on legacy sheets so reads work
  const data   = sh.getDataRange().getValues();
  const newId  = (body.id || ('run_'+Date.now())).toString();
  const userId = (body.userId||'').toString();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === newId) return { success:true, duplicate:true };
    if ((data[i][1]||'').toString() === userId &&
        toYMD(data[i][3]) === toYMD(body.date) &&
        Math.abs((parseFloat(data[i][4])||0) - (parseFloat(body.distance)||0)) < 0.01 &&
        Math.abs((parseInt(data[i][5])||0)   - (parseInt(body.duration)||0))   < 5) {
      return { success:true, duplicate:true };
    }
  }
  let coordsJson = '[]';
  if (Array.isArray(body.coords) && body.coords.length) {
    // Include ts so _calcKmSplits can compute per-km split times after a Sheets sync.
    // Without ts, every coord is skipped by the `if (!c.ts) continue` guard and
    // splits never render after the first login/reload replaces localStorage.
    coordsJson = JSON.stringify(body.coords.map(c => ({
      lat: c.lat, lon: c.lon, ...(c.ts ? { ts: c.ts } : {}),
    })));
  }
  sh.appendRow([
    newId, userId, body.email||'', toYMD(body.date)||(body.date||''),
    body.distance||0, body.duration||0, body.pace||0,
    body.planType||('Free '+(body.activityType||'Run').charAt(0).toUpperCase()+(body.activityType||'run').slice(1)),
    new Date().toISOString(),
    body.activityType||'run',
    coordsJson,
    body.title||'',
    body.description||'',
    body.locationName||'',
  ]);
  SpreadsheetApp.flush();
  return { success:true };
}

function getUserRunLogs(userId) {
  const sh   = getSheet(SHEETS.RUN_LOGS);
  _ensureLocationNameCol(sh);   // ensure header exists so reads return locationName
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  const header    = data[0].map(h => (h||'').toString().trim().toLowerCase());
  const actCol      = header.indexOf('activitytype');
  const coordsCol   = header.indexOf('coordsjson');
  const titleCol    = header.indexOf('title');
  const descCol     = header.indexOf('description');
  const locationCol = header.indexOf('locationname');
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
        distance:     parseFloat(r[RCOL.DISTANCE])||0,
        duration:     parseInt(r[RCOL.DURATION])  ||0,
        pace:         parseFloat(r[RCOL.PACE])    ||0,
        planType:     (r[RCOL.PLAN_TYPE]||'Free Run').toString(),
        timestamp:    toISOStr(r[RCOL.TIMESTAMP]),
        activityType: actCol      >= 0 ? (r[actCol]      ||'run').toString() : 'run',
        title:        titleCol    >= 0 ? (r[titleCol]    ||'').toString()    : '',
        description:  descCol     >= 0 ? (r[descCol]     ||'').toString()    : '',
        locationName: locationCol >= 0 ? (r[locationCol] ||'').toString()    : '',
        coords,
      };
    });
}

function getAllRunLogs() {
  const sh   = getSheet(SHEETS.RUN_LOGS);
  _ensureLocationNameCol(sh);   // ensure header exists so reads return locationName
  const data = sh.getDataRange().getValues();
  if (data.length<2) return [];
  const header    = data[0].map(h => (h||'').toString().trim().toLowerCase());
  const actCol      = header.indexOf('activitytype');
  const coordsCol   = header.indexOf('coordsjson');
  const titleCol    = header.indexOf('title');
  const descCol     = header.indexOf('description');
  const locationCol = header.indexOf('locationname');
  return data.slice(1).map(r => {
    let coords = [];
    if (coordsCol >= 0 && r[coordsCol]) { try { coords = JSON.parse(r[coordsCol]); } catch {} }
    return {
      id:           (r[0]||'').toString(),
      userId:       (r[1]||'').toString(),
      email:        (r[2]||'').toString(),
      date:         toYMD(r[3]),
      distance:     parseFloat(r[4])||0,
      duration:     parseInt(r[5]) ||0,
      pace:         parseFloat(r[6])||0,
      planType:     (r[7]||'Free Run').toString(),
      timestamp:    toISOStr(r[8]),
      activityType: actCol      >= 0 ? (r[actCol]      ||'run').toString() : 'run',
      title:        titleCol    >= 0 ? (r[titleCol]    ||'').toString()    : '',
      description:  descCol     >= 0 ? (r[descCol]     ||'').toString()    : '',
      locationName: locationCol >= 0 ? (r[locationCol] ||'').toString()    : '',
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
      let exercises = []; try { exercises = JSON.parse(r[4]||'[]'); } catch {}
      let meta = {};      try { meta = JSON.parse(r[8]||'{}'); }      catch {}
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
    .filter(r => { const active = r[7]; return active===true||active==='TRUE'||active==='true'; })
    .map(r => {
      let exercises = []; try { exercises = JSON.parse(r[4]||'[]'); } catch {}
      let meta = {};      try { meta = JSON.parse(r[8]||'{}'); }      catch {}
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
        body.createdDate||'', body.updatedDate||_ymdLocal(), true, meta,
      ]]);
      SpreadsheetApp.flush();
      return { success:true, updated:true };
    }
  }
  sh.appendRow([
    body.id, body.userId, body.email||'', body.name,
    JSON.stringify(body.exercises||[]),
    body.createdDate||_ymdLocal(), body.updatedDate||_ymdLocal(), true, meta,
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
function _ensureFeedbackCols(sh) {
  ensureHeaders(sh, ['FeedbackID','UserID','Name','Email','Category','Rating','Message','Date','Timestamp','AdminReply','AdminReplyAt','AdminRead']);
}

function getFeedback(userId) {
  const sh   = getSheet(SHEETS.FEEDBACK);
  _ensureFeedbackCols(sh);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { success:true, feedback:[] };

  // If userId is provided → user is calling: return ONLY their own feedback.
  // If no userId → admin is calling: return all feedback.
  const filterByUser = userId && userId.toString().trim().length > 0;

  const rows = data.slice(1).filter(r => {
    if (!filterByUser) return true;                                    // admin: all rows
    return (r[1]||'').toString().trim() === userId.toString().trim();  // user: own rows only
  });

  return {
    success:  true,
    feedback: rows.reverse().map(r => ({
      id:           (r[0]||'').toString(),
      userId:       (r[1]||'').toString(),
      name:         (r[2]||'').toString(),
      email:        (r[3]||'').toString(),
      category:     (r[4]||'').toString(),
      rating:       r[5] || 0,
      message:      (r[6]||'').toString(),
      date:         (r[7]||'').toString(),
      adminReply:   (r[9]||'').toString(),
      adminReplyAt: (r[10]||'').toString(),
      adminRead:    r[11] === true || r[11] === 'TRUE' || r[11] === 'true',
    })),
  };
}

function getFeedbackUnread() {
  const sh   = getSheet(SHEETS.FEEDBACK);
  _ensureFeedbackCols(sh);
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { success:true, count:0 };
  let count = 0;
  data.slice(1).forEach(r => {
    const read    = r[11] === true || r[11] === 'TRUE' || r[11] === 'true';
    const replied = (r[9]||'').toString().trim().length > 0;
    if (!read && !replied) count++;
  });
  return { success:true, count };
}

function replyFeedback(body) {
  if (!body.feedbackId || !body.reply) return { success:false, error:'feedbackId and reply required.' };
  const sh   = getSheet(SHEETS.FEEDBACK);
  _ensureFeedbackCols(sh);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === body.feedbackId.toString()) {
      sh.getRange(i+1, 10).setValue(body.reply);
      sh.getRange(i+1, 11).setValue(new Date().toISOString());
      sh.getRange(i+1, 12).setValue(true);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'Feedback not found.' };
}

function markFeedbackRead(body) {
  if (!body.feedbackId) return { success:false, error:'feedbackId required.' };
  const sh   = getSheet(SHEETS.FEEDBACK);
  _ensureFeedbackCols(sh);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === body.feedbackId.toString()) {
      sh.getRange(i+1, 12).setValue(true);
      SpreadsheetApp.flush();
      return { success:true };
    }
  }
  return { success:false, error:'Feedback not found.' };
}

function submitFeedback(body) {
  const sh = getSheet(SHEETS.FEEDBACK);
  _ensureFeedbackCols(sh);
  sh.appendRow([
    'fb_'+Date.now(),
    body.userId   || '',
    body.name     || 'Anonymous',
    body.email    || '',
    body.category || 'General',
    body.rating   || 0,
    body.message  || '',
    body.date     || '',
    new Date().toISOString(),
    '',    // AdminReply
    '',    // AdminReplyAt
    false, // AdminRead
  ]);
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
      id:             (r[0]||'').toString(),
      userId:         (r[1]||'').toString(),
      email:          (r[2]||'').toString(),
      date:           (r[3]||'').toString(),
      glassesTarget:  parseInt(r[4])||0,
      glassesDone:    parseInt(r[5])||0,
      timestamp:      (r[6]||'').toString(),
    }));
  return { success:true, logs };
}

// ════════════════════════════════════════════════════════════════
// PLAN MANAGEMENT
// ════════════════════════════════════════════════════════════════
function getActivePlan(userId, planKey) {
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet('PlanProgress');
  const data = sh.getDataRange().getValues();
  if (data.length<2) return { success:true, plan:null };
  // Optional planKey filter — when caller wants a specific plan (e.g. 'crosstraining')
  // it returns ONLY that plan or null. Without filter, returns the first REGISTERED
  // plan for backward compat with existing single-plan callers (running plan).
  const filterKey = planKey ? planKey.toString() : null;
  for (let i=1;i<data.length;i++) {
    const row = data[i];
    if ((row[1]||'').toString()!==userId.toString()) continue;
    if ((row[11]||'').toString()!=='REGISTERED') continue;
    if (filterKey && (row[3]||'').toString() !== filterKey) continue;
    return { success:true, plan:{
      planKey:      (row[3]||'').toString(),
      // Normalize via toYMD so a Date cell returns YYYY-MM-DD instead of the
      // full JS Date string ("Fri May 15 2026 00:00:00 GMT+0530 (India Standard
      // Time)") — which client code parsed as Invalid Date and surfaced as
      // "Week NaN of 8" on the Cross Training Plan tab. Falls back to the
      // raw cell value when toYMD can't recognise it (already-stringy data).
      startDate:    toYMD(row[4]) || (row[4]||'').toString(),
      registeredAt: (row[5]||'').toString(),
    }};
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
      planKey:       (r[3]||'').toString(),
      week:          parseInt(r[6])||0,
      day:           parseInt(r[7])||0,
      completedDate: (r[8]||'').toString(),
      distanceKm:    parseFloat(r[9])||0,
      durationSec:   parseInt(r[10])||0,
    }));
  return { success:true, completedDays:days };
}

function savePlanRegistration(body) {
  const { userId, email, planKey, startDate, registeredAt } = body;
  if (!userId||!planKey) return { success:false, error:'userId and planKey required.' };
  const sh   = getSheet('PlanProgress');
  ensureHeaders(sh,['RecordID','UserID','UserEmail','PlanKey','StartDate','RegisteredAt','Week','Day','CompletedDate','DistanceKm','DurationSec','Status','Timestamp']);
  const data = sh.getDataRange().getValues();
  // Dedup on userId + planKey + 'REGISTERED'.
  // Previously this matched ONLY on userId + 'REGISTERED', which meant
  // registering a second plan (e.g. crosstraining when running plan exists)
  // would overwrite the first one. Now each plan gets its own REGISTERED row.
  const planKeyStr = planKey.toString();
  for (let i=1;i<data.length;i++) {
    if ((data[i][1]||'').toString()===userId.toString() &&
        (data[i][3]||'').toString()===planKeyStr &&
        (data[i][11]||'').toString()==='REGISTERED') {
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
  const { userId, planKey } = body;
  if (!userId) return { success:false, error:'userId required.' };
  const sh   = getSheet('PlanProgress');
  const data = sh.getDataRange().getValues();
  // Optional planKey: with filter, only clear that specific plan. Without filter,
  // clears the first REGISTERED plan (backward compat).
  const filterKey = planKey ? planKey.toString() : null;
  for (let i=1;i<data.length;i++) {
    if ((data[i][1]||'').toString()!==userId.toString()) continue;
    if ((data[i][11]||'').toString()!=='REGISTERED') continue;
    if (filterKey && (data[i][3]||'').toString()!==filterKey) continue;
    sh.getRange(i+1,12).setValue('UNREGISTERED');
    SpreadsheetApp.flush();
    return { success:true };
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
  if (Array.isArray(logs))    { logs.forEach(log    => { logCompletion({ ...log, userId, email }); synced++; }); }
  if (Array.isArray(runLogs)) { runLogs.forEach(log => { logRun({ ...log, userId, email });         synced++; }); }
  return { success:true, synced };
}

// ════════════════════════════════════════════════════════════════
// USER ONBOARDING
// ════════════════════════════════════════════════════════════════
function saveOnboarding(body) {
  if (!body.userId) return { success:false, error:'userId required' };
  const sh = getSheet(SHEETS.ONBOARDING);
  ensureHeaders(sh, ['UserID','Email','Goal','Modules','Age','Weight','Height','Gender','FitnessLevel','SubmittedAt','UpdatedAt']);
  const data       = sh.getDataRange().getValues();
  const userId     = body.userId.toString();
  const modulesStr = Array.isArray(body.modules) ? body.modules.join(',') : (body.modules||'');
  let existingRow  = -1;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === userId) { existingRow = i + 1; break; }
  }
  const row = [
    userId, body.email||'', body.goal||'', modulesStr,
    body.age||'', body.weight||'', body.height||'', body.gender||'', body.fitnessLevel||'',
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
  ensureHeaders(sh, ['UserID','Email','Goal','Modules','Age','Weight','Height','Gender','FitnessLevel','SubmittedAt','UpdatedAt']);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0]||'').toString() === (userId||'').toString()) {
      return { success:true, onboarding:_onboardingRow(data[i]) };
    }
  }
  return { success:true, onboarding:null };
}

function getAllOnboarding() {
  const sh = getSheet(SHEETS.ONBOARDING);
  ensureHeaders(sh, ['UserID','Email','Goal','Modules','Age','Weight','Height','Gender','FitnessLevel','SubmittedAt','UpdatedAt']);
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
    submittedAt:  toISOStr(r[9])  || '',
    updatedAt:    toISOStr(r[10]) || '',
  };
}

// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — OneSignal REST API
// SETUP: Apps Script → Project Settings → Script Properties:
//   ONESIGNAL_APP_ID       = 5dfd18d7-bde4-4f26-a478-0f522b2f299f
//   ONESIGNAL_REST_API_KEY = <your REST API key>
// ════════════════════════════════════════════════════════════════

var MORNING_MESSAGES = [
  { title: '🌅 Rise & Grind!',            body: "Your muscles called — they're bored. Time to fix that! 💪" },
  { title: '🏆 Good Morning Champion!',   body: "The only workout you'll regret is the one you skipped! 🔥" },
  { title: '⏰ Wakey Wakey!',             body: "Your future self is at the gym waiting. Don't keep them waiting! 🏃" },
  { title: '☀️ Morning Motivation!',      body: "Coffee is great. But endorphins? Free and hit harder! ☕💪" },
  { title: '🚀 Let\'s GO!',              body: "Your body is a temple. Today we're doing renovations. 🔨💪" },
  { title: '📱 6 AM Wake Up Call!',      body: "The alarm rang. Your excuses are still sleeping. YOU don't have to be! ⚡" },
  { title: '🦁 Morning Legend!',         body: "Lions don't skip leg day. Be the lion. 💪" },
  { title: '✨ Rise & Shine!',            body: "Yesterday you said tomorrow. TODAY IS THAT TOMORROW. GO! 🏃" },
  { title: '🌄 Good Morning!',           body: "Your competition woke up at 5 AM. But you're here now — keep going! 💪" },
  { title: '🕺 Move Your Body!',         body: "Muscles are like WiFi. Use them or the connection gets weak! 📶" },
  { title: '🥇 Morning Champion!',       body: "Progress not perfection. One workout at a time. You've got this! 🌟" },
  { title: '😅 Time to Sweat!',          body: "Sweat is just your fat crying. Make it cry today! 🔥" },
  { title: '💪 New Day, New Gains!',     body: "Yesterday's soreness is today's strength. What are you building? 🏗️" },
  { title: '⚔️ Morning Warrior!',        body: "Warriors don't wait for motivation. They BECOME it. Let's GO! 🔥" },
  { title: '💊 Daily Dose of Awesome!',  body: "Side effects: confidence, energy, better sleep, happiness. Worth it! 😁" },
  { title: '💪 Strength Incoming!',      body: "Every rep is a vote for the person you want to become. Vote today! 🗳️" },
  { title: '🚫 No Excuses Today!',       body: "Too tired? Start with 5 minutes. Too busy? You're reading this! 😉" },
  { title: '💥 Midweek Push!',           body: "Halfway through the week. Don't slow down now! 🏁" },
  { title: '🏕️ Weekend Warrior!',        body: "No work today? Perfect — more energy for your workout! 💪" },
  { title: '🍳 Skip the paratha today?', body: "Your body has a better offer — 20 mins of cardio + actual energy all day! 🔥" },
  { title: '📦 Your workout is ready!',  body: "Estimated delivery time: right now. No waiting, no traffic. Just open FitFlow! 🏃" },
  { title: '🛵 Out for delivery: Gains', body: "Your daily fitness goals are waiting. Tap to accept! 💪" },
  { title: '⭐ Rate your morning!',      body: "Option A: Scroll reels. Option B: Crush a workout. One of these builds abs. 😏" },
  { title: '🔔 Order confirmed!',        body: "Your body placed an order for energy, confidence & good mood. Fulfil it now! 💪" },
  { title: '🎯 Today\'s special offer!', body: "Buy 1 workout, get: better sleep, more energy & a longer life. Free! 🏃" },
  { title: '📲 Message from Future You!', body: "Thank you for working out today. Trust me, you'll be glad you did. Now open FitFlow! 🙏" },
  { title: '🚨 Flash sale ends at 7AM!', body: "Morning metabolism boost — burns 2x more. Available only NOW. Go! ⚡" },
  { title: '🥘 Today\'s combo deal:',    body: "10 mins yoga + 10 mins cardio = zero stress + full energy. Better than chai! ☕" },
  { title: '📍 Your location: Bed',      body: "Suggested destination: FitFlow workout. ETA: 2 mins. Start now? 🏃" },
  { title: '☀️ Good morning, champion!',  body: "Before that first cup of coffee, get your body moving. 10 mins is all it takes! 💪🔥" },
  { title: '💪 Stop saying tomorrow!',     body: "Tomorrow keeps becoming another tomorrow. If not today, then when? Open FitFlow NOW! 🏃" },
  { title: '🔥 Listen up!',                body: "People who work out at 6 AM see the world differently. Be that person today! 🌅" },
  { title: '😤 Up and at it!',             body: "Sleep can wait until tonight. Open FitFlow right now and crush one set! 💪" },
  { title: '🏃 Your body is asking!',      body: "It's requesting some morning movement. Just 10 minutes — let's go! 🔥" },
  { title: '🛌 Still in bed?',           body: "Your blanket is lying to you. The gym won't. Let's go! 💪" },
  { title: '🐌 Slow start?',             body: "Even a 10-min walk counts. Start small, finish strong! 🚶" },
  { title: '🧠 Your brain just said:',   body: "\"I don't wanna workout.\" Your future self said: \"DO IT ANYWAY.\" Listen to them! 😤" },
  { title: '📺 Netflix can wait.',       body: "Your body cannot. 20 mins now = guilt-free binge later. Deal? 🤝" },
  { title: '🍕 Fun fact:',               body: "You burn 0 calories lying in bed reading this. FitFlow burns the rest. Open it! 🔥" },
  { title: '🦥 Sloth mode: OFF',         body: "Beast mode: loading… Open FitFlow to complete installation! ⚡" },
  { title: '😴 5 more minutes?',         body: "You said that 3 times already. The workout is still waiting. Come on! 💪" },
  { title: '🤔 Hot take:',               body: "People who work out in the morning don't cancel plans. They ARE the plan. 🔥" },
  { title: '🎵 Today\'s vibe check:',    body: "Sweaty > Lazy. Sore > Sorry. Strong > Struggling. Open FitFlow! 💪" },
  { title: '🧊 Cold water challenge:',   body: "Splash cold water on your face. Now you're awake. Now you have no excuse! 😂💪" },
  { title: '🔥 Keep your streak alive!', body: "Don't let today be the day you break it. Open FitFlow — it takes 2 mins! 🏃" },
  { title: '📅 Day is yours!',           body: "Make it count. One workout today = one step closer to the body you want. 💪" },
  { title: '🎯 Focus!',                  body: "Goals don't care about your mood. Open FitFlow and do the work! ⚡" },
  { title: '📈 Progress update:',        body: "The you from last month is watching. Don't disappoint them! 💪" },
  { title: '🏅 You\'re this close!',     body: "One workout away from a new personal best. Go get it! 🔥" },
  { title: '⏳ 30 days from now...',     body: "You'll either wish you started today, or be glad you did. Choose wisely! 💪" },
  { title: '🧱 Building blocks:',        body: "Day 1 is easy. Day 30 is where legends are made. Which one are you on? 🏆" },
  { title: '🌱 Small wins today =',      body: "Big results in 30 days. Open FitFlow and stack those wins! 📈" },
  { title: '💡 Reminder:',               body: "The best investment you'll ever make is in your own health. Spend 20 mins now! 💪" },
  { title: '🔑 Secret to success:',      body: "Show up. Even on days you don't feel like it. Especially those days. 💪" },
  { title: '🧘 Yoga time!',              body: "10 mins of morning yoga and your whole day changes. Try it — FitFlow has it ready! 🌿" },
  { title: '🏃 Running calling!',        body: "Morning air is free, GPS is ready, FitFlow is waiting. What's the excuse? 🌅" },
  { title: '🏋️ Gym day!',               body: "The weights are waiting. Your muscles are rested. Perfect combo. GO! 💪" },
  { title: '🤸 Stretch it out!',         body: "5 mins of stretching = no back pain all day. Cheap insurance! 🧘" },
  { title: '🔥 Cardio o\'clock!',        body: "Heart rate up, fat down, mood through the roof. That's morning cardio! ⚡" },
  { title: '💪 Calisthenics time!',      body: "No gym? No problem. Your bodyweight is the best equipment. Let's go! 🤸" },
  { title: '🎯 Core activated!',         body: "Strong core = strong life. 10 mins abs this morning. You won't regret it! 🔥" },
  { title: '🔬 Science says:',           body: "Morning workouts boost metabolism for 14 hours. That's the whole day. Go! 💪" },
  { title: '🧬 Fun body fact:',          body: "Exercise releases dopamine, serotonin AND endorphins. That's 3 happy chemicals. FREE. 😁" },
  { title: '💤 Sleep better tonight:',   body: "People who exercise in the morning sleep 65% deeper. Open FitFlow now! 🌙" },
  { title: '🧠 Brain boost incoming!',   body: "20 mins of cardio = better focus for 6 hours. Your most productive hack! ⚡" },
  { title: '❤️ Heart check:',            body: "15 mins of exercise today reduces heart disease risk by 14%. Worth it! 💪" },
  { title: '👀 While you slept...',      body: "Someone in your city already finished their workout. Still napping? 😤" },
  { title: '🏆 Leaderboard check:',      body: "Top FitFlow users are already active. Don't let the gap grow. Go! 🔥" },
  { title: '⚡ They\'re ahead of you!',  body: "The disciplined ones started 30 mins ago. You can still catch up. Open FitFlow! 💪" },
  { title: '😤 Prove them wrong!',       body: "Everyone who said you can't — imagine their face when you do. Let's GO! 🏆" },
  { title: '🌦️ Rainy morning?',          body: "Perfect excuse to do home cardio. FitFlow's indoor workouts are right here! 🏠💪" },
  { title: '🌞 Sunny morning!',          body: "Nature's pre-workout is free today. Go for a run before it gets hot! 🏃" },
  { title: '📅 Monday morning!',         body: "Set the tone for the whole week. One workout now = winning mindset all week! 💪" },
  { title: '🎉 It\'s Friday!',           body: "End the week strong. One last workout before the weekend. You deserve it! 🔥" },
  { title: '🌙 Slept well?',             body: "Your body is fully recharged. Your muscles are recovered. PERFECT timing. GO! ⚡" },
  { title: '🍚 Had idli for breakfast?', body: "That carb energy needs somewhere to go! FitFlow workout — perfect match! 💪" },
  { title: '☕ Chai is brewing...',       body: "While it cools, squeeze in 10 mins of stretching. Productive AND healthy! 🧘" },
  { title: '🥗 Eating clean today?',     body: "Pair it with a workout and watch the magic happen! Open FitFlow 🔥" },
  { title: '🍌 Had a banana?',           body: "That's 27g of carbs ready to fuel your workout. Don't waste the energy! 💪" },
  { title: '🌍 One life.',               body: "One body. One chance to make it strong. Today is part of that chance. 💪" },
  { title: '⏰ Time check:',             body: "In 30 mins you could finish a full workout. Or scroll Instagram. Choose! 📱🏃" },
  { title: '🤷 What\'s the worst?',      body: "Worst case: you sweat a little. Best case: you transform your life. Worth it! 💪" },
  { title: '🎭 Two versions of you:',    body: "One hits snooze. One hits the workout. Which one wins today? 💪" },
  { title: '🔮 Future you is watching.', body: "They're either proud or disappointed. Your choice, right now, today. GO! 🏆" },
  { title: '📖 Chapter today:',          body: "\"The day they showed up even when they didn't feel like it.\" Write it! ✍️💪" },
  { title: '💥 DO IT.',                  body: "Not tomorrow. Not after chai. NOW. Open FitFlow! 🔥" },
  { title: '🏃 GO.',                     body: "You already know you should. So just go. FitFlow is ready! ⚡" },
  { title: '🔥 TODAY.',                  body: "Not a perfect day. Not a free day. Just a workout day. Let's go! 💪" },
  { title: '⚡ NOW.',                    body: "The best time to work out is now. Second best is also now. GO! 🏃" },
  { title: '💪 MOVE.',                   body: "Your body was built to move. Give it what it wants. FitFlow → open! 🔥" },
  { title: '🫀 Love yourself?',          body: "Then move your body today. 20 mins is self-care, not sacrifice. 💪" },
  { title: '🧘 Mental health tip:',      body: "Exercise is the most underused antidepressant. Dose: 20 mins daily. Take it! 🌿" },
  { title: '✨ Glow up season:',         body: "It starts with one workout. Open FitFlow and begin yours today! 💪" },
  { title: '🌸 You deserve to feel good',body: "And 20 mins of movement will do exactly that. FitFlow has your back! 🌟" },
  { title: '🧡 Self care Sunday!',       body: "Rest is great. But an active rest = stretching + yoga. FitFlow has both! 🧘" },
  { title: '💥 Monday Momentum!',        body: "Win Monday and the whole week follows. Workout first, everything else after! 🔥" },
  { title: '🔥 Tuesday Power!',          body: "Tuesday is the most underrated day to have the best workout. Prove it! 💪" },
  { title: '⚡ Wednesday Warrior!',      body: "Hump day? More like PUMP day. Let's go! 🏋️" },
  { title: '🎯 Thursday Grind!',         body: "One more push before the weekend. Don't lose momentum now! 💪" },
  { title: '🙌 Friday Finisher!',        body: "End the week like a champion. One last workout. Let's close it out! 🏆" },
  { title: '🌟 Saturday Hustle!',        body: "Most people sleep in. You? You're building something. Keep going! 💪" },
  { title: '🌅 Sunday Reset!',           body: "Stretch, breathe, move. Set the tone for an incredible week ahead! 🧘" },
];

var EVENING_MESSAGES = [
  { title: '😮‍💨 Tired from work?',          body: "10 mins of stretching and you'll feel like a different person. Promise! 🧘" },
  { title: '💆 Stress leaving the body:',   body: "Destination: FitFlow workout. Duration: 20 mins. Guaranteed relief! 🔥" },
  { title: '🏢 Office didn\'t kill you!',   body: "You survived the meetings. Now reward yourself with endorphins. GO! 💪" },
  { title: '😤 Rough day?',                 body: "Don't eat your feelings. SWEAT them out. FitFlow evening workout — now! 🔥" },
  { title: '🖥️ Screen time: 8 hrs',         body: "Body movement time: 0 hrs. That's not a balance. Fix it now! 💪" },
  { title: '📧 Inbox cleared?',             body: "Now clear out that stress with a quick workout. You'll sleep like a baby! 🌙" },
  { title: '🤯 Brain is fried?',            body: "Switch off the mind, switch on the body. 20 mins = full reset! ⚡" },
  { title: '😩 Long day, huh?',             body: "The quickest way to feel better isn't Netflix — it's movement. Try it! 🏃" },
  { title: '🕐 End of shift!',              body: "Work is done. The REAL you — the strong, healthy one — needs attention now! 💪" },
  { title: '🏃 Work-to-workout mode:',      body: "One mode switch is all it takes. Lace up, open FitFlow, feel amazing! ⚡" },
  { title: '🤸 Your back called!',          body: "It says 8 hours at a desk was enough. 10 mins stretching — do it now! 🧘" },
  { title: '🪑 Sat all day?',               body: "Your spine deserves better. 10 mins evening stretch = no pain tomorrow! 🌿" },
  { title: '😫 Stiff neck & shoulders?',   body: "That's your body screaming for movement. FitFlow stretching routine — NOW! 🧘" },
  { title: '🦵 Legs feeling heavy?',        body: "3 mins of leg stretches and you'll feel like you're floating. Try it! 🌟" },
  { title: '🧘 Evening yoga calling!',      body: "Tired body + yoga = the best combo ever invented. 15 mins. Life-changing! 🌿" },
  { title: '🌿 Flexibility check!',         body: "Can you touch your toes? By next month you will — if you stretch today! 🤸" },
  { title: '💆 Neck pain?',                 body: "Don't sleep on it. Stretch it out first. FitFlow has the exact routine! 🧘" },
  { title: '🏋️ Lower back talking?',        body: "It wants 5 mins of core + stretching. Give it what it needs! 🔥" },
  { title: '🤲 Wrists and fingers stiff?',  body: "Typing all day does that. FitFlow desk-worker stretch routine fixes this! 🧘" },
  { title: '🧍 Posture check!',             body: "Sit up straight while reading this. Now imagine that ALL day. Do yoga! 🌿" },
  { title: '🛵 Evening delivery!',          body: "What's being delivered: stress relief, better sleep, good mood. Open FitFlow! 😁" },
  { title: '⭐ Rate your day!',             body: "Bad day? Workout = 5 stars tomorrow. Good day? Workout = even better! 💪" },
  { title: '🛒 Your cart:',                 body: "1x Evening workout added. Complete checkout to unlock: amazing sleep tonight! 🌙" },
  { title: '📦 Package waiting!',           body: "Contents: 20 mins of movement, endorphins, good mood. Collect now! ⚡" },
  { title: '🍽️ Dinner in 1 hour?',          body: "Perfect time for a 20-min workout first. Earn that meal! 🔥" },
  { title: '🎁 Free with every workout:',   body: "Better sleep, less stress, more energy tomorrow. No coupon needed! 😁" },
  { title: '⏰ Limited time offer!',        body: "Evening workout window closing in 2 hours. Don't miss it! Open FitFlow! 💪" },
  { title: '🔔 Reminder from your body:',   body: "\"Hey, we haven't moved since this morning. Can we please?\" 🏃" },
  { title: '⚡ Second wind incoming!',      body: "A 20-min workout gives you 3 hours of evening energy. Science. Facts! 🔬" },
  { title: '🔋 Recharge mode:',            body: "Counterintuitive but true — exercise energises more than rest. Try it! ⚡" },
  { title: '🌙 Sleep hack:',               body: "Evening workout = 2x deeper sleep tonight. That's tomorrow's superpower! 💤" },
  { title: '😴 Want to sleep better?',     body: "20 mins of movement now = the best night's sleep you've had in weeks! 🌙" },
  { title: '🎯 Evening routine:',          body: "Shower → workout → dinner → sleep. The formula for a GREAT tomorrow! 💪" },
  { title: '🌆 Golden hour!',              body: "Between work and dinner is the perfect workout window. Use it! 🏃" },
  { title: '🍛 Dinner smells good!',       body: "Earn it with a 20-min workout first. Everything tastes better after! 😋" },
  { title: '🫕 Biryani tonight?',          body: "20 mins of cardio and you can have it guilt-free. Fair deal? Let's go! 🔥" },
  { title: '🍦 Craving something sweet?',  body: "Your body wants endorphins more. A workout gives them FREE. Open FitFlow! 💪" },
  { title: '🥗 Eating healthy tonight?',   body: "Pair it with a workout and you're basically a superhero. GO! ⚡" },
  { title: '☕ Evening chai time?',         body: "Great! Have it after a 15-min yoga session. 10x more relaxing, trust us! 🧘" },
  { title: '🍕 Friday night treat?',       body: "Earn it! A quick 20-min workout first makes the food taste better. Real! 😋" },
  { title: '🧠 Anxiety check:',            body: "Feeling anxious about tomorrow? A workout will delete 80% of that. Go! 🌿" },
  { title: '😔 Low mood?',                 body: "Your body has a built-in antidepressant. It's called exercise. Activate it! 💪" },
  { title: '🌊 Overwhelmed?',              body: "20 mins of movement resets your nervous system. It's science. Try it! 🧘" },
  { title: '🧘 Clear your head!',          body: "Best therapy after a hard day: yoga + deep breathing. FitFlow has it! 🌿" },
  { title: '😤 Frustration?',              body: "Channel it into a workout. Anger is just pre-workout you haven't used! 🔥" },
  { title: '🕊️ Find your calm!',           body: "10 mins evening yoga = peace you can't buy. It's free in FitFlow! 🌿" },
  { title: '💭 Can\'t stop thinking?',     body: "Move your body and quiet your mind. That's what exercise does. GO! 🧘" },
  { title: '🔥 Streak check!',             body: "Don't let today be a zero day. Even 10 mins keeps the streak alive! 💪" },
  { title: '📊 Daily goal status:',        body: "Still pending: today's workout. Close it out now! 10 mins is enough! ⚡" },
  { title: '✅ One thing left:',           body: "Everything else is done. Your workout is the only thing missing today! 💪" },
  { title: '🏅 So close!',                body: "You're one workout away from another streak day. Don't stop now! 🔥" },
  { title: '📅 Don\'t make it a rest day', body: "unless you planned it. If you didn't — 15 mins of yoga counts! 🧘" },
  { title: '💯 100% today?',              body: "You've done everything else. Finish strong with a quick evening session! 💪" },
  { title: '👀 Fun fact:',                 body: "People who work out in the evening are 40% less stressed at night. Be one! 🌙" },
  { title: '🏆 Top performers:',           body: "All have one thing in common — they didn't skip evening workouts. Join them! 💪" },
  { title: '😤 Your friend worked out.',   body: "Are you going to let them get ahead? Open FitFlow. NOW! 🔥" },
  { title: '📈 While you relaxed...',      body: "Your healthier future self was built in moments like this. Create one! 💪" },
  { title: '😤 Worked hard all day?',       body: "Now give your body some love. 15 mins of stretching and you'll feel amazing! 🧘" },
  { title: '🏃 Evening already!',           body: "Office is done. Open FitFlow and crush a quick workout — you've earned it! 💪" },
  { title: '😩 Feeling tired?',             body: "Exercise actually reduces fatigue — sounds backwards but it's true. Try it today! ⚡" },
  { title: '🌙 Want better sleep tonight?', body: "A 20-min evening workout gives incredible sleep. Try it and thank yourself tomorrow! 💤" },
  { title: '🍛 Before dinner tonight!',     body: "Sneak in a quick workout. Trust us — food tastes 10x better afterwards! 😋" },
  { title: '🤔 Real talk:',               body: "The couch will be there after your workout. Your motivation might not. GO! 💪" },
  { title: '📺 Netflix can wait!',         body: "Your show auto-saves. Your health doesn't. Workout first, binge after! 🔥" },
  { title: '🛋️ Couch is tempting...',      body: "But your future abs are more tempting. 20 mins. Go! 💪" },
  { title: '😂 Your muscles tomorrow:',   body: "\"Why didn't you workout yesterday?\" Don't let them ask that. GO NOW! 🔥" },
  { title: '🤡 Plot twist:',              body: "You feel MORE energetic AFTER a workout. Even evening ones. Wild, right? ⚡" },
  { title: '🐢 10 mins slow yoga?',       body: "Counts. 10 mins brisk walk? Counts. Just move! FitFlow has options! 🌿" },
  { title: '🌟 Dream body?',              body: "It's built in evenings like this one. When it's easy to say no. SAY YES! 💪" },
  { title: '🚀 6 months from now:',       body: "You'll thank every evening you chose to move instead of scroll. GO! 📈" },
  { title: '💎 Discipline > Motivation',  body: "Motivation comes and goes. Discipline shows up at 7 PM anyway. Be disciplined! 💪" },
  { title: '🌙 Evening routine matters!', body: "People with evening workout habits are 60% more consistent. Build yours now! 📊" },
  { title: '✨ Version 2.0 of you:',      body: "Starts tonight. With this workout. With this choice. Open FitFlow! 🔥" },
  { title: '🏗️ Building yourself:',       body: "Brick by brick. Workout by workout. Today's evening session is one brick. 💪" },
  { title: '🌙 Wind down right!',         body: "Not with screens — with stretching. Your body and mind will thank you! 🧘" },
  { title: '😌 Peaceful evening hack:',   body: "15 mins yoga before dinner = the most relaxed you've felt all week! 🌿" },
  { title: '🌸 Evening ritual:',          body: "Move → shower → eat → sleep. In that order. Best formula ever. 💪" },
  { title: '💤 Deep sleep tonight?',      body: "7 PM workout is the proven trigger. FitFlow has 15-min routines. Perfect! 🌙" },
  { title: '🌟 End the day strong!',      body: "Don't just survive the day — finish it with intention. Workout = intention! 💪" },
  { title: '💪 STRETCH.',                body: "Just 10 minutes. Your back has been waiting all day. Do it now! 🧘" },
  { title: '🔥 EVENING.',               body: "Workouts hit different when the day is done. Prove it tonight! ⚡" },
  { title: '⚡ MOVE.',                   body: "You've been sitting too long. FitFlow. Now. Go! 🏃" },
  { title: '🎯 FINISH IT.',             body: "The day isn't complete without moving your body. 15 mins. GO! 💪" },
  { title: '🌙 TONIGHT.',               body: "The version of you that works out tonight wins tomorrow. Choose them! 🏆" },
  { title: '💥 Monday done!',            body: "Celebrate by crushing an evening workout. Set the tone for the week! 🔥" },
  { title: '🔥 Tuesday evening grind!',  body: "Two-a-day? No. Just finishing what morning couldn't. Let's go! 💪" },
  { title: '⚡ Wednesday check-in!',     body: "Midweek body check: did you move enough today? If not — now's the time! 🏃" },
  { title: '🎯 Thursday push!',          body: "One more evening grind before the weekend. Make it count! 💪" },
  { title: '🎉 TGIF workout!',           body: "Because the best way to start the weekend is sweaty and proud! 🔥" },
  { title: '🌟 Saturday evening!',       body: "Family? Friends? Check. But did you move YOUR body today? FitFlow! 💪" },
  { title: '🧘 Sunday evening ritual!',  body: "Tomorrow is Monday. Prepare your body AND mind with evening yoga. 🌿" },
  { title: '🦵 Leg day recovery?',       body: "10 mins of light stretching now = no soreness tomorrow. Smart move! 🧘" },
  { title: '💪 Arms tired?',             body: "That's the gains being made! Stretch them out and let them grow! 🏋️" },
  { title: '🔥 Core strength:',          body: "10 mins of ab work before bed is the most efficient workout. DO IT! 💪" },
  { title: '🏃 Didn\'t run today?',      body: "Even a 15-min walk after dinner counts as cardio. FitFlow tracks it! 🌙" },
  { title: '🤸 Flexibility matters!',    body: "Most injuries happen to inflexible people. 10 mins tonight prevents them! 🧘" },
];

function getTodaysMessage() {
  var day = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return MORNING_MESSAGES[day % MORNING_MESSAGES.length];
}

function getTonightsMessage() {
  var day = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return EVENING_MESSAGES[(day + 50) % EVENING_MESSAGES.length];
}

// ════════════════════════════════════════════════════════════════
// ONESIGNAL — DEVICE HELPERS
// ════════════════════════════════════════════════════════════════
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
    if (code !== 200) { Logger.log('Could not list players: HTTP ' + code); return []; }
    var data    = JSON.parse(res.getContentText());
    var players = data.players || [];
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
    Logger.log('Found ' + ids.length + ' subscribed device(s)' +
      (userIdFilter ? ' (filtered to ' + userIds.length + ' users)' : ' of ' + players.length + ' total'));
    return ids;
  } catch (e) {
    Logger.log('Could not fetch subscribers: ' + e.message);
    return [];
  }
}

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
    if (res.getResponseCode() !== 200) return { success:false, error:'HTTP ' + res.getResponseCode() };
    var data    = JSON.parse(res.getContentText());
    var players = data.players || [];
    var users   = getAllUsers() || [];
    var userByExtId = {};
    users.forEach(function(u) { if (u.id) userByExtId[u.id] = u; });
    var devices = players
      .filter(function(p) { return p.invalid_identifier !== true && p.identifier; })
      .map(function(p) {
        var u = userByExtId[p.external_user_id] || {};
        if (!u.email && p.tags && p.tags.email) {
          var byEmail = users.find(function(uu) {
            return (uu.email||'').toLowerCase() === (p.tags.email||'').toLowerCase();
          });
          if (byEmail) u = byEmail;
        }
        return {
          subscriptionId: p.id,
          deviceModel:    p.device_model || 'Unknown',
          deviceOS:       p.device_os    || '',
          lastActive:     p.last_active ? new Date(p.last_active * 1000).toISOString() : '',
          name:           u.name  || (p.tags && p.tags.name)  || '',
          email:          u.email || (p.tags && p.tags.email) || '',
          userId:         p.external_user_id || '',
        };
      });
    return { success:true, count:devices.length, devices:devices };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

// ════════════════════════════════════════════════════════════════
// SMART PUSH HELPERS
// ════════════════════════════════════════════════════════════════

// Returns { workedOut: [playerIds], notYet: [playerIds] }
// by checking CompletionLog + RunningLog for today
function _segmentDevicesByActivity() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { workedOut:[], notYet:[] };

  var today = _ymdLocal();

  // Get all today's logs — both workout + run
  var allLogs = getAllLogs()    || [];
  var allRuns = getAllRunLogs() || [];
  var activeToday = {};
  allLogs.forEach(function(l) { if ((l.date||'').substring(0,10) === today) activeToday[l.userId] = true; });
  allRuns.forEach(function(r) { if ((r.date||'').substring(0,10) === today) activeToday[r.userId] = true; });

  // Get all subscribed devices from OneSignal
  try {
    var url = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Basic ' + apiKey },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) return { workedOut:[], notYet:[] };
    var players = JSON.parse(res.getContentText()).players || [];
    var valid   = players.filter(function(p) { return p.invalid_identifier !== true && p.identifier; });

    var workedOut = [], notYet = [];
    valid.forEach(function(p) {
      var uid = p.external_user_id || '';
      if (uid && activeToday[uid]) {
        workedOut.push(p.id);
      } else {
        notYet.push(p.id);
      }
    });
    Logger.log('Today segments — Worked out: ' + workedOut.length + ' | Not yet: ' + notYet.length);
    return { workedOut: workedOut, notYet: notYet };
  } catch(e) {
    Logger.log('Segment error: ' + e.message);
    return { workedOut:[], notYet:[] };
  }
}

// Messages for users who ALREADY worked out today (evening only — praise them)
var WELL_DONE_MESSAGES = [
  { title: '🏆 You crushed it today!',        body: "Workout done and logged. That's the discipline that builds champions. Rest well! 💪" },
  { title: '✅ Mission complete!',              body: "You showed up today when it mattered. That's what separates the best from the rest! 🔥" },
  { title: '🎉 Today: DONE!',                  body: "Your future self is already grateful. Recovery mode ON — eat well, sleep well! 🌙" },
  { title: '💪 Beast mode: activated!',         body: "Workout logged. Endorphins delivered. Repeat tomorrow? We'll be here! 🏃" },
  { title: "🌟 You're on a roll!",             body: "Another workout in the books. Keep stacking those wins — the results are coming! 📈" },
  { title: '🔥 Consistency is your superpower',body: "Today's workout is done. Tomorrow's gains are already in progress. Rest up! 💤" },
  { title: "😤 That's how it's done!",        body: "You didn't wait for motivation — you went anyway. That's the real secret. 💪" },
  { title: '🧠 Smart move today!',              body: "Exercise = dopamine + serotonin + endorphins. You just dosed yourself. Well done! 😁" },
  { title: '📊 Streak: growing!',               body: "You worked out today. The streak continues. Don't break it tomorrow! 🔥" },
  { title: '🌙 Sleep well tonight!',            body: "You earned it. Post-workout sleep is the deepest, most restorative kind. Enjoy! 💤" },
];

function getWellDoneMessage() {
  var day = Math.floor((new Date() - new Date(new Date().getFullYear(),0,0)) / 86400000);
  return WELL_DONE_MESSAGES[day % WELL_DONE_MESSAGES.length];
}

function _sendPushToIds(appId, apiKey, deviceIds, msg, buttons) {
  if (!deviceIds || !deviceIds.length) return { success:false, error:'No device IDs' };
  var payload = {
    app_id:             appId,
    include_player_ids: deviceIds,
    headings:           { en: msg.title },
    contents:           { en: msg.body  },
    web_url:            'https://fitflowpro.in/index.html',
    chrome_web_icon:    'https://fitflowpro.in/icons/icon-192.png',
    chrome_web_badge:   'https://fitflowpro.in/icons/icon-192.png',
    priority: 10,
    ttl:      86400,
  };
  if (buttons) payload.web_buttons = buttons;
  var res    = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
    method:'post', contentType:'application/json',
    headers:{ 'Authorization':'Basic ' + apiKey },
    payload:JSON.stringify(payload), muteHttpExceptions:true,
  });
  var code   = res.getResponseCode();
  var parsed = {}; try { parsed = JSON.parse(res.getContentText()); } catch(e) {}
  if (code >= 200 && code < 300 && parsed.id) {
    return { success:true, id:parsed.id, recipients:parsed.recipients };
  }
  return { success:false, error:'HTTP ' + code };
}

// ════════════════════════════════════════════════════════════════
// PUSH SEND FUNCTIONS
// ════════════════════════════════════════════════════════════════
function sendDailyPushNotifications() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    Logger.log('OneSignal credentials missing.');
    return { success:false, error:'Missing OneSignal credentials' };
  }

  // Morning: everyone gets a motivational push to START their day
  // No segmentation needed at 6AM — nobody has worked out yet
  var msg       = getTodaysMessage();
  var deviceIds = _getSubscribedDeviceIds();
  if (!deviceIds.length) {
    Logger.log('No subscribed devices found — cannot send push');
    return { success:false, error:'No subscribed devices' };
  }

  var buttons = [
    { id:'open',  text:"💪 Let's Go!", icon:'https://fitflowpro.in/icons/icon-192.png', url:'https://fitflowpro.in/index.html' },
    { id:'later', text:"⏰ Later",      icon:'https://fitflowpro.in/icons/icon-192.png' },
  ];

  try {
    var result = _sendPushToIds(appId, apiKey, deviceIds, msg, buttons);
    if (result.success) {
      Logger.log('✅ Morning push sent to ' + deviceIds.length + ' devices. id: ' + result.id);
      return { success:true, id:result.id, targeted:deviceIds.length };
    }
    Logger.log('Morning push failed: ' + result.error);
    return result;
  } catch(e) {
    Logger.log('Morning push error: ' + e.message);
    return { success:false, error:e.message };
  }
}

function sendEveningPushNotifications() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) {
    Logger.log('OneSignal credentials missing.');
    return { success:false, error:'Missing OneSignal credentials' };
  }

  // Evening: SMART segmentation
  // Users who worked out today  → "Well done!" praise message
  // Users who haven't yet       → motivational push to still go
  var segments  = _segmentDevicesByActivity();
  var totalSent = 0;
  var results   = {};

  // Group 1: Already worked out — send praise (no action buttons needed)
  if (segments.workedOut.length > 0) {
    var praiseMsg = getWellDoneMessage();
    try {
      var r1 = _sendPushToIds(appId, apiKey, segments.workedOut, praiseMsg, null);
      Logger.log('✅ Praise push → ' + segments.workedOut.length + ' users who worked out. id: ' + r1.id);
      results.praise = r1;
      totalSent += segments.workedOut.length;
    } catch(e) { Logger.log('Praise push error: ' + e.message); }
  }

  // Group 2: Haven't worked out yet — send motivational push with action button
  if (segments.notYet.length > 0) {
    var motivMsg = getTonightsMessage();
    var buttons  = [
      { id:'open',  text:"💪 Open FitFlow", icon:'https://fitflowpro.in/icons/icon-192.png', url:'https://fitflowpro.in/index.html' },
      { id:'later', text:"⏰ Later",         icon:'https://fitflowpro.in/icons/icon-192.png' },
    ];
    try {
      var r2 = _sendPushToIds(appId, apiKey, segments.notYet, motivMsg, buttons);
      Logger.log('✅ Motivational push → ' + segments.notYet.length + ' users who have not worked out yet. id: ' + r2.id);
      results.motivational = r2;
      totalSent += segments.notYet.length;
    } catch(e) { Logger.log('Motivational push error: ' + e.message); }
  }

  if (totalSent === 0) {
    Logger.log('No subscribed devices found');
    return { success:false, error:'No subscribed devices' };
  }

  Logger.log('✅ Evening smart push complete. Praised: ' + segments.workedOut.length + ' | Motivated: ' + segments.notYet.length);
  return { success:true, praised:segments.workedOut.length, motivated:segments.notYet.length, total:totalSent, results:results };
}

function sendCustomPush(body) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { success:false, error:'Missing OneSignal credentials' };
  if (!body || !body.title || !body.message) return { success:false, error:'title and message required' };
  var deviceIds = _getSubscribedDeviceIds(body.targetUserIds);
  if (!deviceIds.length) {
    var errMsg = body.targetUserIds && body.targetUserIds.length
      ? 'None of the selected users have subscribed devices'
      : 'No subscribed devices found. Have any users opted in via the bell toggle?';
    return { success:false, error:errMsg };
  }
  var payload = {
    app_id:             appId,
    include_player_ids: deviceIds,
    headings:           { en: String(body.title).substring(0, 80) },
    contents:           { en: String(body.message).substring(0, 240) },
    web_url:            'https://fitflowpro.in/index.html',
    chrome_web_icon:    'https://fitflowpro.in/icons/icon-192.png',
    chrome_web_badge:   'https://fitflowpro.in/icons/icon-192.png',
    priority: 10,
    ttl:      86400,
  };
  try {
    var res     = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method:'post', contentType:'application/json',
      headers:{ 'Authorization':'Basic ' + apiKey },
      payload:JSON.stringify(payload), muteHttpExceptions:true,
    });
    var code    = res.getResponseCode();
    var resBody = res.getContentText();
    var parsed  = {}; try { parsed = JSON.parse(resBody); } catch(e) {}
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
      Logger.log('✅ Custom push sent. Targeted: ' + deviceIds.length + ' devices. id: ' + parsed.id);
      try {
        var sh = getSheet('AdminPushLog');
        ensureHeaders(sh, ['SentAt','Title','Message','Recipients','NotificationID','SentBy']);
        sh.appendRow([new Date(), body.title, body.message, deviceIds.length, parsed.id, body.sentBy||'']);
      } catch(e) { Logger.log('Audit log skipped: ' + e.message); }
      return { success:true, recipients:parsed.recipients, id:parsed.id, targeted:deviceIds.length };
    }
    return { success:false, error:'HTTP ' + code, body:resBody.substring(0, 500) };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

function sendPushToUser(subscriptionId, title, body, url) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { success:false, error:'Missing OneSignal credentials' };
  if (!subscriptionId) return { success:false, error:'subscriptionId required' };
  var payload = {
    app_id:             appId,
    include_player_ids: [subscriptionId],
    headings:           { en: title || 'FitFlow Pro' },
    contents:           { en: body  || 'You have a new update!' },
    web_url:            url || 'https://fitflowpro.in/index.html',
    chrome_web_icon:    'https://fitflowpro.in/icons/icon-192.png',
    chrome_web_badge:   'https://fitflowpro.in/icons/icon-192.png',
    priority:           10,
  };
  try {
    var res  = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
      method:'post', contentType:'application/json',
      headers:{'Authorization':'Basic ' + apiKey},
      payload:JSON.stringify(payload), muteHttpExceptions:true,
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) return { success:true };
    return { success:false, error:'HTTP ' + code, body:res.getContentText().substring(0, 200) };
  } catch(e) { return { success:false, error:e.message }; }
}

function getAdminPushLog() {
  try {
    var sh   = getSheet('AdminPushLog');
    ensureHeaders(sh, ['SentAt','Title','Message','Recipients','NotificationID','SentBy']);
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return { success:true, history:[] };
    return {
      success: true,
      history: data.slice(1).reverse().slice(0, 50).map(function(r) {
        return {
          sentAt:         toISOStr(r[0]) || '',
          title:          (r[1]||'').toString(),
          message:        (r[2]||'').toString(),
          recipients:     r[3] || 0,
          notificationId: (r[4]||'').toString(),
          sentBy:         (r[5]||'').toString(),
        };
      }),
    };
  } catch (e) {
    return { success:false, error:e.message };
  }
}

// ════════════════════════════════════════════════════════════════
// DIAGNOSTIC & CLEANUP TOOLS
// ════════════════════════════════════════════════════════════════
function checkOneSignalSubscribers() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing OneSignal credentials in Script Properties'); return; }
  Logger.log('Using App ID: ' + appId);
  Logger.log('API Key length: ' + apiKey.length + ' chars (should be 48+)');
  try {
    var res  = UrlFetchApp.fetch('https://api.onesignal.com/apps/' + appId, {
      method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true,
    });
    var code = res.getResponseCode();
    var body = res.getContentText();
    Logger.log('App info HTTP ' + code + ': ' + body.substring(0, 1000));
    if (code === 200) {
      var info = JSON.parse(body);
      Logger.log('========== OneSignal App: ' + info.name + ' ==========');
      Logger.log('  Total subscribers: '        + (info.players              || 0));
      Logger.log('  Messageable subscribers: '  + (info.messageable_players  || 0));
      Logger.log('  Created: '                  + info.created_at);
    }
  } catch (e) { Logger.log('Error: ' + e.message); }
}

function cleanupInvalidDevices() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing creds'); return; }
  try {
    var url     = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res     = UrlFetchApp.fetch(url, { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
    var players = (JSON.parse(res.getContentText()).players) || [];
    var invalid = players.filter(function(p) { return p.invalid_identifier === true || !p.identifier; });
    Logger.log('Found ' + invalid.length + ' invalid devices (out of ' + players.length + ' total)');
    var deleted = 0, failed = 0;
    invalid.forEach(function(p) {
      try {
        var dr = UrlFetchApp.fetch('https://api.onesignal.com/players/' + p.id + '?app_id=' + appId,
          { method:'delete', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
        if (dr.getResponseCode() === 200) { deleted++; Logger.log('  ✅ Deleted ' + p.id.substring(0,8)); }
        else { failed++; Logger.log('  ❌ Failed ' + p.id.substring(0,8) + ': HTTP ' + dr.getResponseCode()); }
      } catch (e) { failed++; Logger.log('  ❌ Error: ' + e.message); }
    });
    Logger.log('Cleanup complete — Deleted: ' + deleted + ' | Failed: ' + failed);
    return { deleted:deleted, failed:failed, remaining:players.length - deleted };
  } catch (e) { Logger.log('Error: ' + e.message); return { error:e.message }; }
}

function cleanupDuplicateDevices() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing creds'); return; }
  try {
    var url     = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res     = UrlFetchApp.fetch(url, { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
    var players = (JSON.parse(res.getContentText()).players) || [];
    var groups  = {};
    players.forEach(function(p) {
      var key = (p.external_user_id || 'none') + '|' + (p.device_model || 'unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var toDelete = [];
    Object.keys(groups).forEach(function(key) {
      var group = groups[key];
      if (group.length <= 1) return;
      group.sort(function(a, b) {
        var aValid = a.invalid_identifier !== true && !!a.identifier;
        var bValid = b.invalid_identifier !== true && !!b.identifier;
        if (aValid !== bValid) return bValid - aValid;
        return (b.last_active || 0) - (a.last_active || 0);
      });
      Logger.log('Group [' + key + '] has ' + group.length + ' records — keeping ' + group[0].id.substring(0,8) + '...');
      for (var i = 1; i < group.length; i++) toDelete.push(group[i]);
    });
    Logger.log('Will delete ' + toDelete.length + ' duplicate(s)');
    var deleted = 0;
    toDelete.forEach(function(p) {
      try {
        var dr = UrlFetchApp.fetch('https://api.onesignal.com/players/' + p.id + '?app_id=' + appId,
          { method:'delete', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
        if (dr.getResponseCode() === 200) { deleted++; Logger.log('  ✅ Deleted ' + p.id.substring(0,8)); }
        else { Logger.log('  ❌ Failed ' + p.id.substring(0,8) + ': HTTP ' + dr.getResponseCode()); }
      } catch (e) { Logger.log('  ❌ Error: ' + e.message); }
    });
    Logger.log('Done. Deleted ' + deleted + ' duplicates.');
    return { deleted:deleted };
  } catch (e) { Logger.log('Error: ' + e.message); return { error:e.message }; }
}

function compareDevicesHealth() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing creds'); return; }
  try {
    var url     = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
    var res     = UrlFetchApp.fetch(url, { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
    var players = (JSON.parse(res.getContentText()).players) || [];
    Logger.log('========== Device Health Report (' + players.length + ' total) ==========');
    var now = new Date().getTime() / 1000;
    players.forEach(function(p, i) {
      var lastActive        = p.last_active ? new Date(p.last_active * 1000) : null;
      var hoursSinceActive  = lastActive ? Math.round((now - p.last_active) / 3600) : 'never';
      var typeLabel         = p.device_type === 5 ? 'Chrome' : p.device_type === 1 ? 'Android' : p.device_type === 0 ? 'iOS' : 'Other';
      Logger.log('Device #' + (i+1) + ' [' + p.id.substring(0,8) + '...]');
      Logger.log('  Type: ' + p.device_type + ' (' + typeLabel + ') | Model: ' + (p.device_model||'N/A') + ' | OS: ' + (p.device_os||'N/A'));
      Logger.log('  External user ID: ' + (p.external_user_id || 'NONE'));
      Logger.log('  Subscribed: ' + (p.invalid_identifier === true ? '❌ INVALID' : (p.identifier ? '✅ YES' : '❌ NO TOKEN')));
      Logger.log('  Last active: ' + (lastActive ? lastActive.toString() : 'never') + ' (' + hoursSinceActive + 'h ago)');
      Logger.log('  notification_types: ' + p.notification_types);
      Logger.log('---');
    });
  } catch (e) { Logger.log('Error: ' + e.message); }
}

function checkLastPushDelivery() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing OneSignal credentials'); return; }
  try {
    var url    = 'https://api.onesignal.com/notifications?app_id=' + appId + '&limit=5';
    var res    = UrlFetchApp.fetch(url, { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
    var data   = JSON.parse(res.getContentText());
    var notifs = data.notifications || [];
    Logger.log('========== Last 5 notifications ==========');
    notifs.forEach(function(n, i) {
      Logger.log((i+1) + '. ID: ' + n.id + ' | ' + (n.headings && n.headings.en));
      Logger.log('   Sent: ' + new Date(n.queued_at * 1000).toString());
      Logger.log('   Successful: ' + n.successful + ' | Failed: ' + n.failed + ' | Received: ' + (n.received||'N/A'));
    });
    if (notifs.length > 0) {
      var detailRes = UrlFetchApp.fetch(
        'https://api.onesignal.com/notifications/' + notifs[0].id + '?app_id=' + appId,
        { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true }
      );
      var detail = JSON.parse(detailRes.getContentText());
      Logger.log('Platform stats (most recent): ' + JSON.stringify(detail.platform_delivery_stats || {}));
    }
  } catch (e) { Logger.log('Error: ' + e.message); }
}

function testPushToDevice(playerId) {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) { Logger.log('❌ Missing creds'); return; }
  if (!playerId) {
    var ids = _getSubscribedDeviceIds();
    if (!ids.length) { Logger.log('No subscribed devices'); return; }
    playerId = ids[0];
    Logger.log('No playerId provided, using first: ' + playerId);
  }
  var payload = {
    app_id:             appId,
    include_player_ids: [playerId],
    headings:           { en: 'Test Push 🧪' },
    contents:           { en: 'If you see this, your device is receiving notifications!' },
    web_url:            'https://fitflowpro.in/index.html',
  };
  var res = UrlFetchApp.fetch('https://api.onesignal.com/notifications', {
    method:'post', contentType:'application/json',
    headers:{ 'Authorization':'Basic ' + apiKey },
    payload:JSON.stringify(payload), muteHttpExceptions:true,
  });
  Logger.log('Test push to ' + playerId + ' → HTTP ' + res.getResponseCode() + ': ' + res.getContentText());
}

function debugListAllPlayers() {
  var props  = PropertiesService.getScriptProperties();
  var appId  = props.getProperty('ONESIGNAL_APP_ID');
  var apiKey = props.getProperty('ONESIGNAL_REST_API_KEY');
  var url    = 'https://api.onesignal.com/players?app_id=' + appId + '&limit=300';
  try {
    var res  = UrlFetchApp.fetch(url, { method:'get', headers:{ 'Authorization':'Basic ' + apiKey }, muteHttpExceptions:true });
    var code = res.getResponseCode();
    var body = res.getContentText();
    Logger.log('HTTP ' + code + ' | Raw body length: ' + body.length);
    if (code !== 200) { Logger.log('Error: ' + body.substring(0, 500)); return; }
    var players = (JSON.parse(body).players) || [];
    Logger.log('Total players: ' + players.length);
    players.forEach(function(p, i) {
      Logger.log('Player #' + (i+1) + ': id=' + p.id + ' | type=' + p.device_type +
        ' | model=' + (p.device_model||'?') + ' | invalid=' + p.invalid_identifier +
        ' | token=' + (p.identifier ? p.identifier.substring(0,20)+'...' : 'null'));
    });
  } catch (e) { Logger.log('Error: ' + e.message); }
}

// ════════════════════════════════════════════════════════════════
// TRIGGER MANAGEMENT
// ════════════════════════════════════════════════════════════════
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyPushNotifications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyPushNotifications').timeBased().everyDays(1).atHour(6).create();
  Logger.log('✅ Morning 6 AM trigger created!');
}

function createEveningTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendEveningPushNotifications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendEveningPushNotifications').timeBased().everyDays(1).atHour(19).create();
  Logger.log('✅ Evening 7 PM trigger created!');
}

function createAllTriggers() {
  createDailyTrigger();
  createEveningTrigger();
  Logger.log('✅ Both morning (6 AM) and evening (7 PM) triggers active!');
}

function deleteDailyTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendDailyPushNotifications') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Deleted ' + n + ' morning trigger(s).');
}

function deleteEveningTrigger() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'sendEveningPushNotifications') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Deleted ' + n + ' evening trigger(s).');
}

function deleteAllTriggers() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'sendDailyPushNotifications' || fn === 'sendEveningPushNotifications') {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  Logger.log('Deleted ' + n + ' trigger(s).');
}

// ════════════════════════════════════════════════════════════════
// TEST RUNNERS (run manually from Apps Script editor)
// ════════════════════════════════════════════════════════════════
function testPushNotification() {
  var result = sendDailyPushNotifications();
  Logger.log('Morning test result: ' + JSON.stringify(result));
}

function testEveningPushNotification() {
  var result = sendEveningPushNotifications();
  Logger.log('Evening test result: ' + JSON.stringify(result));
}

function testGoogleLogin() {
  var result = googleLogin({ email:'test@gmail.com', name:'Test User', googleId:'test123' });
  Logger.log('googleLogin test: ' + JSON.stringify(result));
}

// ════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════
function ensureHeaders(sh, headers) {
  if (sh.getLastRow()===0) { sh.appendRow(headers); styleHeader(sh, headers.length); }
}

// Ensures the RunningLog sheet has a 'LocationName' header column.
// Required because ensureHeaders() above only writes headers when the sheet is
// EMPTY — so sheets that existed before the LocationName field was added would
// keep accepting LocationName WRITES into an unnamed 14th column but reading
// them back returned '' because header.indexOf('locationname') was -1.
//
// This helper is cheap (one read of row 1) and idempotent — call it from every
// read/write of the RunningLog sheet. The first call after deploy adds the
// header; every subsequent call is a no-op.
function _ensureLocationNameCol(sh) {
  try {
    if (sh.getLastRow() === 0) return;   // ensureHeaders will create everything
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => (h||'').toString().trim().toLowerCase());
    if (headers.includes('locationname')) return;   // already present
    const nextCol = lastCol + 1;
    sh.getRange(1, nextCol).setValue('LocationName')
      .setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF');
    // existing rows get blank — Sheets returns '' which is what we want
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log('_ensureLocationNameCol failed: ' + err.message);
  }
}

// Ensures the WorkoutLogs sheet has Week / Phase / DayType columns.
// Same pattern as _ensureLocationNameCol — ensureHeaders only runs on empty
// sheets, so legacy deployments need a one-shot header backfill so reads
// can locate these new cross-training metadata fields. Idempotent; safe to
// call from every read/write touch-point on the WorkoutLogs sheet.
function _ensureLogCtCols(sh) {
  try {
    if (sh.getLastRow() === 0) return;   // ensureHeaders will create everything
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => (h||'').toString().trim().toLowerCase());
    const wanted = [
      { key: 'week',    label: 'Week'    },
      { key: 'phase',   label: 'Phase'   },
      { key: 'daytype', label: 'DayType' },
    ];
    let nextCol = lastCol + 1;
    wanted.forEach(w => {
      if (headers.includes(w.key)) return;
      sh.getRange(1, nextCol).setValue(w.label)
        .setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF');
      nextCol++;
    });
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log('_ensureLogCtCols failed: ' + err.message);
  }
}

function styleHeader(sh, colCount) {
  sh.getRange(1,1,1,colCount)
    .setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFFFFF').setFontSize(11);
  sh.setFrozenRows(1);
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
