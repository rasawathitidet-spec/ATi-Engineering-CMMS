import { gas, handler, requireUser, httpError, nowIso } from './_lib/core.js'

const ROLES = ['requester', 'technician', 'manager', 'executive', 'admin']

export default handler(async (req) => {
  const u = await requireUser(req, ['manager'])
  if (req.method === 'GET') return { users: await gas('read', { sheet: 'Users' }) }
  const b = req.body
  if (b.action === 'create') {
    if (!b.emp_code || !b.name) throw httpError(400, 'กรอกรหัสพนักงานและชื่อ')
    if (!ROLES.includes(b.role)) throw httpError(400, 'บทบาทไม่ถูกต้อง')
    if (b.role === 'admin' && u.role !== 'admin') throw httpError(403, 'เฉพาะผู้ดูแลระบบสร้างผู้ดูแลได้')
    const users = await gas('read', { sheet: 'Users' })
    if (users.some(x => String(x.emp_code).toLowerCase() === String(b.emp_code).toLowerCase())) throw httpError(409, 'รหัสพนักงานนี้มีอยู่แล้ว')
    await gas('append', { sheet: 'Users', row: { emp_code: b.emp_code.trim(), name: b.name.trim(), role: b.role, email: (b.email || '').trim().toLowerCase(), line: b.line || '', active: true, created_at: nowIso() } })
    if (b.pin) await gas('setPin', { emp_code: b.emp_code.trim(), pin: String(b.pin) })
    return { ok: true }
  }
  if (b.action === 'setPin') { await gas('setPin', { emp_code: b.emp_code, pin: String(b.pin) }); return { ok: true } }
  if (b.action === 'update') {
    const patch = {}
    ;['name', 'role', 'email', 'line', 'active'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k] })
    if (patch.role && !ROLES.includes(patch.role)) throw httpError(400, 'บทบาทไม่ถูกต้อง')
    if (patch.role === 'admin' && u.role !== 'admin') throw httpError(403, 'เฉพาะผู้ดูแลระบบตั้งผู้ดูแลได้')
    return { user: await gas('update', { sheet: 'Users', keyField: 'emp_code', key: b.emp_code, patch }) }
  }
  throw httpError(400, 'unknown action')
})
