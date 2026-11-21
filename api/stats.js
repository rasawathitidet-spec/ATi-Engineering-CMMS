import { gas, handler, requireUser } from './_lib/core.js'

const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const bkk = iso => new Date(new Date(iso).getTime() + 7 * 3600e3) // เวลาไทย

export default handler(async (req) => {
  await requireUser(req, ['manager', 'executive'])
  const all = await gas('read', { sheet: 'WorkOrders' })
  const months = Math.min(24, Number(req.query.months) || 12)
  const since = new Date(); since.setMonth(since.getMonth() - months + 1); since.setDate(1); since.setHours(0, 0, 0, 0)
  const wo = all.filter(w => w.reported_at && new Date(w.reported_at) >= since)

  const closed = wo.filter(w => w.status === 'closed')
  const rep = wo.map(w => Number(w.repair_min)).filter(n => n > 0)
  const byMonth = {}
  wo.forEach(w => { const d = bkk(w.reported_at); const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; const m = (byMonth[k] ||= { key: k, label: MONTHS[d.getUTCMonth()], total: 0, BM: 0, CM: 0, PM: 0 }); m.total++; if (m[w.type] !== undefined) m[w.type]++ })
  const group = {}
  wo.forEach(w => { const g = (w.machine_code || '').split('-')[0] || 'ไม่ระบุ'; const x = (group[g] ||= { group: g, count: 0, hours: 0, bm: 0 }); x.count++; x.hours += (Number(w.repair_min) || 0) / 60; if (w.type === 'BM') x.bm++ })
  const mach = {}
  wo.forEach(w => { const k = w.machine_code || w.machine_name; if (!k) return; const x = (mach[k] ||= { code: w.machine_code, name: w.machine_name, count: 0, hours: 0, bm: 0 }); x.count++; x.hours += (Number(w.repair_min) || 0) / 60; if (w.type === 'BM') x.bm++ })
  const resp = wo.filter(w => w.started_at).map(w => (bkk(w.started_at).toISOString().slice(0, 10) === bkk(w.reported_at).toISOString().slice(0, 10)))
  const waitLong = wo.filter(w => w.started_at && (new Date(w.started_at) - new Date(w.reported_at)) > 7 * 864e5).length
  const open = all.filter(w => w.status !== 'closed')
  const statusCount = {}
  open.forEach(w => { statusCount[w.status] = (statusCount[w.status] || 0) + 1 })

  return {
    since: since.toISOString(), total: wo.length, closed: closed.length,
    closeRate: wo.length ? closed.length / wo.length : 0,
    medianRepairMin: median(rep), meanRepairMin: rep.length ? rep.reduce((a, b) => a + b, 0) / rep.length : 0,
    bm: wo.filter(w => w.type === 'BM').length, pm: wo.filter(w => w.type === 'PM').length,
    sameDayStart: resp.length ? resp.filter(Boolean).length / resp.length : 0, waitLong,
    open: open.length, statusCount,
    monthly: Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key)),
    groups: Object.values(group).sort((a, b) => b.hours - a.hours),
    topMachines: Object.values(mach).sort((a, b) => b.hours - a.hours).slice(0, 10),
  }
})
