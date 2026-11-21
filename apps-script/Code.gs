/**
 * ATi Engineering CMMS — Apps Script data layer
 * ------------------------------------------------------------
 * ผูกสคริปต์นี้กับ Google Sheet ใหม่ของระบบ (Extensions > Apps Script)
 * 1) รันฟังก์ชัน setup() หนึ่งครั้ง  → สร้างแท็บ, นำเข้าข้อมูลจาก FM-EN-07, สร้าง API_KEY
 * 2) Deploy > New deployment > Web app
 *      Execute as: Me   ·   Who has access: Anyone
 * 3) นำ URL (/exec) และ API_KEY (ดูใน Executions log หรือ Project Settings > Script properties)
 *    ไปใส่ใน Vercel Environment Variables: APPS_SCRIPT_URL, APPS_SCRIPT_KEY
 *
 * เว็บแอปเรียกสคริปต์นี้ผ่านฟังก์ชัน API บน Vercel เท่านั้น (ทุกคำขอต้องมี API_KEY)
 */

var SOURCE_SHEET_ID = '16bRID3PMRsRktWkKCAKKVm15TDO9BufBRE-flVIyQMQ'; // A.T.I ประวัติการซ่อมเครื่องจักร (FM-EN-07 rev.02)
var SOURCE_RESPONSES_TAB = 'การตอบแบบฟอร์ม 1';
var SOURCE_LIST_TAB = 'List ข้อมูล';

var SCHEMA = {
  Users: ['emp_code', 'name', 'role', 'email', 'pin_hash', 'line', 'active', 'created_at'],
  Machines: ['code', 'name', 'group', 'line', 'criticality', 'active'],
  Lists: ['list', 'value', 'sort'],
  WorkOrders: ['wo_no', 'reported_at', 'requester', 'requester_code', 'line', 'machine_code', 'machine_name',
    'symptom', 'detail', 'machine_stopped', 'priority', 'type', 'system', 'action', 'cause', 'solution', 'parts',
    'technicians', 'status', 'assigned_at', 'started_at', 'work_started', 'finished_at', 'confirmed_at',
    'repair_min', 'downtime_min', 'photos', 'remark', 'source', 'updated_at'],
  History: ['wo_no', 'at', 'by', 'from_status', 'to_status', 'note']
};
var DATE_FIELDS = { created_at: 1, reported_at: 1, assigned_at: 1, started_at: 1, work_started: 1, finished_at: 1, confirmed_at: 1, updated_at: 1, at: 1 };

/* ======================= Web app entry ======================= */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    var key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key || req.key !== key) throw new Error('unauthorized');
    out = { ok: true, data: handle_(req) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'ATi CMMS data layer' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  switch (req.action) {
    case 'read': return readRows_(req.sheet);
    case 'readMany':
      var res = {};
      (req.sheets || []).forEach(function (s) { res[s] = readRows_(s); });
      return res;
    case 'append': return appendRow_(req.sheet, req.row);
    case 'update': return updateRow_(req.sheet, req.keyField, req.key, req.patch);
    case 'createWo': return createWo_(req.row);
    case 'verifyPin': return verifyPin_(req.emp_code, req.pin);
    case 'setPin': return setPin_(req.emp_code, req.pin);
    case 'upload': return upload_(req.name, req.mimeType, req.data);
    default: throw new Error('unknown action: ' + req.action);
  }
}

/* ======================= Table helpers ======================= */
function sheet_(name) {
  if (!SCHEMA[name]) throw new Error('unknown sheet: ' + name);
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('missing sheet: ' + name + ' (run setup)');
  return sh;
}

function toOut_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  return v;
}

function toIn_(field, v) {
  if (v === null || v === undefined) return '';
  if (DATE_FIELDS[field] && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
  if (Array.isArray(v)) return v.join(', ');
  return v;
}

function readRows_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var head = values.shift() || [];
  return values.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { if (h && h !== 'pin_hash') o[h] = toOut_(r[i]); });
    if (name === 'Users') o.has_pin = !!r[head.indexOf('pin_hash')];
    return o;
  });
}

function appendRow_(name, row) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return h === 'pin_hash' ? '' : toIn_(h, row[h]); }));
  return row;
}

function updateRow_(name, keyField, key, patch) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(name);
    var values = sh.getDataRange().getValues();
    var head = values[0];
    var k = head.indexOf(keyField);
    if (k < 0) throw new Error('bad key field');
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][k]) === String(key)) {
        Object.keys(patch).forEach(function (f) {
          var c = head.indexOf(f);
          if (c >= 0 && f !== 'pin_hash') sh.getRange(i + 1, c + 1).setValue(toIn_(f, patch[f]));
        });
        var row = sh.getRange(i + 1, 1, 1, head.length).getValues()[0];
        var o = {};
        head.forEach(function (h, j) { if (h !== 'pin_hash') o[h] = toOut_(row[j]); });
        return o;
      }
    }
    throw new Error('not found: ' + key);
  } finally { lock.releaseLock(); }
}

function createWo_(row) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_('WorkOrders');
    var last = sh.getLastRow();
    var max = 0;
    if (last > 1) {
      sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
        var n = parseInt(r[0], 10); if (n > max) max = n;
      });
    }
    row.wo_no = String(max + 1);
    appendRow_('WorkOrders', row);
    return row;
  } finally { lock.releaseLock(); }
}

/* ======================= PIN ======================= */
function hash_(code, pin) {
  var salt = PropertiesService.getScriptProperties().getProperty('PIN_SALT');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + code + ':' + pin);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function userRow_(code) {
  var sh = sheet_('Users');
  var values = sh.getDataRange().getValues();
  var head = values[0];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === String(code).toLowerCase()) return { sh: sh, i: i + 1, head: head, row: values[i] };
  }
  return null;
}

function verifyPin_(code, pin) {
  Utilities.sleep(400); // ชะลอการเดา PIN
  var u = userRow_(code);
  if (!u) return null;
  var h = u.row[u.head.indexOf('pin_hash')];
  var active = u.row[u.head.indexOf('active')];
  if (!h || active === false || String(active).toUpperCase() === 'FALSE') return null;
  if (h !== hash_(u.row[0], String(pin))) return null;
  var o = {};
  u.head.forEach(function (k, j) { if (k !== 'pin_hash') o[k] = toOut_(u.row[j]); });
  return o;
}

function setPin_(code, pin) {
  if (!/^\d{4,6}$/.test(String(pin))) throw new Error('PIN ต้องเป็นตัวเลข 4-6 หลัก');
  var u = userRow_(code);
  if (!u) throw new Error('ไม่พบผู้ใช้');
  u.sh.getRange(u.i, u.head.indexOf('pin_hash') + 1).setValue(hash_(u.row[0], String(pin)));
  return true;
}

/* ======================= Upload ======================= */
function upload_(name, mimeType, data) {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var folder;
  if (folderId) folder = DriveApp.getFolderById(folderId);
  else {
    folder = DriveApp.createFolder('ATi CMMS — รูปแจ้งซ่อม');
    props.setProperty('FOLDER_ID', folder.getId());
  }
  var blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, name);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); }
  return { id: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
}

/* ======================= Setup + import ======================= */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Asia/Bangkok');
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_KEY')) props.setProperty('API_KEY', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  if (!props.getProperty('PIN_SALT')) props.setProperty('PIN_SALT', Utilities.getUuid());

  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold').setBackground('#f4f5f6');
      sh.setFrozenRows(1);
    }
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  importMasterData_();
  importHistory_();

  var me = Session.getActiveUser().getEmail();
  if (me && !userRow_('admin')) {
    appendRow_('Users', { emp_code: 'admin', name: 'ผู้ดูแลระบบ', role: 'admin', email: me, active: true, created_at: new Date().toISOString() });
  }
  Logger.log('API_KEY = ' + props.getProperty('API_KEY'));
  Logger.log('ผู้ดูแลระบบ (ล็อกอินด้วย Google): ' + me);
}

function importMasterData_() {
  var src = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(SOURCE_LIST_TAB);
  var v = src.getDataRange().getValues();
  v.shift();
  var col = function (i) { return v.map(function (r) { return String(r[i] || '').trim(); }).filter(String); };

  var lists = ss_('Lists');
  if (lists.getLastRow() <= 1) {
    var rows = [];
    col(2).forEach(function (x, i) { rows.push(['system', x, i + 1]); });
    col(4).forEach(function (x, i) { rows.push(['action', x, i + 1]); });
    ['ตัวส่งเหรียญส่งไม่ถึง', 'หลอดติดราง / หลอดหนีบ', 'โซ่สะดุด / โซ่หยุดบ่อย', 'มอเตอร์เสีย / เสียงดังผิดปกติ',
      'ไฟไม่ขึ้น / ไฟตก', 'เครื่องออโต้เอง', 'น้ำมันรั่ว', 'ลูกปืน / เพลาสึก', 'สายพานขาด', 'ลมรั่ว / นิวเมติกส์', 'อื่น ๆ']
      .forEach(function (x, i) { rows.push(['symptom', x, i + 1]); });
    lists.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  var users = ss_('Users');
  if (users.getLastRow() <= 1) {
    col(6).filter(function (n) { return n !== 'Outsource'; }).forEach(function (n, i) {
      appendRow_('Users', { emp_code: 'T' + ('0' + (i + 1)).slice(-2), name: n, role: 'technician', active: true, created_at: new Date().toISOString() });
    });
  }

  var mach = ss_('Machines');
  if (mach.getLastRow() <= 1) {
    // หมายเหตุ: ในชีตเดิม หัวคอลัมน์ "ชื่อเครื่องจักร" กับ "รหัสเครื่องจักร" สลับกัน — คอลัมน์ I = รหัส, J = ชื่อ
    var rows2 = v.filter(function (r) { return String(r[8] || '').trim(); }).map(function (r) {
      var code = String(r[8]).trim();
      return [code, String(r[9] || '').trim(), code.split('-')[0], guessLine_(code), '', true];
    });
    if (rows2.length) mach.getRange(2, 1, rows2.length, 6).setValues(rows2);
  }
}

/** เดาไลน์จากรหัสเครื่อง (แก้ไขได้ในแท็บ Machines) */
function guessLine_(code) {
  var p = code.split('-'), g = p[0], n = parseInt(p[2], 10);
  if (isNaN(n)) return '';
  if (g === 'PU' || g === 'PL' || g === 'MO') return 'P' + n;
  if (g === 'SP') return 'S' + n;
  if (g === 'AN') return 'A' + n;
  if (['PO', 'CP', 'CT', 'GL', 'OV', 'PK'].indexOf(g) >= 0) return 'L' + n;
  return '';
}

function importHistory_() {
  var wo = ss_('WorkOrders');
  if (wo.getLastRow() > 1) return; // นำเข้าครั้งเดียว
  var src = SpreadsheetApp.openById(SOURCE_SHEET_ID).getSheetByName(SOURCE_RESPONSES_TAB);
  var v = src.getDataRange().getValues();
  var head = v.shift();
  var idx = function (name) { return head.indexOf(name); };
  var I = {
    ts: 0, no: idx('เลขที่'), by: idx('ผู้แจ้งซ่อม'), at: idx('วันที่และเวลาที่แจ้งซ่อม'), mname: idx('ชื่อเครื่องจักรที่แจ้งซ่อม'),
    sym: idx('อาการเสีย/ปัญหาที่พบ'), pri: idx('ระดับความเร่งด่วน'), st: idx('สถานะ'), type: idx('ประเภท'),
    code: idx('รหัสเครื่องจักร'), name2: idx('ชื่อเครื่องจักร'), sys: idx('ระบบ'), act: idx('รายการแจ้ง'),
    det: idx('รายละเอียดการแจ้งซ่อม'), parts: idx('อะไหล่ที่เปลี่ยน'), tech: idx('ผู้ปฎิบัติงาน'),
    start: idx('วันที่เริ่มซ่อม'), fin: idx('วันที่ซ่อมเสร็จ'), dur: idx('เวลาในการซ่อม'), rem: idx('หมายเหตุ')
  };
  var map = { 'ซ่อมเสร็จแล้ว': 'closed', 'รอเข้าประชุม': 'meeting', 'กำลังดำเนินการ': 'working', 'ติดตามอาการ': 'follow' };
  var tmp = 900000; // เลขชั่วคราวสำหรับรายการที่ไม่มีเลขที่
  var rows = [];
  v.forEach(function (r) {
    if (!r[I.by] && !r[I.sym]) return;
    var tech = String(r[I.tech] || '').trim();
    var stTxt = String(r[I.st] || '').trim();
    var status = map[stTxt] || (stTxt === 'รอซ่อม' ? (tech ? 'assigned' : 'new') : 'new');
    var code = String(r[I.code] || '').trim();
    var o = {
      wo_no: String(r[I.no] || '').trim() || String(++tmp),
      reported_at: d_(r[I.at]) || d_(r[I.ts]), requester: r[I.by], requester_code: '',
      line: guessLine_(code), machine_code: code,
      machine_name: (String(r[I.name2] || '') === '#N/A' ? '' : r[I.name2]) || r[I.mname],
      symptom: r[I.sym], detail: '', machine_stopped: String(r[I.type]) === 'BM' ? 'Y' : 'N',
      priority: r[I.pri], type: r[I.type], system: r[I.sys], action: r[I.act],
      cause: r[I.det], solution: '', parts: r[I.parts], technicians: tech, status: status,
      assigned_at: '', started_at: d_(r[I.start]), work_started: '', finished_at: d_(r[I.fin]),
      confirmed_at: status === 'closed' ? d_(r[I.fin]) : '', repair_min: minutes_(r[I.dur]), downtime_min: '',
      photos: '', remark: [r[I.rem], 'ชื่อที่แจ้ง: ' + r[I.mname]].filter(String).join(' · '),
      source: 'FM-EN-07', updated_at: new Date()
    };
    rows.push(SCHEMA.WorkOrders.map(function (h) { return o[h] === undefined ? '' : o[h]; }));
  });
  if (rows.length) wo.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log('นำเข้าประวัติ ' + rows.length + ' รายการ');
}

function ss_(name) { return SpreadsheetApp.getActive().getSheetByName(name); }

function d_(v) {
  if (v instanceof Date) return v;
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return '';
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

/** "4 วัน 7 ชั่วโมง 30 นาที" → นาที */
function minutes_(v) {
  var s = String(v || '').replace(/\s/g, '');
  if (!s) return '';
  var total = 0, hit = false;
  [[/(\d+(?:\.\d+)?)วัน/, 1440], [/(\d+(?:\.\d+)?)ชั่วโมง/, 60], [/(\d+(?:\.\d+)?)นาที/, 1]].forEach(function (p) {
    var m = s.match(p[0]); if (m) { total += parseFloat(m[1]) * p[1]; hit = true; }
  });
  return hit ? Math.round(total) : '';
}

/* ======================= เมนูในชีต ======================= */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ATi CMMS')
    .addItem('ตั้ง PIN ผู้ใช้', 'menuSetPin')
    .addItem('ดู API_KEY', 'menuShowKey')
    .addToUi();
}
function menuSetPin() {
  var ui = SpreadsheetApp.getUi();
  var c = ui.prompt('ตั้ง PIN', 'รหัสพนักงาน (เช่น admin)', ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK) return;
  var p = ui.prompt('ตั้ง PIN', 'PIN ใหม่ 4-6 หลัก สำหรับ ' + c.getResponseText(), ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  try { setPin_(c.getResponseText().trim(), p.getResponseText().trim()); ui.alert('ตั้ง PIN แล้ว'); }
  catch (e) { ui.alert(String(e.message || e)); }
}
function menuShowKey() {
  SpreadsheetApp.getUi().alert('API_KEY', PropertiesService.getScriptProperties().getProperty('API_KEY') || 'ยังไม่ได้รัน setup', SpreadsheetApp.getUi().ButtonSet.OK);
}
