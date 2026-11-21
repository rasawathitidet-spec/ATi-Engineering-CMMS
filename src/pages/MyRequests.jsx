import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Spinner, Empty, ErrorBox, PageHead, Icon } from '../ui.jsx'
import WoCard from '../components/WoCard.jsx'

export default function MyRequests() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)
  const [tab, setTab] = useState('open')
  useEffect(() => { api.listWo({ scope: 'mine' }).then(r => setItems(r.items)).catch(setErr) }, [])
  const waiting = (items || []).filter(w => w.status === 'done')
  const shown = (items || []).filter(w => tab === 'open' ? w.status !== 'closed' : w.status === 'closed')
  return <div className="mx-auto max-w-2xl">
    <PageHead title="งานที่ฉันแจ้ง" sub="ติดตามสถานะ และยืนยันผลเมื่อช่างซ่อมเสร็จ" right={<Link to="/report" className="btn-primary"><Icon name="plus" className="h-4 w-4" />แจ้งซ่อม</Link>} />
    <ErrorBox error={err} />
    {waiting.length > 0 && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><b>{waiting.length} งานรอคุณยืนยันผลซ่อม</b> — เปิดใบงานแล้วกด "ใช้งานได้ปกติ" หรือ "ยังไม่หาย"</div>}
    <div className="mb-3 inline-flex rounded-xl bg-white p-1 shadow-card">
      {[['open', 'กำลังดำเนินการ'], ['closed', 'ปิดแล้ว']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 text-sm ${tab === k ? 'bg-brand text-white' : 'text-ink-muted'}`}>{l}</button>)}
    </div>
    {!items ? <Spinner /> : shown.length ? <div className="space-y-2.5">{shown.map(w => <WoCard key={w.wo_no} wo={w} />)}</div> : <Empty title="ยังไม่มีรายการ">ใบงานที่คุณแจ้งจะแสดงที่นี่</Empty>}
  </div>
}
