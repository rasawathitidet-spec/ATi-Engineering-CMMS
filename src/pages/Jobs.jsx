import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth, can } from '../auth.jsx'
import { Spinner, Empty, ErrorBox, PageHead } from '../ui.jsx'
import WoCard from '../components/WoCard.jsx'

const TABS = [['todo', 'รอทำ', ['new', 'assigned', 'paused']], ['doing', 'กำลังทำ', ['working']], ['wait', 'รอยืนยัน', ['done', 'follow']], ['closed', 'ปิดแล้ว', ['closed']]]

export default function Jobs() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)
  const [tab, setTab] = useState('todo')
  const [scope, setScope] = useState('tech')
  useEffect(() => { setItems(null); api.listWo({ scope }).then(r => setItems(r.items)).catch(setErr) }, [scope])
  const rank = w => (w.machine_stopped === 'Y' ? 0 : 1)
  const st = TABS.find(t => t[0] === tab)[2]
  const shown = (items || []).filter(w => st.includes(w.status)).sort((a, b) => rank(a) - rank(b) || String(a.reported_at).localeCompare(String(b.reported_at)))
  return <div className="mx-auto max-w-3xl">
    <PageHead title="งานช่าง" sub="เครื่องหยุดแสดงก่อน · กดเปิดใบงานเพื่อเริ่มจับเวลา"
      right={can(user, 'manager') && <select className="field w-auto" value={scope} onChange={e => setScope(e.target.value)}><option value="tech">งานที่มอบหมายให้ฉัน</option><option value="all">งานทั้งหมด</option></select>} />
    <ErrorBox error={err} />
    <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
      {TABS.map(([k, l, s]) => { const n = (items || []).filter(w => s.includes(w.status)).length; return <button key={k} onClick={() => setTab(k)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-brand text-white' : 'text-ink-muted'}`}>{l}{k !== 'closed' && ` (${n})`}</button> })}
    </div>
    {!items ? <Spinner /> : shown.length ? <div className="space-y-2.5">{shown.map(w => <WoCard key={w.wo_no} wo={w} showAge />)}</div> : <Empty title="ไม่มีงานในสถานะนี้" />}
  </div>
}
