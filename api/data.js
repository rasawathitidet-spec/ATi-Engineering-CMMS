import { gas, handler, requireUser } from './_lib/core.js'

/** ข้อมูลตั้งต้น: เครื่องจักร, รายการตัวเลือก, รายชื่อช่าง */
export default handler(async (req, res) => {
  await requireUser(req)
  const d = await gas('readMany', { sheets: ['Machines', 'Lists', 'Users'] })
  const lists = {}
  d.Lists.sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach(r => { (lists[r.list] ||= []).push(r.value) })
  res.setHeader('Cache-Control', 'private, max-age=60')
  return {
    machines: d.Machines.filter(m => String(m.active).toUpperCase() !== 'FALSE'),
    lists,
    technicians: d.Users.filter(u => u.role === 'technician' && String(u.active).toUpperCase() !== 'FALSE').map(u => ({ code: u.emp_code, name: u.name })),
  }
})
