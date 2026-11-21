import { gas, handler, requireUser, httpError, isManager, nowIso } from './_lib/core.js'

const STATUS_TH = { new: 'รอรับงาน', assigned: 'รอซ่อม', working: 'กำลังดำเนินการ', paused: 'รออะไหล่', done: 'ซ่อมเสร็จ รอยืนยัน', closed: 'ปิดงาน', follow: 'ติดตามอาการ', meeting: 'รอเข้าประชุม' }
const techList = wo => String(wo.technicians || '').split(',').map(s => s.trim()).filter(Boolean)
const mine = (wo, u) => wo.requester_code === u.code || (!wo.requester_code && wo.requester === u.name)
const assignedTo = (wo, u) => techList(wo).includes(u.name)
const mins = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000))

async function history(wo_no, by, from, to, note = '') {
  await gas('append', { sheet: 'History', row: { wo_no, at: nowIso(), by, from_status: from, to_status: to, note } })
}

export default handler(async (req) => {
  const u = await requireUser(req)

  if (req.method === 'GET') {
    const all = await gas('read', { sheet: 'WorkOrders' })
    if (req.query.no) {
      const wo = all.find(w => String(w.wo_no) === String(req.query.no))
      if (!wo) throw httpError(404, 'ไม่พบใบงาน')
      if (u.role === 'requester' && !mine(wo, u)) throw httpError(403, 'ไม่มีสิทธิ์ดูใบงานนี้')
      const hist = (await gas('read', { sheet: 'History' })).filter(h => String(h.wo_no) === String(wo.wo_no))
      const sameMachine = all.filter(w => w.machine_code && w.machine_code === wo.machine_code && w.wo_no !== wo.wo_no)
        .sort((a, b) => String(b.reported_at).localeCompare(String(a.reported_at))).slice(0, 5)
        .map(w => ({ wo_no: w.wo_no, reported_at: w.reported_at, symptom: w.symptom, status: w.status, cause: w.cause }))
      return { wo, history: hist, machineHistory: sameMachine, machineCount: sameMachine.length ? all.filter(w => w.machine_code === wo.machine_code).length : 1 }
    }
    let list = all
    const scope = req.query.scope || (u.role === 'requester' ? 'mine' : 'all')
    if (scope === 'mine' || u.role === 'requester') list = list.filter(w => mine(w, u))
    else if (scope === 'tech') list = list.filter(w => assignedTo(w, u))
    if (req.query.open === '1') list = list.filter(w => w.status !== 'closed')
    list.sort((a, b) => String(b.reported_at).localeCompare(String(a.reported_at)))
    return { items: list.slice(0, Number(req.query.limit) || 500) }
  }

  if (req.method !== 'POST') throw httpError(405, 'method not allowed')
  const b = req.body

  if (b.action === 'create') {
    if (!b.machine_code && !b.machine_name) throw httpError(400, 'เลือกเครื่องจักร')
    if (!b.symptom) throw httpError(400, 'เลือกหรือกรอกอาการที่พบ')
    const stopped = b.machine_stopped ? 'Y' : 'N'
    const row = {
      reported_at: nowIso(), requester: u.name, requester_code: u.code, line: b.line || '',
      machine_code: b.machine_code || '', machine_name: b.machine_name || '', symptom: b.symptom, detail: b.detail || '',
      machine_stopped: stopped, priority: stopped === 'Y' ? 'เครื่องหยุด' : 'ยังเดินได้', type: stopped === 'Y' ? 'BM' : 'CM',
      status: 'new', photos: (b.photos || []).join(' '), source: 'app', updated_at: nowIso(),
    }
    const wo = await gas('createWo', { row })
    await history(wo.wo_no, u.name, '', 'new', 'แจ้งซ่อม')
    return { wo }
  }

  const all = await gas('read', { sheet: 'WorkOrders' })
  const wo = all.find(w => String(w.wo_no) === String(b.wo_no))
  if (!wo) throw httpError(404, 'ไม่พบใบงาน')
  const now = nowIso()
  const canTech = isManager(u) || assignedTo(wo, u)
  let patch = {}, to = wo.status, note = ''
  const need = (cond, msg = 'ไม่มีสิทธิ์ทำรายการนี้') => { if (!cond) throw httpError(403, msg) }
  const from = (...st) => { if (!st.includes(wo.status)) throw httpError(409, `ใบงานอยู่ในสถานะ "${STATUS_TH[wo.status] || wo.status}" ทำรายการนี้ไม่ได้`) }
  const accumulate = () => wo.work_started ? { repair_min: (Number(wo.repair_min) || 0) + mins(wo.work_started, now), work_started: '' } : {}

  switch (b.action) {
    case 'assign':
      need(isManager(u))
      if (!b.technicians?.length) throw httpError(400, 'เลือกช่างอย่างน้อย 1 คน')
      patch = { technicians: b.technicians.join(', '), type: b.type || wo.type }
      if (['new', 'meeting', 'follow'].includes(wo.status)) { to = 'assigned'; patch.assigned_at = now }
      note = 'มอบหมาย: ' + patch.technicians
      break
    case 'start':
      need(canTech); from('new', 'assigned', 'paused')
      to = 'working'; patch = { work_started: now, started_at: wo.started_at || now }
      if (!techList(wo).length) patch.technicians = u.name
      break
    case 'pause':
      need(canTech); from('working')
      to = 'paused'; patch = accumulate(); note = b.note || 'พัก / รออะไหล่'
      break
    case 'finish':
      need(canTech); from('working', 'paused')
      if (!b.cause || !b.solution) throw httpError(400, 'กรอกสาเหตุและการแก้ไข')
      to = 'done'
      patch = { ...accumulate(), finished_at: now, cause: b.cause, solution: b.solution, system: b.system || wo.system, action: b.action_type || wo.action, parts: b.parts || '' }
      if (b.technicians?.length) patch.technicians = b.technicians.join(', ')
      break
    case 'confirm':
      need(isManager(u) || mine(wo, u), 'เฉพาะผู้แจ้งหรือหัวหน้าเท่านั้นที่ยืนยันได้'); from('done')
      if (b.ok) {
        to = 'closed'; patch = { confirmed_at: now }
        if (wo.machine_stopped === 'Y' && wo.finished_at) patch.downtime_min = mins(wo.reported_at, wo.finished_at)
        note = b.note || 'ยืนยันผลซ่อม'
      } else {
        to = 'assigned'; note = 'ตีกลับ: ' + (b.note || 'ยังไม่หาย')
        patch = { remark: [wo.remark, note].filter(Boolean).join(' · ') }
      }
      break
    case 'meeting': need(isManager(u)); to = 'meeting'; patch = accumulate(); note = b.note || 'ส่งเข้าประชุม RCA'; break
    case 'follow': need(isManager(u)); to = 'follow'; note = b.note || 'ติดตามอาการ'; break
    case 'close': need(isManager(u)); to = 'closed'; patch = { ...accumulate(), confirmed_at: now }; note = b.note || 'หัวหน้าปิดงาน'; break
    case 'update':
      need(isManager(u))
      ;['type', 'priority', 'machine_code', 'machine_name', 'line', 'system', 'remark'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k] })
      note = 'แก้ไขข้อมูล'
      break
    default: throw httpError(400, 'unknown action')
  }
  patch.status = to
  patch.updated_at = now
  const updated = await gas('update', { sheet: 'WorkOrders', keyField: 'wo_no', key: wo.wo_no, patch })
  await history(wo.wo_no, u.name, wo.status, to, note)
  return { wo: updated }
})
